// Recall IndexedDB Local Storage Service
import type { HistoryItem, DailySummary, Insight } from '../types';

const DB_NAME = 'recall_local_db';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;

      // History Store
      if (!db.objectStoreNames.contains('history_items')) {
        const historyStore = db.createObjectStore('history_items', { keyPath: 'id' });
        historyStore.createIndex('visitTime', 'visitTime', { unique: false });
        historyStore.createIndex('domain', 'domain', { unique: false });
        historyStore.createIndex('category', 'category', { unique: false });
      }

      // Summaries Store
      if (!db.objectStoreNames.contains('summaries')) {
        db.createObjectStore('summaries', { keyPath: 'date' });
      }

      // Insights Store
      if (!db.objectStoreNames.contains('insights')) {
        db.createObjectStore('insights', { keyPath: 'id' });
      }
    };
  });
}

export async function saveHistoryItems(items: HistoryItem[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['history_items'], 'readwrite');
    const store = transaction.objectStore('history_items');

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    items.forEach((item) => {
      // Put will insert or update if id exists
      store.put(item);
    });
  });
}

export async function getHistoryRange(startTime: number, endTime: number): Promise<HistoryItem[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['history_items'], 'readonly');
    const store = transaction.objectStore('history_items');
    const index = store.index('visitTime');
    const range = IDBKeyRange.bound(startTime, endTime);
    const request = index.openCursor(range, 'prev'); // Most recent first
    const results: HistoryItem[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function getAllHistory(): Promise<HistoryItem[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['history_items'], 'readonly');
    const store = transaction.objectStore('history_items');
    const index = store.index('visitTime');
    const request = index.openCursor(null, 'prev'); // Descending visitTime
    const results: HistoryItem[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['history_items'], 'readwrite');
    const store = transaction.objectStore('history_items');
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveSummary(summary: DailySummary): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['summaries'], 'readwrite');
    const store = transaction.objectStore('summaries');
    const request = store.put(summary);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSummary(date: string): Promise<DailySummary | null> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['summaries'], 'readonly');
    const store = transaction.objectStore('summaries');
    const request = store.get(date);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveInsights(insights: Insight[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['insights'], 'readwrite');
    const store = transaction.objectStore('insights');

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    insights.forEach((insight) => {
      store.put(insight);
    });
  });
}

export async function getInsights(): Promise<Insight[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['insights'], 'readonly');
    const store = transaction.objectStore('insights');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function clearDatabase(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['history_items', 'summaries', 'insights'], 'readwrite');
    const historyStore = transaction.objectStore('history_items');
    const summariesStore = transaction.objectStore('summaries');
    const insightsStore = transaction.objectStore('insights');

    historyStore.clear();
    summariesStore.clear();
    insightsStore.clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
