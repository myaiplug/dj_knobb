/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEY = 'gemini_api_key_encrypted';
const STORAGE_TIMESTAMP_KEY = 'gemini_api_key_timestamp';
const ENCRYPTION_KEY_NAME = 'gemini_encryption_key';
const KEY_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const AES_GCM_IV_LENGTH = 12; // 12 bytes is the recommended IV size for AES-GCM

/**
 * Utility class for securely storing and retrieving API keys
 */
export class ApiKeyStorage {
  private static encryptionKey: CryptoKey | null = null;

  /**
   * Generate or retrieve the encryption key
   */
  private static async getEncryptionKey(): Promise<CryptoKey> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    // Try to retrieve existing key from IndexedDB
    const storedKey = await this.retrieveKeyFromIndexedDB();
    if (storedKey) {
      this.encryptionKey = storedKey;
      return storedKey;
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256,
      },
      true,
      ['encrypt', 'decrypt']
    );

    // Store it
    await this.storeKeyInIndexedDB(key);
    this.encryptionKey = key;
    return key;
  }

  /**
   * Store encryption key in IndexedDB
   */
  private static async storeKeyInIndexedDB(key: CryptoKey): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ApiKeyStorage', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      };
      
      request.onsuccess = async () => {
        const db = request.result;
        const transaction = db.transaction(['keys'], 'readwrite');
        const store = transaction.objectStore('keys');
        const exportedKey = await crypto.subtle.exportKey('raw', key);
        store.put(exportedKey, ENCRYPTION_KEY_NAME);
        
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }

  /**
   * Retrieve encryption key from IndexedDB
   */
  private static async retrieveKeyFromIndexedDB(): Promise<CryptoKey | null> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ApiKeyStorage', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys');
        }
      };
      
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['keys'], 'readonly');
        const store = transaction.objectStore('keys');
        const getRequest = store.get(ENCRYPTION_KEY_NAME);
        
        getRequest.onsuccess = async () => {
          db.close();
          if (!getRequest.result) {
            resolve(null);
            return;
          }
          
          try {
            const key = await crypto.subtle.importKey(
              'raw',
              getRequest.result,
              {
                name: 'AES-GCM',
                length: 256,
              },
              true,
              ['encrypt', 'decrypt']
            );
            resolve(key);
          } catch (e) {
            resolve(null);
          }
        };
        
        getRequest.onerror = () => {
          db.close();
          resolve(null);
        };
      };
    });
  }

  /**
   * Encrypt and store the API key
   */
  static async storeApiKey(apiKey: string): Promise<void> {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
    const encodedKey = new TextEncoder().encode(apiKey);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedKey
    );

    // Store as base64 along with IV
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);

    // Use chunked approach to avoid call stack limits
    const base64 = this.arrayBufferToBase64(combined);
    localStorage.setItem(STORAGE_KEY, base64);
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  }

  /**
   * Convert ArrayBuffer to base64 string (chunked to avoid stack overflow)
   */
  private static arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.subarray(i, Math.min(i + chunkSize, buffer.length));
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to Uint8Array
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array | null {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch (e) {
      console.error('Failed to decode base64:', e);
      return null;
    }
  }

  /**
   * Retrieve and decrypt the API key
   */
  static async retrieveApiKey(): Promise<string | null> {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);

    if (!encrypted || !timestamp) {
      return null;
    }

    // Check if expired
    const storedTime = parseInt(timestamp, 10);
    if (Date.now() - storedTime > KEY_EXPIRY_MS) {
      this.clearApiKey();
      return null;
    }

    try {
      const key = await this.getEncryptionKey();
      const combined = this.base64ToArrayBuffer(encrypted);
      
      if (!combined) {
        this.clearApiKey();
        return null;
      }
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, AES_GCM_IV_LENGTH);
      const encryptedData = combined.slice(AES_GCM_IV_LENGTH);

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        key,
        encryptedData
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.error('Failed to decrypt API key:', e);
      this.clearApiKey();
      return null;
    }
  }

  /**
   * Check if a valid API key exists
   */
  static hasValidApiKey(): boolean {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);

    if (!encrypted || !timestamp) {
      return false;
    }

    const storedTime = parseInt(timestamp, 10);
    return Date.now() - storedTime <= KEY_EXPIRY_MS;
  }

  /**
   * Clear the stored API key
   */
  static clearApiKey(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
  }
}
