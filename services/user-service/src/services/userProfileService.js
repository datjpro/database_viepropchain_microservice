/**
 * ========================================================================
 * USER PROFILE SERVICE - Business logic for user profile management
 * ========================================================================
 */

const UserProfile = require("../models/User");

class UserProfileService {
  /**
   * Get or create user profile
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
   * Get user profile by wallet address
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
   * Update KYC status (called by KYC Service)
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
