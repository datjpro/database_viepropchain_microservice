/**
 * ========================================================================
 * VERIFY TOKEN OPTIONAL MIDDLEWARE
 *
 * This middleware attempts to read a JWT token from several locations
 * (Authorization header, query params, or custom headers). If a token is
 * present it verifies it and attaches `req.user`. If no token is provided
 * it will not return 401 — instead it sets `req.user = null` and calls
 * `next()` so routes like GET /auth/me can still return token-derived info
 * for debugging or for clients that pass the token in other ways.
 *
 * If a token is present but invalid/expired, this will return 401 as usual.
 * ========================================================================
 */

const jwtService = require("../services/jwtService");

const verifyTokenOptional = async (req, res, next) => {
  try {
    // Look in Authorization header
    let token = req.headers.authorization
      ? req.headers.authorization.replace(/^Bearer\s+/i, "")
      : null;

    // Fallbacks: query param `token` or `sessionToken`, or header `x-session-token`
    if (!token) {
      token =
        req.query?.token ||
        req.query?.sessionToken ||
        req.headers["x-session-token"] ||
        null;
    }

    // If still no token, allow the request but mark as unauthenticated
    if (!token) {
      req.user = null;
      return next();
    }

    // If token looks like an unresolved Postman variable (e.g. "{{landlord_token}}")
    // or is clearly too short to be a JWT, treat it as no token so we don't
    // attempt verification and return 401 for placeholder values.
    const trimmed = String(token || "").trim();
    if (
      trimmed.includes("{{") ||
      trimmed.includes("}}") ||
      trimmed.length < 20
    ) {
      req.user = null;
      return next();
    }

    // If token present, verify normally and attach decoded payload
    const decoded = jwtService.verifyToken(token);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: error.message || "Invalid or expired token",
    });
  }
};

module.exports = verifyTokenOptional;
