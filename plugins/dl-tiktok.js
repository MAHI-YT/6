const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    desc: "Download TikTok videos and images quickly",
    category: "downloader",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎯 Please provide a valid TikTok link!\n\nExample:\n.tt https://vt.tiktok.com/example/");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        // Use the more reliable API
        const api = `https://api.deline.web.id/downloader/tiktok?url=${encodeURIComponent(q)}`;
        const response = await axios.get(api);
        const data = response.data;

        if (!data?.status || !data?.result) {
            return await reply("❌ Download failed! Try again later.");
        }

        const result = data.result;
        const author = result.author;

        // Handle both video and image types
        if (result.type === "video") {
            await conn.sendMessage(from, {
                video: { url: result.download },
                mimetype: 'video/mp4',
                caption: `🎵 *${result.title || "TikTok Video"}*\n👤 *Author:* ${author.nickname}\n📱 *Username:* @${author.unique_id}\n🌍 *Region:* ${result.region}\n\n> ✨ *DARKZONE-MD*`
            }, { quoted: mek });
        } else {
            // For images or other content types
            await conn.sendMessage(from, {
                image: { url: result.download },
                caption: `🖼️ *${result.title || "TikTok Image"}*\n👤 *Author:* ${author.nickname}\n📱 *Username:* @${author.unique_id}\n🌍 *Region:* ${result.region}\n\n> ✨ *DARKZONE-MD*`
            }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("TikTok download error:", e);
        // Retry with alternate method if first attempt fails
        try {
            await reply("⚠️ First attempt failed. Trying alternate method...");
            
            // Backup API call
            const backupApi = `https://api.deline.web.id/downloader/tiktok?url=${encodeURIComponent(q)}&type=nowatermark`;
            const backupResponse = await axios.get(backupApi);
            const backupData = backupResponse.data;
            
            if (backupData?.status && backupData?.result?.download) {
                await conn.sendMessage(from, {
                    video: { url: backupData.result.download },
                    mimetype: 'video/mp4',
                    caption: `🎵 *TikTok Video*\n\n> ✨ *DARKZONE-MD*`
                }, { quoted: mek });
                
                await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
            } else {
                throw new Error("Backup method also failed");
            }
        } catch (backupError) {
            await reply("❌ Could not download TikTok content. Please check your link and try again.");
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }
    }
});
