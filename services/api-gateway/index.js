/**
 * ========================================================================
 * API GATEWAY - Port 4000
 * ========================================================================
 * Nhiệm vụ: Cổng vào duy nhất cho Frontend, định tuyến đến các services
 * ========================================================================
 */

const express = require("express");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");

const app = express();
const PORT = process.env.PORT || 4000;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(
  cors({
    origin: "http://localhost:3000", // React Frontend
    credentials: true,
  })
);

// DO NOT use express.json() here - let each service parse its own body

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "API Gateway",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// ROUTING TO MICROSERVICES
// ============================================================================

// Auth Service (4010) - /api/auth/* - Gmail OAuth + Wallet Linking
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: "http://localhost:4010",
    changeOrigin: true,
    pathRewrite: {
      "^/api/auth": "/auth", // Rewrite to /auth on auth service
    },
    onError: (err, req, res) => {
      console.error("❌ Auth Service Error:", err.message);
      res.status(503).json({
        success: false,
        error: "Auth Service unavailable",
        message: err.message,
      });
    },
  })
);

// IPFS Service (4002) - /api/ipfs/*
app.use(
  "/api/ipfs",
  createProxyMiddleware({
    target: "http://localhost:4002",
    changeOrigin: true,
    pathRewrite: {
      "^/api/ipfs": "",
    },
    onError: (err, req, res) => {
      console.error("❌ IPFS Service Error:", err.message);
      res.status(503).json({
        success: false,
        error: "IPFS Service unavailable",
      });
    },
  })
);

// Admin Service (4003) - /api/admin/*
app.use(
  "/api/admin",
  createProxyMiddleware({
    target: "http://localhost:4003",
    changeOrigin: true,
    pathRewrite: {
      "^/api/admin": "",
    },
    onError: (err, req, res) => {
      console.error("❌ Admin Service Error:", err.message);
      res.status(503).json({
        success: false,
        error: "Admin Service unavailable",
      });
    },
  })
);

// Blockchain Service (4004) - /api/blockchain/*
app.use(
  "/api/blockchain",
  createProxyMiddleware({
    target: "http://localhost:4004",
    changeOrigin: true,
    pathRewrite: {
      "^/api/blockchain": "",
    },
    onError: (err, req, res) => {
      console.error("❌ Blockchain Service Error:", err.message);
      res.status(503).json({
        success: false,
        error: "Blockchain Service unavailable",
      });
    },
  })
);

// Query Service (4005) - /api/query/*
app.use(
  "/api/query",
  createProxyMiddleware({
    target: "http://localhost:4005",
    changeOrigin: true,
    pathRewrite: {
      "^/api/query": "",
    },
    onError: (err, req, res) => {
      console.error("❌ Query Service Error:", err.message);
      res.status(503).json({
        success: false,
        error: "Query Service unavailable",
      });
    },
  })
);

// User Service (4006) - /api/user/*
app.use(
  "/api/user",
  createProxyMiddleware({
    target: "http://localhost:4006",
    changeOrigin: true,
    pathRewrite: {
      "^/api/user": "",
    },
    onError: (err, req, res) => {
      console.error("❌ User Service Error:", err.message);
      res.status(503).json({
        success: false,
        error: "User Service unavailable",
      });
    },
  })
);

// KYC Service (4007) - /api/kyc/*
app.use(
  "/api/kyc",
  createProxyMiddleware({
    target: "http://localhost:4007",
    changeOrigin: true,
    pathRewrite: {
      "^/api/kyc": "",
    },
    logLevel: "debug",
    onProxyReq: (proxyReq, req, res) => {
      console.log(
        "🔄 [API Gateway] Forwarding to KYC Service:",
        req.method,
        req.originalUrl
      );
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(
        "✅ [API Gateway] Response from KYC Service:",
        proxyRes.statusCode
      );
    },
    onError: (err, req, res) => {
      console.error("❌ KYC Service Error:", err.message);
      console.error("❌ Stack:", err.stack);
      if (!res.headersSent) {
        res.status(503).json({
          success: false,
          error: "KYC Service unavailable",
          message: err.message,
        });
      }
    },
  })
);

// Marketplace Service (4008) - /api/marketplace/*
app.use(
  "/api/marketplace",
  createProxyMiddleware({
    target: "http://localhost:4008",
    changeOrigin: true,
    pathRewrite: {
      "^/api/marketplace": "",
    },
    onError: (err, req, res) => {
      console.error("❌ Marketplace Service Error:", err.message);
      res.status(503).json({
        success: false,
        error: "Marketplace Service unavailable",
      });
    },
  })
);

// ============================================================================
// ERROR HANDLER
// ============================================================================
app.use((err, req, res, next) => {
  console.error("❌ API Gateway Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: err.message,
  });
});

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      API GATEWAY                             ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                               ║
║  Frontend: http://localhost:3000                             ║
║                                                              ║
║  Routes:                                                     ║
║  ├─ /api/auth/*       → Auth Service (4010) Gmail OAuth     ║
║  ├─ /api/ipfs/*       → IPFS Service (4002)                  ║
║  ├─ /api/admin/*      → Admin Service (4003)                 ║
║  ├─ /api/blockchain/*    → Blockchain Service (4004)         ║
║  ├─ /api/query/*         → Query Service (4005)              ║
║  ├─ /api/user/*          → User Service (4006)               ║
║  ├─ /api/kyc/*           → KYC Service (4007)                ║
║  └─ /api/marketplace/*   → Marketplace Service (4008)        ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
