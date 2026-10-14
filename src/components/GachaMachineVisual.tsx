import React from 'react';

export interface GachaMachineVisualProps {
  size?: 'sm' | 'md' | 'lg';
  isSpinning?: boolean;
  isFree?: boolean;
  onClick?: () => void;
  showHandlePrompt?: boolean;
  className?: string;
}

export const GachaMachineVisual: React.FC<GachaMachineVisualProps> = ({
  size = 'md',
  isSpinning = false,
  isFree = false,
  onClick,
  showHandlePrompt = false,
  className = '',
}) => {
  // サイズ別スケール
  const dimensions = {
    sm: { width: 100, height: 130 },
    md: { width: 150, height: 195 },
    lg: { width: 220, height: 285 },
  }[size];

  return (
    <div
      onClick={onClick}
      className={`relative select-none flex flex-col items-center group transition-transform ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
      style={{ width: dimensions.width, height: dimensions.height }}
    >
      {/* 1. 無料バッジ・ポップアップ看板 */}
      {isFree && (
        <div className="absolute -top-3 z-30 flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 px-2.5 py-0.5 text-[10px] sm:text-xs font-black text-white shadow-lg animate-bounce border-2 border-white">
          <span>✨</span>
          <span>むりょう！</span>
        </div>
      )}

      {!isFree && showHandlePrompt && (
        <div className="absolute -top-3 z-30 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] sm:text-xs font-black text-amber-950 shadow-md animate-pulse border-2 border-white">
          <span>👇</span>
          <span>まわしてね！</span>
        </div>
      )}

      {/* 2. ガチャ本体 SVG */}
      <svg
        viewBox="0 0 200 260"
        className="w-full h-full drop-shadow-xl overflow-visible"
      >
        <defs>
          {/* アニメーション用CSS（SVG内で安全に原点基準で回転・微振動させる） */}
          <style>{`
            @keyframes gachaCapsuleJitter {
              0% { transform: translate(0px, 0px) rotate(0deg); }
              25% { transform: translate(-1.5px, 1.5px) rotate(-1.5deg); }
              50% { transform: translate(1.5px, -1px) rotate(1deg); }
              75% { transform: translate(-1px, -1.5px) rotate(-0.5deg); }
              100% { transform: translate(0px, 0px) rotate(0deg); }
            }
            @keyframes gachaHandleSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .capsule-shake {
              animation: gachaCapsuleJitter 0.12s linear infinite;
              transform-origin: 100px 85px;
            }
            .handle-spin-clean {
              animation: gachaHandleSpin 0.35s linear infinite;
              transform-origin: 0px 0px;
            }
          `}</style>

          {/* ドーム内側クリップ（カプセルが絶対にドーム外にはみ出さない） */}
          <clipPath id="domeClip">
            <ellipse cx="100" cy="85" rx="66" ry="54" />
          </clipPath>

          {/* ドームのガラス質感 */}
          <radialGradient id="glassGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="40%" stopColor="#e0f2fe" stopOpacity="0.4" />
            <stop offset="85%" stopColor="#bae6fd" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.5" />
          </radialGradient>

          {/* ドーム反射ハイライト */}
          <linearGradient id="glassReflection" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* 本体のメタリック赤グラデーション */}
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="25%" stopColor="#ef4444" />
            <stop offset="70%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>

          {/* ハンドルメタリック銀グラデーション */}
          <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="40%" stopColor="#cbd5e1" />
            <stop offset="80%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>

          {/* カプセル用グラデーション (赤・黄・青・緑・紫・金) */}
          <radialGradient id="capRed" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#ef4444" />
          </radialGradient>
          <radialGradient id="capBlue" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#93c5fd" />
            <stop offset="100%" stopColor="#3b82f6" />
          </radialGradient>
          <radialGradient id="capYellow" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#eab308" />
          </radialGradient>
          <radialGradient id="capGreen" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="100%" stopColor="#22c55e" />
          </radialGradient>
          <radialGradient id="capPurple" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#d8b4fe" />
            <stop offset="100%" stopColor="#a855f7" />
          </radialGradient>
          <radialGradient id="capGold" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#ca8a04" />
          </radialGradient>
          <radialGradient id="capWhite" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </radialGradient>

          {/* 影 */}
          <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* ---------------- 1. マシンの屋根・看板POP ---------------- */}
        <g id="roof">
          {/* ベースの屋根 */}
          <path
            d="M 30,35 Q 100,10 170,35 L 165,48 Q 100,28 35,48 Z"
            fill="#b91c1c"
          />
          <path
            d="M 35,33 Q 100,12 165,33 L 160,42 Q 100,24 40,42 Z"
            fill="#f87171"
          />
          {/* 看板プレート */}
          <rect
            x="50"
            y="12"
            width="100"
            height="22"
            rx="6"
            fill="#fef08a"
            stroke="#ca8a04"
            strokeWidth="2.5"
            filter="url(#shadow)"
          />
          <text
            x="100"
            y="28"
            textAnchor="middle"
            fill="#854d0e"
            fontSize="13"
            fontWeight="900"
            fontFamily="sans-serif"
            letterSpacing="2"
          >
            ★ GACHA ★
          </text>
        </g>

        {/* ---------------- 2. 透明カプセルドーム ---------------- */}
        <g id="dome">
          {/* ドーム背景影 */}
          <ellipse cx="100" cy="85" rx="68" ry="58" fill="#e0f2fe" opacity="0.3" />

          {/* ドーム内カプセル群（clipPathでドーム内に完全固定し、はみ出しを防止） */}
          <g clipPath="url(#domeClip)">
            <g className={isSpinning ? 'capsule-shake' : ''}>
              {/* 奥のカプセルたち */}
              {/* 青カプセル */}
              <g transform="translate(62, 68) rotate(-15)">
                <circle cx="0" cy="0" r="14" fill="url(#capBlue)" />
                <path d="M -14,0 A 14,14 0 0,0 14,0 Z" fill="url(#capWhite)" opacity="0.9" />
                <line x1="-14" y1="0" x2="14" y2="0" stroke="#64748b" strokeWidth="0.8" />
              </g>
              {/* 赤カプセル */}
              <g transform="translate(138, 70) rotate(25)">
                <circle cx="0" cy="0" r="13" fill="url(#capRed)" />
                <path d="M -13,0 A 13,13 0 0,0 13,0 Z" fill="url(#capWhite)" opacity="0.9" />
                <line x1="-13" y1="0" x2="13" y2="0" stroke="#64748b" strokeWidth="0.8" />
              </g>
              {/* 黄色カプセル */}
              <g transform="translate(100, 60) rotate(45)">
                <circle cx="0" cy="0" r="13.5" fill="url(#capYellow)" />
                <path d="M -13.5,0 A 13.5,13.5 0 0,0 13.5,0 Z" fill="url(#capWhite)" opacity="0.9" />
                <line x1="-13.5" y1="0" x2="13.5" y2="0" stroke="#64748b" strokeWidth="0.8" />
              </g>
              {/* 紫カプセル */}
              <g transform="translate(75, 92) rotate(-30)">
                <circle cx="0" cy="0" r="14" fill="url(#capPurple)" />
                <path d="M -14,0 A 14,14 0 0,0 14,0 Z" fill="url(#capWhite)" opacity="0.9" />
                <line x1="-14" y1="0" x2="14" y2="0" stroke="#64748b" strokeWidth="0.8" />
              </g>
              {/* 緑カプセル */}
              <g transform="translate(125, 95) rotate(10)">
                <circle cx="0" cy="0" r="14" fill="url(#capGreen)" />
                <path d="M -14,0 A 14,14 0 0,0 14,0 Z" fill="url(#capWhite)" opacity="0.9" />
                <line x1="-14" y1="0" x2="14" y2="0" stroke="#64748b" strokeWidth="0.8" />
              </g>
              {/* 🌟中央の手前カプセル（金のカプセル！！） */}
              <g transform="translate(100, 96) rotate(-10)">
                <circle cx="0" cy="0" r="16" fill="url(#capGold)" filter="url(#shadow)" />
                <path d="M -16,0 A 16,16 0 0,0 16,0 Z" fill="url(#capWhite)" opacity="0.85" />
                <line x1="-16" y1="0" x2="16" y2="0" stroke="#ca8a04" strokeWidth="1.2" />
                <text x="3" y="-2" fontSize="9" fill="#ffffff" fontWeight="bold">✨</text>
              </g>
              {/* 左手前カプセル */}
              <g transform="translate(52, 98) rotate(40)">
                <circle cx="0" cy="0" r="13" fill="url(#capRed)" />
                <path d="M -13,0 A 13,13 0 0,0 13,0 Z" fill="url(#capWhite)" opacity="0.9" />
                <line x1="-13" y1="0" x2="13" y2="0" stroke="#64748b" strokeWidth="0.8" />
              </g>
              {/* 右手前カプセル */}
              <g transform="translate(148, 96) rotate(-20)">
                <circle cx="0" cy="0" r="13" fill="url(#capBlue)" />
                <path d="M -13,0 A 13,13 0 0,0 13,0 Z" fill="url(#capWhite)" opacity="0.9" />
                <line x1="-13" y1="0" x2="13" y2="0" stroke="#64748b" strokeWidth="0.8" />
              </g>
            </g>
          </g>

          {/* ドームのクリアガラス表面＆艶 */}
          <ellipse
            cx="100"
            cy="85"
            rx="68"
            ry="58"
            fill="url(#glassGrad)"
            stroke="#bae6fd"
            strokeWidth="3.5"
            opacity="0.85"
          />
          {/* 左上の三日月型ハイライト光沢 */}
          <path
            d="M 50,50 Q 80,38 120,44 Q 85,55 60,75 Q 48,65 50,50 Z"
            fill="url(#glassReflection)"
          />
          {/* 右下の小さな反射光 */}
          <ellipse cx="145" cy="115" rx="12" ry="5" fill="#ffffff" opacity="0.35" transform="rotate(-30, 145, 115)" />
        </g>

        {/* ---------------- 3. マシン中間リング ---------------- */}
        <path
          d="M 28,125 Q 100,135 172,125 L 174,136 Q 100,146 26,136 Z"
          fill="#991b1b"
        />
        <path
          d="M 27,126 Q 100,134 173,126 L 171,132 Q 100,140 29,132 Z"
          fill="#fca5a5"
        />

        {/* ---------------- 4. マシン本体下部ボディ ---------------- */}
        <g id="body">
          {/* メインボックス */}
          <path
            d="M 30,132 L 26,245 Q 26,252 35,252 L 165,252 Q 174,252 174,245 L 170,132 Q 100,142 30,132 Z"
            fill="url(#bodyGrad)"
            stroke="#991b1b"
            strokeWidth="2.5"
            filter="url(#shadow)"
          />

          {/* 前面パネル（白いプレート部） */}
          <rect
            x="44"
            y="146"
            width="112"
            height="56"
            rx="10"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="2"
          />

          {/* コイン投入口 */}
          <g transform="translate(132, 162)">
            <circle cx="0" cy="0" r="10" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="7.5" fill="#cbd5e1" />
            <rect x="-1" y="-5" width="2" height="10" fill="#1e293b" rx="1" />
            <text x="0" y="16" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#64748b">
              100🪙
            </text>
          </g>

          {/* 価格・説明プレート */}
          <rect x="52" y="152" width="60" height="14" rx="4" fill="#fee2e2" stroke="#f87171" strokeWidth="1" />
          <text x="82" y="162" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#b91c1c">
            {isFree ? '★むりょう★' : '1かい 100🪙'}
          </text>

          {/* ---------------- 5. T字型回転ハンドル ---------------- */}
          {/* 親グループで (82, 182) に配置し、子グループで (0, 0) を原点にしてブレなく自転させる */}
          <g id="handle" transform="translate(82, 182)">
            <g className={isSpinning ? 'handle-spin-clean' : ''}>
              {/* ハンドル中央の丸軸座 */}
              <circle cx="0" cy="0" r="15" fill="#94a3b8" stroke="#475569" strokeWidth="1.5" filter="url(#shadow)" />
              <circle cx="0" cy="0" r="11" fill="url(#metalGrad)" />
              <circle cx="0" cy="0" r="6" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />

              {/* T字/十字バーの羽根 */}
              <rect x="-24" y="-4.5" width="48" height="9" rx="4.5" fill="url(#metalGrad)" stroke="#64748b" strokeWidth="1" />
              <rect x="-4.5" y="-18" width="9" height="22" rx="4.5" fill="url(#metalGrad)" stroke="#64748b" strokeWidth="1" />

              {/* ハンドルの突起つまみ */}
              <circle cx="-19" cy="0" r="3.5" fill="#e2e8f0" />
              <circle cx="19" cy="0" r="3.5" fill="#e2e8f0" />
              <circle cx="0" cy="-14" r="3.5" fill="#e2e8f0" />
              <circle cx="0" cy="0" r="2.5" fill="#475569" />
            </g>
          </g>

          {/* ---------------- 6. カプセル排出口ポケット ---------------- */}
          <g transform="translate(100, 222)">
            {/* 排出口の穴（黒い奥底） */}
            <rect
              x="-36"
              y="-12"
              width="72"
              height="28"
              rx="8"
              fill="#0f172a"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            {/* 取り出し口のフラップ（透明プラスチック扉） */}
            <path
              d="M -32,-8 L 32,-8 L 28,12 L -28,12 Z"
              fill="#94a3b8"
              opacity="0.35"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            {/* 指かけスリット */}
            <rect x="-10" y="3" width="20" height="3" rx="1.5" fill="#334155" />
            <text x="0" y="2" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#94a3b8" letterSpacing="1">
              PUSH
            </text>
          </g>

          {/* 脚部 */}
          <rect x="36" y="250" width="24" height="6" rx="2" fill="#334155" />
          <rect x="140" y="250" width="24" height="6" rx="2" fill="#334155" />
        </g>
      </svg>
    </div>
  );
};
