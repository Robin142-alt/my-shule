import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export type SyncStatus = 'Draft' | 'Pending' | 'Syncing' | 'Synced' | 'Failed' | 'Needs review';

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

  // New fields
  type: 'mutation' | 'workflow' | 'module_specific';
  workflowBinding?: string;
  aggregateId?: string;
}

interface ShuleOfflineDB extends DBSchema {
  sync_queue: {
    key: string;
    value: OfflineSyncRecord;
    indexes: {
      'by-school': string;
      'by-status': string;
      'by-module': string;
      'by-school-status': [string, string];
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
      this.dbPromise = openDB<ShuleOfflineDB>('myshule-offline-db', 2, {
        async upgrade(db, oldVersion, newVersion, transaction) {
          let store;
          if (db.objectStoreNames.contains('sync_queue')) {
            store = transaction.objectStore('sync_queue');
          } else {
            store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          }

          if (!store.indexNames.contains('by-school')) {
            store.createIndex('by-school', 'schoolId');
          }
          if (!store.indexNames.contains('by-status')) {
            store.createIndex('by-status', 'status');
          }
          if (!store.indexNames.contains('by-module')) {
            store.createIndex('by-module', 'module');
          }
          if (!store.indexNames.contains('by-school-status')) {
            store.createIndex('by-school-status', ['schoolId', 'status']);
          }

          if (oldVersion < 2) {
            let cursor = await store.openCursor();
            while (cursor) {
              const record = cursor.value;
              const schoolId = record.schoolId;
              if (typeof schoolId !== 'string' || schoolId.trim() === '') {
                await cursor.delete();
              } else {
                if (record.type === undefined || record.type === null) {
                  const updatedRecord = { ...record, type: 'mutation' as const };
                  await cursor.update(updatedRecord);
                }
              }
              cursor = await cursor.continue();
            }
          }
        },
      });
    }
    return this.dbPromise;
  }

  private assertTenantSafety(schoolId: any) {
    if (typeof schoolId !== 'string' || schoolId.trim() === '') {
      throw new Error('Tenant Isolation Violation: A valid schoolId is required');
    }
  }

  private async putRecord(db: IDBPDatabase<ShuleOfflineDB>, record: OfflineSyncRecord): Promise<void> {
    this.assertTenantSafety(record.schoolId);
    await db.put('sync_queue', record);
  }

  /**
   * Adds a new record to the offline queue
   */
  async enqueue(
    recordData: Omit<OfflineSyncRecord, 'id' | 'operationId' | 'status' | 'retryCount' | 'createdAtLocal' | 'type'> & {
      type?: 'mutation' | 'workflow' | 'module_specific';
    },
    isDraft = false
  ): Promise<OfflineSyncRecord> {
    // Strict schoolId check
    this.assertTenantSafety(recordData.schoolId);

    // Zod parsing/validation
    const EnqueueInputSchema = z.object({
      schoolId: z.string().refine(val => val.trim().length > 0, {
        message: 'Tenant Isolation Violation: A valid schoolId is required',
      }),
      academicYearId: z.string().optional(),
      termId: z.string().optional(),
      userId: z.string(),
      roleId: z.string().optional(),
      deviceId: z.string(),
      module: z.string(),
      action: z.string(),
      payload: z.any(),
      type: z.enum(['mutation', 'workflow', 'module_specific']).default('mutation'),
      workflowBinding: z.string().optional(),
      aggregateId: z.string().optional(),
    });

    const parsedData = EnqueueInputSchema.parse(recordData);

    const db = await this.getDB();
    const id = uuidv4();
    const operationId = uuidv4();

    const record: OfflineSyncRecord = {
      ...parsedData,
      id,
      operationId,
      status: isDraft ? 'Draft' : 'Pending',
      retryCount: 0,
      createdAtLocal: new Date().toISOString(),
      type: parsedData.type || 'mutation',
    };

    // Ensure safe write
    await this.putRecord(db, record);
    return record;
  }

  /**
   * Retrieves records for a specific school and status
   */
  async getRecordsBySchoolAndStatus(schoolId: string, status: SyncStatus): Promise<OfflineSyncRecord[]> {
    this.assertTenantSafety(schoolId);
    const db = await this.getDB();
    // Use the compound index 'by-school-status' if available
    return db.getAllFromIndex('sync_queue', 'by-school-status', [schoolId, status]);
  }

  /**
   * Retrieves all records for a given school (to ensure tenant isolation on the client)
   */
  async getAllForSchool(schoolId: string): Promise<OfflineSyncRecord[]> {
    this.assertTenantSafety(schoolId);
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
      this.assertTenantSafety(record.schoolId);
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
      await this.putRecord(db, record);
    }
  }

  /**
   * Remove a record completely
   */
  async removeRecord(id: string): Promise<void> {
    const db = await this.getDB();
    const record = await db.get('sync_queue', id);
    if (record) {
      this.assertTenantSafety(record.schoolId);
    }
    await db.delete('sync_queue', id);
  }

  /**
   * Clear all synced records
   */
  async clearSyncedRecords(schoolId: string): Promise<void> {
    this.assertTenantSafety(schoolId);
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
