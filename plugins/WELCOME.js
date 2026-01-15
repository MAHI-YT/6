const { cmd } = require('../command');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// Database file path for greeting settings
const greetingsDbPath = path.join(__dirname, '../database/greetings.json');

// Initialize database
function initGreetingsDb() {
    const dbDir = path.dirname(greetingsDbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(greetingsDbPath)) {
        fs.writeFileSync(greetingsDbPath, JSON.stringify({}));
    }
}

// Get group settings
function getGroupSettings(groupId) {
    initGreetingsDb();
    try {
        const data = JSON.parse(fs.readFileSync(greetingsDbPath, 'utf8'));
        return data[groupId] || {
            welcome: false,
            goodbye: false,
            adminEvent: false
        };
    } catch (err) {
        return { welcome: false, goodbye: false, adminEvent: false };
    }
}

// Save group settings
function saveGroupSettings(groupId, settings) {
    initGreetingsDb();
    try {
        const data = JSON.parse(fs.readFileSync(greetingsDbPath, 'utf8'));
        data[groupId] = settings;
        fs.writeFileSync(greetingsDbPath, JSON.stringify(data, null, 2));
        return true;
    } catch (err) {
        console.error('Error saving settings:', err);
        return false;
    }
}

// Function to extract user info with LID support
function extractUserInfo(userId) {
    if (!userId) return { number: '', fullId: '' };
    
    let number = userId;
    if (userId.includes(':')) {
        number = userId.split(':')[0];
    } else if (userId.includes('@')) {
        number = userId.split('@')[0];
    }
    
    return {
        number: number,
        fullId: userId,
        displayNumber: number.replace(/[^0-9]/g, '')
    };
}

// Check admin status with LID support
async function checkAdminStatus(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const participants = metadata.participants || [];
        
        const botId = conn.user?.id || '';
        const botLid = conn.user?.lid || '';
        
        const botNumber = botId.includes(':') ? botId.split(':')[0] : (botId.includes('@') ? botId.split('@')[0] : botId);
        const botLidNumeric = botLid.includes(':') ? botLid.split(':')[0] : (botLid.includes('@') ? botLid.split('@')[0] : botLid);
        
        const senderNumber = senderId.includes(':') ? senderId.split(':')[0] : (senderId.includes('@') ? senderId.split('@')[0] : senderId);
        
        let isBotAdmin = false;
        let isSenderAdmin = false;
        
        for (let p of participants) {
            if (p.admin === "admin" || p.admin === "superadmin") {
                const pId = p.id ? p.id.split('@')[0] : '';
                const pLid = p.lid ? p.lid.split('@')[0] : '';
                const pPhoneNumber = p.phoneNumber ? p.phoneNumber.split('@')[0] : '';
                const pLidNumeric = pLid.includes(':') ? pLid.split(':')[0] : pLid;
                const pIdNumeric = pId.includes(':') ? pId.split(':')[0] : pId;
                
                // Bot check
                if (botNumber === pIdNumeric || botNumber === pPhoneNumber || 
                    botLidNumeric === pLidNumeric || botId === p.id || botLid === p.lid) {
                    isBotAdmin = true;
                }
                
                // Sender check
                if (senderNumber === pIdNumeric || senderNumber === pPhoneNumber ||
                    senderId === p.id || senderId === p.lid) {
                    isSenderAdmin = true;
                }
            }
        }
        
        return { isBotAdmin, isSenderAdmin };
    } catch (err) {
        console.error('Error checking admin status:', err);
        return { isBotAdmin: false, isSenderAdmin: false };
    }
}

// ═══════════════════════════════════════
// WELCOME COMMAND
// ═══════════════════════════════════════
cmd({
    pattern: "welcome",
    alias: ["setwelcome", "4"],
    desc: "Enable or disable welcome messages",
    category: "group",
    react: "👋",
    filename: __filename
},
async (Void, citel, text) => {
    try {
        if (!citel.isGroup) {
            return citel.reply("❌ This command only works in groups!");
        }

        const senderId = citel.key?.participant || citel.sender || citel.key?.remoteJid;
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(Void, citel.chat, senderId);

        if (!isSenderAdmin) {
            return citel.reply("❌ Only *group admins* can use this command!");
        }

        const args = text?.toLowerCase()?.trim();
        const settings = getGroupSettings(citel.chat);

        if (!args || (args !== 'on' && args !== 'off')) {
            const status = settings.welcome ? '✅ ON' : '❌ OFF';
            return citel.reply(`*╭─────────────────────╮*
*│    👋 Welcome Settings*
*├─────────────────────┤*
*│ Current Status:* ${status}
*│*
*│ Usage:*
*│ • .welcome on*
*│ • .welcome off*
*╰─────────────────────╯*`);
        }

        if (args === 'on') {
            settings.welcome = true;
            saveGroupSettings(citel.chat, settings);
            return citel.reply(`*╭─────────────────────╮*
*│  ✅ Welcome Message ON*
*├─────────────────────┤*
*│ New members will now*
*│ receive a welcome message!*
*│*
*│ ©Powered by ${config.BOT_NAME}*
*╰─────────────────────╯*`);
        } else {
            settings.welcome = false;
            saveGroupSettings(citel.chat, settings);
            return citel.reply(`*╭─────────────────────╮*
*│  ❌ Welcome Message OFF*
*├─────────────────────┤*
*│ Welcome messages will*
*│ no longer be sent!*
*│*
*│ ©Powered by ${config.BOT_NAME}*
*╰─────────────────────╯*`);
        }

    } catch (error) {
        console.error("[WELCOME CMD ERROR]", error);
        citel.reply("❌ An error occurred!");
    }
});

// ═══════════════════════════════════════
// GOODBYE COMMAND
// ═══════════════════════════════════════
cmd({
    pattern: "goodbye",
    alias: ["setgoodbye", "5", "farewell"],
    desc: "Enable or disable goodbye messages",
    category: "group",
    react: "👋",
    filename: __filename
},
async (Void, citel, text) => {
    try {
        if (!citel.isGroup) {
            return citel.reply("❌ This command only works in groups!");
        }

        const senderId = citel.key?.participant || citel.sender || citel.key?.remoteJid;
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(Void, citel.chat, senderId);

        if (!isSenderAdmin) {
            return citel.reply("❌ Only *group admins* can use this command!");
        }

        const args = text?.toLowerCase()?.trim();
        const settings = getGroupSettings(citel.chat);

        if (!args || (args !== 'on' && args !== 'off')) {
            const status = settings.goodbye ? '✅ ON' : '❌ OFF';
            return citel.reply(`*╭─────────────────────╮*
*│    👋 Goodbye Settings*
*├─────────────────────┤*
*│ Current Status:* ${status}
*│*
*│ Usage:*
*│ • .goodbye on*
*│ • .goodbye off*
*╰─────────────────────╯*`);
        }

        if (args === 'on') {
            settings.goodbye = true;
            saveGroupSettings(citel.chat, settings);
            return citel.reply(`*╭─────────────────────╮*
*│  ✅ Goodbye Message ON*
*├─────────────────────┤*
*│ Leaving members will now*
*│ receive a goodbye message!*
*│*
*│ ©Powered by ${config.BOT_NAME}*
*╰─────────────────────╯*`);
        } else {
            settings.goodbye = false;
            saveGroupSettings(citel.chat, settings);
            return citel.reply(`*╭─────────────────────╮*
*│  ❌ Goodbye Message OFF*
*├─────────────────────┤*
*│ Goodbye messages will*
*│ no longer be sent!*
*│*
*│ ©Powered by ${config.BOT_NAME}*
*╰─────────────────────╯*`);
        }

    } catch (error) {
        console.error("[GOODBYE CMD ERROR]", error);
        citel.reply("❌ An error occurred!");
    }
});

// ═══════════════════════════════════════
// ADMIN EVENT COMMAND
// ═══════════════════════════════════════
cmd({
    pattern: "adminevent",
    alias: ["adminaction", "adminalert", "6"],
    desc: "Enable or disable admin event notifications",
    category: "group",
    react: "👑",
    filename: __filename
},
async (Void, citel, text) => {
    try {
        if (!citel.isGroup) {
            return citel.reply("❌ This command only works in groups!");
        }

        const senderId = citel.key?.participant || citel.sender || citel.key?.remoteJid;
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(Void, citel.chat, senderId);

        if (!isSenderAdmin) {
            return citel.reply("❌ Only *group admins* can use this command!");
        }

        const args = text?.toLowerCase()?.trim();
        const settings = getGroupSettings(citel.chat);

        if (!args || (args !== 'on' && args !== 'off')) {
            const status = settings.adminEvent ? '✅ ON' : '❌ OFF';
            return citel.reply(`*╭─────────────────────╮*
*│   👑 Admin Event Settings*
*├─────────────────────┤*
*│ Current Status:* ${status}
*│*
*│ This notifies when:*
*│ • Someone becomes admin*
*│ • Someone is demoted*
*│*
*│ Usage:*
*│ • .adminevent on*
*│ • .adminevent off*
*╰─────────────────────╯*`);
        }

        if (args === 'on') {
            settings.adminEvent = true;
            saveGroupSettings(citel.chat, settings);
            return citel.reply(`*╭─────────────────────╮*
*│  ✅ Admin Event ON*
*├─────────────────────┤*
*│ Admin promote/demote*
*│ notifications enabled!*
*│*
*│ ©Powered by ${config.BOT_NAME}*
*╰─────────────────────╯*`);
        } else {
            settings.adminEvent = false;
            saveGroupSettings(citel.chat, settings);
            return citel.reply(`*╭─────────────────────╮*
*│  ❌ Admin Event OFF*
*├─────────────────────┤*
*│ Admin notifications*
*│ are now disabled!*
*│*
*│ ©Powered by ${config.BOT_NAME}*
*╰─────────────────────╯*`);
        }

    } catch (error) {
        console.error("[ADMIN EVENT CMD ERROR]", error);
        citel.reply("❌ An error occurred!");
    }
});

// ═══════════════════════════════════════
// GREETINGS STATUS COMMAND (All in one)
// ═══════════════════════════════════════
cmd({
    pattern: "greetings",
    alias: ["greet", "greetsettings", "gs"],
    desc: "View or manage all greeting settings",
    category: "group",
    react: "⚙️",
    filename: __filename
},
async (Void, citel, text) => {
    try {
        if (!citel.isGroup) {
            return citel.reply("❌ This command only works in groups!");
        }

        const senderId = citel.key?.participant || citel.sender || citel.key?.remoteJid;
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(Void, citel.chat, senderId);

        if (!isSenderAdmin) {
            return citel.reply("❌ Only *group admins* can use this command!");
        }

        const args = text?.toLowerCase()?.trim()?.split(' ');
        const settings = getGroupSettings(citel.chat);

        // If no arguments, show status
        if (!args || !args[0]) {
            const welcomeStatus = settings.welcome ? '✅ ON' : '❌ OFF';
            const goodbyeStatus = settings.goodbye ? '✅ ON' : '❌ OFF';
            const adminEventStatus = settings.adminEvent ? '✅ ON' : '❌ OFF';

            return citel.reply(`*╭─────────────────────╮*
*│    ⚙️ Greetings Settings*
*├─────────────────────┤*
*│ 👋 Welcome:* ${welcomeStatus}
*│ 🚪 Goodbye:* ${goodbyeStatus}
*│ 👑 Admin Event:* ${adminEventStatus}
*├─────────────────────┤*
*│ Commands:*
*│ • .welcome on/off*
*│ • .goodbye on/off*
*│ • .adminevent on/off*
*│ • .greetings all on/off*
*╰─────────────────────╯*`);
        }

        // Handle "all on" or "all off"
        if (args[0] === 'all') {
            if (args[1] === 'on') {
                settings.welcome = true;
                settings.goodbye = true;
                settings.adminEvent = true;
                saveGroupSettings(citel.chat, settings);
                return citel.reply(`*╭─────────────────────╮*
*│  ✅ All Settings ON*
*├─────────────────────┤*
*│ ✅ Welcome: ON*
*│ ✅ Goodbye: ON*
*│ ✅ Admin Event: ON*
*│*
*│ ©Powered by ${config.BOT_NAME}*
*╰─────────────────────╯*`);
            } else if (args[1] === 'off') {
                settings.welcome = false;
                settings.goodbye = false;
                settings.adminEvent = false;
                saveGroupSettings(citel.chat, settings);
                return citel.reply(`*╭─────────────────────╮*
*│  ❌ All Settings OFF*
*├─────────────────────┤*
*│ ❌ Welcome: OFF*
*│ ❌ Goodbye: OFF*
*│ ❌ Admin Event: OFF*
*│*
*│ ©Powered by ${config.BOT_NAME}*
*╰─────────────────────╯*`);
            }
        }

        return citel.reply(`*❌ Invalid Usage!*

*Usage:*
• .greetings - View status
• .greetings all on - Enable all
• .greetings all off - Disable all`);

    } catch (error) {
        console.error("[GREETINGS CMD ERROR]", error);
        citel.reply("❌ An error occurred!");
    }
});

// Export functions for event handler
module.exports.getGroupSettings = getGroupSettings;
module.exports.extractUserInfo = extractUserInfo;
