const jwt = require("jsonwebtoken");

const verifySocketToken = (socket, next) => {
  try {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userEmail = decoded.email;

    console.log(
      `✅ Socket authenticated: ${socket.userEmail} (${socket.userId})`
    );
    next();
  } catch (error) {
    console.error("❌ Socket authentication failed:", error.message);
    next(new Error("Authentication error: Invalid token"));
  }
};

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "No token provided",
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId;
    req.userEmail = decoded.email;

    console.log(`✅ HTTP authenticated: ${req.userEmail} (${req.userId})`);
    next();
  } catch (error) {
    console.error("❌ HTTP authentication failed:", error.message);
    return res.status(401).json({
      success: false,
      error: "Invalid or expired token",
    });
  }
};

module.exports = { verifySocketToken, verifyToken };
