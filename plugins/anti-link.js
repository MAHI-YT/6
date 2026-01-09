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

        // Call ToAnime API
        const apiUrl = `https://api-faa.my.id/faa/toanime?url=${encodeURIComponent(imageUrl)}`;

        const apiRes = await axios.get(apiUrl, { 
            timeout: 120000
        });

        // Check response type
        const apiData = apiRes.data;

        // If response is JSON with result/data
        if (apiData && apiData.result) {
            await conn.sendMessage(
                from,
                {
                    image: { url: apiData.result },
                    caption: "> 🎨 Converted to Anime Style by DARKZONE-MD"
                },
                { quoted: m }
            );
        } 
        // If response has data.result
        else if (apiData && apiData.data && apiData.data.result) {
            await conn.sendMessage(
                from,
                {
                    image: { url: apiData.data.result },
                    caption: "> 🎨 Converted to Anime Style by DARKZONE-MD"
                },
                { quoted: m }
            );
        }
        // If response has url/image directly
        else if (apiData && (apiData.url || apiData.image || apiData.imageUrl)) {
            await conn.sendMessage(
                from,
                {
                    image: { url: apiData.url || apiData.image || apiData.imageUrl },
                    caption: "> 🎨 Converted to Anime Style by DARKZONE-MD"
                },
                { quoted: m }
            );
        }
        // If response is direct buffer/image
        else {
            const bufferRes = await axios.get(apiUrl, {
                timeout: 120000,
                responseType: 'arraybuffer'
            });
            
            await conn.sendMessage(
                from,
                {
                    image: Buffer.from(bufferRes.data),
                    caption: "> 🎨 Converted to Anime Style by DARKZONE-MD"
                },
                { quoted: m }
            );
        }

    } catch (err) {
        console.error("TOANIME ERROR:", err.message);
        console.error("Full Error:", err);
        reply("❌ Anime conversion failed. Please try again.");
    }
});
