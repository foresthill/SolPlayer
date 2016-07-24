//
//  Config.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/07/24.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import Foundation

class UserConfigManager {
    
    //シングルトン
    static let sharedManager = UserConfigManager()
    
    //ユーザ設定値
    var config: NSUserDefaults!
    
    //ソルフェジオのモード（ver1:440→444Hz、ver2:440→432Hz）
    var solMode:Int! = 1

    private init() {
        
        //設定値を取得する
        config = NSUserDefaults.standardUserDefaults()
        
        /* NSUserDefaultsに格納された情報を呼び出す */
        //ソルフェジオモード
        let defaultConfig = config.objectForKey("solMode")
        if(defaultConfig != nil){
            solMode = defaultConfig as! Int
        }
        
    }
    
    func setSolMode(_solMode: Int) {
        solMode = _solMode
        
        //NSUserDefaultsに格納する
        config.setObject(_solMode, forKey: "solMode")
    }
    
    
}