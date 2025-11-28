const crypto = require("crypto");

/**
 * Encryption Service
 *
 * E2EE Flow:
 * 1. Client generates RSA key pair (public/private)
 * 2. Public key stored on server
 * 3. For each message:
 *    - Client generates random AES-256 key
 *    - Encrypts message with AES key
 *    - Encrypts AES key with recipient's public RSA key
 *    - Sends: encrypted_message + encrypted_key + iv
 * 4. Server stores encrypted data (cannot decrypt)
 * 5. Recipient decrypts AES key with their private RSA key
 * 6. Decrypts message with AES key
 */

class EncryptionService {
  /**
   * Generate RSA key pair on server (for demo/testing)
   * In production, client should generate this
   */
  generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    return { publicKey, privateKey };
  }

  /**
   * Encrypt message with AES-256 (symmetric encryption)
   * Returns: { encrypted, key, iv }
   */
  encryptMessage(plaintext) {
    // Generate random AES key (256 bits)
    const aesKey = crypto.randomBytes(32);

    // Generate random IV (initialization vector)
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv("aes-256-cbc", aesKey, iv);

    // Encrypt
    let encrypted = cipher.update(plaintext, "utf8", "base64");
    encrypted += cipher.final("base64");

    return {
      encrypted,
      aesKey: aesKey.toString("base64"),
      iv: iv.toString("base64"),
    };
  }

  /**
   * Decrypt message with AES-256
   */
  decryptMessage(encrypted, aesKey, iv) {
    try {
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(aesKey, "base64"),
        Buffer.from(iv, "base64")
      );

      let decrypted = decipher.update(encrypted, "base64", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      throw new Error("Decryption failed: " + error.message);
    }
  }

  /**
   * Encrypt AES key with recipient's RSA public key
   */
  encryptAESKey(aesKey, publicKey) {
    try {
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(aesKey, "base64")
      );

      return encrypted.toString("base64");
    } catch (error) {
      throw new Error("AES key encryption failed: " + error.message);
    }
  }

  /**
   * Decrypt AES key with private RSA key
   */
  decryptAESKey(encryptedKey, privateKey) {
    try {
      const decrypted = crypto.privateDecrypt(
        {
          key: privateKey,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: "sha256",
        },
        Buffer.from(encryptedKey, "base64")
      );

      return decrypted.toString("base64");
    } catch (error) {
      throw new Error("AES key decryption failed: " + error.message);
    }
  }

  /**
   * Prepare encrypted message for storage
   * Encrypts message and generates encrypted keys for all participants
   */
  prepareE2EEMessage(plaintext, participantPublicKeys) {
    // 1. Encrypt message with random AES key
    const { encrypted, aesKey, iv } = this.encryptMessage(plaintext);

    // 2. Encrypt AES key for each participant
    const encryptedKeys = {};
    for (const [userId, publicKey] of Object.entries(participantPublicKeys)) {
      encryptedKeys[userId] = this.encryptAESKey(aesKey, publicKey);
    }

    return {
      encryptedMessage: encrypted,
      encryptedKeys, // Map of userId -> encrypted AES key
      iv,
    };
  }

  /**
   * Check if chat type requires E2EE
   */
  requiresE2EE(chatType) {
    return chatType === "private";
  }

  /**
   * Check if chat type is server-side (admin readable)
   */
  isServerSide(chatType) {
    return ["marketplace", "support", "dispute"].includes(chatType);
  }

  /**
   * Get encryption type for chat
   */
  getEncryptionType(chatType) {
    if (this.requiresE2EE(chatType)) {
      return "e2ee";
    } else if (this.isServerSide(chatType)) {
      return "server-side";
    }
    return "none";
  }

  /**
   * Hash public key for fingerprint/version tracking
   */
  getKeyFingerprint(publicKey) {
    return crypto
      .createHash("sha256")
      .update(publicKey)
      .digest("hex")
      .substring(0, 16);
  }
}

module.exports = new EncryptionService();
