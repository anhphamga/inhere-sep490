const express = require('express');

const router = express.Router();

// GET /api/proxy-image?url=
// Proxies remote image to avoid browser CORS issues on frontend.
router.get('/', async (req, res) => {
  const rawUrl = String(req.query.url || '').trim();
  if (!rawUrl) {
    return res.status(400).json({
      success: false,
      message: 'Missing required query param: url',
    });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only http/https URLs are supported');
    }
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid image URL',
      error: error.message,
    });
  }

  try {
    const upstreamResponse = await fetch(parsedUrl.toString(), {
      method: 'GET',
      redirect: 'follow',
    });

    if (!upstreamResponse.ok) {
      return res.status(upstreamResponse.status).json({
        success: false,
        message: 'Failed to fetch image from source',
        status: upstreamResponse.status,
      });
    }

    const contentType = upstreamResponse.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await upstreamResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to proxy image',
      error: error.message,
    });
  }
});

module.exports = router;
