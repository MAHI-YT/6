// ============================================================
//  DARKZONE-MD Message Serializer
//  Created By Irfan Ahmad
//  ALL undefined variables FIXED
//  ALL crash points handled
// ============================================================

const config = require('../config');
const { proto, downloadContentFromMessage, getContentType } = require(config.BAILEYS);
const fs = require('fs');
const path = require('path');
const os = require('os');
const { isUrl } = require('./functions');

// Temp directory for downloads
const downloadDir = path.join(os.tmpdir(), 'darkzone-downloads');
if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

// ============================================================
//  DOWNLOAD MEDIA MESSAGE
// ============================================================
const downloadMediaMessage = async (m, filename) => {
    try {
        let messageType = m.type;

        if (messageType === 'viewOnceMessage' || messageType === 'viewOnceMessageV2') {
            messageType = m.msg?.type || m.type;
        }

        const typeMap = {
            imageMessage: { stream: 'image', ext: '.jpg' },
            videoMessage: { stream: 'video', ext: '.mp4' },
            audioMessage: { stream: 'audio', ext: '.mp3' },
            stickerMessage: { stream: 'sticker', ext: '.webp' },
            documentMessage: { stream: 'document', ext: '.bin' },
        };

        const info = typeMap[messageType];
        if (!info) throw new Error(`Unsupported message type: ${messageType}`);

        // Get extension from document
        let ext = info.ext;
        if (messageType === 'documentMessage' && m.msg?.fileName) {
            const parts = m.msg.fileName.split('.');
            if (parts.length > 1) ext = '.' + parts.pop().toLowerCase();
        }

        const filePath = path.join(downloadDir, (filename || `download_${Date.now()}`) + ext);

        const stream = await downloadContentFromMessage(m.msg, info.stream);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        fs.writeFileSync(filePath, buffer);
        return buffer;
    } catch (e) {
        console.error('[Download Error]:', e.message);
        throw e;
    }
};

// ============================================================
//  MESSAGE SERIALIZER (sms)
// ============================================================
const sms = (conn, m, store) => {
    if (!m) return m;

    let M = proto.WebMessageInfo;

    // ---- KEY DATA ----
    if (m.key) {
        m.id = m.key.id;
        m.isBot = m.id ? (m.id.startsWith('BAES') && m.id.length === 16) : false;
        m.isBaileys = m.id ? (m.id.startsWith('BAE5') && m.id.length === 16) : false;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat ? m.chat.endsWith('@g.us') : false;
        m.sender = m.fromMe
            ? (conn.user.id.split(':')[0] + '@s.whatsapp.net')
            : (m.isGroup ? m.key.participant : m.key.remoteJid);
    }

    // ---- MESSAGE DATA ----
    if (m.message) {
        m.mtype = getContentType(m.message);

        // Handle view once
        if (m.mtype === 'viewOnceMessage') {
            m.msg = m.message[m.mtype]?.message?.[getContentType(m.message[m.mtype].message)];
        } else if (m.mtype === 'viewOnceMessageV2') {
            const inner = m.message[m.mtype]?.message;
            if (inner) {
                m.msg = inner[getContentType(inner)];
            }
        } else {
            m.msg = m.message[m.mtype];
        }

        // Safety check
        if (!m.msg) m.msg = {};

        // ---- BODY ----
        try {
            m.body = (m.mtype === 'conversation') ? m.message.conversation :
                (m.mtype === 'extendedTextMessage') ? m.message.extendedTextMessage?.text :
                    (m.mtype === 'imageMessage') ? m.message.imageMessage?.caption :
                        (m.mtype === 'videoMessage') ? m.message.videoMessage?.caption :
                            (m.mtype === 'buttonsResponseMessage') ? m.message.buttonsResponseMessage?.selectedButtonId :
                                (m.mtype === 'listResponseMessage') ? m.message.listResponseMessage?.singleSelectReply?.selectedRowId :
                                    (m.mtype === 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage?.selectedId :
                                        '';
        } catch {
            m.body = '';
        }

        // ---- QUOTED MESSAGE ----
        let quoted = (m.quoted = m.msg?.contextInfo?.quotedMessage || null);
        m.mentionedJid = m.msg?.contextInfo?.mentionedJid || [];

        if (m.quoted) {
            let type = getContentType(quoted);
            m.quoted = m.quoted[type];

            if (['productMessage'].includes(type)) {
                type = getContentType(m.quoted);
                m.quoted = m.quoted[type];
            }

            if (typeof m.quoted === 'string') {
                m.quoted = { text: m.quoted };
            }

            // Handle viewOnceMessageV2 in quoted
            if (quoted.viewOnceMessageV2) {
                const voInner = quoted.viewOnceMessageV2.message;
                if (voInner) {
                    const voType = getContentType(voInner);
                    m.quoted = voInner[voType];
                    m.quoted.mtype = voType;
                }
            } else {
                m.quoted.mtype = type;
                m.quoted.id = m.msg.contextInfo?.stanzaId;
                m.quoted.chat = m.msg.contextInfo?.remoteJid || m.chat;
                m.quoted.isBot = m.quoted.id ? (m.quoted.id.startsWith('BAES') && m.quoted.id.length === 16) : false;
                m.quoted.isBaileys = m.quoted.id ? (m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16) : false;
                m.quoted.sender = m.msg.contextInfo?.participant
                    ? conn.decodeJid(m.msg.contextInfo.participant)
                    : '';
                m.quoted.fromMe = m.quoted.sender === (conn.user?.id);
                m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation ||
                    m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || '';
                m.quoted.mentionedJid = m.msg.contextInfo?.mentionedJid || [];

                // Fake object for quoting
                let vM = (m.quoted.fakeObj = M.fromObject({
                    key: {
                        remoteJid: m.quoted.chat,
                        fromMe: m.quoted.fromMe,
                        id: m.quoted.id,
                    },
                    message: quoted,
                    ...(m.isGroup ? { participant: m.quoted.sender } : {}),
                }));

                // Delete quoted message
                const deleteKey = {
                    remoteJid: m.chat,
                    fromMe: false,
                    id: m.quoted.id,
                    participant: m.quoted.sender,
                };
                m.quoted.delete = async () => {
                    try {
                        await conn.sendMessage(m.chat, { delete: deleteKey });
                    } catch (e) {
                        console.error('[Quote Delete Error]:', e.message);
                    }
                };

                // Forward quoted message
                m.forwardMessage = (jid, forceForward = true, options = {}) => {
                    return conn.copyNForward(jid, vM, forceForward, {
                        contextInfo: { isForwarded: false },
                        ...options,
                    });
                };

                // Download quoted media
                m.quoted.download = () => conn.downloadMediaMessage(m.quoted);
            }
        }
    }

    // ---- DOWNLOAD ----
    if (m.msg && m.msg.url) {
        m.download = () => conn.downloadMediaMessage(m.msg);
    }

    // ---- TEXT ----
    m.text = m.msg?.text || m.msg?.caption || m.message?.conversation ||
        m.msg?.contentText || m.msg?.selectedDisplayText || m.msg?.title || '';

    // ---- COPY ----
    m.copy = () => sms(conn, M.fromObject(M.toObject(m)));

    // ---- COPY & FORWARD ----
    m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => {
        return conn.copyNForward(jid, m, forceForward, options);
    };

    // ---- SEND STICKER ----
    m.sticker = (stik, id = m.chat, option = { mentions: [m.sender] }) => {
        return conn.sendMessage(id, {
            sticker: stik,
            contextInfo: { mentionedJid: option.mentions },
        }, { quoted: m });
    };

    // ---- REPLY IMAGE ----
    m.replyimg = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => {
        return conn.sendMessage(id, {
            image: img,
            caption: teks,
            contextInfo: { mentionedJid: option.mentions },
        }, { quoted: m });
    };

    // ---- IMAGE URL ----
    m.imgurl = (img, teks, id = m.chat, option = { mentions: [m.sender] }) => {
        return conn.sendMessage(id, {
            image: { url: img },
            caption: teks,
            contextInfo: { mentionedJid: option.mentions },
        }, { quoted: m });
    };

    // ---- UNIVERSAL REPLY ----
    m.reply = async (content, opt = {}, type = 'text') => {
        try {
            switch (type.toLowerCase()) {
                case 'text':
                    return await conn.sendMessage(m.chat, { text: content }, { quoted: m });

                case 'image':
                    if (Buffer.isBuffer(content)) {
                        return await conn.sendMessage(m.chat, { image: content, ...opt }, { quoted: m });
                    } else if (isUrl(content)) {
                        return await conn.sendMessage(m.chat, { image: { url: content }, ...opt }, { quoted: m });
                    }
                    break;

                case 'video':
                    if (Buffer.isBuffer(content)) {
                        return await conn.sendMessage(m.chat, { video: content, ...opt }, { quoted: m });
                    } else if (isUrl(content)) {
                        return await conn.sendMessage(m.chat, { video: { url: content }, ...opt }, { quoted: m });
                    }
                    break;

                case 'audio':
                    if (Buffer.isBuffer(content)) {
                        return await conn.sendMessage(m.chat, { audio: content, ...opt }, { quoted: m });
                    } else if (isUrl(content)) {
                        return await conn.sendMessage(m.chat, { audio: { url: content }, ...opt }, { quoted: m });
                    }
                    break;

                case 'sticker':
                    if (Buffer.isBuffer(content)) {
                        return await conn.sendImageAsSticker(m.chat, content, {
                            packname: opt.packname || config.STICKER_NAME,
                            author: opt.author || config.OWNER_NAME,
                            quoted: m,
                            ...opt,
                        });
                    }
                    break;

                case 'document':
                    return await conn.sendMessage(m.chat, {
                        document: content,
                        mimetype: opt.mimetype || 'application/octet-stream',
                        fileName: opt.fileName || 'file',
                        ...opt,
                    }, { quoted: m });

                default:
                    return await conn.sendMessage(m.chat, { text: content }, { quoted: m });
            }
        } catch (e) {
            console.error('[Reply Error]:', e.message);
            // Fallback to text
            return await conn.sendMessage(m.chat, { text: String(content) }, { quoted: m }).catch(() => { });
        }
    };

    // ---- SEND CONTACT ----
    m.sendcontact = (name, info, number) => {
        const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nORG:${info};\nTEL;type=CELL;type=VOICE;waid=${number}:+${number}\nEND:VCARD`;
        return conn.sendMessage(m.chat, {
            contacts: { displayName: name, contacts: [{ vcard }] },
        }, { quoted: m });
    };

    // ---- REACT ----
    m.react = (emoji) => {
        return conn.sendMessage(m.chat, {
            react: { text: emoji, key: m.key },
        }).catch(() => { });
    };

    return m;
};

module.exports = { sms, downloadMediaMessage };