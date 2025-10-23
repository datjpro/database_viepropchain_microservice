/**
 * ========================================================================
 * UPLOAD CONTROLLER - Handle upload requests
 * ========================================================================
 */

const pinataService = require("../services/pinataService");
const ipfsMetadataService = require("../services/ipfsMetadataService");

class UploadController {
  /**
   * Upload image
   */
  async uploadImage(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file provided",
        });
      }

      const { propertyId } = req.body;

      console.log(`🔄 Uploading image: ${req.file.originalname}`);

      // Upload to Pinata
      const result = await pinataService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        {
          type: "image",
          propertyId: propertyId || "unknown",
        }
      );

      // Save to database
      await ipfsMetadataService.saveMetadata({
        cid: result.cid,
        type: "image",
        content: {
          filename: req.file.originalname,
          size: req.file.size,
          mimeType: req.file.mimetype,
        },
        propertyId: propertyId || null,
        pinataInfo: {
          pinataId: result.pinataId,
          pinStatus: "pinned",
          pinSize: result.pinSize,
        },
        gatewayUrls: {
          pinata: result.url,
          ipfs: result.ipfsUrl,
        },
      });

      console.log(`   ✅ Image uploaded: ${result.cid}`);

      res.json({
        success: true,
        message: "Image uploaded to IPFS",
        data: {
          cid: result.cid,
          url: result.url,
          ipfsUrl: result.ipfsUrl,
          filename: req.file.originalname,
          size: req.file.size,
        },
      });
    } catch (error) {
      console.error("❌ Upload image error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to upload image",
        message: error.message,
      });
    }
  }

  /**
   * Upload document
   */
  async uploadDocument(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: "No file provided",
        });
      }

      const { propertyId, documentType, documentName } = req.body;

      console.log(`🔄 Uploading document: ${req.file.originalname}`);

      // Upload to Pinata
      const result = await pinataService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        {
          type: "document",
          documentType: documentType || "legal",
          propertyId: propertyId || "unknown",
        }
      );

      // Save to database
      await ipfsMetadataService.saveMetadata({
        cid: result.cid,
        type: "document",
        content: {
          filename: req.file.originalname,
          documentName: documentName || req.file.originalname,
          documentType: documentType || "legal",
          size: req.file.size,
          mimeType: req.file.mimetype,
        },
        propertyId: propertyId || null,
        pinataInfo: {
          pinataId: result.pinataId,
          pinStatus: "pinned",
        },
        gatewayUrls: {
          pinata: result.url,
          ipfs: result.ipfsUrl,
        },
      });

      console.log(`   ✅ Document uploaded: ${result.cid}`);

      res.json({
        success: true,
        message: "Document uploaded to IPFS",
        data: {
          cid: result.cid,
          url: result.url,
          ipfsUrl: result.ipfsUrl,
          filename: req.file.originalname,
          documentName: documentName || req.file.originalname,
          documentType: documentType || "legal",
        },
      });
    } catch (error) {
      console.error("❌ Upload document error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to upload document",
        message: error.message,
      });
    }
  }

  /**
   * Upload metadata JSON
   * NEW: Auto-generate metadata from propertyId if provided
   */
  async uploadMetadata(req, res) {
    try {
      const { propertyId, imageCID, metadata: customMetadata } = req.body;

      let metadata;

      // Option 1: Auto-generate metadata from propertyId
      if (propertyId) {
        console.log(`🔄 Auto-generating metadata for property: ${propertyId}`);

        try {
          // Fetch property data from Admin Service
          const axios = require("axios");
          const adminServiceUrl =
            process.env.ADMIN_SERVICE_URL || "http://localhost:4003";

          const response = await axios.get(
            `${adminServiceUrl}/properties/${propertyId}`
          );

          if (!response.data.success) {
            throw new Error("Property not found in Admin Service");
          }

          const property = response.data.data;

          // Build metadata from property data
          metadata = {
            name: property.title || property.name || "Untitled Property",
            description:
              property.description || "Real estate property on ViePropChain",
            image: imageCID ? `ipfs://${imageCID}` : undefined,
            external_url: `https://viepropchain.com/property/${propertyId}`,
            attributes: [
              {
                trait_type: "Property Type",
                value: property.propertyType || "Unknown",
              },
              {
                trait_type: "Area",
                value: property.area ? `${property.area} sqm` : "N/A",
              },
              {
                trait_type: "Bedrooms",
                value: property.bedrooms || 0,
              },
              {
                trait_type: "Bathrooms",
                value: property.bathrooms || 0,
              },
              {
                trait_type: "Location",
                value: property.address
                  ? `${property.address.district || ""}, ${
                      property.address.city || ""
                    }`.trim()
                  : "Unknown",
              },
              {
                trait_type: "Legal Status",
                value: property.legalStatus || "pending",
              },
            ],
          };

          console.log(`   ✅ Auto-generated metadata for: ${metadata.name}`);
        } catch (error) {
          console.error("❌ Failed to fetch property data:", error.message);
          return res.status(400).json({
            success: false,
            error: "Failed to generate metadata from propertyId",
            message: error.message,
          });
        }
      }
      // Option 2: Use custom metadata provided by user
      else if (customMetadata && Object.keys(customMetadata).length > 0) {
        metadata = customMetadata;
        console.log(`🔄 Uploading custom metadata: ${metadata.name}`);
      }
      // Option 3: No propertyId and no metadata - error
      else {
        return res.status(400).json({
          success: false,
          error: "Either propertyId or metadata must be provided",
        });
      }

      // Upload to Pinata
      const result = await pinataService.uploadJSON(metadata);

      // Save to database
      await ipfsMetadataService.saveMetadata({
        cid: result.cid,
        type: "metadata",
        content: metadata,
        propertyId: propertyId || null,
        pinataInfo: {
          pinataId: result.pinataId,
          pinStatus: "pinned",
        },
        gatewayUrls: {
          pinata: result.url,
          ipfs: result.ipfsUrl,
        },
      });

      console.log(`   ✅ Metadata uploaded: ${result.cid}`);

      res.json({
        success: true,
        message: "Metadata uploaded to IPFS",
        data: {
          cid: result.cid,
          url: result.url,
          ipfsUrl: result.ipfsUrl,
          metadata,
        },
      });
    } catch (error) {
      console.error("❌ Upload metadata error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to upload metadata",
        message: error.message,
      });
    }
  }

  /**
   * Get content by CID
   */
  async getContent(req, res) {
    try {
      const { cid } = req.params;

      // Check database first
      const ipfsMetadata = await ipfsMetadataService.getByCID(cid);

      if (ipfsMetadata) {
        return res.json({
          success: true,
          data: {
            cid,
            type: ipfsMetadata.type,
            content: ipfsMetadata.content,
            gatewayUrls: ipfsMetadata.gatewayUrls,
          },
        });
      }

      // If not in database, fetch from IPFS
      const content = await pinataService.getContent(cid);

      res.json({
        success: true,
        data: {
          cid,
          content,
          url: `${require("../config/pinata").PINATA_GATEWAY}/${cid}`,
        },
      });
    } catch (error) {
      console.error("❌ Get content error:", error.message);
      res.status(500).json({
        success: false,
        error: "Failed to get content",
        message: error.message,
      });
    }
  }
}

module.exports = new UploadController();
