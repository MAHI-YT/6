const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "nanobanana",
    alias: ["nano", "banana", "changebg", "bgchange"],
    desc: "Change image background using AI - Reply to image or provide URL",
    category: "ai",
    react: "🍌",
    filename: __filename
}, async (conn, mek, m, { from, args, q, reply, react, quoted }) => {
    try {
        // Check if prompt is provided
        if (!q) {
            return reply(`❌ *Please provide a prompt!*\n\n📌 *Usage Methods:*\n\n*Method 1:* Reply to an image\n\`.nanobanana change background to beach\`\n\n*Method 2:* Provide image URL\n\`.nanobanana https://example.com/image.jpg | sunset background\``);
        }

        let imageUrl = null;
        let prompt = q;

        // Method 1: Check if user replied to an image
        const quotedMsg = m.quoted ? m.quoted : null;
        const isQuotedImage = quotedMsg && (quotedMsg.mtype === 'imageMessage' || quotedMsg.type === 'imageMessage');

        if (isQuotedImage) {
            // Get image URL from quoted message
            imageUrl = await quotedMsg.download?.() || null;
            
            // If we need to get URL from quoted image
            if (quotedMsg.url) {
                imageUrl = quotedMsg.url;
            } else {
                // Download and upload to get URL
                const buffer = await quotedMsg.download();
                // Upload buffer to temporary hosting to get URL
                const FormData = require('form-data');
                const form = new FormData();
                form.append('file', buffer, { filename: 'image.jpg' });
                
                const uploadRes = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
                    headers: form.getHeaders()
                });
                
                if (uploadRes.data && uploadRes.data.data && uploadRes.data.data.url) {
                    imageUrl = uploadRes.data.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                }
            }
            prompt = q;
        } 
        // Method 2: Check if URL is provided in the message
        else {
            const urlRegex = /(https?:\/\/[^\s|]+)/gi;
            const urlMatch = q.match(urlRegex);
            
            if (urlMatch && urlMatch[0]) {
                imageUrl = urlMatch[0].trim();
                // Extract prompt (after URL or after |)
                if (q.includes('|')) {
                    prompt = q.split('|')[1]?.trim() || q.replace(imageUrl, '').trim();
                } else {
                    prompt = q.replace(imageUrl, '').trim();
                }
            }
        }

        // Validate we have image URL
        if (!imageUrl) {
            return reply(`❌ *No image found!*\n\nPlease reply to an image or provide an image URL.\n\n*Example:*\n\`.nanobanana https://example.com/photo.jpg | beach background\``);
        }

        // Validate we have a prompt
        if (!prompt || prompt.length < 2) {
            return reply(`❌ *Please provide a prompt describing the background change!*\n\n*Example:*\n\`.nanobanana futuristic city background\``);
        }

        await react("⏳");
        await reply("🍌 *Processing your image...*\n_Please wait, this may take a moment..._");

        // Call the Nano Banana API
        const apiUrl = `https://api-faa.my.id/faa/nano-banana?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;
        
        const response = await axios.get(apiUrl, {
            responseType: 'arraybuffer',
            timeout: 60000, // 60 seconds timeout
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        // Check if response is valid
        if (!response.data || response.data.length === 0) {
            await react("❌");
            return reply("❌ Failed to process the image. Please try again.");
        }

        // Send the processed image back
        await conn.sendMessage(from, {
            image: Buffer.from(response.data),
            caption: `🍌 *Nano Banana - Background Changed!*\n\n📝 *Prompt:* ${prompt}\n\n_Powered by Nano Banana AI_`
        }, { quoted: mek });

        await react("✅");

    } catch (e) {
        console.error("Error in Nano Banana command:", e);
        await react("❌");
        
        if (e.code === 'ECONNABORTED' || e.message.includes('timeout')) {
            return reply("⏰ Request timed out. The image processing is taking too long. Please try again.");
        }
        
        reply("❌ An error occurred while processing the image. Please try again later.");
    }
});
