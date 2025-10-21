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
   */
  async uploadMetadata(req, res) {
    try {
      const metadata = req.body;

      if (!metadata || Object.keys(metadata).length === 0) {
        return res.status(400).json({
          success: false,
          error: "No metadata provided",
        });
      }

      console.log(`🔄 Uploading metadata: ${metadata.name}`);

      // Upload to Pinata
      const result = await pinataService.uploadJSON(metadata);

      // Save to database
      await ipfsMetadataService.saveMetadata({
        cid: result.cid,
        type: "metadata",
        content: metadata,
        propertyId: metadata.propertyId || null,
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
