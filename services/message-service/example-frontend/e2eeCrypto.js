// E2EE Encryption Utilities
// Using Web Crypto API for browser-side encryption

export class E2EECrypto {
  constructor() {
    this.privateKey = null;
    this.publicKey = null;
  }

  /**
   * Generate RSA key pair
   */
  async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );

    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;

    // Export public key for server
    const exportedPublicKey = await window.crypto.subtle.exportKey(
      "spki",
      keyPair.publicKey
    );

    return {
      publicKey: this.arrayBufferToBase64(exportedPublicKey),
      privateKey: keyPair.privateKey,
    };
  }

  /**
   * Import public key from PEM string
   */
  async importPublicKey(pemString) {
    const binaryDer = this.base64ToArrayBuffer(
      pemString.replace(/(-----(BEGIN|END) PUBLIC KEY-----|\n)/g, "")
    );

    return await window.crypto.subtle.importKey(
      "spki",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );
  }

  /**
   * Encrypt message with AES-256
   * Returns { encrypted, aesKey, iv }
   */
  async encryptMessage(plaintext) {
    // Generate random AES key
    const aesKey = await window.crypto.subtle.generateKey(
      {
        name: "AES-CBC",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );

    // Generate random IV
    const iv = window.crypto.getRandomValues(new Uint8Array(16));

    // Encrypt message
    const encoder = new TextEncoder();
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "AES-CBC",
        iv: iv,
      },
      aesKey,
      encoder.encode(plaintext)
    );

    // Export AES key
    const exportedKey = await window.crypto.subtle.exportKey("raw", aesKey);

    return {
      encrypted: this.arrayBufferToBase64(encrypted),
      aesKey: this.arrayBufferToBase64(exportedKey),
      iv: this.arrayBufferToBase64(iv),
    };
  }

  /**
   * Decrypt message with AES-256
   */
  async decryptMessage(encryptedBase64, aesKeyBase64, ivBase64) {
    try {
      // Import AES key
      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        this.base64ToArrayBuffer(aesKeyBase64),
        {
          name: "AES-CBC",
          length: 256,
        },
        false,
        ["decrypt"]
      );

      // Decrypt
      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-CBC",
          iv: this.base64ToArrayBuffer(ivBase64),
        },
        aesKey,
        this.base64ToArrayBuffer(encryptedBase64)
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error("Decryption failed:", error);
      throw new Error("Failed to decrypt message");
    }
  }

  /**
   * Encrypt AES key with RSA public key
   */
  async encryptAESKey(aesKeyBase64, recipientPublicKey) {
    try {
      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: "RSA-OAEP",
        },
        recipientPublicKey,
        this.base64ToArrayBuffer(aesKeyBase64)
      );

      return this.arrayBufferToBase64(encrypted);
    } catch (error) {
      console.error("AES key encryption failed:", error);
      throw error;
    }
  }

  /**
   * Decrypt AES key with RSA private key
   */
  async decryptAESKey(encryptedKeyBase64) {
    try {
      if (!this.privateKey) {
        throw new Error("Private key not loaded");
      }

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "RSA-OAEP",
        },
        this.privateKey,
        this.base64ToArrayBuffer(encryptedKeyBase64)
      );

      return this.arrayBufferToBase64(decrypted);
    } catch (error) {
      console.error("AES key decryption failed:", error);
      throw error;
    }
  }

  /**
   * Store private key in IndexedDB
   */
  async storePrivateKey(privateKey) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("E2EEKeys", 1);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("keys")) {
          db.createObjectStore("keys");
        }
      };

      request.onsuccess = async (event) => {
        const db = event.target.result;
        const tx = db.transaction("keys", "readwrite");
        const store = tx.objectStore("keys");

        // Export private key
        const exported = await window.crypto.subtle.exportKey(
          "jwk",
          privateKey
        );

        store.put(exported, "privateKey");
        tx.oncomplete = () => {
          this.privateKey = privateKey;
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load private key from IndexedDB
   */
  async loadPrivateKey() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("E2EEKeys", 1);

      request.onsuccess = async (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("keys")) {
          resolve(null);
          return;
        }

        const tx = db.transaction("keys", "readonly");
        const store = tx.objectStore("keys");
        const getRequest = store.get("privateKey");

        getRequest.onsuccess = async () => {
          const jwk = getRequest.result;
          if (!jwk) {
            resolve(null);
            return;
          }

          try {
            const privateKey = await window.crypto.subtle.importKey(
              "jwk",
              jwk,
              {
                name: "RSA-OAEP",
                hash: "SHA-256",
              },
              true,
              ["decrypt"]
            );

            this.privateKey = privateKey;
            resolve(privateKey);
          } catch (error) {
            reject(error);
          }
        };

        getRequest.onerror = () => reject(getRequest.error);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Helper: ArrayBuffer to Base64
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Helper: Base64 to ArrayBuffer
   */
  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export default E2EECrypto;
