# IPFS Service - Restructured

## 📁 New Structure (MVC Pattern)

```
ipfs-service/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # MongoDB connection
│   │   └── pinata.js        # Pinata configuration
│   │
│   ├── controllers/         # Request handlers
│   │   └── uploadController.js
│   │
│   ├── services/            # Business logic
│   │   ├── pinataService.js       # Pinata API integration
│   │   └── ipfsMetadataService.js # Database operations
│   │
│   ├── routes/              # Route definitions
│   │   ├── uploadRoutes.js
│   │   └── contentRoutes.js
│   │
│   └── index.js             # Main entry point
│
├── .env
├── .env.example
└── package.json
```

## 🔄 Changes from Old Structure

### Before:

- All code in `index.js` (500+ lines)
- Hard to maintain and test
- Tight coupling

### After:

- **Config**: Separated configuration (database, Pinata)
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic (upload files, save to DB)
- **Routes**: Organized route definitions
- **Clean separation of concerns**

## 🚀 Run

```bash
cd services/ipfs-service
npm start
```

## 📝 Benefits

✅ **Maintainability**: Easy to find and modify code
✅ **Testability**: Each module can be tested independently
✅ **Scalability**: Easy to add new features
✅ **Reusability**: Services can be reused in different controllers
