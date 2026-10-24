import { useMemo, useState } from 'react';
import {
  Lock,
  Unlock,
  Crown,
  Sliders,
  Plus,
  Trash2,
  Check,
  Flame,
  Package,
} from 'lucide-react';
import {
  CATEGORY_META,
  AvatarRenderer,
  createEmptyEquippedMap,
  PRESET_BODY,
  type AvatarCategory,
  type AvatarPart,
  type EquippedParts,
} from '../features/avatar';
import { useAppState } from '../store';
import {
  getEffectivePartGachaSetting,
  setGachaPartSetting,
  saveGachaCoordSet,
  deleteGachaCoordSet,
  updateGachaConfig,
} from '../actions';
import { DEFAULT_GACHA_CONFIG } from '../presets';
import type { GachaRarity, GachaCoordSet } from '../types';
import { GachaIcon } from './GachaIcons';
import { toast } from './ui';
import { sound } from '../sound';

interface GachaAdminStudioProps {
  parts: AvatarPart[];
}

type AdminTab = 'parts' | 'coord_sets' | 'settings';

export function GachaAdminStudio({ parts }: GachaAdminStudioProps) {
  const state = useAppState();
  const cfg = state.gachaConfig ?? DEFAULT_GACHA_CONFIG;

  const [tab, setTab] = useState<AdminTab>('parts');
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory | 'all'>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'gacha' | 'initial'>('all');

  // フルコーデセット作成・編集ステート
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [setName, setSetName] = useState('');
  const [setDesc, setSetDesc] = useState('');
  const [setPartIds, setSetPartIds] = useState<string[]>([]);
  const [setIsPickup, setSetIsPickup] = useState(true);

  // 素体(body)以外の着せ替えパーツを対象とする
  const dressupParts = useMemo(
    () => parts.filter((p) => p.category !== 'body'),
    [parts],
  );

  const bodyPart = useMemo(
    () => parts.find((p) => p.category === 'body') ?? PRESET_BODY,
    [parts],
  );

  // 統計集計
  const stats = useMemo(() => {
    let gachaTotal = 0;
    let ssr3 = 0;
    let sr2 = 0;
    let r1 = 0;
    for (const p of dressupParts) {
      const st = getEffectivePartGachaSetting(p, cfg);
      if (st.isGachaOnly) {
        gachaTotal++;
        if (st.rarity === 3) ssr3++;
        else if (st.rarity === 2) sr2++;
        else r1++;
      }
    }
    return {
      total: dressupParts.length,
      gachaTotal,
      initialTotal: dressupParts.length - gachaTotal,
      ssr3,
      sr2,
      r1,
      coordSetCount: cfg.coordSets?.length ?? 0,
    };
  }, [dressupParts, cfg]);

  const filteredParts = useMemo(() => {
    return dressupParts.filter((p) => {
      if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
      const st = getEffectivePartGachaSetting(p, cfg);
      if (filterMode === 'gacha' && !st.isGachaOnly) return false;
      if (filterMode === 'initial' && st.isGachaOnly) return false;
      return true;
    });
  }, [dressupParts, selectedCategory, filterMode, cfg]);

  // フルコーデセットのプレビュー用装備マップ
  const coordPreviewEquipped = useMemo<EquippedParts>(() => {
    const map: EquippedParts = { ...createEmptyEquippedMap(), body: bodyPart };
    const hands: AvatarPart[] = [];
    for (const pid of setPartIds) {
      const p = dressupParts.find((x) => x.id === pid);
      if (p) {
        map[p.category] = p;
        if (p.category === 'hand_item') hands.push(p);
      }
    }
    if (hands.length > 0) map.hand_items = hands;
    return map;
  }, [setPartIds, dressupParts, bodyPart]);

  const handleStartEditSet = (cs: GachaCoordSet) => {
    setEditingSetId(cs.id);
    setSetName(cs.name);
    setSetDesc(cs.description ?? '');
    setSetPartIds([...cs.partIds]);
    setSetIsPickup(Boolean(cs.isPickup));
  };

  const handleResetSetForm = () => {
    setEditingSetId(null);
    setSetName('');
    setSetDesc('');
    setSetPartIds([]);
    setSetIsPickup(true);
  };

  const handleTogglePartInSet = (part: AvatarPart) => {
    setSetPartIds((prev) => {
      if (prev.includes(part.id)) {
        return prev.filter((id) => id !== part.id);
      }
      // 同じカテゴリ（hand_item以外）のパーツが既に入っていれば入れ替える
      if (part.category !== 'hand_item') {
        const filtered = prev.filter((id) => {
          const existing = dressupParts.find((x) => x.id === id);
          return existing?.category !== part.category;
        });
        return [...filtered, part.id];
      }
      return [...prev, part.id];
    });
  };

  const handleSaveCoordSet = () => {
    if (!setName.trim()) {
      toast('フルコーデセットの名前を入力してください', '⚠️');
      return;
    }
    if (setPartIds.length < 2) {
      toast('2つ以上のパーツを選択してセットを作成してください', '⚠️');
      return;
    }
    for (const pid of setPartIds) {
      const p = dressupParts.find((x) => x.id === pid);
      if (p) {
        const st = getEffectivePartGachaSetting(p, cfg);
        if (!st.isGachaOnly) {
          setGachaPartSetting(pid, { isGachaOnly: true, rarity: 3 }, p);
        }
      }
    }
    saveGachaCoordSet({
      id: editingSetId ?? undefined,
      name: setName.trim(),
      description: setDesc.trim() || `${setPartIds.length}点フルコーデセット`,
      partIds: setPartIds,
      isPickup: setIsPickup,
    });
    sound.fanfare();
    toast(
      editingSetId
        ? `フルコーデ「${setName.trim()}」を更新しました！✨`
        : `★3フルコーデ「${setName.trim()}」をガチャ目玉に登録しました！👑`,
      '🎉',
    );
    handleResetSetForm();
  };

  const handleToggleShopTicket = (shopItemId: string) => {
    const current = cfg.enabledShopTicketIds ?? [];
    const next = current.includes(shopItemId)
      ? current.filter((id: string) => id !== shopItemId)
      : [...current, shopItemId];
    updateGachaConfig({
      enabledShopTicketIds: next,
    });
  };

  const nonBodyCategories = useMemo<AvatarCategory[]>(
    () => (Object.keys(CATEGORY_META) as AvatarCategory[]).filter((cat) => cat !== 'body'),
    [],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ===== トップサマリーカード ===== */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-4 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <GachaIcon type="box_open" size={52} className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-tight text-white">
                  ジュエルガチャ運営スタジオ
                </h3>
                <span className="rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                  親専用マネージャー
                </span>
              </div>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                自作パーツのガチャ限定化・レア度（★1〜★3）・★3フルコーデ一式排出・確率を自由にデザインできます
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-xs border border-white/15">
              <span className="text-indigo-200">ガチャ限定:</span>{' '}
              <strong className="text-sm font-black text-amber-300">{stats.gachaTotal}</strong>
              <span className="text-indigo-300 text-[11px]"> / {stats.total}個</span>
            </div>
            <div className="rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-xs border border-white/15 flex items-center gap-2">
              <span className="text-pink-300 font-bold">★3:{stats.ssr3}</span>
              <span className="text-amber-300 font-bold">★2:{stats.sr2}</span>
              <span className="text-sky-300 font-bold">★1:{stats.r1}</span>
            </div>
            <div className="rounded-xl bg-amber-500/20 px-3 py-1.5 border border-amber-400/30 text-amber-200 font-bold">
              👑 フルコーデ: {stats.coordSetCount}組
            </div>
          </div>
        </div>

        {/* サブタブ切り替え */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl bg-black/30 p-1 border border-white/10">
          <button
            type="button"
            onClick={() => setTab('parts')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition ${
              tab === 'parts'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-indigo-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Package className="h-3.5 w-3.5 text-indigo-500" />
            <span>① パーツ排出＆レア度</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('coord_sets')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition ${
              tab === 'coord_sets'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-indigo-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            <span>② ★3フルコーデ作成</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('settings')}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-2 text-xs font-bold transition ${
              tab === 'settings'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-indigo-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sliders className="h-3.5 w-3.5 text-emerald-500" />
            <span>③ 確率・チケット・天井</span>
          </button>
        </div>
      </div>

      {/* ===== タブ1: パーツ排出＆レア度管理 ===== */}
      {tab === 'parts' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-zinc-900">
                パーツごとの「初期所持 / ガチャ限定 🔒」＆レアリティ設定
              </h4>
              <p className="text-xs text-zinc-500">
                既存パーツはすべて「初期所持（すぐ着られる）」になっています。「🔒 ガチャ限定」に切り替えたパーツだけガチャ排出＆ロック対象になります。
              </p>
            </div>

            <div className="flex items-center gap-1.5 rounded-lg bg-zinc-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`rounded-md px-2.5 py-1 font-bold transition ${
                  filterMode === 'all' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-600'
                }`}
              >
                すべて ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('gacha')}
                className={`rounded-md px-2.5 py-1 font-bold transition ${
                  filterMode === 'gacha'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-zinc-600'
                }`}
              >
                🔒 ガチャ限定 ({stats.gachaTotal})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('initial')}
                className={`rounded-md px-2.5 py-1 font-bold transition ${
                  filterMode === 'initial'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-zinc-600'
                }`}
              >
                🔓 初期所持 ({stats.initialTotal})
              </button>
            </div>
          </div>

          {/* カテゴリフィルタ */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
                selectedCategory === 'all'
                  ? 'bg-zinc-900 text-white'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              全カテゴリ
            </button>
            {nonBodyCategories.map((catId) => (
              <button
                key={catId}
                type="button"
                onClick={() => setSelectedCategory(catId)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${
                  selectedCategory === catId
                    ? 'bg-zinc-900 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {CATEGORY_META[catId].label}
              </button>
            ))}
          </div>

          {filteredParts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 py-10 text-center text-xs text-zinc-400">
              該当する自作パーツがありません。パーツ制作スタジオでパーツを作成・登録するとここに表示されます。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredParts.map((part) => {
                const st = getEffectivePartGachaSetting(part, cfg);
                const catInfo = CATEGORY_META[part.category];

                return (
                  <div
                    key={part.id}
                    className={`flex flex-col justify-between gap-2.5 rounded-xl border p-3 transition ${
                      st.isGachaOnly
                        ? st.rarity === 3
                          ? 'border-pink-300 bg-gradient-to-br from-pink-50/70 via-white to-amber-50/50 shadow-xs'
                          : st.rarity === 2
                          ? 'border-amber-300 bg-gradient-to-br from-amber-50/60 to-white shadow-xs'
                          : 'border-sky-300 bg-gradient-to-br from-sky-50/50 to-white shadow-xs'
                        : 'border-zinc-200 bg-zinc-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-zinc-200 bg-white avatar-checker p-1">
                        <img
                          src={part.src}
                          alt={part.name}
                          className="h-full w-full object-contain"
                        />
                        {st.isGachaOnly && (
                          <span className="absolute top-0.5 right-0.5 rounded-full bg-indigo-900/90 p-1 text-white shadow-xs">
                            <Lock className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-zinc-200/80 px-1.5 py-0.5 text-[10px] font-bold text-zinc-700">
                            {catInfo?.label ?? part.category}
                          </span>
                          {st.isGachaOnly && st.isPickup && (
                            <span className="inline-flex items-center gap-0.5 rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                              <Flame className="h-2.5 w-2.5" /> PICKUP
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-sm font-bold text-zinc-900">
                          {part.name}
                        </p>
                        {/* 子どもたちの所持状況 */}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {state.children.map((ch) => {
                            const unlocked =
                              !st.isGachaOnly || ch.ownedItems.includes(part.id);
                            return (
                              <span
                                key={ch.id}
                                className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                                  unlocked
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-zinc-200 text-zinc-600'
                                }`}
                              >
                                {ch.name}: {unlocked ? '所持' : '未所持'}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 初期所持 vs ガチャ限定 トグル */}
                    <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-200/70 p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setGachaPartSetting(part.id, { isGachaOnly: false }, part);
                          sound.tap();
                        }}
                        className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-bold transition ${
                          !st.isGachaOnly
                            ? 'bg-white text-emerald-700 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        <Unlock className="h-3 w-3" />
                        <span>初期所持</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGachaPartSetting(part.id, { isGachaOnly: true }, part);
                          sound.tap();
                        }}
                        className={`flex items-center justify-center gap-1 rounded-md py-1.5 text-xs font-bold transition ${
                          st.isGachaOnly
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        <Lock className="h-3 w-3" />
                        <span>ガチャ限定</span>
                      </button>
                    </div>

                    {/* ガチャ限定時のレアリティ＆ピックアップ設定 */}
                    {st.isGachaOnly && (
                      <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-200/60">
                        <div className="flex items-center gap-1">
                          {([1, 2, 3] as GachaRarity[]).map((r) => {
                            const active = st.rarity === r;
                            return (
                              <button
                                key={r}
                                type="button"
                                onClick={() => {
                                  setGachaPartSetting(part.id, { rarity: r }, part);
                                  sound.tap();
                                }}
                                className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-extrabold transition ${
                                  active
                                    ? r === 3
                                      ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white shadow-xs'
                                      : r === 2
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'bg-sky-500 text-white shadow-xs'
                                    : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                                }`}
                              >
                                <GachaIcon
                                  type={r === 3 ? 'orb_r3' : r === 2 ? 'orb_r2' : 'orb_r1'}
                                  size={16}
                                />
                                <span>{r === 3 ? '★3 SSR' : r === 2 ? '★2 R' : '★1 N'}</span>
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setGachaPartSetting(part.id, { isPickup: !st.isPickup }, part);
                            sound.tap();
                          }}
                          className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition ${
                            st.isPickup
                              ? 'bg-rose-100 text-rose-700 border border-rose-300'
                              : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                          }`}
                          title="ピックアップ（同レア内で出やすさ2.2倍）"
                        >
                          <Flame className="h-3 w-3" />
                          <span>PU</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== タブ2: ★3 フルコーデセット作成・管理 ===== */}
      {tab === 'coord_sets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 左：セット作成・編集フォーム＆ライブ試着プレビュー */}
          <div className="lg:col-span-7 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-500" />
                  <span>
                    {editingSetId ? '★3 フルコーデセットを編集' : '新規 ★3 フルコーデセットを作成'}
                  </span>
                </h4>
                <p className="text-xs text-zinc-500">
                  帽子・トップス・ボトムス・小物などを組み合わせた「★3 SSR 大当たり一式セット」を作れます！
                </p>
              </div>
              {editingSetId && (
                <button
                  type="button"
                  onClick={handleResetSetForm}
                  className="rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-200"
                >
                  新規作成に戻る
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              {/* ライブ試着ステージプレビュー */}
              <div className="sm:col-span-5 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-indigo-950 via-purple-900 to-slate-900 p-3 text-white shadow-inner">
                <span className="mb-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                  ★3 ランウェイ試着プレビュー
                </span>
                <AvatarRenderer
                  equippedParts={coordPreviewEquipped}
                  size={150}
                  animate
                  className="drop-shadow-[0_8px_20px_rgba(255,215,0,0.35)]"
                />
                <p className="mt-1 text-[11px] font-bold text-amber-200">
                  選択中パーツ: {setPartIds.length}点
                </p>
              </div>

              {/* 入力欄 */}
              <div className="sm:col-span-7 flex flex-col gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    フルコーデ名（必須）
                  </label>
                  <input
                    type="text"
                    value={setName}
                    onChange={(e) => setSetName(e.target.value)}
                    placeholder="例：ロイヤルスタープリンセス一式"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-900 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    キャッチコピー・説明
                  </label>
                  <input
                    type="text"
                    value={setDesc}
                    onChange={(e) => setSetDesc(e.target.value)}
                    placeholder="例：ドレス・ティアラ・魔法のステッキの豪華セット✨"
                    className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-xs text-zinc-800 focus:border-indigo-500 focus:outline-hidden"
                  />
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={setIsPickup}
                    onChange={(e) => setSetIsPickup(e.target.checked)}
                    className="h-4 w-4 rounded accent-rose-600"
                  />
                  <span className="text-xs font-bold text-rose-800">
                    🔥 ピックアップ目玉コーデにする（ガチャ画面の看板に表示＆確率UP）
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleSaveCoordSet}
                  className="mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-pink-500 to-indigo-600 py-2.5 px-4 text-xs font-extrabold text-white shadow-sm hover:opacity-95 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {editingSetId
                      ? 'フルコーデセットを更新する'
                      : '★3 フルコーデセットとして登録する'}
                  </span>
                </button>
              </div>
            </div>

            {/* セットに含めるパーツ選択グリッド */}
            <div className="mt-2 border-t border-zinc-100 pt-3">
              <p className="text-xs font-bold text-zinc-700 mb-2">
                セットに含める自作パーツをタップして選択（2点以上）:
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-1">
                {dressupParts.map((part) => {
                  const selected = setPartIds.includes(part.id);
                  const catInfo = CATEGORY_META[part.category];
                  return (
                    <button
                      key={part.id}
                      type="button"
                      onClick={() => handleTogglePartInSet(part)}
                      className={`relative flex flex-col items-center rounded-xl border p-2 text-center transition ${
                        selected
                          ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/30'
                          : 'border-zinc-200 bg-white hover:border-zinc-300'
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                      <div className="h-12 w-12 overflow-hidden rounded-lg avatar-checker">
                        <img
                          src={part.src}
                          alt={part.name}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <span className="mt-1 text-[9px] font-semibold text-zinc-400">
                        {catInfo?.label}
                      </span>
                      <span className="w-full truncate text-[11px] font-bold text-zinc-800">
                        {part.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 右：登録済みフルコーデ一覧 */}
          <div className="lg:col-span-5 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2.5">
              登録済みの ★3 フルコーデセット ({cfg.coordSets.length}組)
            </h4>

            {cfg.coordSets.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-200 py-12 px-4 text-center text-xs text-zinc-400">
                まだフルコーデセットが登録されていません。左のフォームから複数パーツを選んで登録すると、★3大当たり枠として一式排出されるようになります！
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {cfg.coordSets.map((cs) => {
                  const eq: EquippedParts = { ...createEmptyEquippedMap(), body: bodyPart };
                  const hands: AvatarPart[] = [];
                  for (const pid of cs.partIds) {
                    const p = dressupParts.find((x) => x.id === pid);
                    if (p) {
                      eq[p.category] = p;
                      if (p.category === 'hand_item') hands.push(p);
                    }
                  }
                  if (hands.length > 0) eq.hand_items = hands;

                  return (
                    <div
                      key={cs.id}
                      className="flex items-center gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-pink-50/50 p-3 shadow-2xs"
                    >
                      <div className="rounded-xl bg-indigo-950 p-1.5 shrink-0">
                        <AvatarRenderer
                          equippedParts={eq}
                          size={68}
                          animate={false}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-gradient-to-r from-amber-500 to-pink-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                            ★3 FULL COORD
                          </span>
                          {cs.isPickup && (
                            <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              PICKUP
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-sm font-extrabold text-zinc-900">
                          {cs.name}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500">{cs.description}</p>
                        <p className="mt-1 text-[10px] font-semibold text-indigo-700">
                          セット構成: {cs.partIds.length}パーツ一式
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditSet(cs)}
                          className="rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
                        >
                          編集
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteGachaCoordSet(cs.id);
                            toast(`「${cs.name}」を削除しました`, '🗑️');
                          }}
                          className="flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== タブ3: 確率・価格・チケット・天井設定 ===== */}
      {tab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ガチャ価格＆レア度排出率 */}
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              🪙 ガチャ価格 ＆ レアリティ提供割合
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  1回ガチャ価格（コイン）
                </label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={cfg.singleCost}
                  onChange={(e) =>
                    updateGachaConfig({ singleCost: Math.max(10, Number(e.target.value) || 50) })
                  }
                  className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  10連ガチャ価格（★2以上確定）
                </label>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={cfg.tenPullCost}
                  onChange={(e) =>
                    updateGachaConfig({ tenPullCost: Math.max(50, Number(e.target.value) || 450) })
                  }
                  className="w-full rounded-xl border border-zinc-300 px-3 py-1.5 text-sm font-bold"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 rounded-xl bg-zinc-50 p-2.5 border border-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={cfg.enableDailyFree}
                onChange={(e) => updateGachaConfig({ enableDailyFree: e.target.checked })}
                className="h-4 w-4 rounded accent-indigo-600"
              />
              <span className="text-xs font-bold text-zinc-800">
                🎁 1日1回無料ガチャを有効にする
              </span>
            </label>

            <div className="border-t border-zinc-100 pt-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800">
                  レアリティ別排出確率（合計100%に自動正規化されます）
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-extrabold text-pink-600 w-28">🌈 ★3 SSR</span>
                <input
                  type="range"
                  min={1}
                  max={40}
                  value={cfg.rarityRates.r3}
                  onChange={(e) => {
                    const r3 = Number(e.target.value);
                    const r2 = cfg.rarityRates.r2;
                    const r1 = Math.max(0, 100 - r3 - r2);
                    updateGachaConfig({ rarityRates: { r3, r2, r1 } });
                  }}
                  className="flex-1 accent-pink-500"
                />
                <span className="w-12 text-right text-xs font-bold">{cfg.rarityRates.r3}%</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-extrabold text-amber-600 w-28">✨ ★2 R</span>
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={cfg.rarityRates.r2}
                  onChange={(e) => {
                    const r2 = Number(e.target.value);
                    const r3 = cfg.rarityRates.r3;
                    const r1 = Math.max(0, 100 - r3 - r2);
                    updateGachaConfig({ rarityRates: { r3, r2, r1 } });
                  }}
                  className="flex-1 accent-amber-500"
                />
                <span className="w-12 text-right text-xs font-bold">{cfg.rarityRates.r2}%</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-extrabold text-sky-600 w-28">💎 ★1 N</span>
                <div className="flex-1 h-2 rounded-full bg-sky-100 overflow-hidden">
                  <div
                    className="h-full bg-sky-500"
                    style={{ width: `${Math.max(0, cfg.rarityRates.r1)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-xs font-bold">{cfg.rarityRates.r1}%</span>
              </div>
            </div>

            {/* パーツ優先比率 */}
            <div className="border-t border-zinc-100 pt-3 flex flex-col gap-2">
              <span className="text-xs font-bold text-zinc-800">
                各レア当選時の「アバターパーツ優先度」（残りが控えめチケット＆ジュエル）
              </span>
              {(['r3', 'r2', 'r1'] as const).map((tier) => (
                <div key={tier} className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-zinc-600 w-28">
                    {tier === 'r3' ? '★3 パーツ比率' : tier === 'r2' ? '★2 パーツ比率' : '★1 パーツ比率'}
                  </span>
                  <input
                    type="range"
                    min={20}
                    max={100}
                    step={5}
                    value={cfg.avatarWeightPercent[tier]}
                    onChange={(e) =>
                      updateGachaConfig({
                        avatarWeightPercent: {
                          ...cfg.avatarWeightPercent,
                          [tier]: Number(e.target.value),
                        },
                      })
                    }
                    className="flex-1 accent-indigo-600"
                  />
                  <span className="w-12 text-right text-xs font-bold">
                    {cfg.avatarWeightPercent[tier]}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 控えめチケット対象＆天井交換レート設定 */}
          <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs">
            <h4 className="text-sm font-bold text-zinc-900 border-b border-zinc-100 pb-2">
              🎫 副賞ごほうびチケット設定 ＆ 💎 スタージュエル天井交換レート
            </h4>

            <div className="flex flex-col gap-2">
              <p className="text-xs text-zinc-500">
                ガチャの副賞（控えめ確率）として排出を許可するごほうびショップのチケットをON/OFFできます:
              </p>
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {state.shop.map((item) => {
                  const enabled = cfg.enabledShopTicketIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate font-bold text-zinc-800">
                        {item.icon} {item.name}（🪙{item.price}）
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleShopTicket(item.id)}
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${
                          enabled
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'bg-zinc-200 text-zinc-500'
                        }`}
                      >
                        {enabled ? '排出ON' : 'OFF'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3 flex flex-col gap-2.5">
              <span className="text-xs font-bold text-zinc-800">
                💎 スタージュエル交換所（天井）の必要ジュエル数
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500">
                    👑 フルコーデ一式
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cfg.exchangeCosts.r3Set}
                    onChange={(e) =>
                      updateGachaConfig({
                        exchangeCosts: {
                          ...cfg.exchangeCosts,
                          r3Set: Math.max(1, Number(e.target.value) || 25),
                        },
                      })
                    }
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-pink-600">
                    ★3 SSR 単体
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cfg.exchangeCosts.r3Part}
                    onChange={(e) =>
                      updateGachaConfig({
                        exchangeCosts: {
                          ...cfg.exchangeCosts,
                          r3Part: Math.max(1, Number(e.target.value) || 15),
                        },
                      })
                    }
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-amber-600">
                    ★2 R 単体
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cfg.exchangeCosts.r2Part}
                    onChange={(e) =>
                      updateGachaConfig({
                        exchangeCosts: {
                          ...cfg.exchangeCosts,
                          r2Part: Math.max(1, Number(e.target.value) || 8),
                        },
                      })
                    }
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-sky-600">
                    ★1 N 単体
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={cfg.exchangeCosts.r1Part}
                    onChange={(e) =>
                      updateGachaConfig({
                        exchangeCosts: {
                          ...cfg.exchangeCosts,
                          r1Part: Math.max(1, Number(e.target.value) || 4),
                        },
                      })
                    }
                    className="mt-0.5 w-full rounded-lg border border-zinc-300 px-2 py-1 text-xs font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
