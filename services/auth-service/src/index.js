/**
 * ========================================================================
 * AUTH SERVICE - Port 4001
 * ========================================================================
 * Nhiệm vụ: Google OAuth Login, Wallet Linking, JWT token
 * ========================================================================
 */

const express = require("express");
const session = require("express-session");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/database");
const passport = require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const googleOAuthRoutes = require("./routes/googleOAuthRoutes");
const walletLinkingRoutes = require("./routes/walletLinkingRoutes");

const app = express();
const PORT = process.env.PORT || 4001;

// ============================================================================
// MIDDLEWARE
// ============================================================================
app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Session middleware (required for Passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "viepropchain-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// ============================================================================
// DATABASE CONNECTION
// ============================================================================
connectDB();

// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get("/health", (req, res) => {
  const mongoose = require("mongoose");
  res.json({
    success: true,
    service: "Auth Service",
    port: PORT,
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ============================================================================
// ROUTES
// ============================================================================
app.use("/auth", googleOAuthRoutes); // Google OAuth routes
app.use("/auth", walletLinkingRoutes); // Wallet linking routes
app.use("/", authRoutes); // Legacy wallet auth routes (for backward compatibility)

// ============================================================================
// START SERVER
// ============================================================================
app.listen(PORT, () => {
  const mongoose = require("mongoose");
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                      AUTH SERVICE                            ║
║══════════════════════════════════════════════════════════════║
║  Port: ${PORT}                                                  ║
║  MongoDB: ${
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected"
  }                                           ║
║                                                              ║
║  🔐 Google OAuth:                                            ║
║  ├─ GET  /auth/google            - Login with Google        ║
║  ├─ GET  /auth/google/callback   - OAuth callback           ║
║  ├─ GET  /auth/me                - Get current user         ║
║  └─ POST /auth/logout            - Logout                   ║
║                                                              ║
║  🔗 Wallet Linking:                                          ║
║  ├─ POST /auth/link-wallet/message  - Get sign message      ║
║  ├─ POST /auth/link-wallet          - Link wallet           ║
║  └─ POST /auth/unlink-wallet        - Unlink wallet         ║
║                                                              ║
║  🔑 Legacy Wallet Auth (backward compatibility):            ║
║  ├─ POST /get-nonce          - Get nonce for signing        ║
║  └─ POST /verify-signature   - Verify & login               ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
