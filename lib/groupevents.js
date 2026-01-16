/**
 * Group Events Handler for Baileys 7.0.0-rc.9
 * Welcome, Goodbye, Promote, Demote
 */

const config = require('../config');

// Check if JID is a group
const isGroup = (jid) => {
    if (!jid) return false;
    return jid.endsWith('@g.us');
};

// Get profile picture with fallback
const getProfilePic = async (conn, jid) => {
    try {
        return await conn.profilePictureUrl(jid, 'image');
    } catch {
        return 'https://files.catbox.moe/jecbfo.jpg';
    }
};

// Context info for forwarded appearance
const createContextInfo = (mentions) => ({
    mentionedJid: mentions || [],
    forwardingScore: 999,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
        newsletterJid: '120363416743041101@newsletter',
        newsletterName: config.BOT_NAME || 'BOT',
        serverMessageId: 143,
    },
});

/**
 * Initialize Group Events Handler
 * @param {Object} conn - Baileys connection object
 */
const initGroupEvents = (conn) => {
    
    console.log('✅ Group Events Handler Initialized');
    
    // Listen for group participant updates
    conn.ev.on('group-participants.update', async (update) => {
        
        // Debug log
        console.log('🔔 Group Participant Update:', {
            id: update.id,
            action: update.action,
            participants: update.participants,
            author: update.author
        });
        
        try {
            // Validate update object
            if (!update) {
                console.log('❌ Update is null/undefined');
                return;
            }
            
            if (!update.id) {
                console.log('❌ No group ID in update');
                return;
            }
            
            if (!isGroup(update.id)) {
                console.log('❌ Not a group JID:', update.id);
                return;
            }
            
            if (!update.participants || update.participants.length === 0) {
                console.log('❌ No participants in update');
                return;
            }
            
            if (!update.action) {
                console.log('❌ No action in update');
                return;
            }
            
            console.log(`✅ Valid update - Action: ${update.action}`);
            
            // Get group metadata
            let metadata;
            try {
                metadata = await conn.groupMetadata(update.id);
            } catch (err) {
                console.log('❌ Failed to get group metadata:', err.message);
                return;
            }
            
            const groupName = metadata.subject || 'Unknown Group';
            const memberCount = metadata.participants?.length || 0;
            const timestamp = new Date().toLocaleString('en-PK', { 
                timeZone: 'Asia/Karachi',
                dateStyle: 'medium',
                timeStyle: 'short'
            });
            
            // Process each participant
            for (const participant of update.participants) {
                const userName = participant.split('@')[0];
                
                console.log(`📌 Processing: ${update.action} for ${userName}`);
                
                // ═══════════════════════════════════════
                // ADD - Welcome New Member
                // ═══════════════════════════════════════
                if (update.action === 'add') {
                    console.log('👋 Processing WELCOME...');
                    
                    if (config.WELCOME !== 'true') {
                        console.log('⚠️ WELCOME is not enabled in config');
                        continue;
                    }
                    
                    const pfp = await getProfilePic(conn, participant);
                    
                    const welcomeMsg = `*╭───「 ωєℓ¢σмє 」───╮*
*│*
*│ 👋 нєу* @${userName}
*│ 📛 gʀσᴜᴘ:* ${groupName}
*│ 👥 мємвєʀs:* ${memberCount}
*│ ⏰ тιмє:* ${timestamp}
*│*
*│ ● ρℓєαѕє fσℓℓσω gʀσᴜρ ʀᴜℓєѕ*
*│ ● ву ${config.BOT_NAME || 'BOT'}*
*╰─────────────────╯*`;

                    try {
                        await conn.sendMessage(update.id, {
                            image: { url: pfp },
                            caption: welcomeMsg,
                            mentions: [participant],
                            contextInfo: createContextInfo([participant]),
                        });
                        console.log('✅ Welcome message sent!');
                    } catch (sendErr) {
                        console.log('❌ Failed to send welcome:', sendErr.message);
                    }
                }
                
                // ═══════════════════════════════════════
                // REMOVE - Goodbye Member
                // ═══════════════════════════════════════
                else if (update.action === 'remove') {
                    console.log('👋 Processing GOODBYE...');
                    
                    if (config.WELCOME !== 'true') {
                        console.log('⚠️ WELCOME/GOODBYE is not enabled in config');
                        continue;
                    }
                    
                    const groupPic = await getProfilePic(conn, update.id);
                    
                    const goodbyeMsg = `*╭───「 gσσ∂вує 」───╮*
*│*
*│ 😢 ᴜѕєʀ:* @${userName}
*│ 📛 ℓєfт:* ${groupName}
*│ 👥 мємвєʀs:* ${memberCount}
*│ ⏰ тιмє:* ${timestamp}
*│*
*│ ● ву ${config.BOT_NAME || 'BOT'}*
*╰─────────────────╯*`;

                    try {
                        await conn.sendMessage(update.id, {
                            image: { url: groupPic },
                            caption: goodbyeMsg,
                            mentions: [participant],
                            contextInfo: createContextInfo([participant]),
                        });
                        console.log('✅ Goodbye message sent!');
                    } catch (sendErr) {
                        console.log('❌ Failed to send goodbye:', sendErr.message);
                    }
                }
                
                // ═══════════════════════════════════════
                // PROMOTE - New Admin
                // ═══════════════════════════════════════
                else if (update.action === 'promote') {
                    console.log('⬆️ Processing PROMOTE...');
                    
                    if (config.ADMIN_EVENTS !== 'true' && config.ADMIN_ACTION !== 'true') {
                        console.log('⚠️ ADMIN_EVENTS is not enabled');
                        continue;
                    }
                    
                    const promoter = update.author ? update.author.split('@')[0] : 'Unknown';
                    const mentions = [participant];
                    if (update.author) mentions.push(update.author);
                    
                    const promoteMsg = `*╭───「 🎉 αdмιи єνєит 」───╮*
*│*
*│ ⬆️ αcтισи:* Promoted
*│ 👤 ву:* @${promoter}
*│ 👑 иєω αdмιи:* @${userName}
*│ 📛 gʀσᴜρ:* ${groupName}
*│ ⏰ тιмє:* ${timestamp}
*│*
*╰─────────────────╯*`;

                    try {
                        await conn.sendMessage(update.id, {
                            text: promoteMsg,
                            mentions: mentions,
                            contextInfo: createContextInfo(mentions),
                        });
                        console.log('✅ Promote message sent!');
                    } catch (sendErr) {
                        console.log('❌ Failed to send promote:', sendErr.message);
                    }
                }
                
                // ═══════════════════════════════════════
                // DEMOTE - Admin Removed
                // ═══════════════════════════════════════
                else if (update.action === 'demote') {
                    console.log('⬇️ Processing DEMOTE...');
                    
                    if (config.ADMIN_EVENTS !== 'true' && config.ADMIN_ACTION !== 'true') {
                        console.log('⚠️ ADMIN_EVENTS is not enabled');
                        continue;
                    }
                    
                    const demoter = update.author ? update.author.split('@')[0] : 'Unknown';
                    const mentions = [participant];
                    if (update.author) mentions.push(update.author);
                    
                    const demoteMsg = `*╭───「 ⚠️ αdмιи єνєит 」───╮*
*│*
*│ ⬇️ αcтισи:* Demoted
*│ 👤 ву:* @${demoter}
*│ 👤 dємσтєd:* @${userName}
*│ 📛 gʀσᴜρ:* ${groupName}
*│ ⏰ тιмє:* ${timestamp}
*│*
*╰─────────────────╯*`;

                    try {
                        await conn.sendMessage(update.id, {
                            text: demoteMsg,
                            mentions: mentions,
                            contextInfo: createContextInfo(mentions),
                        });
                        console.log('✅ Demote message sent!');
                    } catch (sendErr) {
                        console.log('❌ Failed to send demote:', sendErr.message);
                    }
                }
                
                else {
                    console.log(`⚠️ Unknown action: ${update.action}`);
                }
            }
            
        } catch (err) {
            console.error('❌ Group Event Error:', err);
        }
    });
};

module.exports = { initGroupEvents };
