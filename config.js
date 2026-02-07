const fs = require('fs');
const path = require('path');

// Load environment variables
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

// ============================================================
//  DYNAMIC CONFIG SYSTEM (Replaces configdb.js — No native modules needed)
// ============================================================
const DYNAMIC_CONFIG_PATH = path.join(__dirname, 'assets', 'dynamic_config.json');

function getDynamic(key) {
    try {
        if (fs.existsSync(DYNAMIC_CONFIG_PATH)) {
            const data = JSON.parse(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf-8'));
            return data[key] !== undefined ? data[key] : null;
        }
    } catch (e) { }
    return null;
}

function setDynamic(key, value) {
    try {
        let data = {};
        if (fs.existsSync(DYNAMIC_CONFIG_PATH)) {
            data = JSON.parse(fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf-8'));
        }
        data[key] = value;
        const dir = path.dirname(DYNAMIC_CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(DYNAMIC_CONFIG_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('[Config] Error saving:', e.message);
        return false;
    }
}

module.exports = {
    // ==========================================
    //  BOT CORE SETTINGS
    // ==========================================
    SESSION_ID: process.env.SESSION_ID || "",
    PREFIX: getDynamic("PREFIX") || process.env.PREFIX || ".",
    BOT_NAME: getDynamic("BOT_NAME") || process.env.BOT_NAME || "DARKZONE-MD",
    MODE: getDynamic("MODE") || process.env.MODE || "public",
    BAILEYS: "@whiskeysockets/baileys",

    // ==========================================
    //  OWNER & DEVELOPER
    // ==========================================
    OWNER_NUMBER: process.env.OWNER_NUMBER || "923306137477",
    OWNER_NAME: getDynamic("OWNER_NAME") || process.env.OWNER_NAME || "Irfan Ahmad",
    DEV: process.env.DEV || "923306137477",

    // ==========================================
    //  AUTO-RESPONSE
    // ==========================================
    AUTO_REPLY: process.env.AUTO_REPLY || "false",
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || "*DARKZONE-MD VIEWED YOUR STATUS 🤖*",
    READ_MESSAGE: process.env.READ_MESSAGE || "false",
    REJECT_MSG: process.env.REJECT_MSG || "*📞 CALLS NOT ALLOWED*",
    CHATBOT: getDynamic("CHATBOT") || process.env.CHATBOT || "off",

    // ==========================================
    //  REACTIONS & STICKERS
    // ==========================================
    AUTO_REACT: process.env.AUTO_REACT || "false",
    OWNER_REACT: process.env.OWNER_REACT || "false",
    CUSTOM_REACT: process.env.CUSTOM_REACT || "false",
    CUSTOM_REACT_EMOJIS: getDynamic("CUSTOM_REACT_EMOJIS") || process.env.CUSTOM_REACT_EMOJIS || "💝,💖,💗,❤️‍🩹,❤️,🧡,💛,💚,💙,💜,🤎,🖤,🤍",
    STICKER_NAME: process.env.STICKER_NAME || "Irfan Ahmad",
    AUTO_STICKER: process.env.AUTO_STICKER || "false",

    // ==========================================
    //  MEDIA & AUTOMATION
    // ==========================================
    AUTO_RECORDING: process.env.AUTO_RECORDING || "false",
    AUTO_TYPING: process.env.AUTO_TYPING || "false",
    MENTION_REPLY: process.env.MENTION_REPLY || "false",
    MENU_IMAGE_URL: getDynamic("MENU_IMAGE_URL") || process.env.MENU_IMAGE_URL || "https://i.ibb.co/Sw4pzTWC/IMG-20260124-WA0728.jpg",

    // ==========================================
    //  SECURITY & ANTI-FEATURES
    // ==========================================
    ANTI_DELETE: process.env.ANTI_DELETE || "true",
    ANTI_CALL: process.env.ANTI_CALL || "false",
    ANTI_BAD: process.env.ANTI_BAD || "false",
    ANTI_LINK: process.env.ANTI_LINK || "true",
    ANTI_LINK_KICK: process.env.ANTI_LINK_KICK || "false",
    ANTI_VV: process.env.ANTI_VV || "true",
    DELETE_LINKS: process.env.DELETE_LINKS || "false",
    ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "same",
    ANTI_BOT: process.env.ANTI_BOT || "false",
    PM_BLOCKER: process.env.PM_BLOCKER || "false",

    // ==========================================
    //  BOT BEHAVIOR & APPEARANCE
    // ==========================================
    DESCRIPTION: process.env.DESCRIPTION || "*© Created By Irfan Ahmad*",
    ALWAYS_ONLINE: process.env.ALWAYS_ONLINE || "false",
    AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || "true",
    AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN || "true",
    AUTO_BIO: process.env.AUTO_BIO || "false",
    WELCOME: process.env.WELCOME || "false",
    GOODBYE: process.env.GOODBYE || "false",
    ADMIN_EVENTS: process.env.ADMIN_EVENTS || "false",
    REPO: "https://github.com/ERFAN-Md/DARKZONE-MD",

    // ==========================================
    //  DYNAMIC CONFIG FUNCTIONS (for plugins)
    // ==========================================
    getDynamic,
    setDynamic,
};