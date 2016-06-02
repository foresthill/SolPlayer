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

class ViewController: UIViewController {

    @IBOutlet weak var buttonPlay: UIButton!
    
    var audioEngine: AVAudioEngine!
    var audioPlayerNode: AVAudioPlayerNode!
    var audioFile: AVAudioFile!
    
    //エフェクトを外出し（2016/06/03）
    var reverbEffect = AVAudioUnitReverb()
    var timePitch = AVAudioUnitTimePitch()
    
    //ソルフェジオのモード（ver1:440→444Hz、ver2:440→432Hz）
    var solMode = 1
    
    //
    var player:AVPlayer!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        
        //AVAudioEngineの生成
        audioEngine = AVAudioEngine()
        
        //AVPlayerNodeの生成
        audioPlayerNode = AVAudioPlayerNode()
        
        //AVAudioFileの生成
        do {
            audioFile = try AVAudioFile(forReading: NSURL(fileURLWithPath:
            NSBundle.mainBundle().pathForResource("BGM", ofType: "mp3")!))
        } catch {
            
        }

        //暫定的
        reverb()
        timePitch(1.0)

        //AVAudioUnitの準備/再生
        output()
        
        //AVPlayerViewController
//        let player = AVPlayer(URL: NSURL(fileURLWithPath:
//            NSBundle.mainBundle().pathForResource("BGM", ofType: "mp3")!))
        //let playerController = AVPlayerViewController()     //AVKit
        //playerController.player = player
        //self.addChildViewController(playerController.player)
        //self.view.addSubview(playerController.view)
        //playerController.view.frame = self.view.frame
        
//        let playerLayer = AVPlayerLayer(player: player)
//        playerLayer.frame = self.view.bounds
//        self.view.layer.addSublayer(playerLayer)
//        
//        player.play()
        

        
        
        //設定画面（UserConfigViewController）へ飛ぶ barButtonSystemItem: UIBarButtonSystemItem.Bookmarks
        let btn: UIBarButtonItem = UIBarButtonItem.init(barButtonSystemItem: UIBarButtonSystemItem.Compose, target: self, action: #selector(ViewController.toUserConfig))
        navigationItem.rightBarButtonItem = btn
        
        //設定値を取得する
        let config = NSUserDefaults.standardUserDefaults()
        let result = config.objectForKey("solMode")
        if(result != nil){
            solMode = result as! Int
        }
    }
    
    @IBAction func buttonPlayPressed(sender: UIButton) {
        if (audioPlayerNode.playing) {
            audioPlayerNode.pause()
            buttonPlay.setTitle("PLAY", forState: .Normal)
        } else {
            audioPlayerNode.scheduleFile(audioFile, atTime: nil, completionHandler: nil)
            //timePitch() //ちな、アタッチし直すことって出来る？  →　ダメ。'com.apple.coreaudio.avfaudio', reason: 'required condition is false: !nodeimpl->HasEngineImpl()' デタッチ＆アタッチすればいいの？アタッチ順はリストで持つ？
            audioPlayerNode.play()
            timePitch(1.0)

            //output()
            buttonPlay.setTitle("PAUSE", forState: .Normal)
        }
    }
    
    func output(){
        //stop and reset
        //audioEngine.stop()
        //audioEngine.reset()
        
        //アタッチリスト
        var attachList:Array<AVAudioNode> = [audioPlayerNode, reverbEffect, timePitch]
        
        /*
        //初期化
        if(audioEngine == nil){
            audioEngine = AVAudioEngine()
        } else {
            //AVAudioEngineをデタッチ
            audioEngine.stop()
            for i in 0 ... attachList.count-1 {
                audioEngine.detachNode(attachList[i])
            }
        }
         */
        
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
        
        /*
        //AVAudioEngineの開始
        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            
        }
        
        //AVAudioPlaynodeの開始
        audioPlayerNode.scheduleFile(audioFile, atTime: nil) { () -> Void in print("complete") }
        audioPlayerNode.play()
 */
        
    }
    
    //func reverb() -> AVAudioUnitReverb {
    func reverb() {
        //リバーブを準備する
        //let reverbEffect = AVAudioUnitReverb()
        reverbEffect.loadFactoryPreset(AVAudioUnitReverbPreset.LargeHall2)
        reverbEffect.wetDryMix = 50
        
        //return reverbEffect
    
    }
    
    //func timePitch(rate:Float) -> AVAudioUnitTimePitch {
    func timePitch(rate:Float) {
        
        //ピッチを準備する
        
        switch solMode{
            case 1:
                timePitch.pitch = 170   //440Hz→444.34Hz
                break
            case 2:
                timePitch.pitch = -310   //440Hz→432.xxHz
                break
            default:
                timePitch.pitch = 0
                break
        }

        timePitch.rate = rate
        
        //return timePitch
        
    }
    
    // 設定ボタンをタップした時の処理
    func toUserConfig(){
        performSegueWithIdentifier("toUserConfig", sender: self)
    }
    
    // プレイリストの「編集」ボタンをタップした時の処理
    func toPlaylist(){
        performSegueWithIdentifier("toPlaylist", sender: self)
    }
    

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }


}

