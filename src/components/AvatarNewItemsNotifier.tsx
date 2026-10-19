import { useState, useEffect } from 'react';
import { Sparkles, Download, X, Cloud, Check, Loader2 } from 'lucide-react';
import {
  startCloudCatalogSync,
  importCloudPartsToLocal,
  NEW_AVATAR_PARTS_DETECTED_EVENT,
  type NewPartsDetectedDetail,
} from '../features/avatar';
import { toast } from './ui';

/**
 * 他端末で作成された新着アバターパーツを検知し、
 * ローカル（IndexedDB）への保存を促すポップアップ通知コンポーネント
 */
export function AvatarNewItemsNotifier() {
  const [newPartsDetail, setNewPartsDetail] = useState<NewPartsDetectedDetail | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // クラウド同期リスナーの開始
    let cleanupFn: (() => void) | null = null;
    void startCloudCatalogSync().then((cleanup) => {
      cleanupFn = cleanup;
    });

    // 新着パーツ検知イベントの購読
    const handleNewParts = (e: Event) => {
      const customEvent = e as CustomEvent<NewPartsDetectedDetail>;
      if (customEvent.detail && customEvent.detail.newCount > 0) {
        setNewPartsDetail(customEvent.detail);
        setIsDismissed(false);
      }
    };

    window.addEventListener(NEW_AVATAR_PARTS_DETECTED_EVENT, handleNewParts);

    return () => {
      window.removeEventListener(NEW_AVATAR_PARTS_DETECTED_EVENT, handleNewParts);
      cleanupFn?.();
    };
  }, []);

  if (!newPartsDetail || isDismissed || newPartsDetail.newCount === 0) {
    return null;
  }

  const handleImportNow = async () => {
    setIsImporting(true);
    try {
      const count = await importCloudPartsToLocal(newPartsDetail.newParts);
      toast(`🎉 ${count} 件の新しいパーツをローカルに保存しました！`, '✨');
      setNewPartsDetail(null);
    } catch (err) {
      console.error('Failed to import cloud parts:', err);
      toast('パーツの保存に失敗しました', '❌');
    } finally {
      setIsImporting(false);
    }
  };

  const partNamesPreview = newPartsDetail.newParts
    .slice(0, 3)
    .map((p) => `「${p.name}」`)
    .join('、');
  const hasMore = newPartsDetail.newParts.length > 3;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-96 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/95 backdrop-blur-md p-4 shadow-2xl text-zinc-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-100">新しいアバターパーツ</span>
                <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                  +{newPartsDetail.newCount}件
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-tight">
                他の端末で作成されたパーツが届きました
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
            title="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* プレビュー表示 */}
        <div className="mt-2.5 rounded-lg bg-zinc-950/60 p-2.5 border border-zinc-800 text-[11px] text-zinc-300">
          <span className="text-zinc-400">届いたアイテム: </span>
          <span className="font-medium text-indigo-200">
            {partNamesPreview}
            {hasMore ? ` ほか計${newPartsDetail.newCount}点` : ''}
          </span>
        </div>

        {/* アクションボタン */}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            disabled={isImporting}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/80 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
          >
            あとで
          </button>
          <button
            type="button"
            onClick={handleImportNow}
            disabled={isImporting}
            className="flex-[1.5] flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 py-2 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 active:scale-[0.98] transition disabled:opacity-50"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                <span>ローカルに保存</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
