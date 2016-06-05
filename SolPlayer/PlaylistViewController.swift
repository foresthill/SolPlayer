//
//  PlaylistViewController.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/05.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import UIKit
import MediaPlayer

class PlaylistViewController: UIViewController, MPMediaPickerControllerDelegate, UITableViewDataSource, UITableViewDelegate {

    //var player: MPMusicPlayerController!
    
    //private var playlist: [MPMediaItem]?
    private var playlist: [Song]?
    
    @IBOutlet weak var tableView: UITableView!
    
    //@IBOutlet weak var testText: UITextView!
    
    override func viewDidLoad() {
        //背景色
        //self.view.backgroundColor = UIColor.cyanColor()   //下の色も変わってしまうのでコメントアウト
        
        //player = MPMusicPlayerController.applicationMusicPlayer()
        //player = MPMusicPlayerController.systemMusicPlayer()  //「ミュージック」アプリの再生状況を反映したものになる
        
        let appDelegate:AppDelegate = UIApplication.sharedApplication().delegate as! AppDelegate
        playlist = appDelegate.playlist
        
        //nil対策？→せいかい！
        if(playlist == nil){
            playlist = Array<Song>()
        }
        
        //Cell名の登録を行う
        tableView.registerClass(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        
        //DataSourceの設定をする
        tableView.dataSource = self   //エラー
        
        //Delegateを設定する
        tableView.delegate = self
        
        //編集ボタンの配置
        navigationItem.rightBarButtonItem = editButtonItem()
        
        
    }
    
    @IBAction func addSong(sender: UIButton) {
        //MPMediaPickerControllerのインスタンス作成
        let picker = MPMediaPickerController()
        //pickerのデリゲートを設定
        picker.delegate = self
        //複数選択を可にする（true/falseで設定）
        picker.allowsPickingMultipleItems = true
        

        //ピッカーを表示する
        presentViewController(picker, animated:true, completion: nil)
    }
    
    //メディアアイテムピッカーでアイテムを選択完了した時に呼び出される（必須）
    func mediaPicker(mediaPicker: MPMediaPickerController, didPickMediaItems mediaItemCollection: MPMediaItemCollection) {
        
        //AppDelegateのインスタンスを取得しplayListを格納
        let appDelegate:AppDelegate = UIApplication.sharedApplication().delegate as! AppDelegate
        
        //playlistにmediaItemを追加
        mediaItemCollection.items.forEach { (mediaItem) in
            playlist?.append(Song(mediaItem: mediaItem))
        }
        
        appDelegate.playlist = playlist
        
        //print("playlist=\(playlist)")
        
        //ピッカーを閉じ、破棄する
        self.dismissViewControllerAnimated(true, completion: nil)
        
        //tableviewの更新
        tableView.reloadData()
        
    }
    
    //メディアアイテムピッカーでキャンセルした時に呼び出される（必須）
    func mediaPickerDidCancel(mediaPicker: MPMediaPickerController) {
        //ピッカーを閉じ、破棄する
        self.dismissViewControllerAnimated(true, completion: nil)
    }
    
    /** 
     tableView用メソッド（1.セルの行数
     */
    func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return playlist!.count
    }
    
    /**
     tableView用メソッド（2.セルの内容）
     */
    func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell {
        let cell: UITableViewCell = UITableViewCell(style: UITableViewCellStyle.Subtitle, reuseIdentifier: "Cell")
        cell.textLabel?.text = playlist![indexPath.row].title
        return cell
    }
    
    /**
     tableView用メソッド（3.削除可能なセルのindexPath）
     */
    func tableView(tableView: UITableView, canEditRowAtIndexPath indexPath: NSIndexPath) -> Bool {
        return true
    }
    
    /**
     tableView用メソッド（4.実際に削除された時の処理を実装する）
     */
    func tableView(tableView: UITableView, commitEditingStyle editingStyle: UITableViewCellEditingStyle, forRowAtIndexPath indexPath: NSIndexPath) {
        //実データ削除メソッド
        //removeEvent(indexPath.row)
        //先にデータを更新する
        //events.removeAtIndex(indexPath.row)   //これがないと、絶対にエラーが出る
        //それからテーブルの更新
        tableView.deleteRowsAtIndexPaths([NSIndexPath(forRow: indexPath.row, inSection: 0)], withRowAnimation: UITableViewRowAnimation.Fade)
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }

}

