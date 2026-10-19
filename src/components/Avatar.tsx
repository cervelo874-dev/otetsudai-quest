import { memo, useMemo, useState, useEffect } from 'react';
import type { AvatarConfig, AvatarSlot, Child, ChildAvatarStudio } from '../types';
import { sound } from '../sound';
import {
  AvatarRenderer,
  resolveChildEquippedParts,
  usePartCatalog,
  type EquippedParts,
} from '../features/avatar';

export const GameAvatar2D = memo(function GameAvatar2D({
  child,
  avatarStudio,
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
  child?: Child | null;
  avatarStudio?: ChildAvatarStudio | null;
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

  // 親画面のアバター工房で登録されたパーツ一覧を自動購読
  const { parts: catalogParts } = usePartCatalog();

  // 子どものアバター設定データを取得
  const targetStudio = child?.avatarStudio ?? avatarStudio;

  // 顔まわりのズーム判定
  const isFaceZoom =
    previewMode === 'hairStyle' ||
    previewMode === 'hairColor' ||
    previewMode === 'expression' ||
    previewMode === 'skin' ||
    previewMode === 'accessory' ||
    previewMode === 'face' ||
    previewMode === 'head';

  // 18レイヤーの装備パーツ一式を解決
  const equippedParts: EquippedParts = useMemo(() => {
    return resolveChildEquippedParts(targetStudio ?? undefined, catalogParts);
  }, [targetStudio, catalogParts]);

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
  const actualHeight = height ?? actualWidth;

  return (
    <div
      onClick={handleTap}
      className={`relative shrink-0 overflow-hidden bg-white/40 select-none transition-transform ${rounded} ${className} ${
        jumping ? 'animate-rpg-jump' : sparkling ? 'animate-dressup-pop' : 'animate-rpg-idle'
      } ${interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
      style={{
        width: actualWidth,
        height: actualHeight,
        aspectRatio: '1 / 1',
      }}
      title={interactive ? 'タップして ジャンプ！✨' : undefined}
    >
      <AvatarRenderer
        equippedParts={equippedParts}
        adjustments={targetStudio?.adjustments}
        size="full"
        animate={true}
        faceOnly={isFaceZoom}
      />
    </div>
  );
});

// 既存コードとの完全互換用
export const Avatar = GameAvatar2D;

