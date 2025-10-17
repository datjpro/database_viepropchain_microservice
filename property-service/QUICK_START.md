# 🚀 Quick Start - Property Service

## Installation

```bash
cd property-service
npm install
```

## Start Service

```bash
npm start
```

Service will run on **http://localhost:3003**

## Create Sample Data

```bash
node create-samples.js
```

This will create 3 sample properties:

- 1 Apartment (Vinhomes Central Park)
- 1 Land (Nhơn Trạch)
- 1 House (Thảo Điền)

## Test API

```bash
# Get all properties
curl http://localhost:3003/properties

# Get property by ID (copy ID from previous response)
curl http://localhost:3003/properties/[PROPERTY_ID]

# Get statistics
curl http://localhost:3003/properties/stats/overview
```

## Service Architecture

```
Property Service (Port 3003)
    ↓
    ├─→ MongoDB (Store property data)
    ├─→ IPFS/Pinata (Upload metadata)
    └─→ Minting Service (Port 3002) → Blockchain
```

## ✅ Success Indicators

Service started successfully when you see:

```
==================================================
🏢 PROPERTY SERVICE
==================================================
✅ Server running on port 3003
🌐 Environment: development
📍 API: http://localhost:3003
==================================================
✅ Connected to MongoDB (Property Service)
```

## Next Steps

See **API_TEST_GUIDE.md** for complete testing scenarios.
