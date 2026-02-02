// ═══════════════════════════════════════════════════════════
// 🔗 ANTI-LINK PLUGIN - DARKZONE-MD
// Feature: Warn first → Kick if link within 10 minutes
// ═══════════════════════════════════════════════════════════

const { cmd } = require('../command');
const config = require("../config");
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 📁 DATABASE FOR ANTI-LINK SETTINGS & WARNINGS
// ═══════════════════════════════════════════════════════════

const dbDir = path.join(__dirname, '../database');
const antiLinkDbPath = path.join(dbDir, 'antilink.json');
const warningsDbPath = path.join(dbDir, 'linkwarnings.json');

// Warning timeout: 10 minutes
const WARNING_TIMEOUT = 10 * 60 * 1000;

// Ensure database directory and files exist
function ensureDbExists() {
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(antiLinkDbPath)) {
        fs.writeFileSync(antiLinkDbPath, JSON.stringify({}), 'utf8');
    }
    if (!fs.existsSync(warningsDbPath)) {
        fs.writeFileSync(warningsDbPath, JSON.stringify({}), 'utf8');
    }
}

// ═══════════════════════════════════════════════════════════
// 📂 ANTI-LINK SETTINGS FUNCTIONS
// ═══════════════════════════════════════════════════════════

function loadAntiLinkSettings() {
    try {
        ensureDbExists();
        return JSON.parse(fs.readFileSync(antiLinkDbPath, 'utf8'));
    } catch {
        return {};
    }
}

function saveAntiLinkSettings(settings) {
    try {
        ensureDbExists();
        fs.writeFileSync(antiLinkDbPath, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch {
        return false;
    }
}

function getGroupSettings(groupId) {
    const settings = loadAntiLinkSettings();
    const groupData = settings[groupId];
    
    // Check global config
    const configAntiLink = config.ANTI_LINK === 'true' || config.ANTI_LINK === true;
    
    // If group has custom settings
    if (groupData && groupData.customSet === true) {
        return {
            enabled: groupData.enabled,
            isGlobal: false
        };
    }
    
    // Use global config
    if (configAntiLink) {
        return {
            enabled: true,
            isGlobal: true
        };
    }
    
    return {
        enabled: false,
        isGlobal: false
    };
}

function setGroupSettings(groupId, enabled) {
    const settings = loadAntiLinkSettings();
    settings[groupId] = { 
        enabled, 
        customSet: true,
        updatedAt: Date.now()
    };
    return saveAntiLinkSettings(settings);
}

function resetGroupToGlobal(groupId) {
    const settings = loadAntiLinkSettings();
    if (settings[groupId]) {
        delete settings[groupId];
        return saveAntiLinkSettings(settings);
    }
    return true;
}

// ═══════════════════════════════════════════════════════════
// ⚠️ WARNING SYSTEM FUNCTIONS (10 minute auto-reset)
// ═══════════════════════════════════════════════════════════

function loadWarnings() {
    try {
        ensureDbExists();
        return JSON.parse(fs.readFileSync(warningsDbPath, 'utf8'));
    } catch {
        return {};
    }
}

function saveWarnings(warnings) {
    try {
        ensureDbExists();
        fs.writeFileSync(warningsDbPath, JSON.stringify(warnings, null, 2), 'utf8');
        return true;
    } catch {
        return false;
    }
}

function checkUserWarning(groupId, odId) {
    const warnings = loadWarnings();
    const key = `${groupId}_${odId}`;
    
    if (!warnings[key]) {
        return { hasWarning: false, shouldKick: false, timeLeft: 0 };
    }
    
    const warningTime = warnings[key].time;
    const timePassed = Date.now() - warningTime;
    
    // If more than 10 minutes passed, reset warning
    if (timePassed > WARNING_TIMEOUT) {
        delete warnings[key];
        saveWarnings(warnings);
        return { hasWarning: false, shouldKick: false, timeLeft: 0 };
    }
    
    // Warning still active - should kick
    const timeLeft = Math.ceil((WARNING_TIMEOUT - timePassed) / 1000 / 60); // in minutes
    return { hasWarning: true, shouldKick: true, timeLeft };
}

function setUserWarning(groupId, odId) {
    const warnings = loadWarnings();
    const key = `${groupId}_${odId}`;
    
    warnings[key] = {
        odId: odId,
        groupId: groupId,
        time: Date.now(),
        count: (warnings[key]?.count || 0) + 1
    };
    
    return saveWarnings(warnings);
}

function clearUserWarning(groupId, odId) {
    const warnings = loadWarnings();
    const key = `${groupId}_${odId}`;
    
    if (warnings[key]) {
        delete warnings[key];
        return saveWarnings(warnings);
    }
    return true;
}

// Auto-cleanup expired warnings every 5 minutes
setInterval(() => {
    try {
        const warnings = loadWarnings();
        const now = Date.now();
        let changed = false;
        
        for (const key in warnings) {
            if (now - warnings[key].time > WARNING_TIMEOUT) {
                delete warnings[key];
                changed = true;
            }
        }
        
        if (changed) {
            saveWarnings(warnings);
        }
    } catch (e) {}
}, 5 * 60 * 1000);

// ═══════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function extractNumber(id) {
    if (!id) return '';
    let num = id;
    if (num.includes('@')) num = num.split('@')[0];
    if (num.includes(':')) num = num.split(':')[0];
    return num.replace(/[^0-9]/g, '');
}

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
            const pNumber = extractNumber(p.id);
            const pLidNumber = p.lid ? extractNumber(p.lid) : '';
            const pPhoneNumber = p.phoneNumber ? extractNumber(p.phoneNumber) : '';
            
            const isAdmin = p.admin === "admin" || p.admin === "superadmin";
            
            if (isAdmin) {
                if (pNumber === botNumber || pLidNumber === botNumber || 
                    pNumber === botLidNumber || pLidNumber === botLidNumber ||
                    pPhoneNumber === botNumber) {
                    isBotAdmin = true;
                }
                
                if (pNumber === senderNumber || pLidNumber === senderNumber ||
                    pPhoneNumber === senderNumber) {
                    isSenderAdmin = true;
                }
            }
        }
        
        return { isBotAdmin, isSenderAdmin };
        
    } catch (err) {
        console.error('❌ Admin check error:', err);
        return { isBotAdmin: false, isSenderAdmin: false };
    }
}

function isOwnerUser(senderId) {
    const senderNumber = extractNumber(senderId);
    if (!config.OWNER_NUMBER) return false;
    const ownerNumber = extractNumber(config.OWNER_NUMBER);
    return senderNumber === ownerNumber;
}

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
    } catch {
        return { found: false, participantId: senderId };
    }
}

// ═══════════════════════════════════════════════════════════
// 📋 ANTI-LINK COMMAND
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "antilink",
    alias: ["al", "antilinkmode"],
    desc: "Configure Anti-Link (Warn → Kick in 10 min)",
    category: "group",
    react: "🔗",
    filename: __filename
},
async (conn, mek, m, { from, args, q, isGroup, sender, reply }) => {
    try {
        if (!isGroup) {
            return reply("❌ This command only works in groups!");
        }

        const senderId = m.key?.participant || sender;
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId);
        const isOwner = isOwnerUser(senderId);

        if (!isSenderAdmin && !isOwner) {
            return reply("❌ Only group admins can configure Anti-Link!");
        }

        const currentSettings = getGroupSettings(from);
        const option = q ? q.toLowerCase().trim() : '';
        const configAntiLink = config.ANTI_LINK === 'true' || config.ANTI_LINK === true;

        // ═══════════════════════════════════════════════════════════
        // 📊 SHOW MENU
        // ═══════════════════════════════════════════════════════════
        if (!option) {
            const statusEmoji = currentSettings.enabled ? "🟢" : "🔴";
            const statusText = currentSettings.enabled ? "ON" : "OFF";
            const sourceText = currentSettings.isGlobal ? "🌍 Global (Config)" : "⚙️ Custom";

            const menuText = `
╔════════════════════════╗
║   🔗 *ANTI-LINK SYSTEM*
╠════════════════════════╣
║
║  ${statusEmoji} *Status:* ${statusText}
║  📋 *Source:* ${sourceText}
║  🌐 *Config:* ${configAntiLink ? "TRUE" : "FALSE"}
║
╠════════════════════════╣
║      ⚡ *HOW IT WORKS*
╠════════════════════════╣
║
║  1️⃣ User sends a link
║     ➤ Message deleted
║     ➤ Warning sent ⚠️
║
║  2️⃣ Same user sends link
║     within 10 minutes
║     ➤ Message deleted
║     ➤ User KICKED! 👢
║
║  3️⃣ After 10 minutes
║     ➤ Warning auto-resets
║     ➤ User gets fresh start
║
╠════════════════════════╣
║       ⌨️ *COMMANDS*
╠════════════════════════╣
║
║  *.antilink on*
║  ➤ Turn ON Anti-Link
║
║  *.antilink off*
║  ➤ Turn OFF Anti-Link
║
║  *.antilink reset*
║  ➤ Follow global config
║
║  *.antilink clear @user*
║  ➤ Clear user's warning
║
╠════════════════════════╣
║  ⚠️ Admins & Owner excluded
║  🤖 Bot must be admin
╚════════════════════════╝
`.trim();

            return reply(menuText);
        }

        // ═══════════════════════════════════════════════════════════
        // 🟢 TURN ON
        // ═══════════════════════════════════════════════════════════
        if (option === 'on' || option === 'enable' || option === '1') {
            if (!isBotAdmin) {
                return reply("❌ I need to be an admin to use Anti-Link!");
            }

            setGroupSettings(from, true);
            
            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });

            return reply(`✅ *Anti-Link Enabled!*

📋 *How it works:*
• First link = ⚠️ Warning
• Second link within 10 min = 👢 Kick
• After 10 min = Warning resets

⚠️ WhatsApp group & channel links will be detected!`);
        }

        // ═══════════════════════════════════════════════════════════
        // 🔴 TURN OFF
        // ═══════════════════════════════════════════════════════════
        if (option === 'off' || option === 'disable' || option === '0') {
            setGroupSettings(from, false);
            
            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });

            return reply(`🔴 *Anti-Link Disabled!*

✅ Members can now share links freely.`);
        }

        // ═══════════════════════════════════════════════════════════
        // 🔄 RESET TO GLOBAL
        // ═══════════════════════════════════════════════════════════
        if (option === 'reset' || option === 'global' || option === 'default') {
            resetGroupToGlobal(from);
            
            await conn.sendMessage(from, { 
                react: { text: "🔄", key: mek.key } 
            });

            const newSettings = getGroupSettings(from);
            const newStatus = newSettings.enabled ? "ON" : "OFF";

            return reply(`🔄 *Reset to Global Settings!*

🌐 *Config ANTI_LINK:* ${configAntiLink ? "TRUE" : "FALSE"}
📋 *Current Status:* ${newStatus}`);
        }

        // ═══════════════════════════════════════════════════════════
        // 🧹 CLEAR USER WARNING
        // ═══════════════════════════════════════════════════════════
        if (option.startsWith('clear')) {
            const mentionedJid = m.mentionedJid || [];
            
            if (mentionedJid.length === 0) {
                return reply("❌ Please mention a user!\n\nUsage: `.antilink clear @user`");
            }
            
            const targetodId = mentionedJid[0];
            clearUserWarning(from, targetodId);
            
            const targetNumber = extractNumber(targetodId);
            
            return reply(`✅ Warning cleared for @${targetNumber}!

The user can now send 1 link before getting kicked.`, {
                mentions: [targetodId]
            });
        }

        // ═══════════════════════════════════════════════════════════
        // ❓ UNKNOWN
        // ═══════════════════════════════════════════════════════════
        return reply(`❌ Unknown option: *${option}*

Use *.antilink* to see available options.`);

    } catch (e) {
        console.error("AntiLink command error:", e);
        reply("❌ Error: " + e.message);
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
        // Only in groups
        if (!isGroup) return;
        if (!body) return;

        // Check settings
        const settings = getGroupSettings(from);
        if (!settings.enabled) return;

        const senderId = m.key?.participant || sender;
        if (!senderId) return;

        // Check admin status
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId);
        const isOwner = isOwnerUser(senderId);

        // Skip admins and owner
        if (isSenderAdmin || isOwner) return;

        // Bot must be admin
        if (!isBotAdmin) return;

        // ═══════════════════════════════════════════════════════════
        // 🔗 LINK DETECTION
        // ═══════════════════════════════════════════════════════════
        
        // WhatsApp group & channel links
        const waLinksRegex = /(chat\.whatsapp\.com\/[A-Za-z0-9]+|whatsapp\.com\/channel\/[A-Za-z0-9]+)/gi;
        
        const hasWaLink = waLinksRegex.test(body);

        if (!hasWaLink) return;

        // Get user number for display
        const displayNumber = extractNumber(senderId);

        // ═══════════════════════════════════════════════════════════
        // ⚠️ CHECK WARNING STATUS
        // ═══════════════════════════════════════════════════════════
        
        const warningStatus = checkUserWarning(from, senderId);

        // Delete the message first
        try {
            await conn.sendMessage(from, { delete: m.key });
        } catch (delError) {
            console.error("Failed to delete:", delError);
        }

        if (warningStatus.shouldKick) {
            // ═══════════════════════════════════════════════════════════
            // 👢 SECOND LINK WITHIN 10 MIN = KICK
            // ═══════════════════════════════════════════════════════════
            
            await conn.sendMessage(from, {
                text: `🚨 *ANTI-LINK VIOLATION!* 🚨

@${displayNumber} sent a link *AGAIN* within 10 minutes!

⚠️ *First Warning:* Ignored
👢 *Action:* REMOVED from group!

📋 *Rule:* No links allowed in this group.`,
                mentions: [senderId]
            });

            // Clear warning before kick
            clearUserWarning(from, senderId);

            // Get proper participant ID and kick
            const { participantId } = await getParticipantId(conn, from, senderId);
            
            try {
                await conn.groupParticipantsUpdate(from, [participantId], "remove");
                console.log(`👢 Kicked for anti-link: ${senderId}`);
            } catch (kickError) {
                console.error("Kick failed:", kickError);
                await conn.sendMessage(from, {
                    text: `❌ Failed to remove user. Please remove manually.`
                });
            }

        } else {
            // ═══════════════════════════════════════════════════════════
            // ⚠️ FIRST LINK = WARNING
            // ═══════════════════════════════════════════════════════════
            
            // Set warning
            setUserWarning(from, senderId);

            await conn.sendMessage(from, {
                text: `⚠️ *LINK DETECTED!* ⚠️

@${displayNumber}, links are *NOT allowed* here!

🗑️ Your message has been *deleted*.

⏰ *Warning:* If you send another link within *10 minutes*, you will be *KICKED* from this group!

📋 This is your *first and only* warning.`,
                mentions: [senderId]
            });

            console.log(`⚠️ Warning issued: ${senderId} in ${from}`);
        }

    } catch (error) {
        console.error("Anti-link detector error:", error);
    }
});

// ═══════════════════════════════════════════════════════════
// 📊 CHECK WARNINGS COMMAND
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "warnings",
    alias: ["checkwarn", "linkwarns"],
    desc: "Check link warnings in group",
    category: "group",
    react: "⚠️",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, sender, reply }) => {
    try {
        if (!isGroup) {
            return reply("❌ This command only works in groups!");
        }

        const senderId = m.key?.participant || sender;
        const { isSenderAdmin } = await checkAdminStatus(conn, from, senderId);
        const isOwner = isOwnerUser(senderId);

        if (!isSenderAdmin && !isOwner) {
            return reply("❌ Only admins can check warnings!");
        }

        const warnings = loadWarnings();
        const groupWarnings = [];

        for (const key in warnings) {
            if (key.startsWith(from)) {
                const data = warnings[key];
                const timeLeft = WARNING_TIMEOUT - (Date.now() - data.time);
                
                if (timeLeft > 0) {
                    const minutes = Math.ceil(timeLeft / 1000 / 60);
                    const number = extractNumber(data.odId);
                    groupWarnings.push({
                        number,
                        odId: data.odId,
                        minutes
                    });
                }
            }
        }

        if (groupWarnings.length === 0) {
            return reply("✅ No active link warnings in this group!");
        }

        let text = `⚠️ *Active Link Warnings*\n\n`;
        
        groupWarnings.forEach((w, i) => {
            text += `${i + 1}. @${w.number}\n`;
            text += `   ⏰ Expires in: ${w.minutes} min\n\n`;
        });

        text += `\n📋 Use *.antilink clear @user* to clear a warning.`;

        await conn.sendMessage(from, {
            text: text,
            mentions: groupWarnings.map(w => w.odId)
        }, { quoted: mek });

    } catch (e) {
        console.error("Warnings command error:", e);
        reply("❌ Error: " + e.message);
    }
});

console.log("✅ Anti-Link Plugin Loaded - Warn → Kick (10 min reset)");
