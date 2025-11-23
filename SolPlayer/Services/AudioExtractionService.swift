//
//  AudioExtractionService.swift
//  SolPlayer
//
//  Created by foresthill on 2025/03/26.
//  Copyright © 2025 Morioka Naoya. All rights reserved.
//
import Foundation
import Alamofire

class AudioExtractionService {
    private let apiKey: String
    
    init(apiKey: String) {
        self.apiKey = apiKey
    }
    
    func extractAudioFromYouTube(videoId: String, completion: @escaping (URL?, Error?) -> Void) {
        // 1. 動画情報を取得するためのエンドポイント
        let infoURL = "https://www.googleapis.com/youtube/v3/videos?id=\(videoId)&key=\(apiKey)&part=contentDetails,snippet&fields=items(id,snippet(title),contentDetails(duration))"
        
        // 2. 情報取得リクエスト
        AF.request(infoURL).responseJSON { [weak self] response in
            guard let self = self else { return }
            
            switch response.result {
            case .success(let value):
                guard let json = value as? [String: Any],
                      let items = json["items"] as? [[String: Any]],
                      let firstItem = items.first,
                      let snippet = firstItem["snippet"] as? [String: Any],
                      let title = snippet["title"] as? String else {
                    completion(nil, NSError(domain: "ParseError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to parse video info"]))
                    return
                }
                
                // 3. 音声抽出処理
                self.downloadAudio(videoId: videoId, title: title, completion: completion)
                
            case .failure(let error):
                completion(nil, error)
            }
        }
    }
    
    private func downloadAudio(videoId: String, title: String, completion: @escaping (URL?, Error?) -> Void) {
        // 実際のアプリケーションでは、サーバーサイドのYouTube音声抽出APIを使用するか、
        // 適切なサービスを利用します。ここではサンプル実装として示します。
        
        // 音声抽出用のエンドポイント (例: 自社サーバーやサードパーティサービス)
        let audioExtractionURL = "https://your-audio-extraction-api.com/extract?videoId=\(videoId)&format=mp3"
        
        AF.request(audioExtractionURL).responseJSON { response in
            switch response.result {
            case .success(let value):
                guard let audioInfo = value as? [String: Any],
                      let audioURLString = audioInfo["url"] as? String,
                      let audioURL = URL(string: audioURLString) else {
                    completion(nil, NSError(domain: "AudioExtractionError", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to extract audio URL"]))
                    return
                }
                
                // 4. 音声ファイルをダウンロード
                let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
                let sanitizedTitle = title.replacingOccurrences(of: "[\\/:*?\"<>|]", with: "_", options: .regularExpression)
                let destinationURL = documentsDirectory.appendingPathComponent("\(sanitizedTitle)_\(videoId).mp3")
                
                let destination: DownloadRequest.Destination = { _, _ in
                    return (destinationURL, [.removePreviousFile, .createIntermediateDirectories])
                }
                
                AF.download(audioURL, to: destination).response { downloadResponse in
                    if let error = downloadResponse.error {
                        completion(nil, error)
                    } else {
                        completion(destinationURL, nil)
                    }
                }
                
            case .failure(let error):
                completion(nil, error)
            }
        }
    }
    
    // キャッシュ管理
    func clearCache() {
        let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        
        do {
            let fileURLs = try FileManager.default.contentsOfDirectory(at: documentsDirectory, includingPropertiesForKeys: nil)
            for fileURL in fileURLs where fileURL.pathExtension == "mp3" {
                try FileManager.default.removeItem(at: fileURL)
            }
        } catch {
            print("Failed to clear cache: \(error.localizedDescription)")
        }
    }
}
