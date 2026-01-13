const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "music",
    alias: ["play", "song", "audio", "roohi"],
    desc: "Download YouTube audio",
    category: "downloader",
    react: "🎶",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("🎧 Please provide a song name!\n\nExample: .music Faded Alan Walker");

        await reply("");

        const api = `https://api.deline.web.id/downloader/ytplay?q=${encodeURIComponent(q)}`;
        const res = await axios.get(api, { timeout: 60000 });
        const json = res.data;

        if (!json?.status || !json?.result) {
            return await reply("❌ No results found!");
        }

        const result = json.result;
        const title = result.title || "Unknown Song";
        const thumbnail = result.thumbnail;
        const quality = result.pick?.quality || "128kbps";
        const size = result.pick?.size || "Unknown";
        const audioUrl = result.dlink;

        if (!audioUrl) {
            return await reply("❌ Download failed! Try again later.");
        }

        // Send thumbnail with info
        await conn.sendMessage(from, {
            image: { url: thumbnail },
            caption: `> AUDIO DOWNLOADER 🎧\n\n*YT AUDIO DOWNLOADER*\n╭━━❐━⪼\n┇๏ *Title* - ${title}\n┇๏ *Quality* - ${quality}\n┇๏ *Size* - ${size}\n┇๏ *Status* - Downloading...\n╰━━❑━⪼\n\n> *DARKZONE-MD*`
        }, { quoted: mek });

        // Send audio file
        await conn.sendMessage(from, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            fileName: `${title}.mp3`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in .music/.play:", e);
        await reply("❌ Error occurred, please try again later!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
