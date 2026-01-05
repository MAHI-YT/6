const config = require('../config');
const path = require('path');
const fs = require('fs');

async function handleConnection(conn, update) {
    const { connection, lastDisconnect, qr } = update;
    const { DisconnectReason } = require(config.BAILEYS);
    
    if (connection === 'close') {
        if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
            console.log('[🔰] Connection lost, reconnecting...');
            return 'reconnect';
        } else {
            console.log('[🔰] Connection closed, please change session ID');
            return 'logout';
        }
    } else if (connection === 'open') {
        console.log('[🔰] Bot connected to WhatsApp ✅');
        
        // Load all plugins
        const pluginPath = path.join(__dirname, '..', 'plugins');
        let pluginCount = 0;
        
        fs.readdirSync(pluginPath).forEach((plugin) => {
            if (path.extname(plugin).toLowerCase() === ".js") {
                require(path.join(pluginPath, plugin));
                pluginCount++;
            }
        });
        console.log(`[🔰] ${pluginCount} Plugins installed successfully ✅`);

        // Send connection message after plugins loaded
        await sendConnectMessage(conn, pluginCount);
        return 'connected';
    }
    
    if (qr) {
        console.log('[🔰] Scan the QR code to connect or use session ID');
    }
    
    return null;
}

async function sendConnectMessage(conn, pluginCount) {
    try {
        const prefix = config.PREFIX;
        const botName = config.BOT_NAME || 'DARKZONE-MD';
        const ownerName = config.OWNER_NAME || 'Owner';
        const runtime = process.uptime();
        const hours = Math.floor(runtime / 3600);
        const minutes = Math.floor((runtime % 3600) / 60);
        const seconds = Math.floor(runtime % 60);
        
        const upMessage = `╭━━━━━━━━━━━━━━━━━━━╮
┃  🤖 *${botName} STARTED*
┃━━━━━━━━━━━━━━━━━━━━
┃ ✅ *Status:* _Online & Ready_
┃ 📡 *Connection:* _Successful_
┃ 🔌 *Plugins:* _${pluginCount} Loaded_
╰━━━━━━━━━━━━━━━━━━━╯

╭━━〔 ⚙️ *Bot Info* 〕━━━╮
┃ ▸ *Prefix:* ${prefix}
┃ ▸ *Bot:* ${botName}
┃ ▸ *Owner:* ${ownerName}
┃ ▸ *Mode:* ${config.MODE || 'public'}
╰━━━━━━━━━━━━━━━━━━━╯

🎉 *All systems operational!*
⏰ *Started at:* ${new Date().toLocaleString()}

⭐ *Channel:* https://whatsapp.com/channel/0029Vb5dDVO59PwTnL86j13J
⭐ *GitHub:* https://github.com/ERFAN-Md/DARKZONE-MD/fork`;

        await conn.sendMessage(conn.user.id, { 
            image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/jecbfo.jpg' }, 
            caption: upMessage,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterName: botName,
                    newsletterJid: "120363416743041101@newsletter",
                }
            }
        });
        
        console.log('[🔰] Connect message sent successfully ✅');
        
    } catch (error) {
        console.error('[❌] Error sending connect message:', error.message);
    }
}

module.exports = { handleConnection, sendConnectMessage };
