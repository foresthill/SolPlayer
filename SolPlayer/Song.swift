//
//  Song.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/05.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import Foundation
import MediaPlayer

class Song {
    
    /*あれ？独自クラス作らんでもMPMediaItemそのまま使えばよくね？？→軽量化の要件が出たら。*/
    
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
    var artwork: String?
    /** 発売日 */
    var releaseDate: String?
    /** レート */
    var rating: String?
    /** ディスク番号 */
    var discNumber: String?
    /** メディアの種類 */
    var mediaType: String?
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
        //self.artwork = mediaItem.artwork.
        //self.releaseDate = mediaItem.releaseDate
        //self.totalTime = mediaItem.?
    }
    
}