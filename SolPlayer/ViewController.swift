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
        
        //エフェクトを適用してAVAudioEngineを準備する
        //reverb()
        timePitch()

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
    
    @IBAction func buttonPlayPressed(sender: UIButton) {
        if (audioPlayerNode.playing) {
            audioPlayerNode.pause()
            buttonPlay.setTitle("PLAY", forState: .Normal)
        } else {
            audioPlayerNode.scheduleFile(audioFile, atTime: nil, completionHandler: nil)
            audioPlayerNode.play()
            buttonPlay.setTitle("PAUSE", forState: .Normal)
        }
    }
    
    func reverb() {
        //リバーブを準備する
        let reverbEffect = AVAudioUnitReverb()
        reverbEffect.loadFactoryPreset(AVAudioUnitReverbPreset.LargeHall2)
        reverbEffect.wetDryMix = 50
        
        //AVAudioEngineにアタッチ
        audioEngine.attachNode(audioPlayerNode)
        audioEngine.attachNode(reverbEffect)

        //AVPlayerNodeをAVAudioEngineへ
        audioEngine.connect(audioPlayerNode, to: reverbEffect, format: audioFile.processingFormat)
        audioEngine.connect(reverbEffect, to: audioEngine.mainMixerNode, format: audioFile.processingFormat)
        
    }
    
    func timePitch() {
        //ピッチを準備する
        let timePitch = AVAudioUnitTimePitch()
        timePitch.pitch = 1000
        //timePitch.rate = 0.5
        
        //AVAudioEngineにアタッチ
        audioEngine.attachNode(audioPlayerNode)
        audioEngine.attachNode(timePitch)
        
        //AVPlayerNodeをAVAudioEngineへ
        audioEngine.connect(audioPlayerNode, to: timePitch, format: audioFile.processingFormat)
        audioEngine.connect(timePitch, to: audioEngine.mainMixerNode, format: audioFile.processingFormat)
        
    }
    

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }


}

