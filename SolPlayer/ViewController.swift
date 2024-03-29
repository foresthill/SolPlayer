//
//  ViewController.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/05/29.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import UIKit
import AVKit
import AVFoundation
import MediaPlayer

class ViewController: UIViewController, AVAudioSessionDelegate {

    @IBOutlet weak var playButton: UIButton!
    @IBOutlet weak var stopButton: UIButton!
    @IBOutlet weak var repeatButton: UIButton!
    
    @IBOutlet weak var solButton: UIButton!
    
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var artistLabel: UILabel!
    @IBOutlet weak var artworkImage: UIImageView!
    
    @IBOutlet weak var timeSlider: UISlider!
    @IBOutlet weak var nowTimeLabel: UILabel!
    @IBOutlet weak var endTimeLabel: UILabel!

    @IBOutlet weak var speedSlider: UISlider!
    @IBOutlet weak var speedLabel: UILabel!
    @IBOutlet weak var speedButton: CustomButton!
    
    @IBOutlet weak var playlistLabel: UILabel!
    
    //ユーザ設定値
    var config: NSUserDefaults!
    
    //タイマー
    var timer: NSTimer!
    
    //SolPlayerのインスタンス（シングルトン）
    var solPlayer: SolPlayer!
    
    //中断される前の状態（再生中：true、停止中：false）
    var status = false
    
    //ユーザ設定（コンフィグ）管理クラス呼び出し（シングルトン）
    let userConfigManager: UserConfigManager! = UserConfigManager.sharedManager
    
    /** 
     初期処理
     */
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        
        /* SolPlayer（シングルトンクラス）呼び出し */
        solPlayer = SolPlayer.sharedManager
        
        /* 初期化処理 */

        //solSwitchを初期化
        if userConfigManager.getIsSolMode() {
            solModeChange()
        }
        
        //曲情報を読み込む（一瞬だけ曲を再生して停止する） #103
         do {
            try play()
            //初回時はしおり機能のOn/Offにかかわらず確実に読みこむ
            if let playtime = solPlayer.song.playTime {
                solPlayer.timeShift(Float(playtime))
            }
            pause()
         } catch {
         
         }
 
        //ヘッドフォンの状態を取得するためにAVAudioSessionを用いる（意味ない？）
        do { try AVAudioSession.sharedInstance().setActive(true) } catch { }
        
        
        //割り込みが入った時の処理（現状うまく行っているのでコメントアウト）
        NSNotificationCenter.defaultCenter().addObserver(self, selector: #selector(ViewController.audioSessionRouteChange), name: AVAudioSessionInterruptionNotification, object: UIApplication.sharedApplication())

        //ヘッドフォンが抜き差しされた時のイベントを取得する
        NSNotificationCenter.defaultCenter().addObserver(self, selector: #selector(ViewController.audioSessionRouteChange), name: AVAudioEngineConfigurationChangeNotification, object: solPlayer.audioEngine)

        //ロック・スリープ復帰時に画面を更新する
        NSNotificationCenter.defaultCenter().addObserver(self, selector: #selector(ViewController.viewWillAppear), name: UIApplicationWillEnterForegroundNotification, object: UIApplication.sharedApplication())
    }
    
    /**
     再生処理
     */
    func play() throws {

        let stopFlg = solPlayer.stopFlg
        
        /*TimerをSolPlayerに含められなかったので処理追加*/
        do {
            //再生処理
            try solPlayer.play()
            setPlayLabel(solPlayer.audioPlayerNode.playing)
            
            if stopFlg {  //停止→再生（あるいは初回再生時）
            //if stopFlg > 0 {
                //タイマーを新規で設定（2016/07/27→SolPlayerクラスに移動→戻し）
                timer = NSTimer.scheduledTimerWithTimeInterval(1, target: self, selector: #selector(ViewController.didEverySecondPassed), userInfo: nil, repeats: true)
                setScreen(true)
                //画面と再生箇所を同期をとる（停止時にいじられてもOKにする）
                timeSlider.enabled = true
                timeSlider.value = 0.0

            } else {    //一時停止→再生
                //タイマーを再度発火 #74
                //timer.fire()
            }

        } catch {
            //うまく再生処理が開始できなかった場合は
            setScreen(false)
            throw AppError.CantPlayError
        }
            
    }
    
    /**
     各値を画面にセットする
     - parameter song: 曲情報
     - parameter reset: 画面を初期化するフラグ
     */
    func setScreen(values: Bool) {
        
        if values {
            //プレイヤーラベルを設定 #103
            if let song = solPlayer.song {
                titleLabel.text = song.title ?? "Untitled"
                artistLabel.text = song.artist ?? "Unknown Artist"
                endTimeLabel.text = formatTimeString(Float(solPlayer.duration)) ?? "-99:99:99"
                artworkImage.image = song.artwork?.imageWithSize(CGSize.init(width: 50, height: 50)) ?? nil
            }
            
            //スライダーを操作可能に #72
            timeSlider.enabled = true
            timeSlider.maximumValue = Float(solPlayer.duration)
            
            //プレイリスト情報を更新
            //playlistLabel.text = solPlayer.subPlaylist.name
            playlistLabel.text = solPlayer.mainPlaylist.name

        } else {
            
            //画面表示を初期化
            titleLabel.text = "Untitled"
            artistLabel.text = "Unknown Artist"
            nowTimeLabel.text = "00:00:00"
            endTimeLabel.text = "-99:99:99"
            artworkImage.image = ImageUtil.makeBoxWithColor(UIColor.init(colorLiteralRed: 0.67, green: 0.67, blue: 0.67, alpha: 1.0), width: 40.0, height: 40.0)
            //playButton.setTitle("PLAY", forState: .Normal)
            
            //timeSliderを0に固定していじらせない #72
            timeSlider.value = 0
            timeSlider.enabled = false
            
            //プレイリスト情報を更新
            playlistLabel.text = solPlayer.mainPlaylist.name
            
        }
        
        //再生・一時再生ボタンをセット
        setPlayLabel(solPlayer.audioPlayerNode.playing)
        
    }
    
    /**
     時間をhh:mm:ssにフォーマットする
     
     - parameters:
     - time: 時刻
     
     - throws: なし
     
     - returns: 文字列（hh:mm:ss）
     */
    func formatTimeString(time: Float) -> String {
        let s: Int = Int(time % 60)
        let m: Int = Int((time - Float(s)) / 60 % 60)
        let h: Int = Int((time - Float(m) - Float(s)) / 3600 % 3600)
        let str = String(format: "%02d:%02d:%02d", h, m, s)
        return str
    }
    
    /**
     一時停止処理
     */
    func pause(){
        solPlayer.pause()
        timer = nil //意外と壊れてない？だがロック画面の変化はなし
        //timer.invalidate()    //ここでinvalidateするとTimerが壊れてしまう。ロック画面の変化もなし。
        setPlayLabel(solPlayer.audioPlayerNode.playing)
    }
    
    /**
     再生・一時停止判定
     */
    func playOrPause(){
        if solPlayer.audioPlayerNode.playing {
            pause() //再生→一時停止処理
        } else {
            do{
                try play()  //一時停止→再生処理
            } catch {
                //エラーハンドリング
                alert()
            }
        }
    }
    
    /**
     停止処理
     */
    func stop(){
        //タイマーを破棄
        timer = nil
        //SolPlayer停止処理
        solPlayer.stop()
        
        //停止フラグをtrueに
        solPlayer.stopFlg = true
        
        //スライダーを使用不可に（暫定対応）
        timeSlider.enabled = false

        //ラベル更新
        setPlayLabel(solPlayer.audioPlayerNode.playing)
    }
    
    /** 
     前の曲を再生する処理
     */
    func prevSongPlay(){
        
        do {
            //前の曲へ
            try solPlayer.prevSong(true)
            //画面に反映する
            setScreen(true)

        } catch {
            //setScreen(false)
        }
    }
    
    /**
     次の曲を再生する処理
     */
    func nextSongPlay(){
        
        do {
            //曲の再生時間を保存 #103
            if(userConfigManager.isRedume){
                try solPlayer.saveSong(true)
            }
            //次の曲へ（いったんtrueで）
            try solPlayer.nextSong(true)
            //画面に反映する
            setScreen(true)
        } catch {
            //setScreen(false)
        }
    }
    
    /**
     再生できる曲が無い場合にアラートを表示する
     */
    func alert(){
        let alertController = UIAlertController(title: "info", message: "再生できる曲がありません", preferredStyle: .Alert)
        
        let defaultAction = UIAlertAction(title: "OK", style: .Default, handler: nil)
        alertController.addAction(defaultAction)
        
        presentViewController(alertController, animated: true, completion: nil)
    }

    /**
     毎秒ごとに行われる処理（timerで管理）
     */
    func didEverySecondPassed(){
        
        let current = solPlayer.currentPlayTime()
        
        nowTimeLabel.text = formatTimeString(current)
        endTimeLabel.text = "-" + formatTimeString(Float(solPlayer.duration) - current)
        
        //timeSlider.value = current / Float(duration)
        timeSlider.value = current

        //曲の最後に到達したら次の曲へ
        if current >= Float(solPlayer.duration) {
            
            //曲の再生時間をリセット #103
            if(userConfigManager.isRedume){
                do { try solPlayer.saveSong(false) } catch { }
            }
            
            //曲を停止する
            stop()
            
            //リピート処理
            if(repeatButton.selected){
                do { try play() } catch { }
                return
            }
            
            //通常時処理
            do {
                //この時点でaudioPlayernode.playingはfalseとなるため、左記で判定せず次の曲を確実に再生させる
                try solPlayer.nextSong(true)
                
                //画面を更新する
                setScreen(true)
                
                //PlaylistViewControllerのテーブルも更新する（もっと効率よいやりかたあればおしえて。）※navigationControllerやめようかな
                let navigationController:UINavigationController = self.tabBarController?.viewControllers![1] as! UINavigationController
                let playlistViewController = navigationController.viewControllers[0] as! PlaylistViewController
                
                //多分一度もplayViewControllerを開いてない時はnilになる？
                if(playlistViewController.tableView != nil){
                    playlistViewController.tableView.reloadData()
                }
                
            } catch {
                //setScreen(false)
            }
        }
        
    }
    
    /**
     再生ボタン/一時停止ボタンをセット
     
     - parameter: true（再生）、false（一時停止）
     
     - returns: なし
     */
    func setPlayLabel(playing: Bool){
        if playing {
            playButton.setImage(UIImage(named: "pause64.png"), forState: .Normal)
        } else {
            playButton.setImage(UIImage(named: "play64.png"), forState: .Normal)
        }
    }

    /** solSwitchを切り替える処理 */
    func solModeChange() {
        //ON/OFF切り替え
        solButton.selected = !solButton.selected
        //音源処理
        solPlayer.pitchChange(solButton.selected)
        //画像を差し替え
        solButton.setImage(UIImage(named: "solSwitch1_on\(userConfigManager.solMode).png"), forState: UIControlState.Selected)
        //UserDefaultsに保存
        userConfigManager.setIsSolMode(solButton.selected)
    }
    
    /**
     solfeggioスイッチが押された時（Action→ValueChanged）
     ※UISwitchに画像がセットできないためUIButtonで同様の機能を実装
     
     - parameter sender: UISwitch
     */
    @IBAction func solButtonAction(sender: UIButton) {
        solModeChange()
    }
    
    /*
     再生ボタンが押された時
     */
    @IBAction func playButtonPressed(sender: UIButton) {
        playOrPause()
    }
    
    /**
     停止ボタンが押された時
     */
    @IBAction func stopButtonAction(sender: UIButton) {
        stop()
    }
    
    /**
     再生時間のスライダーが変更された時（Action→ValueChanged）
     - parameter sender: UISlider
     */
    @IBAction func timeSliderAction(sender: UISlider) {
        solPlayer.timeShift(timeSlider.value)
    }
    
    /**
     再生速度のスライダーが変更された時（Action→ValueChanged）
     - parameter sender: UISlider
     */
    @IBAction func speedSliderAction(sender: UISlider) {
        solPlayer.speedChange(speedSlider.value)
        speedLabel.text = "x \((round(speedSlider.value*10)/10))"
    }
    
    /**
     前の曲ボタン（「＜」）が押された時
     */
    @IBAction func prevButtonAction(sender: AnyObject) {
        prevSongPlay()
    }
    
    /**
     次の曲ボタン（「＞」）が押された時
     */
    @IBAction func nextButtonAction(sender: UIButton) {
        nextSongPlay()
    }
    
    /**
     再生速度のボタンが押された時
     - parameter sender: CustomButton
     */
    @IBAction func speedButtonAction(sender: AnyObject) {
        var speed = 0.25
        for _ in 0 ... sender.tag {
            speed = speed * 2
        }
        //スライダーと同期する
        speedSlider.value = Float(speed)
        //ラベルを書き換える
        speedLabel.text = "x \((round(speedSlider.value*10)/10))"
        //プレイヤーに速度処理変更
        solPlayer.speedChange(speedSlider.value)
    }
    
    /** リピート（繰り返し）再生ボタン */
    @IBAction func repeatButtonAction(sender: UIButton) {
        //ON/OFF切り替え
        repeatButton.selected = !repeatButton.selected
        
    }

    /** リモートイベント：再生・停止 */
    func remoteTogglePlayPause(event: MPRemoteCommandEvent){
        playOrPause()
    }
    
    /** リモートイベント：次の曲へ */
    func remoteNextTrack(event: MPRemoteCommandEvent){
        nextSongPlay()
    }
    
    /** リモートイベント：前の曲へ */
    func remotePrevTrack(event: MPRemoteCommandEvent){
        prevSongPlay()
    }
    
    /** 他のアプリから割り込みがあった場合 */
    func beginInterruption() {
        status = solPlayer.audioPlayerNode.playing
        if status {
            self.solPlayer.stopExternal()
        }
    }

    /** 他のアプリからの割り込みが終了した */
    func endInterruption() {
        if status {
            do {
                try play()
            } catch {
                
            }
        }
    }

    /** ヘッドフォンが抜き差しされた時の処理 #88 */
    func audioSessionRouteChange(notification: NSNotification) {
        //トリガーが確実に作動するようにする
        dispatch_async(dispatch_get_main_queue(), {
            self.solPlayer.stopExternal()
            self.setPlayLabel(self.solPlayer.audioPlayerNode.playing)
        })
        
    }
    
    /** この画面が表示される時に項目を更新する*/
    override func viewWillAppear(animated: Bool) {
        setScreen(!solPlayer.stopFlg)
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
    }


}

