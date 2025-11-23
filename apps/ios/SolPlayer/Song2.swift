//
//  Song.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/05.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import Foundation
import MediaPlayer

class Song2 {
    
    /*あれ？独自クラス作らんでもMPMediaItemそのまま使えばよくね？？→軽量化の要件が出たら。→結局中身がよく分からんので作ることに。
     →いやMPMediaItemでいけた（2016/05）→再生時間の保存などもしたいので独自クラスで。（2016/07/24）*/
    
    /** PersistenceID(PK) */
    var persistentID: UInt64?
    /** 曲名 */
    var title: String?
    /** アセットURL */
    var assetURL: NSURL?
    /** アーティスト */
    var artist: String?
    /** アルバムアーティスト */
    var albumArtist: String?
    /** アルバム名 */
    var albumTitle: String?
    /** アートワーク */
    //var artwork: UIImage?
    var artwork: MPMediaItemArtwork?
    /** 発売日 */
    var releaseDate: String?
    /** レート */
    var rating: String?
    /** ディスク番号 */
    var discNumber: String?
    /** メディアの種類（ローカル、オンライン） */
    var mediaType: String?
    /** 現在の再生時間→しおり（レジューム）機能で使用 @since ver2.0 */
    var playTime: Double?
    /** リピート再生開始（区間リピート） @since ver2.0 */
    var repeatStart: Double?
    /** リピート終了時間（区間リピート） @since ver2.0 */
    var repeatEnd: Double?
    /** 曲の長さ（総再生時間） */
    var duration: Double?
    
    init(){
        
    }
    
    /** インスタンス作成（読み込み） */
    init(mediaItem: MPMediaItem){
        self.persistentID = mediaItem.persistentID
        self.title = mediaItem.title
        //self.assetURL = mediaItem.assetURL
        self.assetURL = mediaItem.value(forProperty: MPMediaItemPropertyAssetURL) as? NSURL
        self.artist = mediaItem.artist
        self.albumArtist = mediaItem.albumArtist
        self.albumTitle = mediaItem.albumTitle
        self.artwork = mediaItem.artwork
        self.duration = getDuration()
    }
    
    /** インスタンス作成（WebPlayViewControllerより） */
    init(_persisntenceID:UInt64, _title:String, _url:String, _artist:String, _duration:Double){
        self.persistentID = _persisntenceID
        self.title = _title
        //self.assetURL = mediaItem.assetURL
        self.assetURL = NSURL(string: _url)
        self.artist = _artist
        //self.artwork = mediaItem.artwork  //あ〜もう
        self.duration = _duration
    }
    
    func getDuration() -> Double {
        
        if self.assetURL != nil {
            do {
                let audioFile = try AVAudioFile(forReading: assetURL! as URL)
                
                //サンプルレートの取得
                let sampleRate = audioFile.fileFormat.sampleRate
                
                //再生時間
                return Double(audioFile.length) / sampleRate
                
            } catch {
               //
            }
        }
        
        return 0.0
        
    }
    
    /** 曲の再生時間を計算しセットする */
    func calcDuration() {
        //初期化
        self.duration = 0.0
        
        //assetURLが存在する場合
        if assetURL != nil {
            do {
                let audioFile = try AVAudioFile(forReading: assetURL! as URL)
                
                //サンプルレートの取得
                let sampleRate = audioFile.fileFormat.sampleRate
                
                //再生時間をセット
                self.duration = Double(audioFile.length) / sampleRate
                
            } catch {
                //
            }
        }
    }
}
