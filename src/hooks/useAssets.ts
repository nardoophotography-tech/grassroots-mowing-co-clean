import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { AppAsset } from '../types';

export function useAssets(type?: AppAsset['type'], includeInactive = false) {
  const [assets, setAssets] = useState<AppAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Standard collection reference without server-side constraints to avoid composite index errors
    // during the initial setup where indices might not yet be provisioned.
    const q = query(collection(db, 'assets'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allAssets = snapshot.docs.map(doc => {
        const d = doc.data();
        const v = d.versionNumber || 1;
        return {
          id: doc.id,
          ...d,
          url: `${d.url}${d.url.includes('?') ? '&' : '?'}v=${v}`,
          rawUrl: d.url,
          thumbnailUrl: d.thumbnailUrl ? `${d.thumbnailUrl}${d.thumbnailUrl.includes('?') ? '&' : '?'}v=${v}` : undefined
        } as AppAsset;
      });

      // Apply filtering in memory
      let result = allAssets;
      if (type) {
        result = result.filter(a => a.type === type);
      }
      if (!includeInactive) {
        result = result.filter(a => a.active !== false);
      }

      // Sort in memory: sortOrder (ASC), then createdAt (DESC)
      result.sort((a, b) => {
        const orderA = a.sortOrder ?? 999;
        const orderB = b.sortOrder ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

      console.log(`[useAssets]: Loaded ${result.length} assets (filtered from ${allAssets.length})`);
      setAssets(result);
      setLoading(false);
    }, (error) => {
      console.error('[useAssets]: Assets snapshot error:', error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [type, includeInactive]);

  return { assets, loading };
}

export function useLatestAsset(type: AppAsset['type']) {
  const { assets, loading } = useAssets(type);
  return { asset: assets[0] || null, loading };
}
