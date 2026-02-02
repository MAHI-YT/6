// ═══════════════════════════════════════════════════════════
// ⚙️ GROUP SETTINGS DATABASE - DARKZONE-MD
// Persistent settings that survive bot restarts
// ═══════════════════════════════════════════════════════════

const { mongoose, isMongoConnected } = require('./mongodb');
const fs = require('fs');
const path = require('path');

// JSON fallback path
const settingsPath = path.join(__dirname, '../../database/settings.json');

// MongoDB Schema
const SettingsSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    antilink: { type: Boolean, default: false },
    antilinkMode: { type: Number, default: 1 },
    antibad: { type: Boolean, default: false },
    antibot: { type: Boolean, default: false },
    welcome: { type: Boolean, default: false },
    goodbye: { type: Boolean, default: false },
    autosticker: { type: Boolean, default: false },
    autoreply: { type: Boolean, default: false },
    antidelete: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const SettingsModel = mongoose.model('GroupSettings', SettingsSchema);

// ═══════════════════════════════════════════════════════════
// 📂 JSON FALLBACK FUNCTIONS
// ═══════════════════════════════════════════════════════════

function ensureJsonExists() {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, JSON.stringify({}), 'utf8');
    }
}

function loadJsonSettings() {
    try {
        ensureJsonExists();
        return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch {
        return {};
    }
}

function saveJsonSettings(data) {
    try {
        ensureJsonExists();
        fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch {
        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// 🔧 MAIN SETTINGS FUNCTIONS
// ═══════════════════════════════════════════════════════════

async function getGroupSetting(groupId, key) {
    try {
        if (isMongoConnected()) {
            const settings = await SettingsModel.findOne({ groupId });
            return settings ? settings[key] : null;
        } else {
            const data = loadJsonSettings();
            return data[groupId] ? data[groupId][key] : null;
        }
    } catch (error) {
        console.error('[Settings] Error getting:', error);
        return null;
    }
}

async function setGroupSetting(groupId, key, value) {
    try {
        if (isMongoConnected()) {
            await SettingsModel.findOneAndUpdate(
                { groupId },
                { [key]: value, updatedAt: new Date() },
                { upsert: true, new: true }
            );
            return true;
        } else {
            const data = loadJsonSettings();
            if (!data[groupId]) data[groupId] = {};
            data[groupId][key] = value;
            return saveJsonSettings(data);
        }
    } catch (error) {
        console.error('[Settings] Error setting:', error);
        return false;
    }
}

async function getAllGroupSettings(groupId) {
    try {
        if (isMongoConnected()) {
            const settings = await SettingsModel.findOne({ groupId });
            return settings ? settings.toObject() : {};
        } else {
            const data = loadJsonSettings();
            return data[groupId] || {};
        }
    } catch (error) {
        console.error('[Settings] Error getting all:', error);
        return {};
    }
}

async function updateMultipleSettings(groupId, settings) {
    try {
        if (isMongoConnected()) {
            await SettingsModel.findOneAndUpdate(
                { groupId },
                { ...settings, updatedAt: new Date() },
                { upsert: true, new: true }
            );
            return true;
        } else {
            const data = loadJsonSettings();
            data[groupId] = { ...data[groupId], ...settings };
            return saveJsonSettings(data);
        }
    } catch (error) {
        console.error('[Settings] Error updating multiple:', error);
        return false;
    }
}

module.exports = {
    getGroupSetting,
    setGroupSetting,
    getAllGroupSettings,
    updateMultipleSettings,
    SettingsModel
};
