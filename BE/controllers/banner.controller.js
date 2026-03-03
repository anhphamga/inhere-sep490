const Banner = require('../model/Banner.model');

const getActiveBanners = async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ sortOrder: 1, createdAt: -1 });
        return res.status(200).json({ ok: true, data: banners });
    } catch (error) {
        return res.status(500).json({ ok: false, message: error.message });
    }
};

module.exports = {
    getActiveBanners,
};
