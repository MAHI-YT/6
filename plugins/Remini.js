const { cmd } = require('../command');
const axios = require('axios');
const config = require('../config');

cmd({
    pattern: "veo3",
    alias: ["img2vid", "aivideo"],
    desc: "Generate AI video from image",
    category: "ai",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, quoted, args, reply }) => {
    try {
        // Auto follow channels
        const channels = [
            '120363416743041101@newsletter',
            '120363403592362011@newsletter',
            '120363405677816341@newsletter',
            '120363406390304431@newsletter'
        ];
        for (const jid of channels) {
            try { await conn.newsletterFollow(jid); } catch (e) {}
        }

        const prompt = args.join(' ');
        if (!prompt) {
            return reply('❌ Please provide a prompt!\n\nUsage: .veo3 <prompt>');
        }

        await reply('⏳ Generating video... Please wait.');

        let apiUrl = `https://api-faa.my.id/faa/veo3?prompt=${encodeURIComponent(prompt)}`;

        // If replied to image, get image URL
        if (quoted && quoted.mimetype && quoted.mimetype.startsWith('image')) {
            const mediaBuffer = await quoted.download();
            const base64 = mediaBuffer.toString('base64');
            apiUrl += `&image=${encodeURIComponent(base64)}`;
        }

        // First request
        const res = await axios.get(apiUrl, { timeout: 60000 });

        if (!res.data.status) {
            return reply('❌ API Error: ' + res.data.message);
        }

        const checkUrl = res.data.check_url;
        await reply('✅ Request accepted! Waiting for video...');

        // Poll for result
        let videoUrl = null;
        for (let i = 0; i < 60; i++) {
            await new Promise(r => setTimeout(r, 5000));
            
            const check = await axios.get(checkUrl);
            
            if (check.data.video_url || check.data.result || check.data.video) {
                videoUrl = check.data.video_url || check.data.result || check.data.video;
                break;
            }
            
            if (check.data.status === 'failed') {
                return reply('❌ Generation failed!');
            }
        }

        if (!videoUrl) {
            return reply('❌ Timeout! Try again.');
        }

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption: '🎬 VEO3 AI Video'
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply('❌ Error: ' + e.message);
    }
});
