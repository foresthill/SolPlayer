//
//  ViewController.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/05/29.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import UIKit
import AVFoundation

class ViewController: UIViewController {

    @IBOutlet weak var buttonPlay: UIButton!
    
    var audioEngine: AVAudioEngine!
    var audioPlayerNode: AVAudioPlayerNode!
    var audioFile: AVAudioFile!
    
    //ソルフェジオのモード（ver1:440→444Hz、ver2:440→432Hz）
    var solMode = 1
    
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
        
        //AVAudioEngineの準備/再生
        output()
        
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
            //audioPlayerNode.play()
            output()
            buttonPlay.setTitle("PAUSE", forState: .Normal)
        }
    }
    
    func output(){
        //stop and reset
        audioEngine.stop()
        audioEngine.reset()
        
        //アタッチリスト
        var attachList:Array<AVAudioNode> = [audioPlayerNode, reverb(), timePitch(1.0), audioEngine.mainMixerNode]
        
        //AVAudioEngineにアタッチ
        /*TODO:なんか綺麗にかけないのかなぁ forEachとかで。。*/
        for i in 0 ... attachList.count-2 {
            audioEngine.attachNode(attachList[i])
            audioEngine.connect(attachList[i], to:attachList[i+1], format:audioFile.processingFormat)

        }
        
//        for i in 1 ... attachList.count-1 {
//            audioEngine.connect(attachList[i-1], to:attachList[i], format:audioFile.processingFormat)
//        }
        
        //AVAudioEngineの開始
        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            
        }
        
        //AVAudioEngineの開始
        audioPlayerNode.scheduleFile(audioFile, atTime: nil) { () -> Void in print("complete") }
        audioPlayerNode.play()
    }
    
    func reverb() -> AVAudioUnitReverb {
        //リバーブを準備する
        let reverbEffect = AVAudioUnitReverb()
        reverbEffect.loadFactoryPreset(AVAudioUnitReverbPreset.LargeHall2)
        reverbEffect.wetDryMix = 50
        
        return reverbEffect
    
    }
    
    func timePitch(rate:Float) -> AVAudioUnitTimePitch {
        //ピッチを準備する
        let timePitch = AVAudioUnitTimePitch()
        
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
        
        return timePitch
        
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

