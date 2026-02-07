// ============================================================
//  DARKZONE-MD Data Layer Index
//  Created By Irfan Ahmad
//  ALL exports verified — no undefined functions
// ============================================================

const {
    AntiDelDB,
    initializeAntiDeleteSettings,
    setAnti,
    getAnti,
    getAllAntiDeleteSettings,
} = require('./antidel');

const {
    saveContact,
    getContacts,
    loadMessage,
    getName,
    getChatSummary,
    saveGroupMetadata,
    getGroupMetadata,
    saveMessageCount,
    getInactiveGroupMembers,
    getGroupMembersMessageCount,
    saveMessage,
} = require('./store');

module.exports = {
    // Anti-Delete
    AntiDelDB,
    initializeAntiDeleteSettings,
    setAnti,
    getAnti,
    getAllAntiDeleteSettings,

    // Store
    saveContact,
    getContacts,
    loadMessage,
    getName,
    getChatSummary,
    saveGroupMetadata,
    getGroupMetadata,
    saveMessageCount,
    getInactiveGroupMembers,
    getGroupMembersMessageCount,
    saveMessage,
};