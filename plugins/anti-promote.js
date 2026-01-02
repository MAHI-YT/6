const { cmd } = require('../command');
const config = require('../config');

// In-memory map to track which groups have Anti-Promote active
const antiPromoteActive = new Map();

// Store previous admins list to detect who promoted
const previousAdmins = new Map();

// ensure we register the event listener only once
let listenerRegistered = false;

// Function to get all participant JIDs (both id and lid)
function getAllJids(participant) {
    const jids = [];
    if (participant.id) jids.push(participant.id);
    if (participant.lid) jids.push(participant.lid);
    return jids;
}

// Function to extract number from any JID format
function extractNumber(jid) {
    if (!jid) return '';
    let num = jid;
    if (num.includes('@')) num = num.split('@')[0];
    if (num.includes(':')) num = num.split(':')[0];
    return num;
}

// Function to check if two JIDs match (with LID support)
function jidMatch(jid1, jid2) {
    if (!jid1 || !jid2) return false;
    if (jid1 === jid2) return true;
    
    const num1 = extractNumber(jid1);
    const num2 = extractNumber(jid2);
    
    if (num1 && num2 && num1 === num2) return true;
    
    return false;
}

// Function to check admin status with LID support
async function checkAdminStatus(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        
        const botId = conn.user?.id || '';
        const botLid = conn.user?.lid || '';
        const botNumber = extractNumber(botId);
        const botLidNumber = extractNumber(botLid);
        const senderNumber = extractNumber(senderId);
        
        let isBotAdmin = false;
        let isSenderAdmin = false;
        
        for (let p of participants) {
            if (p.admin === "admin" || p.admin === "superadmin") {
                const pNumber = extractNumber(p.id);
                const pLidNumber = extractNumber(p.lid);
                
                // Check bot
                if (pNumber === botNumber || pLidNumber === botNumber || 
                    pNumber === botLidNumber || pLidNumber === botLidNumber ||
                    jidMatch(p.id, botId) || jidMatch(p.lid, botLid)) {
                    isBotAdmin = true;
                }
                
                // Check sender
                if (pNumber === senderNumber || pLidNumber === senderNumber ||
                    jidMatch(p.id, senderId) || jidMatch(p.lid, senderId)) {
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

// Function to get bot JIDs
function getBotJids(conn) {
    const botId = conn.user?.id || '';
    const botLid = conn.user?.lid || '';
    
    return {
        botId,
        botLid,
        botNumber: extractNumber(botId),
        botLidNumber: extractNumber(botLid),
        // Get the proper JID format for API calls
        botJid: botId.includes(':') ? botId.split(':')[0] + '@s.whatsapp.net' : botId
    };
}

// Function to check if a JID is the bot
function isBotJid(conn, jid) {
    if (!jid) return false;
    
    const { botId, botLid, botNumber, botLidNumber } = getBotJids(conn);
    const jidNumber = extractNumber(jid);
    
    return (
        jid === botId ||
        jid === botLid ||
        jidNumber === botNumber ||
        jidNumber === botLidNumber ||
        jidMatch(jid, botId) ||
        jidMatch(jid, botLid)
    );
}

// Function to convert any JID to proper format for groupParticipantsUpdate
function toProperJid(jid) {
    if (!jid) return null;
    const number = extractNumber(jid);
    if (!number) return null;
    return number + '@s.whatsapp.net';
}

// Function to get current admins list
async function getCurrentAdmins(conn, groupId) {
    try {
        const metadata = await conn.groupMetadata(groupId);
        const admins = [];
        for (let p of metadata.participants) {
            if (p.admin === "admin" || p.admin === "superadmin") {
                admins.push({
                    id: p.id,
                    lid: p.lid,
                    number: extractNumber(p.id) || extractNumber(p.lid),
                    admin: p.admin
                });
            }
        }
        return admins;
    } catch (err) {
        console.error("Error getting admins:", err);
        return [];
    }
}

// Function to find who promoted (by comparing admin lists)
async function findPromoter(conn, groupId, promotedJid, knownAuthor) {
    // If we have a known author, use it
    if (knownAuthor && !isBotJid(conn, knownAuthor)) {
        return knownAuthor;
    }
    
    // Otherwise try to find from previous admins
    const prevAdmins = previousAdmins.get(groupId) || [];
    const currentAdmins = await getCurrentAdmins(conn, groupId);
    
    // The promoter must be someone who was already admin before
    // and is still admin now (not the newly promoted person)
    const promotedNumber = extractNumber(promotedJid);
    
    for (let admin of prevAdmins) {
        if (admin.number !== promotedNumber) {
            // This could be the promoter - return the first previous admin found
            // In reality, we can't know for sure who did it without the author field
            return admin.id || (admin.number + '@s.whatsapp.net');
        }
    }
    
    return null;
}

cmd({
    pattern: "antipromote",
    desc: "Toggle Anti-Promote (on/off) — When ON: if someone promotes another person, both get demoted. Bot protects itself from demotion.",
    category: "security",
    react: "🚫",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, reply, args }) => {
    try {
        if (!isGroup) return reply("❌ This command works only in groups.");
        
        // Get sender ID
        const senderId = mek.key.participant || mek.key.remoteJid || (mek.key.fromMe ? conn.user?.id : null);
        if (!senderId) return reply("❌ Could not identify sender.");
        
        // Check admin status
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId);
        
        if (!isSenderAdmin) return reply("❌ Only group admins can use this command.");
        if (!isBotAdmin) return reply("❌ I need admin rights to manage this group.");

        const arg = (args && args[0]) ? args[0].toLowerCase() : null;
        if (!arg || (arg !== 'on' && arg !== 'off')) {
            const status = antiPromoteActive.get(from) ? "ON ✅" : "OFF ❌";
            return reply(`📋 *Anti-Promote System*\n\n*Current Status:* ${status}\n\n*Usage:*\n• \`.antipromote on\` - Enable\n• \`.antipromote off\` - Disable\n\n_Only group admins can toggle this._`);
        }

        if (arg === 'on') {
            antiPromoteActive.set(from, true);
            
            // Store current admins list
            const currentAdmins = await getCurrentAdmins(conn, from);
            previousAdmins.set(from, currentAdmins);
            
            reply("✅ *Anti-Promote Activated!*\n\n🔹 If anyone promotes someone, both will be demoted\n🔹 Bot will never demote itself\n🛡️ Bot is protected from demotion\n\n_System is now monitoring promotions..._");

            // Register listener only once
            if (!listenerRegistered) {
                listenerRegistered = true;

                conn.ev.on('group-participants.update', async (update) => {
                    try {
                        const groupId = update.id;
                        
                        // Check if feature is active
                        if (!antiPromoteActive.get(groupId)) return;
                        
                        const action = update.action;
                        const participants = update.participants || [];
                        const author = update.author; // Person who did the action
                        
                        if (!participants.length) return;
                        
                        console.log(`[Anti-Promote] Event: ${action}, Author: ${author}, Participants: ${participants.join(', ')}`);

                        // ========== ANTI-DEMOTE PROTECTION ==========
                        if (action === 'demote') {
                            for (const demotedUser of participants) {
                                if (isBotJid(conn, demotedUser)) {
                                    console.log(`[Anti-Demote] Someone tried to demote bot!`);
                                    
                                    // Try to re-promote bot
                                    try {
                                        const { botJid } = getBotJids(conn);
                                        await conn.groupParticipantsUpdate(groupId, [botJid], "promote");
                                        console.log(`[Anti-Demote] Bot re-promoted`);
                                    } catch (e) {
                                        console.error("[Anti-Demote] Could not re-promote bot:", e);
                                    }
                                    
                                    // Demote the person who tried to demote bot
                                    if (author && !isBotJid(conn, author)) {
                                        const authorProperJid = toProperJid(author);
                                        
                                        try {
                                            await conn.sendMessage(groupId, {
                                                text: `🛡️ *Anti-Demote Triggered!*\n\n@${extractNumber(author)} tried to demote me!\n\n⚡ Demoting them instead...`,
                                                mentions: [authorProperJid || author]
                                            });
                                        } catch (e) {}
                                        
                                        try {
                                            if (authorProperJid) {
                                                await conn.groupParticipantsUpdate(groupId, [authorProperJid], "demote");
                                                console.log(`[Anti-Demote] Demoted: ${authorProperJid}`);
                                            }
                                        } catch (err) {
                                            console.error("[Anti-Demote] Demotion error:", err);
                                        }
                                    }
                                }
                            }
                            
                            // Update admins list after demote event
                            const newAdmins = await getCurrentAdmins(conn, groupId);
                            previousAdmins.set(groupId, newAdmins);
                            return;
                        }

                        // ========== ANTI-PROMOTE ==========
                        if (action === 'promote') {
                            for (const promotedUser of participants) {
                                // Skip if bot was promoted
                                if (isBotJid(conn, promotedUser)) {
                                    console.log(`[Anti-Promote] Bot was promoted, ignoring`);
                                    continue;
                                }
                                
                                // Get the promoter
                                let promoter = author;
                                
                                // If author is undefined, try to find from previous admin list
                                if (!promoter) {
                                    console.log(`[Anti-Promote] Author undefined, trying to find promoter...`);
                                    promoter = await findPromoter(conn, groupId, promotedUser, null);
                                }
                                
                                // Skip if promoter is bot
                                if (promoter && isBotJid(conn, promoter)) {
                                    console.log(`[Anti-Promote] Bot promoted someone, ignoring`);
                                    continue;
                                }
                                
                                // Convert to proper JID format
                                const promotedProperJid = toProperJid(promotedUser);
                                const promoterProperJid = promoter ? toProperJid(promoter) : null;
                                
                                console.log(`[Anti-Promote] Promoter: ${promoter} -> ${promoterProperJid}`);
                                console.log(`[Anti-Promote] Promoted: ${promotedUser} -> ${promotedProperJid}`);
                                
                                // Prepare demotion list
                                const toDemote = [];
                                const mentionList = [];
                                
                                if (promotedProperJid) {
                                    toDemote.push(promotedProperJid);
                                    mentionList.push(promotedProperJid);
                                }
                                
                                if (promoterProperJid && promoterProperJid !== promotedProperJid) {
                                    toDemote.push(promoterProperJid);
                                    mentionList.push(promoterProperJid);
                                }
                                
                                // Send announcement
                                try {
                                    let msgText;
                                    if (promoterProperJid) {
                                        msgText = `🚫 *Anti-Promote Triggered!*\n\n👤 *Promoter:* @${extractNumber(promoter)}\n👤 *Promoted:* @${extractNumber(promotedUser)}\n\n⚡ *Action:* Both will be demoted!`;
                                    } else {
                                        msgText = `🚫 *Anti-Promote Triggered!*\n\n👤 *Promoted:* @${extractNumber(promotedUser)}\n\n⚡ *Action:* Demoting the promoted user!\n\n⚠️ _Could not detect promoter_`;
                                    }
                                    
                                    await conn.sendMessage(groupId, {
                                        text: msgText,
                                        mentions: mentionList
                                    });
                                } catch (e) {
                                    console.error("[Anti-Promote] Message error:", e);
                                }
                                
                                // Perform demotion
                                if (toDemote.length > 0) {
                                    try {
                                        await conn.groupParticipantsUpdate(groupId, toDemote, "demote");
                                        console.log(`[Anti-Promote] Demoted: ${toDemote.join(', ')}`);
                                    } catch (err) {
                                        console.error("[Anti-Promote] Demotion error:", err);
                                        
                                        // Try one by one if batch fails
                                        for (const jid of toDemote) {
                                            try {
                                                await conn.groupParticipantsUpdate(groupId, [jid], "demote");
                                                console.log(`[Anti-Promote] Individually demoted: ${jid}`);
                                            } catch (e2) {
                                                console.error(`[Anti-Promote] Failed to demote ${jid}:`, e2);
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // Update admins list after promote event
                            const newAdmins = await getCurrentAdmins(conn, groupId);
                            previousAdmins.set(groupId, newAdmins);
                        }
                    } catch (err) {
                        console.error("[Anti-Promote] Listener error:", err);
                    }
                });
                
                console.log("[Anti-Promote] Event listener registered");
            }

        } else if (arg === 'off') {
            antiPromoteActive.delete(from);
            previousAdmins.delete(from);
            reply("✅ *Anti-Promote Deactivated!*\n\n_Promotions will no longer be blocked._");
        }
    } catch (e) {
        console.error("Antipromote command error:", e);
        reply("❌ An error occurred. Please try again.");
    }
});
