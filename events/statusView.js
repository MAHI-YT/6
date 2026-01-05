const config = require('../config');

// Store viewed status to avoid duplicate views
const viewedStatus = new Set();

async function handleStatusView(conn, mek) {
    try {
        // Check if it's a status message
        if (mek.key && mek.key.remoteJid === 'status@broadcast') {
            
            // Auto Status View/Seen
            if (config.AUTO_STATUS_SEEN === "true") {
                const statusKey = `${mek.key.id}_${mek.key.participant}`;
                
                if (!viewedStatus.has(statusKey)) {
                    await conn.readMessages([mek.key]);
                    viewedStatus.add(statusKey);
                    
                    // Clear old entries after 1 hour to prevent memory issues
                    setTimeout(() => viewedStatus.delete(statusKey), 3600000);
                    
                    console.log(`[👁️] Viewed status from: ${mek.key.participant?.split('@')[0]}`);
                }
            }
            
            // Auto Status Reply
            if (config.AUTO_STATUS_REPLY === "true") {
                const user = mek.key.participant;
                const replyMsg = config.AUTO_STATUS_MSG || "Nice Status! 🔥";
                
                // Add small delay to seem more natural
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                await conn.sendMessage(user, { 
                    text: replyMsg,
                    react: { text: '💜', key: mek.key }
                }, { quoted: mek });
                
                console.log(`[💬] Replied to status from: ${user?.split('@')[0]}`);
            }
        }
    } catch (error) {
        console.error('[❌] Status View Error:', error.message);
    }
}

// Auto react to newsletter/channel posts
async function handleNewsletterReact(conn, mek) {
    try {
        const newsletterJids = [
            "120363416743041101@newsletter",
            // Add more newsletter JIDs here
        ];
        
        const emojis = ["🎉", "👍", "🔥", "💀", "❤️", "🎀", "🪄", "🎐", "🧸", "💸", "❄️", "💥", "🌸", "🦢"];

        if (mek.key && newsletterJids.includes(mek.key.remoteJid)) {
            const serverId = mek.newsletterServerId;
            if (serverId) {
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                await conn.newsletterReactMessage(mek.key.remoteJid, serverId.toString(), emoji);
                console.log(`[🔔] Reacted to newsletter with: ${emoji}`);
            }
        }
    } catch (error) {
        // Silently fail for newsletter reactions
    }
}

module.exports = { handleStatusView, handleNewsletterReact };
