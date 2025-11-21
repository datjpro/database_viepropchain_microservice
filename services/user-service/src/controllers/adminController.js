/**
 * ========================================================================
 * ADMIN CONTROLLER - User Management
 * ========================================================================
 */

const User = require("../../shared/models/User");

class AdminController {
  /**
   * Get all users with pagination and filters
   */
  async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        role = "",
        sortBy = "createdAt",
        order = "desc",
      } = req.query;

      const query = {};

      // Search by email or wallet address
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: "i" } },
          { walletAddress: { $regex: search, $options: "i" } },
          { "profile.displayName": { $regex: search, $options: "i" } },
        ];
      }

      // Filter by role
      if (role) {
        query.role = role;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const sortOrder = order === "asc" ? 1 : -1;

      const [users, total] = await Promise.all([
        User.find(query)
          .select("-sessionToken -nonce")
          .sort({ [sortBy]: sortOrder })
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        User.countDocuments(query),
      ]);

      res.json({
        success: true,
        data: users,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("❌ Get all users error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get users",
        message: error.message,
      });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId)
        .select("-sessionToken -nonce")
        .lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("❌ Get user by ID error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get user",
        message: error.message,
      });
    }
  }

  /**
   * Update user role (admin/user)
   */
  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Validate role
      if (!["user", "admin"].includes(role)) {
        return res.status(400).json({
          success: false,
          error: "Invalid role. Must be 'user' or 'admin'",
        });
      }

      // Prevent self-demotion
      if (req.user.userId === userId && role === "user") {
        return res.status(400).json({
          success: false,
          error: "Cannot demote yourself from admin",
        });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { role, updatedAt: new Date() },
        { new: true }
      ).select("-sessionToken -nonce");

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      console.log(`✅ User ${user.email} role updated to ${role}`);

      res.json({
        success: true,
        message: `User role updated to ${role}`,
        data: user,
      });
    } catch (error) {
      console.error("❌ Update user role error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update user role",
        message: error.message,
      });
    }
  }

  /**
   * Delete user (soft delete - deactivate)
   */
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;

      // Prevent self-deletion
      if (req.user.userId === userId) {
        return res.status(400).json({
          success: false,
          error: "Cannot delete your own account",
        });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        {
          isActive: false,
          deactivatedAt: new Date(),
          updatedAt: new Date(),
        },
        { new: true }
      ).select("-sessionToken -nonce");

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      console.log(`✅ User ${user.email} deactivated`);

      res.json({
        success: true,
        message: "User deactivated successfully",
        data: user,
      });
    } catch (error) {
      console.error("❌ Delete user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete user",
        message: error.message,
      });
    }
  }

  /**
   * Reactivate user
   */
  async reactivateUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByIdAndUpdate(
        userId,
        {
          isActive: true,
          $unset: { deactivatedAt: 1 },
          updatedAt: new Date(),
        },
        { new: true }
      ).select("-sessionToken -nonce");

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      console.log(`✅ User ${user.email} reactivated`);

      res.json({
        success: true,
        message: "User reactivated successfully",
        data: user,
      });
    } catch (error) {
      console.error("❌ Reactivate user error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to reactivate user",
        message: error.message,
      });
    }
  }

  /**
   * Get admin statistics
   */
  async getStatistics(req, res) {
    try {
      const [
        totalUsers,
        totalAdmins,
        activeUsers,
        usersWithWallet,
        recentUsers,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ isActive: { $ne: false } }),
        User.countDocuments({ walletAddress: { $exists: true, $ne: null } }),
        User.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalUsers,
          totalAdmins,
          activeUsers,
          usersWithWallet,
          recentUsers,
          inactiveUsers: totalUsers - activeUsers,
        },
      });
    } catch (error) {
      console.error("❌ Get statistics error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to get statistics",
        message: error.message,
      });
    }
  }
}

module.exports = new AdminController();
