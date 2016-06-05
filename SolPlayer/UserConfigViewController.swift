//
//  UserConfigViewController.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/05/31.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import UIKit

class UserConfigViewController: UIViewController {
    
    @IBOutlet weak var solModeSegment: UISegmentedControl!
    
    //ユーザ設定保存用変数
    var config: NSUserDefaults!

    override func viewDidLoad() {

        super.viewDidLoad()
        
        config = NSUserDefaults.standardUserDefaults()
        
        let defaultConfig = config.objectForKey("solMode")
        
        if(defaultConfig != nil){
            solModeSegment.selectedSegmentIndex = defaultConfig as! Int
        
        }
        
        // タイトルの設定
        self.navigationItem.title = "ユーザ設定"
        
        //self.navigationItem.prompt = ""
        
    }
    @IBAction func solModeChange(sender: UISegmentedControl) {
        //ユーザ設定に保存
        config.setObject(solModeSegment.selectedSegmentIndex + 1, forKey: "solMode")
    }

    //「戻る」ボタン押下時に呼ばれるメソッド
    override func viewWillDisappear(animated: Bool) {
        //
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
}
