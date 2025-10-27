/**
 * ========================================================================
 * USER PROFILE SERVICE - Business logic for user profile management
 * ========================================================================
 */

const UserProfile = require("../models/User");

class UserProfileService {
  /**
   * Get or create user profile by userId (NEW - for Gmail OAuth users)
   */
  async getOrCreateProfileByUserId(userId, email) {
    try {
      let profile = await UserProfile.findOne({ userId });

      if (!profile) {
        profile = new UserProfile({
          userId,
          email: email.toLowerCase(),
          createdAt: new Date(),
        });
        await profile.save();
        console.log(
          `✅ Created new user profile for userId: ${userId}, email: ${email}`
        );
      }

      return profile;
    } catch (error) {
      throw new Error(
        `Failed to get/create profile by userId: ${error.message}`
      );
    }
  }

  /**
   * Get profile by userId (NEW - PRIMARY method)
   */
  async getProfileByUserId(userId) {
    try {
      const profile = await UserProfile.findOne({ userId });

      if (!profile) {
        throw new Error("User profile not found");
      }

      return profile;
    } catch (error) {
      throw new Error(`Failed to get profile by userId: ${error.message}`);
    }
  }

  /**
   * Get or create user profile by wallet (BACKWARD COMPATIBILITY)
   */
  async getOrCreateProfile(walletAddress) {
    try {
      let profile = await UserProfile.findOne({
        walletAddress: walletAddress.toLowerCase(),
      });

      if (!profile) {
        profile = new UserProfile({
          walletAddress: walletAddress.toLowerCase(),
          createdAt: new Date(),
        });
        await profile.save();
        console.log(`✅ Created new user profile: ${walletAddress}`);
      }

      return profile;
    } catch (error) {
      throw new Error(`Failed to get/create profile: ${error.message}`);
    }
  }

  /**
   * Get user profile by wallet address (BACKWARD COMPATIBILITY)
   */
  async getProfile(walletAddress) {
    try {
      const profile = await UserProfile.findOne({
        walletAddress: walletAddress.toLowerCase(),
      });

      if (!profile) {
        throw new Error("User profile not found");
      }

      return profile;
    } catch (error) {
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }

  /**
   * Update basic info
   */
  async updateBasicInfo(walletAddress, basicInfoData) {
    try {
      const { firstName, lastName, dateOfBirth, gender, nationality } =
        basicInfoData;

      const profile = await UserProfile.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $set: {
            "basicInfo.firstName": firstName,
            "basicInfo.lastName": lastName,
            "basicInfo.fullName":
              firstName && lastName ? `${firstName} ${lastName}` : undefined,
            "basicInfo.dateOfBirth": dateOfBirth,
            "basicInfo.gender": gender,
            "basicInfo.nationality": nationality,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!profile) {
        throw new Error("User profile not found");
      }

      console.log(`✅ Basic info updated: ${walletAddress}`);
      return profile;
    } catch (error) {
      throw new Error(`Failed to update basic info: ${error.message}`);
    }
  }

  /**
   * Update contact info
   */
  async updateContactInfo(walletAddress, contactInfoData) {
    try {
      const { email, phone, address } = contactInfoData;

      const profile = await UserProfile.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $set: {
            "contactInfo.email": email,
            "contactInfo.phone": phone,
            "contactInfo.address": address,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!profile) {
        throw new Error("User profile not found");
      }

      console.log(`✅ Contact info updated: ${walletAddress}`);
      return profile;
    } catch (error) {
      throw new Error(`Failed to update contact info: ${error.message}`);
    }
  }

  /**
   * Update profile (avatar, bio, etc.)
   */
  async updateProfile(walletAddress, profileData) {
    try {
      const { avatar, bio, occupation, company, website, socialMedia } =
        profileData;

      const profile = await UserProfile.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $set: {
            "profile.avatar": avatar,
            "profile.bio": bio,
            "profile.occupation": occupation,
            "profile.company": company,
            "profile.website": website,
            "profile.socialMedia": socialMedia,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!profile) {
        throw new Error("User profile not found");
      }

      console.log(`✅ Profile updated: ${walletAddress}`);
      return profile;
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Update preferences
   */
  async updatePreferences(walletAddress, preferencesData) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $set: {
            preferences: preferencesData,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!profile) {
        throw new Error("User profile not found");
      }

      console.log(`✅ Preferences updated: ${walletAddress}`);
      return profile;
    } catch (error) {
      throw new Error(`Failed to update preferences: ${error.message}`);
    }
  }

  /**
   * Update KYC status by userId (NEW - PRIMARY method for Gmail OAuth users)
   * Called by KYC Service after user submits KYC
   */
  async updateKYCStatusByUserId(userId, email, kycData) {
    try {
      const { isVerified, verificationLevel, kycId, walletAddress } = kycData;

      // Try to update existing profile
      let profile = await UserProfile.findOneAndUpdate(
        { userId },
        {
          $set: {
            "kycStatus.isVerified": isVerified,
            "kycStatus.verificationLevel": verificationLevel,
            "kycStatus.verifiedAt": isVerified ? new Date() : undefined,
            "kycStatus.kycId": kycId,
            walletAddress: walletAddress || undefined,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      // If profile doesn't exist, create it with KYC info
      if (!profile) {
        console.log(
          `⚠️ Profile not found for userId: ${userId}, creating new profile with KYC data...`
        );

        profile = new UserProfile({
          userId,
          email: email.toLowerCase(),
          walletAddress: walletAddress || undefined,
          kycStatus: {
            isVerified,
            verificationLevel,
            verifiedAt: isVerified ? new Date() : undefined,
            kycId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await profile.save();
        console.log(
          `✅ Auto-created profile with KYC status for userId: ${userId}, email: ${email}`
        );
      } else {
        console.log(`✅ KYC status updated for userId: ${userId}`);
      }

      return profile;
    } catch (error) {
      throw new Error(
        `Failed to update KYC status by userId: ${error.message}`
      );
    }
  }

  /**
   * Update wallet address when user links wallet (NEW)
   */
  async updateWalletAddress(userId, walletAddress) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { userId },
        {
          $set: {
            walletAddress: walletAddress.toLowerCase(),
            walletLinkedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!profile) {
        throw new Error("User profile not found");
      }

      console.log(
        `✅ Wallet linked to profile: userId=${userId}, wallet=${walletAddress}`
      );
      return profile;
    } catch (error) {
      throw new Error(`Failed to update wallet address: ${error.message}`);
    }
  }

  /**
   * Update KYC status by wallet (BACKWARD COMPATIBILITY)
   * Auto-creates profile if not exists
   */
  async updateKYCStatus(walletAddress, kycData) {
    try {
      const { isVerified, verificationLevel, kycId } = kycData;

      // Try to update existing profile
      let profile = await UserProfile.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $set: {
            "kycStatus.isVerified": isVerified,
            "kycStatus.verificationLevel": verificationLevel,
            "kycStatus.verifiedAt": isVerified ? new Date() : undefined,
            "kycStatus.kycId": kycId,
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      // If profile doesn't exist, create it with KYC info
      if (!profile) {
        console.log(
          `⚠️ Profile not found for ${walletAddress}, creating new profile with KYC data...`
        );

        profile = new UserProfile({
          walletAddress: walletAddress.toLowerCase(),
          kycStatus: {
            isVerified,
            verificationLevel,
            verifiedAt: isVerified ? new Date() : undefined,
            kycId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await profile.save();
        console.log(
          `✅ Auto-created profile with KYC status: ${walletAddress}`
        );
      } else {
        console.log(`✅ KYC status updated: ${walletAddress}`);
      }

      return profile;
    } catch (error) {
      throw new Error(`Failed to update KYC status: ${error.message}`);
    }
  }

  /**
   * Update activity stats
   */
  async updateStats(walletAddress, statsData) {
    try {
      const profile = await UserProfile.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        {
          $inc: {
            "stats.propertiesOwned": statsData.propertiesOwned || 0,
            "stats.nftsOwned": statsData.nftsOwned || 0,
            "stats.transactionsCount": statsData.transactionsCount || 0,
          },
          $set: {
            "stats.lastActive": new Date(),
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!profile) {
        throw new Error("User profile not found");
      }

      return profile;
    } catch (error) {
      throw new Error(`Failed to update stats: ${error.message}`);
    }
  }

  /**
   * Search users
   */
  async searchUsers(filters) {
    try {
      const {
        query,
        userType,
        kycVerified,
        status,
        page = 1,
        limit = 20,
      } = filters;

      const filter = {};

      if (query) {
        filter.$or = [
          { walletAddress: { $regex: query, $options: "i" } },
          { "basicInfo.fullName": { $regex: query, $options: "i" } },
          { "contactInfo.email": { $regex: query, $options: "i" } },
        ];
      }

      if (userType) filter.userType = userType;
      if (kycVerified !== undefined)
        filter["kycStatus.isVerified"] = kycVerified;
      if (status) filter.status = status;

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        UserProfile.find(filter)
          .select("-__v")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        UserProfile.countDocuments(filter),
      ]);

      return {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new Error(`Failed to search users: ${error.message}`);
    }
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    try {
      const [totalUsers, verifiedUsers, byUserType, byStatus, recentUsers] =
        await Promise.all([
          UserProfile.countDocuments(),
          UserProfile.countDocuments({ "kycStatus.isVerified": true }),
          UserProfile.aggregate([
            { $group: { _id: "$userType", count: { $sum: 1 } } },
          ]),
          UserProfile.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
          ]),
          UserProfile.countDocuments({
            createdAt: {
              $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          }),
        ]);

      return {
        totalUsers,
        verifiedUsers,
        byUserType,
        byStatus,
        recentUsers,
      };
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }
}

module.exports = new UserProfileService();
