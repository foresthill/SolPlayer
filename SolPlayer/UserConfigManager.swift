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
    var solMode: Int! = 1
    
    //ソルフェジオモードかどうか
    var isSolMode = false
    
    //しおり（レジューム再生）機能
    var isRedume = false
    
    //再生中のプレイリスト（ID）
    var redumePlaylistId: String!
    var redumePlaylistName: String!
    
    //再生中の曲番号
    var redumeNumber: Int!
    
    //Web再生画面で検索したときの表示件数
    var resultNumber: Int!
    
    /** 初期処理 */
    private init() {
        //設定値を取得する
        config = NSUserDefaults.standardUserDefaults()
        
        /* NSUserDefaultsに格納された情報を呼び出す */
        //ソルフェジオモード
        var defaultConfig = config.objectForKey("solMode")
        if(defaultConfig != nil){
            solMode = defaultConfig as! Int
        }
        
        //しおり機能
        defaultConfig = config.objectForKey("isRedume")
        if(defaultConfig != nil){
            isRedume = defaultConfig as! Bool
        }
        
    }
    
    /** solModeをNSUserDefaultsにセットする */
    func setSolMode(_solMode: Int) {
        solMode = _solMode
        //NSUserDefaultsに格納する
        config.setObject(_solMode, forKey: "solMode")
    }
    
    /** solModeかどうかをNSUserDefaultsにセットする */
    func setIsSolMode(_isSolMode: Bool) {
        isSolMode = _isSolMode
        //NSUserDefaultsに格納する
        config.setObject(_isSolMode, forKey: "isSolMode")
    }
    
    /** solModeかどうかをNSUserDefaultsから取得する */
    func getIsSolMode() -> Bool {
        //プレイリスト名を取得
        if let defaultConfig = config.objectForKey("isSolMode") {
            isSolMode = defaultConfig as! Bool
        } else {
            isSolMode = false
        }
        return isSolMode
    }
    
    /** isRedumeをNSUserDefaultsにセットする */
    func setIsRedume(_isRedume: Bool) {
        isRedume = _isRedume
        //NSUserDefaultsに格納する
        config.setObject(_isRedume, forKey: "isRedume")
    }
    
    /** アプリ終了時にプレイリストの情報をNSUserDefaultsにセットする */
    func setRedumePlaylist(_redumePlaylist: (id:String, name:String)) {
        config.setObject(_redumePlaylist.id, forKey: "redumePlaylistId")
        config.setObject(_redumePlaylist.name, forKey: "redumePlaylistName")
    }
    
    /** アプリ開始時にプレイリストの情報をNSUserDefaultsから取得する */
    func getRedumePlaylist() -> (id: String, name: String) {
        var redumePlaylistId: String
        var redumePlaylistName: String
        
        //プレイリストIDを取得
        if let defaultConfig = config.objectForKey("redumePlaylistId") {
            redumePlaylistId = defaultConfig as! String
        } else {
            redumePlaylistId = "0"
        }
        
        //プレイリスト名を取得
        if let defaultConfig = config.objectForKey("redumePlaylistName") {
            redumePlaylistName = defaultConfig as! String
        } else {
            redumePlaylistName = "default"
        }
        
        return (redumePlaylistId, redumePlaylistName)
        
    }
    
    /** redumeNumberをNSUserDefaultsにセットする */
    func setRedumeNumber(_redumeNumber: Int) {
        redumeNumber = _redumeNumber
        //NSUserDefaultsに格納する
        config.setObject(_redumeNumber, forKey: "redumeNumber")
    }

    /** redumePlaylistIdをNSUserDefaultsから取得する */
    func getRedumeNumber() -> Int {
        let defaultConfig = config.objectForKey("redumeNumber")
        if(defaultConfig != nil){
            redumeNumber = defaultConfig as! Int
        } else {
            //とりあえず先頭の曲
            redumeNumber = 0
        }
        return redumeNumber
    }
    
    /** redumeNumberをNSUserDefaultsにセットする */
    func setResultNumber(_resultNumber: Int) {
        resultNumber = _resultNumber
        //NSUserDefaultsに格納する
        config.setObject(_resultNumber, forKey: "resultNumber")
    }
    
    /** redumePlaylistIdをNSUserDefaultsから取得する */
    func getResultNumber() -> Int {
        let defaultConfig = config.objectForKey("resultNumber")
        if(defaultConfig != nil){
            resultNumber = defaultConfig as! Int
        } else {
            //デフォルトの曲数
            resultNumber = 10
        }
        return resultNumber
    }
    
}