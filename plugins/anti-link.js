const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../command');
const FormData = require('form-data');

cmd({
    pattern: "toanime",
    alias: ["anime", "animestyle", "animeart"],
    react: "🎨",
    desc: "Convert photo to anime style",
    category: "image",
    use: ".toanime (reply to image)",
    filename: __filename,
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        // Must reply to image
        if (!quoted || !quoted.imageMessage) {
            return reply("🖼️ Please reply to an image with `.toanime`");
        }

        await reply("⏳ Converting to anime style, please wait...");

        // Download image from WhatsApp
        const stream = await downloadContentFromMessage(
            quoted.imageMessage,
            'image'
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        // Upload image to temporary hosting
        const form = new FormData();
        form.append('file', buffer, {
            filename: 'toanime.jpg',
            contentType: 'image/jpeg'
        });

        const uploadRes = await axios.post(
            'https://tmpfiles.org/api/v1/upload',
            form,
            { headers: form.getHeaders() }
        );

        const imageUrl = uploadRes.data.data.url.replace(
            'tmpfiles.org/',
            'tmpfiles.org/dl/'
        );

        // Call ToAnime API - Response is direct image
        const apiUrl = `https://api-faa.my.id/faa/toanime?url=${encodeURIComponent(imageUrl)}`;

        const apiRes = await axios.get(apiUrl, { 
            timeout: 60000,
            responseType: 'arraybuffer'
        });

        // Send anime style image
        await conn.sendMessage(
            from,
            {
                image: Buffer.from(apiRes.data),
                caption: "> 🎨 Converted to Anime Style by DARKZONE-MD"
            },
            { quoted: m }
        );

    } catch (err) {
        console.error("TOANIME ERROR:", err);
        reply("❌ Anime conversion failed. Please try again.");
    }
});
