const config = require('../config');

// ==================== STATUS REACT ONLY ====================
async function handleStatusReact(conn, mek) {
    try {
        if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REACT === "true") {
            const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
            const emojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '🇵🇰', '💜', '💙', '🌝', '💚'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            
            await conn.sendMessage(mek.key.remoteJid, {
                react: {
                    text: randomEmoji,
                    key: mek.key,
                }
            }, { statusJidList: [mek.key.participant, botJid] });
            
            console.log(`[⭐] Reacted to status with: ${randomEmoji}`);
        }
    } catch (e) {
        console.error('[❌] Status react error:', e.message);
    }
}

module.exports = { handleStatusReact };
