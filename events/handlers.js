const config = require('../config');

// ==================== STATUS VIEW/SEEN ====================
async function handleStatusView(conn, mek) {
    try {
        if (mek.key && mek.key.remoteJid === 'status@broadcast' && config.AUTO_STATUS_SEEN === "true") {
            conn.readMessages([mek.key]).catch(() => {});
        }
    } catch (e) {}
}

// ==================== STATUS REACT (SAFE) ====================
async function handleStatusReact(conn, mek) {
    try {
        if (!mek.key || mek.key.remoteJid !== 'status@broadcast') return;
        if (config.AUTO_STATUS_REACT !== "true") return;
        
        const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
        const emojis = ['❤️', '💸', '😇', '🍂', '💥', '💯', '🔥', '💫', '💎', '💗', '🤍', '🖤', '👀', '🙌', '🚩', '🥰', '💐', '😎', '✅', '🧡', '😁', '🌸', '🕊️', '🌷', '🌟', '💜', '💙', '💚'];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        conn.sendMessage(mek.key.remoteJid, {
            react: { text: randomEmoji, key: mek.key }
        }, { statusJidList: [mek.key.participant, botJid] }).catch(() => {});
    } catch (e) {}
}

// ==================== STATUS REPLY ====================
async function handleStatusReply(conn, mek) {
    try {
        if (!mek.key || mek.key.remoteJid !== 'status@broadcast') return;
        if (config.AUTO_STATUS_REPLY !== "true") return;
        
        const user = mek.key.participant;
        const text = config.AUTO_STATUS_MSG || "Nice Status! 🔥";
        
        conn.sendMessage(user, { text: text }, { quoted: mek }).catch(() => {});
    } catch (e) {}
}

// ==================== OWNER NUMBER REACT (Heart ❤️) ====================
// ADD YOUR TWO NUMBERS HERE
const ownerReactNumbers = ['923306137477', '923000000000'];

function handleOwnerNumberReact(conn, mek, senderNumber, isReact) {
    try {
        if (isReact) return;
        if (!ownerReactNumbers.includes(senderNumber)) return;
        
        conn.sendMessage(mek.key.remoteJid, {
            react: { text: '❤️', key: mek.key }
        }).catch(() => {});
    } catch (e) {}
}

// ==================== BOT OWNER REACT ====================
function handleBotOwnerReact(conn, mek, senderNumber, botNumber, isReact) {
    try {
        if (isReact) return;
        if (config.OWNER_REACT !== 'true') return;
        if (senderNumber !== botNumber) return;
        
        const reactions = ['👑', '❤️', '🔥', '💫', '💎', '💗', '🌟', '✨'];
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        
        conn.sendMessage(mek.key.remoteJid, {
            react: { text: randomReaction, key: mek.key }
        }).catch(() => {});
    } catch (e) {}
}

// ==================== AUTO REACT (Non-blocking) ====================
function handleAutoReact(conn, mek, isReact) {
    try {
        if (isReact) return;
        if (config.AUTO_REACT !== 'true') return;
        
        const reactions = ['🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '💥', '🥀', '❤‍🔥', '👻', '💸', '💎', '🌸', '🦋', '✨', '🎉', '👑', '🌟'];
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        
        conn.sendMessage(mek.key.remoteJid, {
            react: { text: randomReaction, key: mek.key }
        }).catch(() => {});
    } catch (e) {}
}

// ==================== CUSTOM REACT (Non-blocking) ====================
function handleCustomReact(conn, mek, isReact) {
    try {
        if (isReact) return;
        if (config.CUSTOM_REACT !== 'true') return;
        
        const reactions = (config.CUSTOM_REACT_EMOJIS || '🥲,😂,👍🏻,🙂,😔').split(',');
        const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
        
        conn.sendMessage(mek.key.remoteJid, {
            react: { text: randomReaction, key: mek.key }
        }).catch(() => {});
    } catch (e) {}
}

// ==================== WELCOME (FIXED) ====================
async function handleWelcome(conn, update) {
    try {
        if (config.WELCOME !== "true") return;
        if (!update?.action || update.action !== 'add') return;
        if (!update?.participants?.length) return;

        const metadata = await conn.groupMetadata(update.id);
        const groupName = metadata.subject;
        const groupSize = metadata.participants.length;
        const botName = config.BOT_NAME || 'DARKZONE-MD';

        for (const user of update.participants) {
            const userName = user.split('@')[0];
            let pfp = config.MENU_IMAGE_URL || "https://files.catbox.moe/jecbfo.jpg";

            try {
                pfp = await conn.profilePictureUrl(user, 'image');
            } catch {}

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
            console.log(`[👋] Welcome: ${userName}`);
        }
    } catch (err) {
        console.error("❌ Welcome error:", err.message);
    }
}

// ==================== GOODBYE (FIXED) ====================
async function handleGoodbye(conn, update) {
    try {
        if (config.WELCOME !== "true") return;
        if (!update?.action || update.action !== 'remove') return;
        if (!update?.participants?.length) return;

        const metadata = await conn.groupMetadata(update.id);
        const groupSize = metadata.participants.length;
        const botName = config.BOT_NAME || 'DARKZONE-MD';

        for (const user of update.participants) {
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
            console.log(`[👋] Goodbye: ${userName}`);
        }
    } catch (err) {
        console.error("❌ Goodbye error:", err.message);
    }
}

// ==================== ADMIN EVENTS (FIXED) ====================
async function handleAdminEvent(conn, update) {
    try {
        if (config.ADMIN_ACTION !== "true") return;
        if (!update?.action) return;
        if (update.action !== 'promote' && update.action !== 'demote') return;
        if (!update?.participants?.length) return;

        const metadata = await conn.groupMetadata(update.id);
        const timestamp = new Date().toLocaleString();
        const botName = config.BOT_NAME || 'DARKZONE-MD';

        for (const user of update.participants) {
            const userName = user.split('@')[0];
            const author = update.author?.split("@")[0] || 'Unknown';

            const text = update.action === "promote" 
                ? `╭─〔 *🎉 Admin Event* 〕\n├─ @${author} promoted @${userName}\n├─ *Time:* ${timestamp}\n├─ *Group:* ${metadata.subject}\n╰─➤ *Powered by ${botName}*`
                : `╭─〔 *⚠️ Admin Event* 〕\n├─ @${author} demoted @${userName}\n├─ *Time:* ${timestamp}\n├─ *Group:* ${metadata.subject}\n╰─➤ *Powered by ${botName}*`;

            await conn.sendMessage(update.id, {
                text: text,
                mentions: [update.author, user]
            });
            console.log(`[👑] ${update.action}: ${userName}`);
        }
    } catch (err) {
        console.error("❌ Admin event error:", err.message);
    }
}

module.exports = {
    handleStatusView,
    handleStatusReact,
    handleStatusReply,
    handleOwnerNumberReact,
    handleBotOwnerReact,
    handleAutoReact,
    handleCustomReact,
    handleWelcome,
    handleGoodbye,
    handleAdminEvent
};
