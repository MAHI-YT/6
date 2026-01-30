const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../command');
const FormData = require('form-data');

cmd({
    pattern: "nanobanana",
    alias: ["nano", "banana", "aiedit", "editai"],
    react: "🍌",
    desc: "Edit image using Nano Banana AI with custom prompt",
    category: "image",
    use: ".nanobanana <prompt> (reply to image or provide URL)",
    filename: __filename,
},
async (conn, mek, m, { from, quoted, reply, args }) => {
    try {
        const text = args.join(' ');
        
        // Check if prompt is provided
        if (!text) {
            return reply(`🍌 *NANO BANANA AI EDITOR*

❗ Please provide a prompt!

*Usage:*
➤ Reply to an image with prompt
➤ Or provide image URL with prompt

*Examples:*
• .nanobanana make it cartoon style
• .nanobanana turn into anime
• .nanobanana add sunglasses
• .nanobanana make background sunset`);
        }

        let imageUrl = '';
        let prompt = text;

        // Check if URL is provided in text
        const urlMatch = text.match(/(https?:\/\/[^\s]+\.(jpg|jpeg|png|webp|gif))/i);
        
        if (urlMatch) {
            // URL provided in message
            imageUrl = urlMatch[1];
            prompt = text.replace(urlMatch[0], '').trim();
            
            if (!prompt) {
                return reply("📝 Please provide a prompt along with the image URL!");
            }
            
        } else if (quoted && quoted.imageMessage) {
            // Image replied - download and upload
            await reply("⏳ Uploading image to server...");

            const stream = await downloadContentFromMessage(
                quoted.imageMessage,
                'image'
            );

            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Upload to temporary hosting
            const form = new FormData();
            form.append('file', buffer, {
                filename: 'nanobanana.jpg',
                contentType: 'image/jpeg'
            });

            const uploadRes = await axios.post(
                'https://tmpfiles.org/api/v1/upload',
                form,
                { headers: form.getHeaders() }
            );

            imageUrl = uploadRes.data.data.url.replace(
                'tmpfiles.org/',
                'tmpfiles.org/dl/'
            );
            
        } else {
            return reply(`🖼️ *No image found!*

Please reply to an image or provide an image URL.

*Example:*
Reply to image: .nanobanana make it anime
With URL: .nanobanana https://example.com/photo.jpg make it cartoon`);
        }

        await reply("🍌 Processing your image with Nano Banana AI...\n⏳ Please wait, this may take a moment...");

        // Call Nano Banana API
        const apiUrl = `https://api-faa.my.id/faa/nano-banana?imageUrl=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;

        const apiRes = await axios.get(apiUrl, { 
            timeout: 120000,
            headers: {
                'User-Agent': 'WhatsApp-Bot/1.0'
            }
        });
        
        const apiData = apiRes.data;

        // Handle different API response structures
        let resultUrl = null;
        
        if (apiData.result) {
            resultUrl = apiData.result;
        } else if (apiData.data?.result) {
            resultUrl = apiData.data.result;
        } else if (apiData.data?.url) {
            resultUrl = apiData.data.url;
        } else if (apiData.url) {
            resultUrl = apiData.url;
        } else if (apiData.image) {
            resultUrl = apiData.image;
        } else if (apiData.data?.image) {
            resultUrl = apiData.data.image;
        }

        // Check if we got a result
        if (!resultUrl) {
            console.log("API Response:", JSON.stringify(apiData));
            return reply("❌ Edit failed. API returned no image.\n\nPlease try again with a different prompt.");
        }

        // Send the edited image
        await conn.sendMessage(
            from,
            {
                image: { url: resultUrl },
                caption: `✨ *NANO BANANA AI*

🎨 *Prompt:* ${prompt}

> 🍌 Image Edited Successfully!`
            },
            { quoted: m }
        );

    } catch (err) {
        console.error("NANO BANANA ERROR:", err?.response?.data || err.message || err);
        
        if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
            return reply("⏱️ Request timed out. The image might be too large or the server is busy. Please try again.");
        }
        
        reply("❌ Image editing failed. Please try again later.\n\nError: " + (err.message || "Unknown error"));
    }
});
