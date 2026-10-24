import { useCallback, useEffect, useState } from 'react';
import { Shirt, Wand2, Sparkles } from 'lucide-react';
import {
  AvatarCloset,
  AvatarRenderer,
  createEmptyEquippedMap,
  normalizeEquippedParts,
  toEquippedIdMap,
  PartCalibrationStudio,
  usePartCatalog,
  PRESET_BODY,
  type AvatarCategory,
  type AvatarPart,
  type EquippedPartMap,
  type LayerAdjustmentMap,
} from '../features/avatar';
import { toast } from './ui';
import { sound } from '../sound';
import { updateAllChildrenAvatarBody } from '../actions';
import { GachaAdminStudio } from './GachaAdminStudio';
import { GachaIcon } from './GachaIcons';

type StudioSectionView = 'studio' | 'closet' | 'gacha';

const PARENT_STUDIO_EQUIPPED_KEY = 'mobage_avatar_current_equipped_v2';
const PARENT_STUDIO_ADJUSTMENTS_KEY = 'mobage_avatar_current_adjustments_v2';

function loadSavedEquipped(catalogParts: AvatarPart[] = []): EquippedPartMap {
  try {
    const raw = localStorage.getItem(PARENT_STUDIO_EQUIPPED_KEY);
    const base: EquippedPartMap = { ...createEmptyEquippedMap(), body: PRESET_BODY };
    if (!raw) return base;
    const parsed = JSON.parse(raw);
    return normalizeEquippedParts(parsed, catalogParts);
  } catch {
    return { ...createEmptyEquippedMap(), body: PRESET_BODY };
  }
}


function loadSavedAdjustments(): LayerAdjustmentMap {
  try {
    const raw = localStorage.getItem(PARENT_STUDIO_ADJUSTMENTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as LayerAdjustmentMap;
  } catch {
    return {};
  }
}

export function AvatarStudioSection() {
  // ブラウザ内カタログ（IndexedDB / LocalStorage）
  const { parts, customParts, duplicatePart, deletePart } = usePartCatalog();

  // プレビュー・ガイド用の装備状態
  const [equippedParts, setEquippedParts] = useState<EquippedPartMap>(() => loadSavedEquipped());
  const [adjustments, setAdjustments] = useState<LayerAdjustmentMap>(loadSavedAdjustments);

  // カタログパーツが非同期でロード完了した際、保存されていたIDから完全なパーツオブジェクトを再照合して復元
  useEffect(() => {
    if (parts.length > 0) {
      setEquippedParts((prev) => normalizeEquippedParts(prev, parts));
    }
  }, [parts]);

  // 表示画面切り替え（初期表示は「スタジオ」）
  const [view, setView] = useState<StudioSectionView>('studio');

  // スタジオで選択する初期カテゴリ（服の上に合わせられるよう初期はトップス）
  const [studioCategory, setStudioCategory] = useState<AvatarCategory>('tops');

  // クローゼットから「スタジオで再編集」が指定された既存パーツ
  const [studioEditPart, setStudioEditPart] = useState<AvatarPart | null>(null);

  // スタジオから「登録してクローゼットで試着」した際の一時試着パーツ
  const [tryOnPart, setTryOnPart] = useState<AvatarPart | null>(null);

  useEffect(() => {
    try {
      // LocalStorageには画像Base64ではなく軽量なパーツIDマップを保存（容量上限エラーを防止）
      const idMap = toEquippedIdMap(equippedParts);
      localStorage.setItem(PARENT_STUDIO_EQUIPPED_KEY, JSON.stringify(idMap));
    } catch {
      // ignore
    }
  }, [equippedParts]);

  useEffect(() => {
    try {
      localStorage.setItem(PARENT_STUDIO_ADJUSTMENTS_KEY, JSON.stringify(adjustments));
    } catch {
      // ignore
    }
  }, [adjustments]);

  // クローゼットで「保存して決定」が押された時（工房の装備・位置調整のみ保存し、子どものアバターには影響させない）
  const handleSaveEquipped = useCallback(
    (newEquipped: EquippedPartMap, newAdjustments: LayerAdjustmentMap) => {
      setEquippedParts(newEquipped);
      setAdjustments(newAdjustments);
      setTryOnPart(null);

      sound.fanfare();
      toast('工房のアバター（装備・位置調整）を保存しました！✨', '🎉');
    },
    [],
  );

  // スタジオで新規パーツ登録が完了したとき
  const handlePartRegistered = useCallback(
    (part: AvatarPart, options: { openClosetToTryOn: boolean }) => {
      sound.fanfare();
      // もし登録したパーツが素体（body）なら、子どものアバター素体にも自動反映！
      if (part.category === 'body') {
        updateAllChildrenAvatarBody(part.id);
        setEquippedParts((prev) => ({ ...prev, body: part }));
        toast(`素体「${part.name}」を登録し、子どものアバターにも反映しました！✨`, '🎉');
      } else {
        toast(`「${part.name}」をカタログに登録しました！子どもの着せ替えでも使えます✨`, '🎉');
      }
      if (options.openClosetToTryOn) {
        setTryOnPart(part);
        setView('closet');
      }
    },
    [],
  );

  // クローゼットから「新規作成」へジャンプ
  const handleOpenStudioForCategory = useCallback((category: AvatarCategory) => {
    setStudioCategory(category);
    setStudioEditPart(null);
    setView('studio');
  }, []);

  // クローゼットから登録済みパーツの「スタジオで再編集」へジャンプ
  const handleEditPartInStudio = useCallback((part: AvatarPart) => {
    setStudioCategory(part.category);
    setStudioEditPart(part);
    setView('studio');
  }, []);

  const handleClearStudioEditPart = useCallback(() => {
    setStudioEditPart(null);
  }, []);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      {/* ===== スマホ用ミニマルヘッダー (md:hidden) ===== */}
      <div className="flex md:hidden flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AvatarRenderer
              equippedParts={equippedParts}
              adjustments={adjustments}
              size={36}
              faceOnly
              animate
              className="avatar-checker ring-1 ring-zinc-200 shadow-xs rounded-full shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-zinc-900 truncate">
                  アバター工房
                </h2>
                <span className="rounded-full bg-zinc-100 px-1.5 py-0.2 text-[9px] font-medium text-zinc-500 border border-zinc-200/60 shrink-0">
                  親モード
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 truncate">
                AI画像取込・パーツ作成＆きせかえ
              </p>
            </div>
          </div>
        </div>

        {/* スマホ用3タブ切り替え */}
        <nav className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 border border-zinc-200/60">
          <button
            type="button"
            onClick={() => setView('studio')}
            className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition ${
              view === 'studio'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5 text-indigo-600" />
            <span>パーツ制作</span>
          </button>
          <button
            type="button"
            onClick={() => setView('closet')}
            className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition ${
              view === 'closet'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Shirt className="h-3.5 w-3.5 text-amber-600" />
            <span>クローゼット</span>
          </button>
          <button
            type="button"
            onClick={() => setView('gacha')}
            className={`flex items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold transition ${
              view === 'gacha'
                ? 'bg-white text-zinc-900 shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <GachaIcon type="box_closed" size={16} />
            <span>ガチャ管理</span>
          </button>
        </nav>
      </div>

      {/* ===== PC・タブレット用ヘッダー（既存UIそのまま維持） (hidden md:flex) ===== */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-sm">
        <div className="flex items-center gap-3">
          <AvatarRenderer
            equippedParts={equippedParts}
            adjustments={adjustments}
            size={40}
            faceOnly
            animate
            className="avatar-checker ring-1 ring-zinc-200 shadow-sm rounded-full"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-zinc-900">
                アバター制作工房（スタジオ）
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 border border-zinc-200/60">
                親専用モード
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              AI生成画像やイラストを取り込んで登録できます。ガチャ限定化や★3フルコーデ設定も管理できます！
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex items-center rounded-lg bg-zinc-100 p-1 border border-zinc-200/70">
            <button
              type="button"
              onClick={() => setView('studio')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === 'studio'
                  ? 'bg-white text-zinc-900 shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>パーツ制作スタジオ</span>
            </button>

            <button
              type="button"
              onClick={() => setView('closet')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === 'closet'
                  ? 'bg-white text-zinc-900 shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Shirt className="h-3.5 w-3.5" />
              <span>クローゼット確認</span>
              <span className="rounded-full bg-zinc-200/70 px-1.5 py-0.2 text-[10px] font-semibold text-zinc-700">
                {parts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setView('gacha')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === 'gacha'
                  ? 'bg-white text-zinc-900 shadow-sm font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <GachaIcon type="box_closed" size={16} />
              <span>ガチャ運営スタジオ</span>
            </button>
          </nav>
        </div>
      </div>

      {/* メイン制作・調整画面（開発したコンポーネントをそのまま描画） */}
      <div>
        {view === 'gacha' ? (
          <GachaAdminStudio parts={parts} />
        ) : view === 'closet' ? (
          <AvatarCloset
            ownedParts={parts}
            equippedParts={equippedParts}
            adjustments={adjustments}
            initialTryOnPart={tryOnPart}
            onSave={handleSaveEquipped}
            onOpenStudioForCategory={handleOpenStudioForCategory}
            onEditPartInStudio={handleEditPartInStudio}
            onDuplicatePart={duplicatePart}
            onDeletePart={deletePart}
          />
        ) : (
          <PartCalibrationStudio
            guideParts={equippedParts}
            guideAdjustments={adjustments}
            defaultCategory={studioCategory}
            initialEditPart={studioEditPart}
            onClearInitialEditPart={handleClearStudioEditPart}
            onPartRegistered={handlePartRegistered}
          />
        )}
      </div>
    </div>
  );
}
