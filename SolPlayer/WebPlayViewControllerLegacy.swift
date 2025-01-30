
//
//  WebPlayViewController.swift
//  SolPlayer
//
//  Created by Morioka Naoya on H28/08/27.
//  Copyright © 平成28年 Morioka Naoya. All rights reserved.
//  ※通信部分は以下を参照
//  http://qiita.com/moshisora/items/4ea23d5abd7b4d852955
//
//

import UIKit
import Alamofire
import AVKit
import AVFoundation

//#import "HCYoutubeParser"

class WebPlayViewControllerLegacy: UIViewController, UITableViewDataSource, UITableViewDelegate, UIPickerViewDataSource, UIPickerViewDelegate {
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        <#code#>
    }
    
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        <#code#>
    }
    

    //@IBOutlet weak var webView: UIWebView!
    
    /** シングルトンクラス */
    let solPlayer: SolPlayer = SolPlayer.sharedManager
    let userConfigManager: UserConfigManager = UserConfigManager.sharedManager
    
    //Picker
    @IBOutlet weak var sitePicker: UIPickerView!
    //表示するURL
    @IBOutlet weak var tableView: UITableView!
    
    @IBOutlet weak var textField: UITextField!
    
    /** サイトにアクセスするために必要な情報 */
    var apiUrl: String! = "https://www.googleapis.com/youtube/v3/search?part=snippet"
    var videoId :String! = "PqJNc9KVIZE"
    let apiKey: String! = "AIzaSyAYOvVDMjjzKZ8cfIhZZxrBMHQSyVGoVcA"
    let type: String! = "video"
    
    /** 検索対象となるサイトのリスト */
    let siteList: [(id: String, name: String)] = [("0", "youtube"), ("1", "ニコニコ動画"), ("2", "vimeo")]

    /** 検索結果リスト */
    var resultList: [(id:String, url: String, title:String, description:String, thumbUrl:String, viewCount: String, lengthSeconds: String)]! = Array()
    
    /** AlamoFire同期処理のためのロック（通信処理完了まで待つためのフラグ）*/
    var networkingFlg = false

    /** 初期処理 */
    override func viewDidLoad() {
        
        super.viewDidLoad()
        //初期表示のURL
        
        //Cell名の登録を行う
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        tableView.dataSource = self
        tableView.delegate = self
        
        //PickerView表示
        sitePicker.dataSource = self
        sitePicker.delegate = self
        
                //api
//      let apiUrl = "https://www.googleapis.com/youtube/v3/videos?id=\(self.videoId)&key=\(self.apiKey)&fields=items(id,snippet(channelTitle,title,thumbnails),statistics)&part=snippet,contentDetails,statistics"
        /*
        // create request object
        var requestUrl: NSURL = NSURL(string: apiUrl)!
        var request: NSURLRequest = NSURLRequest(URL: requestUrl)
        
        // request to api
        var data: NSData
        do {
          data = try NSURLConnection.sendSynchronousRequest(request, returningResponse: nil)
        }
         */
        
        //var urlRequest = NSURLRequest(URL: NSURL(string: url)!)
        
                //responseDataからキー値resultsを取り出す
                
//                var player = AVPlayer()
//                
//                //let playerItem = AVPlayerItem(URL: NSURL( string: "https://www.youtube.com/watch?v=\(self.videoId)")!)
//                let playerItem = AVPlayerItem(URL: NSURL( string: "http://www.youtube.com/get_video_info?video_id=\(self.videoId)")!)
//                player = AVPlayer(playerItem: playerItem)
//                player.rate = 1.0
//                player.play()
        
                /*
                //audioFile取得
                var audioFile: AVAudioFile = AVAudioFile()
                do {
                     audioFile = try AVAudioFile(forReading: NSURL(fileURLWithPath: "https://www.youtube.com/watch?v=\(self.videoId)"))
                    
                } catch {
                    
                }
                
                //AVAudioEngineの生成
                let audioEngine = AVAudioEngine()
                
                //AVPlayerNodeの生成
                let audioPlayerNode = AVAudioPlayerNode()
                
                //アタッチリスト
                //var attachList:Array<AVAudioNode> = [audioPlayerNode]
                
                //AVAudioEngineにアタッチ
                /*TODO:なんか綺麗にかけないのかなぁ forEachとかで。。
                for i in 0 ... attachList.count-1 {
                    audioEngine.attachNode(attachList[i])
                    if(i >= 1){
                        audioEngine.connect(attachList[i-1], to:attachList[i], format:audioFile.processingFormat)
                    }
                }
 */
                //ミキサー出力（ここで落ちてしまう） ERROR:    [0x19ee14000] AVAudioFile.mm:32: AVAudioFileImpl: error 2003334207
                audioEngine.connect(audioPlayerNode, to:audioEngine.mainMixerNode, format:audioFile.processingFormat)
                
                //AVAudioEngineの開始
                audioEngine.prepare()
                do {
                    try audioEngine.start()
                } catch {
                    
                }
                
                audioPlayerNode.play()
                */
        
        
        //}
        
        //let videoURL = NSURL(string: "https://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4")
//        let url = "http://r8---sn-3qqp-3pmy.googlevideo.com/videoplayback?id=o-AOak3e1glugoDzT9_X9ivASCa0djBKfAzYV-iu6KjkhI&dur=359.444&source=youtube&ip=106.161.130.163&itag=22&lmt=1472054523595677&ipbits=0&ratebypass=yes&expire=1473744490&upn=OaW-HP-dO5M&sparams=dur,expire,gcr,id,initcwndbps,ip,ipbits,ipbypass,itag,lmt,mime,mm,mn,ms,mv,nh,pcm2cms,pl,ratebypass,source,upn&sver=3&mime=video%2Fmp4&gcr=jp&pl=21&signature=3661702E9BBBE7A2448A3A57E724F039EBA0780B.798A7613F83A85BF37F92FF4F03CC47244C39486&key=cms1&redirect_counter=1&req_id=af7bc1ee244ba3ee&cms_redirect=yes&ipbypass=yes&mm=31&mn=sn-3qqp-3pmy&ms=au&mt=1473722563&mv=m&pcm2cms=yes&ir=1&rr=12"
//        let videoURL = NSURL(string: url)
//        let player = AVPlayer(URL: videoURL!)
//        let playerLayer = AVPlayerLayer(player: player)
//        playerLayer.frame = self.view.bounds
//        self.view.layer.addSublayer(playerLayer)
//        player.play()
        
    }
    
    /** キーワード検索してtableViewに表示するメソッド */
    func search(keyword: String) {
        
        //キーワードをURLエンコード
        //let encodeKeyword = keyword.stringByAddingPercentEscapesUsingEncoding(NSUTF8StringEncoding)
        let encodeKeyword: String = keyword
            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        //左辺にStringを入れないとOptionalという文字列が入って落ちる
        
        //検索リストを初期化
        resultList = nil
        
        //
        let url = "\(apiUrl)&key=\(apiKey)&q=\(encodeKeyword)&maxResults=\(userConfigManager.getResultNumber())&type=\(type)"
        //let url = "https://www.googleapis.com/youtube/v3/videos?id=\(self.videoId)&key=\(self.apiKey)&fields=items(id,snippet(channelTitle,title,thumbnails),statistics)&part=snippet,contentDetails,statistics"
        
        //ネットワーク（同期処理用）フラグON
        networkingFlg = true
        
        AF.request(url).responseData {response in
            switch response.result{
            case .success(let data):
                //取得成功
//                let json = data as! NSDictionary
//                //jsonをパースする
//                self.parseJSON(json)
                debugPrint(data)

        case .failure(let error):
                //取得失敗（アラート表示）
                /*
                let alert = UIAlertController(title: "検索失敗", message: "情報の取得に失敗しました。（原因：ネットワークの通信ができていない等）", preferredStyle: UIAlertControllerStyle.Alert)
                alert.addAction(UIAlertAction(title: "OK", style: .Default, handler: {
                    (action: UIAlertAction!) -> Void in
                    //self.presentViewController(alert, animated: true, completion: nil)
                }))
                self.presentViewController(alert, animated: true, completion: nil)
                 */
                debugPrint(error)
            }
            
            //ネットワーク（同期処理用）フラグOFF
            self.networkingFlg = false
        }
        
        
    }
    
    /** json形式の情報をパースするメソッド ※NSArrayタイプの可能性もあるみたい。どうする？
     https://teratail.com/questions/23273
     */
    func parseJSON(json: NSDictionary) {
        
        let itemArray = NSMutableArray()
        //let itemArray = NSDictionary()
        //var dict = NSDictionary()
        
        //レスポンスのデータ型を確認
//        if let items = json.objectForKey("items") as Array {
//            dataArray.addObject(items[0])
//        }
        itemArray.addObject(json.objectForKey("items")!)
//        print("データ数：\(dataArray.count)")
        //print("dataArray[0]=\(itemArray[0])")
//        print("dataArray[1]=\(dataArray[1])")
        
        let items:NSArray = itemArray[0] as! NSArray
        
        //let itemsArray: NSArray = json.objectForKey("items") as! NSArray
        //let items: NSDictionary = itemsArray[0] as! NSDictionary
        
        print(items.count)
        
        //resultList: [(url:NSURL, title:String, detail:String, thumbnail:UIImage)]!

        resultList = Array()
        
        for item in items {
            /*
            print(item)
            print(item.objectForKey("title"))
            print(item.objectForKey("id"))
            print(item.objectForKey("id")?.objectForKey("videoId"))
            print(item.objectForKey("snippet")?.objectForKey("publishedAt"))
            print(item.objectForKey("snippet")?.objectForKey("description"))
            print(item.objectForKey("snippet")?.objectForKey("channelTitle"))
            */
            
            let id: String = (((item as AnyObject).objectForKey("id")? as AnyObject).objectForKey("videoId") ?? "")! 
            
            //IDが存在しない場合
            if id.isEmpty {
                continue
            }
            
            var title: String = (item.objectForKey("snippet")?.objectForKey("title") ?? "") as! String
            var description: String = (item.objectForKey("snippet")?.objectForKey("description") ?? "") as! String
            
            //文字数を制限する（Index xx out of bounds エラーが発生する）
            if title.lengthOfBytesUsingEncoding(NSUTF8StringEncoding) > 52 {
                title = (title as NSString).substringToIndex(13)
            }
            
            if description.lengthOfBytesUsingEncoding(NSUTF8StringEncoding) > 144 {
                description = (description as NSString).substringToIndex(36) + "…"
            }
            
            //サムネイルURL取得
            var thumbUrl: String = ""
            if let thumbnails: NSDictionary = item.objectForKey("snippet")?.objectForKey("thumbnails") as? NSDictionary {
                if let resolution: NSDictionary = thumbnails.objectForKey("high") as? NSDictionary {
                    thumbUrl = resolution.objectForKey("url") as! String
                }
            }
            
            //ビデオの情報を取得
            //getVideoInfo(id)
            
            
            // var resultList: [(id:String, url: String, title:String, description:String, thumbUrl:String, viewCount: String, lengthSeconds: String)]! = Array()

            //リストに追加
            resultList.append((id:id, url:"", title:title, description:description, thumbUrl:thumbUrl, viewCount:"", lengthSeconds:""))
            
            //var image: UIImage = UIImage(data: NSData(contentsOfURL: NSURL(string: imageUrl as String)!)!)!
        }
        
        /*
        let itemsArray: NSArray = json.objectForKey("items") as! NSArray
        let items: NSDictionary = itemsArray[0] as! NSDictionary
        let snippet: NSDictionary = items.objectForKey("snippet") as! NSDictionary
        
        //title
        let title: NSString = snippet.objectForKey("title") as! NSString
        //self.title = title
        print(title)
        
        //channel title
        let channelTitle: NSString = snippet.objectForKey("channelTitle") as! NSString
        print(channelTitle)
        
        //thumbnail image
        
        let thumbnails: NSDictionary = snippet.objectForKey("thumbnails") as! NSDictionary
        let resolution: NSDictionary = thumbnails.objectForKey("high") as! NSDictionary
        let imageUrl: NSString = resolution.objectForKey("url") as! NSString
        
        //イメージ表示
        var image: UIImage = UIImage(data: NSData(contentsOfURL: NSURL(string: imageUrl as String)!)!)!
         */
        
    }
    
    /**
     VideoIDからいろいろな情報を取得する
     http://blog.muuny-blue.info/0a7d83f084ec258aefd128569dda03d7.html
     */
    func getVideoInfo() {
//    func getVideoInfo(_resultList: [(id:String, url: String, title:String, description:String, thumbUrl:String, viewCount: String, lengthSeconds: String)]) -> [(id:String, url: String, title:String, description:String, thumbUrl:String, viewCount: String, lengthSeconds: String)] {
        //func getVideoInfo(id: String) -> (url:String, viewCount:String, lengthSeconds:String) {
        /*
        if _resultList == nil {
            return
        }*/
        //ネットワーク（同期処理用）フラグON
        networkingFlg = true
        
//        //う〜〜ん（2016/09/11）
//        var videoList:[(id:String, url: String, title:String, description:String, thumbUrl:String, viewCount: String, lengthSeconds: String)] = Array()
    
        //for video in resultList {
        //純粋なfor-in文だと、各要素に値が代入できないっぽいので。
        for (index,element) in resultList.enumerate() {
            
            //IDが格納されていない場合は飛ばす
            if element.id == "" {
                print("ん？")
                continue
            }


            let url = "http://www.youtube.com/get_video_info?video_id=\(element.id)"
            
            var req = NSMutableURLRequest(URL: NSURL(string: url)!)
            req.HTTPMethod = "GET"
            var task = NSURLSession.sharedSession().dataTaskWithRequest(req, completionHandler: {data, response, error in
                if (error == nil) {
                    var result = NSString(data: data!, encoding: NSUTF8StringEncoding)!
                    print(result)
                    //GETしたレスポンスをパース
                    var parameters: Dictionary = [String: String]()
                    //for key_val in split(result, {$0 == "&"}) {
                    //result.characters.split{$0 == "&"}.map {key_val in  //$0 == "&"
                    result.componentsSeparatedByString("&").map { key_val in
                        //let key_val_array = split(key_val, { $0 == "=" })
                        //let key_val_array = key_val.split("=")
                        let key_val_array = key_val.componentsSeparatedByString("=")
                        let key = key_val_array[0]
                        print("key=\(key)¥n")
                        let val = key_val_array[1].stringByRemovingPercentEncoding
                        print("val=\(val)")
                        parameters[key] = val
                        
                    }
                    //何らかの情報が取得できなかった場合（動画の所有者が他サイトでの公開を禁止していた場合など）
                    if(String(parameters["status"]) != "fail") {
                        
                        //URL取得
                        if let urlEncodedMap:String = parameters["url_encoded_fmt_stream_map"] {
                            var parametersInMap: Dictionary = [String: String]()
                            urlEncodedMap.componentsSeparatedByString("&").map { key_val in
                                //キー値が存在する かつ 最初のURLだけとる
                                if key_val.characters.count > 5 && parametersInMap["url"] == nil {
                                    let key_val_array = key_val.componentsSeparatedByString("=")
                                    let key = key_val_array[0]
                                    print("key2=\(key)¥n")
                                    let val = key_val_array[1].stringByRemovingPercentEncoding
                                    print("val2=\(val)")
                                    parametersInMap[key] = val
                                }
                            }
                            //URLをセット
                            if let url = parametersInMap["url"] {
                                self.resultList[index].url = parametersInMap["url"]!
                                self.resultList[index].viewCount = parameters["view_count"]!
                                self.resultList[index].lengthSeconds = parameters["length_seconds"]!
                                //videoList.append(self.resultList[index])
                            } else {
                                //URLが取得できなければ削除
                                //self.resultList.removeAtIndex(index)
                            }
                        }
                        
                        //let url:String = parameters["url_encoded_fmt_stream_map"]!
                        //let viewCount:String = parameters["view_count"]!
                        //let lengthSeconds:String = parameters["length_seconds"]!
                        
                        //これで入る？→letだからダメとか言われるので
                        //self.resultList[index].url = url
                        
//                        self.resultList[index].viewCount = parameters["view_count"]!
//                        self.resultList[index].lengthSeconds = parameters["length_seconds"]!

                    } else {
                        //再生できないのでリストから削除
                        //self.resultList.removeAtIndex(index)
                    }

                } else {
                    print(error)
                }
                
                //resultListの最後の要素の場合、フラグをOFFにする（この処理はAlamosfire内に入れないとダメ。同期処理にならない）
                if index == self.resultList.count - 1 {
                    //ネットワーク（同期処理用）フラグOFF
                    self.networkingFlg = false
                    print("通信終了！")
                }
                
            })
            task.resume()
            
            
            
            
            //非同期処理のため、通信終了後のメソッドはここに書かない

            /*
            Alamofire.request(.GET, url).responseJSON {response in
                if(response.result.isSuccess){
                    //取得成功
                    let result:String = response.result.value as! String
                    //GETしたレスポンスをパース
                    var parameters: Dictionary = [String: String]()
                    //for key_val in split(result, {$0 == "&"}) {
                    //result.characters.split{$0 == "&"}.map {key_val in  //$0 == "&"
                    result.componentsSeparatedByString("&").map { key_val in
                        //let key_val_array = split(key_val, { $0 == "=" })
                        //let key_val_array = key_val.split("=")
                        let key_val_array = key_val.componentsSeparatedByString("=")
                        let key = key_val_array[0]
                        print("key=\(key)¥n")
                        let val = key_val_array[1].stringByRemovingPercentEncoding
                        print("val=\(val)")
                        parameters[key] = val
                    }
                    
                    let url:String = parameters["url_encoded_fmt_stream_map"]!
                    let viewCount:String = parameters["view_count"]!
                    let lengthSeconds:String = parameters["length_seconds"]!
                    
                    print("url=\(url)")
                    
                    
                    //これで入る？→letだからダメとか言われるので
                    self.resultList[index].url = url
                    self.resultList[index].viewCount = viewCount
                    self.resultList[index].lengthSeconds = lengthSeconds
                    
                } else {
                    //取得失敗（アラート表示）
                    /*
                    let alert = UIAlertController(title: "検索失敗", message: "情報の取得に失敗しました。ネットワークの通信ができていない等）", preferredStyle: UIAlertControllerStyle.Alert)
                    alert.addAction(UIAlertAction(title: "OK", style: .Default, handler: {
                        (action: UIAlertAction!) -> Void in
                        //self.presentViewController(alert, animated: true, completion: nil)
                    }))
                    self.presentViewController(alert, animated: true, completion: nil)
                    */
                    
                }
                
                //resultListの最後の要素（この処理はAlamosfire内に入れないとダメ。同期処理にならない）
                if index == self.resultList.count - 1 {
                    //ネットワーク（同期処理用）フラグOFF
                    self.networkingFlg = false
                }
                
            }
            */
        }
        
//        return []
    }
    
    /** AlamoFire同期処理のためのメソッド。非同期処理→同期処理に（通信処理完了まで待つ）
     http://qiita.com/kazuhirox/items/9ecb25bc238ad2d47ff0*/
    func networkingSynchronous() {
        
        //ロックが解除されるまで待つ
        let runLoop = NSRunLoop.currentRunLoop()
        while networkingFlg &&
            runLoop.runMode(NSDefaultRunLoopMode, beforeDate: NSDate(timeIntervalSinceNow: 0.1)) {
                // 0.1秒毎の処理なので、処理が止まらない
                print("待ってます")
        }
    }
    
    /** 秒をHH:mm:ss形式に直す */
    func formatHHmmss(seconds: String) -> String {
        let sec = Int(seconds)
        let s = Int(sec! % 60)
        let m = Int(((sec! - s) / 60) % 60)
        let h = Int(((sec! - m - s) / 3600) % 3600)
        let str = String(format: "%02d:%02d:%02d", h, m, s)
        return str
    }
    
    /** SSYoutubeParser（ライブラリ）のセットアップ */
    func setupVideo(videoId: String) {
        SSYoutubeParser.h264videosWithYoutubeID(videoId) { (videoDictionary) -> Void in
            //let videoSmallURL = videoDictionary["small"]
            let videoMediumURL = videoDictionary["medium"]
            //let videoHD720URL = videoDictionary["hd720"]
            
            if let urlStr = videoMediumURL {
                if let playerItem:AVPlayerItem = AVPlayerItem(URL: NSURL(string: urlStr)!) {
//                    var player = AVPlayer()
//                    player = AVPlayer(playerItem: playerItem)
//                    player.rate = 1.0
//                    player.play()
                            let player = AVPlayer(playerItem: playerItem)
                            let playerLayer = AVPlayerLayer(player: player)
                            playerLayer.frame = self.view.bounds
                            self.view.layer.addSublayer(playerLayer)
                            player.play()
                }
            }
        }
    }
    
    /**
     tableView用メソッド（1.セルの行数）
     */
    func tableView(tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        /*return solPlayer.editPlaylist.count*/
        return resultList.count
    }
    
    /**
     tableView用メソッド（2.セルの内容）
     */
    func tableView(tableView: UITableView, cellForRowAtIndexPath indexPath: NSIndexPath) -> UITableViewCell {
        
        //表示設定
        let cell: UITableViewCell = UITableViewCell(style: UITableViewCellStyle.Subtitle, reuseIdentifier: "Cell")
        cell.textLabel?.numberOfLines = 4
        cell.detailTextLabel?.numberOfLines = 0 //0にすると制限なし（「…」とならない）
        cell.backgroundColor = UIColor.clearColor() //背景色を透明に
        
        //フォント（タイトル）
        var font: UIFont = UIFont(name: "Helvetica Neue", size: 16.0)!
        font = UIFont.systemFontOfSize(16.0, weight: UIFontWeightLight)
        
        cell.textLabel?.font = font
        
        font = UIFont(name: "Helvetica Neue", size: 11.0)!
        font = UIFont.systemFontOfSize(11.0, weight: UIFontWeightLight)
        
        cell.detailTextLabel?.font = font
        
        cell.textLabel?.textColor = UIColor.whiteColor()    //tintColorではなくテキストカラー？
        cell.detailTextLabel?.textColor = UIColor.darkGrayColor()
        
        
        //表示内容
        cell.textLabel?.text = resultList[indexPath.row].title ?? "Untitled"
        //cell.detailTextLabel?.text = resultList[indexPath.row].description ?? "Unknown Artist"
        cell.detailTextLabel?.text = "再生時間：\(formatHHmmss(resultList[indexPath.row].lengthSeconds)) 再生回数：\(resultList[indexPath.row].viewCount)"
        
        //画像を表示
        
        if !resultList[indexPath.row].thumbUrl.isEmpty {
            //サムネイルが存在する場合は表示
            cell.imageView?.image = UIImage(data: NSData(contentsOfURL: NSURL(string: resultList[indexPath.row].thumbUrl)!)!)!
            
        } else {
            //存在しない場合はダミー
            cell.imageView?.image = ImageUtil.makeBoxWithColor(UIColor.init(colorLiteralRed: 0.67, green: 0.67, blue: 0.67, alpha: 1.0), width: 50.0, height: 50.0)
        }
        
        return cell
    }
    
    /**
     tableView用メソッド（3.タップ時のメソッド）
     */
    func tableView(tableView: UITableView, didSelectRowAtIndexPath indexPath: NSIndexPath) {
        
        
        //print("再生する曲はこちら→\(resultList[indexPath.row].url)")
        print("再生する曲はこちら→\(resultList[indexPath.row].id)")
        setupVideo(resultList[indexPath.row].id)
        
        /*
        let video = resultList[indexPath.row]
        
        solPlayer.playlist.append(Song2(_persisntenceID: UInt64(solPlayer.generateID())!,
            _title:video.title, _url:video.url, _artist:"youtube", _duration:Double(video.lengthSeconds)!))
        */
        
        //選択を解除しておく
        tableView.deselectRowAtIndexPath(indexPath, animated: true)
        
        //tableViewを更新
        //tableView.reloadData()
        
    }
    
    //_persisntenceID:UInt64, _title:String, _url:String, _artist:String, _duration:Double)

    
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
        return siteList.count
    }
    
    /**
     UIPicker用メソッド（3.表示内容＋デザイン）
     */
    func pickerView(pickerView: UIPickerView, viewForRow row: Int, forComponent component: Int, reusingView view: UIView?) -> UIView {
        
        let pickerLabel: UILabel = UILabel()
        
        //表示内容
        pickerLabel.text = siteList[row].name
        
        //フォント
        var font: UIFont = UIFont(name: "Helvetica Neue", size: 18.0)!
        font = UIFont.systemFontOfSize(18.0, weight: UIFontWeightLight)
        pickerLabel.font = font
        
        //表示位置
        pickerLabel.textAlignment = NSTextAlignment.Center
        
        return pickerLabel
    }
    
    /**
     UIPicker用メソッド（4.選択時）
     */
    func pickerView(pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        
    }
    
    /** TextFieldが選択解除された時に呼ばれるメソッド（Did End On Exit→Editing Did End→やっぱDid End On Exit） */
    @IBAction func getText(sender: AnyObject) {
    }
    
    /** 検索ボタンを押された時に呼ばれるメソッド */
    @IBAction func searchButtonAction(sender: CustomButton) {
        if !(textField.text?.isEmpty)! && textField.text != "" {
            //検索メソッドを呼び出す
            search(textField.text!)
            //検索終了まで待つ
            networkingSynchronous()
            
            if resultList != nil {
                print("getVideoInfoはじまるよー")
                //詳細情報を取得する
                getVideoInfo()
                //情報取得終了まで待つ
                networkingSynchronous()
                //おそうじ（URLが格納されていないものは削除する）
                resultList = resultList.filter{ $0.url != "" }
                print("getVideoInfoおしまい")
                print(resultList)
            }
            
            //tableView更新
            tableView.reloadData()
            
        } else {
            //アラートを作成
            let alert = UIAlertController(title: "入力エラー", message: "キーワードを入力してください。", preferredStyle: UIAlertControllerStyle.Alert)
            alert.addAction(UIAlertAction(title: "OK", style: .Default, handler: {
                        (action: UIAlertAction!) -> Void in
                //self.presentViewController(alert, animated: true, completion: nil)
            }))
            self.presentViewController(alert, animated: true, completion: nil)
        }
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
}
