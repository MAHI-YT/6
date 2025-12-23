const { cmd } = require('../command');
const axios = require('axios');
const path = require('path');

cmd({
    pattern: "mediafire",
    alias: ["mf", "mfire", "mfdown"],
    desc: "Download and send files from MediaFire",
    category: "downloader",
    react: "📦",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply, react }) => {
    try {
        // Validate user input
        if (!q) return reply("Please provide a MediaFire file link.\nExample: `.mediafire <url>`");

        // Hit the MediaFire API
        const apiUrl = `https://api.ootaizumi.web.id/downloader/mediafire?url=${encodeURIComponent(q)}`;
        const { data } = await axios.get(apiUrl);

        if (!data || !data.result || !data.result.url) {
            await react("❌");
            return reply("Failed to retrieve the MediaFire file. Please check the link or try again later.");
        }

        const res = data.result;

        // Prepare info message
        await reply(
            `📥 *Downloading File from MediaFire...*\n\n` +
            `*📄 Name:* ${res.name}\n` +
            `*📏 Size:* ${res.size}\n` +
            `*📅 Date:* ${res.date}\n` +
            `*🗂 Type:* ${res.type}\n\n` +
            `> DARKZONE-MD`
        );

        // Download the actual file buffer
        const response = await axios.get(res.url, { responseType: 'arraybuffer' });

        // Send the file to WhatsApp chat
        await conn.sendMessage(from, {
            document: Buffer.from(response.data),
            mimetype: 'application/octet-stream',
            fileName: res.name
        }, { quoted: mek });

        await react("✅");
    } catch (e) {
        console.error("Error in MediaFire command:", e);
        await react("❌");
        reply("An error occurred while downloading or sending the MediaFire file.");
    }
});
