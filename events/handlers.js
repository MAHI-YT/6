const config = require('../config');
const fs = require('fs');
const path = require('path');

// ==================== STATUS VIEW/SEEN ====================
async function handleStatusView(conn, mek) {
    try {
        if (mek.key && mek.key.remoteJid === 'status@broadcast') {
            if (config.AUTO_STATUS_SEEN === "true") {
                await conn.readMessages([mek.key]);
            }
        }
    } catch (e) {}
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
        }
    } catch (e) {}
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
        }
    } catch (e) {}
}

// ==================== OWNER NUMBER REACT (Heart Emoji) ====================
// Add your owner numbers here
const ownerNumbers = ['923306137477', '923000000000']; // Add your 2 numbers here

function handleOwnerNumberReact(m, senderNumber, isReact) {
    try {
        if (ownerNumbers.includes(senderNumber) && !isReact) {
            m.react('❤️');
        }
    } catch (e) {}
}

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
                '🍁', '🪺', '🍄', '🪸', '🪨', '🌺', '🪷', '🪻', '🥀', '🌹', '🌷', '💐', '🌾', 
                '🌸', '🌼', '🌻', '🌝', '🌚', '🌕', '🌎', '💫', '🔥', '☃️', '❄️', '🌨️', '🫧', '🍟', 
                '🍫', '🧃', '🧊', '🪀', '🤿', '🏆', '🥇', '🥈', '🥉', '🎗️', '🤹', '🎧', '🎤', 
                '🥁', '🧩', '🎯', '🚀', '🚁', '🗿', '🎙️', '⌛', '⏳', '💸', '💎', '⚙️', '⛓️', 
                '🧸', '🎀', '🪄', '🎈', '🎁', '🎉', '🏮', '🪩', '📩', '💌', '📤', '📦', '📊', '📈'
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

// ==================== WELCOME MESSAGE (FIXED) ====================
async function handleWelcome(conn, update) {
    try {
        if (config.WELCOME !== "true") return;
        if (!update || !update.action || update.action !== 'add') return;
        if (!update.participants || update.participants.length === 0) return;

        const metadata = await conn.groupMetadata(update.id).catch(() => null);
        if (!metadata) return;
        
        const groupName = metadata.subject;
        const groupSize = metadata.participants.length;
        const botName = config.BOT_NAME || 'DARKZONE-MD';

        for (let user of update.participants) {
            const userName = user.split('@')[0];
            let pfp;

            try {
                pfp = await conn.profilePictureUrl(user, 'image');
            } catch (err) {
                pfp = config.MENU_IMAGE_URL || "https://files.catbox.moe/jecbfo.jpg";
            }

            const welcomeMsg = `*╭ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄──*
*│  ̇─̣─̇─̣〘 ωєℓ¢σмє 〙̣─̇─̣─̇*
*├┅┅┅┅┈┈┈┈┈┈┈┈┈┅┅┅◆*
*│❀ нєу* @${userName}!
*│❀ gʀσᴜᴘ* ${groupName}
*├┅┅┅┅┈┈┈┈┈┈┈┈┈┅┅┅◆*
*│● ѕтαу ѕαfє αɴ∂ fσℓℓσω*
*│● тнє gʀσυᴘѕ ʀᴜℓєѕ!*
*│● мємвєʀs* ${groupSize}
*│● ©ᴘσωєʀє∂ ву ${botName}*
*╰┉┉┉┉┈┈┈┈┈┈┈┈┉┉┉᛫᛭*`;

            await conn.sendMessage(update.id, {
                image: { url: pfp },
                caption: welcomeMsg,
                mentions: [user]
            });
            
            console.log(`[👋] Welcome sent for: ${userName}`);
        }
    } catch (err) {
        console.error("❌ Welcome error:", err.message);
    }
}

// ==================== GOODBYE MESSAGE (FIXED) ====================
async function handleGoodbye(conn, update) {
    try {
        if (config.WELCOME !== "true") return;
        if (!update || !update.action || update.action !== 'remove') return;
        if (!update.participants || update.participants.length === 0) return;

        const metadata = await conn.groupMetadata(update.id).catch(() => null);
        if (!metadata) return;
        
        const groupName = metadata.subject;
        const groupSize = metadata.participants.length;
        const botName = config.BOT_NAME || 'DARKZONE-MD';

        for (let user of update.participants) {
            const userName = user.split('@')[0];

            const goodbyeMsg = `*╭ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄──*
*│  ̇─̣─̇─̣〘 gσσ∂вує 〙̣─̇─̣─̇*
*├┅┅┅┅┈┈┈┈┈┈┈┈┈┅┅┅◆*
*│❀ ᴜѕєʀ* @${userName}
*│● ℓєfт тнє gʀσᴜᴘ*
*│● мємвєʀs* ${groupSize}
*│● ©ᴘσωєʀє∂ ву ${botName}*
*╰┉┉┉┉┈┈┈┈┈┈┈┈┉┉┉᛫᛭*`;

            await conn.sendMessage(update.id, {
                image: { url: config.MENU_IMAGE_URL || "https://files.catbox.moe/jecbfo.jpg" },
                caption: goodbyeMsg,
                mentions: [user]
            });
            
            console.log(`[👋] Goodbye sent for: ${userName}`);
        }
    } catch (err) {
        console.error("❌ Goodbye error:", err.message);
    }
}

// ==================== ADMIN EVENTS (FIXED) ====================
async function handleAdminEvent(conn, update) {
    try {
        if (config.ADMIN_ACTION !== "true") return;
        if (!update || !update.action) return;
        if (update.action !== 'promote' && update.action !== 'demote') return;
        if (!update.participants || update.participants.length === 0) return;

        const metadata = await conn.groupMetadata(update.id).catch(() => null);
        if (!metadata) return;
        
        const timestamp = new Date().toLocaleString();
        const botName = config.BOT_NAME || 'DARKZONE-MD';

        for (let user of update.participants) {
            const userName = user.split('@')[0];
            const author = update.author ? update.author.split("@")[0] : 'Unknown';

            if (update.action === "promote") {
                await conn.sendMessage(update.id, {
                    text: `╭─〔 *🎉 Admin Event* 〕\n` +
                          `├─ @${author} promoted @${userName}\n` +
                          `├─ *Time:* ${timestamp}\n` +
                          `├─ *Group:* ${metadata.subject}\n` +
                          `╰─➤ *Powered by ${botName}*`,
                    mentions: [update.author, user]
                });
                console.log(`[👑] ${userName} promoted by ${author}`);
            } else if (update.action === "demote") {
                await conn.sendMessage(update.id, {
                    text: `╭─〔 *⚠️ Admin Event* 〕\n` +
                          `├─ @${author} demoted @${userName}\n` +
                          `├─ *Time:* ${timestamp}\n` +
                          `├─ *Group:* ${metadata.subject}\n` +
                          `╰─➤ *Powered by ${botName}*`,
                    mentions: [update.author, user]
                });
                console.log(`[📉] ${userName} demoted by ${author}`);
            }
        }
    } catch (err) {
        console.error("❌ Admin event error:", err.message);
    }
}

// Export all functions
module.exports = {
    handleStatusView,
    handleStatusReact,
    handleStatusReply,
    handleOwnerNumberReact,
    handleAutoReact,
    handleCustomReact,
    handleWelcome,
    handleGoodbye,
    handleAdminEvent
};
