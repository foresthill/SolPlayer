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
    /** メディアの種類 */
    var mediaType: String?
    /** 現在の再生時間→しおり（レジューム）機能で使用 @since ver2.0 */
    var playTime: Double?
    /** リピート再生開始（区間リピート） @since ver2.0 */
    var repeatStart: Double?
    /** リピート終了時間（区間リピート） @since ver2.0 */
    var repeatEnd: Double?
    /** 曲の長さ */
    //var totalTime
    
    init(){
        
    }
    
    init(mediaItem: MPMediaItem){
        self.title = mediaItem.title
        //self.assetURL = mediaItem.assetURL
        self.assetURL = mediaItem.valueForProperty(MPMediaItemPropertyAssetURL) as? NSURL
        self.artist = mediaItem.artist
        self.albumArtist = mediaItem.albumArtist
        self.albumTitle = mediaItem.albumTitle
        //self.artwork = mediaItem.artwork?.imageWithSize(CGSize.init(width: 150, height: 150))
        self.artwork = mediaItem.artwork
        //self.releaseDate = mediaItem.releaseDate
        //self.totalTime = mediaItem.?
        //MPMediaItem.en
    }
    
}