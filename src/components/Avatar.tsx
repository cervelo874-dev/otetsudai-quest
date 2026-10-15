import { useMemo, useState, useEffect } from 'react';
import type { AvatarConfig, AvatarSlot } from '../types';
import { findAsset, getDicebearAvatarSvg, getTwemojiUrl, AVATAR_ASSET_CATALOG } from '../avatar';
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

  // 各パーツのアセット情報をカタログから取得
  const bgItem = useMemo(() => findAsset(currentConfig?.bg ?? 'sky'), [currentConfig?.bg]);
  const accItem = useMemo(() => findAsset(currentConfig?.accessory ?? 'acc_none'), [currentConfig?.accessory]);
  const outfitItem = useMemo(() => findAsset(currentConfig?.outfit ?? 'overall'), [currentConfig?.outfit]);
  const wpItem = useMemo(() => findAsset(currentConfig?.weapon ?? 'wp_none'), [currentConfig?.weapon]);
  const petItem = useMemo(() => findAsset(currentConfig?.pet ?? 'pet_none'), [currentConfig?.pet]);

  const stage = bgItem?.stageConfig ?? AVATAR_ASSET_CATALOG.find((x) => x.id === 'sky')!.stageConfig!;

  // DiceBear Adventurer SVG本体の生成（キャッシュ利用で同期・高速）
  const dicebearSvg = useMemo(() => {
    return getDicebearAvatarSvg(currentConfig);
  }, [
    currentConfig?.skin,
    currentConfig?.hairStyle,
    currentConfig?.hairColor,
    currentConfig?.expression,
  ]);

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
  const actualHeight =
    height ??
    (width
      ? undefined
      : isFaceZoom
      ? Math.round((size * 115) / 130)
      : Math.round((size * 240) / 200));

  return (
    <div
      onClick={handleTap}
      className={`shrink-0 relative overflow-hidden select-none transition-transform shadow-inner ${rounded} ${className} ${
        jumping ? 'animate-rpg-jump' : sparkling ? 'animate-dressup-pop' : 'animate-rpg-idle'
      } ${interactive ? 'cursor-pointer hover:scale-105 active:scale-95' : ''}`}
      style={{
        width: actualWidth,
        height: actualHeight,
        aspectRatio: isFaceZoom ? '130 / 115' : '200 / 240',
        background: stage.gradient,
      }}
      title={interactive ? 'タップして ジャンプ！✨' : undefined}
    >
      {/* ---------------- 1. 背景ステージ（多層風景 Twemoji ＋ CSS アニメーション） ---------------- */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {stage.particles.map((p, idx) => (
          <img
            key={idx}
            src={getTwemojiUrl(p.code)}
            alt=""
            loading="lazy"
            decoding="async"
            className={`absolute select-none pointer-events-none transition-transform opacity-80 ${
              p.anim === 'float'
                ? 'animate-weapon-float'
                : p.anim === 'pulse'
                ? 'animate-pulse'
                : p.anim === 'drift'
                ? 'animate-star-drift'
                : ''
            }`}
            style={{
              left: `${(p.x / 200) * 100}%`,
              top: `${(p.y / 240) * 100}%`,
              width: `${(p.size / 200) * 100}%`,
              height: `${(p.size / 200) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        ))}
      </div>

      {/* ---------------- 2. ズーム制御コンテナ ---------------- */}
      <div
        className="absolute inset-0 transition-transform duration-300"
        style={{
          transform: isFaceZoom ? 'scale(1.45) translateY(12%)' : 'scale(1)',
          transformOrigin: 'center center',
        }}
      >
        {/* ---------------- 3. ★3衣装オーラ（クリスタルアーマー等） ---------------- */}
        {outfitItem?.id === 'crystal_armor' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[85%] h-[85%] rounded-full bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-blue-400/30 blur-lg animate-pulse" />
            <img
              src={getTwemojiUrl('1f48e')}
              alt=""
              className="absolute right-3 top-24 w-8 h-8 animate-crystal-sparkle"
            />
            <img
              src={getTwemojiUrl('1f48e')}
              alt=""
              className="absolute left-3 top-28 w-6 h-6 animate-crystal-sparkle"
            />
          </div>
        )}

        {/* ---------------- 4. 相棒ペット（キャラの左隣・ぴょこぴょこ跳ねる） ---------------- */}
        {petItem && petItem.id !== 'pet_none' && petItem.twemojiCode && petItem.transform && (
          <div
            className="absolute z-20 pointer-events-none animate-pet-bounce"
            style={{
              left: `${(petItem.transform.x / 200) * 100}%`,
              top: `${(petItem.transform.y / 240) * 100}%`,
              width: `${(petItem.transform.size / 200) * 100}%`,
              height: `${(petItem.transform.size / 200) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* ペット影 */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4/5 h-2 bg-black/20 rounded-full blur-[1px]" />
            <img
              src={getTwemojiUrl(petItem.twemojiCode)}
              alt={petItem.name}
              className="w-full h-full object-contain filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]"
            />
            {petItem.subEffectCode && (
              <img
                src={getTwemojiUrl(petItem.subEffectCode)}
                alt=""
                className="absolute -top-2 -right-1 w-1/2 h-1/2 animate-pulse"
              />
            )}
          </div>
        )}

        {/* ---------------- 5. DiceBear Adventurer キャラクター本体 ---------------- */}
        <div
          className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
          style={{
            top: '-2%',
          }}
          dangerouslySetInnerHTML={{
            __html: dicebearSvg
              .replace(/width="[^"]*"/, 'width="82%"')
              .replace(/height="[^"]*"/, 'height="82%"'),
          }}
        />

        {/* ---------------- 6. 衣装モチーフバッジ＆フレーム装飾 ---------------- */}
        {outfitItem?.outfitTheme && (
          <div className="absolute z-35 pointer-events-none" style={{ left: '50%', top: '78%', transform: 'translate(-50%, -50%)' }}>
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-md"
              style={{ backgroundColor: outfitItem.outfitTheme.primaryColor }}
            >
              <img
                src={getTwemojiUrl(outfitItem.outfitTheme.badgeCode)}
                alt=""
                className="w-5 h-5 object-contain"
              />
            </div>
          </div>
        )}

        {/* ---------------- 7. 頭装備（キャラの頭上にジャストフィット ＋ 浮遊感） ---------------- */}
        {accItem && accItem.id !== 'acc_none' && accItem.twemojiCode && accItem.transform && (
          <div
            className="absolute z-40 pointer-events-none animate-head-float"
            style={{
              left: `${(accItem.transform.x / 200) * 100}%`,
              top: `${(accItem.transform.y / 240) * 100}%`,
              width: `${(accItem.transform.size / 200) * 100}%`,
              height: `${(accItem.transform.size / 200) * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <img
              src={getTwemojiUrl(accItem.twemojiCode)}
              alt={accItem.name}
              className="w-full h-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.35)]"
            />
            {accItem.subEffectCode && (
              <img
                src={getTwemojiUrl(accItem.subEffectCode)}
                alt=""
                className="absolute -top-3 -right-2 w-1/2 h-1/2 animate-pulse filter drop-shadow"
              />
            )}
          </div>
        )}

        {/* ---------------- 8. もちもの・武器（キャラの右手側 ＋ ふわふわスイング浮遊） ---------------- */}
        {wpItem && wpItem.id !== 'wp_none' && wpItem.twemojiCode && wpItem.transform && (
          <div
            className="absolute z-50 pointer-events-none animate-weapon-float"
            style={{
              left: `${(wpItem.transform.x / 200) * 100}%`,
              top: `${(wpItem.transform.y / 240) * 100}%`,
              width: `${(wpItem.transform.size / 200) * 100}%`,
              height: `${(wpItem.transform.size / 200) * 100}%`,
              transform: `translate(-50%, -50%) rotate(${wpItem.transform.rotation ?? 0}deg)`,
            }}
          >
            <img
              src={getTwemojiUrl(wpItem.twemojiCode)}
              alt={wpItem.name}
              className="w-full h-full object-contain filter drop-shadow-[0_6px_10px_rgba(0,0,0,0.4)]"
            />
            {wpItem.subEffectCode && (
              <img
                src={getTwemojiUrl(wpItem.subEffectCode)}
                alt=""
                className="absolute -top-3 -left-2 w-1/2 h-1/2 animate-pulse"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 既存コードとの完全互換用
export const Avatar = GameAvatar2D;
