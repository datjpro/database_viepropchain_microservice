const mongoose = require("mongoose");
require("dotenv").config();

const Property = require("./propertyModel");

/**
 * Test script to create sample properties
 */

const sampleProperties = [
  {
    propertyType: "apartment",
    name: "Căn hộ Vinhomes Central Park",
    description:
      "Căn hộ cao cấp 2 phòng ngủ view sông Saigon tuyệt đẹp, nội thất đầy đủ cao cấp",
    price: { amount: 5000000000, currency: "VND" },
    location: {
      address: "208 Nguyễn Hữu Cảnh, P.22, Q.Bình Thạnh",
      ward: "Phường 22",
      district: "Bình Thạnh",
      city: "TP. Hồ Chí Minh",
      coordinates: { latitude: 10.7967, longitude: 106.7219 },
    },
    details: {
      projectName: "Vinhomes Central Park",
      apartmentCode: "L3-1205",
      block: "Landmark 3",
      floor: 12,
      grossArea: "85m2",
      netArea: "80m2",
      bedrooms: 2,
      bathrooms: 2,
      balconyDirection: "Đông Nam",
      interiorStatus: "Nội thất đầy đủ",
      legalStatus: "Sổ hồng",
    },
    media: {
      images: [
        {
          url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
          caption: "Phòng khách view sông",
          isPrimary: true,
        },
      ],
    },
    status: "published",
    owner: {
      walletAddress: "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
      name: "Nguyễn Văn A",
      email: "nguyenvana@example.com",
    },
    isPublic: true,
    isFeatured: true,
    tags: ["cao-cap", "view-song", "noi-that-day-du"],
  },
  {
    propertyType: "land",
    name: "Đất nền Nhơn Trạch",
    description:
      "Lô đất nền đẹp mặt tiền đường lớn, phù hợp xây nhà ở hoặc kinh doanh",
    price: { amount: 2000000000, currency: "VND" },
    location: {
      address: "Đường D1, KDC Tân Phú, Nhơn Trạch",
      ward: "Xã Phước Khánh",
      district: "Nhơn Trạch",
      city: "Đồng Nai",
    },
    details: {
      landNumber: "123",
      mapSheetNumber: "4",
      area: { value: 100, unit: "m2" },
      frontWidth: "5m",
      length: "20m",
      landType: "ODT (Đất ở tại đô thị)",
      zoning: "Khu dân cư hiện hữu",
      roadFrontage: "Đường nhựa 8m",
      legalStatus: "Sổ đỏ",
    },
    media: {
      images: [
        {
          url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800",
          caption: "Mặt tiền lô đất",
          isPrimary: true,
        },
      ],
    },
    status: "published",
    owner: {
      walletAddress: "0xd1ABb2a4c79EffD3F94C70E00F58d9EC05114444",
      name: "Trần Thị B",
      email: "tranthib@example.com",
    },
    isPublic: true,
    tags: ["dat-nen", "mat-tien", "shr"],
  },
  {
    propertyType: "house",
    name: "Nhà phố Thảo Điền",
    description: "Nhà phố hiện đại 1 trệt 2 lầu, khu vực an ninh cao cấp",
    price: { amount: 8000000000, currency: "VND" },
    location: {
      address: "45 Xuân Thủy, Thảo Điền, Quận 2",
      ward: "Phường Thảo Điền",
      district: "Quận 2",
      city: "TP. Hồ Chí Minh",
    },
    details: {
      landArea: "80m2 (5m x 16m)",
      constructionArea: "60m2",
      usableArea: "180m2",
      structure: "1 trệt, 2 lầu, 1 sân thượng",
      bedrooms: 4,
      bathrooms: 3,
      houseDirection: "Đông Nam",
      roadFrontage: "Đường 12m có vỉa hè",
      constructionYear: 2020,
      legalStatus: "Sổ hồng riêng hoàn công",
    },
    media: {
      images: [
        {
          url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
          caption: "Mặt tiền nhà",
          isPrimary: true,
        },
      ],
    },
    status: "published",
    owner: {
      walletAddress: "0xC6890b26A32d9d92aefbc8635C4588247529CdfE",
      name: "Lê Văn C",
      email: "levanc@example.com",
    },
    isPublic: true,
    isFeatured: true,
    tags: ["nha-pho", "thao-dien", "hoan-cong"],
  },
];

async function createSampleProperties() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("📝 Creating sample properties...");

    for (const propertyData of sampleProperties) {
      const property = new Property(propertyData);
      await property.save();
      console.log(`✅ Created: ${property.name} (${property._id})`);
    }

    console.log("🎉 All sample properties created successfully!");

    const total = await Property.countDocuments();
    console.log(`📊 Total properties in database: ${total}`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.connection.close();
    console.log("👋 MongoDB connection closed");
  }
}

createSampleProperties();
