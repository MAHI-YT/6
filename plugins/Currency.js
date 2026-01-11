
const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "welcome",
    alias: ["wel", "welcomeimg", "welc", "welcomecard"],
    desc: "Generate stylish welcome image",
    category: "maker",
    react: "👋",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) return await reply(`👋 *Welcome Image Generator*\n\n*Format:*\n.welcome username | groupName | memberCount\n\n*Examples:*\n.welcome Ahmad | DARKZONE GROUP | 150\n.welcome Ahmad\n\n*With Background:*\n.welcome Ahmad | My Group | 50 | bgURL\n\n*Note:* Reply to someone to use their profile picture!`);

        await conn.sendMessage(from, { react: { text: '⏳', key: m.key } });

        // Parse input
        const args = q.split("|").map(arg => arg.trim());
        
        const username = args[0] || "User";
        const guildName = args[1] || "DARKZONE-MD";
        const memberCount = args[2] || "100";
        const customBg = args[3] || "https://api.deline.web.id/Eu3BVf3K4x.jpg";

        // Get avatar from quoted user or sender
        let avatarUrl;
        try {
            let targetJid;
            if (m.quoted) {
                targetJid = m.quoted.sender;
            } else {
                targetJid = sender;
            }
            avatarUrl = await conn.profilePictureUrl(targetJid, 'image');
        } catch {
            avatarUrl = "https://api.deline.web.id/Uy4yBXYUSd.jpg";
        }

        // Call API
        const api = `https://api.deline.web.id/canvas/welcome?username=${encodeURIComponent(username)}&guildName=${encodeURIComponent(guildName)}&memberCount=${encodeURIComponent(memberCount)}&avatar=${encodeURIComponent(avatarUrl)}&background=${encodeURIComponent(customBg)}&quality=99`;
        
        const res = await axios.get(api, { responseType: 'arraybuffer' });

        // Send generated image
        await conn.sendMessage(from, {
            image: Buffer.from(res.data),
            caption: `> WELCOME IMAGE GENERATOR 👋\n\n*STYLISH WELCOME CARD*\n╭━━━━━━━━━━━━━━━━╮\n┇๏ *Username* - ${username}\n┇๏ *Group* - ${guildName}\n┇๏ *Members* - ${memberCount}\n╰━━━━━━━━━━━━━━━━╯\n\n> *DARKZONE-MD*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error("Error in Welcome Image:", e);
        await reply("❌ Error occurred, please try again later!");
        await conn.sendMessage(from, { react: { text: '❌', key: m.key } });
    }
});
