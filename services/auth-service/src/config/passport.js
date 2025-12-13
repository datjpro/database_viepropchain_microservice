/**
 * ========================================================================
 * PASSPORT GOOGLE OAUTH STRATEGY
 * ========================================================================
 */

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("🔍 Google OAuth callback received");
        console.log("   Profile ID:", profile.id);
        console.log("   Email:", profile.emails[0].value);

        // Check if user exists by googleId
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          console.log("✅ Existing user found:", user.email);

          // Update last login
          user.lastLoginAt = new Date();

          // Update profile photo if changed
          if (profile.photos && profile.photos.length > 0) {
            user.profile.picture = profile.photos[0].value;
          }

          await user.save();
          return done(null, user);
        }

        // Check if user exists by email (migration case)
        user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          console.log("✅ User found by email, linking Google account");

          // Link Google account
          user.googleId = profile.id;
          user.emailVerified = true;

          if (!user.authMethods.some((m) => m.type === "google")) {
            user.authMethods.push({ type: "google", linkedAt: new Date() });
          }

          if (profile.photos && profile.photos.length > 0) {
            user.profile.picture = profile.photos[0].value;
          }

          user.lastLoginAt = new Date();
          await user.save();

          return done(null, user);
        }

        // Create new user
        console.log("🆕 Creating new user with Google account");

        const newUser = new User({
          googleId: profile.id,
          email: profile.emails[0].value,
          emailVerified: true,
          profile: {
            name: profile.displayName,
            displayName: profile.displayName,
            picture: profile.photos ? profile.photos[0].value : null,
          },
          role: "user",
          lastLoginAt: new Date(),
        });

        await newUser.save();
        console.log("✅ New user created:", newUser.email);

        return done(null, newUser);
      } catch (error) {
        console.error("❌ Google OAuth error:", error);
        return done(error, null);
      }
    }
  )
);

module.exports = passport;
