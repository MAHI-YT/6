// ═══════════════════════════════════════════════════════════
// 🎨 AUTO-STICKER PLUGIN - DARKZONE-MD
// Automatically sends stickers for specific messages
// ═══════════════════════════════════════════════════════════

const { cmd } = require('../command');
const config = require('../config');
const fs = require('fs');
const path = require('path');

// Paths
const autoStickerPath = path.join(__dirname, '../assets/autosticker.json');
const stickerDir = path.join(__dirname, '../assets/stickers');

// Ensure sticker directory exists
if (!fs.existsSync(stickerDir)) {
    fs.mkdirSync(stickerDir, { recursive: true });
}

function loadAutoStickers() {
    try {
        if (!fs.existsSync(autoStickerPath)) {
            return {};
        }
        return JSON.parse(fs.readFileSync(autoStickerPath, 'utf8'));
    } catch (error) {
        console.error('Error loading auto-stickers:', error);
        return {};
    }
}

// ═══════════════════════════════════════════════════════════
// 🔄 AUTO-STICKER DETECTOR (Runs on every message)
// ═══════════════════════════════════════════════════════════

cmd({
    on: "body"
}, async (conn, m, store, {
    from,
    body,
    sender
}) => {
    try {
        // Check if auto-sticker is enabled
        if (config.AUTO_STICKER !== 'true') return;
        
        if (!body) return;

        // Load sticker mappings
        const autoStickers = loadAutoStickers();
        
        if (Object.keys(autoStickers).length === 0) return;

        // Normalize input
        const normalizedBody = body.trim().toLowerCase();

        // Check for match
        for (const [trigger, stickerFile] of Object.entries(autoStickers)) {
            const normalizedTrigger = trigger.toLowerCase();
            
            // Exact match or contains
            if (normalizedBody === normalizedTrigger || normalizedBody.includes(normalizedTrigger)) {
                const stickerPath = path.join(stickerDir, stickerFile);
                
                // Check if sticker file exists
                if (!fs.existsSync(stickerPath)) {
                    console.log(`Sticker not found: ${stickerFile}`);
                    continue;
                }

                try {
                    // Read sticker file
                    const stickerBuffer = fs.readFileSync(stickerPath);
                    
                    // Send sticker
                    await conn.sendMessage(from, {
                        sticker: stickerBuffer
                    }, { quoted: m });
                    
                    return; // Only send one sticker per message
                    
                } catch (stickerError) {
                    console.error(`Error sending sticker ${stickerFile}:`, stickerError);
                }
            }
        }

    } catch (error) {
        console.error("Auto-sticker error:", error);
    }
});

// ═══════════════════════════════════════════════════════════
// ⚙️ AUTO-STICKER SETTINGS COMMAND
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "autosticker",
    alias: ["as", "autostickermode"],
    desc: "Toggle auto-sticker on/off",
    category: "settings",
    react: "🎨",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, isCreator }) => {
    try {
        if (!isCreator) {
            return reply("❌ Only owner can change auto-sticker settings!");
        }

        const option = q ? q.toLowerCase().trim() : '';

        if (!option) {
            const status = config.AUTO_STICKER === 'true' ? "ON ✅" : "OFF ❌";
            const autoStickers = loadAutoStickers();
            const count = Object.keys(autoStickers).length;

            return reply(`🎨 *AUTO-STICKER STATUS*

📊 *Current:* ${status}
📝 *Total Triggers:* ${count}

⌨️ *Commands:*
• .autosticker on - Turn ON
• .autosticker off - Turn OFF
• .autosticker list - Show all triggers`);
        }

        if (option === 'on' || option === 'enable') {
            const { saveConfig } = require('../lib/functions2');
            saveConfig('AUTO_STICKER', 'true');
            config.AUTO_STICKER = 'true';
            
            return reply("✅ *Auto-Sticker Enabled!*\n\nBot will now send stickers for trigger messages.");
        }

        if (option === 'off' || option === 'disable') {
            const { saveConfig } = require('../lib/functions2');
            saveConfig('AUTO_STICKER', 'false');
            config.AUTO_STICKER = 'false';
            
            return reply("❌ *Auto-Sticker Disabled!*\n\nBot will not send stickers automatically.");
        }

        if (option === 'list' || option === 'show') {
            const autoStickers = loadAutoStickers();
            
            if (Object.keys(autoStickers).length === 0) {
                return reply("❌ No auto-sticker triggers found!");
            }

            let text = `📋 *AUTO-STICKER LIST*\n\n`;
            let count = 1;
            
            for (const [trigger, stickerFile] of Object.entries(autoStickers)) {
                const stickerPath = path.join(stickerDir, stickerFile);
                const exists = fs.existsSync(stickerPath) ? "✅" : "❌";
                
                text += `${count}. *${trigger}*\n`;
                text += `   ➤ ${stickerFile} ${exists}\n\n`;
                count++;
            }

            text += `\n📁 Place sticker files in:\n\`assets/stickers/\``;

            return reply(text);
        }

        return reply("❌ Invalid option!\n\nUse: .autosticker on/off/list");

    } catch (e) {
        console.error("Autosticker command error:", e);
        reply("❌ Error: " + e.message);
    }
});

console.log("✅ Auto-Sticker Plugin Loaded");
