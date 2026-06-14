import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

export type SyncStatus = 'Draft' | 'Saved offline' | 'Syncing' | 'Synced' | 'Failed' | 'Needs review';

export interface OfflineSyncRecord {
  id: string;             // Client-side unique ID
  operationId: string;    // Idempotency key
  schoolId: string;       // Tenant Isolation
  academicYearId?: string;
  termId?: string;
  userId: string;
  roleId?: string;
  deviceId: string;
  module: string;         // 'attendance', 'finance', 'discipline', etc.
  action: string;         // 'create', 'update', 'delete'
  payload: any;
  status: SyncStatus;
  retryCount: number;
  errorMessage?: string;
  createdAtLocal: string;
  syncedAt?: string;
}

interface ShuleOfflineDB extends DBSchema {
  sync_queue: {
    key: string;
    value: OfflineSyncRecord;
    indexes: {
      'by-school': string;
      'by-status': string;
      'by-module': string;
    };
  };
}

class SyncQueueService {
  private dbPromise: Promise<IDBPDatabase<ShuleOfflineDB>> | null = null;

  constructor() {}

  private getDB(): Promise<IDBPDatabase<ShuleOfflineDB>> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available on the server'));
    }
    if (!this.dbPromise) {
      this.dbPromise = openDB<ShuleOfflineDB>('myshule-offline-db', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('sync_queue')) {
            const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
            store.createIndex('by-school', 'schoolId');
            store.createIndex('by-status', 'status');
            store.createIndex('by-module', 'module');
          }
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Adds a new record to the offline queue
   */
  async enqueue(
    recordData: Omit<OfflineSyncRecord, 'id' | 'operationId' | 'status' | 'retryCount' | 'createdAtLocal'>,
    isDraft = false
  ): Promise<OfflineSyncRecord> {
    const db = await this.getDB();
    const id = uuidv4();
    const operationId = uuidv4();

    const record: OfflineSyncRecord = {
      ...recordData,
      id,
      operationId,
      status: isDraft ? 'Draft' : 'Saved offline',
      retryCount: 0,
      createdAtLocal: new Date().toISOString(),
    };

    await db.put('sync_queue', record);
    return record;
  }

  /**
   * Retrieves records for a specific school and status
   */
  async getRecordsBySchoolAndStatus(schoolId: string, status: SyncStatus): Promise<OfflineSyncRecord[]> {
    const db = await this.getDB();
    const allForSchool = await db.getAllFromIndex('sync_queue', 'by-school', schoolId);
    return allForSchool.filter(r => r.status === status);
  }

  /**
   * Retrieves all records for a given school (to ensure tenant isolation on the client)
   */
  async getAllForSchool(schoolId: string): Promise<OfflineSyncRecord[]> {
    const db = await this.getDB();
    return db.getAllFromIndex('sync_queue', 'by-school', schoolId);
  }

  /**
   * Updates the status of a sync record
   */
  async updateStatus(id: string, status: SyncStatus, errorMessage?: string): Promise<void> {
    const db = await this.getDB();
    const record = await db.get('sync_queue', id);
    if (record) {
      record.status = status;
      if (errorMessage) {
        record.errorMessage = errorMessage;
      }
      if (status === 'Failed') {
        record.retryCount += 1;
      }
      if (status === 'Synced') {
        record.syncedAt = new Date().toISOString();
      }
      await db.put('sync_queue', record);
    }
  }

  /**
   * Remove a record completely
   */
  async removeRecord(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('sync_queue', id);
  }

  /**
   * Clear all synced records
   */
  async clearSyncedRecords(schoolId: string): Promise<void> {
    const db = await this.getDB();
    const records = await this.getRecordsBySchoolAndStatus(schoolId, 'Synced');
    
    const tx = db.transaction('sync_queue', 'readwrite');
    for (const record of records) {
      await tx.store.delete(record.id);
    }
    await tx.done;
  }
}

export const syncQueue = new SyncQueueService();
