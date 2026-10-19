import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AvatarPart } from '../types';
import { PRESET_PARTS } from '../presets/svgParts';
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
 */
export function usePartCatalog(externalParts: AvatarPart[] = PRESET_PARTS) {
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
    if (externalParts.length === 0) return customParts;
    const customIdSet = new Set(customParts.map((p) => p.id));
    const filteredPresets = externalParts.filter((p) => !customIdSet.has(p.id));
    return [...customParts, ...filteredPresets];
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
