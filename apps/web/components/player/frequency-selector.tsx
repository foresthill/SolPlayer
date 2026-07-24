'use client';

import { FrequencyConverter } from '@solplayer/audio-core';
import { useEffect, useState } from 'react';
import { PlusIcon, TrashIcon } from './icons';

interface FrequencySelectorProps {
  frequency: number;
  onChange: (hz: number) => void;
}

interface SavedPreset {
  id: string;
  hz: number;
}

const PRESETS = [
  { name: '標準', value: 440 },
  { name: 'ヒーリング', value: 432 },
  { name: 'クリスタル', value: 444 },
  { name: '科学的', value: 437 },
];

const MIN_HZ = 400;
const MAX_HZ = 480;
/** 小数点以下の最大桁数（原作iOS相当の精度） */
const MAX_DECIMALS = 10;

const STORAGE_KEY = 'solplayer:custom-presets';

/** 小数第10位までに丸め、末尾の0を落として表示用文字列にする */
function formatHz(hz: number): string {
  if (Number.isInteger(hz)) return String(hz);
  return hz
    .toFixed(MAX_DECIMALS)
    .replace(/0+$/, '')
    .replace(/\.$/, '');
}

/** 入力文字列を検証してHz値にする（範囲外・不正はnull） */
function parseHz(value: string): number | null {
  if (!/^\d+(\.\d+)?$/.test(value.trim())) return null;
  const hz = Number(value);
  if (Number.isNaN(hz) || hz < MIN_HZ || hz > MAX_HZ) return null;
  // 小数第10位までに丸める
  return Math.round(hz * 10 ** MAX_DECIMALS) / 10 ** MAX_DECIMALS;
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `preset-${Math.random().toString(36).slice(2)}`;
}

export function FrequencySelector({ frequency, onChange }: FrequencySelectorProps) {
  const [customValue, setCustomValue] = useState('440');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [inputError, setInputError] = useState(false);

  // プリセット等で周波数が変わったら入力欄も連動させる
  // （周波数はユーザー操作でのみ変わるため、入力中に勝手に書き換わることはない）
  useEffect(() => {
    setCustomValue(formatHz(frequency));
    setInputError(false);
  }, [frequency]);

  // 保存済みプリセットをlocalStorageから復元（DB接続までのブラウザ保存）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedPresets(
            parsed.filter(
              (p): p is SavedPreset =>
                typeof p === 'object' &&
                p !== null &&
                typeof (p as SavedPreset).id === 'string' &&
                typeof (p as SavedPreset).hz === 'number'
            )
          );
        }
      }
    } catch {
      // 壊れたデータは無視
    }
  }, []);

  const persist = (list: SavedPreset[]) => {
    setSavedPresets(list);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ストレージ不可の環境では保存をあきらめる（表示のみ更新）
    }
  };

  const applyCustom = (): number | null => {
    const hz = parseHz(customValue);
    if (hz === null) {
      setInputError(true);
      return null;
    }
    setInputError(false);
    onChange(hz);
    return hz;
  };

  const saveCustom = () => {
    const hz = parseHz(customValue);
    if (hz === null) {
      setInputError(true);
      return;
    }
    setInputError(false);
    onChange(hz);
    // 同じ値の重複保存は避ける
    if (savedPresets.some((p) => p.hz === hz)) return;
    persist([...savedPresets, { id: createId(), hz }]);
  };

  const removePreset = (id: string) => {
    persist(savedPresets.filter((p) => p.id !== id));
  };

  const semitones = FrequencyConverter.toSemitones(440, frequency);
  const cents = FrequencyConverter.toCents(440, frequency);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="shrink-0 text-sm font-semibold tracking-wider text-ink-soft">
          基調周波数 (A4)
        </h3>
        <p className="min-w-0 truncate text-right text-xs tabular-nums text-ink-soft">
          {formatHz(frequency)}Hz
          {frequency !== 440 && (
            <span className="ml-1.5 text-ink-faint">
              ({semitones > 0 ? '+' : ''}
              {semitones.toFixed(2)} st)
            </span>
          )}
        </p>
      </div>

      {/* 基本プリセット（整数） */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            className="glass-chip flex flex-col items-center gap-0.5 px-3 py-2.5"
            data-active={frequency === preset.value}
            onClick={() => onChange(preset.value)}
            aria-pressed={frequency === preset.value}
          >
            <span className="text-sm font-semibold tabular-nums">
              {preset.value}
              <span className="text-[0.65rem] font-normal">Hz</span>
            </span>
            <span className="text-[0.65rem] opacity-80">{preset.name}</span>
          </button>
        ))}
      </div>

      {/* マイプリセット（保存したカスタム値） */}
      {savedPresets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[0.7rem] font-medium tracking-wider text-ink-faint">
            マイプリセット
          </p>
          <div className="flex flex-wrap gap-2">
            {savedPresets.map((preset) => (
              <span key={preset.id} className="group relative inline-flex">
                <button
                  type="button"
                  className="glass-chip px-3 py-1.5 pr-7 text-xs tabular-nums"
                  data-active={frequency === preset.hz}
                  onClick={() => onChange(preset.hz)}
                  aria-pressed={frequency === preset.hz}
                >
                  {formatHz(preset.hz)}Hz
                </button>
                <button
                  type="button"
                  className="glass-btn absolute top-1/2 right-1 h-5 w-5 -translate-y-1/2 transition-opacity focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
                  onClick={() => removePreset(preset.id)}
                  aria-label={`${formatHz(preset.hz)}Hz を削除`}
                  title="削除"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 詳細カスタム（小数第10位まで） */}
      <div className="space-y-3">
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs font-medium text-ink-soft transition-colors hover:text-ink"
          onClick={() => setIsAdvancedOpen((v) => !v)}
          aria-expanded={isAdvancedOpen}
        >
          <span
            className={`inline-block transition-transform ${isAdvancedOpen ? 'rotate-90' : ''}`}
          >
            ▸
          </span>
          詳細カスタム
        </button>

        {isAdvancedOpen && (
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={customValue}
                onChange={(e) => {
                  setCustomValue(e.target.value);
                  setInputError(false);
                }}
                onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
                placeholder={`例: 431.9999999999 (${MIN_HZ}–${MAX_HZ})`}
                className={`glass-input min-w-0 flex-1 text-sm tabular-nums ${
                  inputError ? 'border-red-400/70' : ''
                }`}
                aria-label="カスタム周波数"
                aria-invalid={inputError}
              />
              <button
                type="button"
                className="glass-chip shrink-0 px-4 py-2 text-sm font-medium"
                onClick={applyCustom}
              >
                適用
              </button>
              <button
                type="button"
                className="glass-chip flex shrink-0 items-center gap-1 px-3 py-2 text-sm font-medium"
                onClick={saveCustom}
                title="適用してマイプリセットに保存"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                保存
              </button>
            </div>
            {inputError && (
              <p className="text-xs text-red-500/80">
                {MIN_HZ}〜{MAX_HZ}の数値を入力してください（小数第{MAX_DECIMALS}位まで）
              </p>
            )}
            <p className="text-[0.7rem] leading-relaxed text-ink-faint">
              小数第{MAX_DECIMALS}位まで指定できます。現在:{' '}
              {cents >= 0 ? '+' : ''}
              {cents.toFixed(4)} セント。保存した値はこのブラウザに記録されます。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
