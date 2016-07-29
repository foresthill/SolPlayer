//
//  SolPlayer.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/11.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import UIKit
import AVKit
import AVFoundation
import MediaPlayer
import CoreData

/** 
 SolffegioPlayer本体（音源再生を管理する）
 */
class SolPlayer {
    
    //シングルトン
    static let sharedManager = SolPlayer()
    
    //AVKit
    var audioEngine: AVAudioEngine!
    var audioPlayerNode: AVAudioPlayerNode! = AVAudioPlayerNode()
    var audioFile: AVAudioFile!
    
    //エフェクトを外出し（2016/06/03）
    var reverbEffect: AVAudioUnitReverb! = AVAudioUnitReverb()
    var timePitch: AVAudioUnitTimePitch! = AVAudioUnitTimePitch()
    
    //ソルフェジオSwitchの画像
    var solSwitchImage: UIImage!
    
    //停止時間（初期化してないと（nilだと）最初のcurrentTimePlay()で落ちる） #74
    var pausedTime: Float! = 0.0
    
    //タイマー
    var timer:NSTimer!
    
    //総再生時間
    var duration: Double!
    
    //サンプルレート
    var sampleRate: Double!
    
    //時間をずらした時の辻褄あわせ
    var offset = 0.0
    
    //リモートで操作された時
    var remoteOffset = 0.0
    
    //再生時間（急に落ちた時などのエラーハンドリングとして）
    var currentTime = 0.0
    
    //曲情報外出し
    var song: Song2!
    //var song: MPMediaItem!
    
    //再生中の曲番号
    var number: Int!

    //再生中のプレイリスト（ViewController）
    //var playlist: [Song]! = nil
    //var playlist:[MPMediaItem]!
    //var playlist = [NSManagedObject]()
    var playlist:[Song2]!
    
    //編集中のプレイリスト（PlaylistViewController） #64, #81
    //var editPlaylist:[MPMediaItem]!
    var editPlaylist:[Song2]!
    
    //プレイリストのリスト。#64
    var allPlaylists:[(id: String, name: String)]!
    
    //メイン（再生中）のプレイリスト名 #64, #81, #103
    var mainPlaylist: (id: String, name: String)!
    
    //サブ（待機中）のプレイリスト名 #64, #81, #103
    var subPlaylist: (id: String, name: String)!
    
    //停止フラグ（プレイリストの再読み込みなど）
    var stopFlg = true
    
    //appDelegate外出し
    var appDelegate: AppDelegate! = UIApplication.sharedApplication().delegate as! AppDelegate
    
    //画面ロック時にも再生を続ける
    let session: AVAudioSession = AVAudioSession.sharedInstance()
    
    //Coder（2016/06/19Test）
    //let coder = NSCoder()
    
    //全曲リピート（１曲リピートはViewControllerで）
    var repeatAll = false
    
    //エンティティの変数名
    let SONG = "Song"
    let PLAYLIST = "Playlist"
    
    //ユーザ設定（コンフィグ）管理クラス呼び出し（シングルトン）
    let userConfigManager: UserConfigManager! = UserConfigManager.sharedManager
    
    /**
     初期処理（シングルトンクラスのため外部からのアクセス禁止）
     */
    private init(){
        //画面ロック時も再生のカテゴリを指定
        do {
            try session.setCategory(AVAudioSessionCategoryPlayback)
            //try session.setCategory(AVAudioSessionCategoryPlayAndRecord)
            //オーディオセッションを有効化
            try session.setActive(true)
        } catch {
            
        }
        
        //画面ロック時のアクションを取得する（取得できなかったため暫定的にViewControllerで行う）
        //UIApplication.sharedApplication().beginReceivingRemoteControlEvents()
        
        //画面ロック時の曲情報を持つインスタンス
        //var defaultCenter = MPNowPlayingInfoCenter.defaultCenter()
        
        //曲順を読み込み #103
        number = userConfigManager.getRedumeNumber()
        
        //プレイリスト情報を読み込み #103
//        mainPlaylist = userConfigManager.getRedumePlaylist()
//        subPlaylist = mainPlaylist
        subPlaylist = userConfigManager.getRedumePlaylist()
        
        //defaultのプレイリストを読み込み→UserDefaultsに保存されたプレイリストIDを読み込み #103（2016/07/24）
//        do {
//            playlist = try loadPlayList(mainPlaylist.id)
//        } catch {
//            
//        }
        
        //プレイリストのリストを読み込み
        do {
            try loadAllPlayLists()
        } catch {
            
        }
        
        //曲情報を読み込む（一瞬だけ曲を再生して停止する） #103
        /*
        //do{ try readAudioFile() } catch { }
        do {
            try play()
            if let playtime = song.playTime {
                timeShift(Float(playtime))
            }
            pause()
        } catch {
            
        }
         */
        
        //画面ロック時のアクションを取得する
        UIApplication.sharedApplication().beginReceivingRemoteControlEvents()
        
    }
    
    /** "C"RUD:プレイリスト新規作成 #64 */
    func newPlayList(name: String) throws -> String {
    
        let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
        
        do {
            let entity = NSEntityDescription.entityForName(PLAYLIST, inManagedObjectContext: managedContext)
            let playlistObject = NSManagedObject(entity: entity!, insertIntoManagedObjectContext: managedContext)
            
            //PersistentID（曲を一意に特定するID）を代入
            let id = generateID()
            playlistObject.setValue(id, forKey: "id")
            
            //プレイリストのIDを代入
            playlistObject.setValue(name, forKey: "name")
            
            //CoreDataに保存
            try managedContext.save()
            
            return id
            
        } catch {
            throw AppError.CantMakePlaylistError
        }
    }
    
    /** ID生成（プレイリスト作成時に使う：NSManagedObjectIDの使い方がわかるまで）*/
    //func generateID() -> NSNumber {
//    func generateID() -> Int {
//    func generateID() -> UInt {
    func generateID() -> String {
    
        let now = NSDate()
        
        let formatter = NSDateFormatter()
        formatter.dateFormat = "yyyyMMddHHmmss"
        
        let string: String = formatter.stringFromDate(now)
        
        //return Int(string)!   //これだとおかしくなる
        
//        let numberFormat = NSNumberFormatter()
        
//        return numberFormat.numberFromString(string) as! Int
//        return UInt(string)!
        return string
    }
    
    /** C"R"UD:プレイリストのリストを読込 #64 */
    func loadAllPlayLists() throws {
        
        //defaultを設定
//        allPlaylists = [(0,"default")]
        allPlaylists = [("0","default")]
        
        do {
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
            let fetchRequest = NSFetchRequest(entityName:PLAYLIST)
            let fetchResults = try managedContext.executeFetchRequest(fetchRequest)
        
            if let results: Array = fetchResults {
                
                for playlistObject:AnyObject in results {
                    //persistentIDを頼りに検索
//                    let id: NSNumber = playlistObject.valueForKey("id") as! NSNumber
//                    let id: Int = playlistObject.valueForKey("id") as! Int
                    
                    //CoreDataマイグレーション Numberの場合はStringに変換
//                    var playlistId = playlistObject.valueForKey("id")
//                    
//                    if playlistId!.isKindOfClass(NSNumber) {
//                        playlistId = String(playlistId)
//                    }
                    
                    let id: String = playlistObject.valueForKey("id") as! String
                    let name: String = playlistObject.valueForKey("name") as! String
                    //読み込んだMPMediaItemをプレイリストに追加
//                    if(id != 0){
                    if(id != "0"){
                        allPlaylists.append((id, name))
                    }
                }
                
            }
            
        } catch {
            throw AppError.CantLoadError
            
        }
        
    }
    
    /** C"R"UD:MediaQueryで曲を読込み #81 */
    func loadSong(songId: NSNumber) -> MPMediaItem {
        
        var mediaItem = MPMediaItem()
        
        let property: MPMediaPropertyPredicate = MPMediaPropertyPredicate(value: songId, forProperty: MPMediaItemPropertyPersistentID)
        
        let query: MPMediaQuery = MPMediaQuery()
        query.addFilterPredicate(property)
        
        let items: [MPMediaItem] = query.items! as [MPMediaItem]
        if(items.count > 0){
            mediaItem = items[items.count - 1]
        }
        
        return mediaItem
    }
    
    /** C"R"UD:プレイリストの曲を読込 #81 */
    //func loadPlayList(playlistId: String) throws -> Array<MPMediaItem> {
    func loadPlayList(playlistId: String) throws -> Array<Song2> {
        
        //プレイリストを初期化
        //var retPlaylist = Array<MPMediaItem>()
        var retPlaylist = Array<Song2>()
        
        do {
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
            //フェッチリクエストを設定
            let fetchRequest = NSFetchRequest(entityName:SONG)
            fetchRequest.predicate = NSPredicate(format: "playlist = %@", playlistId)
            //ソート設定
            let sortDescriptor: NSSortDescriptor = NSSortDescriptor(key:"index", ascending: true)
            fetchRequest.sortDescriptors = [sortDescriptor]
            //フェッチ実行
            let fetchResults = try managedContext.executeFetchRequest(fetchRequest)
            
            if let results: Array = fetchResults {
                
                for songObject:AnyObject in results {
                    //persistentIDを頼りに検索
                    let mediaItem:MPMediaItem = loadSong(songObject.valueForKey("persistentID") as! NSNumber)
                    //読み込んだMPMediaItemをプレイリストに追加
                    if(mediaItem.valueForKey("assetURL") != nil){
                        //retPlaylist.append(mediaItem)
                        let song2 = Song2(mediaItem: mediaItem)
                        //再生時間をセット #103
                        song2.playTime = songObject.valueForKey("playTime") as? Double
                        //print(songObject.valueForKey("playTime"))
                        retPlaylist.append(song2)
                    }
                }
                
            }
            
            return retPlaylist

        } catch {
            throw AppError.CantLoadError
            
        }

    }
    
    /**
     CR"U"D:再生中の曲を更新（再生時間を保存する）#103
      - parameter isRedume（trueの場合は時間を保存、falseの場合は時間をリセット）
     */
    func saveSong(isRedume: Bool) throws {
        //func saveSong(mediaItem: MPMediaItem) throws {
        //func saveSong(_song: Song2) throws {

        //SONGエンティティに保存する
        //let entity = NSEntityDescription.entityForName(SONG, inManagedObjectContext: managedContext)
        
        //フェッチ実行
        do {
            //保存準備
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
            
            let fetchRequest = NSFetchRequest(entityName:SONG)
//            let temp: NSDecimalNumber = NSDecimalNumber(unsignedLongLong: song.persistentID!)
            //let fetchRequest = NSFetchRequest()
            //fetchRequest.entity = NSEntityDescription.entityForName(SONG, inManagedObjectContext: managedContext)
//            fetchRequest.predicate = NSPredicate(format: "persistentID = %d", NSNumber(unsignedLongLong: song.persistentID!))
//            fetchRequest.predicate = NSPredicate(format: "persistentID = %d", temp)
            fetchRequest.predicate = NSPredicate(format: "playlist = %@ and index = %d", mainPlaylist.id, number)

            let fetchResults = try managedContext.executeFetchRequest(fetchRequest)
            if let results: Array = fetchResults {
                    
                for songObject:AnyObject in results {
                    //songObject = NSManagedObject(entity: entity!, insertIntoManagedObjectContext: managedContext)
                    let songModel = songObject as! Song
                    
                    if(isRedume){
                        //trueの場合は時間を記録
                        songModel.playTime = currentPlayTime()
                    } else {
                        //falseの場合は時間をリセット
                        songModel.playTime = 0.0
                    }
                    
                    //アプリ上の変数も更新（基本的には１回しか通らないはず） #103
                    playlist[number].playTime = songModel.playTime as? Double
                }
    
                //更新（永続化処理）
                appDelegate.saveContext()
                
            }
            
        } catch {
            throw AppError.CantSaveError
        }

    }
    
    /** "C"RUD:プレイリストの曲を保存（永続化処理） #81 */
    func savePlayList(playlistId: String) throws {
        //
        let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext

        do {
            for (index, song) in editPlaylist.enumerate() {
                let entity = NSEntityDescription.entityForName(SONG, inManagedObjectContext: managedContext)
                let songObject = NSManagedObject(entity: entity!, insertIntoManagedObjectContext: managedContext)

                //PersistentID（曲を一意に特定するID）を代入
                //let songId = song.persistentID as UInt64
                let songId = song.persistentID
                //songObject.setValue(NSNumber(unsignedLongLong: songId), forKey: "persistentID")
                songObject.setValue(NSNumber(unsignedLongLong: songId!), forKey: "persistentID")

                //プレイリストのIDを代入
                songObject.setValue(playlistId, forKey: "playlist")
                
                //曲順を代入
                songObject.setValue(index, forKey: "index")
                
                try managedContext.save()
            }
        } catch {
            throw AppError.CantSaveError
        }

    }
    
    /** CRU"D":プレイリストの曲を削除（１曲削除） */
    func removeSong(persistentId: UInt64) throws {
        
        do {
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext

            let fetchRequest = NSFetchRequest(entityName:SONG)
            fetchRequest.predicate = NSPredicate(format: "persistentID = %d", persistentId)

            let fetchResults = try managedContext.executeFetchRequest(fetchRequest)

            if let results: Array = fetchResults {
                
                for songObject:AnyObject in results {
                    //削除
                    managedContext.deleteObject(songObject as! NSManagedObject)
                    
                }
                
            }

        } catch {
            throw AppError.CantRemoveError
        }
        
    }
    
    /** CRU"D":プレイリストの曲を削除（全曲削除） */
    func removeAllSongs(playlistId: String) throws {
        do {
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
            
            let fetchRequest = NSFetchRequest(entityName:SONG)
            fetchRequest.predicate = NSPredicate(format: "playlist = %@", playlistId)
            
            let fetchResults = try managedContext.executeFetchRequest(fetchRequest)
            
            if let results: Array = fetchResults {
                
                for songObject:AnyObject in results {
                    //削除
                    managedContext.deleteObject(songObject as! NSManagedObject)
                }
                
            }
            
        } catch {
            throw AppError.CantRemoveError
        }
        
    }
    
    /** CRU"D":プレイリスト自体を削除 */
    func removePlaylist(playlistId: String) throws {
        
        do {
            //最初にプレイリストに入っている曲を削除
            try removeAllSongs(playlistId)
            //それからプレイリストを削除
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
            
            let fetchRequest = NSFetchRequest(entityName:PLAYLIST)
            //playlistId（String）を元に曲を検索
            fetchRequest.predicate = NSPredicate(format: "id = %@", playlistId)
            //検索を実行
            let fetchResults = try managedContext.executeFetchRequest(fetchRequest)
            
            
            if let results: Array = fetchResults {
                
                for songObject:AnyObject in results {
                    //削除
                    managedContext.deleteObject(songObject as! NSManagedObject)
                }
                
            }
            
        } catch {
            throw AppError.CantRemoveError
        }
    }
    
    /** CR"U"D:プレイリストの曲を更新（実際はは削除→追加） */
    func updatePlayList(playlistId: String) throws {
    
        do {
            //全曲削除
            try removeAllSongs(playlistId)
            //全曲追加
            try savePlayList(playlistId)
            //プレイリストも更新（2016/06/26）
            if(mainPlaylist == subPlaylist){
                playlist = editPlaylist
            }
            
        } catch AppError.CantRemoveError {
            //
        } catch AppError.CantSaveError {
            //
        }
        
    }
    
    /**
     audioFileをプレイヤーに読み込む
     */
    //func readAudioFile() throws -> Song {
    func readAudioFile() throws {
        
        if !playable() {
            throw AppError.NoPlayListError
        }
        
        //AVAudioFileの読み込み処理（errorが発生した場合はメソッドの外へthrowされる）
        //number = appDelegate.number
        
        //プレイリストが変更されている場合
        if(number >= playlist.count){
            number = playlist.count - 1
        }
        
        song = playlist[number]
        
        //let assetURL = song.valueForProperty(MPMediaItemPropertyAssetURL) as! NSURL
        audioFile = try AVAudioFile(forReading: song.assetURL!)
        
        //サンプルレートの取得
        sampleRate = audioFile.fileFormat.sampleRate
        
        //再生時間
        duration = Double(audioFile.length) / sampleRate

        //AudioEngineを初期化
        initAudioEngine()
        
        //画面ロック時の情報を指定 #73
        let defaultCenter = MPNowPlayingInfoCenter.defaultCenter()
        
        //let playbackTime:NSTimeInterval = Double(currentPlayTime())
        //print(playbackTime)
        
        //ディクショナリ型で定義
        defaultCenter.nowPlayingInfo = [
            MPMediaItemPropertyTitle:(song.title ?? "No Title"),
            MPMediaItemPropertyArtist:(song.artist ?? "Unknown Artist"),
            MPMediaItemPropertyPlaybackDuration:duration!,
            MPNowPlayingInfoPropertyPlaybackRate:1.0,
            //MPNowPlayingInfoPropertyElapsedPlaybackTime: playbackTime
        ]
        
        if let artwork = song.artwork {
            defaultCenter.nowPlayingInfo![MPMediaItemPropertyArtwork] = artwork
        }

    }
    
    /**
     AudioEngineを初期化
     */
    func initAudioEngine(){
        
        //AVAudioEngineの生成
        audioEngine = AVAudioEngine()
        
        //AVPlayerNodeの生成
        audioPlayerNode = AVAudioPlayerNode()
        
        //アタッチリスト
        var attachList:Array<AVAudioNode> = [audioPlayerNode, reverbEffect, timePitch]
        
        //AVAudioEngineにアタッチ
        /*TODO:なんか綺麗にかけないのかなぁ forEachとかで。。*/
        for i in 0 ... attachList.count-1 {
            audioEngine.attachNode(attachList[i])
            if(i >= 1){
                audioEngine.connect(attachList[i-1], to:attachList[i], format:audioFile.processingFormat)
            }
        }
        //ミキサー出力
        audioEngine.connect(attachList.last!, to:audioEngine.mainMixerNode, format:audioFile.processingFormat)
        
        //AVAudioEngineの開始
        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            
        }
        
    }
    
    
    /** 現在の再生時刻を返す */
    func currentPlayTime() -> Float {
        
        if audioPlayerNode.playing {
            
            if(sampleRate == 0){
                return 0
            }

            //便宜上分かりやすく書いてみる
            let nodeTime = audioPlayerNode.lastRenderTime
            
            //ヘッドフォンを抜き差しした（なぜかnodeTimeがnilになる）時のエラーハンドリング #75
            if(nodeTime == nil){
                stop()
                //抜き差しされた時の時間remoteOffsetを持っておく
                remoteOffset = currentTime
                return 0
            }
            
            //便宜上分かりやすく書いてみる
            let playerTime = audioPlayerNode.playerTimeForNodeTime(nodeTime!)
            currentTime = (Double(playerTime!.sampleTime) / sampleRate)
            
            return (Float)(currentTime + offset)
            
        } else {
            //停止時
            return pausedTime
            
        }
        
    }

    /**
     solPlayer再生処理
     
     - parameter なし
     
     - throws: AppError.CantPlayError（音源ファイルの読み込みに失敗した時）
     
     - returns: なし //true（停止→再生）、false（一時停止→再生）

     */
    func play() throws {
 
        //初回再生時あるいは再読込時
        if stopFlg {
        //if(!audioPlayerNode.playing){
            do {
                if playlist == nil {
                    mainPlaylist = subPlaylist
                    //playlist = try loadPlayList(self.subPlaylist.id)
                    playlist = try loadPlayList(self.mainPlaylist.id)
                }
                
                //音源ファイルを読み込む
                try readAudioFile()
                
                //停止フラグをfalseに
                stopFlg = false
                
                //タイマーを新規で設定（2016/07/27→SolPlayerクラスに移動）→やっぱり外からでは呼べないか？
//                timer = NSTimer.scheduledTimerWithTimeInterval(1, target: self, selector: #selector(ViewController.didEverySecondPassed), userInfo: nil, repeats: true)
                
            } catch {
                //ファイルが読み込めなかった場合
                throw AppError.CantPlayError
            }
            
        }
        //player起動
        startPlayer()
        
        //曲の再生開始時間をセット #103
        if userConfigManager.isRedume {
            if let playtime = song.playTime {
                timeShift(Float(playtime))
            }
        }
    }
    
    /**
     audioPlayerNode起動（暫定的）
     */
    func startPlayer(){
        
        //再生
        audioPlayerNode.scheduleFile(audioFile, atTime: nil, completionHandler: nil)
        
        //リモート操作されるとpauseがうまく動かないため暫定対応 #74
        if(remoteOffset != 0.0){
            
            //TODO:ロック画面で再生時間が止まらないバグ対応（2016/07/11） #74　→未完
            do { try session.setActive(true) } catch {}
            
            //シーク位置（AVAudioFramePosition）取得
            let restartPosition = AVAudioFramePosition(Float(sampleRate) * Float(remoteOffset))
            
            //残り時間取得(sec)
            let remainSeconds = Float(self.duration) - Float(remoteOffset)
            
            //残りフレーム数（AVAudioFrameCount）取得
            let remainFrames = AVAudioFrameCount(Float(sampleRate) * remainSeconds)
            
            if remainFrames > 100 {
                //指定の位置から再生するようスケジューリング
                audioPlayerNode.scheduleSegment(audioFile, startingFrame: restartPosition, frameCount: remainFrames, atTime: nil, completionHandler: nil)
            }
            
            //remoteOffsetを初期化
            remoteOffset = 0.0
        }
        
        audioPlayerNode.play()
        
    }
    
    /**
     一時停止処理
     */
    func pause(){
        
        //二度押し対策？
        if !audioPlayerNode.playing {
            return
        }
        
        pausedTime = currentPlayTime()
        
        audioPlayerNode.pause()
        
    }
    
    /**
     停止処理
     */
    func stop(){
        
        if !stopFlg {
            //タイマーを初期化
            timer = nil
            
            //プレイヤーを停止
            audioPlayerNode.stop()
            
            //その他必要なパラメータを初期化
            offset = 0.0
            pausedTime = 0.0

            //停止フラグをtrueに
            stopFlg = true
            
        }
        
    }
    
    /**
     リバーブを設定する（現在未使用）
     */
    func reverb() {
        //リバーブを準備する
        //let reverbEffect = AVAudioUnitReverb()
        reverbEffect.loadFactoryPreset(AVAudioUnitReverbPreset.LargeHall2)
        reverbEffect.wetDryMix = 50
        
        //return reverbEffect
        
    }
    
    /**
     ソルフェジオモードon/off（ピッチ変更）処理
     */
    func pitchChange(solSwitch: Bool){
        
        if(solSwitch){
            switch userConfigManager.solMode {
            case 1:
                timePitch.pitch = 15.66738339053706   //17:440Hz→444.34Hz 16:440Hz→444.09Hz
                break
            case 2:
                timePitch.pitch = -31.76665363343202   //-32:440Hz→431.941776Hz
                break
            default:
                timePitch.pitch = 0
            }
        } else {
            timePitch.pitch = 0
        }
        
    }
    
    /**
     再生スピード変更処理
     
     - parameter speedSliderValue（画面の再生速度スライダーから）
     */
    func speedChange(speedSliderValue: Float){
        timePitch.rate = speedSliderValue
    }
    
    /**
     シークバーを動かした時の処理
     */
    func timeShift(current: Float){
        
        //プレイリストが読み込まれていない時にシークバーの処理を動作しないようにする #72
        if !playable() || audioFile == nil {
            return
        }
        
        //退避
        offset = Double(current)
        
        //pause状態でseekbarを動かした場合→動かした後もpause状態を維持する（最後につじつま合わせる）
        let playing = audioPlayerNode.playing
        
        //シーク位置（AVAudioFramePosition）取得
        let restartPosition = AVAudioFramePosition(Float(sampleRate) * current)
        
        //残り時間取得(sec)
        let remainSeconds = Float(self.duration) - current
        
        //残りフレーム数（AVAudioFrameCount）取得
        let remainFrames = AVAudioFrameCount(Float(sampleRate) * remainSeconds)
        
        audioPlayerNode.stop()
        
        if remainFrames > 100 {
            //指定の位置から再生するようスケジューリング
            audioPlayerNode.scheduleSegment(audioFile, startingFrame: restartPosition, frameCount: remainFrames, atTime: nil, completionHandler: nil)
        }
        
        audioPlayerNode.play()
        
        //画面を値に合わせる
//        didEverySecondPassed()
        
        //一度playしてからpauseしないと画面に反映されないため
        if !playing {
            pause()
        }
        
    }
    
    /**
     プレイリストの前の曲を読みこむ
     */
    func prevSong() throws {
        
        if !playable() {
            throw AppError.NoSongError
        }
        
        //曲の再生時間をリセット #103
        //if(userConfigManager.isRedume){
            try saveSong(false)
        //}
        
        //一般の再生プレイヤーの挙動に合わせる（ある程度進んだら、「戻る」ボタンで曲のアタマへ）
        if(currentPlayTime() > 3.0) {
            do {
                stop()
                try play()
                return
            } catch {
            }
        }
        
        //前の曲へ戻っていく（再生可能な曲に届くまで繰り返す）
        while number > 0 {
            number = number - 1
            do {
                stop()
                try play()
                return
            } catch {
            }
        }
        
        //while文を抜けてしまった場合（プレイリストの最初まで読み込める曲がなかった場合）
        throw AppError.NoSongError

    }
    
    /**
     プレイリストの次の曲を読みこむ
     - parameter status 次の曲に行ったら再生する→true ポーズ→false
     */
    func nextSong(status: Bool) throws {
        
        if !playable() {
            throw AppError.NoSongError
        }
        
        while number < playlist.count-1 {
            number = number + 1
            do {
                stop()
                try play()
                //停止中に曲を送った場合は停止する
                if(!status){
                    pause()
                }
                return
            } catch {
            }
        }
        
        /* 以下、while文を抜けてしまった場合 */
        
        //全曲リピートの場合、最初に戻る
        if(repeatAll){
            number = 0
            do {
                stop()
                try play()
                //停止中に曲を送った場合は停止する
                if(status){
                    pause()
                }
                return
            } catch {
            }
        }
        
        //プレイリストの最後まで読み込める曲がなかった場合
        throw AppError.NoSongError

    }
    
    /** 再生可能かどうか判定する（シークバーや次へなどの判定用）*/
    func playable() -> Bool{
        
        //playlist = appDelegate.playlist
        
        if(playlist != nil && playlist.count > 0){
            return true
        }
        
        return false
        
    }
    
    /** 再生/停止イベント（主にリモートイベントで使用） */
    //func remotePlayOrPause(event: MPRemoteCommandEvent) {
    func playOrPause() {
        if !audioPlayerNode.playing {
            do { try play() } catch { }
        } else {
            pause()
            //ロック画面で再生時間が止まらないバグ対応 #74
            //do { try session.setActive(false) } catch { }
            
            //remoteOffset
            //audioPlayerNode.stop()    //stopしても意味ない
        }
    }
    
    /**
     ロック画面からのイベントを処理する→ViewControllerへ移動→SolPlayer内でやってみる（2016/07/01）
     */
    //override func remoteControlReceivedWithEvent(event: UIEvent?) {
    func remoteControlReceivedWithEvent(event: UIEvent?) {
        
        if event?.type == UIEventType.RemoteControl {
            switch event!.subtype {
            case UIEventSubtype.RemoteControlPlay:
                playOrPause()
                break
            case UIEventSubtype.RemoteControlPause:
                playOrPause()
                break
            case UIEventSubtype.RemoteControlTogglePlayPause:
                if !audioPlayerNode.playing {
                    do { try play() } catch { }
                } else {
                    pause()
                }
                break
            case UIEventSubtype.RemoteControlStop:
                stop()
                break
            case UIEventSubtype.RemoteControlPreviousTrack:
                do { try prevSong() } catch { }
                break
            case UIEventSubtype.RemoteControlNextTrack:
                do { try nextSong(audioPlayerNode.playing) } catch { }
                break
            default:
                break
            }
        }
    }
    
    /** アプリ終了時の処理 #103 */
    func applicationWillTerminate() {
        //曲順を保存
        userConfigManager.setRedumeNumber(number)
        //再生中のプレイリストを保存
        userConfigManager.setRedumePlaylist(mainPlaylist)
        //曲の再生時間を保存 #103
        if(userConfigManager.isRedume){
            do { try saveSong(true) } catch { }
        }
    }
}
