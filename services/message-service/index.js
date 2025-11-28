require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const connectDatabase = require("./src/config/database");
const messageRoutes = require("./src/routes/messageRoutes");
const keyRoutes = require("./src/routes/keyRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const SocketHandler = require("./src/socket/socketHandler");
const { verifySocketToken } = require("./src/middleware/auth");

const app = express();
const httpServer = createServer(app);

// Socket.IO setup with CORS
const io = new Server(httpServer, {
  cors: {
    origin: "*", // In production, specify allowed origins
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path}`);
  next();
});

// Database connection
connectDatabase();

// REST API Routes
app.use("/api/messages", messageRoutes);
app.use("/api/messages/keys", keyRoutes);
app.use("/api/messages/admin", adminRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({
    success: true,
    service: "message-service",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// Socket.IO authentication middleware
io.use(verifySocketToken);

// Initialize Socket Handler
const socketHandler = new SocketHandler(io);

// Handle socket connections
io.on("connection", (socket) => {
  socketHandler.handleConnection(socket);
});

// Admin endpoint to check online users
app.get("/api/admin/online-users", (req, res) => {
  res.json({
    success: true,
    online_count: socketHandler.getOnlineUsersCount(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
  });
});

// Start server
const PORT = process.env.PORT || 4008;

httpServer.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log(`🚀 Message Service running on port ${PORT}`);
  console.log(`📡 WebSocket server is ready`);
  console.log(`🌐 HTTP API: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
  console.log("=".repeat(50) + "\n");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("⚠️ SIGTERM signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\n⚠️ SIGINT signal received: closing HTTP server");
  httpServer.close(() => {
    console.log("✅ HTTP server closed");
    process.exit(0);
  });
});

module.exports = { app, io, httpServer };
