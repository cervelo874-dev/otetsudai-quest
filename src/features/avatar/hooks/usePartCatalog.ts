import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AvatarPart } from '../types';
import { PRESET_BODY } from '../presets/svgParts';
import {
  clearCatalogParts,
  duplicateCatalogPart,
  listCatalogParts,
  readFallbackParts,
  PART_CATALOG_UPDATED_EVENT,
  removeCatalogPart,
  saveCatalogPart,
  type DuplicateCatalogPartOptions,
} from '../storage/partCatalog';

/**
 * ブラウザ内パーツカタログ（IndexedDB + LocalStorage同期キャッシュ）を購読・操作するカスタムフック
 * - 自作パーツのみを一覧として提供します（もともとあったプリセットパーツは除外）。
 * - 自作素体が1件も登録されていない場合のみ、表示破綻を防ぐ安全フォールバックとして公式素体（PRESET_BODY）を補完します。
 */
export function usePartCatalog(externalParts: AvatarPart[] = []) {
  // 初回マウント時から自作パーツ・素体が即座に利用できるように同期的にLocalStorageキャッシュで初期化！
  const [customParts, setCustomParts] = useState<AvatarPart[]>(() => {
    return readFallbackParts();
  });
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const items = await listCatalogParts();
    setCustomParts(items);
    setLoading(false);
  }, []);


  useEffect(() => {
    void reload();
    const handler = () => {
      void reload();
    };
    window.addEventListener(PART_CATALOG_UPDATED_EVENT, handler);
    return () => window.removeEventListener(PART_CATALOG_UPDATED_EVENT, handler);
  }, [reload]);

  const addOrUpdatePart = useCallback(async (part: AvatarPart) => {
    return saveCatalogPart(part);
  }, []);

  const duplicatePart = useCallback(
    async (part: AvatarPart, options?: DuplicateCatalogPartOptions) => {
      return duplicateCatalogPart(part, options);
    },
    [],
  );

  const deletePart = useCallback(async (id: string) => {
    await removeCatalogPart(id);
  }, []);

  const clearAllParts = useCallback(async () => {
    await clearCatalogParts();
  }, []);

  const allParts = useMemo(() => {
    const list = externalParts.length > 0 ? [...customParts, ...externalParts] : [...customParts];
    const hasBody = list.some((p) => p.category === 'body');
    if (!hasBody) {
      list.push(PRESET_BODY);
    }
    return list;
  }, [customParts, externalParts]);

  return {
    parts: allParts,
    customParts,
    loading,
    addOrUpdatePart,
    duplicatePart,
    deletePart,
    clearAllParts,
    reload,
  };
}
