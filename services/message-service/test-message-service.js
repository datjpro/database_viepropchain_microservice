/**
 * Message Service Test Script
 * Run: node test-message-service.js
 */

const io = require("socket.io-client");
const fetch = require("node-fetch");

const API_URL = "http://localhost:4008";
const WS_URL = "http://localhost:4008";

// Replace with your actual JWT token
const TOKEN = "YOUR_JWT_TOKEN_HERE";

console.log("🧪 Message Service Test Suite\n");

// Test 1: Health Check
async function testHealth() {
  console.log("1️⃣ Testing Health Check...");
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    console.log("✅ Health check passed:", data);
    return true;
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return false;
  }
}

// Test 2: WebSocket Connection
function testWebSocket() {
  return new Promise((resolve) => {
    console.log("\n2️⃣ Testing WebSocket Connection...");

    const socket = io(WS_URL, {
      auth: { token: TOKEN },
    });

    socket.on("connect", () => {
      console.log("✅ WebSocket connected");
      socket.disconnect();
      resolve(true);
    });

    socket.on("connect_error", (error) => {
      console.error("❌ WebSocket connection failed:", error.message);
      resolve(false);
    });

    setTimeout(() => {
      console.error("❌ WebSocket connection timeout");
      socket.disconnect();
      resolve(false);
    }, 5000);
  });
}

// Test 3: Get Chats
async function testGetChats() {
  console.log("\n3️⃣ Testing Get Chats API...");
  try {
    const response = await fetch(`${API_URL}/api/messages/chats`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });
    const data = await response.json();
    console.log("✅ Get chats passed");
    console.log(`   Found ${data.data?.length || 0} chats`);
    return true;
  } catch (error) {
    console.error("❌ Get chats failed:", error.message);
    return false;
  }
}

// Test 4: Send Message via WebSocket
function testSendMessage() {
  return new Promise((resolve) => {
    console.log("\n4️⃣ Testing Send Message...");

    const socket = io(WS_URL, {
      auth: { token: TOKEN },
    });

    socket.on("connect", () => {
      console.log("   Connected, sending test message...");

      socket.emit("send_message", {
        receiver_id: "TEST_RECEIVER_ID", // Replace with actual user ID
        message: "Test message from script",
      });

      socket.on("message_sent", (data) => {
        console.log("✅ Message sent successfully");
        socket.disconnect();
        resolve(true);
      });

      socket.on("message_error", (error) => {
        console.error("❌ Message send failed:", error);
        socket.disconnect();
        resolve(false);
      });
    });

    setTimeout(() => {
      console.error("❌ Send message timeout");
      socket.disconnect();
      resolve(false);
    }, 5000);
  });
}

// Test 5: Get Unread Count
async function testUnreadCount() {
  console.log("\n5️⃣ Testing Unread Count API...");
  try {
    const response = await fetch(`${API_URL}/api/messages/unread-count`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
    });
    const data = await response.json();
    console.log("✅ Unread count passed");
    console.log(`   Unread messages: ${data.unread_count || 0}`);
    return true;
  } catch (error) {
    console.error("❌ Unread count failed:", error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const results = [];

  results.push(await testHealth());
  results.push(await testWebSocket());
  results.push(await testGetChats());
  // results.push(await testSendMessage()); // Uncomment when you have receiver_id
  results.push(await testUnreadCount());

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📊 Test Results:");
  console.log(
    `   Passed: ${results.filter((r) => r).length}/${results.length}`
  );
  console.log(
    `   Failed: ${results.filter((r) => !r).length}/${results.length}`
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  process.exit(results.every((r) => r) ? 0 : 1);
}

// Check if service is running first
fetch(`${API_URL}/health`)
  .then(() => {
    runTests();
  })
  .catch(() => {
    console.error("❌ Message Service is not running on port 4008");
    console.error("   Please start the service first: npm start");
    process.exit(1);
  });
