const UserKey = require("../models/UserKey");
const encryptionService = require("../services/encryptionService");

class KeyController {
  /**
   * Register user's public key
   * POST /api/messages/keys/register
   */
  async registerPublicKey(req, res) {
    try {
      const { public_key, device_info } = req.body;
      const userId = req.userId;

      if (!public_key) {
        return res.status(400).json({
          success: false,
          error: "Public key is required",
        });
      }

      // Generate fingerprint
      const key_fingerprint = encryptionService.getKeyFingerprint(public_key);

      // Deactivate old keys
      await UserKey.updateMany(
        { user_id: userId, active: true },
        { $set: { active: false } }
      );

      // Save new key
      const userKey = new UserKey({
        user_id: userId,
        public_key,
        key_fingerprint,
        device_info,
        active: true,
      });

      await userKey.save();

      res.json({
        success: true,
        data: {
          key_fingerprint,
          key_version: userKey.key_version,
        },
        message: "Public key registered successfully",
      });
    } catch (error) {
      console.error("❌ Register public key error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get public key for a user
   * GET /api/messages/keys/:userId
   */
  async getPublicKey(req, res) {
    try {
      const { userId } = req.params;

      const userKey = await UserKey.findOne({
        user_id: userId,
        active: true,
      });

      if (!userKey) {
        return res.status(404).json({
          success: false,
          error: "Public key not found for this user",
        });
      }

      res.json({
        success: true,
        data: {
          user_id: userKey.user_id,
          public_key: userKey.public_key,
          key_fingerprint: userKey.key_fingerprint,
          key_version: userKey.key_version,
        },
      });
    } catch (error) {
      console.error("❌ Get public key error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get public keys for multiple users
   * POST /api/messages/keys/batch
   */
  async getBatchPublicKeys(req, res) {
    try {
      const { user_ids } = req.body;

      if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: "user_ids array is required",
        });
      }

      const keys = await UserKey.find({
        user_id: { $in: user_ids },
        active: true,
      });

      const keyMap = {};
      keys.forEach((key) => {
        keyMap[key.user_id.toString()] = {
          public_key: key.public_key,
          key_fingerprint: key.key_fingerprint,
          key_version: key.key_version,
        };
      });

      res.json({
        success: true,
        data: keyMap,
      });
    } catch (error) {
      console.error("❌ Get batch public keys error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Revoke current public key
   * POST /api/messages/keys/revoke
   */
  async revokeKey(req, res) {
    try {
      const { reason } = req.body;
      const userId = req.userId;

      await UserKey.updateMany(
        { user_id: userId, active: true },
        {
          $set: {
            active: false,
            revoked_at: new Date(),
            revoke_reason: reason || "User requested",
          },
        }
      );

      res.json({
        success: true,
        message: "Public key revoked successfully",
      });
    } catch (error) {
      console.error("❌ Revoke key error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get my active key
   * GET /api/messages/keys/me
   */
  async getMyKey(req, res) {
    try {
      const userId = req.userId;

      const userKey = await UserKey.findOne({
        user_id: userId,
        active: true,
      });

      if (!userKey) {
        return res.json({
          success: true,
          data: null,
          message: "No active key found. Please register a public key.",
        });
      }

      res.json({
        success: true,
        data: {
          key_fingerprint: userKey.key_fingerprint,
          key_version: userKey.key_version,
          created_at: userKey.createdAt,
          device_info: userKey.device_info,
        },
      });
    } catch (error) {
      console.error("❌ Get my key error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new KeyController();
