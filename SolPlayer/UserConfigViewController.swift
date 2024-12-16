//
//  UserConfigViewController.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/05/31.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import UIKit

class UserConfigViewController: UIViewController {
    
    /** SolModeのSegment */
    @IBOutlet weak var solModeSegment: UISegmentedControl!
    
    /** しおり（レジューム）機能のOn/Off */
    @IBOutlet weak var resumeSwitch: UISwitch!
    
    /** 検索件数を設定するSegment */
    @IBOutlet weak var resultNumSegment: UISegmentedControl!
    
    /** UserConfigManagerクラス呼び出し（シングルトン）*/
    let userConfigManager: UserConfigManager! = UserConfigManager.sharedManager
    
    /** 初期処理 */
    override func viewDidLoad() {

        super.viewDidLoad()
        
        //solMode設定
        solModeSegment.selectedSegmentIndex = userConfigManager.solMode - 1
        
        //しおりMode
        resumeSwitch.isOn = userConfigManager.isRedume
        
        //タイトルの設定
        self.navigationItem.title = "設定"
        //self.navigationController!.navigationBar.barTintColor = UIColor.init(colorLiteralRed: 1.0, green: 0.0, blue: 0.0, alpha: 0.6)
        self.navigationController!.navigationBar.barTintColor = UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.1)
        
        //self.navigationItem.prompt = ""
        
    }
    
    /** ソルフェジオモードが変更された時 */
    @IBAction func solModeChange(sender: UISegmentedControl) {
        //ユーザ設定に保存
        userConfigManager.setSolMode(_solMode: solModeSegment.selectedSegmentIndex + 1)
    }

    /** しおり（レジューム機能）が変更された時 */
    @IBAction func redumeSwitchChange(sender: AnyObject) {
        //ユーザ設定に保存
        userConfigManager.setIsRedume(_isRedume: resumeSwitch.isOn)
    }
    
    /** 表示件数（Web再生画面）が変更された時 */
    @IBAction func resultNumChange(sender: AnyObject) {
        //ユーザ設定に保存
        print(solModeSegment.tag)
        var resultNumber: Int!
        switch solModeSegment.selectedSegmentIndex {
        case 0:
            resultNumber = 10
            break
        case 1:
            resultNumber = 30
            break
        case 2:
            resultNumber = 50
            break
        case 3:
            resultNumber = 100
            break
        default:
            resultNumber = 10
            break
        }
        userConfigManager.setResultNumber(_resultNumber: resultNumber)
    }
    
    //「戻る」ボタン押下時に呼ばれるメソッド
    override func viewWillDisappear(_ animated: Bool) {
        //
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
}
