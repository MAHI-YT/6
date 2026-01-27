const { isJidGroup } = require('jawi');
const config = require('../config');

const ppUrls = [
    'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
    'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
    'https://i.ibb.co/KhYC4FY/1221bc0bdd2354b42b293317ff2adbcf-icon.png',
];

// Function to extract display number/username from any ID format (same as ginfo command)
function extractDisplayNumber(id) {
    if (!id) return 'Unknown';
    
    // If it contains ':', extract the first part (handles LID like "123456:78@lid")
    if (id.includes(':')) {
        return id.split(':')[0];
    }
    // If it contains '@', extract before @ (handles "923306137477@s.whatsapp.net")
    if (id.includes('@')) {
        return id.split('@')[0];
    }
    return id;
}

// Function to get username/pn from lid like in ginfo command
function getUserNameFromLid(participantId, participants = []) {
    // First try to find participant in group participants list
    for (let p of participants) {
        const pId = p.id || '';
        const pLid = p.lid || '';
        const pPhoneNumber = p.phoneNumber || '';
        
        // Check if this is our participant
        if (pId === participantId || pLid === participantId) {
            // Try to get name from different fields
            if (p.name || p.notify || p.vname) {
                return p.name || p.notify || p.vname || extractDisplayNumber(pPhoneNumber);
            }
            // Fallback to phone number extraction
            return extractDisplayNumber(pPhoneNumber || pId);
        }
    }
    
    // If not found in participants, extract from the ID directly
    return extractDisplayNumber(participantId);
}

const GroupEvents = async (conn, update) => {
    try {
        const isGroup = isJidGroup(update.id);
        if (!isGroup) return;

        const metadata = await conn.groupMetadata(update.id);
        const participants = update.participants || [];
        const allGroupParticipants = metadata.participants || [];
        const desc = metadata.desc || "No Description";
        const groupMembersCount = metadata.participants.length;

        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(update.id, 'image');
        } catch {
            ppUrl = ppUrls[Math.floor(Math.random() * ppUrls.length)];
        }

        for (const participantId of participants) {
            // Get username using same logic as ginfo command
            const userName = getUserNameFromLid(participantId, allGroupParticipants);
            const timestamp = new Date().toLocaleString();

            if (update.action === "add" && config.WELCOME === "true") {
                const WelcomeText = `╭─〔 *🤖 ${config.BOT_NAME}* 〕\n` +
                    `├─▸ *Welcome @${userName} to ${metadata.subject}* 🎉\n` +
                    `├─ *You are member number ${groupMembersCount}* \n` +
                    `├─ *Time joined:* ${timestamp}\n` +
                    `╰─➤ *Please read group description*\n\n` +
                    `╭──〔 📜 *Group Description* 〕\n` +
                    `├─ ${desc}\n` +
                    `╰─🚀 *Powered by ${config.BOT_NAME}*`;

                await conn.sendMessage(update.id, {
                    image: { url: ppUrl },
                    caption: WelcomeText,
                    mentions: [participantId]
                });

            } else if (update.action === "remove" && config.GOODBYE === "true") {
                const GoodbyeText = `╭─〔 *🤖 ${config.BOT_NAME}* 〕\n` +
                    `├─▸ *Goodbye @${userName}* 😔\n` +
                    `├─ *Time left:* ${timestamp}\n` +
                    `├─ *Members remaining:* ${groupMembersCount}\n` +
                    `╰─➤ *We'll miss you!*\n\n` +
                    `╰─🚀 *Powered by ${config.BOT_NAME}*`;

                await conn.sendMessage(update.id, {
                    image: { url: ppUrl },
                    caption: GoodbyeText,
                    mentions: [participantId]
                });

            } else if (update.action === "demote" && config.ADMIN_ACTION === "true") {
                const authorId = update.author || '';
                const demoter = getUserNameFromLid(authorId, allGroupParticipants);
                const demotedUser = getUserNameFromLid(participantId, allGroupParticipants);
                
                await conn.sendMessage(update.id, {
                    text: `╭─〔 *⚠️ Admin Event* 〕\n` +
                          `├─ @${demoter} demoted @${demotedUser}\n` +
                          `├─ *Time:* ${timestamp}\n` +
                          `├─ *Group:* ${metadata.subject}\n` +
                          `╰─➤ *Powered by ${config.BOT_NAME}*`,
                    mentions: [authorId, participantId]
                });

            } else if (update.action === "promote" && config.ADMIN_ACTION === "true") {
                const authorId = update.author || '';
                const promoter = getUserNameFromLid(authorId, allGroupParticipants);
                const promotedUser = getUserNameFromLid(participantId, allGroupParticipants);
                
                await conn.sendMessage(update.id, {
                    text: `╭─〔 *🎉 Admin Event* 〕\n` +
                          `├─ @${promoter} promoted @${promotedUser}\n` +
                          `├─ *Time:* ${timestamp}\n` +
                          `├─ *Group:* ${metadata.subject}\n` +
                          `╰─➤ *Powered by ${config.BOT_NAME}*`,
                    mentions: [authorId, participantId]
                });
            }
        }
    } catch (err) {
        console.error('Group event error:', err);
    }
};

module.exports = GroupEvents;
