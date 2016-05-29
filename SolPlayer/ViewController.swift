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
        
        /*
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
        
        //AVAudioEngineの開始
        audioEngine.attachNode(audioPlayerNode)
        
        //AVPlayerNodeをAVAudioEngineへ
        audioEngine.connect(audioPlayerNode, to: audioEngine.mainMixerNode, format: audioFile.processingFormat)
        
        //AVAudioEngineの開始
        do {
            try audioEngine.start()
        } catch {
            
        }
        */
        
        reverb()
        
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
        
        //AVAudioEngineとAVAudioPlayerNodeを生成する
        audioEngine = AVAudioEngine()
        audioPlayerNode = AVAudioPlayerNode()
        
        //AudioFileを準備する
        let audioPath = NSURL(fileURLWithPath: NSBundle.mainBundle().pathForResource("BGM", ofType: "mp3")!)
        do {
            audioFile = try AVAudioFile(forReading: audioPath)
        } catch {
            
        }
        audioEngine.attachNode(audioPlayerNode)
        audioEngine.attachNode(reverbEffect)
        
        audioEngine.connect(audioPlayerNode, to: reverbEffect, format: audioFile.processingFormat)
        audioEngine.connect(reverbEffect, to: audioEngine.mainMixerNode, format: audioFile.processingFormat)
        
        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            
        }
        
        audioPlayerNode.scheduleFile(audioFile, atTime: nil) { () -> Void in print("complete") }
        audioPlayerNode.play()
    }
    

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }


}

