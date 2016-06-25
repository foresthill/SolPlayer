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
    
    //@IBOutlet weak var solSwitch: UISwitch!
    @IBOutlet weak var solButton: UIButton!
    
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var artistLabel: UILabel!
    @IBOutlet weak var artworkImage: UIImageView!
    
    @IBOutlet weak var timeSlider: UISlider!
    @IBOutlet weak var nowTimeLabel: UILabel!
    @IBOutlet weak var endTimeLabel: UILabel!

    @IBOutlet weak var speedSlider: UISlider!
    @IBOutlet weak var speedLabel: UILabel!
    @IBOutlet weak var speedSegment: UISegmentedControl!
    
    @IBOutlet weak var playlistLabel: UILabel!
    
    //ユーザ設定値
    var config: NSUserDefaults!
    
    //タイマー
    var timer:NSTimer!
    
    //SolPlayerのインスタンス（シングルトン）
    var solPlayer: SolPlayer!
    
    //中断される前の状態（再生中：true、停止中：false）
    var status = false
    
    /** 
     初期処理
     */
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        
        /* SolPlayer（シングルトンクラス）呼び出し */
        solPlayer = SolPlayer.sharedManager
        
        /* 初期化処理 */

        //スライダーを操作不能に #72
        timeSlider.enabled = false
        
        //画面ロック時のアクションを取得する
        UIApplication.sharedApplication().beginReceivingRemoteControlEvents()
        
        //ファーストレスポンダになる
        self.becomeFirstResponder()
        
        //ヘッドフォンの状態を取得するためにAVAudioSessionを用いる（意味ない？）
        do { try AVAudioSession.sharedInstance().setActive(true) } catch { }
        
        //Notificationの設定（意味ない？）
        NSNotificationCenter.defaultCenter().addObserver(self, selector: #selector(ViewController.didChangeAudioSessionRoute), name: "SolNotification", object: nil)
        
        //画面ロック時の曲情報を持つインスタンス
        //var defaultCenter = MPNowPlayingInfoCenter.defaultCenter()
        
        //プレイリストを読み込み
//        do {
//            try solPlayer.loadPlayList()
//        } catch {
//            //
//        }
        
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
                //タイマーを新規で設定
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
            //プレイヤーラベルを設定
            let song = solPlayer.song
            titleLabel.text = song.title ?? "Untitled"
            artistLabel.text = song.artist ?? "Unknown Artist"
            endTimeLabel.text = formatTimeString(Float(solPlayer.duration)) ?? "-99:99:99"
            artworkImage.image = song.artwork?.imageWithSize(CGSize.init(width: 50, height: 50)) ?? nil
            
            //スライダーを操作可能に #72
            timeSlider.enabled = true
            timeSlider.maximumValue = Float(solPlayer.duration)
            
            //プレイリスト情報を更新
            playlistLabel.text = solPlayer.subPlaylist.name

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
            playlistLabel.text = ""
            
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
        //スライダーを使用不可に（暫定対応）
        timeSlider.enabled = false
        //ラベル更新
        setPlayLabel(solPlayer.audioPlayerNode.playing)
        //playButton.setTitle("PLAY", forState: .Normal)
    }
    
    /** 
     前の曲を再生する処理
     */
    func prevSongPlay(){
        do {
            try solPlayer.prevSong()
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
            try solPlayer.nextSong()
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
        
        //0の時は再生ボタンマークに（ヘッドフォンが抜けた時の対策）#75　※いつかちゃんとやります
        if(current == 0 && solPlayer.stopFlg){
            setPlayLabel(solPlayer.audioPlayerNode.playing)
            timeSlider.enabled = false
        }
        
        //曲の最後に到達したら次の曲へ
        if current >= Float(solPlayer.duration) {
            stop()
            
            //リピート処理
            if(repeatButton.selected){
                do { try play() } catch { }
                return
            }
            
            //通常時処理
            do {
                try solPlayer.nextSong()
                setScreen(true)
                
                //PlaylistViewControllerのテーブルも更新する（もっと効率よいやりかたあればおしえて。）※navigationControllerやめようかな
                let navigationController:UINavigationController = self.tabBarController?.viewControllers![1] as! UINavigationController
                let playlistViewController = navigationController.viewControllers[0] as! PlaylistViewController
                playlistViewController.tableView.reloadData()
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
    
    /**
     solfeggioスイッチが押された時（Action→ValueChanged）
     →Switchに画像を指定できないという驚愕の事実が発覚したので修正
     - parameter sender: UISwitch
    @IBAction func solSwitchAction(sender: UISwitch) {
        //音源処理
        solPlayer.pitchChange(solSwitch.on)
        //画像を差し替え
        solSwitch.onImage = UIImage(named: "solSwitch1_on\(solPlayer.solMode).png")
    }
     */
    
    /**
     solfeggioスイッチが押された時（Action→ValueChanged）
     ※UISwitchに画像がセットできないためUIButtonで同様の機能を実装
     
     - parameter sender: UISwitch
     */
    @IBAction func solButtonAction(sender: UIButton) {
        //ON/OFF切り替え
        solButton.selected = !solButton.selected
        //音源処理
        solPlayer.pitchChange(solButton.selected)
        //画像を差し替え
        solButton.setImage(UIImage(named: "solSwitch1_on\(solPlayer.solMode).png"), forState: UIControlState.Selected)
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
        //timeShift()
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
     再生速度のセグメントが変更された時（Action→ValueChanged）
     - parameter sender: UISegmentedControl
     */
    @IBAction func speedSegmentAction(sender: UISegmentedControl) {
        var speed = 0.25
        for _ in 0 ... speedSegment.selectedSegmentIndex {
            speed = speed * 2
        }
        //スライダーと同期する
        speedSlider.value = Float(speed)
        //ラベルを書き換える
        speedLabel.text = "x \((round(speedSlider.value*10)/10))"
        //プレイヤーに速度処理変更
        solPlayer.speedChange(speedSlider.value)
    }
    
    @IBAction func repeatButtonAction(sender: UIButton) {
        //ON/OFF切り替え
        repeatButton.selected = !repeatButton.selected
        
    }
    /**
     ロック画面から呼び出されるメソッド（本来はSolPlayer内に置きたい）
     */
    override func remoteControlReceivedWithEvent(event: UIEvent?) {
        
        if event?.type == UIEventType.RemoteControl {
            switch event!.subtype {
            case UIEventSubtype.RemoteControlPlay:
                playOrPause()
                break
            case UIEventSubtype.RemoteControlPause:
                playOrPause()
                //リモート操作されるとpauseがうまく動かないため暫定対応 #74 →結局うまくいかないため戻し
                //stop()
                //solPlayer.remoteOffset = Double(timeSlider.value)
                break
//            case UIEventSubtype.RemoteControlTogglePlayPause:
//                playOrPause()
//                break
            case UIEventSubtype.RemoteControlStop:
                stop()
                break
            case UIEventSubtype.RemoteControlPreviousTrack:
                prevSongPlay()
                break
            case UIEventSubtype.RemoteControlNextTrack:
                nextSongPlay()
                break
            default:
                break
            }
        }
    }
    
    /** 他のアプリから割り込みがあった場合 */
    func beginInterruption() {
        status = solPlayer.audioPlayerNode.playing
        if status {
            pause()
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
    
    /** ヘッドフォンを挿入された場合
    func inputIsAvailableChanged(isInputAvailable: Bool) {
        //if isInputAvailable {
            //たぶんinputが使える（＝ヘッドフォンなどが刺さった）場合
        //}
        
        //どちらにせよPauseで良いのでは？
        print(inputIsAvailableChanged)
        pause()
    }
 */
    /** ヘッドフォンが挿入された時2（機能してない）*/
    func didChangeAudioSessionRoute() {
        //var desc = AVAudioSessionPortDescription()
        for desc in AVAudioSession.sharedInstance().currentRoute.outputs {
            if(desc.portType == AVAudioSessionPortHeadphones){
                print("ヘッドフォン刺さった")
            } else {
                print("ヘッドフォン抜けた")
            }
        }
        
    }
    
    /** この画面が表示された時に更新する*/
    override func viewDidAppear(animated: Bool) {
        playlistLabel.text = solPlayer.mainPlaylist.name
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }


}

