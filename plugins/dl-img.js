const axios = require('axios');
const config = require('../config');
const { cmd } = require('../command');

cmd({
    pattern: "imagen",
    alias: ["image", "img", "gimage"],
    react: "🖼️",
    desc: "Search for images",
    category: "search",
    use: ".imagen <query>",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply(`❀ Please enter a text to search for an Image.`);

        await conn.sendMessage(from, { react: { text: "🔍", key: m.key } });
        await reply("*🔎 SEARCHING FOR IMAGES...*");

        // New Working API
        const apiURL = `https://api-faa.my.id/faa/google-image?query=${encodeURIComponent(q)}`;
        
        let data;
        try {
            const res = await axios.get(apiURL, {
                timeout: 30000,
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            });
            data = res.data;
            console.log("API Response:", JSON.stringify(data, null, 2));
        } catch (apiErr) {
            console.error("API Error:", apiErr.message);
            return reply("❌ Failed to connect to API. Please try again.");
        }

        // Check API status
        if (!data.status || data.status === false) {
            return reply("⚠️ API returned an error. Please try different query.");
        }

        // Extract image URLs from result array
        let imageUrls = [];
        
        if (Array.isArray(data.result)) {
            // New API format: result is array of URLs directly
            imageUrls = data.result.filter(url => typeof url === 'string' && url.startsWith('http'));
        } else if (Array.isArray(data.data)) {
            // Old format fallback
            imageUrls = data.data.map(d => d.url).filter(u => typeof u === 'string' && u.startsWith('http'));
        }

        if (imageUrls.length === 0) {
            return reply("✧ No images found for your search query.");
        }

        if (imageUrls.length < 2) {
            return reply("✧ Not enough images found for an album.");
        }

        // Update reaction
        await conn.sendMessage(from, { react: { text: "⬆️", key: m.key } });

        // Get up to 10 images
        const selectedImages = imageUrls.slice(0, 10);
        
        // Send each image
        let sentCount = 0;
        for (let i = 0; i < selectedImages.length; i++) {
            try {
                await conn.sendMessage(from, {
                    image: { url: selectedImages[i] },
                    caption: i === 0 ? `🔍 *Results for:* ${q}\n\n> 📥 *DARKZONE-MD*` : ""
                }, { quoted: m });
                
                sentCount++;
                
                // Small delay to prevent flood
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (imgErr) {
                console.warn(`Failed to send image ${i + 1}:`, imgErr.message);
                continue;
            }
        }

        if (sentCount === 0) {
            return reply("❌ Failed to send any images. Please try again.");
        }

        // Success reaction
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

        // Final message
        await conn.sendMessage(from, {
            text: `╭━━━〔 *IMAGE SEARCH* 〕━━━⊷
┃▸ *Query:* ${q}
┃▸ *Images Sent:* ${sentCount}
┃▸ *Total Found:* ${imageUrls.length}
╰━━━⪼

> 📥 *DARKZONE-MD*`
        }, { quoted: m });

    } catch (error) {
        console.error('Image Search Error:', error);
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
        reply(`⚠️ A problem has occurred.\n\n${error.message}`);
    }
});
