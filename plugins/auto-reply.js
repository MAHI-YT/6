// ═══════════════════════════════════════════════════════════
// 💬 AUTO-REPLY PLUGIN - DARKZONE-MD
// Automatically replies to specific messages
// ═══════════════════════════════════════════════════════════

const { cmd } = require('../command');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// Load auto-reply data
const autoReplyPath = path.join(__dirname, '../assets/autoreply.json');

function loadAutoReplies() {
    try {
        if (!fs.existsSync(autoReplyPath)) {
            return {};
        }
        return JSON.parse(fs.readFileSync(autoReplyPath, 'utf8'));
    } catch (error) {
        console.error('Error loading auto-replies:', error);
        return {};
    }
}

// ═══════════════════════════════════════════════════════════
// 🔄 AUTO-REPLY DETECTOR (Runs on every message)
// ═══════════════════════════════════════════════════════════

cmd({
    on: "body"
}, async (conn, m, store, {
    from,
    body,
    sender,
    isGroup,
    reply
}) => {
    try {
        // Check if auto-reply is enabled
        if (config.AUTO_REPLY !== 'true') return;
        
        if (!body) return;

        // Load replies
        const autoReplies = loadAutoReplies();
        
        if (Object.keys(autoReplies).length === 0) return;

        // Normalize input
        const normalizedBody = body.trim().toLowerCase();

        // Check for exact match (case-insensitive)
        for (const [trigger, response] of Object.entries(autoReplies)) {
            const normalizedTrigger = trigger.toLowerCase();
            
            // Exact match
            if (normalizedBody === normalizedTrigger) {
                await conn.sendMessage(from, {
                    text: response
                }, { quoted: m });
                return;
            }
            
            // Contains match (for multi-word triggers)
            if (normalizedBody.includes(normalizedTrigger)) {
                await conn.sendMessage(from, {
                    text: response
                }, { quoted: m });
                return;
            }
        }

    } catch (error) {
        console.error("Auto-reply error:", error);
    }
});

// ═══════════════════════════════════════════════════════════
// ⚙️ AUTO-REPLY SETTINGS COMMAND
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "autoreply",
    alias: ["ar", "autoreplymode"],
    desc: "Toggle auto-reply on/off",
    category: "settings",
    react: "💬",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, isCreator }) => {
    try {
        if (!isCreator) {
            return reply("❌ Only owner can change auto-reply settings!");
        }

        const option = q ? q.toLowerCase().trim() : '';

        if (!option) {
            const status = config.AUTO_REPLY === 'true' ? "ON ✅" : "OFF ❌";
            const autoReplies = loadAutoReplies();
            const count = Object.keys(autoReplies).length;

            return reply(`💬 *AUTO-REPLY STATUS*

📊 *Current:* ${status}
📝 *Total Triggers:* ${count}

⌨️ *Commands:*
• .autoreply on - Turn ON
• .autoreply off - Turn OFF
• .autoreply list - Show all triggers`);
        }

        if (option === 'on' || option === 'enable') {
            const { saveConfig } = require('../lib/functions2');
            saveConfig('AUTO_REPLY', 'true');
            config.AUTO_REPLY = 'true';
            
            return reply("✅ *Auto-Reply Enabled!*\n\nBot will now respond to trigger messages.");
        }

        if (option === 'off' || option === 'disable') {
            const { saveConfig } = require('../lib/functions2');
            saveConfig('AUTO_REPLY', 'false');
            config.AUTO_REPLY = 'false';
            
            return reply("❌ *Auto-Reply Disabled!*\n\nBot will not respond to trigger messages.");
        }

        if (option === 'list' || option === 'show') {
            const autoReplies = loadAutoReplies();
            
            if (Object.keys(autoReplies).length === 0) {
                return reply("❌ No auto-reply triggers found!");
            }

            let text = `📋 *AUTO-REPLY LIST*\n\n`;
            let count = 1;
            
            for (const [trigger, response] of Object.entries(autoReplies)) {
                text += `${count}. *${trigger}*\n`;
                text += `   ➤ ${response}\n\n`;
                count++;
            }

            return reply(text);
        }

        return reply("❌ Invalid option!\n\nUse: .autoreply on/off/list");

    } catch (e) {
        console.error("Autoreply command error:", e);
        reply("❌ Error: " + e.message);
    }
});

console.log("✅ Auto-Reply Plugin Loaded");
