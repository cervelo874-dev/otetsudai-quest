import React, { useEffect, useState } from 'react';

export type GachaIconType =
  | 'box_closed'   // Row 0, Col 0: 閉じたロイヤル・ジュエリーボックス＋黄金の鍵
  | 'box_open'     // Row 0, Col 1: 開いて虹色の光が溢れるジュエリーボックス
  | 'star_jewel'   // Row 0, Col 2: スタージュエル（ほしのかけら・交換結晶）
  | 'orb_r1'       // Row 1, Col 0: ★1 サファイア・ジュエルオーブ（青）
  | 'orb_r2'       // Row 1, Col 1: ★2 ロイヤルゴールド・ジュエルオーブ（金・王冠羽根）
  | 'orb_r3'       // Row 1, Col 2: ★3 プリズムレインボー・ジュエルオーブ（虹・天使羽根）
  | 'orb_blue'
  | 'orb_gold'
  | 'orb_rainbow';

const GRID_COORDS: Record<GachaIconType, { col: number; row: number }> = {
  box_closed: { col: 0, row: 0 },
  box_open: { col: 1, row: 0 },
  star_jewel: { col: 2, row: 0 },
  orb_r1: { col: 0, row: 1 },
  orb_r2: { col: 1, row: 1 },
  orb_r3: { col: 2, row: 1 },
  orb_blue: { col: 0, row: 1 },
  orb_gold: { col: 1, row: 1 },
  orb_rainbow: { col: 2, row: 1 },
};

const SHEET_SRC = '/gacha_icons_sheet.jpg';
const slicedCache = new Map<GachaIconType, string>();
let slicingPromise: Promise<void> | null = null;
const subscribers = new Set<() => void>();

/**
 * スプライトシート（3x2）から各アイコンを切り出し、
 * 四隅からのフラッドフィルで外側背景の白（#FFFFFF）のみを綺麗に透過処理する
 * （宝石内部の白いハイライトやキラキラは輪郭に守られるため100%保持される）
 */
function ensureSlicedIcons(): Promise<void> {
  if (slicedCache.size === 6) return Promise.resolve();
  if (slicingPromise) return slicingPromise;

  slicingPromise = new Promise<void>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const cellW = Math.floor(img.naturalWidth / 3);
        const cellH = Math.floor(img.naturalHeight / 2);

        (Object.keys(GRID_COORDS) as GachaIconType[]).forEach((type) => {
          const { col, row } = GRID_COORDS[type];
          const canvas = document.createElement('canvas');
          canvas.width = cellW;
          canvas.height = cellH;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) return;

          ctx.drawImage(
            img,
            col * cellW,
            row * cellH,
            cellW,
            cellH,
            0,
            0,
            cellW,
            cellH,
          );

          const imgData = ctx.getImageData(0, 0, cellW, cellH);
          const data = imgData.data;
          const visited = new Uint8Array(cellW * cellH);
          const queue = new Int32Array(cellW * cellH);
          let head = 0;
          let tail = 0;

          const isOuterWhite = (idx: number): boolean => {
            const p = idx * 4;
            const r = data[p];
            const g = data[p + 1];
            const b = data[p + 2];
            // 白背景判定（わずかなJPEGノイズも吸収）
            return r >= 242 && g >= 242 && b >= 242;
          };

          const push = (x: number, y: number) => {
            if (x < 0 || x >= cellW || y < 0 || y >= cellH) return;
            const idx = y * cellW + x;
            if (visited[idx]) return;
            if (isOuterWhite(idx)) {
              visited[idx] = 1;
              queue[tail++] = idx;
            }
          };

          // 外周4辺からシードを投入
          for (let x = 0; x < cellW; x++) {
            push(x, 0);
            push(x, cellH - 1);
          }
          for (let y = 0; y < cellH; y++) {
            push(0, y);
            push(cellW - 1, y);
          }

          while (head < tail) {
            const idx = queue[head++];
            const p = idx * 4;
            data[p + 3] = 0; // 完全透過

            const x = idx % cellW;
            const y = (idx - x) / cellW;
            push(x - 1, y);
            push(x + 1, y);
            push(x, y - 1);
            push(x, y + 1);
          }

          // 境界の1〜2pxをソフトになじませるエッジフェザー処理
          for (let y = 1; y < cellH - 1; y++) {
            for (let x = 1; x < cellW - 1; x++) {
              const idx = y * cellW + x;
              if (visited[idx]) continue;
              const nTransparent =
                visited[idx - 1] +
                visited[idx + 1] +
                visited[idx - cellW] +
                visited[idx + cellW];
              if (nTransparent > 0) {
                const p = idx * 4;
                const r = data[p];
                const g = data[p + 1];
                const b = data[p + 2];
                const brightness = (r + g + b) / 3;
                if (brightness > 230) {
                  data[p + 3] = Math.round(data[p + 3] * 0.45);
                } else if (brightness > 215) {
                  data[p + 3] = Math.round(data[p + 3] * 0.78);
                }
              }
            }
          }

          ctx.putImageData(imgData, 0, 0);
          slicedCache.set(type, canvas.toDataURL('image/png'));
        });
      } catch (e) {
        console.warn('Gacha icon sheet slice fallback:', e);
      }
      subscribers.forEach((fn) => fn());
      resolve();
    };
    img.onerror = () => resolve();
    img.src = SHEET_SRC;
  });

  return slicingPromise;
}

export interface GachaIconProps {
  type: GachaIconType;
  size?: number | string;
  className?: string;
  alt?: string;
}

export const GachaIcon: React.FC<GachaIconProps> = ({
  type,
  size = 48,
  className = '',
  alt = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string | undefined>(() =>
    slicedCache.get(type),
  );

  useEffect(() => {
    if (slicedCache.has(type)) {
      setDataUrl(slicedCache.get(type));
      return;
    }
    const update = () => {
      if (slicedCache.has(type)) {
        setDataUrl(slicedCache.get(type));
      }
    };
    subscribers.add(update);
    void ensureSlicedIcons();
    return () => {
      subscribers.delete(update);
    };
  }, [type]);

  const { col, row } = GRID_COORDS[type];
  const dimStyle =
    typeof size === 'number'
      ? { width: `${size}px`, height: `${size}px` }
      : { width: size, height: size };

  if (dataUrl) {
    return (
      <img
        src={dataUrl}
        alt={alt}
        draggable={false}
        style={dimStyle}
        className={`select-none object-contain pointer-events-none ${className}`}
      />
    );
  }

  // 初回デコード完了までの数ミリ秒用CSSスプライトフォールバック
  const bgPosX = col === 0 ? '0%' : col === 1 ? '50%' : '100%';
  const bgPosY = row === 0 ? '0%' : '100%';

  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        ...dimStyle,
        backgroundImage: `url(${SHEET_SRC})`,
        backgroundSize: '300% 200%',
        backgroundPosition: `${bgPosX} ${bgPosY}`,
        backgroundRepeat: 'no-repeat',
      }}
      className={`select-none shrink-0 pointer-events-none rounded-xl ${className}`}
    />
  );
};
