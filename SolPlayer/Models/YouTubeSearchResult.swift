//
//  YouTubeSearchResult.swift
//  SolPlayer
//
//  Created by foresthill on 2025/03/26.
//  Copyright © 2025 Morioka Naoya. All rights reserved.
//
import Foundation

struct YouTubeSearchResult {
    let videoId: String
    let title: String
    let description: String
    let thumbnailURL: URL
    let duration: TimeInterval
    let viewCount: Int
    
    // 表示用フォーマットメソッド
    func formattedDuration() -> String {
        let hours = Int(duration) / 3600
        let minutes = (Int(duration) % 3600) / 60
        let seconds = Int(duration) % 60
        
        if hours > 0 {
            return String(format: "%02d:%02d:%02d", hours, minutes, seconds)
        } else {
            return String(format: "%02d:%02d", minutes, seconds)
        }
    }
    
    func formattedViewCount() -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: viewCount)) ?? "\(viewCount)"
    }
}
