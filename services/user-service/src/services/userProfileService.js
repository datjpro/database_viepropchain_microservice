/**
 * ========================================================================
 * USER PROFILE SERVICE - Business logic for user profile management
 * ========================================================================
 */

const UserProfile = require("../models/User");
const AuthUser = require("../models/AuthUser"); // User from Auth Service

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

  /**
   * Get user's properties from Property database
   */
  async getUserProperties(userId) {
    try {
      console.log(`🔍 getUserProperties - userId: ${userId}`);

      // Get user from Auth Service database
      const user = await AuthUser.findById(userId);
      console.log(
        `   User found:`,
        user
          ? {
              email: user.email,
              walletAddress: user.walletAddress,
            }
          : null
      );

      if (!user) {
        console.log(`   ⚠️ No user found for userId: ${userId}`);
        return [];
      }

      // Connect to Property model (from admin service)
      const Property = require("../models/Property");

      // Try both string and ObjectId
      const mongoose = require("mongoose");
      const userIdString = userId.toString();
      const userIdObj = new mongoose.Types.ObjectId(userId);

      // Find properties by owner (try both string and ObjectId)
      const propertiesByString = await Property.find({
        owner: userIdString,
      }).sort({ createdAt: -1 });

      const propertiesByObjectId = await Property.find({
        owner: userIdObj,
      }).sort({ createdAt: -1 });

      console.log(`   🔍 Search results:`);
      console.log(
        `      By string "${userIdString}": ${propertiesByString.length} properties`
      );
      console.log(
        `      By ObjectId: ${propertiesByObjectId.length} properties`
      );

      const properties =
        propertiesByString.length > 0
          ? propertiesByString
          : propertiesByObjectId;

      console.log(`   ✅ Returning ${properties.length} properties`);
      if (properties.length > 0) {
        console.log(
          `   📋 Properties:`,
          properties.map((p) => ({
            id: p._id,
            title: p.title,
            owner: p.owner,
            ownerType: typeof p.owner,
          }))
        );
      }

      return properties;
    } catch (error) {
      console.error("❌ Error getting user properties:", error);
      return [];
    }
  }

  /**
   * Get user's NFTs from blockchain
   */
  async getUserNFTs(userId) {
    try {
      console.log(`🔍 getUserNFTs - userId: ${userId}`);

      // Get user from Auth Service database
      const user = await AuthUser.findById(userId);
      console.log(
        `   User found:`,
        user
          ? {
              email: user.email,
              walletAddress: user.walletAddress,
            }
          : null
      );

      if (!user || !user.walletAddress) {
        console.log(
          `   ⚠️ No user or walletAddress found for userId: ${userId}`
        );
        return { nfts: [], balance: 0, summary: { total: 0 } };
      }

      // Call marketplace service to get NFTs
      const axios = require("axios");
      const walletAddress = user.walletAddress.toLowerCase();
      const marketplaceUrl = `http://localhost:4008/api/marketplace/my-nfts/${walletAddress}`;
      console.log(`   📡 Calling marketplace API: ${marketplaceUrl}`);

      const response = await axios.get(marketplaceUrl);
      console.log(`   📦 Marketplace response:`, {
        success: response.data.success,
        nftsCount: response.data.data?.nfts?.length || 0,
        balance: response.data.data?.balance,
        owner: response.data.data?.owner,
      });

      if (response.data.success) {
        console.log(
          `   ✅ Returning ${response.data.data.nfts?.length || 0} NFTs`
        );
        return response.data.data;
      }

      return { nfts: [], balance: 0, summary: { total: 0 } };
    } catch (error) {
      console.error("❌ Error getting user NFTs:", error.message);
      if (error.response) {
        console.error("   Response error:", error.response.data);
      }
      return { nfts: [], balance: 0, summary: { total: 0 } };
    }
  }

  /**
   * Get user's transaction history
   */
  async getUserTransactions(userId) {
    try {
      console.log(`🔍 getUserTransactions - userId: ${userId}`);

      // Get user from Auth Service database
      const user = await AuthUser.findById(userId);
      if (!user || !user.walletAddress) {
        console.log(`   ⚠️ No user or walletAddress for transactions`);
        return [];
      }

      // Call marketplace service to get transactions
      const axios = require("axios");
      const response = await axios.get(
        `http://localhost:4008/api/marketplace/transactions/${user.walletAddress}`
      );

      console.log(
        `   ✅ Found ${response.data.data?.length || 0} transactions`
      );

      if (response.data.success) {
        return response.data.data || [];
      }

      return [];
    } catch (error) {
      console.error("❌ Error getting user transactions:", error.message);
      return [];
    }
  }

  /**
   * Get complete user dashboard data (properties + NFTs + transactions)
   */
  async getUserDashboard(userId) {
    try {
      console.log(`🔍 getUserDashboard - userId: ${userId}`);
      console.log(`   userId type: ${typeof userId}`);

      // Try to find user with detailed logging
      console.log(`   🔍 Searching for user in 'users' collection...`);
      let user = await AuthUser.findById(userId);
      console.log(
        `   User found by ID:`,
        user ? `✅ ${user.email}` : "❌ NULL"
      );

      if (!user) {
        // Try to find with different approaches
        console.log(`   🔍 Trying alternative search methods...`);

        // Try as ObjectId string
        const mongoose = require("mongoose");
        try {
          const objectId = new mongoose.Types.ObjectId(userId);
          user = await AuthUser.findOne({ _id: objectId });
          console.log(`   By ObjectId:`, user ? `✅ ${user.email}` : "❌ NULL");
        } catch (err) {
          console.log(`   ⚠️ Invalid ObjectId format:`, err.message);
        }

        // List all users to debug
        const allUsers = await AuthUser.find()
          .limit(5)
          .select("email walletAddress");
        console.log(
          `   📋 Sample users in collection (${allUsers.length}):`,
          allUsers.map((u) => ({ id: u._id.toString(), email: u.email }))
        );

        if (!user) {
          throw new Error(`User not found with ID: ${userId}`);
        }
      }

      const [properties, nfts, transactions] = await Promise.all([
        this.getUserProperties(userId),
        this.getUserNFTs(userId),
        this.getUserTransactions(userId),
      ]);

      // Calculate stats
      const nftsList = nfts.nfts || [];
      const totalValue = nftsList.reduce((sum, nft) => {
        return sum + (parseFloat(nft.price) || 0);
      }, 0);

      console.log(`📊 Dashboard summary for ${user.email}:`, {
        properties: properties.length,
        nfts: nftsList.length,
        transactions: transactions.length,
        totalValue: (totalValue / 1e18).toFixed(4),
      });

      return {
        profile: {
          email: user.email,
          walletAddress: user.walletAddress,
          displayName: user.profile?.displayName,
          avatar: user.profile?.avatar,
          createdAt: user.createdAt,
        },
        stats: {
          totalProperties: properties.length,
          totalNFTs: nftsList.length,
          totalTransactions: transactions.length,
          totalValue: totalValue / 1e18, // Convert to ETH
        },
        properties,
        nfts: nftsList,
        transactions,
      };
    } catch (error) {
      throw new Error(`Failed to get user dashboard: ${error.message}`);
    }
  }
}

module.exports = new UserProfileService();
