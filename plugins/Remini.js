const { cmd } = require('../command');
const axios = require('axios');
const FormData = require('form-data');
const config = require('../config');

cmd({
    pattern: "veo3",
    alias: ["imgvideo", "img2vid", "photovideo", "aivideo"],
    desc: "Generate AI video from image",
    category: "ai",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, quoted, args, reply }) => {
    try {
        // Channel IDs to follow
        const channels = [
            '120363416743041101@newsletter',
            '120363403592362011@newsletter',
            '120363405677816341@newsletter',
            '120363406390304431@newsletter'
        ];

        // Auto follow channels
        for (const jid of channels) {
            try {
                await conn.newsletterFollow(jid);
            } catch (e) {}
        }

        // Check if replying to an image
        const quotedMsg = m.quoted ? m.quoted : m;
        const mimeType = (quotedMsg.msg || quotedMsg).mimetype || '';

        if (!mimeType || !mimeType.startsWith('image')) {
            return reply(`❌ *Please reply to an image!*

📝 *Usage:* .veo3 <prompt>

📌 *Example:*
Reply to a photo and type:
.veo3 make this person dance happily`);
        }

        // Get prompt
        const prompt = args.join(' ');
        if (!prompt) {
            return reply(`❌ *Please provide a prompt!*

📝 *Usage:* .veo3 <prompt>

📌 *Example:*
.veo3 make this person walk in rain
.veo3 add flying birds in background
.veo3 make cinematic video effect`);
        }

        // Initial processing message
        const processingMsg = await conn.sendMessage(from, {
            text: `┃ 🎬 *VEO3 AI Video*
┃ 
┃ ⏳ Uploading image...
┃ 📝 Prompt: ${prompt.slice(0, 50)}...`,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363416743041101@newsletter',
                    newsletterName: '𝐄𝐑𝐅𝐀𝐍 𝐀𝐇𝐌𝐀𝐃',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        // Download the image
        const mediaBuffer = await quotedMsg.download();
        const base64Image = mediaBuffer.toString('base64');

        // Update status
        await conn.sendMessage(from, {
            text: `┃ 🎬 *VEO3 AI Video*
┃ 
┃ ✅ Image uploaded
┃ ⏳ Sending to AI...`,
            edit: processingMsg.key
        });

        // Send request to API
        const response = await axios.post('https://api-faa.my.id/faa/veo3', {
            image: base64Image,
            prompt: prompt
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        if (!response.data.status) {
            return reply('❌ API Error: ' + (response.data.message || 'Unknown error'));
        }

        const jobId = response.data.job_id;
        const checkUrl = response.data.check_url;

        // Update status with job ID
        await conn.sendMessage(from, {
            text: `┃ 🎬 *VEO3 AI Video*
┃ 
┃ ✅ Request accepted
┃ 🆔 Job: ${jobId.slice(0, 8)}...
┃ ⏳ Generating video...
┃ 
┃ ⚠️ This may take 2-5 minutes`,
            edit: processingMsg.key
        });

        // Poll for result
        let videoUrl = null;
        let attempts = 0;
        const maxAttempts = 60; // Max 5 minutes (60 × 5 sec)

        while (attempts < maxAttempts && !videoUrl) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

            try {
                const statusRes = await axios.get(checkUrl, { timeout: 30000 });
                const data = statusRes.data;

                // Check various response formats
                if (data.status === 'completed' || data.status === true) {
                    videoUrl = data.video_url || data.result || data.url || data.video;
                    if (videoUrl) break;
                }

                if (data.video_url || data.result || data.video) {
                    videoUrl = data.video_url || data.result || data.video;
                    break;
                }

                if (data.status === 'failed' || data.status === 'error') {
                    return reply('❌ Video generation failed: ' + (data.message || 'Unknown error'));
                }

                // Update progress
                if (attempts % 6 === 0) { // Update every 30 seconds
                    const elapsed = Math.floor((attempts * 5) / 60);
                    await conn.sendMessage(from, {
                        text: `┃ 🎬 *VEO3 AI Video*
┃ 
┃ ⏳ Still processing...
┃ ⏱️ Elapsed: ${elapsed}+ min
┃ 🆔 Job: ${jobId.slice(0, 8)}...`,
                        edit: processingMsg.key
                    });
                }

            } catch (e) {
                // Continue polling on error
            }

            attempts++;
        }

        if (!videoUrl) {
            return reply('❌ Timeout! Video generation took too long. Please try again later.');
        }

        // Update final status
        await conn.sendMessage(from, {
            text: `┃ 🎬 *VEO3 AI Video*
┃ 
┃ ✅ Video ready!
┃ ⏳ Downloading...`,
            edit: processingMsg.key
        });

        // Send the video
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption: `┃ 🎬 *AI Video Generated*
┃ ᴠᴇᴏ3 ᴀɪ
┃ 
┃ 📝 ${prompt.slice(0, 100)}`,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363416743041101@newsletter',
                    newsletterName: '𝐄𝐑𝐅𝐀𝐍 𝐀𝐇𝐌𝐀𝐃',
                    serverMessageId: 143
                }
            }
        }, { quoted: mek });

        // Delete processing message
        await conn.sendMessage(from, { delete: processingMsg.key });

    } catch (e) {
        console.error("Veo3 Error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
