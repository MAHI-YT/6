const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "nanobanana",
    alias: ["banana", "nb"],
    desc: "Change image background using Nano Banana AI",
    category: "ai",
    react: "🍌",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, react }) => {
    try {
        if (!q) {
            return reply(
                "Please provide a prompt.\n\n" +
                "Example:\n.nanobanana change the background to a beach"
            );
        }

        let imageUrl;

        // 1️⃣ If user replied to an image
        if (m.quoted && m.quoted.message?.imageMessage) {
            imageUrl = await conn.downloadAndSaveMediaMessage(
                m.quoted.imageMessage,
                'nano'
            );
        }

        // 2️⃣ If user provided an image URL
        if (!imageUrl && q.startsWith("http")) {
            const parts = q.split(" ");
            imageUrl = parts[0];
            q = parts.slice(1).join(" ");
        }

        if (!imageUrl) {
            return reply(
                "Please reply to an image or provide an image URL."
            );
        }

        await react("⏳");

        // API request
        const apiUrl = "https://api-faa.my.id/faa/nano-banana";

        const response = await axios.post(
            apiUrl,
            {
                image: imageUrl,
                prompt: q
            },
            { responseType: "arraybuffer" }
        );

        // Send edited image back to WhatsApp
        await conn.sendMessage(
            from,
            {
                image: Buffer.from(response.data),
                caption: "🍌 *Nano Banana Result*"
            },
            { quoted: mek }
        );

        await react("✅");

    } catch (e) {
        console.error("Nano Banana Error:", e);
        await react("❌");
        reply("Failed to process the image. Please try again later.");
    }
});
