# 🔄 Indexer Service - Blockchain Synchronization

## Mô tả

Service này đồng bộ dữ liệu giữa Blockchain (Ganache) và MongoDB, đảm bảo tính nhất quán của dữ liệu NFT và Properties.

## Chức năng chính

### 1. 🔄 Đồng bộ NFTs

- Đọc toàn bộ NFTs từ blockchain
- Tạo/cập nhật NFT records trong MongoDB
- Đồng bộ ownership information

### 2. 🏠 Đồng bộ Properties

- Cập nhật ownership của properties dựa trên NFT ownership
- Đảm bảo properties và NFTs luôn khớp với blockchain

### 3. 📡 Lắng nghe Events

#### NFT Events:

- **Transfer**: Cập nhật ownership khi NFT được chuyển
- **Mint**: Tạo NFT mới trong database

#### Marketplace Events:

- **ItemListed**: Tạo listing khi property được đăng bán
- **ItemSold**: Cập nhật ownership và listing status
- **ListingCancelled**: Hủy listing

## Cài đặt

```bash
cd services/indexer-service
npm install
```

## Cấu hình

File `.env` cần có:

```env
MONGODB_URI=mongodb://localhost:27017/viepropchain
GANACHE_URL=http://127.0.0.1:8545
POLL_INTERVAL=5000
```

## Chạy Service

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

## Test Sync

Chạy script test để kiểm tra sync:

```bash
node test-sync.js
```

## Luồng hoạt động

```
1. Khởi động service
   ↓
2. Kết nối MongoDB + Ganache
   ↓
3. Initial Sync:
   - Sync toàn bộ NFTs từ blockchain
   - Sync Properties ownership
   ↓
4. Start Event Listener:
   - Poll blockchain mỗi 5 giây
   - Lắng nghe Transfer, ItemListed, ItemSold, ListingCancelled events
   - Xử lý events theo thứ tự chronological
   ↓
5. Cập nhật database real-time
```

## Xử lý lỗi

### MongoDB Timeout

- Service tự động retry kết nối
- Timeout được set: 5s server selection, 45s socket

### Blockchain Connection

- Auto-reconnect nếu mất kết nối Ganache
- Skip các block đã xử lý

### Data Inconsistency

- Initial sync đảm bảo data nhất quán khi khởi động
- Events được xử lý theo thứ tự block number

## Logs

Service log các hoạt động:

- ✅ Successful operations
- ⚠️ Warnings (non-critical)
- ❌ Errors
- 📊 Statistics

## Models được sync

### NFT Model

```javascript
{
  tokenId: Number,
  contractAddress: String,
  owner: String,
  tokenURI: String,
  metadata: Object,
  name: String,
  description: String,
  image: String
}
```

### Property Model

```javascript
{
  nft: {
    tokenId: Number
  },
  owner: String,
  marketplaceStatus: String,
  currentListingId: Number
}
```

### Listing Model

```javascript
{
  listingId: Number,
  tokenId: Number,
  seller: Object,
  price: Object,
  status: String,
  propertyId: ObjectId
}
```

## Performance

- **Poll Interval**: 5 seconds (configurable)
- **Batch Processing**: Xử lý nhiều events trong 1 poll
- **Efficient Queries**: Sử dụng indexes và lean queries

## Troubleshooting

### Service không sync NFTs

```bash
# Check Ganache đang chạy
curl http://127.0.0.1:8545

# Check contract address đúng
# Xem trong truffle migration logs
```

### MongoDB timeout

```bash
# Check MongoDB đang chạy
mongosh mongodb://localhost:27017

# Tăng timeout trong code nếu cần
```

### Events không được process

```bash
# Check block number trong logs
# Verify contract deployed đúng address
# Check ABI có đầy đủ events
```

## Development

Để thêm event mới:

1. Thêm event vào ABI
2. Tạo process function
3. Thêm vào pollEvents()
4. Test với test-sync.js

## Production Checklist

- [ ] MongoDB connection string secure
- [ ] Ganache/blockchain URL correct
- [ ] Contract addresses verified
- [ ] Indexes created on collections
- [ ] Monitoring setup
- [ ] Error alerts configured
- [ ] Backup strategy for lastProcessedBlock

---

**Version**: 2.0.0  
**Last Updated**: December 2025  
**Maintainer**: ViePropChain Team
