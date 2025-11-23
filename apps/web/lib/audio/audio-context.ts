/**
 * グローバルオーディオコンテキスト管理
 */

import { AudioProcessor } from '@solplayer/audio-core';

let globalAudioProcessor: AudioProcessor | null = null;

export function getAudioProcessor(): AudioProcessor {
  if (!globalAudioProcessor) {
    globalAudioProcessor = new AudioProcessor();
  }
  return globalAudioProcessor;
}

export function resetAudioProcessor(): void {
  if (globalAudioProcessor) {
    globalAudioProcessor.dispose();
    globalAudioProcessor = null;
  }
}
