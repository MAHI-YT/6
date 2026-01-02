const { cmd } = require('../command');
const config = require('../config');

// In-memory map to track which groups have Anti-Promote active
const antiPromoteActive = new Map();

// ensure we register the event listener only once
let listenerRegistered = false;

// Function to check admin status with LID support
async function checkAdminStatus(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        
        const botId = conn.user?.id || '';
        const botLid = conn.user?.lid || '';
        
        // Extract bot information
        const botNumber = botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId);
        const botIdWithoutSuffix = botId.includes('@') ? botId.split('@')[0] : botId;
        const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
        const botLidWithoutSuffix = botLid.includes('@') ? botLid.split('@')[0] : botLid;
        
        // Extract sender information
        const senderNumber = senderId.includes(':') ? senderId.split(':')[0] : (senderId.includes('@') ? senderId.split('@')[0] : senderId);
        const senderIdWithoutSuffix = senderId.includes('@') ? senderId.split('@')[0] : senderId;
        
        let isBotAdmin = false;
        let isSenderAdmin = false;
        
        for (let p of participants) {
            if (p.admin === "admin" || p.admin === "superadmin") {
                // Check participant IDs
                const pPhoneNumber = p.phoneNumber ? p.phoneNumber.split('@')[0] : '';
                const pId = p.id ? p.id.split('@')[0] : '';
                const pLid = p.lid ? p.lid.split('@')[0] : '';
                const pFullId = p.id || '';
                const pFullLid = p.lid || '';
                
                // Extract numeric part from participant LID
                const pLidNumeric = pLid.includes(':') ? pLid.split(':')[0] : pLid;
                
                // Check if this participant is the bot
                const botMatches = (
                    botId === pFullId ||
                    botId === pFullLid ||
                    botLid === pFullLid ||
                    botLidNumeric === pLidNumeric ||
                    botLidWithoutSuffix === pLid ||
                    botNumber === pPhoneNumber ||
                    botNumber === pId ||
                    botIdWithoutSuffix === pPhoneNumber ||
                    botIdWithoutSuffix === pId ||
                    (botLid && botLid.split('@')[0].split(':')[0] === pLid)
                );
                
                if (botMatches) {
                    isBotAdmin = true;
                }
                
                // Check if this participant is the sender
                const senderMatches = (
                    senderId === pFullId ||
                    senderId === pFullLid ||
                    senderNumber === pPhoneNumber ||
                    senderNumber === pId ||
                    senderIdWithoutSuffix === pPhoneNumber ||
                    senderIdWithoutSuffix === pId ||
                    (pLid && senderIdWithoutSuffix === pLid)
                );
                
                if (senderMatches) {
                    isSenderAdmin = true;
                }
            }
        }
        
        return { isBotAdmin, isSenderAdmin };
        
    } catch (err) {
        console.error('❌ Error checking admin status:', err);
        return { isBotAdmin: false, isSenderAdmin: false };
    }
}

// Function to get bot JID with LID support
function getBotJid(conn) {
    const botId = conn.user?.id || '';
    const botLid = conn.user?.lid || '';
    
    return {
        botId,
        botLid,
        botNumber: botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId),
        botLidNumeric: botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid)
    };
}

// Function to check if a JID matches the bot (with LID support)
function isBotJid(conn, jid) {
    if (!jid) return false;
    
    const { botId, botLid, botNumber, botLidNumeric } = getBotJid(conn);
    
    const jidNumber = jid.includes(':') ? jid.split(':')[0] : (jid.includes('@') ? jid.split('@')[0] : jid);
    const jidWithoutSuffix = jid.includes('@') ? jid.split('@')[0] : jid;
    const jidLidNumeric = jid.includes(':') ? jid.split(':')[0] : jidNumber;
    
    return (
        jid === botId ||
        jid === botLid ||
        jidNumber === botNumber ||
        jidNumber === botLidNumeric ||
        jidWithoutSuffix === botNumber ||
        jidWithoutSuffix === botLidNumeric ||
        jidLidNumeric === botLidNumeric ||
        (botLid && jid.split('@')[0] === botLid.split('@')[0])
    );
}

cmd({
    pattern: "antipromote",
    desc: "Toggle Anti-Promote (on/off) — only group admins can toggle. When ON: if an admin promotes someone, both are demoted. Also includes Anti-Demote protection for the bot.",
    category: "security",
    react: "🚫",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, reply, args }) => {
    try {
        if (!isGroup) return reply("❌ This command works only in groups.");
        
        // Get sender ID with LID support
        const senderId = mek.key.participant || mek.key.remoteJid || (mek.key.fromMe ? conn.user?.id : null);
        if (!senderId) return reply("❌ Could not identify sender.");
        
        // Check admin status using the integrated function with LID support
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId);
        
        if (!isSenderAdmin) return reply("❌ Only group admins can activate or deactivate this feature.");
        if (!isBotAdmin) return reply("❌ I need admin rights to manage admins in this group.");

        const arg = (args && args[0]) ? args[0].toLowerCase() : null;
        if (!arg || (arg !== 'on' && arg !== 'off')) {
            return reply("📋 *Usage:*\n\n`.antipromote on` - Enable Anti-Promote\n`.antipromote off` - Disable Anti-Promote\n\n_Only group admins can toggle this._");
        }

        if (arg === 'on') {
            antiPromoteActive.set(from, true);
            reply("✅ *Anti-Promote is now ON for this group!*\n\n🔹 If any admin promotes someone, both will be demoted.\n🔹 Bot will never demote itself.\n🛡️ Anti-Demote: Anyone trying to demote the bot will be demoted first!");

            // Register single global listener if not already
            if (!listenerRegistered) {
                listenerRegistered = true;

                conn.ev.on('group-participants.update', async (update) => {
                    try {
                        const groupId = update.id;
                        
                        // Check if feature is active for this group
                        if (!antiPromoteActive.get(groupId)) return;
                        
                        const author = update.author; // The person who performed the action
                        const participantsList = update.participants || [];
                        
                        if (!participantsList.length) return;

                        // ========== ANTI-DEMOTE PROTECTION FOR BOT ==========
                        if (update.action === 'demote') {
                            for (const demotedUser of participantsList) {
                                // Check if someone is trying to demote the bot
                                if (isBotJid(conn, demotedUser)) {
                                    // Someone tried to demote the bot - demote them instead
                                    if (author && !isBotJid(conn, author)) {
                                        try {
                                            // First, try to promote bot back (in case it was demoted)
                                            const { botId } = getBotJid(conn);
                                            await conn.groupParticipantsUpdate(groupId, [botId], "promote");
                                        } catch (e) {
                                            // Bot might still be admin, ignore
                                        }
                                        
                                        try {
                                            await conn.sendMessage(groupId, {
                                                text: `🛡️ *Anti-Demote Protection Activated!*\n\n@${author.split('@')[0]} tried to demote me.\n\n⚡ *Action:* Demoting them instead! 😎`,
                                                mentions: [author]
                                            });
                                        } catch (e) {
                                            // ignore announce errors
                                        }
                                        
                                        try {
                                            await conn.groupParticipantsUpdate(groupId, [author], "demote");
                                            console.log(`Anti-Demote: demoted ${author} for trying to demote bot in ${groupId}`);
                                        } catch (err) {
                                            console.error("Anti-Demote demotion error:", err);
                                        }
                                    }
                                }
                            }
                            return;
                        }

                        // ========== ANTI-PROMOTE ==========
                        if (update.action === 'promote') {
                            for (const promotedUser of participantsList) {
                                // Do not act if promoted user is the bot itself
                                if (isBotJid(conn, promotedUser)) {
                                    continue;
                                }
                                
                                // Do not act if promoter is the bot itself
                                if (isBotJid(conn, author)) {
                                    continue;
                                }

                                // Announce and demote both
                                try {
                                    await conn.sendMessage(groupId, {
                                        text: `🚫 *Anti-Promote Triggered!*\n\n👤 Promoter: @${author.split('@')[0]}\n👤 Promoted: @${promotedUser.split('@')[0]}\n\n⚡ *Action:* Both will be demoted automatically.`,
                                        mentions: [author, promotedUser]
                                    });
                                } catch (e) {
                                    // ignore announce errors
                                }

                                // Demote both promoter and promotedUser
                                try {
                                    await conn.groupParticipantsUpdate(groupId, [author, promotedUser], "demote");
                                    console.log(`Anti-Promote: demoted ${author} and ${promotedUser} in ${groupId}`);
                                } catch (err) {
                                    console.error("Anti-Promote demotion error:", err);
                                }
                            }
                        }
                    } catch (err) {
                        console.error("Anti-Promote listener error:", err);
                    }
                });
            }

        } else if (arg === 'off') {
            antiPromoteActive.delete(from);
            reply("✅ *Anti-Promote is now OFF for this group.*\n\n_Promotions will no longer be blocked._");
        }
    } catch (e) {
        console.error("Antipromote command error:", e);
        reply("❌ An error occurred while toggling Anti-Promote.");
    }
});
