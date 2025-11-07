const config = require('../config');
const { cmd } = require('../command');
const { runtime } = require('../lib/functions');
const os = require("os");
const path = require('path');
const axios = require('axios');
const fs = require('fs');

cmd({
    pattern: "menu3",
    desc: "menu the bot",
    category: "menu3",
    react: "⚡",
    filename: __filename
},
async (conn, mek, m, { from, sender, pushname, reply }) => {
    try {
        const dec = `╭━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} MENU*
╰━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║     📊 SYSTEM DATA  ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *⚙️ Mode*: ${config.MODE}
│ *📡 Platform*: Heroku
│ *🧠 Type*: NodeJs (Multi Device)
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🧾 Version*: 3.0.0 Beta
│ *🕒 Online*: ${runtime(process.uptime())}
├─────────────────────
╔══════════════════╗
║ *🗃️ COMMAND MENU*  ║
╚══════════════════╝
│ *📖 quranmenu*
│ *🕋 prayertime*
│ *🤖 aimenu*
│ *🎭 anmiemenu*
│ *😹 reactions*
│ *🔁 convertmenu*
│ *🎉 funmenu*
│ *⬇️ dlmenu*
│ *⚒️ listcmd*
│ *🏠 mainmenu*
│ *👥 groupmenu*
│ *📜 allmenu*
│ *👑 ownermenu*
│ *🧩 othermenu*
│ *🖌️ logo*
│ *📦 repo*
├─────────────────
│ *⌨️ DARKZONE-MD*
╰━━━━━━━━━━━━━━━━━╯
> ${config.DESCRIPTION}
`;

        await conn.sendMessage(
            from,
            {
                image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/8cb9h0.jpg' },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: config.BOT_NAME,
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );
        
    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e}`);
    }
});

cmd({
    pattern: "logo",
    alias: ["logomenu"],
    desc: "menu the bot",
    category: "menu",
    react: "🧃",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        let dec = `╭━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} LOGO MAKER*
╰━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║    📊 SYSTEM DATA  ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *🎨 Logo Commands*: 30
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├───────────────────
╔═════════════════╗
║   🗃️ LOGO DESIGNS  ║
╚═════════════════╝
│ *💡 neonlight*
│ *🎀 blackpink*
│ *🐉 dragonball*
│ *🎭 3dcomic*
│ *🇺🇸 america*
│ *🍥 naruto*
│ *😢 sadgirl*
│ *☁️ clouds*
│ *🚀 futuristic*
│ *📜 3dpaper*
│ *✏️ eraser*
│ *🌇 sunset*
│ *🍃 leaf*
│ *🌌 galaxy*
│ *💀 sans*
│ *💥 boom*
│ *💻 hacker*
│ *😈 devilwings*
│ *🇳🇬 nigeria*
│ *💡 bulb*
│ *👼 angelwings*
│ *♈ zodiac*
│ *💎 luxury*
│ *🎨 paint*
│ *❄️ frozen*
│ *🏰 castle*
│ *🖋️ tatoo*
│ *🔫 valorant*
│ *🐻 bear*
│ *🔠 typography*
│ *🎂 birthday*
├───────────────────
╰──────────────┈⊷`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/lpniig.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟",
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});

cmd({
    pattern: "reactions",
    desc: "Shows the reaction commands",
    category: "menu",
    react: "💫",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        let dec = `╭━━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} REACTIONS MENU*
╰━━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║ *REACTION COMMAND* ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *😊 Reaction Commands*: 26
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├─────────────────────
╔══════════════════╗
║   🗃️ *REACTIONS*    ║
╚══════════════════╝
│ *👊 bully @tag*
│ *🤗 cuddle @tag*
│ *😢 cry @tag*
│ *🤗 hug @tag*
│ *🐺 awoo @tag*
│ *💋 kiss @tag*
│ *👅 lick @tag*
│ *🖐️ pat @tag*
│ *😏 smug @tag*
│ *🔨 bonk @tag*
│ *🚀 yeet @tag*
│ *😊 blush @tag*
│ *😄 smile @tag*
│ *👋 wave @tag*
│ *✋ highfive @tag*
│ *🤝 handhold @tag*
│ *🍜 nom @tag*
│ *🦷 bite @tag*
│ *🤗 glomp @tag*
│ *👋 slap @tag*
│ *💀 kill @tag*
│ *😊 happy @tag*
│ *😉 wink @tag*
│ *👉 poke @tag*
│ *💃 dance @tag*
│ *😬 cringe @tag*
├────────────────
╰──────────────┈⊷
> ${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/nzrl2y.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
                        serverMessageId: 144
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});

// dlmenu

cmd({
    pattern: "dlmenu",
    desc: "menu the bot",
    category: "menu",
    react: "⤵️",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        let dec = `╭━━━━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} DOWNLOAD MENU*
╰━━━━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║   *📊 DL-MENU*  ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *📥 Download Commands*: 44
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├─────────────────────
╔═════════════════╗
║ *🗃️ DOWNLOAD TOOLS*║
╚═════════════════╝
│ *🟦 facebook*
│ *📁 mediafire*
│ *🎵 tiktok*
│ *🐦 twitter*
│ *📷 insta*
│ *📦 apk*
│ *🖼️ img*
│ *▶️ tt2*
│ *📌 pins*
│ *🔄 apk2*
│ *🔵 fb2*
│ *📍 pinterest*
│ *🎶 spotify*
│ *🎧 play*
│ *🎧 play2*
│ *🎧 play3*
│ *🎧 play4*
│ *🎧 play5*
│ *🎧 play6*
│ *🎧 play7*
│ *🎧 play8*
│ *🎧 play9*
│ *🎧 play10*
│ *🔉 audio*
│ *🎬 video*
│ *🎬 video2*
│ *🎬 video3*
│ *🎬 video4*
│ *🎬 video5*
│ *🎬 video6*
│ *🎬 video7*
│ *🎬 video8*
│ *🎬 video9*
│ *🎬 video10*
│ *🎵 ytmp3*
│ *📹 ytmp4*
│ *🎶 song*
│ *🎬 darama*
│ *☁️ gdrive*
│ *🌐 ssweb*
│ *🎵 tiks*
├─────────────────
╰━━━━━━━━━━━━━━━━━━╯
> ${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/1fzuzh.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});

// group menu

cmd({
    pattern: "groupmenu",
    desc: "menu the bot",
    category: "menu",
    react: "⤵️",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try
       {
        let dec = `╭━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} GROUP MENU*
╰━━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║     *📊 GROUP-CMD* ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *👥 Group Commands*: 37
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├─────────────────────
╔══════════════════╗
║ 🗃️ *GROUP TOOLS*   ║
╚══════════════════╝
│ *🔗 grouplink*
│ *🚪 kickall*
│ *🚷 kickall2*
│ *🚫 kickall3*
│ *➕ add*
│ *➖ remove*
│ *👢 kick*
│ *⬆️ promote*
│ *⬇️ demote*
│ *🚮 dismiss*
│ *🔄 revoke*
│ *👋 setgoodbye*
│ *🎉 setwelcome*
│ *🗑️ delete*
│ *🖼️ getpic*
│ *ℹ️ ginfo*
│ *⏳ disappear on*
│ *⏳ disappear off*
│ *⏳ disappear 7D,24H*
│ *📝 allreq*
│ *✏️ updategname*
│ *📝 updategdesc*
│ *📩 joinrequests*
│ *📨 senddm*
│ *🏃 nikal*
│ *🔇 mute*
│ *🔊 unmute*
│ *🔒 lockgc*
│ *🔓 unlockgc*
│ *📩 invite*
│ *#️⃣ tag*
│ *🏷️ hidetag*
│ *@️⃣ tagall*
│ *👔 tagadmins*
├──────────────────
╰━━━━━━━━━━━━━━━━━━╯
> ${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/4964gx.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});

// fun menu

cmd({
    pattern: "funmenu",
    desc: "menu the bot",
    category: "menu",
    react: "😎",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {

        let dec = `╭━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} FUN MENU*
╰━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║     *📊 FUN-CMD*  ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *🎮 Fun Commands*: 24
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├───────────────────
╔══════════════════╗
║  *🗃️ FUN & GAMES*   ║
╚══════════════════╝
│ *🤪 shapar*
│ *⭐ rate*
│ *🤬 insult*
│ *💻 hack*
│ *💘 ship*
│ *🎭 character*
│ *💌 pickup*
│ *😆 joke*
│ *❤️ hrt*
│ *😊 hpy*
│ *😔 syd*
│ *😠 anger*
│ *😳 shy*
│ *💋 kiss*
│ *🧐 mon*
│ *😕 cunfuzed*
│ *🖼️ setpp*
│ *✋ hand*
│ *🏃 nikal*
│ *🤲 hold*
│ *🤗 hug*
│ *🎵 hifi*
│ *👉 poke*
├───────────────────
╰━━━━━━━━━━━━━━━━━━━╯
> ${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/lpniig.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});

// other menu

cmd({
    pattern: "othermenu",
    desc: "menu the bot",
    category: "menu",
    react: "🤖",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        let dec = `╭━━━━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} OTHER MENU*
╰━━━━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║  📊 *SYSTEM DATA*  ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *🛠️ Utility Commands*: 30
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├───────────────────
╔══════════════════╗
║    🗃️ *UTILITY TOOLS* ║
╚══════════════════╝
│ *🕒 timenow*
│ *📅 date*
│ *🔢 count*
│ *🧮 calculate*
│ *🔢 countx*
│ *🎲 flip*
│ *🪙 coinflip*
│ *🎨 rcolor*
│ *🎲 roll*
│ *ℹ️ fact*
│ *💻 cpp*
│ *🎲 rw*
│ *💑 pair*
│ *💑 pair2*
│ *💑 pair3*
│ *✨ fancy*
│ *🎨 logo <text>*
│ *📖 define*
│ *📰 news*
│ *🎬 movie*
│ *☀️ weather*
│ *📦 srepo*
│ *🤬 insult*
│ *💾 save*
│ *🌐 wikipedia*
│ *🔑 gpass*
│ *👤 githubstalk*
│ *🔍 yts*
│ *📹 ytv*
├────────────────
╰━━━━━━━━━━━━━━━━╯
> ${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/nzrl2y.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});

// main menu

cmd({
    pattern: "mainmenu",
    desc: "menu the bot",
    category: "menu",
    react: "🗿",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        let dec = `╭━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} MAIN MENU*
╰━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║   📊 *SYSTEM DATA*  ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *🏠 Main Commands*: 10
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├──────────────────
╔══════════════════╗
║  *🗃️ MAIN CONTROLS* ║
╚══════════════════╝
│ *🏓 ping*
│ *📡 live*
│ *💚 alive*
│ *⏱️ runtime*
│ *⏳ uptime*
│ *📦 repo*
│ *👑 owner*
│ *📜 menu*
│ *📜 menu2*
│ *🔄 restart*
├──────────────────
╰━━━━━━━━━━━━━━━━━━╯
> ${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/1fzuzh.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});

// owner menu

cmd({
    pattern: "ownermenu",
    desc: "menu the bot",
    category: "menu",
    react: "🔰",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        let dec = `╭━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} OWNER MENU*
╰━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║  *📊 OWN-MENU* ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *⚙️ Owner Commands*: 17
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├──────────────────
╔══════════════════╗
║ *🗃️ OWNER CONTROLS*
╚══════════════════╝
│ *👑 owner*
│ *📜 menu*
│ *📜 menu2*
│ *📋 listcmd*
│ *📚 allmenu*
│ *📦 repo*
│ *🚫 block*
│ *✅ unblock*
│ *🖼️ fullpp*
│ *🖼️ setpp*
│ *🔄 restart*
│ *⏹️ shutdown*
│ *🔄 updatecmd*
│ *💚 alive*
│ *🏓 ping*
│ *🆔 gjid*
│ *🆔 jid*
├──────────────────
╰━━━━━━━━━━━━━━━━━━╯
> ${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/1fzuzh.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});

// convert menu

cmd({
    pattern: "convertmenu",
    desc: "menu the bot",
    category: "menu",
    react: "🥀",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        let dec = `╭━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} CONVERT MENU*
╰━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║  *📊 SYSTEM DATA*  ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *🔄 Convert Commands*: 19
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├─────────────────────
╔══════════════════╗
║  *🗃️ CONVERT TOOLS* ║
╚══════════════════╝
│ *🏷️ sticker*
│ *🏷️ sticker2*
│ *😀 emojimix*
│ *✨ fancy*
│ *🖼️ take*
│ *🎵 tomp3*
│ *🗣️ tts*
│ *🌐 trt*
│ *🔢 base64*
│ *🔠 unbase64*
│ *010 binary*
│ *🔤 dbinary*
│ *🔗 tinyurl*
│ *🌐 urldecode*
│ *🌐 urlencode*
│ *🌐 url*
│ *🔁 repeat*
│ *❓ ask*
│ *📖 readmore*
├─────────────────
╰━━━━━━━━━━━━━━━━━━╯
> ${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/4964gx.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});


// anmie menu 

cmd({
    pattern: "animemenu",
    desc: "menu the bot",
    category: "menu",
    react: "🧚",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
          let dec = `╭━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} ANIME MENU*
╰━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║   *📊 ANI-MENU*  ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *🎎 Anime Commands*: 26
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├─────────────────────
╔══════════════════╗
║  *🗃️ ANIME CONTENT* 
╚══════════════════╝
│ *🤬 fack*
│ *🐶 dog*
│ *🐺 awoo*
│ *👧 garl*
│ *👰 waifu*
│ *🐱 neko*
│ *🧙 megnumin*
│ *👗 maid*
│ *👧 loli*
│ *🎎 animegirl*
│ *🎎 animegirl1*
│ *🎎 animegirl2*
│ *🎎 animegirl3*
│ *🎎 animegirl4*
│ *🎎 animegirl5*
│ *🎬 anime1*
│ *🎬 anime2*
│ *🎬 anime3*
│ *🎬 anime4*
│ *🎬 anime5*
│ *📰 animenews*
│ *🦊 foxgirl*
│ *🍥 naruto*
├──────────────────
╰━━━━━━━━━━━━━━━━━━╯
> ${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/lpniig.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});


// ai menu 

cmd({
    pattern: "aimenu",
    desc: "menu the bot",
    category: "menu",
    react: "🤖",
    filename: __filename
}, 
async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply }) => {
    try {
        let dec = `╭━━━━━━━━━━━━━━━━━━╮
    *${config.BOT_NAME} AI MENU*
╰━━━━━━━━━━━━━━━━━━━╯
╔══════════════════╗
║     *📊 AI-MENU*  ║
╚══════════════════╝
│ *👑 Owner*: ${config.OWNER_NAME}
│ *🤖 AI Commands*: 17
│ *⌨️ Prefix*: ${config.PREFIX}
│ *🕒 Online*: ${runtime(process.uptime())}
├─────────────────────
╔══════════════════╗
║    *🗃️ AI TOOLS*      ║
╚══════════════════╝
│ *🧠 ai*
│ *🤖 gpt3*
│ *🤖 gpt2*
│ *🤖 gptmini*
│ *🤖 gpt*
│ *🔵 meta*
│ *📦 blackbox*
│ *🌈 luma*
│ *🎧 dj*
│ *🌙 dark*
│ *👑 erfan*
│ *🧠 gpt4*
│ *🔍 bing*
│ *🎨 imagine*
│ *🖼️ imagine2*
│ *🤖 copilot*
├──────────────────
╰━━━━━━━━━━━━━━━━━━╯
> ${config.DESCRIPTION}`;

        await conn.sendMessage(
            from,
            {
                image: { url: `https://files.catbox.moe/nzrl2y.jpg` },
                caption: dec,
                contextInfo: {
                    mentionedJid: [m.sender],
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363416743041101@newsletter',
                        newsletterName: '𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟',
                        serverMessageId: 143
                    }
                }
            },
            { quoted: mek }
        );

    } catch (e) {
        console.log(e);
        reply(`${e}`);
    }
});
