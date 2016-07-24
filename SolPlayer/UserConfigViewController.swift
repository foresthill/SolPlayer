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
    
    @IBOutlet weak var resumeSegment: UISegmentedControl!
    //ユーザ設定（コンフィグ）管理クラス呼び出し（シングルトン）
    let userConfigManager: UserConfigManager! = UserConfigManager.sharedManager
    
    override func viewDidLoad() {

        super.viewDidLoad()
        
        //solMode設定
        solModeSegment.selectedSegmentIndex = userConfigManager.solMode - 1
        
        // イトルの設定
        self.navigationItem.title = "設定"
        //self.navigationController!.navigationBar.barTintColor = UIColor.init(colorLiteralRed: 1.0, green: 0.0, blue: 0.0, alpha: 0.6)
        self.navigationController!.navigationBar.barTintColor = UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.1)
        
        //self.navigationItem.prompt = ""
        
    }
    @IBAction func solModeChange(sender: UISegmentedControl) {
        //ユーザ設定に保存
        userConfigManager.setSolMode(solModeSegment.selectedSegmentIndex + 1)
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
