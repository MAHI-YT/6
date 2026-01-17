const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "tiktokk",
    alias: ["ttt", "mudu"],
    desc: "Download TikTok videos and photo collections",
    category: "downloader",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎯 Please provide a valid TikTok link!\n\nExample:\n.tt1 https://vt.tiktok.com/example/");

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        // Use the new API endpoint
        const api = `/api/download/tiktok?url=${encodeURIComponent(q)}`;
        const response = await axios.get(api);
        const data = response.data;

        if (!data?.statusCode || data.statusCode !== 200 || !data?.results) {
            return await reply("❌ Download failed! Try again later.");
        }

        const result = data.results;
        const author = result.author;

        // Check if content has images (photo collection)
        if (result.images && result.images.length > 0) {
            // Send first image with caption
            await conn.sendMessage(from, {
                image: { url: result.images[0] },
                caption: `🖼️ *${result.title || "TikTok Photos"}*\n👤 *Author:* ${author.nickname}\n📱 *Username:* @${author.unique_id}\n🌍 *Region:* ${result.region}\n🔢 *Images:* ${result.images.length}\n\n> ✨ *DARKZONE-MD*`
            }, { quoted: mek });

            // Send remaining images as a group (up to 5 more to avoid spam)
            const maxAdditionalImages = Math.min(5, result.images.length - 1);
            if (maxAdditionalImages > 0) {
                const imageMessages = [];
                for (let i = 1; i <= maxAdditionalImages; i++) {
                    imageMessages.push({
                        image: { url: result.images[i] },
                        mimetype: 'image/jpeg'
                    });
                }
                
                await conn.sendMessage(from, { 
                    caption: `${maxAdditionalImages} more ${maxAdditionalImages < result.images.length - 1 ? `(${result.images.length - maxAdditionalImages - 1} not shown)` : ''}`,
                    images: imageMessages 
                });
            }
            
        } else if (result.play) {
            // It's a video - send it
            await conn.sendMessage(from, {
                video: { url: result.play },
                mimetype: 'video/mp4',
                caption: `🎵 *${result.title || "TikTok Video"}*\n👤 *Author:* ${author.nickname}\n📱 *Username:* @${author.unique_id}\n🌍 *Region:* ${result.region}\n👁️ *Views:* ${result.play_count}\n\n> ✨ *DARKZONE-MD*`
            }, { quoted: mek });
        } else {
            return await reply("❌ Could not detect content type. Please try a different link.");
        }

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("TikTok1 download error:", e);
        // Retry with alternate method
        try {
            await reply("⚠️ First attempt failed. Trying alternate method...");
            
            // Backup API call using the first API
            const backupApi = `https://api.deline.web.id/downloader/tiktok?url=${encodeURIComponent(q)}`;
            const backupResponse = await axios.get(backupApi);
            const backupData = backupResponse.data;
            
            if (backupData?.status && backupData?.result) {
                const bResult = backupData.result;
                
                if (bResult.type === "video" && bResult.download) {
                    await conn.sendMessage(from, {
                        video: { url: bResult.download },
                        mimetype: 'video/mp4',
                        caption: `🎵 *${bResult.title || "TikTok Video"}*\n👤 *Author:* ${bResult.author.nickname}\n\n> ✨ *DARKZONE-MD*`
                    }, { quoted: mek });
                    
                    await conn.sendMessage(from, { react: { text: '✅', key: m.key } });
                    return;
                }
            }
            
            throw new Error("Backup method also failed");
        } catch (backupError) {
            await reply("❌ Could not download TikTok content. Please check your link and try again.");
            await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
        }
    }
});
