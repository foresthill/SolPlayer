//
//  AudioProcessor.swift
//  SolPlayer
//
//  Created by foresthill on 2025/03/26.
//  Copyright © 2025 Morioka Naoya. All rights reserved.
//
import AVFoundation

class AudioProcessor {
    private var engine: AVAudioEngine
    private var playerNode: AVAudioPlayerNode
    private var pitchNode: AVAudioUnitTimePitch
    private var audioFile: AVAudioFile?
    private var audioFileURL: URL?
    
    // 現在の設定値
    private(set) var currentPitch: Float = 0.0
    private(set) var currentRate: Float = 1.0
    
    init() {
        engine = AVAudioEngine()
        playerNode = AVAudioPlayerNode()
        pitchNode = AVAudioUnitTimePitch()
        
        engine.attach(playerNode)
        engine.attach(pitchNode)
        
        engine.connect(playerNode, to: pitchNode, format: nil)
        engine.connect(pitchNode, to: engine.mainMixerNode, format: nil)
        
        do {
            try engine.start()
        } catch {
            print("Error starting audio engine: \(error.localizedDescription)")
        }
        
        // オーディオセッションの設定
        setupAudioSession()
    }
    
    private func setupAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default)
            try session.setActive(true)
        } catch {
            print("Failed to set up audio session: \(error.localizedDescription)")
        }
    }
    
    func loadAudio(from url: URL) -> Bool {
        audioFileURL = url
        
        do {
            audioFile = try AVAudioFile(forReading: url)
            return true
        } catch {
            print("Error loading audio file: \(error.localizedDescription)")
            return false
        }
    }
    
    func setPitch(_ pitch: Float) {
        pitchNode.pitch = pitch
        currentPitch = pitch
    }
    
    func setRate(_ rate: Float) {
        pitchNode.rate = rate
        currentRate = rate
    }
    
    func play() {
        guard let audioFile = audioFile else { return }
        
        playerNode.stop()
        
        // オーディオバッファを設定
        let audioFormat = audioFile.processingFormat
        let audioFrameCount = UInt32(audioFile.length)
        let audioFileBuffer = AVAudioPCMBuffer(pcmFormat: audioFormat, frameCapacity: audioFrameCount)
        
        do {
            try audioFile.read(into: audioFileBuffer!)
        } catch {
            print("Error reading audio file: \(error.localizedDescription)")
            return
        }
        
        playerNode.scheduleBuffer(audioFileBuffer!, at: nil, options: .loops) {
            print("Finished playing audio buffer")
        }
        
        playerNode.play()
    }
    
    func stop() {
        playerNode.stop()
    }
    
    func isPlaying() -> Bool {
        return playerNode.isPlaying
    }
    
    func getCurrentTime() -> TimeInterval {
        guard let nodeTime = playerNode.lastRenderTime,
              let playerTime = playerNode.playerTime(forNodeTime: nodeTime) else {
            return 0
        }
        
        return Double(playerTime.sampleTime) / playerTime.sampleRate
    }
    
    func seek(to time: TimeInterval) {
        guard let audioFile = audioFile else { return }
        
        let wasPlaying = isPlaying()
        stop()
        
        let sampleRate = audioFile.processingFormat.sampleRate
        let framePosition = AVAudioFramePosition(time * sampleRate)
        let frameCount = AVAudioFrameCount(audioFile.length - framePosition)
        
        if frameCount > 0 {
            playerNode.scheduleSegment(audioFile, startingFrame: framePosition, frameCount: frameCount, at: nil) {
                print("Finished playing segment")
            }
            
            if wasPlaying {
                playerNode.play()
            }
        }
    }
    
    func getDuration() -> TimeInterval? {
        guard let audioFile = audioFile else { return nil }
        
        let sampleRate = audioFile.processingFormat.sampleRate
        return Double(audioFile.length) / sampleRate
    }
    
    deinit {
        stop()
        engine.stop()
    }
}
