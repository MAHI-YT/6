const config = require('../config');

async function handleGroupParticipants(conn, update) {
    try {
        if (config.WELCOME !== "true") return;

        const metadata = await conn.groupMetadata(update.id);
        const groupName = metadata.subject;
        const groupSize = metadata.participants.length;
        const timestamp = new Date().toLocaleString();
        const botName = config.BOT_NAME || 'DARKZONE-MD';

        for (let user of update.participants) {
            const userName = user.split('@')[0];
            let pfp;

            try {
                pfp = await conn.profilePictureUrl(user, 'image');
            } catch (err) {
                pfp = config.MENU_IMAGE_URL || "https://files.catbox.moe/jecbfo.jpg";
            }

            // WELCOME HANDLER
            if (update.action === 'add') {
                const welcomeMsg = `╭━━━━〔 *𝗪𝗘𝗟𝗖𝗢𝗠𝗘* 〕━━━━╮
┃
┃ 👋 *Hello* @${userName}!
┃ 
┃ 📍 *Group:* ${groupName}
┃ 👥 *Members:* ${groupSize}
┃ ⏰ *Joined:* ${timestamp}
┃
┃ 📜 Please read the group rules
┃ 🤝 Be respectful to everyone
┃
╰━━━ *${botName}* ━━━╯`;

                await conn.sendMessage(update.id, {
                    image: { url: pfp },
                    caption: welcomeMsg,
                    mentions: [user],
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        mentionedJid: [user],
                        forwardedNewsletterMessageInfo: {
                            newsletterName: botName,
                            newsletterJid: "120363416743041101@newsletter",
                        },
                    }
                });
            }

            // GOODBYE HANDLER
            if (update.action === 'remove') {
                const goodbyeMsg = `╭━━━━〔 *𝗚𝗢𝗢𝗗𝗕𝗬𝗘* 〕━━━━╮
┃
┃ 👋 @${userName} left the group
┃ 
┃ 📍 *Group:* ${groupName}
┃ 👥 *Remaining:* ${groupSize}
┃ ⏰ *Left:* ${timestamp}
┃
╰━━━ *${botName}* ━━━╯`;

                await conn.sendMessage(update.id, {
                    image: { url: config.MENU_IMAGE_URL || "https://files.catbox.moe/jecbfo.jpg" },
                    caption: goodbyeMsg,
                    mentions: [user],
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        mentionedJid: [user],
                        forwardedNewsletterMessageInfo: {
                            newsletterName: botName,
                            newsletterJid: "120363416743041101@newsletter",
                        },
                    }
                });
            }

            // ADMIN PROMOTE HANDLER
            if (update.action === "promote" && config.ADMIN_ACTION === "true") {
                const promoter = update.author ? update.author.split("@")[0] : 'Unknown';
                await conn.sendMessage(update.id, {
                    text: `╭━━〔 🎉 *PROMOTED* 〕━━╮
┃
┃ 👑 @${userName} is now Admin!
┃ 👤 *By:* @${promoter}
┃ 📍 *Group:* ${groupName}
┃ ⏰ *Time:* ${timestamp}
┃
╰━━━ *${botName}* ━━━╯`,
                    mentions: [update.author, user],
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        mentionedJid: [update.author, user],
                        forwardedNewsletterMessageInfo: {
                            newsletterName: botName,
                            newsletterJid: "120363416743041101@newsletter",
                        },
                    }
                });
            }
            
            // ADMIN DEMOTE HANDLER
            if (update.action === "demote" && config.ADMIN_ACTION === "true") {
                const demoter = update.author ? update.author.split("@")[0] : 'Unknown';
                await conn.sendMessage(update.id, {
                    text: `╭━━〔 ⚠️ *DEMOTED* 〕━━╮
┃
┃ 📉 @${userName} is no longer Admin
┃ 👤 *By:* @${demoter}
┃ 📍 *Group:* ${groupName}
┃ ⏰ *Time:* ${timestamp}
┃
╰━━━ *${botName}* ━━━╯`,
                    mentions: [update.author, user],
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        mentionedJid: [update.author, user],
                        forwardedNewsletterMessageInfo: {
                            newsletterName: botName,
                            newsletterJid: "120363416743041101@newsletter",
                        },
                    }
                });
            }
        }
    } catch (err) {
        console.error("❌ Error in welcome/goodbye:", err.message);
    }
}

module.exports = { handleGroupParticipants };
