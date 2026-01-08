const { cmd } = require('../command');
const config = require("../config");
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 📁 DATABASE FILE FOR STORING ANTI-LINK SETTINGS
// ═══════════════════════════════════════════════════════════
const antiLinkDbPath = path.join(__dirname, '../database/antilink.json');

// Ensure database directory exists
function ensureDbExists() {
    const dbDir = path.dirname(antiLinkDbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(antiLinkDbPath)) {
        fs.writeFileSync(antiLinkDbPath, JSON.stringify({}), 'utf8');
    }
}

// Load anti-link settings
function loadAntiLinkSettings() {
    try {
        ensureDbExists();
        const data = fs.readFileSync(antiLinkDbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}

// Save anti-link settings
function saveAntiLinkSettings(settings) {
    try {
        ensureDbExists();
        fs.writeFileSync(antiLinkDbPath, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving antilink settings:', error);
        return false;
    }
}

// Get group settings
function getGroupSettings(groupId) {
    const settings = loadAntiLinkSettings();
    return settings[groupId] || { enabled: false, mode: 1 };
}

// Set group settings
function setGroupSettings(groupId, enabled, mode) {
    const settings = loadAntiLinkSettings();
    settings[groupId] = { enabled, mode };
    return saveAntiLinkSettings(settings);
}

// ═══════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS WITH LID SUPPORT
// ═══════════════════════════════════════════════════════════

// Extract number from any ID format
function extractNumber(id) {
    if (!id) return '';
    let num = id;
    if (num.includes('@')) num = num.split('@')[0];
    if (num.includes(':')) num = num.split(':')[0];
    return num.replace(/[^0-9]/g, '');
}

// Check admin status with full LID support
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
        let isSenderSuperAdmin = false;
        
        for (let p of participants) {
            const pNumber = extractNumber(p.id);
            const pLidNumber = p.lid ? extractNumber(p.lid) : '';
            const pPhoneNumber = p.phoneNumber ? extractNumber(p.phoneNumber) : '';
            
            const isAdmin = p.admin === "admin" || p.admin === "superadmin";
            
            if (isAdmin) {
                // Check bot
                if (pNumber === botNumber || pLidNumber === botNumber || 
                    pNumber === botLidNumber || pLidNumber === botLidNumber ||
                    pPhoneNumber === botNumber) {
                    isBotAdmin = true;
                }
                
                // Check sender
                if (pNumber === senderNumber || pLidNumber === senderNumber ||
                    pPhoneNumber === senderNumber) {
                    isSenderAdmin = true;
                    if (p.admin === "superadmin") {
                        isSenderSuperAdmin = true;
                    }
                }
            }
        }
        
        return { isBotAdmin, isSenderAdmin, isSenderSuperAdmin };
        
    } catch (err) {
        console.error('❌ Error checking admin status:', err);
        return { isBotAdmin: false, isSenderAdmin: false, isSenderSuperAdmin: false };
    }
}

// Check if user is owner
function isOwnerUser(senderId) {
    const senderNumber = extractNumber(senderId);
    
    if (!config.OWNER_NUMBER) return false;
    
    const ownerNumber = extractNumber(config.OWNER_NUMBER);
    
    return senderNumber === ownerNumber;
}

// Get participant ID for removal (LID compatible)
async function getParticipantId(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        
        const senderNumber = extractNumber(senderId);
        
        for (let p of participants) {
            const pNumber = extractNumber(p.id);
            const pLidNumber = p.lid ? extractNumber(p.lid) : '';
            const pPhoneNumber = p.phoneNumber ? extractNumber(p.phoneNumber) : '';
            
            if (pNumber === senderNumber || pLidNumber === senderNumber ||
                pPhoneNumber === senderNumber) {
                return { found: true, participantId: p.id };
            }
        }
        return { found: false, participantId: senderId };
    } catch (err) {
        console.error('❌ Error getting participant ID:', err);
        return { found: false, participantId: senderId };
    }
}

// ═══════════════════════════════════════════════════════════
// 📋 ANTI-LINK COMMAND (Settings Panel)
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "antilink",
    alias: ["antilinkmode", "al"],
    desc: "Configure Anti-Link settings for the group",
    category: "group",
    react: "🔗",
    filename: __filename
},
async (conn, mek, m, { from, args, q, isGroup, sender, reply }) => {
    try {
        // Only works in groups
        if (!isGroup) {
            return await conn.sendMessage(from, { 
                text: "❌ This command only works in groups!" 
            }, { quoted: mek });
        }

        const senderId = m.key?.participant || sender;
        
        // Check admin status
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId);
        const isOwner = isOwnerUser(senderId);

        // Only admins and owner can configure
        if (!isSenderAdmin && !isOwner) {
            return await conn.sendMessage(from, { 
                text: "❌ Only group admins can configure Anti-Link!" 
            }, { quoted: mek });
        }

        // Get current settings
        const currentSettings = getGroupSettings(from);
        const option = q ? q.toLowerCase().trim() : '';

        // ═══════════════════════════════════════════════════════════
        // 📊 SHOW MENU (No arguments)
        // ═══════════════════════════════════════════════════════════
        if (!option) {
            const statusEmoji = currentSettings.enabled ? "🟢" : "🔴";
            const statusText = currentSettings.enabled ? "ON" : "OFF";
            
            let modeText = "";
            switch(currentSettings.mode) {
                case 1:
                    modeText = "Mode 1: Delete Only";
                    break;
                case 2:
                    modeText = "Mode 2: Delete All + Kick WA Links";
                    break;
                case 3:
                    modeText = "Mode 3: Delete + Kick All Links";
                    break;
                default:
                    modeText = "Mode 1: Delete Only";
            }

            const menuText = `
╔═══════════════════════════╗
║    🔗 *ANTI-LINK SYSTEM* 🔗    ║
╠═══════════════════════════╣
║                           
║  ${statusEmoji} *Status:* ${statusText}
║  📋 *Current:* ${modeText}
║                           
╠═══════════════════════════╣
║     📚 *AVAILABLE MODES*      ║
╠═══════════════════════════╣
║                           
║  *Mode 1️⃣ - Delete Only*
║  ➤ Deletes all links
║  ➤ No one gets kicked
║  ➤ Just warning message
║                           
║  *Mode 2️⃣ - Smart Mode*
║  ➤ Deletes all links
║  ➤ Kicks only for WA links
║  ➤ (Groups/Channels)
║                           
║  *Mode 3️⃣ - Strict Mode*
║  ➤ Deletes all links
║  ➤ Kicks for ANY link
║  ➤ Maximum security
║                           
╠═══════════════════════════╣
║       ⌨️ *COMMANDS*          ║
╠═══════════════════════════╣
║                           
║  *.antilink on*
║  ➤ Turn ON Anti-Link
║                           
║  *.antilink off*
║  ➤ Turn OFF Anti-Link
║                           
║  *.antilink mode1*
║  ➤ Set to Delete Only
║                           
║  *.antilink mode2*
║  ➤ Set to Smart Mode
║                           
║  *.antilink mode3*
║  ➤ Set to Strict Mode
║                           
╠═══════════════════════════╣
║  ⚠️ *Note:* Admins & Owner  
║  are excluded from actions  
╚═══════════════════════════╝
`.trim();

            return await conn.sendMessage(from, { 
                text: menuText 
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 🟢 TURN ON
        // ═══════════════════════════════════════════════════════════
        if (option === 'on' || option === 'enable') {
            if (!isBotAdmin) {
                return await conn.sendMessage(from, { 
                    text: "❌ I need to be an admin to use Anti-Link!" 
                }, { quoted: mek });
            }

            const mode = currentSettings.mode || 1;
            setGroupSettings(from, true, mode);

            let modeDesc = "";
            switch(mode) {
                case 1: modeDesc = "Delete Only"; break;
                case 2: modeDesc = "Smart Mode (Kick for WA links)"; break;
                case 3: modeDesc = "Strict Mode (Kick for all links)"; break;
            }

            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });

            return await conn.sendMessage(from, { 
                text: `✅ *Anti-Link Enabled!*\n\n📋 *Current Mode:* ${modeDesc}\n\n⚠️ Anyone who sends links will face action!\n\n💡 Use *.antilink* to see all modes.`
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 🔴 TURN OFF
        // ═══════════════════════════════════════════════════════════
        if (option === 'off' || option === 'disable') {
            setGroupSettings(from, false, currentSettings.mode || 1);

            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });

            return await conn.sendMessage(from, { 
                text: `🔴 *Anti-Link Disabled!*\n\n✅ Members can now share links freely.`
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 1️⃣ MODE 1 - DELETE ONLY
        // ═══════════════════════════════════════════════════════════
        if (option === 'mode1' || option === '1' || option === 'delete' || option === 'deleteonly') {
            setGroupSettings(from, currentSettings.enabled, 1);

            await conn.sendMessage(from, { 
                react: { text: "1️⃣", key: mek.key } 
            });

            return await conn.sendMessage(from, { 
                text: `1️⃣ *Mode 1 Activated: Delete Only*\n\n📋 *Features:*\n• All links will be deleted\n• No one will be kicked\n• Warning message sent\n\n${currentSettings.enabled ? "✅ Anti-Link is ON" : "⚠️ Anti-Link is OFF. Use *.antilink on* to enable."}`
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 2️⃣ MODE 2 - SMART MODE
        // ═══════════════════════════════════════════════════════════
        if (option === 'mode2' || option === '2' || option === 'smart' || option === 'warn') {
            setGroupSettings(from, currentSettings.enabled, 2);

            await conn.sendMessage(from, { 
                react: { text: "2️⃣", key: mek.key } 
            });

            return await conn.sendMessage(from, { 
                text: `2️⃣ *Mode 2 Activated: Smart Mode*\n\n📋 *Features:*\n• All links will be deleted\n• WhatsApp Group links = KICK\n• WhatsApp Channel links = KICK\n• Other links = Warning only\n\n${currentSettings.enabled ? "✅ Anti-Link is ON" : "⚠️ Anti-Link is OFF. Use *.antilink on* to enable."}`
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 3️⃣ MODE 3 - STRICT MODE
        // ═══════════════════════════════════════════════════════════
        if (option === 'mode3' || option === '3' || option === 'strict' || option === 'kick' || option === 'kickall') {
            setGroupSettings(from, currentSettings.enabled, 3);

            await conn.sendMessage(from, { 
                react: { text: "3️⃣", key: mek.key } 
            });

            return await conn.sendMessage(from, { 
                text: `3️⃣ *Mode 3 Activated: Strict Mode*\n\n📋 *Features:*\n• All links will be deleted\n• ANY link = INSTANT KICK\n• Maximum security level\n\n⚠️ *Warning:* This is the strictest mode!\n\n${currentSettings.enabled ? "✅ Anti-Link is ON" : "⚠️ Anti-Link is OFF. Use *.antilink on* to enable."}`
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // ❓ UNKNOWN OPTION
        // ═══════════════════════════════════════════════════════════
        return await conn.sendMessage(from, { 
            text: `❌ Unknown option: *${option}*\n\n💡 Use *.antilink* to see all available options.`
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in antilink command:", e);
        await conn.sendMessage(from, { 
            text: `❌ An error occurred: ${e.message}` 
        }, { quoted: mek });
    }
});

// ═══════════════════════════════════════════════════════════
// 🔍 ANTI-LINK DETECTOR (Runs on every message)
// ═══════════════════════════════════════════════════════════

cmd({
    on: "body"
}, async (conn, m, store, {
    from,
    body,
    sender,
    isGroup
}) => {
    try {
        // Only run in groups
        if (!isGroup) return;
        if (!body) return;

        // Get group settings
        const settings = getGroupSettings(from);
        
        // Check if anti-link is enabled
        if (!settings.enabled) return;

        const senderId = m.key?.participant || sender;
        if (!senderId) return;

        // Check admin status
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId);

        // Check if sender is owner
        const isOwner = isOwnerUser(senderId);

        // Skip if sender is admin or owner (they can post links)
        if (isSenderAdmin || isOwner) return;

        // Skip if bot is not admin (can't delete or kick)
        if (!isBotAdmin) return;

        // ═══════════════════════════════════════════════════════════
        // 🔗 LINK DETECTION PATTERNS
        // ═══════════════════════════════════════════════════════════
        
        // All links pattern
        const allLinksRegex = /\b((https?:\/\/)?(www\.)?([a-z0-9-]+\.)+[a-z]{2,})(\/\S*)?/gi;
        
        // WhatsApp group & channel links (dangerous links)
        const waLinksRegex = /(chat\.whatsapp\.com\/[A-Za-z0-9]+|whatsapp\.com\/channel\/[A-Za-z0-9]+)/gi;

        const hasAnyLink = allLinksRegex.test(body);
        const hasWaLink = waLinksRegex.test(body);

        // If no link found, return
        if (!hasAnyLink) return;

        // Get display number for mentions
        const displayNumber = extractNumber(senderId);
        const mode = settings.mode || 1;

        // ═══════════════════════════════════════════════════════════
        // 🎯 MODE 1: DELETE ONLY (No Kick)
        // ═══════════════════════════════════════════════════════════
        if (mode === 1) {
            // Delete the message
            try {
                await conn.sendMessage(from, { delete: m.key });
            } catch (delError) {
                console.error("Failed to delete message:", delError);
            }

            // Send warning
            await conn.sendMessage(from, {
                text: `⚠️ *LINK DETECTED!*\n\n@${displayNumber}, links are *not allowed* here!\n\n🗑️ Your message has been deleted.`,
                mentions: [senderId]
            });

            return;
        }

        // ═══════════════════════════════════════════════════════════
        // 🎯 MODE 2: SMART MODE (Kick only for WA links)
        // ═══════════════════════════════════════════════════════════
        if (mode === 2) {
            // Delete the message first
            try {
                await conn.sendMessage(from, { delete: m.key });
            } catch (delError) {
                console.error("Failed to delete message:", delError);
            }

            if (hasWaLink) {
                // WhatsApp link - DELETE + KICK
                await conn.sendMessage(from, {
                    text: `🚨 *WHATSAPP LINK DETECTED!* 🚨\n\n@${displayNumber} shared a *WhatsApp group/channel link!*\n\n⛔ User has been *REMOVED* from this group!`,
                    mentions: [senderId]
                });

                // Get participant ID and kick
                const { participantId } = await getParticipantId(conn, from, senderId);
                
                try {
                    await conn.groupParticipantsUpdate(from, [participantId], "remove");
                    console.log(`👢 User kicked (Mode 2 - WA Link): ${senderId}`);
                } catch (kickError) {
                    console.error("Failed to kick user:", kickError);
                    await conn.sendMessage(from, {
                        text: `❌ Failed to remove user. Please remove manually.`
                    });
                }
            } else {
                // Normal link - DELETE + WARNING only
                await conn.sendMessage(from, {
                    text: `⚠️ *LINK DETECTED!*\n\n@${displayNumber}, links are *not allowed* here!\n\n🗑️ Your message has been deleted.\n\n⚠️ *Warning:* WhatsApp links will result in removal!`,
                    mentions: [senderId]
                });
            }

            return;
        }

        // ═══════════════════════════════════════════════════════════
        // 🎯 MODE 3: STRICT MODE (Kick for ANY link)
        // ═══════════════════════════════════════════════════════════
        if (mode === 3) {
            // Delete the message
            try {
                await conn.sendMessage(from, { delete: m.key });
            } catch (delError) {
                console.error("Failed to delete message:", delError);
            }

            // Send notification
            let kickReason = hasWaLink ? "WhatsApp group/channel link" : "link";
            
            await conn.sendMessage(from, {
                text: `🚨 *LINK DETECTED!* 🚨\n\n@${displayNumber} shared a *${kickReason}!*\n\n⛔ User has been *REMOVED* from this group!\n\n📋 *Mode:* Strict (No links allowed)`,
                mentions: [senderId]
            });

            // Get participant ID and kick
            const { participantId } = await getParticipantId(conn, from, senderId);
            
            try {
                await conn.groupParticipantsUpdate(from, [participantId], "remove");
                console.log(`👢 User kicked (Mode 3 - Any Link): ${senderId}`);
            } catch (kickError) {
                console.error("Failed to kick user:", kickError);
                await conn.sendMessage(from, {
                    text: `❌ Failed to remove user. Please remove manually.`
                });
            }

            return;
        }

    } catch (error) {
        console.error("Anti-link detector error:", error);
    }
});
