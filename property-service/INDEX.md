# 📚 TÀI LIỆU PROPERTY SERVICE

## 📋 Danh sách tài liệu

### 1. **README.md** 📘 - ĐỌC ĐẦU TIÊN

**Nội dung:**

- Tổng quan về service
- API endpoints đầy đủ
- Cấu trúc database
- Installation guide
- Data flow

**Phù hợp cho:**

- Hiểu tổng quan về service
- Tham khảo API endpoints
- Setup service

---

### 2. **POSTMAN_GUIDE.md** 🧪 - HƯỚNG DẪN TEST

**Nội dung:**

- Hướng dẫn setup Postman từng bước
- 12 test cases chi tiết
- Troubleshooting
- Test scenarios

**Phù hợp cho:**

- Test API với Postman
- QA/Testing
- Developer mới

**➡️ ĐỌC FILE NÀY ĐỂ TEST!**

---

### 3. **QUICK_GUIDE_DATA_STRUCTURE.md** ⚡ - QUICK REFERENCE

**Nội dung:**

- Tóm tắt IPFS vs MongoDB
- Code examples
- Workflow
- Methods có sẵn

**Phù hợp cho:**

- Tra cứu nhanh
- Code examples
- Best practices

---

### 4. **QUICK_START.md** 🚀 - BẮT ĐẦU NHANH

**Nội dung:**

- Hướng dẫn chạy service nhanh
- Testing cơ bản

**Phù hợp cho:**

- Setup lần đầu
- Quick start

---

## 🎯 ĐỌC THEO MỤC ĐÍCH

### Muốn setup service?

```
1. README.md → Installation & Setup
2. QUICK_START.md
3. Test với POSTMAN_GUIDE.md
```

### Muốn test API?

```
1. POSTMAN_GUIDE.md (từng bước chi tiết)
2. Import collection: ViePropChain_Property_Service.postman_collection.json
```

### Muốn hiểu code?

```
1. README.md → Data Structure
2. QUICK_GUIDE_DATA_STRUCTURE.md
3. Xem code trong propertyModel.js, ipfsService.js
```

### Muốn develop tính năng mới?

```
1. QUICK_GUIDE_DATA_STRUCTURE.md → Code examples
2. README.md → API endpoints
3. Follow pattern có sẵn
```

---

## 📂 CẤU TRÚC THƯ MỤC

```
property-service/
├── 📄 INDEX.md                              ← File này
├── 📘 README.md                             ← Tổng quan, API docs
├── 🧪 POSTMAN_GUIDE.md                      ← Test với Postman
├── ⚡ QUICK_GUIDE_DATA_STRUCTURE.md         ← Quick reference
├── 🚀 QUICK_START.md                        ← Bắt đầu nhanh
│
├── 📄 index.js                              ← API server
├── 📄 propertyModel.js                      ← MongoDB schema
├── 📄 ipfsService.js                        ← IPFS service
├── 📄 mintingClient.js                      ← Client minting service
│
├── 📦 package.json
├── 🔐 .env
└── 🎯 ViePropChain_Property_Service.postman_collection.json
```

---

## ⚡ QUICK START

### 1. Setup (5 phút)

```bash
# Install dependencies
npm install

# Copy .env và config
cp .env.example .env

# Start service
npm start
```

### 2. Test (10 phút)

```bash
# Mở Postman
# Import: ViePropChain_Property_Service.postman_collection.json
# Follow POSTMAN_GUIDE.md
```

---

## 🎓 LEARNING PATH

### Beginner (1-2 giờ)

```
1. README.md (15 phút)
2. QUICK_START.md (10 phút)
3. POSTMAN_GUIDE.md (30 phút)
4. Thực hành test API (30 phút)
```

### Intermediate (3-4 giờ)

```
1. Đọc toàn bộ README.md
2. QUICK_GUIDE_DATA_STRUCTURE.md
3. Đọc code: propertyModel.js, ipfsService.js
4. Implement 1 tính năng nhỏ
```

### Advanced (5+ giờ)

```
1. Hiểu toàn bộ architecture
2. Tối ưu performance
3. Implement tính năng lớn
4. Integration testing
```

---

## 💡 TIPS

### ✅ DO:

- Đọc README.md trước khi code
- Test với Postman trước khi integrate
- Follow code examples trong QUICK_GUIDE
- Check POSTMAN_GUIDE khi gặp lỗi

### ❌ DON'T:

- Skip README.md
- Hardcode values (dùng .env)
- Test trực tiếp trên production
- Ignore error messages

---

## 📞 SUPPORT

### Gặp vấn đề?

1. Check POSTMAN_GUIDE.md → Troubleshooting
2. Check logs trong terminal
3. Verify services đang chạy:
   - Ganache: http://localhost:8545
   - Minting Service: http://localhost:3002
   - Property Service: http://localhost:3003
   - MongoDB connection

---

## 🔗 LINKS QUAN TRỌNG

- **Minting Service:** `d:\DACN\RE-Chain\database_viepropchain_microservice\minting-service`
- **Smart Contracts:** `d:\DACN\RE-Chain\viepropchain\contracts`
- **Postman Collection:** `ViePropChain_Property_Service.postman_collection.json`

---

**Happy Coding! 🚀**

Bắt đầu với **README.md** hoặc **POSTMAN_GUIDE.md** nếu muốn test ngay!
