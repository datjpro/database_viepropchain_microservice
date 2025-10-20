# 📊 HƯỚNG DẪN CẤU TRÚC DỮ LIỆU - PROPERTY SERVICE

## 🎯 NGUYÊN TẮC PHÂN CHIA DỮ LIỆU

### ⚡ Tại sao phải phân chia IPFS và MongoDB?

**IPFS (Immutable Storage):**
- ✅ Dữ liệu **KHÔNG BAO GIỜ THAY ĐỔI** sau khi upload
- ✅ Phân tán, không thể xóa/sửa
- ✅ Giống như "bản sao y"/"giấy chứng nhận" vĩnh viễn
- ✅ Được các marketplace (OpenSea...) trust và hiển thị

**MongoDB (Mutable Storage):**
- ✅ Dữ liệu **THAY ĐỔI THƯỜNG XUYÊN**
- ✅ Query nhanh, flexible
- ✅ Đồng bộ từ blockchain events
- ✅ Lưu analytics và application data

---

## 📦 IPFS METADATA (Immutable - Không đổi)

### Cấu trúc metadata lưu trên IPFS:

```json
{
  "name": "Villa Sài Gòn - Quận 2",
  "description": "Biệt thự cao cấp 3 tầng, view sông, full nội thất...",
  "image": "ipfs://QmYYY.../image.jpg",
  "external_url": "https://viepropchain.com/properties/65abc123...",
  "attributes": [
    {
      "trait_type": "Loại hình BĐS",
      "value": "Biệt thự"
    },
    {
      "trait_type": "Thành phố",
      "value": "Thành phố Hồ Chí Minh"
    },
    {
      "trait_type": "Quận/Huyện",
      "value": "Quận 2"
    },
    {
      "trait_type": "Địa chỉ",
      "value": "123 Đường Trần Não, Quận 2"
    },
    {
      "trait_type": "Diện tích đất",
      "value": "300m2"
    },
    {
      "trait_type": "Diện tích xây dựng",
      "value": "250m2"
    },
    {
      "trait_type": "Số phòng ngủ",
      "value": "5"
    },
    {
      "trait_type": "Số phòng tắm",
      "value": "4"
    },
    {
      "trait_type": "Hướng nhà",
      "value": "Đông Nam"
    },
    {
      "trait_type": "Năm xây dựng",
      "value": "2020"
    },
    {
      "trait_type": "Pháp lý",
      "value": "Sổ đỏ chính chủ"
    }
  ],
  "legal_documents": [
    {
      "name": "Sổ đỏ",
      "url": "ipfs://QmXXX.../so-do.pdf",
      "type": "land_title"
    },
    {
      "name": "Giấy phép xây dựng",
      "url": "ipfs://QmZZZ.../giay-phep.pdf",
      "type": "construction_permit"
    }
  ]
}
```

### 📋 Các trường trong IPFS Metadata:

| Field | Mô tả | Ví dụ |
|-------|-------|-------|
| `name` | Tên BĐS (hiển thị trên OpenSea) | "Villa Sài Gòn - Quận 2" |
| `description` | Mô tả chi tiết BĐS | "Biệt thự cao cấp 3 tầng..." |
| `image` | Link IPFS đến ảnh đại diện | `ipfs://QmYYY.../image.jpg` |
| `external_url` | Link đến trang chi tiết trên DApp | `https://viepropchain.com/properties/...` |
| `attributes` | Mảng các thuộc tính cố định | Xem bảng dưới |
| `legal_documents` | Mảng link IPFS giấy tờ pháp lý | Sổ đỏ, giấy phép... |

### 📝 Attributes (Thuộc tính cố định):

**Common attributes (Chung cho tất cả loại BĐS):**
- Loại hình BĐS (Căn hộ, Đất, Nhà, Biệt thự)
- Thành phố, Quận/Huyện, Phường/Xã
- Địa chỉ
- Pháp lý

**Theo loại BĐS:**

#### 🏢 Căn hộ (Apartment):
- Tên dự án
- Mã căn hộ
- Tòa (Block/Tower)
- Tầng (Floor)
- Diện tích tim tường
- Diện tích thông thủy
- Số phòng ngủ
- Số phòng tắm
- Hướng ban công
- Tình trạng nội thất

#### 🌾 Đất nền (Land):
- Số thửa
- Tờ bản đồ số
- Tọa độ GPS
- Diện tích
- Chiều ngang (Mặt tiền)
- Chiều dài
- Loại đất
- Quy hoạch
- Mặt tiền đường

#### 🏘️ Nhà phố / Biệt thự (House/Villa):
- Diện tích đất
- Diện tích xây dựng
- Diện tích sử dụng
- Kết cấu
- Số phòng ngủ
- Số phòng tắm
- Hướng nhà
- Mặt tiền đường
- Năm xây dựng

### 📄 Legal Documents:

```json
"legal_documents": [
  {
    "name": "Sổ đỏ",
    "url": "ipfs://QmXXX.../so-do.pdf",
    "type": "land_title"
  },
  {
    "name": "Giấy phép xây dựng",
    "url": "ipfs://QmYYY.../giay-phep.pdf",
    "type": "construction_permit"
  },
  {
    "name": "Hợp đồng mua bán",
    "url": "ipfs://QmZZZ.../hop-dong.pdf",
    "type": "contract"
  }
]
```

**Các loại document:**
- `land_title` - Sổ đỏ/sổ hồng
- `construction_permit` - Giấy phép xây dựng
- `contract` - Hợp đồng mua bán
- `certificate` - Giấy chứng nhận khác

---

## 🗄️ MONGODB DATA (Mutable - Có thể đổi)

### Cấu trúc dữ liệu trong MongoDB:

```javascript
{
  _id: ObjectId("65abc123..."),
  
  // ===== 1. BASIC INFO (Cache từ IPFS) =====
  propertyType: "villa",
  name: "Villa Sài Gòn - Quận 2",
  description: "Biệt thự cao cấp...",
  price: {
    amount: 15000000000,
    currency: "VND"
  },
  
  // ===== 2. LOCATION =====
  location: {
    address: "123 Đường Trần Não",
    ward: "Phường Bình An",
    district: "Quận 2",
    city: "Thành phố Hồ Chí Minh",
    coordinates: {
      latitude: 10.7869,
      longitude: 106.7412
    }
  },
  
  // ===== 3. DETAILS =====
  details: {
    area: { value: 300, unit: "m2" },
    landArea: "300m2",
    constructionArea: "250m2",
    bedrooms: 5,
    bathrooms: 4,
    // ... các field khác
  },
  
  // ===== 4. MEDIA =====
  media: {
    images: [
      {
        url: "ipfs://QmYYY.../image1.jpg",
        caption: "Mặt tiền",
        isPrimary: true
      }
    ],
    documents: [
      {
        name: "Sổ đỏ",
        url: "ipfs://QmXXX.../so-do.pdf",
        type: "land_title"
      }
    ]
  },
  
  // ===== 5. NFT INFO (Blockchain data) =====
  nft: {
    isMinted: true,
    tokenId: 1,
    contractAddress: "0x52B42Ac0e051A4c3386791b04391510C3cE06632",
    owner: "0x1234...abcd",        // ← CẬP NHẬT khi transfer
    tokenURI: "ipfs://QmAAA...",
    transactionHash: "0xabc...",
    ipfsHash: "QmAAA...",
    mintedAt: ISODate("2025-10-20T...")
  },
  
  // ===== 6. IPFS METADATA CID =====
  ipfsMetadataCid: "QmAAA...",
  
  // ===== 7. STATUS (Đồng bộ từ smart contract) =====
  status: "for_sale",              // ← CẬP NHẬT từ events
  
  // ===== 8. LISTING PRICE (Đồng bộ từ smart contract) =====
  listingPrice: {
    amount: 15000000000,           // ← CẬP NHẬT khi list/update price
    currency: "VND",
    updatedAt: ISODate("2025-10-20T...")
  },
  
  // ===== 9. AUCTION INFO (Nếu đang đấu giá) =====
  auctionInfo: {
    isActive: false,
    startPrice: 0,
    currentBid: 0,
    highestBidder: null,
    endTime: null,
    bids: []
  },
  
  // ===== 10. OWNER & AGENT =====
  owner: {
    userId: "user123",
    walletAddress: "0x1234...abcd",
    name: "Nguyễn Văn A",
    email: "nguyenvana@example.com"
  },
  
  agent: {
    userId: "agent456",
    name: "Trần Thị B",
    phone: "0901234567",
    email: "tranthi@example.com"
  },
  
  // ===== 11. ANALYTICS (Thay đổi liên tục) =====
  analytics: {
    views: 150,                    // ← Tăng mỗi khi xem
    favorites: 25,                 // ← Tăng khi favorite
    shares: 10,                    // ← Tăng khi share
    inquiries: 5                   // ← Tăng khi hỏi thông tin
  },
  
  // ===== 12. METADATA =====
  isPublic: true,
  isFeatured: false,
  tags: ["luxury", "river-view", "district-2"],
  
  // ===== 13. TIMESTAMPS =====
  createdAt: ISODate("2025-10-01T..."),
  updatedAt: ISODate("2025-10-20T..."),
  publishedAt: ISODate("2025-10-05T...")
}
```

### 📊 Các trường QUAN TRỌNG trong MongoDB:

#### 1. **tokenId, contractAddress** (On-chain identity)
```javascript
nft: {
  tokenId: 1,                    // Định danh duy nhất trên blockchain
  contractAddress: "0x52B42..."  // Contract address của NFT
}
```
**Mục đích:** Định danh tài sản on-chain

---

#### 2. **ownerAddress** (Đồng bộ từ blockchain)
```javascript
nft: {
  owner: "0x1234...abcd"  // Owner hiện tại
}
```
**Cách cập nhật:**
- Tự động đồng bộ từ **Transfer events** qua `eventListener`
- Khi có người mua → owner thay đổi
- Method: `property.updateOwner(newOwner, txHash)`

---

#### 3. **status** (Đồng bộ từ smart contract)
```javascript
status: "for_sale"  // Trạng thái hiện tại
```
**Các trạng thái:**
- `draft` - Đang soạn thảo
- `published` - Đã publish, chưa mint
- `pending_mint` - Đang chờ mint
- `minted` - Đã mint thành NFT
- `for_sale` - Đang rao bán ← Cập nhật từ event `Listed`
- `in_transaction` - Đang giao dịch
- `sold` - Đã bán ← Cập nhật từ event `Sold`
- `archived` - Đã lưu trữ

**Cách cập nhật:**
- Từ smart contract events (Listed, Sold, Cancelled...)
- Method: `property.updateStatus('for_sale')`

---

#### 4. **price, listingPrice** (Giá bán)
```javascript
// Giá gốc (không đổi)
price: {
  amount: 15000000000,
  currency: "VND"
}

// Giá niêm yết (có thể đổi)
listingPrice: {
  amount: 15000000000,    // ← Cập nhật từ event
  currency: "VND",
  updatedAt: ISODate("2025-10-20T...")
}
```
**Cách cập nhật:**
- Từ event `PriceUpdated` của smart contract
- Method: `property.updateListingPrice(amount, currency)`

---

#### 5. **auctionInfo** (Thông tin đấu giá)
```javascript
auctionInfo: {
  isActive: true,
  startPrice: 15000000000,
  currentBid: 16000000000,
  highestBidder: "0x5678...efgh",
  endTime: ISODate("2025-10-25T..."),
  bids: [
    {
      bidder: "0x5678...efgh",
      amount: 16000000000,
      timestamp: ISODate("2025-10-20T...")
    }
  ]
}
```
**Cách cập nhật:**
- Từ events `AuctionStarted`, `BidPlaced`, `AuctionEnded`
- Tự động cập nhật khi có bid mới

---

#### 6. **Cache metadata từ IPFS**
```javascript
name: "Villa Sài Gòn - Quận 2",         // Cache từ IPFS
imageUrl: "ipfs://QmYYY.../image.jpg",  // Cache từ IPFS
attributes: [...]                        // Cache từ IPFS
```
**Mục đích:**
- **Tăng tốc độ query** - Không cần fetch IPFS mỗi lần
- **Search/Filter** - MongoDB query nhanh hơn IPFS
- **Display list** - Hiển thị danh sách không cần IPFS

**Khi nào sync lại:**
- Chỉ sync 1 lần khi mint
- KHÔNG sync lại vì IPFS immutable

---

#### 7. **viewCount, favoriteCount** (Analytics)
```javascript
analytics: {
  views: 150,        // Tăng mỗi khi user xem
  favorites: 25,     // Tăng khi favorite
  shares: 10,        // Tăng khi share
  inquiries: 5       // Tăng khi hỏi thông tin
}
```
**Mục đích:**
- Hiển thị popularity
- Sắp xếp theo trending
- Thống kê engagement

**Methods:**
- `property.incrementViews()`
- `property.incrementFavorites()`

---

## 🔄 LUỒNG DỮ LIỆU (Data Flow)

### 1️⃣ Tạo Property mới và Mint NFT:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Admin/User tạo property mới                          │
│    → POST /properties/create-and-mint                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Lưu property vào MongoDB (status: "pending_mint")    │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Build metadata từ property data                      │
│    → ipfsService.buildNFTMetadata(property)             │
│    → Metadata theo chuẩn ERC-721                        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Upload metadata lên IPFS (Pinata)                    │
│    → ipfsService.uploadMetadataToIPFS(metadata)         │
│    → Nhận ipfsHash + tokenURI                           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Lưu ipfsHash vào property.ipfsMetadataCid            │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 6. Gửi request mint đến Minting Service                 │
│    → mintingClient.requestMinting(recipient, tokenURI)  │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Minting Service mint NFT lên blockchain              │
│    → contract.mint(recipient, tokenURI)                 │
│    → Nhận tokenId, transactionHash                      │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 8. Cập nhật property với NFT info                       │
│    → property.markAsMinted(nftData)                     │
│    → status: "minted"                                   │
│    → nft.isMinted: true                                 │
└─────────────────────────────────────────────────────────┘
```

### 2️⃣ NFT được transfer (Owner thay đổi):

```
┌─────────────────────────────────────────────────────────┐
│ 1. User transfer NFT trên blockchain                    │
│    → contract.transferFrom(from, to, tokenId)           │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Blockchain emit Transfer event                       │
│    → Transfer(from, to, tokenId)                        │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Event Listener phát hiện event (polling)             │
│    → eventListener.js (minting-service)                 │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Cập nhật owner trong MongoDB (minting-service)       │
│    → nft.owner = to                                     │
│    → nft.transactionHistory.push(...)                   │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 5. (Optional) Đồng bộ sang property-service             │
│    → property.updateOwner(to, txHash)                   │
└─────────────────────────────────────────────────────────┘
```

### 3️⃣ Property được list for sale (Giá thay đổi):

```
┌─────────────────────────────────────────────────────────┐
│ 1. Owner list property for sale trên DApp               │
│    → marketplace.listItem(tokenId, price)               │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Smart contract emit event                            │
│    → Listed(tokenId, seller, price)                     │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Backend listener phát hiện event                     │
│    → Marketplace event listener                         │
└────────────────────┬────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Cập nhật MongoDB                                     │
│    → property.updateStatus('for_sale')                  │
│    → property.updateListingPrice(price)                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 BEST PRACTICES

### ✅ DO (Nên làm):

1. **Lưu thông tin CỐ ĐỊNH lên IPFS:**
   - Địa chỉ, diện tích, số phòng
   - Giấy tờ pháp lý (sổ đỏ, giấy phép...)
   - Thông tin không bao giờ thay đổi

2. **Lưu thông tin THAY ĐỔI trong MongoDB:**
   - Owner hiện tại
   - Giá niêm yết
   - Trạng thái (for_sale, sold...)
   - Analytics (views, favorites...)

3. **Cache metadata từ IPFS vào MongoDB:**
   - Để tăng tốc độ query
   - Không cần fetch IPFS mỗi lần

4. **Đồng bộ từ blockchain events:**
   - Owner thay đổi → Từ Transfer event
   - Price thay đổi → Từ PriceUpdated event
   - Status thay đổi → Từ Listed/Sold events

### ❌ DON'T (Không nên):

1. **KHÔNG lưu thông tin thay đổi lên IPFS:**
   - ❌ Owner address
   - ❌ Price
   - ❌ Status
   - ❌ View count, favorites

2. **KHÔNG query IPFS mỗi lần hiển thị list:**
   - ❌ Fetch metadata từ IPFS cho mỗi property
   - ✅ Query từ MongoDB (đã cache)

3. **KHÔNG cập nhật owner manually:**
   - ❌ Admin update owner qua API
   - ✅ Tự động đồng bộ từ blockchain events

---

## 📚 CODE EXAMPLES

### 1. Build và upload metadata lên IPFS:

```javascript
const { buildNFTMetadata, uploadMetadataToIPFS } = require('./ipfsService');

// Build metadata từ property
const metadata = buildNFTMetadata(property, 'https://viepropchain.com');

// Upload lên IPFS
const { ipfsHash, tokenURI } = await uploadMetadataToIPFS(metadata);

// Lưu ipfsHash vào property
property.ipfsMetadataCid = ipfsHash;
await property.save();
```

### 2. Đánh dấu property đã mint:

```javascript
// Sau khi mint thành công
await property.markAsMinted({
  tokenId: 1,
  contractAddress: '0x52B42Ac0e051A4c3386791b04391510C3cE06632',
  owner: '0x1234...abcd',
  tokenURI: 'ipfs://QmXXX...',
  transactionHash: '0xabc...',
  ipfsHash: 'QmXXX...',
});
```

### 3. Cập nhật owner khi transfer:

```javascript
// Khi phát hiện Transfer event
await property.updateOwner('0x5678...efgh', '0xtxhash...');
```

### 4. Cập nhật listing price:

```javascript
// Khi phát hiện PriceUpdated event
await property.updateListingPrice(15000000000, 'VND');
```

### 5. Query properties với filters:

```javascript
// Query properties đang bán, giá dưới 20 tỷ
const properties = await Property.find({
  status: 'for_sale',
  'listingPrice.amount': { $lte: 20000000000 }
}).sort({ 'analytics.views': -1 });
```

---

## 🔍 TROUBLESHOOTING

### Vấn đề: Owner không cập nhật sau khi transfer NFT

**Nguyên nhân:**
- Event Listener không chạy
- MongoDB connection bị lỗi

**Giải pháp:**
1. Check event listener đang chạy: `eventListener.js`
2. Check MongoDB connection
3. Manually sync: `property.updateOwner(newOwner, txHash)`

---

### Vấn đề: Metadata trên OpenSea không hiển thị

**Nguyên nhân:**
- tokenURI không đúng format
- IPFS gateway không accessible
- Metadata không theo chuẩn ERC-721

**Giải pháp:**
1. Check tokenURI: `ipfs://QmXXX...` hoặc `https://gateway.pinata.cloud/ipfs/QmXXX...`
2. Check metadata có đủ fields: `name`, `description`, `image`, `attributes`
3. Test IPFS link trên browser

---

### Vấn đề: Query properties chậm

**Nguyên nhân:**
- Thiếu indexes
- Query full-scan
- Không cache từ IPFS

**Giải pháp:**
1. Add indexes: `propertySchema.index(...)`
2. Cache metadata từ IPFS vào MongoDB
3. Use pagination: `skip()` và `limit()`

---

## 📖 TÓM TẮT

| Loại dữ liệu | Lưu trên IPFS | Lưu trong MongoDB | Lý do |
|--------------|---------------|-------------------|-------|
| **name, description** | ✅ | ✅ (cache) | Hiển thị trên OpenSea + Query nhanh |
| **image** | ✅ | ✅ (cache URL) | Vĩnh viễn trên IPFS + Query nhanh |
| **attributes** | ✅ | ✅ (cache) | Filter trên OpenSea + Query MongoDB |
| **legal_documents** | ✅ | ✅ (cache URLs) | Giấy tờ vĩnh viễn + Query nhanh |
| **tokenId** | ❌ | ✅ | Định danh on-chain |
| **contractAddress** | ❌ | ✅ | Định danh contract |
| **owner** | ❌ | ✅ | Thay đổi khi transfer |
| **status** | ❌ | ✅ | Thay đổi theo events |
| **price** | ❌ | ✅ | Thay đổi khi list/update |
| **auctionInfo** | ❌ | ✅ | Thay đổi theo bids |
| **viewCount** | ❌ | ✅ | Tăng liên tục |
| **favoriteCount** | ❌ | ✅ | Tăng liên tục |

---

**Tác giả:** AI Assistant  
**Ngày tạo:** October 20, 2025  
**Version:** 1.0
