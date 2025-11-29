/**
 * ========================================================================
 * PROPERTY CONTROLLER - Handle property CRUD requests
 * ========================================================================
 */

const propertyService = require("../services/propertyService");

class PropertyController {
  /**
   * STEP 1: Create property DRAFT (no images/docs required)
   */
  async createProperty(req, res) {
    try {
      const propertyData = req.body;

      // Validate required fields for DRAFT
      if (
        (!propertyData.name && !propertyData.title) ||
        !propertyData.price ||
        !propertyData.description ||
        !propertyData.legalDocumentId
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: name/title, description, price, legalDocumentId (Số GCN)",
        });
      }

      // 🔒 VALIDATE: Check if legalDocumentId already exists
      const Property = require("../models/Property");
      const existingProperty = await Property.findOne({
        legalDocumentId: propertyData.legalDocumentId.toUpperCase(),
      });

      if (existingProperty) {
        return res.status(409).json({
          success: false,
          error: "Nhà này đã có người đăng!",
          message: `Số GCN "${propertyData.legalDocumentId}" đã được sử dụng bởi property khác (ID: ${existingProperty._id})`,
          existingPropertyId: existingProperty._id,
        });
      }

      // 🔒 SECURITY: Get owner from JWT token
      let ownerId = req.user.email.toLowerCase();
      let ownerUserId = req.user.userId;

      // Admin can create for other users
      if (req.user.role === "admin" && propertyData.ownerId) {
        ownerId = propertyData.ownerId.toLowerCase();
        console.log(`👮 Admin creating property for: ${ownerId}`);
      }

      // Remove owner/ownerId from body
      delete propertyData.owner;
      delete propertyData.ownerId;

      // Set owner from authenticated user
      propertyData.owner = ownerId;
      if (req.user.walletAddress) {
        propertyData.ownerWallet = req.user.walletAddress;
      }

      // 🔍 Check user KYC status (call KYC service)
      let kycVerified = false;
      try {
        const axios = require("axios");
        const KYC_SERVICE_URL =
          process.env.KYC_SERVICE_URL || "http://localhost:4007";

        const kycResponse = await axios.get(
          `${KYC_SERVICE_URL}/api/kyc/status/${ownerUserId}`,
          { timeout: 3000 }
        );

        if (kycResponse.data.success && kycResponse.data.data) {
          kycVerified = kycResponse.data.data.kycLevel >= 2; // Level 2+ = verified
          propertyData.kycStatus = kycVerified ? "verified" : "pending";
        }
      } catch (error) {
        console.warn(`⚠️ KYC check failed:`, error.message);
        propertyData.kycStatus = "pending";
      }

      // Set verification status based on KYC
      propertyData.verificationStatus = kycVerified
        ? "pending_approval"
        : "pending_kyc";

      // Set as DRAFT initially (no images/docs yet)
      propertyData.status = "draft";
      propertyData.images = [];
      propertyData.legalDocuments = [];

      console.log(
        `🔄 Creating DRAFT property: ${
          propertyData.title || propertyData.name
        } (Owner: ${ownerId}, KYC: ${kycVerified ? "✅" : "❌"})`
      );

      const property = await propertyService.createProperty(propertyData);

      console.log(`   ✅ Property DRAFT created: ${property._id}`);

      res.json({
        success: true,
        message: "Property draft created successfully",
        data: property,
        kycRequired: !kycVerified, // Tell frontend if KYC is needed
      });
    } catch (error) {
      console.error("❌ Create property error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to create property",
        message: error.message,
      });
    }
  }

  /**
   * STEP 2: Upload images to property (multipart/form-data)
   */
  async uploadImages(req, res) {
    try {
      const { id } = req.params;

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No images uploaded. Please select at least 1 image file.",
        });
      }

      const Property = require("../models/Property");
      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      // Upload each file to IPFS Service
      const axios = require("axios");
      const FormData = require("form-data");
      const IPFS_SERVICE_URL =
        process.env.IPFS_SERVICE_URL || "http://localhost:4002";

      const uploadedUrls = [];

      for (const file of req.files) {
        try {
          // Create form data for IPFS upload
          const formData = new FormData();
          formData.append("file", file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
          });

          // Upload to IPFS service
          const ipfsResponse = await axios.post(
            `${IPFS_SERVICE_URL}/upload/image`,
            formData,
            {
              headers: formData.getHeaders(),
              timeout: 30000,
            }
          );

          if (ipfsResponse.data.success && ipfsResponse.data.data) {
            const ipfsUrl =
              ipfsResponse.data.data.url ||
              `https://ipfs.io/ipfs/${ipfsResponse.data.data.cid}`;
            uploadedUrls.push(ipfsUrl);
            console.log(`✅ Uploaded to IPFS: ${ipfsUrl}`);
          }
        } catch (uploadError) {
          console.error(
            `❌ Failed to upload ${file.originalname}:`,
            uploadError.message
          );
          return res.status(500).json({
            success: false,
            error: `Failed to upload image to IPFS: ${uploadError.message}`,
          });
        }
      }

      // 🔍 Check for duplicate images in other properties
      for (const url of uploadedUrls) {
        const existing = await Property.findOne({
          images: url,
          _id: { $ne: id },
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            error: `Image already used in another property (ID: ${existing._id})`,
            duplicateUrl: url,
          });
        }
      }

      // Add new images to property
      property.images = [...new Set([...property.images, ...uploadedUrls])];
      await property.save();

      console.log(
        `📷 Images uploaded to property ${id}: ${uploadedUrls.length} images`
      );

      res.json({
        success: true,
        message: `${uploadedUrls.length} image(s) uploaded successfully`,
        data: property,
        uploadedUrls,
      });
    } catch (error) {
      console.error("❌ Upload images error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to upload images",
        message: error.message,
      });
    }
  }

  /**
   * STEP 3: Upload legal documents to property (multipart/form-data)
   */
  async uploadDocuments(req, res) {
    try {
      const { id } = req.params;

      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error:
            "No documents uploaded. Please select at least 1 document file.",
        });
      }

      const Property = require("../models/Property");
      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      // Upload each file to IPFS Service
      const axios = require("axios");
      const FormData = require("form-data");
      const IPFS_SERVICE_URL =
        process.env.IPFS_SERVICE_URL || "http://localhost:4002";

      const uploadedUrls = [];

      for (const file of req.files) {
        try {
          // Create form data for IPFS upload
          const formData = new FormData();
          formData.append("file", file.buffer, {
            filename: file.originalname,
            contentType: file.mimetype,
          });

          // Upload to IPFS service (use /document endpoint for legal docs)
          const ipfsResponse = await axios.post(
            `${IPFS_SERVICE_URL}/upload/document`,
            formData,
            {
              headers: formData.getHeaders(),
              timeout: 30000,
            }
          );

          if (ipfsResponse.data.success && ipfsResponse.data.data) {
            const ipfsUrl =
              ipfsResponse.data.data.url ||
              `https://ipfs.io/ipfs/${ipfsResponse.data.data.cid}`;
            uploadedUrls.push(ipfsUrl);
            console.log(`🔒 Uploaded legal doc to IPFS: ${ipfsUrl}`);
          }
        } catch (uploadError) {
          console.error(
            `❌ Failed to upload ${file.originalname}:`,
            uploadError.message
          );
          return res.status(500).json({
            success: false,
            error: `Failed to upload document to IPFS: ${uploadError.message}`,
          });
        }
      }

      // 🔍 Check for duplicate documents in other properties
      for (const url of uploadedUrls) {
        const existing = await Property.findOne({
          legalDocuments: url,
          _id: { $ne: id },
        });

        if (existing) {
          return res.status(400).json({
            success: false,
            error: `Document already used in another property (ID: ${existing._id})`,
            duplicateUrl: url,
          });
        }
      }

      // Add new documents to property
      property.legalDocuments = [
        ...new Set([...property.legalDocuments, ...uploadedUrls]),
      ];
      await property.save();

      console.log(
        `📄 Documents uploaded to property ${id}: ${uploadedUrls.length} docs`
      );

      res.json({
        success: true,
        message: `${uploadedUrls.length} document(s) uploaded successfully`,
        data: property,
        uploadedUrls,
      });
    } catch (error) {
      console.error("❌ Upload documents error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to upload documents",
        message: error.message,
      });
    }
  }

  /**
   * STEP 4: Submit property for approval (draft -> pending)
   */
  async submitProperty(req, res) {
    try {
      const { id } = req.params;
      const Property = require("../models/Property");

      const property = await Property.findById(id);
      if (!property) {
        return res.status(404).json({
          success: false,
          error: "Property not found",
        });
      }

      // Validate: Must have at least 1 image and 1 document
      if (!property.images || property.images.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Please upload at least 1 image before submitting",
        });
      }

      if (!property.legalDocuments || property.legalDocuments.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Please upload at least 1 legal document before submitting",
        });
      }

      // Change status from draft -> active
      property.status = "active";

      // Keep verificationStatus as is (pending_kyc or pending_approval)
      await property.save();

      console.log(`✅ Property ${id} submitted for approval`);

      res.json({
        success: true,
        message: "Property submitted successfully",
        data: property,
        kycRequired: property.verificationStatus === "pending_kyc",
      });
    } catch (error) {
      console.error("❌ Submit property error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to submit property",
        message: error.message,
      });
    }
  }

  /**
   * Get all properties
   */
  async getProperties(req, res) {
    try {
      const result = await propertyService.getProperties(req.query);

      res.json({
        success: true,
        data: result.properties,
        pagination: result.pagination,
      });
    } catch (error) {
      console.error("❌ Get properties error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get properties",
        message: error.message,
      });
    }
  }

  /**
   * Get properties by owner (user email or ID)
   */
  async getPropertiesByOwner(req, res) {
    try {
      const owner = req.params.owner.toLowerCase();
      console.log(`🔍 Getting properties for owner: ${owner}`);

      const properties = await propertyService.getPropertiesByOwner(owner);

      console.log(`   ✅ Found ${properties.length} properties`);

      res.json({
        success: true,
        data: properties,
        count: properties.length,
      });
    } catch (error) {
      console.error("❌ Get properties by owner error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get properties",
        message: error.message,
      });
    }
  }

  /**
   * Get property by ID
   */
  async getPropertyById(req, res) {
    try {
      const property = await propertyService.getPropertyById(req.params.id);

      res.json({
        success: true,
        data: property,
      });
    } catch (error) {
      console.error("❌ Get property error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Update property
   */
  async updateProperty(req, res) {
    try {
      const property = await propertyService.updateProperty(
        req.params.id,
        req.body
      );

      console.log(`✅ Property updated: ${property._id}`);

      res.json({
        success: true,
        message: "Property updated",
        data: property,
      });
    } catch (error) {
      console.error("❌ Update property error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Delete property
   */
  async deleteProperty(req, res) {
    try {
      const property = await propertyService.deleteProperty(req.params.id);

      console.log(`✅ Property archived: ${property._id}`);

      res.json({
        success: true,
        message: "Property archived",
      });
    } catch (error) {
      console.error("❌ Delete property error:", error.message);
      const status = error.message.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await propertyService.getStatistics();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("❌ Get stats error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get statistics",
        message: error.message,
      });
    }
  }
}

module.exports = new PropertyController();
