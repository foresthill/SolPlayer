//
//  PlaylistViewController.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/06/05.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//

import UIKit
import MediaPlayer

class PlaylistViewController: UIViewController, MPMediaPickerControllerDelegate, UITableViewDataSource, UITableViewDelegate, UIPickerViewDataSource, UIPickerViewDelegate {
    
    @IBOutlet weak var tableView: UITableView!
    
    @IBOutlet weak var playListPicker: UIPickerView!

    @IBOutlet weak var editButton: UIButton!

    //appDelegate外出し
    var appDelegate: AppDelegate!
    
    //ダミーのplaylist
    //let playlistDummy = ["default", "Rock", "20160609", "プレイリストを新規作成"]
    let playlistDummy = ["default"]
    
    //SolPlayer本体
    var solPlayer: SolPlayer!
    
    override func viewDidLoad() {
        
        /* SolPlayer（シングルトンクラス）呼び出し */
        solPlayer = SolPlayer.sharedManager
        
        //nil対策？→せいかい！
        if(solPlayer.playlist == nil){
            solPlayer.playlist = Array<Song>()
        }
        
        //Cell名の登録を行う
        tableView.registerClass(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        
        //DataSourceの設定をする
        tableView.dataSource = self
        
        //Delegateを設定する
        tableView.delegate = self
        
        //tableViewの背景色を変更する
        tableView.backgroundColor?.colorWithAlphaComponent(0.5)
        
        tableView.backgroundView?.alpha = 0.5
        
        //表示
        
        // タイトルの設定（変わってない）
        self.navigationItem.title = "プレイリスト"
        self.navigationItem.titleView?.tintColor = UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.0)
        self.navigationController!.navigationBar.tintColor = UIColor(red: 1.0, green: 1.0, blue: 1.0, alpha: 0.2)
        self.navigationController!.navigationBar.tintColor.colorWithAlphaComponent(0.2)
        
        //編集ボタンの配置
        //navigationItem.leftBarButtonItem = editButtonItem()
        
        //「曲を追加」ボタンの配置→「プレイリスト追加」へ
//        let addSongButton = UIBarButtonItem(barButtonSystemItem: UIBarButtonSystemItem.Add, target: self, action: #selector(PlaylistViewController.addSong))
//        navigationItem.setRightBarButtonItem(addSongButton, animated: true)

        //playList
        playListPicker.delegate = self
        playListPicker.dataSource = self
        
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
    
    /** 「プレイリストを保存」をクリックした時の処理 */
    @IBAction func savePlaylist(sender: UIButton) {
        //アラートを作成
        var alert = UIAlertController(title: "プレイリストを保存", message: "保存するプレイリスト名を入力してください", preferredStyle: UIAlertControllerStyle.Alert)
        
        //保存時のアクション
        let saveAction = UIAlertAction(title: "保存", style: .Default){(action: UIAlertAction!) -> Void in
            //入力したテキストをコンソールに表示
            let textField = alert.textFields![0] as UITextField
            print(textField)
            
            if(textField.text?.lengthOfBytesUsingEncoding(NSUTF8StringEncoding) > 0){
                print("OKです。")
                alert = UIAlertController(title: "保存完了", message: "プレイリストを保存しました。", preferredStyle: UIAlertControllerStyle.Alert)
                alert.addAction(UIAlertAction(title: "OK", style: .Default, handler: {
                    (action: UIAlertAction!) -> Void in
                    //
                }))
                self.presentViewController(alert, animated: true, completion: nil)
                
            } else {
                print("未入力です")
                alert = UIAlertController(title: "保存失敗", message: "プレイリスト名を入力してください。", preferredStyle: UIAlertControllerStyle.Alert)
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
            //notificationCenter.addObserver(self, selector: #selector(PlaylistViewController.playlistNameValidate), name: UITextFieldTextDidChangeNotification, object: nil)
        }
        
        //アクションを追加
        alert.addAction(saveAction)
        alert.addAction(cancelAction)
        
        //表示
        presentViewController(alert, animated: true, completion: nil)
        
    }

    
    //メディアアイテムピッカーでアイテムを選択完了した時に呼び出される（必須）
    func mediaPicker(mediaPicker: MPMediaPickerController, didPickMediaItems mediaItemCollection: MPMediaItemCollection) {
        
        //playlistにmediaItemを追加
        mediaItemCollection.items.forEach { (mediaItem) in
            solPlayer.playlist?.append(Song(mediaItem: mediaItem))
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
    
    /** 四角形の画像を生成する（Utilクラスに逃したい）*/
    func makeBoxWithColor(color: UIColor) -> UIImage {
        let rect: CGRect = CGRectMake(0.0, 0.0, 50.0, 50.0)
        UIGraphicsBeginImageContext(rect.size)
        let context: CGContextRef = UIGraphicsGetCurrentContext()!
        
        CGContextSetFillColorWithColor(context, color.CGColor)
        CGContextFillRect(context, rect)
        
        let image: UIImage = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        
        return image
        
    }
    
    
    /** 
     tableView用メソッド（1.セルの行数）
     */
    func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return solPlayer.playlist!.count
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
        cell.textLabel?.text = solPlayer.playlist![indexPath.row].title ?? "Untitled"
        cell.detailTextLabel?.text = solPlayer.playlist![indexPath.row].artist ?? "Unknown Artist"
        
        //画像を表示
        switch indexPath.row{
            
        case solPlayer.number:
            //再生中の場合はアイコン表示
            //cell.imageView?.image = UIImage(named: "play40.png")
            cell.imageView?.image = UIImage(named: "speeker.png")
            break
            
        default:
            if(solPlayer.playlist![indexPath.row].artwork != nil){
                //アートワークを表示
                cell.imageView?.image = solPlayer.playlist![indexPath.row].artwork!.imageWithSize(CGSize.init(width: 50, height: 50))
            } else {
                //ダミー画像を表示
                cell.imageView?.image = makeBoxWithColor(UIColor.init(colorLiteralRed: 0.67, green: 0.67, blue: 0.67, alpha: 1.0))
            }
        }

        return cell
    }
    
    /**
     tableView用メソッド（3.タップ時のメソッド）
     */
    func tableView(tableView: UITableView, didSelectRowAtIndexPath indexPath: NSIndexPath) {
        
        // タッチされたセルの曲を再生待ちに
        solPlayer.number = indexPath.row
        
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
        //先に大本のデータを更新する
        solPlayer.playlist?.removeAtIndex(indexPath.row)   //これがないと、絶対にエラーが出る
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
        let targetSong = solPlayer.playlist![sourceIndexPath.row]
        solPlayer.playlist?.removeAtIndex(sourceIndexPath.row)
        solPlayer.playlist?.insert(targetSong, atIndex: destinationIndexPath.row)
        
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
        return playlistDummy.count
    }
    
    /**
     UIPicker用メソッド（3.表示内容）
     */
    func pickerView(pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        return playlistDummy[row] as String
    }
    
    /**
     UIPicker用メソッド（4.選択時）
     */
    func pickerView(pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        //TODO:プレイリスト読み込み処理
        
        //TODO:「プレイリストを新規作成」を選択された場合
    }
    
    /** この画面が表示された時に更新する*/
    override func viewDidAppear(animated: Bool) {
        tableView.reloadData()
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }

}

