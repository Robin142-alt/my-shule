import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

export type SyncStatus = 
  | 'Draft' 
  | 'Pending' // Corresponds to 'Saved offline' in standard mutations
  | 'Syncing' 
  | 'Synced' 
  | 'Failed' 
  | 'Needs review';

export type OfflineSyncType = 'mutation' | 'workflow' | 'module_specific';

export interface OfflineSyncRecord {
  id: string;               // Client-side unique ID
  operationId: string;      // Idempotency key (actionId in workflows)
  schoolId: string;         // Tenant Isolation (tenantId in attendance/workflows)
  academicYearId?: string;  // Context info
  termId?: string;          // Context info
  userId: string;           // Operator ID
  roleId?: string;          // User role context
  deviceId: string;         // Device tracking
  type: OfflineSyncType;    // To differentiate mutations vs workflows vs module-specific actions
  module: string;           // 'attendance', 'finance', 'exams', 'workflows', etc.
  action: string;           // 'create', 'update', 'delete', or workflow binding name
  payload: any;             // Arbitrary payload (mutation variables, workflow details, or custom structure)
  status: SyncStatus;       // Sync state tracker
  retryCount: number;       // Fail retry count
  errorMessage?: string;    // Failure reason
  createdAtLocal: string;   // Local creation timestamp (ISO 8601 string)
  syncedAt?: string;        // Server sync completion timestamp
  
  // Workflow / Module specific extensions
  workflowBinding?: string; // Optional: specific backend workflow binding name (e.g. 'student_attendance')
  aggregateId?: string;     // Optional: resource context (e.g. streamId, marksheetId, studentId)
}

interface ShuleOfflineDB extends DBSchema {
  sync_queue: {
    key: string;
    value: OfflineSyncRecord;
    indexes: {
      'by-school': string;
      'by-status': string;
      'by-module': string;
      'by-type': string;
      'by-school-status': [string, string]; // Compound index to query by school and status efficiently
    };
  };
}

class SyncQueueService {
  private dbPromise: Promise<IDBPDatabase<ShuleOfflineDB>> | null = null;
  private readonly DB_NAME = 'myshule-offline-db';
  private readonly DB_VERSION = 2; // Incremented version to apply schema changes

  constructor() {}

  private getDB(): Promise<IDBPDatabase<ShuleOfflineDB>> {
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('IndexedDB is not available on the server'));
    }
    if (!this.dbPromise) {
      this.dbPromise = openDB<ShuleOfflineDB>(this.DB_NAME, this.DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // If the store already exists, check if version migration is required
          if (db.objectStoreNames.contains('sync_queue')) {
            // Delete store to rebuild with correct indexes and compound indices
            db.deleteObjectStore('sync_queue');
          }
          
          const store = db.createObjectStore('sync_queue', { keyPath: 'id' });
          store.createIndex('by-school', 'schoolId');
          store.createIndex('by-status', 'status');
          store.createIndex('by-module', 'module');
          store.createIndex('by-type', 'type');
          store.createIndex('by-school-status', ['schoolId', 'status']);
        },
      });
    }
    return this.dbPromise;
  }

  /**
   * Adds a new record to the offline queue.
   * Maps 'Saved offline' and other statuses to unified sync statuses.
   */
  async enqueue(
    recordData: Omit<OfflineSyncRecord, 'id' | 'operationId' | 'status' | 'retryCount' | 'createdAtLocal'> & {
      id?: string;
      operationId?: string;
      status?: SyncStatus;
    },
    isDraft = false
  ): Promise<OfflineSyncRecord> {
    const db = await this.getDB();
    const id = recordData.id || uuidv4();
    const operationId = recordData.operationId || uuidv4();

    const record: OfflineSyncRecord = {
      ...recordData,
      id,
      operationId,
      status: recordData.status || (isDraft ? 'Draft' : 'Pending'),
      retryCount: 0,
      createdAtLocal: new Date().toISOString(),
    };

    await db.put('sync_queue', record);
    return record;
  }

  /**
   * Retrieves records for a specific school and status using the compound index
   */
  async getRecordsBySchoolAndStatus(schoolId: string, status: SyncStatus): Promise<OfflineSyncRecord[]> {
    const db = await this.getDB();
    return db.getAllFromIndex('sync_queue', 'by-school-status', [schoolId, status]);
  }

  /**
   * Retrieves both Pending and Failed records for processing
   */
  async getPendingAndFailedForSchool(schoolId: string): Promise<OfflineSyncRecord[]> {
    const pending = await this.getRecordsBySchoolAndStatus(schoolId, 'Pending');
    const failed = await this.getRecordsBySchoolAndStatus(schoolId, 'Failed');
    
    // Combine and sort by creation time (FIFO order)
    return [...pending, ...failed].sort(
      (a, b) => new Date(a.createdAtLocal).getTime() - new Date(b.createdAtLocal).getTime()
    );
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
      if (errorMessage !== undefined) {
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
   * Clear all synced records for a school
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
