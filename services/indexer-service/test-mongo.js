const mongoose = require("mongoose");
require("dotenv").config();

mongoose
  .connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 })
  .then(async () => {
    const Test = mongoose.model("Test", new mongoose.Schema({ name: String }));
    await Test.create({ name: "test" });
    console.log("✅ Ghi dữ liệu thành công!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Không ghi được:", err.message);
    process.exit(1);
  });
