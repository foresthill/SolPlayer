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
    
    @IBOutlet weak var solSwitch: UISwitch!
    
    @IBOutlet weak var songTitle: UILabel!
    @IBOutlet weak var artist: UILabel!
    
    @IBOutlet weak var timeSlider: UISlider!
    @IBOutlet weak var nowTimeLabel: UILabel!
    @IBOutlet weak var endTimeLabel: UILabel!

    @IBOutlet weak var speedSlider: UISlider!
    @IBOutlet weak var speedLabel: UILabel!

    //AVKit
    var audioEngine: AVAudioEngine!
    var audioPlayerNode: AVAudioPlayerNode!
    var audioFile: AVAudioFile!
    
    //エフェクトを外出し（2016/06/03）
    var reverbEffect: AVAudioUnitReverb!
    var timePitch: AVAudioUnitTimePitch!
    
    //ソルフェジオのモード（ver1:440→444Hz、ver2:440→432Hz）
    var solMode = 1
    
    //プレイヤー（使う？）
    var player: AVPlayer!
    
    //停止処理
    var pausedTime: Float!
    
    //タイマー
    var timer:NSTimer!
    
    //総再生時間
    var duration: Double!
    
    //サンプルレート
    var sampleRate: Double!
    
    //時間をずらした時の辻褄あわせ
    var offset = 0.0
    
    //ユーザ設定値
    var config: NSUserDefaults!
    
    //プレイリスト
    //var playlist: [MPMediaItem]!
    
    //再生中の曲番号
    var numbar: Int!
    
    //停止フラグ（プレイリストの再読み込みなど）
    var stopFlg = true
    
    //appDelegate外出し
    //var appDelegate: AppDelegate!
    
    /** 
     初期処理
     */
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        
        //playlist = nil

        //1.audioFileを読み込む
        readAudioFile()

        //2.AVAudioUnitの準備/再生
        //initAudioEngine()
        
        //タイマーを初期化
        timer = NSTimer()
        
        //設定値を取得する
        config = NSUserDefaults.standardUserDefaults()

    }
    
    
    /**
     audioFileを読み込む
     */
    func readAudioFile(){
        
        //AppDelegateのインスタンスを取得しplayListを取得
        
        let appDelegate = UIApplication.sharedApplication().delegate as! AppDelegate
        let playlist = appDelegate.playlist
        
        //読み込み処理
        do {
            if(playlist != nil){
                //AVAudioFileの読み込み
                audioFile = try AVAudioFile(forReading: playlist![0].assetURL!)

            } else {
                audioFile = try AVAudioFile(forReading: NSURL(fileURLWithPath:
                    NSBundle.mainBundle().pathForResource("BGM", ofType: "mp3")!))
                
            }
            
            //サンプルレートの取得
            sampleRate = audioFile.fileFormat.sampleRate
            //再生時間
            duration = Double(audioFile.length) / sampleRate
            //終了時間のラベルを設定
            endTimeLabel.text = formatTimeString(Float(duration))
            //スライダーの最大値を設定
            timeSlider.maximumValue = Float(duration)

        } catch {
            //TODO:ファイルが読み込めなかった場合のエラーハンドリング
        }
        
        //AudioEngineを初期化
        initAudioEngine()
    }
    
    /** 
     AudioEngineを初期化
     */
    func initAudioEngine(){
        
        //AVAudioEngineの生成
        audioEngine = AVAudioEngine()

        //AVPlayerNodeの生成
        audioPlayerNode = AVAudioPlayerNode()

        //アタッチリスト
        reverbEffect = AVAudioUnitReverb()
        timePitch = AVAudioUnitTimePitch()
        
        var attachList:Array<AVAudioNode> = [audioPlayerNode, reverbEffect, timePitch]
        
        //AVAudioEngineにアタッチ
        /*TODO:なんか綺麗にかけないのかなぁ forEachとかで。。*/
        for i in 0 ... attachList.count-1 {
            audioEngine.attachNode(attachList[i])
            if(i >= 1){
                audioEngine.connect(attachList[i-1], to:attachList[i], format:audioFile.processingFormat)
            }
        }
        //ミキサー出力
        audioEngine.connect(attachList.last!, to:audioEngine.mainMixerNode, format:audioFile.processingFormat)
        
        //AVAudioEngineの開始
        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            
        }
        
    }

    
    /* 現在の再生時刻を返す */
    func currentPlayTime() -> Float {
        
        if audioPlayerNode.playing {
            
            if(sampleRate == 0){
                return 0
            }
            
            //let currentRate = audioPlayerNode.playerTimeForNodeTime(audioPlayerNode.lastRenderTime!)?.sampleRate
            
            //便宜上分かりやすく書いてみる
            let nodeTime = audioPlayerNode.lastRenderTime
            let playerTime = audioPlayerNode.playerTimeForNodeTime(nodeTime!)
            let currentTime = (Double(playerTime!.sampleTime) / sampleRate)
            
            print(nodeTime)
            print(playerTime)
            print(currentTime)
            
            return (Float)(currentTime + offset)
            //return (Float)(currentTime)
            
        } else {
            //停止時
            return pausedTime
        
        }
    
    }
    

    
    /* 再生処理 */
    func play(){
        //停止時に変更された内容を適用
        //apply()
        
        //2度押し対策？
        if audioPlayerNode.playing {
            return
        }
        
        //タイマー始動
        timer = NSTimer.scheduledTimerWithTimeInterval(1, target: self, selector: #selector(ViewController.didEverySecondPassed), userInfo: nil, repeats: true)
        
        //再読み込み
        if stopFlg {
            readAudioFile()
            stopFlg = false
        }
        
        //再生
        audioPlayerNode.scheduleFile(audioFile, atTime: nil, completionHandler: nil)
        audioPlayerNode.play()
        playButton.setTitle("PAUSE", forState: .Normal)
    }
    
    /**
     一時停止処理
     */
    func pause(){
        
        //二度押し対策？
        if !audioPlayerNode.playing {
            return
        }
        
        pausedTime = currentPlayTime()
        
        audioPlayerNode.pause()
        playButton.setTitle("PLAY", forState: .Normal)
        
    }
    
    /**
     停止処理
     */
    func stop(){
        
        timer = nil
        
        audioPlayerNode.stop()
        
        nowTimeLabel.text = "00:00:00"
        endTimeLabel.text = "00:00:00"
        
        offset = 0.0
        
        timeSlider.value = 0
        
        pausedTime = 0.0
        
        stopFlg = true
        
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
    
    
    /* 適用処理（必要？） */
    func apply(){
        speedChange()
        pitchChange()
        
    }
    
    
    //func reverb() -> AVAudioUnitReverb {
    func reverb() {
        //リバーブを準備する
        //let reverbEffect = AVAudioUnitReverb()
        reverbEffect.loadFactoryPreset(AVAudioUnitReverbPreset.LargeHall2)
        reverbEffect.wetDryMix = 50
        
        //return reverbEffect
    
    }
    
    // 設定ボタンをタップした時の処理
    func toUserConfig(){
        performSegueWithIdentifier("toUserConfig", sender: self)
    }
    
    // プレイリストの「編集」ボタンをタップした時の処理
    func toPlaylist(){
        performSegueWithIdentifier("toPlaylist", sender: self)
    }
    
    /** 
     ソルフェジオモードon/off（ピッチ変更）処理
     */
    func pitchChange(){
        
        //設定値を取得する
        let result = config.objectForKey("solMode")
        if(result != nil){
            solMode = result as! Int
        }
        
        if(solSwitch.on){
            switch solMode{
            case 1:
                timePitch.pitch = 170   //440Hz→444.34Hz
                break
            case 2:
                timePitch.pitch = -310   //440Hz→432.xxHz
                break
            default:
                timePitch.pitch = 0
            }
        } else {
            timePitch.pitch = 0
        }
        
    }
    
    /**
     再生スピード変更処理
     */
    func speedChange(){
        timePitch.rate = speedSlider.value
        speedLabel.text = "x \((round(speedSlider.value*10)/10))"
    }
    
    /**
     シークバーを動かした時の処理
     */
    func timeShift(){
        
        //let current = currentPlayTime()
        let current = timeSlider.value
        
        //退避
        offset = Double(current)
        
        //シーク位置（AVAudioFramePosition）取得
        let restartPosition = AVAudioFramePosition(Float(sampleRate) * current)
        
        //残り時間取得(sec)
        let remainSeconds = Float(self.duration) - current
        
        //残りフレーム数（AVAudioFrameCount）取得
        let remainFrames = AVAudioFrameCount(Float(sampleRate) * remainSeconds)

        //pause状態でseekbarを動かした場合→動かした後もpause状態を維持する（最後につじつま合わせる）
        let playing = audioPlayerNode.playing
        
        audioPlayerNode.stop()
        
        if remainFrames > 100 {
            //指定の位置から再生するようスケジューリング
            audioPlayerNode.scheduleSegment(audioFile, startingFrame: restartPosition, frameCount: remainFrames, atTime: nil, completionHandler: nil)
        }
        
        audioPlayerNode.play()
        
        //画面を値に合わせる
        didEverySecondPassed()
        
        //一度playしてからpauseしないと画面に反映されないため
        if(!playing){
            pause()
        }
        
    }

    /**
     毎秒ごとに行われる処理（timerで管理）
     */
    func didEverySecondPassed(){
        
        let current = currentPlayTime()
        
        nowTimeLabel.text = formatTimeString(current)
        endTimeLabel.text = "-" + formatTimeString(Float(duration) - current)
        
        //timeSlider.value = current / Float(duration)
        timeSlider.value = current
        
    }
    
    /**
     solfeggioスイッチが押された時（Action→ValueChanged）
     
     - parameter sender: UISwitch
     */
    @IBAction func solSwitchAction(sender: UISwitch) {
        pitchChange()
    }
    
    /* 再生ボタンが押された時 */
    @IBAction func playButtonPressed(sender: UIButton) {
        if audioPlayerNode.playing {
            pause() //再生時→停止処理
        } else {
            play()  //停止時→再生処理
        }
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
        timeShift()
    }
    
    /**
     再生速度のスライダーが変更された時（Action→ValueChanged）
     - parameter sender: UISlider
     */
    @IBAction func speedSliderAction(sender: UISlider) {
        speedChange()
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }


}

