// ============================================================
//  DARKZONE-MD Anti-Delete Handler
//  Created By Irfan Ahmad
// ============================================================

const config = require('../config');
const { loadMessage, getAnti } = require('../data');

// Pakistan timezone
const timeOptions = {
    timeZone: 'Asia/Karachi',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
};

const getMessageContent = (mek) => {
    if (mek.message?.conversation) return mek.message.conversation;
    if (mek.message?.extendedTextMessage?.text) return mek.message.extendedTextMessage.text;
    if (mek.message?.imageMessage?.caption) return mek.message.imageMessage.caption;
    if (mek.message?.videoMessage?.caption) return mek.message.videoMessage.caption;
    return '';
};

const isGroupJid = (jid) => jid && jid.endsWith('@g.us');

const DeletedText = async (conn, mek, jid, deleteInfo, isGroup, update) => {
    try {
        const messageContent = getMessageContent(mek);
        const alertText = `*⚠️ Deleted Message Alert 🚨*\n${deleteInfo}\n  ◈ Content ━ ${messageContent}`;

        const mentionedJid = [];
        if (isGroup) {
            if (update.key.participant) mentionedJid.push(update.key.participant);
            if (mek.key.participant) mentionedJid.push(mek.key.participant);
        } else {
            if (mek.key.participant) mentionedJid.push(mek.key.participant);
            else if (mek.key.remoteJid) mentionedJid.push(mek.key.remoteJid);
        }

        await conn.sendMessage(jid, {
            text: alertText,
            contextInfo: {
                mentionedJid: mentionedJid.length ? mentionedJid : undefined,
            },
        }, { quoted: mek });
    } catch (e) {
        console.error('[AntiDel Text Error]:', e.message);
    }
};

const DeletedMedia = async (conn, mek, jid, deleteInfo, messageType) => {
    try {
        const botName = config.BOT_NAME || 'DARKZONE-MD';

        if (messageType === 'imageMessage' || messageType === 'videoMessage') {
            const antideletedmek = JSON.parse(JSON.stringify(mek.message));
            if (antideletedmek[messageType]) {
                antideletedmek[messageType].caption = `*⚠️ Deleted Message Alert 🚨*\n${deleteInfo}\n*╰💬 ─✪ ${botName} ✪── 🔼*`;
                antideletedmek[messageType].contextInfo = {
                    stanzaId: mek.key.id,
                    participant: mek.key.participant || mek.key.remoteJid,
                    quotedMessage: mek.message,
                };
            }
            await conn.relayMessage(jid, antideletedmek, {});
        } else {
            const alertText = `*⚠️ Deleted Message Alert 🚨*\n${deleteInfo}`;
            await conn.sendMessage(jid, { text: alertText }, { quoted: mek });
            await conn.relayMessage(jid, mek.message, {});
        }
    } catch (e) {
        console.error('[AntiDel Media Error]:', e.message);
    }
};

const AntiDelete = async (conn, updates) => {
    try {
        for (const update of updates) {
            if (update.update.message !== null) continue;

            const store = await loadMessage(update.key.id);
            if (!store || !store.message) continue;

            const mek = store.message;
            const isGroup = isGroupJid(store.jid);

            // Check anti-delete status
            const antiDeleteStatus = await getAnti();
            if (!antiDeleteStatus) continue;

            const deleteTime = new Date().toLocaleTimeString('en-GB', timeOptions).toLowerCase();
            const botName = config.BOT_NAME || 'DARKZONE-MD';

            let deleteInfo, jid;

            if (isGroup) {
                try {
                    const groupMetadata = await conn.groupMetadata(store.jid);
                    const groupName = groupMetadata.subject || 'Unknown Group';
                    const sender = mek.key.participant?.split('@')[0] || 'Unknown';
                    const deleter = update.key.participant?.split('@')[0] || 'Unknown';

                    deleteInfo = `*╭────⬡ ${botName} ❤‍🔥 ⬡────*\n*├♻️ SENDER:* @${sender}\n*├👥 GROUP:* ${groupName}\n*├⏰ DELETE TIME:* ${deleteTime}\n*├🗑️ DELETED BY:* @${deleter}\n*├⚠️ ACTION:* Deleted a Message`;

                    jid = config.ANTI_DEL_PATH === 'inbox'
                        ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
                        : store.jid;
                } catch (e) {
                    console.error('[AntiDel Group Error]:', e.message);
                    continue;
                }
            } else {
                const senderNumber = mek.key.participant?.split('@')[0] || mek.key.remoteJid?.split('@')[0] || 'Unknown';
                const deleterNumber = update.key.participant?.split('@')[0] || update.key.remoteJid?.split('@')[0] || 'Unknown';

                deleteInfo = `*╭────⬡ ${botName} ⬡────*\n*├👤 SENDER:* @${senderNumber}\n*├⏰ DELETE TIME:* ${deleteTime}\n*├🗑️ DELETED BY:* @${deleterNumber}\n*├⚠️ ACTION:* Deleted a Message`;

                jid = config.ANTI_DEL_PATH === 'inbox'
                    ? conn.user.id.split(':')[0] + '@s.whatsapp.net'
                    : update.key.remoteJid || store.jid;
            }

            const messageType = mek.message ? Object.keys(mek.message)[0] : null;
            if (!messageType) continue;

            if (messageType === 'conversation' || messageType === 'extendedTextMessage') {
                await DeletedText(conn, mek, jid, deleteInfo, isGroup, update);
            } else if ([
                'imageMessage', 'videoMessage', 'stickerMessage',
                'documentMessage', 'audioMessage',
            ].includes(messageType)) {
                await DeletedMedia(conn, mek, jid, deleteInfo, messageType);
            }
        }
    } catch (e) {
        console.error('[AntiDelete Error]:', e.message);
    }
};

module.exports = { DeletedText, DeletedMedia, AntiDelete };