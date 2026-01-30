const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "nanobanana",
    alias: ["nano", "banana", "changebg"],
    desc: "Change image background using AI",
    category: "ai",
    react: "🍌",
    filename: __filename
}, async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        if (!q) return reply("❌ Provide prompt! Reply to image with .nanobanana [prompt]");

        let imageUrl = null;
        let prompt = q;

        // Get quoted message
        const quoted = mek.quoted || m.quoted;
        
        if (quoted?.mtype === 'imageMessage') {
            const buffer = await quoted.download();
            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', buffer, 'image.jpg');
            
            const upload = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
                headers: form.getHeaders()
            });
            
            imageUrl = upload.data?.data?.url?.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        } else {
            const match = q.match(/(https?:\/\/[^\s|]+)/);
            if (match) {
                imageUrl = match[0];
                prompt = q.replace(imageUrl, '').replace('|', '').trim();
            }
        }

        if (!imageUrl) return reply("❌ Reply to image or provide URL!");
        if (!prompt) return reply("❌ Provide a prompt!");

        await react("⏳");

        const apiUrl = `https://api-faa.my.id/faa/nano-banana?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;

        // Try as arraybuffer first (direct image)
        try {
            const res = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 120000
            });
            
            const contentType = res.headers['content-type'];
            
            if (contentType && contentType.includes('image')) {
                // Direct image response
                await conn.sendMessage(from, {
                    image: Buffer.from(res.data),
                    caption: `🍌 *Done!*\n📝 Prompt: ${prompt}`
                }, { quoted: mek });
                return await react("✅");
            } else {
                // JSON response
                const data = JSON.parse(Buffer.from(res.data).toString());
                const imgUrl = data.result || data.url || data.image || data.data?.url;
                
                if (imgUrl) {
                    const img = await axios.get(imgUrl, { responseType: 'arraybuffer' });
                    await conn.sendMessage(from, {
                        image: Buffer.from(img.data),
                        caption: `🍌 *Done!*\n📝 Prompt: ${prompt}`
                    }, { quoted: mek });
                    return await react("✅");
                }
            }
        } catch (err) {
            // Try as JSON
            const res = await axios.get(apiUrl, { timeout: 120000 });
            const imgUrl = res.data?.result || res.data?.url || res.data?.image;
            
            if (imgUrl) {
                const img = await axios.get(imgUrl, { responseType: 'arraybuffer' });
                await conn.sendMessage(from, {
                    image: Buffer.from(img.data),
                    caption: `🍌 *Done!*\n📝 Prompt: ${prompt}`
                }, { quoted: mek });
                return await react("✅");
            }
        }

        await react("❌");
        reply("❌ Failed to get image from API");

    } catch (e) {
        console.error("Error:", e);
        await react("❌");
        reply(`❌ Error: ${e.message}`);
    }
});
