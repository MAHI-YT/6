// ═══════════════════════════════════════════════════════════
// 🗄️ DATABASE INDEX - DARKZONE-MD
// Export all database modules
// ═══════════════════════════════════════════════════════════

const { connectMongoDB, isMongoConnected, mongoose } = require('./mongodb');
const { 
    getGroupSetting, 
    setGroupSetting, 
    getAllGroupSettings,
    updateMultipleSettings,
    SettingsModel 
} = require('./settings');
const {
    checkLinkWarning,
    setLinkWarning,
    clearLinkWarning,
    WarningModel
} = require('./warnings');

module.exports = {
    // MongoDB Connection
    connectMongoDB,
    isMongoConnected,
    mongoose,
    
    // Group Settings
    getGroupSetting,
    setGroupSetting,
    getAllGroupSettings,
    updateMultipleSettings,
    SettingsModel,
    
    // User Warnings
    checkLinkWarning,
    setLinkWarning,
    clearLinkWarning,
    WarningModel
};
