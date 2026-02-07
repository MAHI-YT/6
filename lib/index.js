// ============================================================
//  DARKZONE-MD Library Index
//  Created By Irfan Ahmad
//  Clean exports — no missing/undefined functions
// ============================================================

const { DeletedText, DeletedMedia, AntiDelete } = require('./antidel');
const { DATABASE } = require('./database');
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson, empiretourl, shannzCdn } = require('./functions');
const { sms, downloadMediaMessage } = require('./msg');

module.exports = {
    // Anti-Delete
    DeletedText,
    DeletedMedia,
    AntiDelete,

    // Database
    DATABASE,

    // Utilities
    getBuffer,
    getGroupAdmins,
    getRandom,
    h2k,
    isUrl,
    Json,
    runtime,
    sleep,
    fetchJson,
    empiretourl,
    shannzCdn,

    // Message
    sms,
    downloadMediaMessage,
};