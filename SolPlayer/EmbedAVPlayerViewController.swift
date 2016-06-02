//
//  MyAVPlayerViewController.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/01.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import AVFoundation
import AVKit

class EmbedAVPlayerViewController: AVPlayerViewController{
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        self.player = AVPlayer(URL: NSURL(fileURLWithPath:
            NSBundle.mainBundle().pathForResource("BGM", ofType: "mp3")!))
    }
    
}
