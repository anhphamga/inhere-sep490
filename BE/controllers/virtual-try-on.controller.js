/**
 * Virtual Try-On Controller
 * Handles proxy requests to API4.ai Virtual Try-On API
 * Uses demo endpoint: https://demo.api4ai.cloud/virtual-try-on/v1/results
 * - Free of charge
 * - No API key required
 * - Rate limits apply
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { virtualTryOnApiUrl } = require('../config/app.config');

/**
 * Proxy virtual try-on request to API4.ai demo
 * POST /api/virtual-try-on/generate
 */
exports.generateTryOn = async (req, res) => {
    try {
        // Create request to API4.ai demo endpoint
        const url = new URL(virtualTryOnApiUrl);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {},
        };

        // Handle FormData from request
        let body = '';
        let contentLength = 0;

        // Forward headers from original request
        if (req.headers['content-type']) {
            options.headers['Content-Type'] = req.headers['content-type'];
        }
        if (req.headers['content-length']) {
            options.headers['Content-Length'] = req.headers['content-length'];
            contentLength = parseInt(req.headers['content-length'], 10);
        }

        // Collect request body
        await new Promise((resolve, reject) => {
            let buffers = [];
            req.on('data', (chunk) => {
                buffers.push(chunk);
            });
            req.on('end', () => {
                body = Buffer.concat(buffers);
                if (body.length > 0) {
                    options.headers['Content-Length'] = body.length;
                }
                resolve();
            });
            req.on('error', reject);
        });

        // Make request to API4.ai
        return new Promise((resolve) => {
            const apiReq = https.request(options, (apiRes) => {
                let data = '';

                apiRes.on('data', (chunk) => {
                    data += chunk;
                });

                apiRes.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        return resolve(
                            res.status(200).json({
                                success: true,
                                data: jsonData,
                            })
                        );
                    } catch {
                        return resolve(
                            res.status(500).json({
                                success: false,
                                message: 'Invalid response from API4.ai',
                                error: data,
                            })
                        );
                    }
                });
            });

            apiReq.on('error', (error) => {
                console.error('Virtual try-on API error:', error.message);
                return resolve(
                    res.status(500).json({
                        success: false,
                        message: error.message || 'Virtual try-on generation failed',
                    })
                );
            });

            // Send body
            if (body.length > 0) {
                apiReq.write(body);
            }
            apiReq.end();
        });
    } catch (error) {
        console.error('Virtual try-on error:', error.message);
        return res.status(500).json({
            success: false,
            message: error.message || 'Virtual try-on generation failed',
        });
    }
};

/**
 * Proxy an external image to avoid CORS issues in the browser.
 * GET /api/virtual-try-on/proxy-image?url=<encoded-url>
 */
exports.proxyImage = (req, res) => {
    const imageUrl = req.query.url;
    if (!imageUrl) {
        return res.status(400).json({ success: false, message: 'Missing url query parameter' });
    }

    let parsedUrl;
    try {
        parsedUrl = new URL(imageUrl);
    } catch {
        return res.status(400).json({ success: false, message: 'Invalid URL' });
    }

    const client = parsedUrl.protocol === 'https:' ? https : http;

    const proxyReq = client.get(imageUrl, { headers: { 'User-Agent': 'InhereProxy/1.0' } }, (proxyRes) => {
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
            // Follow one redirect
            const redirectClient = proxyRes.headers.location.startsWith('https') ? https : http;
            redirectClient.get(proxyRes.headers.location, { headers: { 'User-Agent': 'InhereProxy/1.0' } }, (finalRes) => {
                res.set('Content-Type', finalRes.headers['content-type'] || 'image/jpeg');
                res.set('Cache-Control', 'public, max-age=86400');
                finalRes.pipe(res);
            }).on('error', (err) => {
                console.error('Proxy redirect error:', err.message);
                res.status(502).json({ success: false, message: 'Failed to fetch image (redirect)' });
            });
            return;
        }

        if (proxyRes.statusCode !== 200) {
            return res.status(proxyRes.statusCode).json({ success: false, message: `Remote server returned ${proxyRes.statusCode}` });
        }

        const contentType = proxyRes.headers['content-type'] || '';
        if (!contentType.startsWith('image/')) {
            return res.status(400).json({ success: false, message: 'URL does not point to an image' });
        }

        res.set('Content-Type', contentType);
        res.set('Cache-Control', 'public, max-age=86400');
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        console.error('Proxy image error:', err.message);
        res.status(502).json({ success: false, message: 'Failed to fetch image' });
    });
};
