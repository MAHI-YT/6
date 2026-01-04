

const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');

cmd({
    pattern: "alive",
    alias: ["bot", "status", "ping", "test"],
    react: "💚",
    desc: "Check if bot is alive with video note and live ping",
    category: "main",
    use: ".alive",
    filename: __filename
},
async (conn, mek, m, { from, sender, reply }) => {
    try {
        // Calculate initial ping
        const startTime = Date.now();
        
        // Video Note URL (Round Video) - You can change this URL
        const videoNoteUrl = "https://files.catbox.moe/t9dj8o.mp4"; // Sample round video
        
        // Alternative video URLs (choose one):
        // const videoNoteUrl = "https://i.imgur.com/your-video.mp4";
        // const videoNoteUrl = "https://files.catbox.moe/your-video.mp4";

        // Download video for video note
        let videoBuffer;
        try {
            const videoResponse = await axios({
                method: 'GET',
                url: videoNoteUrl,
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            videoBuffer = Buffer.from(videoResponse.data);
        } catch (videoErr) {
            console.log("[Alive] Video download failed, sending text only");
            videoBuffer = null;
        }

        // Calculate ping after video download
        const ping = Date.now() - startTime;

        // Get system info
        const runtime = process.uptime();
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = Math.floor(runtime % 60);
        const uptimeString = `${hours}h ${minutes}m ${seconds}s`;

        const usedMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const cpuModel = os.cpus()[0]?.model || 'Unknown';
        const platform = os.platform();
        const nodeVersion = process.version;

        // Bot name from config
        const botName = config.BOT_NAME || "DARKZONE-MD";
        const ownerName = config.OWNER_NAME || "DEVELOPER";

        // Send Video Note (Round/Circular Video) if available
        if (videoBuffer && videoBuffer.length > 0) {
            try {
                await conn.sendMessage(from, {
                    video: videoBuffer,
                    ptv: true,  // This makes it a Video Note (Round/Circular)
                    gifPlayback: false
                }, { quoted: mek });
                
                console.log("[Alive] Video note sent successfully");
            } catch (videoSendErr) {
                console.log("[Alive] Video note send failed:", videoSendErr.message);
            }
        }

        // Create alive message
        const aliveMessage = `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃  💚 *${botName} IS ALIVE* 💚
╰━━━━━━━━━━━━━━━━━━━━━╯

╭──────────────────────
│ ⚡ *RESPONSE SPEED*
├──────────────────────
│ 📶 Ping: *${ping}ms*
│ 🚀 Status: *Online*
╰──────────────────────

╭──────────────────────
│ 🤖 *BOT INFO*
├──────────────────────
│ 📛 Name: *${botName}*
│ 👑 Owner: *${ownerName}*
│ ⏱️ Uptime: *${uptimeString}*
│ 📅 Date: *${new Date().toLocaleDateString()}*
│ 🕐 Time: *${new Date().toLocaleTimeString()}*
╰──────────────────────

╭──────────────────────
│ 💻 *SYSTEM INFO*
├──────────────────────
│ 🧠 RAM Used: *${usedMemory} MB*
│ 💾 Total RAM: *${totalMemory} GB*
│ 📀 Free RAM: *${freeMemory} GB*
│ 🖥️ Platform: *${platform}*
│ 📦 Node: *${nodeVersion}*
╰──────────────────────

╭──────────────────────
│ ⌨️ *Type .menu for commands*
╰──────────────────────

> 🌟 *${botName}* - Always Online!
`;

        // Send initial alive message
        const sentMessage = await conn.sendMessage(from, {
            text: aliveMessage
        }, { quoted: mek });

        // ========== AUTO-EDIT PING FEATURE ==========
        // Edit message every 5 seconds for 1 minute showing updated ping

        let editCount = 0;
        const maxEdits = 12; // 12 edits x 5 seconds = 60 seconds (1 minute)

        const pingInterval = setInterval(async () => {
            try {
                editCount++;
                
                if (editCount >= maxEdits) {
                    clearInterval(pingInterval);
                    
                    // Final message after 1 minute
                    const finalPing = Date.now() - startTime;
                    const finalMessage = `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃  💚 *${botName} IS ALIVE* 💚
╰━━━━━━━━━━━━━━━━━━━━━╯

╭──────────────────────
│ ⚡ *FINAL PING RESULT*
├──────────────────────
│ 📶 Ping: *${finalPing}ms*
│ 🚀 Status: *Online*
│ ✅ Speed Test: *Complete*
╰──────────────────────

╭──────────────────────
│ 🤖 *BOT INFO*
├──────────────────────
│ 📛 Name: *${botName}*
│ 👑 Owner: *${ownerName}*
│ ⏱️ Uptime: *${uptimeString}*
╰──────────────────────

> 🌟 *${botName}* - Speed Test Complete!
> ⌨️ Type .menu for commands
`;
                    
                    await conn.sendMessage(from, {
                        text: finalMessage,
                        edit: sentMessage.key
                    });
                    
                    return;
                }

                // Calculate real-time ping
                const pingStart = Date.now();
                await conn.sendPresenceUpdate('composing', from);
                const currentPing = Date.now() - pingStart;

                // Get updated uptime
                const newRuntime = process.uptime();
                const newHours = Math.floor(newRuntime / 3600);
                const newMinutes = Math.floor((newRuntime % 3600) / 60);
                const newSeconds = Math.floor(newRuntime % 60);
                const newUptimeString = `${newHours}h ${newMinutes}m ${newSeconds}s`;

                // Progress bar for remaining time
                const progress = Math.floor((editCount / maxEdits) * 10);
                const progressBar = '█'.repeat(progress) + '░'.repeat(10 - progress);
                const remainingTime = (maxEdits - editCount) * 5;

                const editedMessage = `
╭━━━━━━━━━━━━━━━━━━━━━╮
┃  💚 *${botName} IS ALIVE* 💚
╰━━━━━━━━━━━━━━━━━━━━━╯

╭──────────────────────
│ ⚡ *LIVE PING TEST*
├──────────────────────
│ 📶 Current Ping: *${currentPing}ms*
│ 🚀 Status: *Online*
│ 🔄 Update: *#${editCount}/${maxEdits}*
╰──────────────────────

╭──────────────────────
│ ⏳ *SPEED TEST PROGRESS*
├──────────────────────
│ [${progressBar}] ${Math.floor((editCount / maxEdits) * 100)}%
│ ⏱️ Remaining: *${remainingTime}s*
╰──────────────────────

╭──────────────────────
│ 🤖 *BOT INFO*
├──────────────────────
│ 📛 Name: *${botName}*
│ 👑 Owner: *${ownerName}*
│ ⏱️ Uptime: *${newUptimeString}*
│ 🕐 Time: *${new Date().toLocaleTimeString()}*
╰──────────────────────

> 🔄 *Auto-updating every 5 seconds...*
`;

                await conn.sendMessage(from, {
                    text: editedMessage,
                    edit: sentMessage.key
                });

            } catch (editErr) {
                console.log("[Alive] Edit error:", editErr.message);
                clearInterval(pingInterval);
            }
        }, 5000); // Edit every 5 seconds

    } catch (e) {
        console.error("[Alive] Error:", e);
        reply("❌ An error occurred. Please try again.\n\n_DARKZONE-MD_");
    }
});

// ========== SIMPLE PING COMMAND ==========

cmd({
    pattern: "speed",
    alias: ["speedtest", "pings"],
    react: "⚡",
    desc: "Quick speed test with auto-updating ping",
    category: "main",
    use: ".speed",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const start = Date.now();
        
        const initialMsg = await conn.sendMessage(from, {
            text: `⚡ *Speed Test Starting...*\n\n🔄 Calculating ping...`
        }, { quoted: mek });

        const ping = Date.now() - start;

        // Auto-edit for 30 seconds
        let count = 0;
        const maxCount = 6; // 6 x 5s = 30 seconds

        const interval = setInterval(async () => {
            try {
                count++;
                
                if (count >= maxCount) {
                    clearInterval(interval);
                    
                    const finalPing = Date.now() - start;
                    await conn.sendMessage(from, {
                        text: `⚡ *Speed Test Complete!*\n\n📶 *Final Ping:* ${finalPing}ms\n🚀 *Status:* Excellent\n✅ *Tests:* ${count} completed\n\n> *DARKZONE-MD*`,
                        edit: initialMsg.key
                    });
                    return;
                }

                const currentPing = Date.now() - start;
                const bar = '█'.repeat(count) + '░'.repeat(maxCount - count);

                await conn.sendMessage(from, {
                    text: `⚡ *Speed Test Running...*\n\n📶 *Current Ping:* ${currentPing}ms\n🔄 *Test:* ${count}/${maxCount}\n\n[${bar}] ${Math.floor((count / maxCount) * 100)}%\n\n> *DARKZONE-MD*`,
                    edit: initialMsg.key
                });

            } catch (e) {
                clearInterval(interval);
            }
        }, 5000);

    } catch (e) {
        console.error("[Speed] Error:", e);
        reply("❌ Error occurred.");
    }
});
