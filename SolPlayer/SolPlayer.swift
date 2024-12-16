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
    var timer:Timer!
    
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
    var playlist:[Song2]!
    
    //編集中のプレイリスト（PlaylistViewController） #64, #81
    var editPlaylist:[Song2]!
    
    //プレイリストのリスト。#64
    var allPlaylists:[(id: String, name: String)]!
    
    //メイン（再生中）のプレイリスト名 #64, #81, #103
    var mainPlaylist: (id: String, name: String)!
    
    //サブ（待機中）のプレイリスト名 #64, #81, #103
    var subPlaylist: (id: String, name: String)!
    
    //停止フラグ（プレイリストの再読み込みなど）
    var stopFlg = true
    //var stopFlg = 1   //0:再生中 1:停止中 2:外部要因からの停止（現在未使用）
    
    //appDelegate外出し
    var appDelegate: AppDelegate! = UIApplication.shared.delegate as? AppDelegate
    
    //画面ロック時にも再生を続ける
    let session: AVAudioSession = AVAudioSession.sharedInstance()
    
    //全曲リピート（１曲リピートはViewControllerで）
    var repeatAll = false
    
    //エンティティの変数名
    let SONG = "Song"
    let PLAYLIST = "Playlist"
    
    //ユーザ設定（コンフィグ）管理クラス呼び出し（シングルトン）
    let userConfigManager: UserConfigManager! = UserConfigManager.sharedManager
    
    //ヘッドフォンの抜き差しなど
    var interruptFlg = false
    
    //画面ロック時の情報を指定 #73　（2016/08/14外出し）
    var defaultCenter: MPNowPlayingInfoCenter!
    
    /**
     初期処理（シングルトンクラスのため外部からのアクセス禁止）
     */
    private init(){
        //画面ロック時も再生のカテゴリを指定
        do {
            try session.setCategory(AVAudioSessionCategoryPlayback)
            //オーディオセッションを有効化
            try session.setActive(true)
        } catch {
            
        }
        
        //画面ロック時の曲情報を持つインスタンス
        defaultCenter = MPNowPlayingInfoCenter.default()
        
        //曲順を読み込み #103
        number = userConfigManager.getRedumeNumber()
        
        //プレイリスト情報を読み込み #103
        subPlaylist = userConfigManager.getRedumePlaylist()
        
        //defaultのプレイリストを読み込み→UserDefaultsに保存されたプレイリストIDを読み込み #103（2016/07/24）
        
        //プレイリストのリストを読み込み
        do {
            try loadAllPlayLists()
        } catch {
            
        }

        //画面ロック時のアクションを取得する
        UIApplication.shared.beginReceivingRemoteControlEvents()
        
    }
    
    /** "C"RUD:プレイリスト新規作成 #64 */
    func newPlayList(name: String) throws -> String {
    
        let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
        
        do {
            let entity = NSEntityDescription.entity(forEntityName: PLAYLIST, in: managedContext)
            let playlistObject = NSManagedObject(entity: entity!, insertInto: managedContext)
            
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
    func generateID() -> String {
    
        let now = NSDate()
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMddHHmmss"
        
        let string: String = formatter.string(from: now as Date)
        
        return string
    }
    
    /** C"R"UD:プレイリストのリストを読込 #64 */
    func loadAllPlayLists() throws {
        
        //defaultを設定
        allPlaylists = [("0","default")]
        
        do {
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName:PLAYLIST)
            let fetchResults = try managedContext.fetch(fetchRequest)
        
            if let results = fetchResults as? [NSManagedObject] {

                for playlistObject:AnyObject in results {
                    //persistentIDを頼りに検索
                    if let id = playlistObject.value(forKey: "id") as? String,
                       let name = playlistObject.value(forKey: "name") as? String {
                        
                        //読み込んだMPMediaItemをプレイリストに追加
                        if id != "0" {
                            allPlaylists.append((id, name))
                        }
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
    func loadPlayList(playlistId: String) throws -> Array<Song2> {
        
        //プレイリストを初期化
        var retPlaylist = Array<Song2>()
        
        do {
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
            //フェッチリクエストを設定
            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName:SONG)
            fetchRequest.predicate = NSPredicate(format: "playlist = %@", playlistId)
            //ソート設定
            let sortDescriptor: NSSortDescriptor = NSSortDescriptor(key:"index", ascending: true)
            fetchRequest.sortDescriptors = [sortDescriptor]
            //フェッチ実行
            let fetchResults = try managedContext.fetch(fetchRequest)
            
            if let results = fetchResults as? [NSManagedObject] {

                for songObject:AnyObject in results {
                    //persistentIDを頼りに検索
                    if let persistentID = songObject.value(forKey: "persistentID") as? NSNumber {
                        let mediaItem = loadSong(songId: persistentID)
                    //読み込んだMPMediaItemをプレイリストに追加
                        if(mediaItem.value(forKey: "assetURL") != nil){
                            let song2 = Song2(mediaItem: mediaItem)
                            //現在の再生時間をセット #103
                            song2.playTime = songObject.value(forKey: "playTime") as? Double
                            retPlaylist.append(song2)
                        }
                    }
                }
                
            }
            
            return retPlaylist

        } catch {
            throw AppError.CantLoadError
            
        }

    }
    
    /**
     CR"U"D:再生中の曲を更新（再生時間を保存する）#103 ※保存処理については今後改善するかも
      - parameter isRedume（trueの場合は時間を保存、falseの場合は時間をリセット）
     */
    func saveSong(isRedume: Bool) throws {

        //フェッチ実行
        do {
            //保存準備
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
            
            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName:SONG)
            fetchRequest.predicate = NSPredicate(format: "playlist = %@ and index = %d", mainPlaylist.id, number)

            let fetchResults = try managedContext.fetch(fetchRequest)
            if let results = fetchResults as? [Song] {

                for songObject:AnyObject in results {
                    let songModel = songObject as! Song
                    
                    if(isRedume){
                        //trueの場合は時間を記録
                        songModel.playTime = (currentPlayTime()) as NSNumber
                        //print(songModel.playTime)
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
            for (index, song) in editPlaylist.enumerated() {
                let entity = NSEntityDescription.entity(forEntityName: SONG, in: managedContext)
                let songObject = NSManagedObject(entity: entity!, insertInto: managedContext)

                //PersistentID（曲を一意に特定するID）を代入
                //let songId = song.persistentID as UInt64
                let songId = song.persistentID
                //songObject.setValue(NSNumber(unsignedLongLong: songId), forKey: "persistentID")
                songObject.setValue(NSNumber(value: songId!), forKey: "persistentID")

                //プレイリストのIDを代入
                songObject.setValue(playlistId, forKey: "playlist")
                
                //曲順を代入
                songObject.setValue(index, forKey: "index")
                
                //現在の再生時間を代入
                songObject.setValue(song.playTime, forKey: "playTime")
                
                //総再生時間を代入
                //songObject.setValue(song.duration, forKey: "duration")
                
                try managedContext.save()
            }
        } catch {
            throw AppError.CantSaveError
        }

    }
    
    /**  CR"U"D:mainPlaylistの現在の再生時間をCoreDataに保存する #103（2016/07/30暫定版） */
    func updatePlayTime() throws {
        
        //レジューム機能がONでない場合は保存しない
        if !userConfigManager.isRedume {
            return
        }
        
        do {
            //保存準備
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
            
            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName:SONG)
            fetchRequest.predicate = NSPredicate(format: "playlist = %@", mainPlaylist.id)
            
            let fetchResults = try managedContext.fetch(fetchRequest)
            if let results: Array = fetchResults as? [Song] {
                
                for songObject:AnyObject in results {
                    let songModel = songObject as! Song
                    
                    //見た目のプレイリストと中身が合っていることが前提 #103
                    let index: Int = songModel.index as! Int
                    if index == number {
                        //現在再生中の曲はイマの状態を更新
                        playlist[index].playTime = Double(currentPlayTime())
                        
                    } else {
                        //プレイリストに入っている状態を更新
                        //songModel.playTime = playlist[index].playTime

                    }
                    //プレイリストに入っている状態を更新
                    songModel.playTime = playlist[index].playTime.map { NSNumber(value: $0) }

                    
                }
                
                //更新（永続化処理）
                appDelegate.saveContext()
                
            }
            
        } catch {
            throw AppError.CantSaveError
        }

    }
    
    /** CRU"D":プレイリストの曲を削除（１曲削除） */
    func removeSong(persistentId: UInt64) throws {
        
        do {
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext

            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName:SONG)
            fetchRequest.predicate = NSPredicate(format: "persistentID = %d", persistentId)

            let fetchResults = try managedContext.fetch(fetchRequest)

            if let results: Array = fetchResults as? [Song] {
                
                for songObject:AnyObject in results {
                    //削除
                    managedContext.delete(songObject as! NSManagedObject)
                    
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
            
            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName:SONG)
            fetchRequest.predicate = NSPredicate(format: "playlist = %@", playlistId)
            
            let fetchResults = try managedContext.fetch(fetchRequest)
            
            if let results: Array = fetchResults as? [Song] {
                
                for songObject:AnyObject in results {
                    //削除
                    managedContext.delete(songObject as! NSManagedObject)
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
            try removeAllSongs(playlistId: playlistId)
            //それからプレイリストを削除
            let managedContext: NSManagedObjectContext = appDelegate.managedObjectContext
            
            let fetchRequest = NSFetchRequest<NSFetchRequestResult>(entityName:PLAYLIST)
            //playlistId（String）を元に曲を検索
            fetchRequest.predicate = NSPredicate(format: "id = %@", playlistId)
            //検索を実行
            let fetchResults = try managedContext.fetch(fetchRequest)
            
            
            if let results: Array = fetchResults as? [Song] {
                
                for songObject:AnyObject in results {
                    //削除
                    managedContext.delete(songObject as! NSManagedObject)
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
            try removeAllSongs(playlistId: playlistId)
            //全曲追加
            try savePlayList(playlistId: playlistId)
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
        
        //audioFile取得
        audioFile = try AVAudioFile(forReading: song.assetURL! as URL)
        
        //サンプルレートの取得
        sampleRate = audioFile.fileFormat.sampleRate
        
        //曲の総再生時間を取得
        duration = song.duration
        
        if song.duration ?? 0.0 <= 0.0 {
            print("総再生時間とれてない")
            //再生時間
            duration = Double(audioFile.length) / sampleRate
        }

        //AudioEngineを初期化
        initAudioEngine()

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
            audioEngine.attach(attachList[i])
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
        
        if audioPlayerNode.isPlaying {
            
            //サンプルレートが0の時は再生時間を取得しない（というかできない）
            if(sampleRate == 0){
                return 0
            }

            //便宜上分かりやすく書いてみる
            let nodeTime = audioPlayerNode.lastRenderTime
            
            //ヘッドフォンを抜き差しした（なぜかnodeTimeがnilになる）時のエラーハンドリング #74 #75 #88
            if(nodeTime == nil){
                stopExternal()
                //画面を更新するため（UIEvent()はダミー）
                appDelegate.remoteControlReceived(with: UIEvent())
                return pausedTime
            }
            
            //便宜上分かりやすく書いてみる
            let playerTime = audioPlayerNode.playerTime(forNodeTime: nodeTime!)
            let nowPlayTime = (Double(playerTime!.sampleTime) / sampleRate)
            
            //抜き差しするとcurrentTimeが0.0になってしまうため、保存用に
            if nowPlayTime > 0.0 {
                currentTime = nowPlayTime
            }
            
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
 
        if song != nil && interruptFlg {
            //特に変化があるとは思えない→変化ある！！（2016/08/19）#74 #88
            let playTime = song.playTime ?? 0.0
            defaultCenter.nowPlayingInfo![MPNowPlayingInfoPropertyPlaybackRate] = 1.0
            defaultCenter.nowPlayingInfo![MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime + offset + playTime
        }

        if stopFlg {
            //停止：初回再生時あるいは再読込時 またはヘッドフォン抜き差し時など #88
            do {
                if playlist == nil {
                    mainPlaylist = subPlaylist
                    //playlist = try loadPlayList(self.subPlaylist.id)
                    playlist = try loadPlayList(playlistId: self.mainPlaylist.id)
                }
                
                //音源ファイルを読み込む
                try readAudioFile()
                
                //停止フラグをfalseに
                stopFlg = false
                
                //インターラプト時（ヘッドフォンが抜けた時など、途中で切られた場合）は曲をずらす必要がある #88
                if interruptFlg {
                    timeShift(current: Float(song.playTime ?? 0.0))
                    interruptFlg = false
                }
                
            } catch {
                //ファイルが読み込めなかった場合
                throw AppError.CantPlayError
            }
            
        } else {
            //一時停止：プレイヤー上で一時停止ボタンを押された後、再度再生す時
            //毎回やってみる！（2016/08/23）
            do { try audioEngine.start() } catch { }
        }

        //player起動
        startPlayer()
    }
    
    /**
     audioPlayerNode起動（暫定的）
     */
    func startPlayer(){
        //再生
        audioPlayerNode.scheduleFile(audioFile, at: nil, completionHandler: nil)
        
        //リモート操作されるとpauseがうまく動かないため暫定対応 #74
        if(remoteOffset != 0.0){
            
            //TODO:ロック画面で再生時間が止まらないバグ対応（2016/07/11） #74
            do { try session.setActive(true) } catch {}
            
            //シーク位置（AVAudioFramePosition）取得
            let restartPosition = AVAudioFramePosition(Float(sampleRate) * Float(remoteOffset))
            
            //残り時間取得(sec)
            let remainSeconds = Float(self.duration) - Float(remoteOffset)
            
            //残りフレーム数（AVAudioFrameCount）取得
            let remainFrames = AVAudioFrameCount(Float(sampleRate) * remainSeconds)
            
            if remainFrames > 100 {
                //指定の位置から再生するようスケジューリング
                audioPlayerNode.scheduleSegment(audioFile, startingFrame: restartPosition, frameCount: remainFrames, at: nil, completionHandler: nil)
            }
            //remoteOffsetを初期化
            remoteOffset = 0.0
        }
        
        //画面ロック時の情報を設定 #73, #74, #88
        //updateNowPlayingInfoCenter(stopFlg)
        updateNowPlayingInfoCenter(updateAll: true)
        
        audioPlayerNode.play()
        
    }
    
    /**
     一時停止処理
     */
    func pause(){
        
        //二度押し対策？
        if !audioPlayerNode.isPlaying {
            return
        }
        
        //pausedTime保持（2016/08/23）
        pausedTime = Float(currentTime + offset)
        
        //画面ロックの情報を更新＆時間が勝手に進まないようにする（2016/08/23）
        defaultCenter.nowPlayingInfo![MPNowPlayingInfoPropertyPlaybackRate] = 0.0
        
        //audioEngineはstopに（#74 画面ロック時の再生マークを「停止」にするために必要、あとバグ対策？）
        audioEngine.stop()
        
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
    
    /** 外部からの停止（ロック時操作、ヘッドフォンから止められた時） #88 */
    func stopExternal() {
        
        //外部停止のflgをtrueに
        interruptFlg = true
        
        //audioPlayerNodeはpauseに（2016/08/23） ※ロック画面の再生時間が一瞬巻き戻るのはこことは関係ない
        pause()
        
        //画面ロックの情報を更新＆時間が勝手に進まないようにする（2016/08/14）
        defaultCenter.nowPlayingInfo![MPNowPlayingInfoPropertyElapsedPlaybackTime] = Double(pausedTime)

        //現在の再生時間を保存
        song.playTime = Double(pausedTime)
    }
    
    /**
     リバーブを設定する（現在未使用）
     */
    func reverb() {
        //リバーブを準備する
        //let reverbEffect = AVAudioUnitReverb()
        reverbEffect.loadFactoryPreset(AVAudioUnitReverbPreset.largeHall2)
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
        let playing = audioPlayerNode.isPlaying
        
        //シーク位置（AVAudioFramePosition）取得
        let restartPosition = AVAudioFramePosition(Float(sampleRate) * current)
        
        //残り時間取得(sec)
        let remainSeconds = Float(self.duration) - current
        
        //残りフレーム数（AVAudioFrameCount）取得
        let remainFrames = AVAudioFrameCount(Float(sampleRate) * remainSeconds)
        
        audioPlayerNode.stop()
        
        if remainFrames > 100 {
            //指定の位置から再生するようスケジューリング
            audioPlayerNode.scheduleSegment(audioFile, startingFrame: restartPosition, frameCount: remainFrames, at: nil, completionHandler: nil)
        }
        
        audioPlayerNode.play()
        
        //一度playしてからpauseしないと画面に反映されないため
        if !playing {
            pause()
        }
        
    }
    
    /**
     プレイリストの前の曲を読みこむ
     */
    func prevSong(status: Bool) throws {
        
        if !playable() {
            throw AppError.NoSongError
        }
        
        //ロック画面で「停止」時に立てたフラグをリセット
        interruptFlg = false
        
        //曲の再生時間をリセット #103　※ここでCoreDataを更新する必要はないはず（2016/08/21）
        song.playTime = 0.0
        
        //一般の再生プレイヤーの挙動に合わせる（ある程度進んだら、「戻る」ボタンで曲のアタマへ）
        if(currentPlayTime() > 3.0) {
            do {
                try redumePlay(status: status)
                return
            } catch {
                //
            }
        }
       
        //前の曲へ戻っていく（再生可能な曲に届くまで繰り返す）
        while number > 0 {
            number = number - 1
            do {
                try redumePlay(status: status)
                return
            } catch {
                //
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
        
        //ロック画面で「停止」時に立てたフラグをリセット
        interruptFlg = false
        
        while number < playlist.count-1 {
            number = number + 1
            do {
                try redumePlay(status: status)
                return
            } catch {
                //
            }
        }
        
        /* 以下、while文を抜けてしまった場合 */
        
        //全曲リピートの場合、最初に戻る
        if(repeatAll){
            number = 0
            do {
                try redumePlay(status: status)
                return
            } catch {
                //
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
    
    /** 通常/レジューム再生する（「次の曲へ」等で使用）
     - parameter status:true→処理完了後に再生する false→再生しない
     
     */
    func redumePlay(status: Bool) throws {
        do {
            stop()
            try play()
            //曲の再生開始時間をセット #103
            //（外部要因によってストップした場合は設定にかかわらず）
            if userConfigManager.isRedume || interruptFlg {
            //if userConfigManager.isRedume || stopFlg == 2 {
                if let playtime = song.playTime {
                    timeShift(current: Float(playtime))
                }
                //intteruptFlgを初期化
                //interruptFlg = false
            }
            //曲情報を更新 #116
            //appDelegate.application
            
            //停止中に曲を送った場合は停止する
            if(!status){
                pause()
            }
        } catch {
            throw AppError.CantPlayError
        }
    }
    
    /** 再生/停止イベント（主にリモートイベントで使用） */
    //func remotePlayOrPause(event: MPRemoteCommandEvent) {
    func playOrPause() {
        if !audioPlayerNode.isPlaying {
            do { try play() } catch { }
        } else {
            //2016/08/11対応版 #88
            stopExternal()
        }
    }
    
    /**
     ロック画面からのイベントを処理する→ViewControllerへ移動→SolPlayer内でやってみる（2016/07/01）
     */
    //override func remoteControlReceivedWithEvent(event: UIEvent?) {
    func remoteControlReceivedWithEvent(event: UIEvent?) {
        
        if event?.type == UIEventType.remoteControl {
            switch event!.subtype {
            case UIEventSubtype.remoteControlPlay:
                playOrPause()
                break
            case UIEventSubtype.remoteControlPause:
                playOrPause()
                break
            case UIEventSubtype.remoteControlTogglePlayPause:
                playOrPause()
                break
            case UIEventSubtype.remoteControlStop:
                stopExternal()
                break
            case UIEventSubtype.remoteControlPreviousTrack:
                do {
                    try prevSong(status: true)
                } catch {
                    //
                }
                break
            case UIEventSubtype.remoteControlNextTrack:
                do {
                    //曲の再生時間を保存 #103
                    if(userConfigManager.isRedume){
                        try saveSong(isRedume: true)
                    }
                    try nextSong(status: true)
                } catch {
                    //
                }
                break
            default:
                break
            }
        }
    }
    
    /** 画面ロック時（NowPlayingCenter）の情報を更新する #73, #74, #88 */
    func updateNowPlayingInfoCenter(updateAll: Bool) {

        if(updateAll) {
            //全更新
            
            //ディクショナリ型で定義
            defaultCenter.nowPlayingInfo = [
                MPMediaItemPropertyTitle: (song.title ?? "No Title"),
                MPMediaItemPropertyArtist: (song.artist ?? "Unknown Artist"),
                MPMediaItemPropertyPlaybackDuration: (duration ?? 0.0),
                //MPMediaItemPropertyArtwork: (song.artwork ?? MPMediaItemArtwork()),
                MPNowPlayingInfoPropertyPlaybackRate: 1.0,
                MPNowPlayingInfoPropertyElapsedPlaybackTime: (song.playTime ?? 0.0)   //#135 ある程度合うようになった
            ]
            
            if let artwork = song.artwork {
                defaultCenter.nowPlayingInfo![MPMediaItemPropertyArtwork] = artwork
            }
            
        } else {
            //一部更新（未使用）
            defaultCenter.nowPlayingInfo![MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime + offset
        }
        
    }
    
    /** アプリ終了時の処理 #103 */
    func applicationWillTerminate() {
        //曲順を保存
        userConfigManager.setRedumeNumber(_redumeNumber: number)
        //再生中のプレイリストを保存
        userConfigManager.setRedumePlaylist(_redumePlaylist: mainPlaylist)
        //曲の再生時間を保存（終了時はしおり機能のOn/Offにかかわらず確実に保存する） #103
        do { try updatePlayTime() } catch { }
    }
}
