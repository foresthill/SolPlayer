//
//  PlaylistViewController.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/05.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import UIKit
import MediaPlayer

/**
 * プレイリストを追加・編集・削除する画面
 * ※プレイリストのCoreDataを更新するトリガーは（１）切替時（２）画面が消えるタイミング
 */
class PlaylistViewController: UIViewController, MPMediaPickerControllerDelegate, UITableViewDataSource, UITableViewDelegate, UIPickerViewDataSource, UIPickerViewDelegate {
    
    @IBOutlet weak var tableView: UITableView!
    
    @IBOutlet weak var playListPicker: UIPickerView!

    @IBOutlet weak var editButton: UIButton!

    @IBOutlet weak var repeatAllButton: UIButton!
    
    @IBOutlet weak var clearButton: UIButton!
    
    //appDelegate外出し
    var appDelegate: AppDelegate!
    
    //ダミーのplaylist
    //let playlistDummy = ["default", "Rock", "20160609", "プレイリストを新規作成"]
    //var allPlaylists:[(id: NSNumber, name: String)]!      //["201606240212":"mainPlaylist"]
    
    //SolPlayer本体
    var solPlayer: SolPlayer!
    
    //メインとサブを分けたことによりこの画面でプレイリストを操作するための変数（微妙かも！）
    //var dispPlaylist:[MPMediaItem]!
    
    override func viewDidLoad() {
        
        /* SolPlayer（シングルトンクラス）呼び出し */
        solPlayer = SolPlayer.sharedManager
        
        //Cell名の登録を行う
        tableView.registerClass(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        
        //DataSourceの設定をする
        tableView.dataSource = self
        
        //Delegateを設定する
        tableView.delegate = self
        
        //tableViewの背景色を変更する
        //tableView.backgroundColor?.colorWithAlphaComponent(0.5)
        
        //tableView.backgroundView?.alpha = 0.5
        
        
        /* 表示 */
        //タイトルの設定（変わってない）
        self.navigationItem.title = "プレイリスト"
        //self.navigationItem.titleView?.tintColor = UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.0)
        self.navigationController?.navigationBar.backgroundColor = UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.2)
        //self.navigationController!.navigationBar.tintColor = UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.1)
        //self.navigationController!.navigationBar.tintColor.colorWithAlphaComponent(0.2)
        
        //編集ボタンの配置
        //navigationItem.leftBarButtonItem = editButtonItem()
        
        //プレイリスト追加ボタン
        let addPlaylistButton = UIBarButtonItem(barButtonSystemItem: UIBarButtonSystemItem.Add, target: self, action: #selector(PlaylistViewController.addPlaylist))
        self.navigationItem.setLeftBarButtonItem(addPlaylistButton, animated: true)
        
        //プレイリスト削除ボタン
        let removePlaylistButton = UIBarButtonItem(barButtonSystemItem: UIBarButtonSystemItem.Trash, target: self, action: #selector(PlaylistViewController.removePlaylist))
        self.navigationItem.setRightBarButtonItem(removePlaylistButton, animated: true)
        

        //プレイリスト（メインとサブを分けたことにより）
        solPlayer.editPlaylist = Array<MPMediaItem>()
        do {
            solPlayer.editPlaylist = try self.solPlayer.loadPlayList(solPlayer.subPlaylist.id)
        } catch {
        }
        
        //表示
        playListPicker.delegate = self
        playListPicker.dataSource = self
        
        //allPlaylists = [(0,"default")]
        
    }
    
    /** 「新規プレイリスト追加」（＋マーク）をクリックした時の処理 */
    func addPlaylist() {
        //アラートを作成
        var alert = UIAlertController(title: "プレイリストを作成", message: "新規作成するプレイリスト名を入力してください", preferredStyle: UIAlertControllerStyle.Alert)
        
        //新規作成時のアクション
        let addAction = UIAlertAction(title: "作成", style: .Default){(action: UIAlertAction!) -> Void in
            //入力したテキストをコンソールに表示
            let textField = alert.textFields![0] as UITextField
            //print(textField)
            
            if(textField.text?.lengthOfBytesUsingEncoding(NSUTF8StringEncoding) > 0){
                //永続化処理
                do {
                    //新規作成されたプレイリストをCoreDataに保存
                    let name = textField.text
                    let id:Int = try self.solPlayer.newPlayList(name!)
                    
                    self.solPlayer.allPlaylists.append((id, name!))
                    
                    print(self.solPlayer.allPlaylists)
                    
                    alert = UIAlertController(title: "作成完了", message: "プレイリストを作成しました。", preferredStyle: UIAlertControllerStyle.Alert)
                    
                    //再読込処理
                    self.playListPicker.reloadAllComponents()
                    
                } catch {
                    alert = UIAlertController(title: "作成失敗", message: "プレイリストの作成に失敗しました。", preferredStyle: UIAlertControllerStyle.Alert)
                }
                
                alert.addAction(UIAlertAction(title: "OK", style: .Default, handler: {
                    (action: UIAlertAction!) -> Void in
                    //
                }))
                
                self.presentViewController(alert, animated: true, completion: nil)
                
            } else {
                //print("未入力です")
                alert = UIAlertController(title: "作成失敗", message: "プレイリスト名を入力してください。", preferredStyle: UIAlertControllerStyle.Alert)
                alert.addAction(UIAlertAction(title: "OK", style: .Default, handler: {
                    (action: UIAlertAction!) -> Void in
                    //
                }))
                self.presentViewController(alert, animated: true, completion: nil)
            }
            
        }
        
        //キャンセル時のアクション
        let cancelAction = UIAlertAction(title: "キャンセル", style: .Default){(action: UIAlertAction!) -> Void in
            //
        }
        
        //UIAlertControllerにtextFieldを追加
        alert.addTextFieldWithConfigurationHandler{(textField:UITextField) -> Void in
            //NotificationCenterを生成
            //let notificationCenter = NSNotificationCenter.defaultCenter()
            //notificationCenter.addObserver(self, selector: #selector(PlaylistViewController.mainPlaylistValidate), name: UITextFieldTextDidChangeNotification, object: nil)
        }
        
        //アクションを追加
        alert.addAction(addAction)
        alert.addAction(cancelAction)
        
        //表示
        presentViewController(alert, animated: true, completion: nil)


    }
    
    /** 「プレイリストを削除」（ゴミ箱マーク）をクリックした時の処理 */
    func removePlaylist() {
        //アラートを作成
        var alert = UIAlertController(title: "プレイリストを削除", message: "このプレイリストを削除してもよろしいですか？（復元できません）", preferredStyle: UIAlertControllerStyle.Alert)
        
        //新規作成時のアクション
        let removeAction = UIAlertAction(title: "削除する", style: .Default){(action: UIAlertAction!) -> Void in
  
            let selectedRow = self.playListPicker.selectedRowInComponent(0)
            
            if(selectedRow != 0) {
                //削除処理
                do {
                    //CoreDataのデータを削除
                    try self.solPlayer.removePlaylist(selectedRow)
                    //表示されているプレイリストを削除
                    self.solPlayer.allPlaylists.removeAtIndex(selectedRow)
                    
                    print("プレイリス→\(self.solPlayer.allPlaylists)")
                    
                    alert = UIAlertController(title: "削除完了", message: "プレイリストを削除しました。", preferredStyle: UIAlertControllerStyle.Alert)
                    
                    //defaultを選択
                    self.playListPicker.selectRow(0, inComponent: 0, animated: true)

                    //再読込処理
                    self.playListPicker.reloadAllComponents()
                    
                    //tableViewを更新
                    self.tableView.reloadData()
                    
                } catch {
                    alert = UIAlertController(title: "作成失敗", message: "プレイリストの削除に失敗しました。", preferredStyle: UIAlertControllerStyle.Alert)
                }
                
            } else {
                alert = UIAlertController(title: "作成失敗", message: "defaultのプレイリストは削除できません。", preferredStyle: UIAlertControllerStyle.Alert)
            
            }
            
            alert.addAction(UIAlertAction(title: "OK", style: .Default, handler: {
                (action: UIAlertAction!) -> Void in
                //
            }))
            
            self.presentViewController(alert, animated: true, completion: nil)
            
            
        }
        
        //キャンセル時のアクション
        let cancelAction = UIAlertAction(title: "キャンセル", style: .Default){(action: UIAlertAction!) -> Void in
            //
        }
        
        //アクションを追加
        alert.addAction(removeAction)
        alert.addAction(cancelAction)
        
        //表示
        presentViewController(alert, animated: true, completion: nil)
        

    }
    
    
    /** 「新規追加」ボタンをクリックした時の処理 */
    @IBAction func addSong(sender: UIButton) {
        //MPMediaPickerControllerのインスタンス作成
        let picker = MPMediaPickerController()
        //pickerのデリゲートを設定
        picker.delegate = self
        //複数選択を可にする（true/falseで設定）
        picker.allowsPickingMultipleItems = true
        //AssetURLが読み込めない音源は表示しない
        picker.showsItemsWithProtectedAssets = false
        //CloudItemsもAssetURLが読み込めないので表示しない
        picker.showsCloudItems = false
        //ピッカーを表示する
        presentViewController(picker, animated:true, completion: nil)
    }
    
    /** 「編集」ボタンをクリックした時の処理 */
    @IBAction func editPlaylist(sender: UIButton) {
        if(!self.tableView.editing){
            //編集を開始する
            setEditing(true, animated: true)
            editButton.setTitle("完了", forState: .Normal)
        } else {
            setEditing(false, animated: true)
            editButton.setTitle("編集", forState: .Normal)
        }
    }
    
    /** 「全曲をクリア」をクリックした時の処理 **/
    @IBAction func clearButtonAction(sender: UIButton) {
        //アラートを作成
        let alert = UIAlertController(title: "全曲クリア", message: "曲をクリア（削除）してもよろしいですか？（復元できません）", preferredStyle: UIAlertControllerStyle.Alert)
        
        //クリア時のアクション
        let clearAction = UIAlertAction(title: "クリア", style: .Default){(action: UIAlertAction!) -> Void in
            self.solPlayer.editPlaylist.removeAll()
            self.tableView.reloadData()

        }
        
        //キャンセル時のアクション
        let cancelAction = UIAlertAction(title: "キャンセル", style: .Default){(action: UIAlertAction!) -> Void in
            //
        }
        
        //アクションを追加
        alert.addAction(clearAction)
        alert.addAction(cancelAction)
        
        //表示
        presentViewController(alert, animated: true, completion: nil)
        

        
    }
    
    /** 「プレイリストを保存」をクリックした時の処理（永続化） */
    @IBAction func savePlaylist(sender: UIButton) {
        //アラートを作成
        var alert = UIAlertController(title: "プレイリストを保存", message: "現在の状態で保存してもよろしいですか？", preferredStyle: UIAlertControllerStyle.Alert)
        
        //保存時のアクション
        let saveAction = UIAlertAction(title: "保存", style: .Default){(action: UIAlertAction!) -> Void in
            
            do {
                //選択されたプレイリストに保存
                let selected = self.playListPicker.selectedRowInComponent(0)
                let allPlaylistsId: NSNumber = self.solPlayer.allPlaylists[selected].id as NSNumber
                try self.solPlayer.savePlayList(allPlaylistsId)
                print(self.playListPicker.selectedRowInComponent(0))
                
                alert = UIAlertController(title: "保存完了", message: "プレイリストを保存しました。", preferredStyle: UIAlertControllerStyle.Alert)
            } catch {
                alert = UIAlertController(title: "保存失敗", message: "プレイリストの保存に失敗しました。", preferredStyle: UIAlertControllerStyle.Alert)
            }
            
            alert.addAction(UIAlertAction(title: "OK", style: .Default, handler: {
                (action: UIAlertAction!) -> Void in
                //
            }))
            
            self.presentViewController(alert, animated: true, completion: nil)
                
        }
        
        //キャンセル時のアクション
        let cancelAction = UIAlertAction(title: "キャンセル", style: .Default){(action: UIAlertAction!) -> Void in
            //
        }
        
        //アクションを追加
        alert.addAction(saveAction)
        alert.addAction(cancelAction)
        
        //表示
        presentViewController(alert, animated: true, completion: nil)
        
    }

    /** 全曲リピートボタンを押した時の処理 */
    @IBAction func repeatAllButtonAction(sender: UIButton) {
        //画面上でのON/OFF切り替え
        repeatAllButton.selected = !repeatAllButton.selected
        //SolPlayer上でのフラグ管理
        solPlayer.repeatAll = repeatAllButton.selected
    }
    
    //メディアアイテムピッカーでアイテムを選択完了した時に呼び出される（必須）
    func mediaPicker(mediaPicker: MPMediaPickerController, didPickMediaItems mediaItemCollection: MPMediaItemCollection) {
        
        //playlistにmediaItemを追加
        mediaItemCollection.items.forEach { (mediaItem) in
            //solPlayer.playlist?.append(Song(mediaItem: mediaItem))
            solPlayer.editPlaylist.append(mediaItem)
        }
        
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
     tableView用メソッド（1.セルの行数）
     */
    func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return solPlayer.editPlaylist.count
    }
    
    /**
     tableView用メソッド（2.セルの内容）
     */
    func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell {
        
        //表示設定
        let cell: UITableViewCell = UITableViewCell(style: UITableViewCellStyle.Subtitle, reuseIdentifier: "Cell")
        cell.textLabel?.numberOfLines = 2
        cell.detailTextLabel?.numberOfLines = 0 //0にすると制限なし（「…」とならない）
        cell.backgroundColor = UIColor.clearColor() //背景色を透明に
        
        //表示内容
        cell.textLabel?.text = solPlayer.editPlaylist![indexPath.row].title ?? "Untitled"
        cell.detailTextLabel?.text = solPlayer.editPlaylist![indexPath.row].artist ?? "Unknown Artist"
        
        //画像を表示
            
        if (indexPath.row == solPlayer.number) && solPlayer.mainPlaylist == solPlayer.subPlaylist {
            //再生中の場合はアイコン表示
            //cell.imageView?.image = UIImage(named: "play40.png")
            cell.imageView?.image = UIImage(named: "speeker.png")
            
        } else {
    
            if let artwork = solPlayer.editPlaylist![indexPath.row].artwork {
                //アートワークを表示
                cell.imageView?.image = artwork.imageWithSize(CGSize.init(width: 50, height: 50))
            } else {
                //ダミー画像を表示
                cell.imageView?.image = ImageUtil.makeBoxWithColor(UIColor.init(colorLiteralRed: 0.67, green: 0.67, blue: 0.67, alpha: 1.0), width: 50.0, height: 50.0)
            }
        }

        return cell
    }
    
    /**
     tableView用メソッド（3.タップ時のメソッド）
     */
    func tableView(tableView: UITableView, didSelectRowAtIndexPath indexPath: NSIndexPath) {
        
        // タッチされたセルの曲を再生待ちに
        if(solPlayer.mainPlaylist == solPlayer.subPlaylist){
            solPlayer.number = indexPath.row
        }
        
        // 選択を解除しておく
        //tableView.deselectRowAtIndexPath(indexPath, animated: true)
    }
    
    /**
     tableView用メソッド（4.編集モードに入る）
     */
    override func setEditing(editing: Bool, animated: Bool) {
        super.setEditing(editing, animated: animated)
        tableView.editing = editing
    }

    /**
     tableView用メソッド（5.削除可能なセルのindexPath）
     */
    func tableView(tableView: UITableView, canEditRowAtIndexPath indexPath: NSIndexPath) -> Bool {
        return true
    }
    
    /**
     tableView用メソッド（6.実際に削除された時の処理の実装）
     */
    func tableView(tableView: UITableView, commitEditingStyle editingStyle: UITableViewCellEditingStyle, forRowAtIndexPath indexPath: NSIndexPath) {
        
        //tableViewで使っているのデータを更新する
        solPlayer.editPlaylist?.removeAtIndex(indexPath.row)   //これがないと、絶対にエラーが出る
        
        //現在のプレイリストに適用（なんか違う？） #64, #81
        if(solPlayer.mainPlaylist == solPlayer.subPlaylist){
            solPlayer.playlist?.removeAtIndex(indexPath.row)
        }
        
        //それからテーブルの更新
        tableView.deleteRowsAtIndexPaths([NSIndexPath(forRow: indexPath.row, inSection: 0)], withRowAnimation: UITableViewRowAnimation.Fade)
    }
    
    /**
     tableView用メソッド（6.並び替え処理を可能にする）
     */
    func tableView(tableView: UITableView, canMoveRowAtIndexPath indexPath: NSIndexPath) -> Bool {
        return true
    }
    
    /**
     tableView用メソッド（8.並び替え処理の実装）
     */
    func tableView(tableView: UITableView, moveRowAtIndexPath sourceIndexPath: NSIndexPath, toIndexPath destinationIndexPath: NSIndexPath) {
        let targetSong = solPlayer.editPlaylist![sourceIndexPath.row]
        
        //並び替え処理（削除→更新）
        solPlayer.editPlaylist?.removeAtIndex(sourceIndexPath.row)
        solPlayer.editPlaylist?.insert(targetSong, atIndex: destinationIndexPath.row)
        
        //現在のプレイリストに適用（なんか違う？） #64, #81
        if(solPlayer.mainPlaylist == solPlayer.subPlaylist){
            solPlayer.playlist?.removeAtIndex(sourceIndexPath.row)
            solPlayer.playlist?.insert(targetSong, atIndex: destinationIndexPath.row)
            
            //曲順も変更する（2016/06/22）
            if(solPlayer.number == sourceIndexPath.row){
                solPlayer.number = destinationIndexPath.row
            }
        }

    }
    
    /**
     UIPicker用メソッド（1.表示列）
     */
    func numberOfComponentsInPickerView(pickerView: UIPickerView) -> Int {
        return 1
    }
    
    /**
     UIPicker用メソッド（2.表示個数）
     */
    func pickerView(pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return solPlayer.allPlaylists.count
    }
    
    /**
     UIPicker用メソッド（3.表示内容）
     */
    func pickerView(pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        //TODO:これでいいんだっけ？列順とIDが異なる可能性もあるが。。
        return solPlayer.allPlaylists[row].name
    }
    
    /**
     UIPicker用メソッド（4.選択時）
     */
    func pickerView(pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        //TODO:プレイリスト読み込み処理
        do {
            print("変更前 ID:\(solPlayer.subPlaylist.id) 中身:\(solPlayer.editPlaylist)")
            //現在の状態を保存
            try solPlayer.updatePlayList(solPlayer.subPlaylist.id)
            //選択されたプレイリストを読込
            print("ID:\(solPlayer.allPlaylists[row].id), name:\(solPlayer.allPlaylists[row].name)のプレイリストを読み込む")
            solPlayer.editPlaylist = try solPlayer.loadPlayList(solPlayer.allPlaylists[row].id)
            //待機中（サブ）のプレイリストを最新状態に変更　※再生中（メイン）のプレイリストへは「停止」時に読み込み
            solPlayer.subPlaylist = solPlayer.allPlaylists[row]
            //TableViewを更新する
            tableView.reloadData()
            print("変更後 ID:\(solPlayer.subPlaylist.id) \(solPlayer.editPlaylist)")
        } catch {
            
            let alert = UIAlertController(title: "プレイリストを読込", message: "プレイリストの読み込みに失敗しました", preferredStyle: UIAlertControllerStyle.Alert)
            
            alert.addAction(UIAlertAction(title: "OK", style: .Default, handler: {
                (action: UIAlertAction!) -> Void in
                //
            }))
            
            //表示
            presentViewController(alert, animated: true, completion: nil)
            
            //defaultのプレイリストを読み込む
            //do { try solPlayer.loadPlayList(0) } catch { }
            
        }
        
    }
    
    /** この画面が表示された時にTableviewを更新する*/
    override func viewDidAppear(animated: Bool) {
        tableView.reloadData()
    }
    
    /** この画面が非表示になった時にCoreDataを更新する */
    override func viewDidDisappear(animated: Bool) {
        do {
            //現在の状態をCoreDataに保存
            try solPlayer.updatePlayList(solPlayer.allPlaylists[playListPicker.selectedRowInComponent(0)].id)
        } catch {
           //
        }
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }

}

