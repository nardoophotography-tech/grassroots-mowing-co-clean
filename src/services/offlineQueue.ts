import { QueueItem } from '../types';

const QUEUE_KEY = 'grassroots_offline_queue';

export const offlineQueue = {
  get(): QueueItem[] {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  },

  add(jobId: string, action: QueueItem['action']): QueueItem {
    const queue = this.get();
    const newItem: QueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      jobId,
      action,
      status: 'pending',
      timestamp: Date.now(),
      retryCount: 0
    };
    
    // Deduplicate: If same action for same job is already pending, don't add
    const exists = queue.find(item => item.jobId === jobId && item.action === action && item.status !== 'failed');
    if (exists) return exists;

    queue.push(newItem);
    this.save(queue);
    return newItem;
  },

  update(id: string, updates: Partial<QueueItem>) {
    const queue = this.get();
    const index = queue.findIndex(item => item.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      this.save(queue);
    }
  },

  remove(id: string) {
    const queue = this.get().filter(item => item.id !== id);
    this.save(queue);
  },

  save(queue: QueueItem[]) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    // Trigger a custom event for the sync engine to pick up
    window.dispatchEvent(new CustomEvent('offline-queue-updated'));
  }
};
