const config = require('../config');
const fs = require('fs');
const path = require('path');

// ==================== CONNECTION MESSAGE ====================
async function sendConnectionMessage(conn) {
    try {
        const pluginPath = path.join(__dirname, '..', 'plugins');
        let pluginCount = 0;
        
        fs.readdirSync(pluginPath).forEach((plugin) => {
            if (path.extname(plugin).toLowerCase() === ".js") {
                require(path.join(pluginPath, plugin));
                pluginCount++;
            }
        });
        console.log(`[🔰] ${pluginCount} Plugins installed successfully ✅`);

        const prefix = config.PREFIX;
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

        await conn.sendMessage(conn.user.id, { 
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
        
        console.log('[🔰] Connect message sent successfully ✅');
    } catch (error) {
        console.error('[❌] Error sending connect message:', error.message);
    }
}

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
async function handleChannelReact(conn, mek) {
    try {
        const newsletterJids = [
            "120363416743041101@newsletter"
        ];
        const emojis = ["🎉", "👍", "🕸️", "💀", "❤️", "🎀", "🪄", "🎐", "🧸", "💸", "🪉", "🫟", "🎗️", "🪃", "❄️", "💥", "🌸", "🦢"];

        if (mek.key && newsletterJids.includes(mek.key.remoteJid)) {
            const serverId = mek.newsletterServerId;
            if (serverId) {
                const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                await conn.newsletterReactMessage(mek.key.remoteJid, serverId.toString(), emoji);
                console.log(`[🔔] Reacted to channel with: ${emoji}`);
            }
        }
    } catch (e) {
        // Silent fail for newsletter
    }
}

// ==================== OWNER REACT (SPECIFIC NUMBER) ====================
function handleOwnerNumberReact(m, senderNumber, isReact) {
    try {
        if (senderNumber.includes("923306137477") && !isReact) {
            const reactions = ["👑", "🦢", "❤️", "🫜", "🫩", "🪾", "🪉", "🪏", "❤️", "🫟"];
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            m.react(randomReaction);
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

// ==================== WELCOME MESSAGE ====================
async function handleWelcome(conn, update) {
    try {
        if (config.WELCOME !== "true") return;
        if (update.action !== 'add') return;

        const metadata = await conn.groupMetadata(update.id);
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
*│● ᴊσιɴє∂ ${groupSize}*
*│● ©ᴘσωєʀє∂ ву ${botName}*
*╰┉┉┉┉┈┈┈┈┈┈┈┈┉┉┉᛫᛭*`;

            await conn.sendMessage(update.id, {
                image: { url: pfp },
                caption: welcomeMsg,
                mentions: [user],
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    mentionedJid: [user],
                    forwardedNewsletterMessageInfo: {
                        newsletterName: botName,
                        newsletterJid: "120363416743041101@newsletter",
                    },
                }
            });
        }
    } catch (err) {
        console.error("❌ Error in welcome:", err.message);
    }
}

// ==================== GOODBYE MESSAGE ====================
async function handleGoodbye(conn, update) {
    try {
        if (config.WELCOME !== "true") return;
        if (update.action !== 'remove') return;

        const metadata = await conn.groupMetadata(update.id);
        const groupName = metadata.subject;
        const groupSize = metadata.participants.length;
        const botName = config.BOT_NAME || 'DARKZONE-MD';

        for (let user of update.participants) {
            const userName = user.split('@')[0];

            const goodbyeMsg = `*╭ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄─ׂ┄─ׅ─ׂ┄──*
*│  ̇─̣─̇─̣〘 gσσ∂вує 〙̣─̇─̣─̇*
*├┅┅┅┅┈┈┈┈┈┈┈┈┈┅┅┅◆*
*│❀ ᴜѕєʀ* @${userName}
*│● мємвєʀѕ ιѕ ℓєfт тнє gʀσᴜᴘ*
*│● мємвєʀs ${groupSize}*
*│● ©ᴘσωєʀє∂ ву ${botName}*
*╰┉┉┉┉┈┈┈┈┈┈┈┈┉┉┉᛫᛭*`;

            await conn.sendMessage(update.id, {
                image: { url: config.MENU_IMAGE_URL || "https://files.catbox.moe/jecbfo.jpg" },
                caption: goodbyeMsg,
                mentions: [user],
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    mentionedJid: [user],
                    forwardedNewsletterMessageInfo: {
                        newsletterName: botName,
                        newsletterJid: "120363416743041101@newsletter",
                    },
                }
            });
        }
    } catch (err) {
        console.error("❌ Error in goodbye:", err.message);
    }
}

// ==================== ADMIN EVENTS ====================
async function handleAdminEvent(conn, update) {
    try {
        if (config.ADMIN_ACTION !== "true") return;
        if (update.action !== 'promote' && update.action !== 'demote') return;

        const metadata = await conn.groupMetadata(update.id);
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
                    mentions: [update.author, user],
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        mentionedJid: [update.author, user],
                        forwardedNewsletterMessageInfo: {
                            newsletterName: botName,
                            newsletterJid: "120363416743041101@newsletter",
                        },
                    }
                });
            } else if (update.action === "demote") {
                await conn.sendMessage(update.id, {
                    text: `╭─〔 *⚠️ Admin Event* 〕\n` +
                          `├─ @${author} demoted @${userName}\n` +
                          `├─ *Time:* ${timestamp}\n` +
                          `├─ *Group:* ${metadata.subject}\n` +
                          `╰─➤ *Powered by ${botName}*`,
                    mentions: [update.author, user],
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        mentionedJid: [update.author, user],
                        forwardedNewsletterMessageInfo: {
                            newsletterName: botName,
                            newsletterJid: "120363416743041101@newsletter",
                        },
                    }
                });
            }
        }
    } catch (err) {
        console.error("❌ Error in admin event:", err.message);
    }
}

// ==================== ANTI CALL ====================
async function handleAntiCall(conn, calls) {
    try {
        if (config.ANTI_CALL !== 'true') return;

        for (const call of calls) {
            if (call.status !== 'offer') continue;

            await conn.rejectCall(call.id, call.from);
            await conn.sendMessage(call.from, {
                text: config.REJECT_MSG || '*I AM SORRY SIR MY OWNER NOT ALLOWED CALL*'
            });
            console.log(`[📵] Call rejected from: ${call.from.split('@')[0]}`);
        }
    } catch (err) {
        console.error("Anti-call error:", err.message);
    }
}

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
