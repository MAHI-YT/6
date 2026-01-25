const axios = require("axios");
const { cmd } = require("../command");

cmd({
  pattern: "snapchat",
  alias: ["snap", "snapdl", "snack", "snackvideo"],
  desc: "Download videos from SnackVideo/Snapchat",
  react: "📸",
  category: "download",
  filename: __filename
}, async (conn, m, store, { from, q, reply }) => {
  try {
    if (!q) return reply("> *😈 Please provide a valid video URL.*");

    // Show "working" reaction
    await conn.sendMessage(from, { react: { text: "⏳", key: m.key } });

    // New Working API
    const apiURL = `https://api.deline.web.id/downloader/snackvideo?url=${encodeURIComponent(q)}`;

    // Get API response
    const apiResp = await axios.get(apiURL, { 
      timeout: 20000, 
      maxRedirects: 5 
    });
    
    const data = apiResp.data;

    // Debug log
    console.log("API Response:", JSON.stringify(data, null, 2));

    // Check API status and get video URL
    if (!data.status) {
      return reply("⚠️ API returned an error. Please check your URL.");
    }

    // Extract video URL from response
    const videoUrl = data.result?.video;

    if (!videoUrl) {
      console.error("No video URL found in response:", data);
      return reply("⚠️ Could not find video URL in API response.");
    }

    // Update reaction to uploading
    await conn.sendMessage(from, { react: { text: "⬆️", key: m.key } });

    // Download video as buffer
    let videoBuffer = null;
    try {
      const videoResp = await axios.get(videoUrl, {
        responseType: "arraybuffer",
        timeout: 60000,
        maxRedirects: 5,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": "https://www.snackvideo.com/"
        }
      });

      videoBuffer = Buffer.from(videoResp.data, "binary");
      const sizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);
      console.log(`✅ Downloaded video: ${sizeMB} MB`);

    } catch (downloadErr) {
      console.warn("Buffer download failed:", downloadErr.message);
      videoBuffer = null;
    }

    // Caption for video
    const caption = `╭━━━〔 *SNACKVIDEO DOWNLOADER* 〕━━━⊷
┃▸ *Status:* Success ✅
┃▸ *Creator:* ${data.creator || "Unknown"}
╰━━━⪼

> 📥 *DARKZONE-MD*`;

    // Method 1: Send as video buffer
    if (videoBuffer && videoBuffer.length > 0) {
      try {
        await conn.sendMessage(from, {
          video: videoBuffer,
          mimetype: "video/mp4",
          fileName: "snackvideo.mp4",
          caption: caption
        }, { quoted: m });

        // Success reaction
        await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
        return;

      } catch (sendErr) {
        console.warn("Send buffer failed:", sendErr.message);
      }
    }

    // Method 2: Send as document with URL
    try {
      await conn.sendMessage(from, {
        document: { url: videoUrl },
        mimetype: "video/mp4",
        fileName: "snackvideo.mp4",
        caption: caption
      }, { quoted: m });

      await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
      return;

    } catch (docErr) {
      console.warn("Send document failed:", docErr.message);
    }

    // Method 3: Send direct link as fallback
    await reply(`❌ Could not upload video directly.\n\n📥 *Direct Download Link:*\n${videoUrl}`);
    await conn.sendMessage(from, { react: { text: "⚠️", key: m.key } });

  } catch (error) {
    console.error("Downloader Error:", error.stack || error);
    await conn.sendMessage(from, { react: { text: "❌", key: m.key } });
    reply("❌ Error processing your request. Please try again later.");
  }
});
