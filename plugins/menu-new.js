const fs = require('fs');
const config = require('../config');
const { cmd, commands } = require('../command');
const { runtime } = require('../lib/functions');
const axios = require('axios');

cmd({
    pattern: "menu",
    desc: "Show interactive menu system",
    category: "menu",
    react: "🧾",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        // Count total commands
        const totalCommands = Object.keys(commands).length;
        
        const menuCaption = `╭━━━〔 *${config.BOT_NAME}* 〕━━━┈⊷
╔═══════◇◆◇═══════╗
『𝗨𝗟𝗧𝗜𝗠𝗔𝗧𝗘 𝗕𝗢𝗧 𝗠𝗘𝗡𝗨』
╚═══════◇◆◇═══════╝
⟬★⟭────────────────
⟬★⟭ 𝗕𝗢𝗧 𝗜𝗡𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡
⟬★⟭────────────────
│ 👑  Owner » *ERFAN*
│ 🤖  Baileys » *Multi Device*
│ 💻  Type » *NodeJs*
│ 🚀  Platform » *Heroku*
│ ⚙️  Mode » *[public]*
│ 🔣  Prefix » *[.]*
│ 🏷️  creater » *ERFAN AHMAD*
│ 📚  Commands » *332*
⟬★⟭─────────────────
╔═══◇◆◇════════════╗
『 📜 𝗠𝗘𝗡𝗨 𝗦𝗘𝗖𝗧𝗜𝗢𝗡𝗦 』
╚═══◇◆◇════════════╝
│ 1️⃣  📥 *Download Menu*
│ 2️⃣  👥 *Group Menu*
│ 3️⃣  😄 *Fun Menu*
│ 4️⃣  👑 *Owner Menu*
│ 5️⃣  🤖 *AI Menu*
│ 6️⃣  🎎 *Anime Menu*
│ 7️⃣  🔄 *Convert Menu*
│ 8️⃣  📌 *Other Menu*
│ 9️⃣  💞 *Reactions Menu*
│ 🔟  🏠 *Main Menu*
───────────────────
╔════◇◆◇══════════╗
『📥 *𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 𝗠𝗘𝗡𝗨* 』
╚════◇◆◇══════════╝
[ *SYSTEM* *CORE* *STAB* *Initializing*..]
├── 🌐 𝗦𝗼𝗰𝗶𝗮𝗹 𝗠𝗲𝗱𝗶𝗮
│   ├─ *facebook* [url]
│   ├─ *download* [url]
│   ├─ *mediafire* [url]
│   ├─ *tiktok* [url]
│   ├─ *twitter* [url]
│   ├─ *insta* [url]
│   ├─ *apk* [app]
│   ├─ *img* [query]
│   ├─ *tt2* [url]
│   ├─ *pins* [url]
│   ├─ *apk2* [app]
│   ├─ *fb2* [url]
│   └─ *pinterest* [url]
├── 🎵 *𝗠𝘂𝘀𝗶𝗰/𝗩𝗶𝗱𝗲𝗼*
│   ├─ *spotify* [query]
│   ├─ *play* [song]
│   ├─ *play2-10* [song]
│   ├─ *audio* [url]
│   ├─ *video* [url]
│   ├─ *video2-10* [url]
│   ├─ *ytmp3* [url]
│   ├─ *ytmp4* [url]
│   ├─ *song* [name]
│   └─ *darama* [name]
[+] *Payload Ready* ✔
──────────────────
╔════◇◆◇══════════╗
 『 👥 *𝗚𝗥𝗢𝗨𝗣 𝗠𝗘𝗡𝗨* 』
╚════◇◆◇══════════╝
╭━[🌡️*𝗠𝗔𝗡𝗔𝗚𝗘𝗠𝗘𝗡𝗧* ]━━╮
│ • *grouplink*
│ • *kickall*
│ • *kickall2*
│ • *kickall3*
│ • *add @user*
│ • *remove @user*
│ • *kick @user*
╰━━━━━━━━━━━━━━━━━╯
╭─━⚡*𝗔𝗗𝗠𝗜𝗡 𝗧𝗢𝗢𝗟𝗦* ─━╮
│ • *promote* @user
│ • *demote* @user
│ • *dismiss*
│ • *revoke*
│ • *mute* [time]
│ • *unmute*
│ • *lockgc*
│ • *unlockgc*
│ • *groupdp*
╰─────────────────╯
╔══〔 🏷️ *𝗧𝗔𝗚𝗚𝗜𝗡𝗚* 〕══╗
│ • *tag* @user
│ • *hidetag* [msg]
│ • *tagall*
│ • *tagadmins*
│ • *invite*
╚═════════════════╝
╔══════◇◆◇═════════╗
  『  *𝗙𝗨𝗡 𝗠𝗘𝗡𝗨* 』
╚══════◇◆◇═════════╝
╔🎭*𝗜𝗡𝗧𝗘𝗥𝗔𝗖𝗧𝗜𝗩𝗘 𝗠𝗘𝗡𝗨* ╗
│ • *shapar*
│ • *rate* @user
│ • *insult* @user
│ • *hack* @user
│ • *ship* @user1 @user2
│ • *character*
│ • *pickup*
│ • *joke*
╚═════════════════╝
───────────────────
╔═👿 *𝗥𝗘𝗔𝗖𝗧𝗜𝗢𝗡𝗘 𝗠𝗘𝗡𝗨*═╗
│ • *love*
│ • *happy*
│ • *sad*
│ • *hot*
│ • *heart*
│ • *shy*
│ • *beautiful*
│ • *cunfuzed*
│ • *mon*
│ • *kiss*
│ • *broke*
│ • *hurt*
╚═════════════════╝
───────────────────
╔════◇◆◇══════════╗
 『  *𝗢𝗪𝗡𝗘𝗥 𝗠𝗘𝗡𝗨* 
╚════◇◆◇══════════╝
╔══ 💗 *𝗨𝘀𝗘𝗥 𝗠𝗘𝗡𝗨* ══╗
│ • *Restricted Commands*
│ • *block*
│ • *unblock*
│ • *fullpp*
│ • *setpp*
│ • *restart*
│ • *shutdown*
│ • *updatecmd*
╚═════════════════╝
╔══ ⚠️ *𝗜𝗡𝗙𝗢 𝗧𝗢𝗢𝗟𝗦* ══╗
│ • *gjid*
│ • *jid*
│ • *listcmd*
│ • *allmenu*
╚═════════════════╝
╔═══🔑 *𝗔𝗜 𝗠𝗘𝗡𝗨* ════╗
│ •  💬 *Chat AI*
│ • *ai*
│ • *gpt3*
│ • *gpt2*
│ • *gpt*
│ • *gptmini*
│ • *meta*
│ • *bard*
│ • *felo*
│ • *gita*
╚═════════════━═══╝
╔══◇ *𝗜𝗠𝗚 𝗠𝗘𝗡𝗨* ◇══╗
‎│ ╭──────────────
‎│ │ . *image*
‎│ │ • *imagine l[text]*
‎│ │ • *imagine2 [text]*
‎│ │ • *aiart*
‎│ ╰──────────────
‎│ ╭──────────────
‎│ │ 🔍 *Specialized*
‎│ │ • *blackbox* [query]
‎│ │ • *luma* [query]
‎│ │ • *dj* [query]
‎│ │ • *irfan* [query]
‎│ │ • *colorize*
‎│ │ • *watermark*
‎│ │ • *profilecard*
‎│ ╰──────────────
‎╚═════════════════╝
╔═════◇◆◇═════════╗
  『  *𝗔𝗡𝗜𝗠𝗘 𝗠𝗘𝗡𝗨* 』
╚═════◇◆◇═════════╝
╔═ 🎭 *𝗔𝗡𝗜𝗠𝗘 𝗠𝗘𝗡𝗨* ══╗
│ •  *Images*
│ • *fack*
│ • *dog*
│ • *awoo*
│ • *garl*
│ • *waifu*
‎│ • *neko*
│ • *megnumin*
│ • *maid*
│ • *loli*
╚════════════════╝
╔ *𝗖H𝗔𝗥𝗔𝗖𝗧𝗘𝗥S 𝗠𝗘𝗡𝗨* ╗
│ • *animegirl*
│ • *animegirl1-5*
│ • *anime1-5*
‎│ • *foxgirl*
│ • *naruto*
╚════════════════╝
╔═ *𝗖𝗢𝗡𝗩𝗘𝗥𝗧 𝗠𝗘𝗡𝗨* ═══╗
│ • *Media Conversion*
│ • *sticker* [img]
│ • *sticker2* [img]
│ • *emojimix* 😎+😂
│ • *take* [name,text]
│ • *tomp3* [video]
╔═🎭 *Text Tools* ═╗
│ • *fancy* [text]
│ • *tts* [text] 
│ • *trt* [text]
│ • *base64* [text]
│ • *unbase64* [text]
╚═════════════════╝
╔════◇◆◇══════════╗
『  *𝗢𝗧H𝗘𝗥 𝗠𝗘𝗡𝗨* 』
╚════◇◆◇══════════╝
╔═ 🎭 *𝗢𝗧H𝗘𝗥 𝗠𝗘𝗡𝗨* ══╗
│ • *timenow*  
│ • *date* 
│ • *count* [num]  
│ • *calculate* [expr]  
│ • *countx*
‎│ • *country*
‎│ • *currency*
╚═════════════════╝
╔═══ 🎭 *𝗥𝗘𝗡D𝗢𝗠* ════╗
│ • *flip*
│ • *coinflip*  
│ • *rcolor*  
│ • *roll*  
│ • *fact*
╚═════════════════╝
╔══🎭 *SEARCH* 🔎 ═══╗
│ • *define* [word]  
│ • *news* [query]  
│ • *movie* [name]  
│ • *weather* [loc]   
╚═════════════════╝
╔═════◇◆◇═════════╗
 『 *𝗥𝗘𝗔𝗖𝗧I𝗢𝗡 𝗠𝗘𝗡𝗨* 』
╚═════◇◆◇═════════╝
╔══ 🎭 *𝗔𝗙𝗙𝗘𝗖𝗧I𝗢𝗡*  ══╗
│ • *cuddle* @user  
│ • *hug* @user  
│ • *kiss* @user  
│ • *lick* @user  
│ • *pat* @user  
╚═════════════════╝
╔════ 🎭 *𝗙U𝗡𝗡Y* ════╗
│ • *bully* @user  
│ • *bonk* @user  
│ • *yeet* @user  
│ • *slap* @user  
│ • *kill* @user  
╚═════════════════╝
╔═ 🎭 *EXPRESSIONS* ═╗
│ • *blush* @user  
│ • *smile* @user  
│ • *happy* @user  
│ • *wink* @user  
│ • *poke* @user  
╚═════════════════╝
╔════◇◆◇══════════╗
『  *𝗠𝗔I𝗡 𝗠𝗘𝗡𝗨* 』
╚════◇◆◇══════════╝
╔═══🎭 *𝗕𝗢𝗧 𝗜𝗡𝗙𝗢*  ═══╗
│ • *ping*
‎│ • *live*
‎│ • *alive*
‎│ • *runtime*
│ • *uptime*
‎│ • *repo*
‎│ • *owner*
│ • *bio*
╚═════════════════╝
╔═══════◇◆◇═══════╗
『✨*𝗕𝗢𝗧 𝗖𝗢𝗡𝗧𝗥𝗢𝗟𝗦*✨ 』
╚═══════◇◆◇═══════╝
⟦★⟧────────────────
│ • *menu*
│ • *menu2*
│ • *restart*
⟦★⟧────────────────
> ${config.DESCRIPTION}`;

        const contextInfo = {
            mentionedJid: [m.sender],
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: '120363416743041101@newsletter',
                newsletterName: config.OWNER_NAME,
                serverMessageId: 143
            }
        };

        // Function to send menu image with timeout
        const sendMenuImage = async () => {
            try {
                return await conn.sendMessage(
                    from,
                    {
                        image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/8cb9h0.jpg' },
                        caption: menuCaption,
                        contextInfo: contextInfo
                    },
                    { quoted: mek }
                );
            } catch (e) {
                console.log('Image send failed, falling back to text');
                return await conn.sendMessage(
                    from,
                    { text: menuCaption, contextInfo: contextInfo },
                    { quoted: mek }
                );
            }
        };

        // Send image with timeout
        let sentMsg;
        try {
            sentMsg = await Promise.race([
                sendMenuImage(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Image send timeout')), 10000))
            ]);
        } catch (e) {
            console.log('Menu send error:', e);
            sentMsg = await conn.sendMessage(
                from,
                { text: menuCaption, contextInfo: contextInfo },
                { quoted: mek }
            );
        }
        
        const messageID = sentMsg.key.id;

        // Menu data (complete version)
        const menuData = {
            '1': {
                title: "📥 *Download Menu* 📥",
                content: `╭━━━━━━━━━━━━━━━━━━━━━╮
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
> ${config.DESCRIPTION}`,
                image: true
            },
            '2': {
                title: "👥 *Group Menu* 👥",
                content: `╭━━━━━━━━━━━━━━━━━━╮
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
> ${config.DESCRIPTION}`,
                image: true
            },
            '3': {
                title: "😄 *Fun Menu* 😄",
                content: `╭━━━━━━━━━━━━━━━━━━╮
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
> ${config.DESCRIPTION}`,
                image: true
            },
            '4': {
                title: "👑 *Owner Menu* 👑",
                content: `╭━━━━━━━━━━━━━━━━━━━━━╮
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
> ${config.DESCRIPTION}`,
                image: true
            },
            '5': {
                title: "🤖 *AI Menu* 🤖",
                content: `╭━━━━━━━━━━━━━━━━━━╮
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
> ${config.DESCRIPTION}`,
                image: true
            },
            '6': {
                title: "🎎 *Anime Menu* 🎎",
                content: `╭━━━━━━━━━━━━━━━━━━╮
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
> ${config.DESCRIPTION}`,
                image: true
            },
            '7': {
                title: "🔄 *Convert Menu* 🔄",
                content: `╭━━━━━━━━━━━━━━━━━━╮
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
> ${config.DESCRIPTION}`,
                image: true
            },
            '8': {
                title: "📌 *Other Menu* 📌",
                content: `╭━━━〔 *Other Menu* 〕━━━┈⊷
┃★╭──────────────
┃★│ 🕒 *Utilities*
┃★│ • timenow
┃★│ • date
┃★│ • count [num]
┃★│ • calculate [expr]
┃★│ • countx
┃★╰──────────────
┃★╭──────────────
┃★│ 🎲 *Random*
┃★│ • flip
┃★│ • coinflip
┃★│ • rcolor
┃★│ • roll
┃★│ • fact
┃★╰──────────────
┃★╭──────────────
┃★│ 🔍 *Search*
┃★│ • define [word]
┃★│ • news [query]
┃★│ • movie [name]
┃★│ • weather [loc]
┃★╰──────────────
╰━━━━━━━━━━━━━━━┈⊷
> ${config.DESCRIPTION}`,
                image: true
            },
            '9': {
                title: "💞 *Reactions Menu* 💞",
                content: `╭━━━━━━━━━━━━━━━━━━━╮
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
> ${config.DESCRIPTION}`,
                image: true
            },
            '10': {
                title: "🏠 *Main Menu* 🏠",
                content: `╭━━━━━━━━━━━━━━━━━━╮
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
> ${config.DESCRIPTION}`,
                image: true
            }
        };

        // Message handler with improved error handling
        const handler = async (msgData) => {
            try {
                const receivedMsg = msgData.messages[0];
                if (!receivedMsg?.message || !receivedMsg.key?.remoteJid) return;

                const isReplyToMenu = receivedMsg.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;
                
                if (isReplyToMenu) {
                    const receivedText = receivedMsg.message.conversation || 
                                      receivedMsg.message.extendedTextMessage?.text;
                    const senderID = receivedMsg.key.remoteJid;

                    if (menuData[receivedText]) {
                        const selectedMenu = menuData[receivedText];
                        
                        try {
                            if (selectedMenu.image) {
                                await conn.sendMessage(
                                    senderID,
                                    {
                                        image: { url: config.MENU_IMAGE_URL || 'https://files.catbox.moe/8cb9h0.jpg' },
                                        caption: selectedMenu.content,
                                        contextInfo: contextInfo
                                    },
                                    { quoted: receivedMsg }
                                );
                            } else {
                                await conn.sendMessage(
                                    senderID,
                                    { text: selectedMenu.content, contextInfo: contextInfo },
                                    { quoted: receivedMsg }
                                );
                            }

                            await conn.sendMessage(senderID, {
                                react: { text: '✅', key: receivedMsg.key }
                            });

                        } catch (e) {
                            console.log('Menu reply error:', e);
                            await conn.sendMessage(
                                senderID,
                                { text: selectedMenu.content, contextInfo: contextInfo },
                                { quoted: receivedMsg }
                            );
                        }

                    } else {
                        await conn.sendMessage(
                            senderID,
                            {
                                text: `❌ *Invalid Option!* ❌\n\nPlease reply with a number between 1-10 to select a menu.\n\n*Example:* Reply with "1" for Download Menu\n\n> ${config.DESCRIPTION}`,
                                contextInfo: contextInfo
                            },
                            { quoted: receivedMsg }
                        );
                    }
                }
            } catch (e) {
                console.log('Handler error:', e);
            }
        };

        // Add listener
        conn.ev.on("messages.upsert", handler);

        // Remove listener after 5 minutes
        setTimeout(() => {
            conn.ev.off("messages.upsert", handler);
        }, 300000);

    } catch (e) {
        console.error('Menu Error:', e);
        try {
            await conn.sendMessage(
                from,
                { text: `❌ Menu system is currently busy. Please try again later.\n\n> ${config.DESCRIPTION}` },
                { quoted: mek }
            );
        } catch (finalError) {
            console.log('Final error handling failed:', finalError);
        }
    }
});
