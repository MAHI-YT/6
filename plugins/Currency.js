const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "nanobanana",
    alias: ["nano", "banana", "changebg", "bgchange"],
    desc: "Change image background using AI",
    category: "ai",
    react: "🍌",
    filename: __filename
}, async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        // Check if prompt is provided
        if (!q) {
            return reply(`❌ *Please provide a prompt!*\n\n📌 *Usage:*\n*Reply to image:* .nanobanana sunset beach\n*With URL:* .nanobanana url | prompt`);
        }

        let imageUrl = null;
        let prompt = q;

        // Method 1: Check if replied to an image
        const quotedMsg = mek.quoted ? mek.quoted : m.quoted ? m.quoted : null;
        
        if (quotedMsg && quotedMsg.mtype === 'imageMessage') {
            // Download the image
            const buffer = await quotedMsg.download();
            
            // Upload to get URL
            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', buffer, 'image.jpg');
            
            const uploadRes = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
                headers: form.getHeaders()
            });
            
            if (uploadRes.data?.data?.url) {
                imageUrl = uploadRes.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
            }
            prompt = q;
        } 
        // Method 2: URL provided in message
        else {
            const urlMatch = q.match(/(https?:\/\/[^\s|]+)/gi);
            
            if (urlMatch) {
                imageUrl = urlMatch[0].trim();
                prompt = q.includes('|') ? q.split('|')[1].trim() : q.replace(imageUrl, '').trim();
            }
        }

        if (!imageUrl) {
            return reply(`❌ *No image found!*\n\nReply to an image or provide URL.`);
        }

        if (!prompt || prompt.length < 2) {
            return reply(`❌ *Please provide a prompt!*`);
        }

        await react("⏳");
        await reply("🍌 *Processing image... Please wait...*");

        // Call API
        const apiUrl = `https://api-faa.my.id/faa/nano-banana?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;
        
        console.log("API URL:", apiUrl); // Debug log

        const response = await axios.get(apiUrl, { timeout: 120000 });

        console.log("API Response:", response.data); // Debug log

        // Handle different response types
        let finalImageUrl = null;

        // Check if response is JSON with result/url/image field
        if (response.data) {
            if (typeof response.data === 'string') {
                finalImageUrl = response.data;
            } else if (response.data.result) {
                finalImageUrl = response.data.result;
            } else if (response.data.url) {
                finalImageUrl = response.data.url;
            } else if (response.data.image) {
                finalImageUrl = response.data.image;
            } else if (response.data.data?.url) {
                finalImageUrl = response.data.data.url;
            } else if (response.data.data?.result) {
                finalImageUrl = response.data.data.result;
            }
        }

        if (!finalImageUrl) {
            await react("❌");
            console.log("Full Response:", JSON.stringify(response.data));
            return reply("❌ API did not return an image. Response: " + JSON.stringify(response.data).slice(0, 200));
        }

        // Download the final image
        const imageResponse = await axios.get(finalImageUrl, {
            responseType: 'arraybuffer',
            timeout: 60000
        });

        // Send the image
        await conn.sendMessage(from, {
            image: Buffer.from(imageResponse.data),
            caption: `🍌 *Nano Banana - Done!*\n\n📝 *Prompt:* ${prompt}`
        }, { quoted: mek });

        await react("✅");

    } catch (e) {
        console.error("Nano Banana Error:", e);
        await react("❌");
        reply(`❌ Error: ${e.message}`);
    }
});
