//
//  SolPlayer.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/11.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import UIKit
import AVKit
import AVFoundation
import MediaPlayer

/** 
 SolffegioPlayer本体（音源再生を管理する）
 */
class SolPlayer {
    
    //シングルトン
    static let sharedManager = SolPlayer()
    
    //AVKit
    var audioEngine: AVAudioEngine!
    var audioPlayerNode: AVAudioPlayerNode!
    var audioFile: AVAudioFile!
    
    //エフェクトを外出し（2016/06/03）
    var reverbEffect: AVAudioUnitReverb!
    var timePitch: AVAudioUnitTimePitch!
    
    //ソルフェジオのモード（ver1:440→444Hz、ver2:440→432Hz）
    var solMode = 1
    
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
    var playlist: [Song]!
    
    //再生中の曲番号
    var number: Int!
    
    //停止フラグ（プレイリストの再読み込みなど）
    var stopFlg = true
    
    //appDelegate外出し
    var appDelegate: AppDelegate!
    
    //画面ロック時の曲情報を持つインスタンス
    //var defaultCenter: MPNowPlayingInfoCenter!
    
    /**
     初期処理
     */
    init(){
        //0.初期化
        playlist = nil
        number = 0
        appDelegate = UIApplication.sharedApplication().delegate as! AppDelegate
        
        //AVPlayerNodeの初期化（二度手間だがnilを防ぐ）
        audioPlayerNode = AVAudioPlayerNode()
        
        //エフェクトの初期化
        reverbEffect = AVAudioUnitReverb()
        timePitch = AVAudioUnitTimePitch()
        
        //設定値を取得する
        config = NSUserDefaults.standardUserDefaults()
        let defaultConfig = config.objectForKey("solMode")
        if(defaultConfig != nil){
            solMode = defaultConfig as! Int
        }
        
        //画面ロック時にも再生を続ける
        let session: AVAudioSession = AVAudioSession.sharedInstance()
        
        //画面ロック時も再生のカテゴリを指定
        do {
            //try session.setCategory(AVAudioSessionCategoryPlayback)
            try session.setCategory(AVAudioSessionCategoryPlayAndRecord)
            //オーディオセッションを有効化
            try session.setActive(true)
        } catch {
            
        }
        //画面ロック時のアクションを取得する
        UIApplication.sharedApplication().beginReceivingRemoteControlEvents()
        
        //画面ロック時の曲情報を持つインスタンス
        //var defaultCenter = MPNowPlayingInfoCenter.defaultCenter()
        
    }
    
    /**
     audioFileを読み込む
     */
    func readAudioFile() throws {
        
        //AppDelegateのインスタンスを取得しplayListを取得
        
        //let appDelegate = UIApplication.sharedApplication().delegate as! AppDelegate
        //playlist = appDelegate.playlist
        
        if !playable() {
            throw AppError.NoPlayListError
        }
        
        //AVAudioFileの読み込み処理（errorが発生した場合はメソッドの外へthrowされる）
        number = appDelegate.number
        
        //プレイリストが変更されている場合
        if(number >= playlist.count){
            number = playlist.count - 1
        }
        
        let song = playlist[number]
        
        audioFile = try AVAudioFile(forReading: song.assetURL!)
        
        //サンプルレートの取得
        sampleRate = audioFile.fileFormat.sampleRate
        
        //再生時間
        duration = Double(audioFile.length) / sampleRate
        
        //TODO:スライダーの最大値を設定
        //timeSlider.maximumValue = Float(duration)
        
        //AudioEngineを初期化
        initAudioEngine()
        
        //タイマーを初期化
        //timer = NSTimer()
        
        //プレイヤーラベルを設定
//        titleLabel.text = song.title ?? "No Title"
//        artistLabel.text = song.artist ?? "Unknown Artist"
//        endTimeLabel.text = formatTimeString(Float(duration)) ?? "99:59:59"
//        artworkImage.image = song.artwork?.imageWithSize(CGSize.init(width: 120, height: 120)) ?? nil
        
        //画面ロック時の情報を指定 #73
        let defaultCenter = MPNowPlayingInfoCenter.defaultCenter()
        
        //ディクショナリ型で定義
//        defaultCenter.nowPlayingInfo = [
//            MPMediaItemPropertyTitle:titleLabel.text!,
//            MPMediaItemPropertyArtist:artistLabel.text!,
//            MPMediaItemPropertyPlaybackDuration:duration!
//        ]
        
        if song.artwork != nil {
            defaultCenter.nowPlayingInfo![MPMediaItemPropertyArtwork] = song.artwork
            //MPMediaItemPropertyArtwork:song.artwork!,
        }
        
    }
    
    /** プレイリストを読み込み最新化 */
    
    
    /**
     AudioEngineを初期化
     */
    func initAudioEngine(){
        
        //AVAudioEngineの生成
        audioEngine = AVAudioEngine()
        
        //AVPlayerNodeの生成
        audioPlayerNode = AVAudioPlayerNode()
        
        //アタッチリスト
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
            
            //            print(nodeTime)
            //            print(playerTime)
            //            print(currentTime)
            
            return (Float)(currentTime + offset)
            //return (Float)(currentTime)
            
        } else {
            //停止時
            return pausedTime
            
        }
        
    }
    
    
    
    /* 再生処理 */
    func play() throws {
        //停止時に変更された内容を適用
        //apply()
        
        //2度押し対策？一旦コメントアウト。
        //        if audioPlayerNode.playing {
        //            return
        //        }
        
        
        //再読み込み（あるいは初回再生時）
        if stopFlg {
            //停止→再生
            do {
                //音源ファイルを読み込む
                try readAudioFile()
                
                //player起動
                startPlayer()
                
                //停止フラグをfalseに
                stopFlg = false
                
                //画面と再生箇所を同期をとる（停止時にいじられてもOKにする）
//                timeSlider.value = 0.0
                
            } catch {
                //TODO:ファイルが読み込めなかった場合のエラーハンドリング
                throw AppError.CantPlayError
            }
            
        } else {
            //一時停止→再生
            
            //player起動
            startPlayer()
            
        }
        
    }
    
    /**
     player起動（暫定的）
     */
    func startPlayer(){
        //タイマー始動
        timer = NSTimer.scheduledTimerWithTimeInterval(1, target: self, selector: #selector(ViewController.didEverySecondPassed), userInfo: nil, repeats: true)
        
        //再生
        audioPlayerNode.scheduleFile(audioFile, atTime: nil, completionHandler: nil)
        audioPlayerNode.play()
//        playButton.setTitle("PAUSE", forState: .Normal)
        
        //スライダーを操作可能に #72
//        timeSlider.enabled = true
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
//        playButton.setTitle("PLAY", forState: .Normal)
        
    }
    
    /**
     停止処理
     */
    func stop(){
        
        if !stopFlg {
            //タイマーを初期化
            timer = nil
            //
            audioPlayerNode.stop()
            //画面表示を初期化
//            nowTimeLabel.text = "00:00:00"
//            endTimeLabel.text = "00:00:00"
//            playButton.setTitle("PLAY", forState: .Normal)
            
            //timeSliderを0に固定していじらせない #72
//            timeSlider.value = 0
//            timeSlider.enabled = false
            
            //その他必要なパラメータを初期化
            offset = 0.0
            pausedTime = 0.0
            //停止フラグをtrueに
            stopFlg = true
        }
        
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
    
    //func reverb() -> AVAudioUnitReverb {
    func reverb() {
        //リバーブを準備する
        //let reverbEffect = AVAudioUnitReverb()
        reverbEffect.loadFactoryPreset(AVAudioUnitReverbPreset.LargeHall2)
        reverbEffect.wetDryMix = 50
        
        //return reverbEffect
        
    }
    
    /**
     ソルフェジオモードon/off（ピッチ変更）処理
     */
    func pitchChange(solSwitch: Bool){
        
        //設定値を取得する
        let result = config.objectForKey("solMode")
        if(result != nil){
            solMode = result as! Int
        }
        
        if(solSwitch){
            switch solMode{
            case 1:
                timePitch.pitch = 17   //440Hz→444.34Hz
                break
            case 2:
                timePitch.pitch = -31   //440Hz→432.xxHz
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
    func speedChange(speedSliderValue: Float){
        timePitch.rate = speedSliderValue
//        speedLabel.text = "x \((round(speedSlider.value*10)/10))"
    }
    
    /**
     シークバーを動かした時の処理
     */
    func timeShift(current: Float){
        
        //プレイリストが読み込まれていない時にシークバーの処理を動作しないようにする #72
        if !playable() || audioFile == nil {
            return
        }
        
        //let current = currentPlayTime()
//       let current = timeSlider.value
        
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
//        didEverySecondPassed()
        
        //一度playしてからpauseしないと画面に反映されないため
        if !playing {
            pause()
        }
        
    }
    
    /**
     プレイリストの前の曲を読みこむ
     */
    func prevSong(){
        
        if !playable() {
            return
        }
        
        while appDelegate.number > 0 {
            appDelegate.number = appDelegate.number - 1
            
            do {
                stop()
                try play()
                return
            } catch {
                
            }
        }
    }
    
    /**
     プレイリストの次の曲を読みこむ
     */
    func nextSong(){
        
        if !playable() {
            return
        }
        
        while appDelegate.number < playlist.count-1 {
            appDelegate.number = appDelegate.number + 1
            do {
                stop()
                try play()
                return
            } catch {
                //
            }
        }
    }
    
    /** 再生可能かどうか判定する（シークバーや次へなどの判定用）*/
    func playable() -> Bool{
        
        playlist = appDelegate.playlist
        
        if(playlist != nil && playlist.count > 0){
            return true
        }
        
        return false
        
    }

    
}
