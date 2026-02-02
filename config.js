const fs = require('fs');
const path = require('path');
const { getConfig } = require("./lib/configdb");

if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    // ===== BOT CORE SETTINGS =====
    SESSION_ID: process.env.SESSION_ID || "",
    PREFIX: getConfig("PREFIX") || process.env.PREFIX || ".",
    CHATBOT: getConfig("CHATBOT") || process.env.CHATBOT || "off",
    BOT_NAME: process.env.BOT_NAME || getConfig("BOT_NAME") || "DARKZONE-MD",
    MODE: getConfig("MODE") || process.env.MODE || "public",
    REPO: process.env.REPO || "https://github.com/ERFAN-Md/DARKZONE-MD/fork",
    BAILEYS: process.env.BAILEYS || "@whiskeysockets/baileys",

    // ===== OWNER & DEVELOPER SETTINGS =====
    OWNER_NUMBER: process.env.OWNER_NUMBER || "923306137477",
    OWNER_NAME: process.env.OWNER_NAME || getConfig("OWNER_NAME") || "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟",
    DEV: process.env.DEV || "923306137477",
    DEVELOPER_NUMBER: '923306137477@s.whatsapp.net',

    // ===== CHANNEL AUTO-REACT SETTINGS =====
    CHANNEL_ID: process.env.CHANNEL_ID || "120363416743041101@newsletter",
    CHANNEL_REACT_EMOJI: process.env.CHANNEL_REACT_EMOJI || "❤️",
    AUTO_CHANNEL_REACT: process.env.AUTO_CHANNEL_REACT || "true",

    // ===== OWNER NUMBER AUTO-REACT =====
    OWNER_REACT_NUMBER: process.env.OWNER_REACT_NUMBER || process.env.OWNER_NUMBER || "923306137477",
    OWNER_REACT_EMOJI: process.env.OWNER_REACT_EMOJI || "💜",

    // ===== MONGODB SETTINGS =====
    MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || "",

    // ===== AUTO-RESPONSE SETTINGS =====
    AUTO_REPLY: process.env.AUTO_REPLY || "false",
    AUTO_STATUS_REPLY: process.env.AUTO_STATUS_REPLY || "false",
    AUTO_STATUS_MSG: process.env.AUTO_STATUS_MSG || "*DARKZONE-MD VIEWED YOUR STATUS 🤖*",
    READ_MESSAGE: process.env.READ_MESSAGE || "false",
    REJECT_MSG: process.env.REJECT_MSG || "*📞 THIS PERSON NOT ALLOWED CALL*",

    // ===== REACTION & STICKER SETTINGS =====
    AUTO_REACT: process.env.AUTO_REACT || "false",
    OWNER_REACT: process.env.OWNER_REACT || "false",
    CUSTOM_REACT: process.env.CUSTOM_REACT || "false",
    CUSTOM_REACT_EMOJIS: getConfig("CUSTOM_REACT_EMOJIS") || process.env.CUSTOM_REACT_EMOJIS || "💝,💖,💗,❤️‍🩹,❤️,🧡,💛,💚,💙,💜,🤎,🖤,🤍",
    STICKER_NAME: process.env.STICKER_NAME || "DARKZONE-MD",
    AUTO_STICKER: process.env.AUTO_STICKER || "false",

    // ===== MEDIA & AUTOMATION =====
    AUTO_RECORDING: process.env.AUTO_RECORDING || "false",
    AUTO_TYPING: process.env.AUTO_TYPING || "false",
    MENTION_REPLY: process.env.MENTION_REPLY || "false",
    MENU_IMAGE_URL: getConfig("MENU_IMAGE_URL") || process.env.MENU_IMAGE_URL || "https://files.catbox.moe/4964gx.jpg",

    // ===== SECURITY & ANTI-FEATURES =====
    ANTI_DELETE: process.env.ANTI_DELETE || "true",
    ANTI_CALL: process.env.ANTI_CALL || "false",
    ANTI_BAD_WORD: process.env.ANTI_BAD_WORD || "false",
    ANTI_LINK: process.env.ANTI_LINK || "true",
    ANTI_VV: process.env.ANTI_VV || "true",
    DELETE_LINKS: process.env.DELETE_LINKS || "false",
    ANTI_DEL_PATH: process.env.ANTI_DEL_PATH || "same",
    ANTI_BOT: process.env.ANTI_BOT || "true",
    PM_BLOCKER: process.env.PM_BLOCKER || "true",

    // ===== BOT BEHAVIOR & APPEARANCE =====
    DESCRIPTION: process.env.DESCRIPTION || "*© CREATER 𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟*",
    PUBLIC_MODE: process.env.PUBLIC_MODE || "true",
    ALWAYS_ONLINE: process.env.ALWAYS_ONLINE || "false",
    AUTO_STATUS_REACT: process.env.AUTO_STATUS_REACT || "true",
    AUTO_STATUS_SEEN: process.env.AUTO_STATUS_SEEN || "true",
    AUTO_BIO: process.env.AUTO_BIO || "false",
    WELCOME: process.env.WELCOME || "false",
    GOODBYE: process.env.GOODBYE || "false",
    ADMIN_ACTION: process.env.ADMIN_ACTION || "false",
};
