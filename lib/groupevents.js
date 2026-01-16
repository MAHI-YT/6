const { isJidGroup } = require('@whiskeysockets/baileys');
const config = require('../config');

// Default images if profile picture not found
const defaultImages = [
    'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
    'https://files.catbox.moe/jecbfo.jpg',
];

// Get context info for forwarded message appearance
const getContextInfo = (mentionedUsers) => {
    return {
        mentionedJid: mentionedUsers,
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363416743041101@newsletter',
            newsletterName: config.BOT_NAME || '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
            serverMessageId: 143,
        },
    };
};

// Get profile picture with fallback
const getProfilePic = async (conn, jid) => {
    try {
        return await conn.profilePictureUrl(jid, 'image');
    } catch {
        return defaultImages[Math.floor(Math.random() * defaultImages.length)];
    }
};

// Main Group Events Handler
const GroupEvents = async (conn, update) => {
    try {
        // Validate that this is a group
        if (!update || !update.id) return;
        if (!isJidGroup(update.id)) return;
        
        // Check if participants exist
        if (!update.participants || update.participants.length === 0) return;

        // Get group metadata
        let metadata;
        try {
            metadata = await conn.groupMetadata(update.id);
        } catch (err) {
            console.error('Failed to get group metadata:', err.message);
            return;
        }

        const groupName = metadata.subject || 'Unknown Group';
        const groupDesc = metadata.desc || 'No Description';
        const memberCount = metadata.participants?.length || 0;
        const timestamp = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });

        // Process each participant
        for (const participant of update.participants) {
            const userName = participant.split('@')[0];
            
            // ═══════════════════════════════════════
            // WELCOME - New Member Joined
            // ═══════════════════════════════════════
            if (update.action === 'add') {
                if (config.WELCOME !== 'true') continue;
                
                const pfp = await getProfilePic(conn, participant);
                
                const welcomeMsg = `*╭ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄──*
*│  ̇─̣─̇─̣〘 ωєℓ¢σмє 〙̣─̇─̣─̇*
*├┅┅┅┅┈┈┈┈┈┈┈┈┈┅┅┅◆*
*│❀ нєу* @${userName}!
*│❀ gʀσᴜᴘ* ${groupName}
*├┅┅┅┅┈┈┈┈┈┈┈┈┈┅┅┅◆*
*│● ѕтαу ѕαfє αɴ∂ fσℓℓσω*
*│● тнє gʀσυᴘѕ ʀᴜℓєѕ!*
*│● мємвєʀs* ${memberCount}
*│● тιмє* ${timestamp}
*│● ©ᴘσωєʀє∂ ву ${config.BOT_NAME}*
*╰┉┉┉┉┈┈┈┈┈┈┈┈┉┉┉᛫᛭*`;

                await conn.sendMessage(update.id, {
                    image: { url: pfp },
                    caption: welcomeMsg,
                    mentions: [participant],
                    contextInfo: getContextInfo([participant]),
                });

                console.log(`✅ Welcome sent for: ${userName} in ${groupName}`);
            }

            // ═══════════════════════════════════════
            // GOODBYE - Member Left/Removed
            // ═══════════════════════════════════════
            else if (update.action === 'remove') {
                if (config.WELCOME !== 'true') continue;
                
                const groupPic = await getProfilePic(conn, update.id);
                
                const goodbyeMsg = `*╭ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄──*
*│  ̇─̣─̇─̣〘 gσσ∂вує 〙̣─̇─̣─̇*
*├┅┅┅┅┈┈┈┈┈┈┈┈┈┅┅┅◆*
*│❀ ᴜѕєʀ* @${userName}
*│● мємвєʀ нαѕ ℓєfт тнє gʀσᴜᴘ*
*│● мємвєʀs* ${memberCount}
*│● тιмє* ${timestamp}
*│● ©ᴘσωєʀє∂ ву ${config.BOT_NAME}*
*╰┉┉┉┉┈┈┈┈┈┈┈┈┉┉┉᛫᛭*`;

                await conn.sendMessage(update.id, {
                    image: { url: groupPic },
                    caption: goodbyeMsg,
                    mentions: [participant],
                    contextInfo: getContextInfo([participant]),
                });

                console.log(`👋 Goodbye sent for: ${userName} in ${groupName}`);
            }

            // ═══════════════════════════════════════
            // PROMOTE - Member Made Admin
            // ═══════════════════════════════════════
            else if (update.action === 'promote') {
                // Check both possible config keys
                if (config.ADMIN_EVENTS !== 'true' && config.ADMIN_ACTION !== 'true') continue;
                
                const promoter = update.author ? update.author.split('@')[0] : 'Unknown';
                
                const promoteMsg = `╭─〔 *🎉 Admin Event* 〕─╮
│
├─ *Action:* Promoted
├─ *By:* @${promoter}
├─ *User:* @${userName}
├─ *Time:* ${timestamp}
├─ *Group:* ${groupName}
│
╰─➤ *Powered by ${config.BOT_NAME}*`;

                await conn.sendMessage(update.id, {
                    text: promoteMsg,
                    mentions: [update.author, participant].filter(Boolean),
                    contextInfo: getContextInfo([update.author, participant].filter(Boolean)),
                });

                console.log(`⬆️ Promote event: ${userName} by ${promoter}`);
            }

            // ═══════════════════════════════════════
            // DEMOTE - Admin Removed
            // ═══════════════════════════════════════
            else if (update.action === 'demote') {
                // Check both possible config keys
                if (config.ADMIN_EVENTS !== 'true' && config.ADMIN_ACTION !== 'true') continue;
                
                const demoter = update.author ? update.author.split('@')[0] : 'Unknown';
                
                const demoteMsg = `╭─〔 *⚠️ Admin Event* 〕─╮
│
├─ *Action:* Demoted
├─ *By:* @${demoter}
├─ *User:* @${userName}
├─ *Time:* ${timestamp}
├─ *Group:* ${groupName}
│
╰─➤ *Powered by ${config.BOT_NAME}*`;

                await conn.sendMessage(update.id, {
                    text: demoteMsg,
                    mentions: [update.author, participant].filter(Boolean),
                    contextInfo: getContextInfo([update.author, participant].filter(Boolean)),
                });

                console.log(`⬇️ Demote event: ${userName} by ${demoter}`);
            }
        }
    } catch (err) {
        console.error('❌ Group Event Error:', err.message);
    }
};

module.exports = GroupEvents;
