import { useEffect, useCallback, useRef } from 'react';
import { offlineQueue } from '../services/offlineQueue';
import { QueueItem } from '../types';
import toast from 'react-hot-toast';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF = 1000; // 1 second

export function useSyncEngine() {
  const isProcessing = useRef(false);

  const processItem = useCallback(async (item: QueueItem) => {
    try {
      offlineQueue.update(item.id, { status: 'syncing' });

      let endpoint = '';
      if (item.action === 'COMPLETE_JOB') {
        endpoint = `/api/jobs/${item.jobId}/complete`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      // Success
      offlineQueue.remove(item.id);
      console.log(`[SyncEngine]: Successfully processed ${item.action} for job ${item.jobId}`);
      
      if (item.action === 'COMPLETE_JOB') {
        toast.success(`Sync complete - Invoice sent for job ${item.jobId.slice(-4)}`);
      }
    } catch (err: any) {
      console.error(`[SyncEngine]: Failed to process item ${item.id}`, err);
      
      const nextRetryCount = item.retryCount + 1;
      if (nextRetryCount >= MAX_RETRIES) {
        offlineQueue.update(item.id, { 
          status: 'failed', 
          lastError: err.message,
          retryCount: nextRetryCount 
        });
        toast.error(`Sync failed for job ${item.jobId.slice(-4)} after ${MAX_RETRIES} attempts.`);
      } else {
        offlineQueue.update(item.id, { 
          status: 'pending', 
          retryCount: nextRetryCount 
        });
      }
    }
  }, []);

  const sync = useCallback(async () => {
    if (isProcessing.current || !navigator.onLine) return;

    const queue = offlineQueue.get().filter(item => item.status === 'pending');
    if (queue.length === 0) return;

    isProcessing.current = true;
    console.log(`[SyncEngine]: Processing ${queue.length} items...`);

    for (const item of queue) {
      // Calculate backoff if needed
      if (item.retryCount > 0) {
        const backoff = INITIAL_BACKOFF * Math.pow(2, item.retryCount - 1);
        const timeSinceLastAttempt = Date.now() - item.timestamp;
        if (timeSinceLastAttempt < backoff) continue;
      }
      
      await processItem(item);
    }

    isProcessing.current = false;
  }, [processItem]);

  useEffect(() => {
    // Initial sync
    sync();

    // Listen for queue updates
    const handleUpdate = () => sync();
    window.addEventListener('offline-queue-updated', handleUpdate);
    
    // Listen for online status
    const handleOnline = () => {
      console.log('[SyncEngine]: Internet back online, triggering sync...');
      sync();
    };
    window.addEventListener('online', handleOnline);

    // Periodic check (every 30 seconds)
    const interval = setInterval(sync, 30000);

    return () => {
      window.removeEventListener('offline-queue-updated', handleUpdate);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [sync]);
}
