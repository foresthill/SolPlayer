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
    var audioFilePlayer: AVAudioPlayerNode!
    var audioFile: AVAudioFile!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        
        //AVAudioEngineの生成
        audioEngine = AVAudioEngine()
        
        //AVPlayerNodeの生成
        audioFilePlayer = AVAudioPlayerNode()
        
        //AVAudioFileの生成
        do {
            audioFile = try AVAudioFile(forReading: NSURL(fileURLWithPath:
            NSBundle.mainBundle().pathForResource("BGM", ofType: "mp3")!))
        } catch {
            
        }
        
        //AVAudioEngineの開始
        audioEngine.attachNode(audioFilePlayer)
        
        //AVPlayerNodeをAVAudioEngineへ
        audioEngine.connect(audioFilePlayer, to: audioEngine.mainMixerNode, format: audioFile.processingFormat)
        
        //AVAudioEngineの開始
        do {
            try audioEngine.start()
        } catch {
            
        }
        
    }
    
    @IBAction func buttonPlayPressed(sender: UIButton) {
        if (audioFilePlayer.playing) {
            audioFilePlayer.pause()
            buttonPlay.setTitle("PLAY", forState: .Normal)
        } else {
            audioFilePlayer.scheduleFile(audioFile, atTime: nil, completionHandler: nil)
            audioFilePlayer.play()
            buttonPlay.setTitle("PAUSE", forState: .Normal)
        }
    }
    

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }


}

