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

class ViewController: UIViewController {

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
    var config: UserDefaults!
    
    //タイマー
    var timer: Timer!
    
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

        // デフォルトの画像設定（OFF状態）
        solButton.setImage(UIImage(named: "solSwitch1"), for: .normal)
        
        // solSwitchを初期化
        if userConfigManager.getIsSolMode() {
            // 現在のモードに基づいた画像名を作成（nil合体演算子を使用）
            let solMode = userConfigManager.solMode ?? 1
            let imageName = "solSwitch1_on\(solMode)"
            
            // 画像を.selected状態に設定
            solButton.setImage(UIImage(named: imageName), for: .selected)
            // ボタンを選択状態に
            solButton.isSelected = true
            // 音源処理
            solPlayer.pitchChange(solSwitch: true)
        } else {
            // 選択されていない状態に設定
            solButton.isSelected = false
        }
        
        //曲情報を読み込む（一瞬だけ曲を再生して停止する） #103
         do {
            try play()
            //初回時はしおり機能のOn/Offにかかわらず確実に読みこむ
            if let playtime = solPlayer.song.playTime {
                solPlayer.timeShift(current: Float(playtime))
            }
            pause()
         } catch {
         
         }
 
        //ヘッドフォンの状態を取得するためにAVAudioSessionを用いる（意味ない？）
        do { try AVAudioSession.sharedInstance().setActive(true) } catch { }
        
        
        //割り込みが入った時の処理（現状うまく行っているのでコメントアウト）
        NotificationCenter.default.addObserver(self, selector: #selector(ViewController.audioSessionRouteChange), name: NSNotification.Name.AVAudioSessionInterruption, object: UIApplication.shared)

        //ヘッドフォンが抜き差しされた時のイベントを取得する
        NotificationCenter.default.addObserver(self, selector: #selector(ViewController.audioSessionRouteChange), name: NSNotification.Name.AVAudioEngineConfigurationChange, object: solPlayer.audioEngine)

        //ロック・スリープ復帰時に画面を更新する
        NotificationCenter.default.addObserver(self, selector: #selector(ViewController.viewWillAppear(_:)), name: NSNotification.Name.UIApplicationWillEnterForeground, object: UIApplication.shared)
        
        //リソースを監視
        setupAudioSessionNotifications()
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
            setPlayLabel(playing: solPlayer.audioPlayerNode.isPlaying)
            
            if stopFlg {  //停止→再生（あるいは初回再生時）
            //if stopFlg > 0 {
                //タイマーを新規で設定（2016/07/27→SolPlayerクラスに移動→戻し）
                timer = Timer.scheduledTimer(timeInterval: 1, target: self, selector: #selector(ViewController.didEverySecondPassed), userInfo: nil, repeats: true)
                setScreen(values: true)
                //画面と再生箇所を同期をとる（停止時にいじられてもOKにする）
                timeSlider.isEnabled = true
                timeSlider.value = 0.0

            } else {    //一時停止→再生
                //タイマーを再度発火 #74
                //timer.fire()
            }

        } catch {
            //うまく再生処理が開始できなかった場合は
            setScreen(values: false)
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
                endTimeLabel.text = formatTimeString(time: Float(solPlayer.duration)) ?? "-99:99:99"
                artworkImage.image = song.artwork?.image(at: CGSize.init(width: 50, height: 50)) ?? nil
            }
            
            //スライダーを操作可能に #72
            timeSlider.isEnabled = true
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
            artworkImage.image = ImageUtil.makeBoxWithColor(
                color: UIColor(red: 0.67, green: 0.67, blue: 0.67, alpha: 1.0),
                width: 40.0,
                height: 40.0
            )
            //playButton.setTitle("PLAY", forState: .Normal)
            
            //timeSliderを0に固定していじらせない #72
            timeSlider.value = 0
            timeSlider.isEnabled = false
            
            //プレイリスト情報を更新
            playlistLabel.text = solPlayer.mainPlaylist.name
            
        }
        
        //再生・一時再生ボタンをセット
        setPlayLabel(playing: solPlayer.audioPlayerNode.isPlaying)
        
    }
    
    /**
     時間をhh:mm:ssにフォーマットする
     
     - parameters:
     - time: 時刻
     
     - throws: なし
     
     - returns: 文字列（hh:mm:ss）
     */
    func formatTimeString(time: Float) -> String {
        let totalSeconds = Int(time)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let seconds = totalSeconds % 60
        return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
    }
    
    /**
     一時停止処理
     */
    func pause(){
        solPlayer.pause()
        timer = nil //意外と壊れてない？だがロック画面の変化はなし
        //timer.invalidate()    //ここでinvalidateするとTimerが壊れてしまう。ロック画面の変化もなし。
        setPlayLabel(playing: solPlayer.audioPlayerNode.isPlaying)
    }
    
    /**
     再生・一時停止判定
     */
    func playOrPause(){
        if solPlayer.audioPlayerNode.isPlaying {
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
        timeSlider.isEnabled = false

        //ラベル更新
        setPlayLabel(playing: solPlayer.audioPlayerNode.isPlaying)
    }
    
    /** 
     前の曲を再生する処理
     */
    func prevSongPlay(){
        
        do {
            //前の曲へ
            try solPlayer.prevSong(status: true)
            //画面に反映する
            setScreen(values: true)

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
                try solPlayer.saveSong(isRedume: true)
            }
            //次の曲へ（いったんtrueで）
            try solPlayer.nextSong(status: true)
            //画面に反映する
            setScreen(values: true)
        } catch {
            //setScreen(false)
        }
    }
    
    /**
     再生できる曲が無い場合にアラートを表示する
     */
    func alert(){
        let alertController = UIAlertController(title: "info", message: "再生できる曲がありません", preferredStyle: .alert)
        
        let defaultAction = UIAlertAction(title: "OK", style: .default, handler: nil)
        alertController.addAction(defaultAction)
        
        present(alertController, animated: true, completion: nil)
    }

    /**
     毎秒ごとに行われる処理（timerで管理）
     */
    @objc func didEverySecondPassed(){
        
        let current = solPlayer.currentPlayTime()
        
        nowTimeLabel.text = formatTimeString(time: current)
        endTimeLabel.text = "-" + formatTimeString(time: Float(solPlayer.duration) - current)
        
        //timeSlider.value = current / Float(duration)
        timeSlider.value = current

        //曲の最後に到達したら次の曲へ
        if current >= Float(solPlayer.duration) {
            
            //曲の再生時間をリセット #103
            if(userConfigManager.isRedume){
                do { try solPlayer.saveSong(isRedume: false) } catch { }
            }
            
            //曲を停止する
            stop()
            
            //リピート処理
            if(repeatButton.isSelected){
                do { try play() } catch { }
                return
            }
            
            //通常時処理
            do {
                //この時点でaudioPlayernode.playingはfalseとなるため、左記で判定せず次の曲を確実に再生させる
                try solPlayer.nextSong(status: true)
                
                //画面を更新する
                setScreen(values: true)
                
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
            playButton.setImage(UIImage(named: "pause64.png"), for: .normal)
        } else {
            playButton.setImage(UIImage(named: "play64.png"), for: .normal)
        }
    }

    /** solSwitchを切り替える処理 */
    func solModeChange() {
        // ON/OFF切り替え
        solButton.isSelected = !solButton.isSelected
        
        // 音源処理
        solPlayer.pitchChange(solSwitch: solButton.isSelected)
        
        // 画像を差し替え
        if solButton.isSelected {
            // ONの状態 - モードに応じた画像を設定
            let solMode = userConfigManager.solMode ?? 1  // デフォルト値として1を使用
            let imageName = "solSwitch1_on\(solMode)"
//            print("Setting ON image: \(imageName)")
            solButton.setImage(UIImage(named: imageName), for: .selected)
        } else {
            // OFFの状態 - デフォルト画像
            solButton.setImage(UIImage(named: "solSwitch1"), for: .normal)
        }
        
        // UserDefaultsに保存
        userConfigManager.setIsSolMode(_isSolMode: solButton.isSelected)
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
        solPlayer.timeShift(current: timeSlider.value)
    }
    
    /**
     再生速度のスライダーが変更された時（Action→ValueChanged）
     - parameter sender: UISlider
     */
    @IBAction func speedSliderAction(sender: UISlider) {
        solPlayer.speedChange(speedSliderValue: speedSlider.value)
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
        solPlayer.speedChange(speedSliderValue: speedSlider.value)
    }
    
    /** リピート（繰り返し）再生ボタン */
    @IBAction func repeatButtonAction(sender: UIButton) {
        //ON/OFF切り替え
        repeatButton.isSelected = !repeatButton.isSelected
        
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
        status = solPlayer.audioPlayerNode.isPlaying
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
    @objc func audioSessionRouteChange(notification: NSNotification) {
        //トリガーが確実に作動するようにする
        // メインスレッドでの実行を保証
            DispatchQueue.main.async { [weak self] in
            self?.solPlayer.stopExternal()
                self?.setPlayLabel(playing: self?.solPlayer.audioPlayerNode.isPlaying ?? false)
        }
        
    }
    
    /** この画面が表示される時に項目を更新する*/
    override func viewWillAppear(_ animated: Bool) {
        setScreen(values: !solPlayer.stopFlg)
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
    }
    
    /* NotificationCenterを使用して監視する */
    private func setupAudioSessionNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange),
            name: .AVAudioSessionRouteChange,
            object: nil
        )
    }

    @objc private func handleRouteChange(_ notification: Notification) {
        DispatchQueue.main.async { [weak self] in
            self?.solPlayer.stopExternal()
            self?.setPlayLabel(playing: self?.solPlayer.audioPlayerNode.isPlaying ?? false)
        }
    }


       deinit {
           NotificationCenter.default.removeObserver(self)
       }


}

