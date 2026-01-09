const { cmd } = require('../command');
const config = require("../config");
const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════
// 📁 DATABASE FILE FOR STATUS REACT SETTINGS
// ═══════════════════════════════════════════════════════════
const statusReactDbPath = path.join(__dirname, '../database/statusreact.json');

// Ensure database directory exists
function ensureDbExists() {
    const dbDir = path.dirname(statusReactDbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    if (!fs.existsSync(statusReactDbPath)) {
        fs.writeFileSync(statusReactDbPath, JSON.stringify({
            enabled: false,
            emoji: '❤️',
            reactedStatuses: [],
            stats: {
                totalReacted: 0,
                lastReacted: null
            }
        }), 'utf8');
    }
}

// Load settings
function loadSettings() {
    try {
        ensureDbExists();
        const data = fs.readFileSync(statusReactDbPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {
            enabled: false,
            emoji: '❤️',
            reactedStatuses: [],
            stats: {
                totalReacted: 0,
                lastReacted: null
            }
        };
    }
}

// Save settings
function saveSettings(settings) {
    try {
        ensureDbExists();
        fs.writeFileSync(statusReactDbPath, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error saving status react settings:', error);
        return false;
    }
}

// Check if status react is enabled (config or custom setting)
function isStatusReactEnabled() {
    const settings = loadSettings();
    const configEnabled = config.AUTO_STATUS_REACT === 'true' || config.AUTO_STATUS_REACT === true;
    return settings.enabled || configEnabled;
}

// Get current emoji
function getCurrentEmoji() {
    const settings = loadSettings();
    return settings.emoji || config.STATUS_REACT_EMOJI || '❤️';
}

// Add reacted status to history
function addReactedStatus(statusId, sender) {
    const settings = loadSettings();
    
    // Keep only last 100 entries to prevent file from growing too large
    if (settings.reactedStatuses.length >= 100) {
        settings.reactedStatuses = settings.reactedStatuses.slice(-50);
    }
    
    settings.reactedStatuses.push({
        id: statusId,
        sender: sender,
        time: new Date().toISOString()
    });
    
    settings.stats.totalReacted++;
    settings.stats.lastReacted = new Date().toISOString();
    
    saveSettings(settings);
}

// Check if already reacted to this status
function hasReacted(statusId) {
    const settings = loadSettings();
    return settings.reactedStatuses.some(s => s.id === statusId);
}

// Extract number from ID
function extractNumber(id) {
    if (!id) return '';
    let num = id;
    if (num.includes('@')) num = num.split('@')[0];
    if (num.includes(':')) num = num.split(':')[0];
    return num.replace(/[^0-9]/g, '');
}

// Check if user is owner
function isOwnerUser(senderId) {
    const senderNumber = extractNumber(senderId);
    if (!config.OWNER_NUMBER) return false;
    const ownerNumber = extractNumber(config.OWNER_NUMBER);
    return senderNumber === ownerNumber;
}

// ═══════════════════════════════════════════════════════════
// 📋 STATUS REACT COMMAND (Settings Panel)
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "irfna5",
    alias: ["autoreact", "sreact", "statuslike", "autostatus"],
    desc: "Configure Auto Status React settings",
    category: "tools",
    react: "👁️",
    filename: __filename
},
async (conn, mek, m, { from, args, q, sender, reply }) => {
    try {
        const senderId = sender;
        
        // Only owner can configure
        if (!isOwnerUser(senderId)) {
            return await conn.sendMessage(from, { 
                text: "❌ Only bot owner can configure Status React!" 
            }, { quoted: mek });
        }

        const settings = loadSettings();
        const option = q ? q.toLowerCase().trim() : '';
        const configEnabled = config.AUTO_STATUS_REACT === 'true' || config.AUTO_STATUS_REACT === true;

        // ═══════════════════════════════════════════════════════════
        // 📊 SHOW MENU (No arguments)
        // ═══════════════════════════════════════════════════════════
        if (!option) {
            const isEnabled = isStatusReactEnabled();
            const statusEmoji = isEnabled ? "🟢" : "🔴";
            const statusText = isEnabled ? "ON" : "OFF";
            const currentEmoji = getCurrentEmoji();

            const menuText = `
╔═══════════════════════════════╗
║  👁️ *AUTO STATUS REACT* 👁️   ║
╠═══════════════════════════════╣
║                               
║  ${statusEmoji} *Status:* ${statusText}
║  😍 *React Emoji:* ${currentEmoji}
║                               
║  📊 *Statistics:*
║  ├ Total Reacted: ${settings.stats.totalReacted}
║  └ Last React: ${settings.stats.lastReacted ? new Date(settings.stats.lastReacted).toLocaleString() : 'Never'}
║                               
║  🌐 *Config:* ${configEnabled ? "✅ TRUE" : "❌ FALSE"}
║                               
╠═══════════════════════════════╣
║       ⌨️ *COMMANDS*           ║
╠═══════════════════════════════╣
║                               
║  *.statusreact on*
║  ➤ Enable Auto Status React
║                               
║  *.statusreact off*
║  ➤ Disable Auto Status React
║                               
║  *.statusreact emoji ❤️*
║  ➤ Change react emoji
║                               
║  *.statusreact stats*
║  ➤ View detailed statistics
║                               
║  *.statusreact reset*
║  ➤ Reset all statistics
║                               
╠═══════════════════════════════╣
║  📝 *Available Emojis:*       ║
║  ❤️ 😍 🔥 👏 😂 😮 😢 🙏 👍 🎉  ║
╚═══════════════════════════════╝
`.trim();

            return await conn.sendMessage(from, { 
                text: menuText 
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 🟢 TURN ON
        // ═══════════════════════════════════════════════════════════
        if (option === 'on' || option === 'enable' || option === 'true') {
            settings.enabled = true;
            saveSettings(settings);

            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });

            return await conn.sendMessage(from, { 
                text: `✅ *Auto Status React Enabled!*\n\n😍 *React Emoji:* ${getCurrentEmoji()}\n\n📝 Bot will now automatically react to all status updates!\n\n💡 Use *.statusreact emoji [emoji]* to change reaction.`
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 🔴 TURN OFF
        // ═══════════════════════════════════════════════════════════
        if (option === 'off' || option === 'disable' || option === 'false') {
            settings.enabled = false;
            saveSettings(settings);

            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });

            return await conn.sendMessage(from, { 
                text: `🔴 *Auto Status React Disabled!*\n\n✅ Bot will no longer react to status updates.`
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 😍 CHANGE EMOJI
        // ═══════════════════════════════════════════════════════════
        if (option.startsWith('emoji')) {
            const newEmoji = option.replace('emoji', '').trim() || args[1];
            
            if (!newEmoji) {
                return await conn.sendMessage(from, { 
                    text: `❌ Please provide an emoji!\n\n*Example:* .statusreact emoji ❤️\n\n*Available:* ❤️ 😍 🔥 👏 😂 😮 😢 🙏 👍 🎉`
                }, { quoted: mek });
            }

            settings.emoji = newEmoji;
            saveSettings(settings);

            await conn.sendMessage(from, { 
                react: { text: newEmoji, key: mek.key } 
            });

            return await conn.sendMessage(from, { 
                text: `✅ *React Emoji Changed!*\n\n😍 *New Emoji:* ${newEmoji}\n\n📝 All future status reactions will use this emoji.`
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 📊 VIEW STATS
        // ═══════════════════════════════════════════════════════════
        if (option === 'stats' || option === 'statistics' || option === 'info') {
            const recentReacts = settings.reactedStatuses.slice(-10).reverse();
            
            let statsText = `
╔═══════════════════════════════╗
║    📊 *STATUS REACT STATS*    ║
╠═══════════════════════════════╣
║                               
║  📈 *Total Reacted:* ${settings.stats.totalReacted}
║  😍 *Current Emoji:* ${getCurrentEmoji()}
║  ⏰ *Last React:* ${settings.stats.lastReacted ? new Date(settings.stats.lastReacted).toLocaleString() : 'Never'}
║                               
╠═══════════════════════════════╣
║    🕐 *RECENT REACTIONS*      ║
╠═══════════════════════════════╣`.trim();

            if (recentReacts.length > 0) {
                recentReacts.forEach((r, i) => {
                    const number = extractNumber(r.sender);
                    const time = new Date(r.time).toLocaleTimeString();
                    statsText += `\n║  ${i + 1}. @${number} - ${time}`;
                });
            } else {
                statsText += `\n║  No recent reactions`;
            }

            statsText += `\n╚═══════════════════════════════╝`;

            return await conn.sendMessage(from, { 
                text: statsText
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // 🔄 RESET STATS
        // ═══════════════════════════════════════════════════════════
        if (option === 'reset' || option === 'clear') {
            settings.reactedStatuses = [];
            settings.stats = {
                totalReacted: 0,
                lastReacted: null
            };
            saveSettings(settings);

            await conn.sendMessage(from, { 
                react: { text: "🔄", key: mek.key } 
            });

            return await conn.sendMessage(from, { 
                text: `🔄 *Statistics Reset!*\n\n✅ All status react history has been cleared.`
            }, { quoted: mek });
        }

        // ═══════════════════════════════════════════════════════════
        // ❓ UNKNOWN OPTION
        // ═══════════════════════════════════════════════════════════
        return await conn.sendMessage(from, { 
            text: `❌ Unknown option: *${option}*\n\n💡 Use *.statusreact* to see all available options.`
        }, { quoted: mek });

    } catch (e) {
        console.error("Error in statusreact command:", e);
        await conn.sendMessage(from, { 
            text: `❌ An error occurred: ${e.message}` 
        }, { quoted: mek });
    }
});

// ═══════════════════════════════════════════════════════════
// 👁️ STATUS DETECTOR & AUTO REACTOR
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
        // Check if this is a status message
        if (from !== 'status@broadcast') return;
        
        // Check if status react is enabled
        if (!isStatusReactEnabled()) return;

        const statusId = m.key?.id;
        const statusSender = m.key?.participant || sender;

        // Check if already reacted
        if (statusId && hasReacted(statusId)) return;

        // Get current emoji
        const emoji = getCurrentEmoji();

        // React to status
        try {
            await conn.sendMessage(from, {
                react: {
                    text: emoji,
                    key: m.key
                }
            });

            // Log the reaction
            console.log(`✅ Reacted to status from ${extractNumber(statusSender)} with ${emoji}`);

            // Save to history
            if (statusId) {
                addReactedStatus(statusId, statusSender);
            }

        } catch (reactError) {
            console.error("Failed to react to status:", reactError);
        }

    } catch (error) {
        console.error("Status detector error:", error);
    }
});

// ═══════════════════════════════════════════════════════════
// 📡 ALTERNATIVE STATUS LISTENER (Add to your main file)
// ═══════════════════════════════════════════════════════════
// If the above doesn't work, add this 
