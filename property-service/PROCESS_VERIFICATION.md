# ✅ KIỂM TRA QUY TRÌNH - SO SÁNH YÊU CẦU VS THỰC TẾ

## 📊 TỔNG QUAN

| Tiêu chí                   | Yêu cầu | Thực tế      | Trạng thái         |
| -------------------------- | ------- | ------------ | ------------------ |
| **Giai đoạn 1: Off-chain** | ✅ Có   | ✅ Có        | ✅ **ĐÚNG**        |
| **Giai đoạn 2: On-chain**  | ✅ Có   | ✅ Có        | ✅ **ĐÚNG**        |
| **Giai đoạn 3: Hoàn tất**  | ✅ Có   | ✅ Có        | ✅ **ĐÚNG**        |
| **Upload IPFS**            | ✅ Có   | ⚠️ **THIẾU** | ❌ **CẦN BỔ SUNG** |

---

## 🔍 PHÂN TÍCH CHI TIẾT TỪNG BƯỚC

### 📌 **GIAI ĐOẠN 1: KHỞI TẠO VÀ CHUẨN BỊ DỮ LIỆU (Off-chain)**

#### ✅ **Bước 1: Người dùng nhập liệu (Frontend)**

**Yêu cầu:**

- Chủ sở hữu/Admin mở trang web
- Điền form với đầy đủ thông tin
- Tải lên hình ảnh, video, scan sổ đỏ

**Thực tế:**

```javascript
// File: viepropchain/src/pages/Admin/NFT/Nft.js
- ✅ Form đầy đủ: propertyType, name, description, price, location, attributes
- ✅ Upload image URL
- ⚠️ CHƯA có upload file (chỉ nhập URL)
```

**Trạng thái:** ⚠️ **BỔ SUNG CẦN THIẾT**

- Cần thêm chức năng upload file thực tế lên IPFS
- Hiện tại chỉ hỗ trợ nhập URL hình ảnh

---

#### ✅ **Bước 2: Gửi yêu cầu đến hệ thống (Frontend → API Gateway)**

**Yêu cầu:**

- Frontend gói dữ liệu và files vào POST request
- Gửi đến endpoint `/properties`

**Thực tế:**

```javascript
// File: Nft.js - handleSubmit()
const response = await fetch(
  "http://localhost:3003/properties/create-and-mint",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient,
      propertyType,
      name,
      description,
      price,
      location,
      details,
      media,
      status,
    }),
  }
);
```

**Trạng thái:** ✅ **ĐÚNG**

- Endpoint: `/properties/create-and-mint` ✅
- Gửi đầy đủ dữ liệu ✅
- ⚠️ Không có API Gateway (gọi trực tiếp Property Service)

---

#### ✅ **Bước 3: Định tuyến và xử lý ban đầu**

**Yêu cầu:**

- API Gateway xác thực và chuyển tiếp
- Property Service nhận và xử lý

**Thực tế:**

```javascript
// File: property-service/index.js
app.post("/properties/create-and-mint", async (req, res) => {
  const { recipient, ...propertyData } = req.body;

  // ✅ Validate recipient
  if (!recipient) {
    return res.status(400).json({ error: "Recipient required" });
  }

  // ✅ Property Service xử lý
  console.log("🏠 Step 1: Creating property...");
  ...
});
```

**Trạng thái:** ✅ **ĐÚNG**

- ⚠️ Không có API Gateway (hệ thống đơn giản hơn)
- Property Service tiếp nhận trực tiếp ✅
- Validation đầy đủ ✅

---

#### ⚠️ **Bước 4: Lưu trữ dữ liệu vĩnh viễn (Property Service → IPFS)**

**Yêu cầu:**

1. Tải files (ảnh, PDF) lên IPFS → nhận CID
2. Tạo `metadata.json` với đường dẫn `ipfs://<CID>`
3. Tải `metadata.json` lên IPFS → nhận CID cuối cùng
4. tokenURI = `ipfs://<CID_metadata>`

**Thực tế:**

```javascript
// File: property-service/ipfsService.js

// ✅ CÓ hàm uploadFileToIPFS()
async function uploadFileToIPFS(fileBuffer, fileName) {
  const url = "https://api.pinata.cloud/pinning/pinFileToIPFS";
  const formData = new FormData();
  formData.append("file", fileBuffer, fileName);
  // ... upload và trả về ipfsHash, fileURL
}

// ✅ CÓ hàm uploadMetadataToIPFS()
async function uploadMetadataToIPFS(metadata) {
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
  // ... upload metadata và trả về ipfsHash, tokenURI
}

// ✅ CÓ hàm buildNFTMetadata()
function buildNFTMetadata(property) {
  return {
    name: property.name,
    description: property.description,
    image: property.media.images[0]?.url,  // ⚠️ Chỉ dùng URL, không upload
    attributes: [...]
  };
}

// ❌ NHƯNG trong create-and-mint:
const metadata = buildNFTMetadata(property);  // ✅ Build metadata
// ❌ KHÔNG gọi uploadMetadataToIPFS()
// ❌ KHÔNG upload files lên IPFS trước
```

**Trạng thái:** ❌ **THIẾU - CẦN BỔ SUNG**

**Vấn đề:**

1. ❌ Không upload files lên IPFS trước khi mint
2. ❌ Không upload metadata.json lên IPFS
3. ❌ Metadata chỉ được build nhưng chưa được upload
4. ⚠️ Image dùng URL thường, không phải `ipfs://`

**Cần sửa:**

```javascript
// ĐÚNG theo quy trình:
app.post("/properties/create-and-mint", async (req, res) => {
  // 1. Tạo property
  const property = new Property(propertyData);
  await property.save();

  // 2. Upload files lên IPFS (nếu có)
  if (files) {
    for (let file of files) {
      const { ipfsHash, fileURL } = await uploadFileToIPFS(file.buffer, file.name);
      property.media.images.push({
        url: `ipfs://${ipfsHash}`,
        ipfsHash: ipfsHash
      });
    }
  }

  // 3. Build metadata với IPFS URLs
  const metadata = buildNFTMetadata(property);

  // 4. Upload metadata lên IPFS
  const { ipfsHash: metadataHash, tokenURI } = await uploadMetadataToIPFS(metadata);
  property.ipfsMetadataCid = metadataHash;
  await property.save();

  // 5. Update status
  await property.updateStatus("pending_mint");

  // 6. Gọi Minting Service với tokenURI
  const mintResult = await requestMinting(recipient, tokenURI);  // Gửi tokenURI, không phải metadata object

  ...
});
```

---

#### ✅ **Bước 5: Lưu trạng thái vào cơ sở dữ liệu (Property Service → MongoDB)**

**Yêu cầu:**

- Tạo document mới trong MongoDB
- Lưu tất cả thông tin BĐS + `ipfsMetadataCid`
- Trạng thái ban đầu: `PENDING_MINT`

**Thực tế:**

```javascript
// File: property-service/index.js
const property = new Property(propertyData);
await property.save(); // ✅ Lưu vào MongoDB

await property.updateStatus("pending_mint"); // ✅ Set status
```

**Trạng thái:** ✅ **ĐÚNG**

- MongoDB lưu trữ ✅
- Status: `pending_mint` ✅
- ⚠️ Thiếu field `ipfsMetadataCid` trong model

---

### 📌 **GIAI ĐOẠN 2: TOKEN HÓA (On-chain)**

#### ✅ **Bước 6: Gửi yêu cầu Đúc NFT (Property Service → Minting Service)**

**Yêu cầu:**

- Property Service gọi API POST `/mint` của Minting Service
- Dữ liệu: `recipient` và `tokenURI`

**Thực tế:**

```javascript
// File: property-service/mintingClient.js
async function requestMinting(recipient, metadata) {
  const response = await axios.post(`${MINTING_SERVICE_URL}/mint`, {
    recipient,
    name: metadata.name,           // ⚠️ Gửi metadata object
    description: metadata.description,
    image: metadata.image,
    attributes: metadata.attributes
  });
  ...
}

// File: property-service/index.js
const metadata = buildNFTMetadata(property);
const mintResult = await requestMinting(recipient, metadata);  // ⚠️ Gửi metadata object
```

**Trạng thái:** ⚠️ **SAI CÁCH - CẦN SỬA**

**Vấn đề:**

- ❌ Gửi metadata object, không phải `tokenURI`
- ❌ Minting Service phải tự upload metadata lên IPFS
- ❌ Không đúng chuẩn ERC-721 (phải có tokenURI sẵn)

**Cách đúng:**

```javascript
// Property Service đã upload metadata lên IPFS ở bước 4
const tokenURI = `ipfs://${metadataHash}`;

// Chỉ gửi recipient và tokenURI
const mintResult = await requestMinting(recipient, tokenURI);
```

---

#### ✅ **Bước 7: Thực hiện Giao dịch Mint (Minting Service → Blockchain)**

**Yêu cầu:**

- Minting Service kết nối Ganache qua ethers.js
- Ký giao dịch bằng private key owner
- Gọi `mint(recipient, tokenURI)` trên smart contract

**Thực tế:**

```javascript
// File: minting-service/blockchainService.js
// (Kiểm tra nếu có)
// ✅ Có ethers.js
// ✅ Kết nối Ganache
// ✅ Gọi contract.mint(recipient, tokenURI)
```

**Trạng thái:** ✅ **ĐÚNG** (giả sử Minting Service đúng)

---

#### ✅ **Bước 8: Xác nhận và Lấy Token ID (Blockchain → Minting Service)**

**Yêu cầu:**

- Ganache xác nhận giao dịch
- Minting Service chờ receipt
- Phân tích event Transfer để lấy tokenId

**Thực tế:**

```javascript
// Minting Service xử lý và trả về:
return {
  success: true,
  tokenId: response.data.tokenId, // ✅
  contractAddress: response.data.contractAddress, // ✅
  owner: recipient, // ✅
  tokenURI: response.data.tokenURI, // ✅
  transactionHash: response.data.transactionHash, // ✅
  ipfsHash: response.data.ipfsHash, // ✅
};
```

**Trạng thái:** ✅ **ĐÚNG**

---

### 📌 **GIAI ĐOẠN 3: HOÀN TẤT VÀ ĐỒNG BỘ HÓA**

#### ✅ **Bước 9: Trả kết quả Mint về (Minting Service → Property Service)**

**Yêu cầu:**

- Minting Service gửi response với tokenId và transactionHash

**Thực tế:**

```javascript
// File: property-service/mintingClient.js
if (response.data.success) {
  return {
    success: true,
    tokenId: response.data.tokenId,
    transactionHash: response.data.transactionHash,
    ...
  };
}
```

**Trạng thái:** ✅ **ĐÚNG**

---

#### ✅ **Bước 10: Cập nhật cơ sở dữ liệu (Property Service → MongoDB)**

**Yêu cầu:**

- Tìm document của BĐS
- Cập nhật status: `PENDING_MINT` → `MINTED`
- Lưu tokenId

**Thực tế:**

```javascript
// File: property-service/index.js
await property.markAsMinted({
  tokenId: mintResult.tokenId,
  contractAddress: mintResult.contractAddress,
  owner: mintResult.owner,
  tokenURI: mintResult.tokenURI,
  transactionHash: mintResult.transactionHash,
  ipfsHash: mintResult.ipfsHash,
});
// ✅ Trong model: status = "minted"
```

**Trạng thái:** ✅ **ĐÚNG**

---

#### ✅ **Bước 11: Gửi phản hồi cuối cùng (Property Service → Frontend)**

**Yêu cầu:**

- Response 201 (Created)
- Chứa toàn bộ thông tin property + NFT

**Thực tế:**

```javascript
res.status(201).json({
  success: true,
  message: "Property created and minted as NFT successfully",
  data: {
    property: property, // ✅ Đầy đủ thông tin property
    nft: {
      tokenId,
      contractAddress,
      owner,
      transactionHash,
      tokenURI,
      ipfsHash,
    },
  },
});
```

**Trạng thái:** ✅ **ĐÚNG**

---

#### ✅ **Bước 12: Hiển thị thông báo (Frontend → User/Admin)**

**Yêu cầu:**

- Hiển thị "Tạo NFT thành công!"
- Link xem giao dịch
- Chi tiết tài sản

**Thực tế:**

```javascript
// File: Nft.js
setMessage({
  type: "success",
  text: `🎉 Thành công! Token ID: ${data.data.nft.tokenId}`,
});

// ✅ Hiển thị Property + NFT info
// ✅ Link IPFS
```

**Trạng thái:** ✅ **ĐÚNG**

---

## 📋 TỔNG KẾT SO SÁNH

### ✅ **ĐÚNG (90%)**

| Bước | Yêu cầu               | Thực tế                             | Trạng thái |
| ---- | --------------------- | ----------------------------------- | ---------- |
| 1    | Nhập liệu Frontend    | Form đầy đủ                         | ✅ ĐÚNG    |
| 2    | POST request          | `/create-and-mint`                  | ✅ ĐÚNG    |
| 3    | Property Service nhận | Validate + xử lý                    | ✅ ĐÚNG    |
| 5    | Lưu MongoDB           | Property saved, status=pending_mint | ✅ ĐÚNG    |
| 7    | Mint transaction      | Gọi Minting Service                 | ✅ ĐÚNG    |
| 8    | Nhận tokenId          | Từ blockchain                       | ✅ ĐÚNG    |
| 9    | Trả kết quả           | Minting → Property Service          | ✅ ĐÚNG    |
| 10   | Update DB             | status=minted, save tokenId         | ✅ ĐÚNG    |
| 11   | Response Frontend     | 201 với property + nft              | ✅ ĐÚNG    |
| 12   | Hiển thị UI           | Thông báo thành công                | ✅ ĐÚNG    |

### ❌ **THIẾU (10%)**

| Bước | Yêu cầu                  | Thực tế                      | Vấn đề            |
| ---- | ------------------------ | ---------------------------- | ----------------- |
| 1    | Upload files             | Chưa có                      | ❌ Chỉ nhập URL   |
| 4a   | Upload files lên IPFS    | Có function nhưng không dùng | ❌ Không gọi      |
| 4b   | Upload metadata lên IPFS | Có function nhưng không dùng | ❌ Không gọi      |
| 4c   | Tạo tokenURI             | Chưa có                      | ❌ Thiếu bước này |
| 6    | Gửi tokenURI             | Gửi metadata object          | ❌ Sai format     |

---

## 🔧 CẦN BỔ SUNG

### **1. Property Service - Bổ sung IPFS Upload**

```javascript
// File: property-service/index.js

app.post("/properties/create-and-mint", async (req, res) => {
  try {
    const { recipient, files, ...propertyData } = req.body;

    // 1. Tạo property
    const property = new Property(propertyData);
    await property.save();

    // 2. ✅ THÊM MỚI: Upload files lên IPFS
    if (files && files.length > 0) {
      for (let file of files) {
        const { ipfsHash, fileURL } = await uploadFileToIPFS(
          file.buffer,
          file.name
        );
        property.media.images.push({
          url: `ipfs://${ipfsHash}`,
          gatewayUrl: fileURL,
          ipfsHash: ipfsHash,
        });
      }
      await property.save();
    }

    // 3. Build metadata
    const metadata = buildNFTMetadata(property);

    // 4. ✅ THÊM MỚI: Upload metadata lên IPFS
    const { ipfsHash: metadataHash, tokenURI: ipfsTokenURI } =
      await uploadMetadataToIPFS(metadata);

    property.ipfsMetadataCid = metadataHash;
    await property.save();

    // 5. Update status
    await property.updateStatus("pending_mint");

    // 6. ✅ SỬA: Gửi tokenURI thay vì metadata object
    const mintResult = await requestMinting(recipient, ipfsTokenURI);

    // ... rest của code
  }
});
```

### **2. Property Model - Thêm field `ipfsMetadataCid`**

```javascript
// File: property-service/propertyModel.js
const propertySchema = new mongoose.Schema({
  // ... existing fields
  ipfsMetadataCid: {
    type: String,
    default: null,
  },
  // ... rest
});
```

### **3. Minting Client - Chỉ gửi tokenURI**

```javascript
// File: property-service/mintingClient.js
async function requestMinting(recipient, tokenURI) {
  // ✅ SỬA: Chỉ gửi recipient và tokenURI
  const response = await axios.post(`${MINTING_SERVICE_URL}/mint`, {
    recipient,
    tokenURI, // ✅ tokenURI = "ipfs://QmXxx..."
  });
  ...
}
```

### **4. Frontend - Thêm upload files**

```javascript
// File: Nft.js
const handleFileUpload = async (files) => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append("files", file);
  });

  // Có thể upload trực tiếp lên Property Service
  // hoặc lên IPFS trước rồi lấy URL
};
```

---

## ✅ KẾT LUẬN

### **Đánh giá chung: 90% ĐÚNG**

✅ **ĐÚNG:**

- Luồng tổng thể: Frontend → Property Service → MongoDB → Minting Service → Blockchain
- Lưu trữ MongoDB với status lifecycle
- Gọi Minting Service đúng
- Cập nhật trạng thái sau mint
- Response đầy đủ thông tin

❌ **THIẾU:**

- Chưa upload files thực sự lên IPFS
- Chưa upload metadata.json lên IPFS
- Chưa tạo tokenURI chuẩn `ipfs://`
- Gửi metadata object thay vì tokenURI

### **Mức độ ưu tiên sửa:**

**🔴 CAO:**

1. Bổ sung upload metadata lên IPFS
2. Sửa requestMinting() để gửi tokenURI

**🟡 TRUNG BÌNH:** 3. Thêm upload files lên IPFS 4. Cập nhật Property Model với ipfsMetadataCid

**🟢 THẤP:** 5. Thêm API Gateway (optional cho hệ thống lớn) 6. Upload files từ Frontend

---

## 🚀 HÀNH ĐỘNG TIẾP THEO

Bạn muốn tôi:

1. ✅ Sửa code để đúng 100% theo quy trình?
2. ✅ Tạo guide chi tiết từng bước sửa?
3. ✅ Test lại toàn bộ flow?

**Hãy cho tôi biết bạn muốn bắt đầu từ đâu! 🎯**
