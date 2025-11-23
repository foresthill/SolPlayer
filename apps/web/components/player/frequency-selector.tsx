'use client';

import { FrequencyConverter } from '@solplayer/audio-core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useState } from 'react';

interface FrequencySelectorProps {
  frequency: number;
  onChange: (hz: number) => void;
}

export function FrequencySelector({ frequency, onChange }: FrequencySelectorProps) {
  const [customHz, setCustomHz] = useState('440');

  const presets = [
    { name: '標準 (440Hz)', value: 440 },
    { name: 'ヒーリング (432Hz)', value: 432 },
    { name: 'クリスタル (444Hz)', value: 444 },
    { name: '科学的 (437Hz)', value: 437 },
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">基調周波数 (A4)</Label>
        <p className="text-sm text-gray-500">
          現在: {frequency}Hz
          {frequency !== 440 && (
            <span className="ml-2">
              ({FrequencyConverter.toSemitones(440, frequency).toFixed(2)} セミトーン)
            </span>
          )}
        </p>
      </div>

      <RadioGroup value={frequency.toString()} onValueChange={(val) => onChange(parseInt(val))}>
        {presets.map((preset) => (
          <div key={preset.value} className="flex items-center space-x-2">
            <RadioGroupItem value={preset.value.toString()} id={`freq-${preset.value}`} />
            <Label htmlFor={`freq-${preset.value}`} className="cursor-pointer">
              {preset.name}
            </Label>
          </div>
        ))}
      </RadioGroup>

      <div className="flex gap-2">
        <Input
          type="number"
          min="400"
          max="480"
          value={customHz}
          onChange={(e) => setCustomHz(e.target.value)}
          placeholder="カスタム周波数"
        />
        <Button onClick={() => onChange(parseInt(customHz))}>
          適用
        </Button>
      </div>
    </div>
  );
}
