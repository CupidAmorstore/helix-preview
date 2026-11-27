import { openDB, DBSchema } from 'idb';
import type { AlertRecord, AddressRecord, ExchangeRecord, KeystoreRecord, SnapshotRecord } from '../types';

interface HelixDB extends DBSchema {
  settings: {
    key: string;
    value: unknown;
  };
  exchanges: {
    key: string;
    value: ExchangeRecord;
  };
  addresses: {
    key: string;
    value: AddressRecord;
  };
  alerts: {
    key: string;
    value: AlertRecord;
  };
  snapshots: {
    key: string;
    value: SnapshotRecord;
    indexes: { 'by-date': string };
  };
  keystore: {
    key: string;
    value: KeystoreRecord;
  };
}

const dbPromise = openDB<HelixDB>('helix-db', 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings');
    }
    if (!db.objectStoreNames.contains('exchanges')) {
      db.createObjectStore('exchanges', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('addresses')) {
      db.createObjectStore('addresses', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('alerts')) {
      db.createObjectStore('alerts', { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains('snapshots')) {
      const store = db.createObjectStore('snapshots', { keyPath: 'id' });
      store.createIndex('by-date', 'date');
    }
    if (!db.objectStoreNames.contains('keystore')) {
      db.createObjectStore('keystore', { keyPath: 'id' });
    }
  }
});

export async function getSetting<T>(key: string): Promise<T | null> {
  const db = await dbPromise;
  const value = await db.get('settings', key);
  return (value as T) ?? null;
}

export async function setSetting<T>(key: string, value: T): Promise<void> {
  const db = await dbPromise;
  await db.put('settings', value, key);
}

export async function listExchanges(): Promise<ExchangeRecord[]> {
  const db = await dbPromise;
  return await db.getAll('exchanges');
}

export async function saveExchange(record: ExchangeRecord): Promise<void> {
  const db = await dbPromise;
  await db.put('exchanges', record);
}

export async function deleteExchange(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete('exchanges', id);
}

export async function listAddresses(): Promise<AddressRecord[]> {
  const db = await dbPromise;
  return await db.getAll('addresses');
}

export async function saveAddress(record: AddressRecord): Promise<void> {
  const db = await dbPromise;
  await db.put('addresses', record);
}

export async function deleteAddress(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete('addresses', id);
}

export async function listAlerts(): Promise<AlertRecord[]> {
  const db = await dbPromise;
  return await db.getAll('alerts');
}

export async function saveAlert(record: AlertRecord): Promise<void> {
  const db = await dbPromise;
  await db.put('alerts', record);
}

export async function deleteAlert(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete('alerts', id);
}

export async function saveSnapshot(record: SnapshotRecord): Promise<void> {
  const db = await dbPromise;
  await db.put('snapshots', record);
}

export async function listSnapshots(): Promise<SnapshotRecord[]> {
  const db = await dbPromise;
  return await db.getAll('snapshots');
}

export async function getKeystore(): Promise<KeystoreRecord | null> {
  const db = await dbPromise;
  return (await db.get('keystore', 'default')) ?? null;
}

export async function saveKeystore(record: KeystoreRecord): Promise<void> {
  const db = await dbPromise;
  await db.put('keystore', record);
}

export async function deleteKeystore(): Promise<void> {
  const db = await dbPromise;
  await db.delete('keystore', 'default');
}

