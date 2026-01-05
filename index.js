
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
    makeInMemoryStore,
    jidDecode,
    fetchLatestBaileysVersion,
    Browsers
} = require(config.BAILEYS);

const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const fs = require('fs');
const P = require('pino');
const { PresenceControl, BotActivityFilter } = require('./data/presence');
const { sms, downloadMediaMessage } = require('./lib');
const FileType = require('file-type');
const { File } = require('megajs');
const os = require('os');
const path = require('path');
const prefix = config.PREFIX;
const ownerNumber = ['923306137477'];

// Import event handlers
const { handleConnection } = require('./events/connection');
const { handleGroupParticipants } = require('./events/welcome');
const { handleStatusView, handleNewsletterReact } = require('./events/statusView');
const { handleAntiDelete, handleAntiCall } = require('./events/antiDelete');

// Temp directory setup
const tempDir = path.join(os.tmpdir(), 'cache-temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

const clearTempDir = () => {
    fs.readdir(tempDir, (err, files) => {
        if (err) return;
        for (const file of files) {
            fs.unlink(path.join(tempDir, file), err => {});
        }
    });
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
    console.log("[🔰] Connecting to WhatsApp...");
    
    const creds = await loadSession();
    
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'sessions'), {
        creds: creds || undefined
    });
    
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

    // Connection events
    conn.ev.on('connection.update', async (update) => {
        const result = await handleConnection(conn, update);
        if (result === 'reconnect') {
            setTimeout(connectToWA, 5000);
        }
    });

    conn.ev.on('creds.update', saveCreds);

    // Anti-delete events
    conn.ev.on('messages.update', async updates => {
        await handleAntiDelete(conn, updates);
    });

    // Anti-call events
    conn.ev.on('call', async (calls) => {
        await handleAntiCall(conn, calls);
    });

    // Welcome/Goodbye events
    conn.ev.on('group-participants.update', async (update) => {
        await handleGroupParticipants(conn, update);
    });

    // Presence control
    conn.ev.on("presence.update", (update) => PresenceControl(conn, update));
    BotActivityFilter(conn);

    // Message handler
    conn.ev.on('messages.upsert', async (mek) => {
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

        // Handle status view
        await handleStatusView(conn, mek);
        
        // Handle newsletter reactions
        await handleNewsletterReact(conn, mek);

        const m = sms(conn, mek);
        const type = getContentType(mek.message);
        const content = JSON.stringify(mek.message);
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

        // Owner check
        const ownerFile = JSON.parse(fs.readFileSync('./assets/sudo.json', 'utf-8'));
        const ownerNumberFormatted = `${config.OWNER_NUMBER}@s.whatsapp.net`;
        const isFileOwner = ownerFile.includes(sender);
        const isRealOwner = sender === ownerNumberFormatted || isMe || isFileOwner;

        // Mode checks
        if (!isRealOwner && config.MODE === "private") return;
        if (!isRealOwner && isGroup && config.MODE === "inbox") return;
        if (!isRealOwner && !isGroup && config.MODE === "groups") return;

        // Ban check
        const bannedUsers = JSON.parse(fs.readFileSync('./assets/ban.json', 'utf-8'));
        if (bannedUsers.includes(sender)) return;

        // Auto react features
        if (!isReact && config.AUTO_REACT === 'true') {
            const reactions = ['🌼', '❤️', '💐', '🔥', '🏵️', '❄️', '💥', '🥀', '❤‍🔥', '🫶', '👻', '💸', '🎀', '🪄', '🧸'];
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            m.react(randomReaction);
        }

        if (!isReact && config.OWNER_REACT === 'true' && senderNumber === botNumber) {
            const reactions = ['👑', '🦢', '❤️', '💎', '🔥', '💫', '🌸'];
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            m.react(randomReaction);
        }

        if (!isReact && config.CUSTOM_REACT === 'true') {
            const reactions = (config.CUSTOM_REACT_EMOJIS || '🥲,😂,👍🏻').split(',');
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            m.react(randomReaction);
        }

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
                        isMe, isOwner, groupMetadata, groupName, participants, 
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
                    isMe, isOwner, groupMetadata, groupName, participants,
                    groupAdmins, isBotAdmins, isAdmins, reply
                });
            }
        });
    });

    // Add all helper functions to conn object
    setupConnMethods(conn);
}

function setupConnMethods(conn) {
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
        let mime = '';
        let res = await axios.head(url);
        mime = res.headers['content-type'];
        
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
    };

    conn.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
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

    conn.serializeM = mek => sms(conn, mek);
}

// Express server
app.use(express.static(path.join(__dirname, 'lib')));

app.get('/', (req, res) => {
    res.send("Bot is running ✅");
});

app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));

setTimeout(() => {
    connectToWA();
}, 4000);
