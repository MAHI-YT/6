const config = require('../config');

// ============ LID SUPPORT FUNCTIONS ============

// Extract display number from any ID format (LID support)
function extractDisplayNumber(id) {
    if (!id) return 'Unknown';
    if (id.includes(':')) {
        return id.split(':')[0];
    }
    if (id.includes('@')) {
        return id.split('@')[0];
    }
    return id;
}

// Get proper JID for mentions
function getProperJid(id) {
    if (!id) return null;
    if (id.includes('@s.whatsapp.net')) return id;
    if (id.includes('@lid')) return id;
    if (id.includes(':')) {
        return id.split(':')[0] + '@s.whatsapp.net';
    }
    return id.split('@')[0] + '@s.whatsapp.net';
}

// ============ WELCOME/GOODBYE HANDLER ============

async function initWelcomeGoodbye(conn) {
    
    conn.ev.on('group-participants.update', async (update) => {
        try {
            // Check if WELCOME is enabled
            if (config.WELCOME !== "true") return;
            
            const groupId = update.id;
            const action = update.action;
            const participants = update.participants;
            const author = update.author;
            
            // Get group metadata
            let metadata;
            try {
                metadata = await conn.groupMetadata(groupId);
            } catch (err) {
                console.error('❌ Error getting group metadata:', err);
                return;
            }
            
            const groupName = metadata.subject || 'Unknown Group';
            const groupSize = metadata.participants?.length || 0;
            const timestamp = new Date().toLocaleString();
            const botName = config.BOT_NAME || 'DARKZONE-MD';

            // Process each participant
            for (let participant of participants) {
                
                // Get display number (handles LID format)
                const displayNumber = extractDisplayNumber(participant);
                const properJid = getProperJid(participant);
                
                // Get profile picture
                let pfp;
                try {
                    pfp = await conn.profilePictureUrl(participant, 'image');
                } catch (err) {
                    pfp = config.MENU_IMAGE_URL || "https://files.catbox.moe/jecbfo.jpg";
                }

                // ========== WELCOME - New Member Joined ==========
                if (action === 'add') {
                    console.log(`[🔰] New member joined: ${displayNumber} in ${groupName}`);
                    
                    const welcomeMsg = `*╭━━━━〔 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 〕━━━━╮*
*┃*
*┃ 👋 𝗛𝗲𝗹𝗹𝗼!* @${displayNumber}
*┃*
*┃ 📍 𝗚𝗿𝗼𝘂𝗽:* ${groupName}
*┃ 👥 𝗠𝗲𝗺𝗯𝗲𝗿𝘀:* ${groupSize}
*┃ 📅 𝗝𝗼𝗶𝗻𝗲𝗱:* ${timestamp}
*┃*
*┃ ⚠️ 𝗣𝗹𝗲𝗮𝘀𝗲 𝗳𝗼𝗹𝗹𝗼𝘄 𝘁𝗵𝗲 𝗿𝘂𝗹𝗲𝘀!*
*┃*
*╰━━━〔 ${botName} 〕━━━╯*`;

                    try {
                        await conn.sendMessage(groupId, {
                            image: { url: pfp },
                            caption: welcomeMsg,
                            mentions: [participant, properJid].filter(Boolean)
                        });
                        console.log(`[✅] Welcome message sent for: ${displayNumber}`);
                    } catch (sendErr) {
                        console.error('❌ Error sending welcome:', sendErr);
                    }
                }

                // ========== GOODBYE - Member Left ==========
                if (action === 'remove') {
                    console.log(`[🔰] Member left: ${displayNumber} from ${groupName}`);
                    
                    const goodbyeMsg = `*╭━━━━〔 𝗚𝗢𝗢𝗗𝗕𝗬𝗘 〕━━━━╮*
*┃*
*┃ 👋 𝗕𝘆𝗲 𝗕𝘆𝗲!* @${displayNumber}
*┃*
*┃ 📍 𝗚𝗿𝗼𝘂𝗽:* ${groupName}
*┃ 👥 𝗠𝗲𝗺𝗯𝗲𝗿𝘀:* ${groupSize}
*┃ 📅 𝗟𝗲𝗳𝘁:* ${timestamp}
*┃*
*┃ 😢 𝗪𝗲 𝘄𝗶𝗹𝗹 𝗺𝗶𝘀𝘀 𝘆𝗼𝘂!*
*┃*
*╰━━━〔 ${botName} 〕━━━╯*`;

                    try {
                        await conn.sendMessage(groupId, {
                            image: { url: config.MENU_IMAGE_URL || "https://files.catbox.moe/jecbfo.jpg" },
                            caption: goodbyeMsg,
                            mentions: [participant, properJid].filter(Boolean)
                        });
                        console.log(`[✅] Goodbye message sent for: ${displayNumber}`);
                    } catch (sendErr) {
                        console.error('❌ Error sending goodbye:', sendErr);
                    }
                }

                // ========== PROMOTE - Someone Made Admin ==========
                if (action === 'promote') {
                    // Check if ADMIN_ACTION is enabled
                    if (config.ADMIN_ACTION !== "true") continue;
                    
                    console.log(`[🔰] Admin promoted: ${displayNumber} in ${groupName}`);
                    
                    // Get promoter info
                    const promoterNumber = extractDisplayNumber(author);
                    const promoterJid = getProperJid(author);

                    const promoteMsg = `*╭━━〔 🎉 𝗔𝗗𝗠𝗜𝗡 𝗣𝗥𝗢𝗠𝗢𝗧𝗘𝗗 〕━━╮*
*┃*
*┃ 👑 𝗡𝗲𝘄 𝗔𝗱𝗺𝗶𝗻:* @${displayNumber}
*┃ 🔧 𝗣𝗿𝗼𝗺𝗼𝘁𝗲𝗱 𝗕𝘆:* @${promoterNumber}
*┃*
*┃ 📍 𝗚𝗿𝗼𝘂𝗽:* ${groupName}
*┃ 📅 𝗧𝗶𝗺𝗲:* ${timestamp}
*┃*
*┃ 🎊 𝗖𝗼𝗻𝗴𝗿𝗮𝘁𝘂𝗹𝗮𝘁𝗶𝗼𝗻𝘀!*
*┃*
*╰━━━〔 ${botName} 〕━━━╯*`;

                    try {
                        await conn.sendMessage(groupId, {
                            text: promoteMsg,
                            mentions: [participant, properJid, author, promoterJid].filter(Boolean)
                        });
                        console.log(`[✅] Promote message sent: ${promoterNumber} → ${displayNumber}`);
                    } catch (sendErr) {
                        console.error('❌ Error sending promote:', sendErr);
                    }
                }

                // ========== DEMOTE - Someone Removed From Admin ==========
                if (action === 'demote') {
                    // Check if ADMIN_ACTION is enabled
                    if (config.ADMIN_ACTION !== "true") continue;
                    
                    console.log(`[🔰] Admin demoted: ${displayNumber} in ${groupName}`);
                    
                    // Get demoter info
                    const demoterNumber = extractDisplayNumber(author);
                    const demoterJid = getProperJid(author);

                    const demoteMsg = `*╭━━〔 ⚠️ 𝗔𝗗𝗠𝗜𝗡 𝗗𝗘𝗠𝗢𝗧𝗘𝗗 〕━━╮*
*┃*
*┃ 👤 𝗗𝗲𝗺𝗼𝘁𝗲𝗱:* @${displayNumber}
*┃ 🔧 𝗗𝗲𝗺𝗼𝘁𝗲𝗱 𝗕𝘆:* @${demoterNumber}
*┃*
*┃ 📍 𝗚𝗿𝗼𝘂𝗽:* ${groupName}
*┃ 📅 𝗧𝗶𝗺𝗲:* ${timestamp}
*┃*
*┃ 📉 𝗡𝗼 𝗹𝗼𝗻𝗴𝗲𝗿 𝗮𝗱𝗺𝗶𝗻!*
*┃*
*╰━━━〔 ${botName} 〕━━━╯*`;

                    try {
                        await conn.sendMessage(groupId, {
                            text: demoteMsg,
                            mentions: [participant, properJid, author, demoterJid].filter(Boolean)
                        });
                        console.log(`[✅] Demote message sent: ${demoterNumber} → ${displayNumber}`);
                    } catch (sendErr) {
                        console.error('❌ Error sending demote:', sendErr);
                    }
                }
            }
            
        } catch (err) {
            console.error("❌ Error in group-participants.update:", err);
        }
    });
    
    console.log('[🔰] Welcome/Goodbye/Admin Events Handler Initialized ✅');
}

// Export the initialization function
module.exports = { initWelcomeGoodbye };
