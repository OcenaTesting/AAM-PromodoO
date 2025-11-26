

import { Task, SessionConfig, SessionLog } from '../types';

const DB_NAME = 'PromodoDB';
const DB_VERSION = 1;

export class StorageService {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB error:", request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Tasks Store
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' });
        }

        // History Store
        if (!db.objectStoreNames.contains('history')) {
          const store = db.createObjectStore('history', { keyPath: 'id' });
          store.createIndex('startTime', 'startTime', { unique: false });
        }

        // Settings Store (Key-Value map)
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      };
    });
  }

  // --- Helper to get a transaction store ---
  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.dbPromise;
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // --- Tasks ---

  async saveTasks(tasks: Task[]): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      
      const clearReq = store.clear();
      
      clearReq.onsuccess = () => {
        if (tasks.length === 0) {
          resolve();
          return;
        }
        let completed = 0;
        tasks.forEach(task => {
          const putReq = store.put(task);
          putReq.onsuccess = () => {
            completed++;
            if (completed === tasks.length) resolve();
          };
          putReq.onerror = () => {
             console.error("Failed to save task", task.id);
          };
        });
      };
      
      clearReq.onerror = () => reject(clearReq.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadTasks(): Promise<Task[]> {
    const store = await this.getStore('tasks');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Config ---

  async saveConfig(config: SessionConfig): Promise<void> {
    const store = await this.getStore('settings', 'readwrite');
    store.put(config, 'config');
  }

  async loadConfig(): Promise<SessionConfig | null> {
    const store = await this.getStore('settings');
    return new Promise((resolve) => {
      const req = store.get('config');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  // --- History ---

  async saveSession(session: SessionLog): Promise<void> {
    const store = await this.getStore('history', 'readwrite');
    store.add(session);
  }

  // New Method: Overwrite entire history (for Cloud Sync)
  async overwriteHistory(history: SessionLog[]): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('history', 'readwrite');
      const store = tx.objectStore('history');
      
      const clearReq = store.clear();
      
      clearReq.onsuccess = () => {
        if (history.length === 0) {
          resolve();
          return;
        }
        let completed = 0;
        history.forEach(h => {
          store.put(h);
          completed++;
        });
        resolve(); // Optimistic resolve for bulk
      };
      
      tx.onerror = () => reject(tx.error);
    });
  }

  async getHistory(): Promise<SessionLog[]> {
    const store = await this.getStore('history');
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Streak Logic ---

  async updateStreak(): Promise<number> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      
      const dateReq = store.get('lastLogin');
      const streakReq = store.get('streak');
      
      let lastLogin: string | undefined;
      let currentStreak: number = 0;
      let loaded = 0;

      const attemptUpdate = () => {
        if (loaded < 2) return;
        
        const today = new Date().toDateString();
        let newStreak = currentStreak || 0;

        if (lastLogin !== today) {
           const yesterday = new Date();
           yesterday.setDate(yesterday.getDate() - 1);
           
           if (lastLogin === yesterday.toDateString()) {
             newStreak++;
           } else {
             newStreak = 1;
           }
           
           store.put(today, 'lastLogin');
           store.put(newStreak, 'streak');
        } else if (newStreak === 0) {
            newStreak = 1;
            store.put(today, 'lastLogin');
            store.put(newStreak, 'streak');
        }
        
        resolve(newStreak);
      };

      dateReq.onsuccess = () => { lastLogin = dateReq.result; loaded++; attemptUpdate(); };
      streakReq.onsuccess = () => { currentStreak = streakReq.result; loaded++; attemptUpdate(); };
      
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const storageService = new StorageService();
