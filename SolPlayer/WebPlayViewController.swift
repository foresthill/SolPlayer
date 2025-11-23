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
import AVKit
import AVFoundation

//#import "HCYoutubeParser"

import UIKit
import AVFoundation

class WebPlayViewController: UIViewController, UITableViewDataSource, UITableViewDelegate, UIPickerViewDataSource, UIPickerViewDelegate {
    
    // MARK: - Outlets
    @IBOutlet weak var sitePicker: UIPickerView!
    @IBOutlet weak var tableView: UITableView!
    @IBOutlet weak var textField: UITextField!
    
    // MARK: - Properties
    private let apiKey = "YOUR_API_KEY"
    private var youtubeDataManager: YouTubeDataManager!
    private var audioExtractionService: AudioExtractionService!
    private var audioProcessor: AudioProcessor!
    
    private var searchResults: [YouTubeSearchResult] = []
    private var siteList: [(id: String, name: String)] = [("0", "YouTube"), ("1", "ニコニコ動画"), ("2", "Vimeo")]
    
    // MARK: - Audio Control UI Elements
    private var audioControlsView: UIView?
    private var pitchSlider: UISlider?
    private var rateSlider: UISlider?
    private var playButton: UIButton?
    private var timeLabel: UILabel?
    private var progressSlider: UISlider?
    private var waveformView: UIView?
    
    // MARK: - Lifecycle Methods
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupServices()
        setupUI()
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        if audioProcessor?.isPlaying() ?? false {
            audioProcessor.stop()
        }
    }
    
    // MARK: - Setup Methods
    private func setupServices() {
        youtubeDataManager = YouTubeDataManager(apiKey: apiKey)
        audioExtractionService = AudioExtractionService(apiKey: apiKey)
        audioProcessor = AudioProcessor()
    }
    
    private func setupUI() {
        // TableView setup
        tableView.register(UITableViewCell.self, forCellReuseIdentifier: "Cell")
        tableView.dataSource = self
        tableView.delegate = self
        
        // PickerView setup
        sitePicker.dataSource = self
        sitePicker.delegate = self
        
        // TextField setup
        textField.returnKeyType = .search
        textField.delegate = self
    }
    
    // MARK: - Actions
    @IBAction func searchButtonTapped(_ sender: UIButton) {
        performSearch()
    }
    
    private func performSearch() {
        guard let query = textField.text, !query.isEmpty else {
            showAlert(title: "入力エラー", message: "キーワードを入力してください。")
            return
        }
        
        // キーボードを閉じる
        textField.resignFirstResponder()
        
        // インジケータ表示
        let activityIndicator = UIActivityIndicatorView(activityIndicatorStyle: .medium)
        activityIndicator.center = view.center
        view.addSubview(activityIndicator)
        activityIndicator.startAnimating()
        
        youtubeDataManager.searchVideos(query: query) { [weak self] results, error in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                activityIndicator.stopAnimating()
                activityIndicator.removeFromSuperview()
                
                if let error = error {
                    ErrorHandler.handle(error, in: self)
                    return
                }
                
                if let results = results {
                    self.searchResults = results
                    self.tableView.reloadData()
                }
            }
        }
    }
    
    // MARK: - Audio Processing
    private func processAudio(for videoId: String) {
        // インジケータ表示
        let activityIndicator = UIActivityIndicatorView(style: .large)
        activityIndicator.center = view.center
        view.addSubview(activityIndicator)
        activityIndicator.startAnimating()
        
        audioExtractionService.extractAudioFromYouTube(videoId: videoId) { [weak self] url, error in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                activityIndicator.stopAnimating()
                activityIndicator.removeFromSuperview()
                
                if let error = error {
                    ErrorHandler.handle(error, in: self)
                    return
                }
                
                if let url = url {
                    let success = self.audioProcessor.loadAudio(from: url)
                    if success {
                        // デフォルト設定
                        self.audioProcessor.setPitch(0.0)
                        self.audioProcessor.setRate(1.0)
                        
                        // 音声コントロールUIを表示
                        self.showAudioControls()
                        
                        // 再生開始
                        self.audioProcessor.play()
                        self.updatePlayButtonState()
                        
                        // 波形表示
                        self.loadWaveformData()
                        
                        // 再生時間更新タイマー
                        self.startPlaybackTimeUpdates()
                    } else {
                        self.showAlert(title: "音声読み込み失敗", message: "音声ファイルの読み込みに失敗しました")
                    }
                }
            }
        }
    }
    
    // MARK: - Audio Controls UI
    private func showAudioControls() {
        // 既存のコントロールを削除
        audioControlsView?.removeFromSuperview()
        
        // コントロールビューを作成
        let controlsView = UIView(frame: CGRect(x: 0, y: view.bounds.height - 250, width: view.bounds.width, height: 250))
        controlsView.backgroundColor = UIColor(white: 0.1, alpha: 0.9)
        controlsView.layer.cornerRadius = 20
        controlsView.clipsToBounds = true
        view.addSubview(controlsView)
        audioControlsView = controlsView
        
        // タイトルラベル
        let titleLabel = UILabel(frame: CGRect(x: 20, y: 20, width: controlsView.bounds.width - 40, height: 30))
        titleLabel.textColor = .white
        titleLabel.font = UIFont.systemFont(ofSize: 18, weight: .medium)
        titleLabel.text = "音声処理コントロール"
        controlsView.addSubview(titleLabel)
        
        // 波形表示エリア
        let waveformArea = UIView(frame: CGRect(x: 20, y: 60, width: controlsView.bounds.width - 40, height: 40))
        waveformArea.backgroundColor = UIColor(white: 0.2, alpha: 1.0)
        waveformArea.layer.cornerRadius = 5
        controlsView.addSubview(waveformArea)
        waveformView = waveformArea
        
        // 再生時間表示
        let timeLabel = UILabel(frame: CGRect(x: 20, y: 105, width: 100, height: 20))
        timeLabel.textColor = .white
        timeLabel.font = UIFont.systemFont(ofSize: 12)
        timeLabel.text = "00:00 / 00:00"
        controlsView.addSubview(timeLabel)
        self.timeLabel = timeLabel
        
        // シークバー
        let progressSlider = UISlider(frame: CGRect(x: 120, y: 105, width: controlsView.bounds.width - 140, height: 20))
        progressSlider.minimumValue = 0
        progressSlider.maximumValue = 1
        progressSlider.value = 0
        progressSlider.addTarget(self, action: #selector(progressChanged(_:)), for: .valueChanged)
        controlsView.addSubview(progressSlider)
        self.progressSlider = progressSlider
        
        // ピッチスライダー
        let pitchLabel = UILabel(frame: CGRect(x: 20, y: 135, width: 100, height: 30))
        pitchLabel.textColor = .white
        pitchLabel.text = "ピッチ"
        controlsView.addSubview(pitchLabel)
        
        let pitchSlider = UISlider(frame: CGRect(x: 120, y: 135, width: controlsView.bounds.width - 140, height: 30))
        pitchSlider.minimumValue = -2400 // -24半音
        pitchSlider.maximumValue = 2400  // +24半音
        pitchSlider.value = 0            // デフォルト値
        pitchSlider.addTarget(self, action: #selector(pitchChanged(_:)), for: .valueChanged)
        controlsView.addSubview(pitchSlider)
        self.pitchSlider = pitchSlider
        
        // 再生速度スライダー
        let rateLabel = UILabel(frame: CGRect(x: 20, y: 175, width: 100, height: 30))
        rateLabel.textColor = .white
        rateLabel.text = "再生速度"
        controlsView.addSubview(rateLabel)
        
        let rateSlider = UISlider(frame: CGRect(x: 120, y: 175, width: controlsView.bounds.width - 140, height: 30))
        rateSlider.minimumValue = 0.5  // 0.5倍速
        rateSlider.maximumValue = 2.0  // 2倍速
        rateSlider.value = 1.0         // デフォルト値
        rateSlider.addTarget(self, action: #selector(rateChanged(_:)), for: .valueChanged)
        controlsView.addSubview(rateSlider)
        self.rateSlider = rateSlider
        
        // 再生/停止ボタン
        let playButton = UIButton(frame: CGRect(x: (controlsView.bounds.width - 100) / 2, y: 210, width: 100, height: 30))
        playButton.setTitle("停止", for: .normal)
        playButton.backgroundColor = UIColor(red: 0.0, green: 0.5, blue: 1.0, alpha: 1.0)
        playButton.layer.cornerRadius = 15
        playButton.addTarget(self, action: #selector(playButtonTapped(_:)), for: .touchUpInside)
        controlsView.addSubview(playButton)
        self.playButton = playButton
    }
    
    private func loadWaveformData() {
        audioProcessor.getWaveformData { [weak self] waveformData in
            guard let self = self, let waveformData = waveformData, let waveformView = self.waveformView else { return }
            
            DispatchQueue.main.async {
                // 既存の波形表示をクリア
                for subview in waveformView.subviews {
                    subview.removeFromSuperview()
                }
                
                // 波形を描画
                let width = waveformView.bounds.width
                let height = waveformView.bounds.height
                let barWidth: CGFloat = width / CGFloat(min(waveformData.count, 100))
                let barSpacing: CGFloat = 1
                
                // データを間引く
                let stride = waveformData.count / 100
                let sampledData = stride > 0 ? stride(from: 0, to: waveformData.count, by: stride).map { waveformData[$0] } : waveformData
                
                for (index, amplitude) in sampledData.enumerated() {
                    if index >= 100 { break }
                    
                    let barHeight = CGFloat(amplitude) * height
                    let bar = UIView(frame: CGRect(
                        x: CGFloat(index) * (barWidth + barSpacing),
                        y: (height - barHeight) / 2,
                        width: barWidth,
                        height: max(barHeight, 2)
                    ))
                    bar.backgroundColor = UIColor(red: 0.0, green: 0.8, blue: 1.0, alpha: 1.0)
                    bar.layer.cornerRadius = 1
                    waveformView.addSubview(bar)
                }
            }
        }
    }
    
    private func startPlaybackTimeUpdates() {
        // 既存のタイマーを停止
        NSObject.cancelPreviousPerformRequests(withTarget: self, selector: #selector(updatePlaybackTime), object: nil)
        
        // 新しいタイマーを開始
        perform(#selector(updatePlaybackTime), with: nil, afterDelay: 0.1)
    }
    
    @objc private func updatePlaybackTime() {
        guard let duration = audioProcessor.getDuration() else { return }
        
        let currentTime = audioProcessor.getCurrentTime()
        let currentTimeFormatted = formatTime(currentTime)
        let durationFormatted = formatTime(duration)
        
        timeLabel?.text = "\(currentTimeFormatted) / \(durationFormatted)"
        progressSlider?.value = Float(currentTime / duration)
        
        // 再生中なら更新を継続
        if audioProcessor.isPlaying() {
            perform(#selector(updatePlaybackTime), with: nil, afterDelay: 0.1)
        }
    }
    
    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%02d:%02d", minutes, seconds)
    }
    
    private func updatePlayButtonState() {
        if audioProcessor.isPlaying() {
            playButton?.setTitle("停止", for: .normal)
        } else {
            playButton?.setTitle("再生", for: .normal)
        }
    }
    
    // MARK: - Control Actions
    @objc func pitchChanged(_ slider: UISlider) {
        audioProcessor.setPitch(slider.value)
    }
    
    @objc func rateChanged(_ slider: UISlider) {
        audioProcessor.setRate(slider.value)
    }
    
    @objc func playButtonTapped(_ button: UIButton) {
        if audioProcessor.isPlaying() {
            audioProcessor.stop()
        } else {
            audioProcessor.play()
            startPlaybackTimeUpdates()
        }
        updatePlayButtonState()
    }
    
    @objc func progressChanged(_ slider: UISlider) {
        guard let duration = audioProcessor.getDuration() else { return }
        let targetTime = Double(slider.value) * duration
        audioProcessor.seek(to: targetTime)
        updatePlaybackTime()
    }
    
    // MARK: - Helper Methods
    private func showAlert(title: String, message: String) {
        let alert = UIAlertController(title: title, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
    
    // MARK: - UITableViewDataSource
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return searchResults.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "Cell", for: indexPath)
        
        let result = searchResults[indexPath.row]
        
        cell.textLabel?.text = result.title
        cell.detailTextLabel?.text = "再生時間: \(result.formattedDuration()) 再生回数: \(result.formattedViewCount())"
        
        // サムネイル画像を非同期で読み込み
        DispatchQueue.global().async {
            if let imageData = try? Data(contentsOf: result.thumbnailURL),
               let image = UIImage(data: imageData) {
                DispatchQueue.main.async {
                    if let currentCell = tableView.cellForRow(at: indexPath) {
                        currentCell.imageView?.image = image
                        currentCell.setNeedsLayout()
                    }
                }
            }
        }
        
        return cell
    }
    
    // MARK: - UITableViewDelegate
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        let selectedVideo = searchResults[indexPath.row]
        processAudio(for: selectedVideo.videoId)
    }
    
    // MARK: - UIPickerViewDataSource
    func numberOfComponents(in pickerView: UIPickerView) -> Int {
        return 1
    }
    
    func pickerView(_ pickerView: UIPickerView, numberOfRowsInComponent component: Int) -> Int {
        return siteList.count
    }
    
    // MARK: - UIPickerViewDelegate
    func pickerView(_ pickerView: UIPickerView, titleForRow row: Int, forComponent component: Int) -> String? {
        return siteList[row].name
    }
    
    func pickerView(_ pickerView: UIPickerView, didSelectRow row: Int, inComponent component: Int) {
        // サイト選択時の処理
        // 現在は YouTube のみ実装
    }
}

// MARK: - UITextFieldDelegate
extension WebPlayViewController: UITextFieldDelegate {
    func textFieldShouldReturn(_ textField: UITextField) -> Bool {
        performSearch()
        return true
    }
}

