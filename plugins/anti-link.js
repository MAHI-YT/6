const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

// Database file
const dbPath = path.join(__dirname, '../database/statusreact.json');

// Load settings
function getSettings() {
    try {
        if (!fs.existsSync(path.dirname(dbPath))) {
            fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        }
        if (!fs.existsSync(dbPath)) {
            fs.writeFileSync(dbPath, JSON.stringify({ enabled: false }));
        }
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        return { enabled: false };
    }
}

// Save settings
function saveSettings(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Random heart emoji
function getRandomHeart() {
    const hearts = ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '💝', '💗', '💓', '💕'];
    return hearts[Math.floor(Math.random() * hearts.length)];
}

// ═══════════════════════════════════════════════════════════
// 📋 SIMPLE ON/OFF COMMAND
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "autoreact",
    alias: ["statusreact", "sreact"],
    desc: "Auto react to status",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, args, q, reply }) => {
    try {
        const option = q?.toLowerCase()?.trim();

        if (option === 'on') {
            saveSettings({ enabled: true });
            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });
            return await conn.sendMessage(from, { 
                text: "✅ Auto Status React *ON*\n\n💖 Bot will now react to all status updates!" 
            }, { quoted: mek });
        }

        if (option === 'off') {
            saveSettings({ enabled: false });
            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });
            return await conn.sendMessage(from, { 
                text: "🔴 Auto Status React *OFF*" 
            }, { quoted: mek });
        }

        // Show current status
        const settings = getSettings();
        const status = settings.enabled ? "🟢 ON" : "🔴 OFF";
        
        return await conn.sendMessage(from, { 
            text: `*Auto Status React:* ${status}\n\n*.autoreact on* - Enable\n*.autoreact off* - Disable` 
        }, { quoted: mek });

    } catch (e) {
        console.error("Error:", e);
        reply("❌ Error: " + e.message);
    }
});

// ═══════════════════════════════════════════════════════════
// 👁️ STATUS DETECTOR - AUTO VIEW & REACT
// ═══════════════════════════════════════════════════════════

cmd({
    on: "body"
}, async (conn, m, store, { from, sender }) => {
    try {
        // Only for status
        if (from !== 'status@broadcast') return;

        // Check if enabled
        const settings = getSettings();
        if (!settings.enabled) return;

        // Get random heart emoji
        const emoji = getRandomHeart();

        // React to status
        await conn.sendMessage('status@broadcast', {
            react: {
                text: emoji,
                key: m.key
            }
        });

        console.log(`💖 Reacted to status with ${emoji}`);

    } catch (error) {
        console.error("Status react error:", error);
    }
});
