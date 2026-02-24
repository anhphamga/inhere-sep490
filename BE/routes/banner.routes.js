const express = require("express");
const router = express.Router();

console.log("✅ banner.routes.js loaded");

let Banner;
try {
  // SỬA ĐÚNG THEO THƯ MỤC THỰC TẾ CỦA BẠN:
  Banner = require("../model/Banner.model"); // nếu bạn có thư mục "model"
  // Banner = require("../models/Banner.model"); // nếu bạn có thư mục "models"
  console.log("✅ Banner model loaded");
} catch (e) {
  console.log("❌ Banner model load failed:", e.message);
}

router.get("/", async (req, res) => {
  try {
    if (!Banner) return res.status(500).json({ ok: false, message: "Banner model not loaded" });

    const banners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
    return res.json({ ok: true, data: banners });
  } catch (e) {
    return res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;
