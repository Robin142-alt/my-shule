import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface WorkflowSyncDB extends DBSchema {
  outbox: {
    key: string;
    value: {
      id: string;
      actionId: string;
      workflowBinding: string;
      aggregateId: string;
      payload: Record<string, unknown>;
      timestamp: number;
      status: 'pending' | 'syncing' | 'failed';
      retryCount: number;
    };
    indexes: { 'by-status': string };
  };
}

class OfflineSyncEngine {
  private dbPromise: Promise<IDBPDatabase<WorkflowSyncDB>> | null = null;
  private isSyncing = false;
  private readonly SYNC_INTERVAL = 15000; // 15 seconds

  private getDB() {
    if (!this.dbPromise) {
      this.dbPromise = openDB<WorkflowSyncDB>('myshule-workflow-sync', 1, {
        upgrade(db) {
          const store = db.createObjectStore('outbox', { keyPath: 'id' });
          store.createIndex('by-status', 'status');
        },
      });
    }
    return this.dbPromise;
  }

  async enqueueAction(actionId: string, workflowBinding: string, aggregateId: string, payload: Record<string, unknown>) {
    const db = await this.getDB();
    const id = crypto.randomUUID();
    
    await db.put('outbox', {
      id,
      actionId,
      workflowBinding,
      aggregateId,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0,
    });

    // Attempt to sync immediately
    if (navigator.onLine) {
      this.triggerSync();
    }

    return id;
  }

  async triggerSync() {
    if (this.isSyncing || !navigator.onLine) return;
    
    this.isSyncing = true;
    try {
      const db = await this.getDB();
      const tx = db.transaction('outbox', 'readwrite');
      const index = tx.store.index('by-status');
      
      const pendingItems = await index.getAll('pending');
      const failedItems = await index.getAll('failed');
      const toSync = [...pendingItems, ...failedItems].sort((a, b) => a.timestamp - b.timestamp);
      
      for (const item of toSync) {
        // Mark as syncing
        item.status = 'syncing';
        await db.put('outbox', item);
        
        try {
          // Push to backend sync endpoint
          const response = await fetch('/api/operational-workflows/offline-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action_id: item.actionId,
              workflow_binding: item.workflowBinding,
              aggregate_id: item.aggregateId,
              payload: item.payload,
            }),
          });
          
          if (!response.ok) {
            throw new Error(`Sync failed with status ${response.status}`);
          }
          
          // Remove on success
          await db.delete('outbox', item.id);
        } catch (error) {
          // Revert to failed and increment retry
          item.status = 'failed';
          item.retryCount += 1;
          await db.put('outbox', item);
          console.error(`Failed to sync workflow action ${item.id}`, error);
        }
      }
    } finally {
      this.isSyncing = false;
    }
  }

  startBackgroundSync() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.triggerSync());
      setInterval(() => {
        if (navigator.onLine) {
          this.triggerSync();
        }
      }, this.SYNC_INTERVAL);
    }
  }
}

export const offlineSyncEngine = new OfflineSyncEngine();
