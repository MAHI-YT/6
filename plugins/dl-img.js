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

        // API Call
        const apiURL = `https://api-faa.my.id/faa/google-image?query=${encodeURIComponent(q)}`;
        
        const res = await axios.get(apiURL, {
            timeout: 30000
        });

        const data = res.data;

        if (!data.result || data.result.length === 0) {
            return reply("✧ No images found.");
        }

        const imageUrls = data.result;
        
        await conn.sendMessage(from, { react: { text: "⬆️", key: m.key } });

        let sentCount = 0;

        // Try to send each image
        for (let i = 0; i < Math.min(imageUrls.length, 5); i++) {
            try {
                // Download image as buffer first
                const imgResponse = await axios.get(imageUrls[i], {
                    responseType: 'arraybuffer',
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://www.google.com/'
                    }
                });

                const imageBuffer = Buffer.from(imgResponse.data);

                // Send buffer
                await conn.sendMessage(from, {
                    image: imageBuffer,
                    caption: sentCount === 0 ? `🔍 *Results for:* ${q}\n\n> 📥 *DARKZONE-MD*` : ""
                }, { quoted: m });

                sentCount++;
                await new Promise(r => setTimeout(r, 1500));

            } catch (imgErr) {
                console.log(`Image ${i + 1} failed, trying next...`);
                continue;
            }
        }

        if (sentCount === 0) {
            return reply("❌ Could not download any images. Try different query.");
        }

        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });

    } catch (error) {
        console.error('Error:', error.message);
        await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
        reply(`⚠️ Error: ${error.message}`);
    }
});
