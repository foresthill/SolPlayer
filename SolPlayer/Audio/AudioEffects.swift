//
//  WaveformAnalyzer.swift
//  SolPlayer
//
//  Created by foresthill on 2025/03/26.
//  Copyright © 2025 Morioka Naoya. All rights reserved.
//

import AVFoundation

extension AudioProcessor {
    // イコライザー設定
    func configureEqualizer(bassGain: Float, midGain: Float, trebleGain: Float) {
        let eqNode = AVAudioUnitEQ(numberOfBands: 3)
        
        // 低音域 (80Hz)
        eqNode.bands[0].frequency = 80
        eqNode.bands[0].gain = bassGain
        eqNode.bands[0].filterType = .parametric
        
        // 中音域 (1000Hz)
        eqNode.bands[1].frequency = 1000
        eqNode.bands[1].gain = midGain
        eqNode.bands[1].filterType = .parametric
        
        // 高音域 (8000Hz)
        eqNode.bands[2].frequency = 8000
        eqNode.bands[2].gain = trebleGain
        eqNode.bands[2].filterType = .parametric
        
        // エンジンに接続
        engine.attach(eqNode)
        
        // 既存の接続を解除
        engine.disconnectNodeOutput(pitchNode)
        
        // 新しい接続を確立
        engine.connect(pitchNode, to: eqNode, format: nil)
        engine.connect(eqNode, to: engine.mainMixerNode, format: nil)
    }
    
    // リバーブ効果の追加
    func addReverb(wetDryMix: Float) {
        let reverbNode = AVAudioUnitReverb()
        reverbNode.wetDryMix = wetDryMix
        reverbNode.loadFactoryPreset(.largeHall)
        
        engine.attach(reverbNode)
        
        // 既存の接続を解除
        engine.disconnectNodeOutput(pitchNode)
        
        // 新しい接続を確立
        engine.connect(pitchNode, to: reverbNode, format: nil)
        engine.connect(reverbNode, to: engine.mainMixerNode, format: nil)
    }
    
    // ディストーション効果の追加
    func addDistortion(preGain: Float, wetDryMix: Float) {
        let distortionNode = AVAudioUnitDistortion()
        distortionNode.preGain = preGain
        distortionNode.wetDryMix = wetDryMix
        distortionNode.loadFactoryPreset(.multiDistortedDelay)
        
        engine.attach(distortionNode)
        
        // 既存の接続を解除
        engine.disconnectNodeOutput(pitchNode)
        
        // 新しい接続を確立
        engine.connect(pitchNode, to: distortionNode, format: nil)
        engine.connect(distortionNode, to: engine.mainMixerNode, format: nil)
    }
    
    // オーディオファイルの波形データを取得
    func getWaveformData(completion: @escaping ([Float]?) -> Void) {
        guard let audioFile = audioFile else {
            completion(nil)
            return
        }
        
        let format = audioFile.processingFormat
        let frameCount = UInt32(audioFile.length)
        let sampleRate = format.sampleRate
        let channelCount = format.channelCount
        
        // 波形データを格納する配列
        var waveformData: [Float] = []
        
        // 読み込むバッファサイズ
        let bufferSize = 1024
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(bufferSize))!
        
        do {
            // ファイルの先頭に戻る
            try audioFile.seek(to: 0)
            
            // 波形データを読み込む
            while true {
                try audioFile.read(into: buffer)
                
                // 読み込んだフレーム数が0なら終了
                if buffer.frameLength == 0 {
                    break
                }
                
                // チャンネルごとのデータを取得
                let channelData = buffer.floatChannelData!
                
                // 各フレームの振幅値を計算
                for frame in 0..<Int(buffer.frameLength) {
                    var sum: Float = 0.0
                    
                    // 全チャンネルの平均値を計算
                    for channel in 0..<Int(channelCount) {
                        sum += abs(channelData[channel][frame])
                    }
                    
                    let average = sum / Float(channelCount)
                    waveformData.append(average)
                }
            }
            
            // データ量が多すぎる場合は間引く
            if waveformData.count > 1000 {
                let stride = waveformData.count / 1000
                let reducedData = stride(from: 0, to: waveformData.count, by: stride).map { waveformData[$0] }
                completion(reducedData)
            } else {
                completion(waveformData)
            }
            
        } catch {
            print("Error reading audio file: \(error.localizedDescription)")
            completion(nil)
        }
    }
}
