//
//  YouTubeDataManager.swift
//  SolPlayer
//
//  Created by foresthill on 2025/03/26.
//  Copyright © 2025 Morioka Naoya. All rights reserved.
//

import Foundation
import Alamofire

class YouTubeDataManager {
    private let apiKey: String
    
    init(apiKey: String) {
        self.apiKey = apiKey
    }
    
    func searchVideos(query: String, maxResults: Int = 10, completion: @escaping ([YouTubeSearchResult]?, Error?) -> Void) {
        let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        let searchURL = "https://www.googleapis.com/youtube/v3/search?part=snippet&q=\(encodedQuery)&maxResults=\(maxResults)&type=video&key=\(apiKey)"
        
        AF.request(searchURL).responseJSON { response in
            switch response.result {
            case .success(let value):
                guard let json = value as? [String: Any],
                      let items = json["items"] as? [[String: Any]] else {
                    completion(nil, NSError(domain: "ParseError", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to parse search results"]))
                    return
                }
                
                // 動画IDを抽出
                let videoIds = items.compactMap { item -> String? in
                    guard let id = item["id"] as? [String: Any],
                          let videoId = id["videoId"] as? String else {
                        return nil
                    }
                    return videoId
                }.joined(separator: ",")
                
                // 詳細情報を取得
                self.getVideoDetails(videoIds: videoIds, completion: completion)
                
            case .failure(let error):
                completion(nil, error)
            }
        }
    }
    
    private func getVideoDetails(videoIds: String, completion: @escaping ([YouTubeSearchResult]?, Error?) -> Void) {
        let detailsURL = "https://www.googleapis.com/youtube/v3/videos?id=\(videoIds)&key=\(apiKey)&part=snippet,contentDetails,statistics&fields=items(id,snippet(title,description,thumbnails),contentDetails(duration),statistics(viewCount))"
        
        AF.request(detailsURL).responseJSON { response in
            switch response.result {
            case .success(let value):
                guard let json = value as? [String: Any],
                      let items = json["items"] as? [[String: Any]] else {
                    completion(nil, NSError(domain: "ParseError", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to parse video details"]))
                    return
                }
                
                let results = items.compactMap { item -> YouTubeSearchResult? in
                    guard let id = item["id"] as? String,
                          let snippet = item["snippet"] as? [String: Any],
                          let title = snippet["title"] as? String,
                          let description = snippet["description"] as? String,
                          let thumbnails = snippet["thumbnails"] as? [String: Any],
                          let highQuality = thumbnails["high"] as? [String: Any],
                          let thumbnailURLString = highQuality["url"] as? String,
                          let thumbnailURL = URL(string: thumbnailURLString),
                          let contentDetails = item["contentDetails"] as? [String: Any],
                          let durationString = contentDetails["duration"] as? String,
                          let statistics = item["statistics"] as? [String: Any],
                          let viewCountString = statistics["viewCount"] as? String,
                          let viewCount = Int(viewCountString) else {
                        return nil
                    }
                    
                    // ISO 8601 duration形式を秒に変換
                    let duration = self.isoDurationToSeconds(durationString)
                    
                    return YouTubeSearchResult(
                        videoId: id,
                        title: title,
                        description: description,
                        thumbnailURL: thumbnailURL,
                        duration: duration,
                        viewCount: viewCount
                    )
                }
                
                completion(results, nil)
                
            case .failure(let error):
                completion(nil, error)
            }
        }
    }
    
    private func isoDurationToSeconds(_ isoDuration: String) -> TimeInterval {
        // ISO 8601 duration形式 (例: PT1H2M3S) を秒に変換
        var seconds: TimeInterval = 0
        
        let hourPattern = "([0-9]+)H"
        let minutePattern = "([0-9]+)M"
        let secondPattern = "([0-9]+)S"
        
        if let hourRange = isoDuration.range(of: hourPattern, options: .regularExpression),
           let hourString = isoDuration[hourRange].replacingOccurrences(of: "H", with: "").components(separatedBy: "T").last,
           let hours = Double(hourString) {
            seconds += hours * 3600
        }
        
        if let minuteRange = isoDuration.range(of: minutePattern, options: .regularExpression),
           let minuteString = isoDuration[minuteRange].replacingOccurrences(of: "M", with: "").components(separatedBy: "T").last,
           let minutes = Double(minuteString) {
            seconds += minutes * 60
        }
        
        if let secondRange = isoDuration.range(of: secondPattern, options: .regularExpression),
           let secondString = isoDuration[secondRange].replacingOccurrences(of: "S", with: "").components(separatedBy: "T").last,
           let parsedSeconds = Double(secondString) {
            seconds += parsedSeconds
        }
        
        return seconds
    }
}
