
const config = require('../config');
const fs = require('fs');
const path = require('path');

// ==================== CONNECTION MESSAGE ====================
// ============ CONNECTION MESSAGE ============
            try {
                // Get bot's own JID properly
                const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
                
                const botName = config.BOT_NAME || 'DARKZONE-MD';
                const ownerName = config.OWNER_NAME || 'Owner';

                const connectMessage = `╭━━━━━━━━━━━━━━━━━━━╮
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

                // Small delay to ensure connection is stable
                await new Promise(resolve => setTimeout(resolve, 2000));

                await conn.sendMessage(botJid, { 
                    image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/jecbfo.jpg' }, 
                    caption: connectMessage,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterName: botName,
                            newsletterJid: "120363416743041101@newsletter",
                        }
                    }
                });
                
                console.log('[🔰] Connect message sent to: ' + botJid);
            } catch (error) {
                console.error('[❌] Error sending connect message:', error.message);
            }
        }

        if (qr) {
            console.log('[🔰] Scan the QR code to connect or use session ID');
        }
    });

    conn.ev.on('creds.update', saveCreds);

// ==================== STATUS VIEW/SEEN ====================
async function handleStatusView(conn, mek) {
    try {
        if (mek.key && mek.key.remoteJid === 'status@broadcast') {
            if (config.AUTO_STATUS_SEEN === "true") {
                await conn.readMessages([mek.key]);
                console.log(`[👁️] Viewed status from: ${mek.key.participant?.split('@')[0]}`);
            }
        }
    } catch (e) {
        console.error('[❌] Status view error:', e.message);
    }
}

// ==================== STATUS REACT ====================
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

// ==================== STATUS REPLY ====================
async function handleStatusReply(conn, mek) {
    try {
        if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_REPLY === "true") {
            const user = mek.key.participant;
            const text = config.AUTO_STATUS_MSG || "Nice Status! 🔥";
            
            await conn.sendMessage(user, { 
                text: text, 
                react: { text: '💜', key: mek.key } 
            }, { quoted: mek });
            
            console.log(`[💬] Replied to status from: ${user?.split('@')[0]}`);
        }
    } catch (e) {
        console.error('[❌] Status reply error:', e.message);
    }
}

// ==================== CHANNEL/NEWSLETTER REACT ====================


// ==================== OWNER REACT (SPECIFIC NUMBER) ====================

// ==================== AUTO REACT ====================
function handleAutoReact(m, isReact) {
    try {
        if (!isReact && config.AUTO_REACT === 'true') {
            const reactions = [
                '🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '🧊', '🐳', '💥', '🥀', '❤‍🔥', '🥹', '😩', '🫣', 
                '🤭', '👻', '👾', '🫶', '😻', '🙌', '🫂', '🫀', '👩‍🦰', '🧑‍🦰', '👩‍⚕️', '🧑‍⚕️', '🧕', 
                '👩‍🏫', '👨‍💻', '👰‍♀', '🦹🏻‍♀️', '🧟‍♀️', '🧟', '🧞‍♀️', '🧞', '🙅‍♀️', '💁‍♂️', '💁‍♀️', '🙆‍♀️', 
                '🙋‍♀️', '🤷', '🤷‍♀️', '🤦', '🤦‍♀️', '💇‍♀️', '💇', '💃', '🚶‍♀️', '🚶', '🧶', '🧤', '👑', 
                '💍', '👝', '💼', '🎒', '🥽', '🐻', '🐼', '🐭', '🐣', '🪿', '🦆', '🦊', '🦋', '🦄', 
                '🪼', '🐋', '🐳', '🦈', '🐍', '🕊️', '🦦', '🦚', '🌱', '🍃', '🎍', '🌿', '☘️', '🍀', 
                '🍁', '🪺', '🍄', '🍄‍🟫', '🪸', '🪨', '🌺', '🪷', '🪻', '🥀', '🌹', '🌷', '💐', '🌾', 
                '🌸', '🌼', '🌻', '🌝', '🌚', '🌕', '🌎', '💫', '🔥', '☃️', '❄️', '🌨️', '🫧', '🍟', 
                '🍫', '🧃', '🧊', '🪀', '🤿', '🏆', '🥇', '🥈', '🥉', '🎗️', '🤹', '🤹‍♀️', '🎧', '🎤', 
                '🥁', '🧩', '🎯', '🚀', '🚁', '🗿', '🎙️', '⌛', '⏳', '💸', '💎', '⚙️', '⛓️', '🔪', 
                '🧸', '🎀', '🪄', '🎈', '🎁', '🎉', '🏮', '🪩', '📩', '💌', '📤', '📦', '📊', '📈', 
                '📑', '📉', '📂', '🔖', '🧷', '📌', '📝', '🔏', '🔐', '🩷', '❤️', '🧡', '💛', '💚', 
                '🩵', '💙', '💜', '🖤', '🩶', '🤍', '🤎', '❤‍🔥', '❤‍🩹', '💗', '💖', '💘', '💝', '❌', 
                '✅', '🔰', '〽️', '🌐', '🌀', '⤴️', '⤵️', '🔴', '🟢', '🟡', '🟠', '🔵', '🟣', '⚫', 
                '⚪', '🟤', '🔇', '🔊', '📢', '🔕', '♥️', '🕐', '🚩', '🇵🇰'
            ];
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            m.react(randomReaction);
        }
    } catch (e) {}
}

// ==================== OWNER REACT (BOT OWNER) ====================
function handleBotOwnerReact(m, isReact, senderNumber, botNumber) {
    try {
        if (!isReact && senderNumber === botNumber && config.OWNER_REACT === 'true') {
            const reactions = [
                '🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '🧊', '🐳', '💥', '🥀', '❤‍🔥', '🥹', '😩', '🫣', 
                '🤭', '👻', '👾', '🫶', '😻', '🙌', '🫂', '🫀', '💸', '😇', '🍂', '💥', '💯', '🔥', 
                '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🙆', '🚩', '🥰', '💐', '😎', '🤎', '✅', 
                '🫀', '🧡', '😁', '😄', '🌸', '🕊️', '🌷', '⛅', '🌟', '🗿', '🇵🇰', '💜', '💙', '🌝', 
                '🖤', '🎎', '🎏', '🎐', '⚽', '🧣', '🌿', '⛈️', '🌦️', '🌚', '🌝', '🙈', '🙉', '🦖', 
                '🐤', '🎗️', '🥇', '👾', '🔫', '🐝', '🦋', '🍓', '🍫', '🍭', '🧁', '🧃', '🍿', '🍻', 
                '🛬', '🫀', '🫠', '🐍', '🥀', '🌸', '🏵️', '🌻', '🍂', '🍁', '🍄', '🌾', '🌿', '🌱', 
                '🍀', '🧋', '💒', '🏩', '🏗️', '🏰', '🏪', '🏟️'
            ];
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            m.react(randomReaction);
        }
    } catch (e) {}
}

// ==================== CUSTOM REACT ====================
function handleCustomReact(m, isReact) {
    try {
        if (!isReact && config.CUSTOM_REACT === 'true') {
            const reactions = (config.CUSTOM_REACT_EMOJIS || '🥲,😂,👍🏻,🙂,😔').split(',');
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            m.react(randomReaction);
        }
    } catch (e) {}
}

// ==================== WELCOME MESSAGE ===================

// ==================== GOODBYE MESSAGE ====================


// ==================== ADMIN EVENTS ====================


// ==================== ANTI CALL ====================


// Export all functions
module.exports = {
    sendConnectionMessage,
    handleStatusView,
    handleStatusReact,
    handleStatusReply,
    handleChannelReact,
    handleOwnerNumberReact,
    handleAutoReact,
    handleBotOwnerReact,
    handleCustomReact,
    handleWelcome,
    handleGoodbye,
    handleAdminEvent,
    handleAntiCall
};
