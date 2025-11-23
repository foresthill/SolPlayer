//
//  ErrorHandling.swift
//  SolPlayer
//
//  Created by foresthill on 2025/03/26.
//  Copyright © 2025 Morioka Naoya. All rights reserved.
//
import Foundation

enum AudioProcessingError: Error {
    case networkError(String)
    case parseError(String)
    case fileAccessError(String)
    case audioEngineError(String)
    case unsupportedFormat(String)
    
    var localizedDescription: String {
        switch self {
        case .networkError(let message):
            return "ネットワークエラー: \(message)"
        case .parseError(let message):
            return "解析エラー: \(message)"
        case .fileAccessError(let message):
            return "ファイルアクセスエラー: \(message)"
        case .audioEngineError(let message):
            return "音声処理エラー: \(message)"
        case .unsupportedFormat(let message):
            return "未対応の形式: \(message)"
        }
    }
}

// エラーハンドリングユーティリティ
class ErrorHandler {
    static func handle(_ error: Error, in viewController: UIViewController, completion: (() -> Void)? = nil) {
        var errorMessage = ""
        
        if let audioError = error as? AudioProcessingError {
            errorMessage = audioError.localizedDescription
        } else {
            errorMessage = error.localizedDescription
        }
        
        // エラーログを記録
        logError(errorMessage)
        
        // ユーザーに通知
        let alert = UIAlertController(title: "エラーが発生しました", message: errorMessage, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in
            completion?()
        })
        
        viewController.present(alert, animated: true)
    }
    
    private static func logError(_ message: String) {
        print("ERROR: \(message)")
        // 実際のアプリケーションでは、適切なロギングシステムを使用
    }
}
