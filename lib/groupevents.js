// ============================================================
//  DARKZONE-MD Group Events Handler
//  Created By Irfan Ahmad
//  Handles: Welcome, Goodbye, Admin Promote/Demote
// ============================================================

const config = require('../config');

const GroupEvents = async (conn, update) => {
    try {
        const { id, participants, action, author } = update;
        if (!id || !participants || !action) return;

        // Get group metadata
        let groupMetadata;
        try {
            groupMetadata = await conn.groupMetadata(id);
        } catch (e) {
            console.error('[GroupEvents] Failed to get metadata:', e.message);
            return;
        }

        const groupName = groupMetadata.subject || 'Unknown Group';
        const groupDesc = groupMetadata.desc || '';
        const memberCount = groupMetadata.participants?.length || 0;
        const botName = config.BOT_NAME || 'DARKZONE-MD';

        for (const participant of participants) {
            // Get participant info
            const num = participant.split('@')[0];
            const ppUrl = await conn.profilePictureUrl(participant, 'image').catch(() =>
                'https://i.ibb.co/Sw4pzTWC/IMG-20260124-WA0728.jpg'
            );

            // ============================================================
            //  WELCOME (Member Joined)
            // ============================================================
            if (action === 'add' && config.WELCOME === 'true') {
                const welcomeText = `╭━━━〔 *WELCOME* 〕━━━╮
┃
┃ 👋 *Hello!* @${num}
┃ 
┃ 📌 *Group:* ${groupName}
┃ 👥 *Members:* ${memberCount}
┃ 
┃ 📋 *Description:*
┃ ${groupDesc || 'No description'}
┃ 
┃ 🎉 *Welcome to the group!*
┃ 📖 *Please read group rules*
┃
╰━━━〔 *${botName}* 〕━━━╯`;

                try {
                    await conn.sendMessage(id, {
                        image: { url: ppUrl },
                        caption: welcomeText,
                        contextInfo: {
                            mentionedJid: [participant],
                        },
                    });
                } catch (e) {
                    // Fallback: text only
                    await conn.sendMessage(id, {
                        text: welcomeText,
                        contextInfo: { mentionedJid: [participant] },
                    }).catch(() => { });
                }
            }

            // ============================================================
            //  GOODBYE (Member Left/Removed)
            // ============================================================
            if ((action === 'remove') && config.GOODBYE === 'true') {
                const removedBy = author ? `@${author.split('@')[0]}` : 'themselves';
                const isKicked = author && author !== participant;

                const goodbyeText = `╭━━━〔 *GOODBYE* 〕━━━╮
┃
┃ 👋 *Goodbye!* @${num}
┃ 
┃ 📌 *Group:* ${groupName}
┃ 👥 *Members:* ${memberCount - 1}
┃ ${isKicked ? `┃ 🔨 *Removed By:* ${removedBy}` : '┃ 🚶 *Left the group*'}
┃
┃ 😔 *We'll miss you!*
┃
╰━━━〔 *${botName}* 〕━━━╯`;

                try {
                    await conn.sendMessage(id, {
                        image: { url: ppUrl },
                        caption: goodbyeText,
                        contextInfo: {
                            mentionedJid: [participant, ...(author ? [author] : [])],
                        },
                    });
                } catch (e) {
                    await conn.sendMessage(id, {
                        text: goodbyeText,
                        contextInfo: {
                            mentionedJid: [participant, ...(author ? [author] : [])],
                        },
                    }).catch(() => { });
                }
            }

            // ============================================================
            //  ADMIN PROMOTE EVENT
            // ============================================================
            if (action === 'promote' && (config.ADMIN_EVENTS === 'true')) {
                const promotedBy = author ? `@${author.split('@')[0]}` : 'Unknown';

                const promoteText = `╭━━━〔 *ADMIN EVENT* 〕━━━╮
┃
┃ ⬆️ *Member Promoted!*
┃ 
┃ 👤 *User:* @${num}
┃ 👑 *Promoted By:* ${promotedBy}
┃ 📌 *Group:* ${groupName}
┃ 
┃ 🎉 *Congratulations on becoming Admin!*
┃
╰━━━〔 *${botName}* 〕━━━╯`;

                await conn.sendMessage(id, {
                    text: promoteText,
                    contextInfo: {
                        mentionedJid: [participant, ...(author ? [author] : [])],
                    },
                }).catch(() => { });
            }

            // ============================================================
            //  ADMIN DEMOTE EVENT
            // ============================================================
            if (action === 'demote' && (config.ADMIN_EVENTS === 'true')) {
                const demotedBy = author ? `@${author.split('@')[0]}` : 'Unknown';

                const demoteText = `╭━━━〔 *ADMIN EVENT* 〕━━━╮
┃
┃ ⬇️ *Admin Demoted!*
┃ 
┃ 👤 *User:* @${num}
┃ 🔻 *Demoted By:* ${demotedBy}
┃ 📌 *Group:* ${groupName}
┃ 
┃ 😔 *No longer an admin*
┃
╰━━━〔 *${botName}* 〕━━━╯`;

                await conn.sendMessage(id, {
                    text: demoteText,
                    contextInfo: {
                        mentionedJid: [participant, ...(author ? [author] : [])],
                    },
                }).catch(() => { });
            }
        }
    } catch (e) {
        console.error('[GroupEvents Error]:', e.message);
    }
};

module.exports = GroupEvents;