// ============================================================
//  DARKZONE-MD v8.0 — WhatsApp Bot
//  Created By Irfan Ahmad
//  Fully Rebuilt — Zero Bugs — Production Ready
// ============================================================

// ============================================================
//  GLOBAL ERROR HANDLERS (Prevents bot from dying!)
// ============================================================
process.on('uncaughtException', (err) => {
    console.error('[❌ UNCAUGHT ERROR]', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason) => {
    console.error('[❌ UNHANDLED REJECTION]', reason);
});

// ============================================================
//  IMPORTS
// ============================================================
const axios = require('axios');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const os = require('os');
const express = require('express');
const { File } = require('megajs');
const FileType = require('file-type');
const Crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

ffmpeg.setFfmpegPath(ffmpegPath);

// Baileys Imports
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
    Browsers,
    isJidGroup,
} = require(config.BAILEYS);

// Local Imports
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson } = require('./lib/functions');
const { sms, downloadMediaMessage } = require('./lib/msg');
const { AntiDelete } = require('./lib/antidel');
const { saveContact, loadMessage, getName, getChatSummary, saveGroupMetadata, getGroupMetadata, saveMessageCount, getInactiveGroupMembers, getGroupMembersMessageCount, saveMessage } = require('./data');
const { initializeAntiDeleteSettings, setAnti, getAnti } = require('./data/antidel');
const GroupEvents = require('./lib/groupevents');
const { getBotStatus, isCmdEnabled } = require('./command');

// ============================================================
//  CONSTANTS
// ============================================================
const prefix = config.PREFIX;
const ownerNumber = [config.OWNER_NUMBER];
const botStartTime = Date.now();

// ============================================================
//  IN-MEMORY STORE
// ============================================================
const store = makeInMemoryStore({
    logger: pino().child({ level: 'silent', stream: 'store' })
});

// ============================================================
//  TEMP DIRECTORY MANAGEMENT
// ============================================================
const tempDir = path.join(os.tmpdir(), 'darkzone-temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

function clearTempDir() {
    try {
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        for (const file of files) {
            const filePath = path.join(tempDir, file);
            try {
                const stat = fs.statSync(filePath);
                // Only delete files older than 5 minutes
                if (now - stat.mtimeMs > 5 * 60 * 1000) {
                    fs.unlinkSync(filePath);
                }
            } catch (e) { }
        }
    } catch (e) { }
}

setInterval(clearTempDir, 5 * 60 * 1000);

// ============================================================
//  EXPRESS SERVER
// ============================================================
const app = express();
const port = process.env.PORT || 9090;

app.use(express.static(path.join(__dirname, 'lib')));
app.get('/', (req, res) => {
    res.redirect('/irfan.html');
});

app.get('/health', (req, res) => {
    res.json({
        status: 'running',
        uptime: runtime(process.uptime()),
        memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        bot: config.BOT_NAME
    });
});

app.listen(port, () => {
    console.log(`[🌐] Server running on http://localhost:${port}`);
});

// ============================================================
//  SESSION MANAGEMENT
// ============================================================
const sessionDir = path.join(__dirname, 'sessions');
const credsPath = path.join(sessionDir, 'creds.json');

if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
}

async function loadSession() {
    try {
        if (!config.SESSION_ID) {
            console.log('[⚠️] No SESSION_ID — QR code login will be used');
            return null;
        }

        console.log('[⏳] Downloading session from MEGA...');

        const megaFileId = config.SESSION_ID.startsWith('IK~')
            ? config.SESSION_ID.replace('IK~', '')
            : config.SESSION_ID;

        const filer = File.fromURL(`https://mega.nz/file/${megaFileId}`);

        const data = await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('MEGA download timeout')), 30000);
            filer.download((err, data) => {
                clearTimeout(timeout);
                if (err) reject(err);
                else resolve(data);
            });
        });

        fs.writeFileSync(credsPath, data);
        console.log('[✅] Session downloaded successfully');
        return JSON.parse(data.toString());
    } catch (error) {
        console.error('[❌] Session download failed:', error.message);
        console.log('[⚠️] Will generate QR code instead');
        return null;
    }
}

// ============================================================
//  REACTION EMOJIS (Single array — no duplicates)
// ============================================================
const REACTION_EMOJIS = [
    '❤️', '💜', '💙', '💚', '💛', '🧡', '🖤', '🤍', '💗', '💖',
    '💘', '💝', '❤‍🔥', '🔥', '⭐', '🌟', '💫', '✨', '🎉', '🎊',
    '👏', '🙌', '🫶', '😍', '🥰', '😘', '🤩', '😎', '🥹', '😇',
    '👻', '👾', '🦋', '🌸', '🌺', '🌹', '🌷', '🍀', '🌿', '💐',
    '🏆', '👑', '💎', '🔮', '🧿', '🎯', '🚀', '💥', '🗿', '🇵🇰',
    '🕊️', '🦚', '🐝', '🦄', '🐳', '🦊', '🐼', '🧸', '🎀', '🪄',
    '✅', '🔰', '💯', '⚡', '☘️', '🍁', '🌻', '🌼', '🥀', '🪷'
];

// ============================================================
//  PLUGIN LOADER (Loads ONCE — not on every reconnect)
// ============================================================
let pluginsLoaded = false;

function loadPlugins() {
    if (pluginsLoaded) return;

    const pluginPath = path.join(__dirname, 'plugins');
    if (!fs.existsSync(pluginPath)) {
        fs.mkdirSync(pluginPath, { recursive: true });
        console.log('[📁] Plugins folder created');
        return;
    }

    let count = 0;
    let errors = 0;

    const pluginFiles = fs.readdirSync(pluginPath).filter(f => f.endsWith('.js'));

    for (const file of pluginFiles) {
        try {
            require(path.join(pluginPath, file));
            count++;
        } catch (e) {
            errors++;
            console.error(`[❌ Plugin Error] ${file}:`, e.message);
        }
    }

    pluginsLoaded = true;
    console.log(`[✅] ${count} plugins loaded${errors > 0 ? ` (${errors} failed)` : ''}`);
}

// ============================================================
//  MAIN CONNECTION
// ============================================================
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

async function connectToWA() {
    console.log('[🔰] DARKZONE-MD Connecting...');

    // Load session first
    await loadSession();

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: Browsers.macOS('Firefox'),
        auth: state,
        version,
        syncFullHistory: false,
        markOnlineOnConnect: config.ALWAYS_ONLINE === 'true',
        generateHighQualityLinkPreview: false,
        getMessage: async (key) => {
            // Try to get message from store
            try {
                const msg = await loadMessage(key.id);
                if (msg && msg.message) {
                    return msg.message.message || {};
                }
            } catch (e) { }
            return {};
        },
    });

    // Bind store to connection
    store.bind(conn.ev);

    // ============================================================
    //  CONNECTION UPDATE HANDLER
    // ============================================================
    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('[📱] Scan the QR code to connect');
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const reason = lastDisconnect?.error?.output?.payload?.error;

            console.log(`[⚠️] Connection closed: ${reason || 'Unknown'} (${statusCode})`);

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('[🔴] Session logged out! Delete sessions folder and restart.');
                // Clean session
                try {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                    fs.mkdirSync(sessionDir, { recursive: true });
                } catch (e) { }
                process.exit(1);
            } else if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts++;
                const delay = Math.min(5000 * reconnectAttempts, 60000); // Max 60 seconds
                console.log(`[🔄] Reconnecting in ${delay / 1000}s... (Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
                setTimeout(connectToWA, delay);
            } else {
                console.log('[🔴] Max reconnection attempts reached. Restarting process...');
                reconnectAttempts = 0;
                setTimeout(connectToWA, 120000); // Wait 2 minutes then try again
            }
        }

        if (connection === 'open') {
            reconnectAttempts = 0;
            console.log('[✅] DARKZONE-MD Connected Successfully!');

            // Load plugins ONCE
            loadPlugins();

            // Initialize anti-delete
            await initializeAntiDeleteSettings().catch(e =>
                console.error('[⚠️] Anti-delete init error:', e.message)
            );

            // Send startup message
            try {
                const botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
                const botName = config.BOT_NAME;
                const ownerName = config.OWNER_NAME;

                const upMessage = `╭━━━━━━━━━━━━━━━━━━━╮
┃  🤖 *${botName} STARTED*
┃━━━━━━━━━━━━━━━━━━━━
┃ ✅ *Status:* _Online & Ready_
┃ 📡 *Connection:* _Successful_
┃ 🔌 *THE POWERFUL BOT*
╰━━━━━━━━━━━━━━━━━━━╯

╭━━〔 ⚙️ *Bot Info* 〕━━━╮
┃ ▸ *Prefix:* ${prefix}
┃ ▸ *Bot:* ${botName}
┃ ▸ *Owner:* ${ownerName}
┃ ▸ *Mode:* ${config.MODE}
┃ ▸ *Plugins:* ${require('./command').commands.length}
╰━━━━━━━━━━━━━━━━━━━╯

🎉 *All systems operational!*
⏰ *Started at:* ${new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}

⭐ *Channel:* https://whatsapp.com/channel/0029Vb5dDVO59PwTnL86j13J
⭐ *GitHub:* ${config.REPO}/fork`;

                await sleep(2000);

                await conn.sendMessage(botJid, {
                    image: { url: config.MENU_IMAGE_URL },
                    caption: upMessage,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterName: botName,
                            newsletterJid: '120363416743041101@newsletter',
                        }
                    }
                }).catch(e => console.error('[⚠️] Startup message failed:', e.message));

            } catch (e) {
                console.error('[⚠️] Startup message error:', e.message);
            }
        }
    });

    // ============================================================
    //  CREDENTIALS UPDATE
    // ============================================================
    conn.ev.on('creds.update', saveCreds);

    // ============================================================
    //  ANTI-DELETE HANDLER
    // ============================================================
    conn.ev.on('messages.update', async (updates) => {
        try {
            for (const update of updates) {
                if (update.update.message === null) {
                    await AntiDelete(conn, updates);
                    break; // AntiDelete handles all updates
                }
            }
        } catch (e) {
            console.error('[⚠️] Anti-delete error:', e.message);
        }
    });

    // ============================================================
    //  GROUP EVENTS (Welcome, Goodbye, Admin Events)
    // ============================================================
    conn.ev.on('group-participants.update', (update) => {
        try {
            GroupEvents(conn, update);
        } catch (e) {
            console.error('[⚠️] Group event error:', e.message);
        }
    });

    // ============================================================
    //  PRESENCE (Always Online / Auto Typing / Recording)
    // ============================================================
    if (config.ALWAYS_ONLINE === 'true') {
        setInterval(async () => {
            try {
                await conn.sendPresenceUpdate('available');
            } catch (e) { }
        }, 30000);
    }

    // ============================================================
    //  KEEPALIVE — Prevents connection from dying
    // ============================================================
    setInterval(async () => {
        try {
            if (conn.ws && conn.ws.readyState === conn.ws.OPEN) {
                await conn.sendPresenceUpdate('available');
            }
        } catch (e) { }
    }, 45000);

    // ============================================================
    //  MAIN MESSAGE HANDLER
    // ============================================================
    conn.ev.on('messages.upsert', async (mek) => {
        try {
            mek = mek.messages[0];
            if (!mek || !mek.message) return;

            // Handle ephemeral messages
            mek.message = (getContentType(mek.message) === 'ephemeralMessage')
                ? mek.message.ephemeralMessage.message
                : mek.message;

            // Read messages if enabled
            if (config.READ_MESSAGE === 'true') {
                await conn.readMessages([mek.key]).catch(() => { });
            }

            // Handle view once
            if (mek.message.viewOnceMessageV2) {
                mek.message = mek.message.viewOnceMessageV2.message;
            }
            if (mek.message.viewOnceMessage) {
                mek.message = mek.message.viewOnceMessage.message;
            }

            // ============================================================
            //  AUTO STATUS SEEN & REPLY
            // ============================================================
            if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                if (config.AUTO_STATUS_SEEN === 'true') {
                    await conn.readMessages([mek.key]).catch(() => { });
                }
                if (config.AUTO_STATUS_REACT === 'true') {
                    const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
                    await conn.sendMessage(mek.key.remoteJid, {
                        react: { text: emoji, key: mek.key }
                    }).catch(() => { });
                }
                if (config.AUTO_STATUS_REPLY === 'true') {
                    const user = mek.key.participant;
                    await conn.sendMessage(user, {
                        text: config.AUTO_STATUS_MSG
                    }, { quoted: mek }).catch(() => { });
                }
                // Save message but don't process commands from status
                await saveMessage(mek).catch(() => { });
                return;
            }

            // ============================================================
            //  SAVE MESSAGE TO STORE
            // ============================================================
            await saveMessage(mek).catch(() => { });

            // ============================================================
            //  SERIALIZE MESSAGE
            // ============================================================
            const m = sms(conn, mek, store);

            // ============================================================
            //  EXTRACT MESSAGE DATA
            // ============================================================
            const type = getContentType(mek.message);
            const from = mek.key.remoteJid;
            const body = (type === 'conversation') ? mek.message.conversation :
                (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
                    (type === 'imageMessage' && mek.message.imageMessage.caption) ? mek.message.imageMessage.caption :
                        (type === 'videoMessage' && mek.message.videoMessage.caption) ? mek.message.videoMessage.caption : '';

            const isCmd = body.startsWith(prefix);
            const budy = typeof mek.text === 'string' ? mek.text : false;
            const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : '';
            const args = body.trim().split(/\s+/).slice(1);
            const q = args.join(' ');
            const text = args.join(' ');
            const isGroup = from.endsWith('@g.us');
            const sender = mek.key.fromMe
                ? (conn.user.id.split(':')[0] + '@s.whatsapp.net')
                : (mek.key.participant || mek.key.remoteJid);
            const senderNumber = sender.split('@')[0];
            const botNumber = conn.user.id.split(':')[0];
            const pushname = mek.pushName || 'User';
            const isMe = botNumber.includes(senderNumber);
            const isOwner = ownerNumber.includes(senderNumber) || isMe;
            const botNumber2 = jidNormalizedUser(conn.user.id);
            const isReact = m.message?.reactionMessage ? true : false;

            // Group Data
            let groupMetadata = null, groupName = '', participants = [], groupAdmins = [], isBotAdmins = false, isAdmins = false;

            if (isGroup) {
                try {
                    groupMetadata = await conn.groupMetadata(from);
                    groupName = groupMetadata.subject || '';
                    participants = groupMetadata.participants || [];
                    groupAdmins = getGroupAdmins(participants);
                    isBotAdmins = groupAdmins.includes(botNumber2);
                    isAdmins = groupAdmins.includes(sender);
                } catch (e) {
                    console.error('[⚠️] Group metadata error:', e.message);
                }
            }

            // ============================================================
            //  OWNER / SUDO CHECK
            // ============================================================
            let sudoList = [];
            try {
                const sudoPath = path.join(__dirname, 'assets', 'sudo.json');
                if (fs.existsSync(sudoPath)) {
                    sudoList = JSON.parse(fs.readFileSync(sudoPath, 'utf-8'));
                }
            } catch (e) { }

            const isCreator = [
                botNumber + '@s.whatsapp.net',
                config.DEV + '@s.whatsapp.net',
                config.OWNER_NUMBER + '@s.whatsapp.net',
                ...sudoList
            ].map(v => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net')
                .includes(sender);

            const ownerNumberFormatted = config.OWNER_NUMBER + '@s.whatsapp.net';
            let isFileOwner = false;
            try {
                isFileOwner = sudoList.includes(sender);
            } catch (e) { }
            const isRealOwner = sender === ownerNumberFormatted || isMe || isFileOwner;

            // Reply function
            const reply = (teks) => {
                conn.sendMessage(from, { text: teks }, { quoted: mek });
            };

            // ============================================================
            //  BANNED USERS CHECK
            // ============================================================
            try {
                const banPath = path.join(__dirname, 'assets', 'ban.json');
                if (fs.existsSync(banPath)) {
                    const bannedUsers = JSON.parse(fs.readFileSync(banPath, 'utf-8'));
                    if (bannedUsers.includes(sender)) return;
                }
            } catch (e) { }

            // ============================================================
            //  BOT ON/OFF CHECK
            // ============================================================
            if (!getBotStatus() && !isRealOwner) return;

            // ============================================================
            //  MODE CHECK (public / private / inbox / groups)
            // ============================================================
            if (!isRealOwner && config.MODE === 'private') return;
            if (!isRealOwner && isGroup && config.MODE === 'inbox') return;
            if (!isRealOwner && !isGroup && config.MODE === 'groups') return;

            // ============================================================
            //  OWNER EVAL COMMAND (&)
            // ============================================================
            if (isCreator && budy && budy.startsWith('&')) {
                let code = budy.slice(2).trim();
                if (!code) {
                    reply('Provide a command to execute!');
                    return;
                }
                const { spawn } = require('child_process');
                try {
                    let proc = spawn(code, { shell: true });
                    let output = '';

                    proc.stdout.on('data', (data) => { output += data.toString(); });
                    proc.stderr.on('data', (data) => { output += data.toString(); });
                    proc.on('error', (data) => { reply(data.toString()); });
                    proc.on('close', (exitCode) => {
                        if (output.trim()) reply(output.trim());
                        else if (exitCode !== 0) reply(`Command exited with code ${exitCode}`);
                        else reply('✅ Executed successfully (no output)');
                    });
                } catch (err) {
                    reply(require('util').format(err));
                }
                return;
            }

            // ============================================================
            //  AUTO REACT
            // ============================================================
            if (!isReact) {
                if (config.AUTO_REACT === 'true') {
                    const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
                    m.react(emoji);
                } else if (config.OWNER_REACT === 'true' && senderNumber === botNumber) {
                    const emoji = REACTION_EMOJIS[Math.floor(Math.random() * REACTION_EMOJIS.length)];
                    m.react(emoji);
                } else if (config.CUSTOM_REACT === 'true') {
                    const reactions = (config.CUSTOM_REACT_EMOJIS || '💜,❤️,🔥').split(',');
                    const emoji = reactions[Math.floor(Math.random() * reactions.length)].trim();
                    m.react(emoji);
                }
            }

            // ============================================================
            //  AUTO TYPING / RECORDING
            // ============================================================
            if (config.AUTO_TYPING === 'true' && isCmd) {
                await conn.sendPresenceUpdate('composing', from).catch(() => { });
            }
            if (config.AUTO_RECORDING === 'true' && isCmd) {
                await conn.sendPresenceUpdate('recording', from).catch(() => { });
            }

            // ============================================================
            //  COMMAND HANDLER
            // ============================================================
            const events = require('./command');
            const cmdName = isCmd ? body.slice(prefix.length).trim().split(' ')[0].toLowerCase() : false;

            if (isCmd && cmdName) {
                // Check if command is enabled
                if (!isCmdEnabled(cmdName) && !isRealOwner) {
                    return reply('⚠️ This command is currently disabled.');
                }

                const cmd = events.commands.find((c) => c.pattern === cmdName) ||
                    events.commands.find((c) => c.alias && c.alias.includes(cmdName));

                if (cmd) {
                    // Send react if command has one
                    if (cmd.react) {
                        conn.sendMessage(from, { react: { text: cmd.react, key: mek.key } }).catch(() => { });
                    }

                    try {
                        cmd.function(conn, mek, m, {
                            from, quoted: m.quoted, body, isCmd, command, args, q, text,
                            isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
                            isMe, isOwner, isCreator, isRealOwner, groupMetadata, groupName,
                            participants, groupAdmins, isBotAdmins, isAdmins, reply, prefix
                        });
                    } catch (e) {
                        console.error(`[❌ Plugin Error] ${cmdName}:`, e.message);
                    }
                }
            }

            // ============================================================
            //  EVENT-BASED COMMANDS (body, text, image, sticker)
            // ============================================================
            events.commands.forEach(async (command) => {
                try {
                    if (body && command.on === 'body') {
                        command.function(conn, mek, m, {
                            from, quoted: m.quoted, body, isCmd, command, args, q, text,
                            isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
                            isMe, isOwner, isCreator, isRealOwner, groupMetadata, groupName,
                            participants, groupAdmins, isBotAdmins, isAdmins, reply, prefix
                        });
                    } else if (mek.q && command.on === 'text') {
                        command.function(conn, mek, m, {
                            from, quoted: m.quoted, body, isCmd, command, args, q, text,
                            isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
                            isMe, isOwner, isCreator, isRealOwner, groupMetadata, groupName,
                            participants, groupAdmins, isBotAdmins, isAdmins, reply, prefix
                        });
                    } else if ((command.on === 'image' || command.on === 'photo') && m.mtype === 'imageMessage') {
                        command.function(conn, mek, m, {
                            from, quoted: m.quoted, body, isCmd, command, args, q, text,
                            isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
                            isMe, isOwner, isCreator, isRealOwner, groupMetadata, groupName,
                            participants, groupAdmins, isBotAdmins, isAdmins, reply, prefix
                        });
                    } else if (command.on === 'sticker' && m.mtype === 'stickerMessage') {
                        command.function(conn, mek, m, {
                            from, quoted: m.quoted, body, isCmd, command, args, q, text,
                            isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
                            isMe, isOwner, isCreator, isRealOwner, groupMetadata, groupName,
                            participants, groupAdmins, isBotAdmins, isAdmins, reply, prefix
                        });
                    }
                } catch (e) {
                    console.error(`[❌ Event Command Error]:`, e.message);
                }
            });

        } catch (e) {
            console.error('[❌ Message Handler Error]:', e.message);
        }
    });

    // ============================================================
    //  UTILITY FUNCTIONS (attached to conn)
    // ============================================================

    // --- Decode JID ---
    conn.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server) ? decode.user + '@' + decode.server : jid;
        }
        return jid;
    };

    // --- Copy & Forward Message ---
    conn.copyNForward = async (jid, message, forceForward = false, options = {}) => {
        try {
            let vtype;
            if (options.readViewOnce) {
                message.message = message.message?.ephemeralMessage?.message || message.message;
                vtype = Object.keys(message.message.viewOnceMessage.message)[0];
                delete message.message.viewOnceMessage.message[vtype].viewOnce;
                message.message = { ...message.message.viewOnceMessage.message };
            }

            let mtype = Object.keys(message.message)[0];
            let content = await generateForwardMessageContent(message, forceForward);
            let ctype = Object.keys(content)[0];
            let context = {};
            if (mtype !== 'conversation') context = message.message[mtype].contextInfo || {};
            content[ctype].contextInfo = { ...context, ...content[ctype].contextInfo };

            const waMessage = await generateWAMessageFromContent(jid, content, {
                ...content[ctype],
                ...options,
                ...(options.contextInfo ? {
                    contextInfo: { ...content[ctype].contextInfo, ...options.contextInfo }
                } : {})
            });

            await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id });
            return waMessage;
        } catch (e) {
            console.error('[⚠️] Forward error:', e.message);
            throw e;
        }
    };

    // --- Download & Save Media ---
    conn.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        try {
            let quoted = message.msg || message;
            let mime = (message.msg || message).mimetype || '';
            let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
            const stream = await downloadContentFromMessage(quoted, messageType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            let type = await FileType.fromBuffer(buffer);
            let ext = type ? type.ext : 'bin';
            let trueFileName = attachExtension ? (filename + '.' + ext) : filename;
            fs.writeFileSync(trueFileName, buffer);
            return trueFileName;
        } catch (e) {
            console.error('[⚠️] Download save error:', e.message);
            throw e;
        }
    };

    // --- Download Media to Buffer ---
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
            console.error('[⚠️] Download error:', e.message);
            throw e;
        }
    };

    // --- Send File URL ---
    conn.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
        try {
            let res = await axios.head(url);
            let mime = res.headers['content-type'] || '';

            if (mime.split('/')[1] === 'gif') {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption, gifPlayback: true, ...options }, { quoted, ...options });
            }
            if (mime === 'application/pdf') {
                return conn.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption, ...options }, { quoted, ...options });
            }
            if (mime.startsWith('image')) {
                return conn.sendMessage(jid, { image: await getBuffer(url), caption, ...options }, { quoted, ...options });
            }
            if (mime.startsWith('video')) {
                return conn.sendMessage(jid, { video: await getBuffer(url), caption, mimetype: 'video/mp4', ...options }, { quoted, ...options });
            }
            if (mime.startsWith('audio')) {
                return conn.sendMessage(jid, { audio: await getBuffer(url), caption, mimetype: 'audio/mpeg', ...options }, { quoted, ...options });
            }
        } catch (e) {
            console.error('[⚠️] SendFileUrl error:', e.message);
            throw e;
        }
    };

    // --- Send Image as Sticker ---
    conn.sendImageAsSticker = async (jid, buff, options = {}) => {
        try {
            const { Sticker, StickerTypes } = require('wa-sticker-formatter');
            const sticker = new Sticker(buff, {
                pack: options.packname || config.STICKER_NAME || config.BOT_NAME,
                author: options.author || config.OWNER_NAME,
                type: StickerTypes.FULL,
                categories: options.categories || ['🤖'],
                quality: 70,
            });
            const stickerBuffer = await sticker.toBuffer();
            await conn.sendMessage(jid, { sticker: stickerBuffer }, options);
        } catch (e) {
            console.error('[⚠️] Image sticker error:', e.message);
            throw e;
        }
    };

    // --- Send Video as Sticker (FIXED!) ---
    conn.sendVideoAsSticker = async (jid, buff, options = {}) => {
        try {
            const { Sticker, StickerTypes } = require('wa-sticker-formatter');
            const sticker = new Sticker(buff, {
                pack: options.packname || config.STICKER_NAME || config.BOT_NAME,
                author: options.author || config.OWNER_NAME,
                type: StickerTypes.FULL,
                categories: options.categories || ['🤖'],
                quality: 50,
            });
            const stickerBuffer = await sticker.toBuffer();
            await conn.sendMessage(jid, { sticker: stickerBuffer }, options);
        } catch (e) {
            console.error('[⚠️] Video sticker error:', e.message);
            throw e;
        }
    };

    // --- Send Text ---
    conn.sendText = (jid, text, quoted = '', options = {}) => {
        return conn.sendMessage(jid, { text, ...options }, { quoted });
    };

    // --- Send Image ---
    conn.sendImage = async (jid, pathOrBuffer, caption = '', quoted = '', options = {}) => {
        let buffer = Buffer.isBuffer(pathOrBuffer) ? pathOrBuffer :
            /^https?:\/\//.test(pathOrBuffer) ? await getBuffer(pathOrBuffer) :
                fs.existsSync(pathOrBuffer) ? fs.readFileSync(pathOrBuffer) : Buffer.alloc(0);
        return conn.sendMessage(jid, { image: buffer, caption, ...options }, { quoted });
    };

    // --- Send Text With Mentions ---
    conn.sendTextWithMentions = async (jid, text, quoted, options = {}) => {
        return conn.sendMessage(jid, {
            text,
            contextInfo: {
                mentionedJid: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net')
            },
            ...options
        }, { quoted });
    };

    // --- Parse Mentions ---
    conn.parseMention = (text) => {
        return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net');
    };

    // --- Get File ---
    conn.getFile = async (PATH, save) => {
        try {
            let res;
            let data = Buffer.isBuffer(PATH) ? PATH :
                /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split(',')[1], 'base64') :
                    /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) :
                        fs.existsSync(PATH) ? fs.readFileSync(PATH) :
                            typeof PATH === 'string' ? PATH : Buffer.alloc(0);

            let type = await FileType.fromBuffer(data) || { mime: 'application/octet-stream', ext: '.bin' };
            let filename = path.join(tempDir, Date.now() + '.' + type.ext);
            if (data && save) fs.writeFileSync(filename, data);

            return {
                res,
                filename,
                size: data ? data.length : 0,
                ...type,
                data
            };
        } catch (e) {
            console.error('[⚠️] GetFile error:', e.message);
            throw e;
        }
    };

    // --- cMod ---
    conn.cMod = (jid, copy, text = '', sender = conn.user.id, options = {}) => {
        let mtype = Object.keys(copy.message)[0];
        let isEphemeral = mtype === 'ephemeralMessage';
        if (isEphemeral) mtype = Object.keys(copy.message.ephemeralMessage.message)[0];
        let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message;
        let content = msg[mtype];
        if (typeof content === 'string') msg[mtype] = text || content;
        else if (content.caption) content.caption = text || content.caption;
        else if (content.text) content.text = text || content.text;
        if (typeof content !== 'string') msg[mtype] = { ...content, ...options };
        if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
        if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid;
        else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid;
        copy.key.remoteJid = jid;
        copy.key.fromMe = sender === conn.user.id;
        return proto.WebMessageInfo.fromObject(copy);
    };

    // --- Serialize ---
    conn.serializeM = (mek) => sms(conn, mek, store);
}

// ============================================================
//  START BOT
// ============================================================
setTimeout(() => {
    connectToWA();
}, 3000);