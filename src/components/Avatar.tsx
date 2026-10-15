import { useMemo, useState, useEffect, useId } from 'react';
import type { AvatarConfig, AvatarSlot } from '../types';
import { buildGameAvatarSvg } from '../avatar';
import { sound } from '../sound';

export function GameAvatar2D({
  config,
  avatar,
  size = 140,
  width,
  height,
  className = '',
  rounded = 'rounded-3xl',
  interactive = true,
  sparkleTrigger = 0,
  previewMode,
}: {
  config?: AvatarConfig | null;
  avatar?: AvatarConfig | null;
  size?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
  rounded?: string;
  interactive?: boolean;
  sparkleTrigger?: number | boolean;
  previewMode?: AvatarSlot | 'full' | 'face' | 'head';
}) {
  const [jumping, setJumping] = useState(false);
  const [sparkling, setSparkling] = useState(false);

  // グラデーションID競合を防ぐユニークプレフィックス
  const rawId = useId();
  const idPrefix = useMemo(() => 'av' + rawId.replace(/[^a-zA-Z0-9]/g, ''), [rawId]);

  const currentConfig = config ?? avatar;

  // 顔まわりのズーム判定
  const isFaceZoom =
    previewMode === 'hairStyle' ||
    previewMode === 'hairColor' ||
    previewMode === 'expression' ||
    previewMode === 'skin' ||
    previewMode === 'accessory' ||
    previewMode === 'face' ||
    previewMode === 'head';

  const viewBox = isFaceZoom ? '35 35 130 115' : '0 0 200 240';

  const key = JSON.stringify(currentConfig ?? {}) + viewBox;
  const svg = useMemo(
    () => buildGameAvatarSvg(currentConfig, undefined, undefined, viewBox, idPrefix),
    [key, idPrefix]
  );

  // パーツ変更時のキラキラポップ演出
  useEffect(() => {
    if (!sparkleTrigger) return;
    setSparkling(true);
    const timer = window.setTimeout(() => setSparkling(false), 450);
    return () => window.clearTimeout(timer);
  }, [sparkleTrigger]);

  const handleTap = () => {
    if (!interactive || jumping) return;
    sound.pop();
    setJumping(true);
    window.setTimeout(() => setJumping(false), 600);
  };

  const actualWidth = width ?? size;
  const actualHeight = height ?? (width ? undefined : isFaceZoom ? Math.round((size * 115) / 130) : Math.round((size * 240) / 200));

  return (
    <div
      onClick={handleTap}
      className={`shrink-0 overflow-hidden bg-white select-none transition-transform ${rounded} ${className} ${
        jumping ? 'animate-rpg-jump' : sparkling ? 'animate-dressup-pop' : 'animate-rpg-idle'
      } ${interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
      style={{
        width: actualWidth,
        height: actualHeight,
        aspectRatio: isFaceZoom ? '130 / 115' : '200 / 240',
      }}
      title={interactive ? 'タップして ジャンプ！✨' : undefined}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// 既存コードとの完全互換用
export const Avatar = GameAvatar2D;
