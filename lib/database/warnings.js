// ═══════════════════════════════════════════════════════════
// ⚠️ USER WARNINGS DATABASE - DARKZONE-MD
// Anti-Link warning system with 10-minute reset
// ═══════════════════════════════════════════════════════════

const { mongoose, isMongoConnected } = require('./mongodb');
const fs = require('fs');
const path = require('path');

// JSON fallback path
const warningsPath = path.join(__dirname, '../../database/warnings.json');

// MongoDB Schema
const WarningSchema = new mongoose.Schema({
    odId: { type: String, required: true, unique: true }, // groupId_odId
    odId: String,
    groupId: String,
    odId: String,
    odCount: { type: Number, default: 0 },
    linkWarning: { type: Boolean, default: false },
    linkWarningTime: { type: Date, default: null },
    badwordCount: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const WarningModel = mongoose.model('UserWarning', WarningSchema);

// ═══════════════════════════════════════════════════════════
// 📂 JSON FALLBACK
// ═══════════════════════════════════════════════════════════

function ensureJsonExists() {
    const dir = path.dirname(warningsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(warningsPath)) fs.writeFileSync(warningsPath, '{}', 'utf8');
}

function loadWarnings() {
    try {
        ensureJsonExists();
        return JSON.parse(fs.readFileSync(warningsPath, 'utf8'));
    } catch { return {}; }
}

function saveWarnings(data) {
    try {
        ensureJsonExists();
        fs.writeFileSync(warningsPath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch { return false; }
}

// ═══════════════════════════════════════════════════════════
// 🔗 ANTI-LINK WARNING SYSTEM (10 minute reset)
// ═══════════════════════════════════════════════════════════

const WARNING_TIMEOUT = 10 * 60 * 1000; // 10 minutes

async function checkLinkWarning(groupId, userId) {
    const odId = `${groupId}_${odId}`;
    
    try {
        if (isMongoConnected()) {
            const warning = await WarningModel.findOne({ odId });
            
            if (!warning || !warning.linkWarning) {
                return { hasWarning: false, shouldKick: false };
            }
            
            const timePassed = Date.now() - new Date(warning.linkWarningTime).getTime();
            
            if (timePassed > WARNING_TIMEOUT) {
                // Warning expired, reset
                await WarningModel.findOneAndUpdate(
                    { odId },
                    { linkWarning: false, linkWarningTime: null }
                );
                return { hasWarning: false, shouldKick: false };
            }
            
            // Warning still active = should kick
            return { hasWarning: true, shouldKick: true };
            
        } else {
            // JSON fallback
            const data = loadWarnings();
            const key = odId;
            
            if (!data[key] || !data[key].linkWarning) {
                return { hasWarning: false, shouldKick: false };
            }
            
            const timePassed = Date.now() - data[key].linkWarningTime;
            
            if (timePassed > WARNING_TIMEOUT) {
                data[key].linkWarning = false;
                data[key].linkWarningTime = null;
                saveWarnings(data);
                return { hasWarning: false, shouldKick: false };
            }
            
            return { hasWarning: true, shouldKick: true };
        }
    } catch (error) {
        console.error('[Warnings] Check error:', error);
        return { hasWarning: false, shouldKick: false };
    }
}

async function setLinkWarning(groupId, userId) {
    const odId = `${groupId}_${odId}`;
    
    try {
        if (isMongoConnected()) {
            await WarningModel.findOneAndUpdate(
                { odId },
                { 
                    odId,
                    groupId,
                    odId,
                    linkWarning: true,
                    linkWarningTime: new Date(),
                    updatedAt: new Date()
                },
                { upsert: true }
            );
        } else {
            const data = loadWarnings();
            data[odId] = {
                ...data[odId],
                linkWarning: true,
                linkWarningTime: Date.now()
            };
            saveWarnings(data);
        }
        return true;
    } catch (error) {
        console.error('[Warnings] Set error:', error);
        return false;
    }
}

async function clearLinkWarning(groupId, odId) {
    const odId = `${groupId}_${odId}`;
    
    try {
        if (isMongoConnected()) {
            await WarningModel.findOneAndUpdate(
                { odId },
                { linkWarning: false, linkWarningTime: null }
            );
        } else {
            const data = loadWarnings();
            if (data[odId]) {
                data[odId].linkWarning = false;
                data[odId].linkWarningTime = null;
                saveWarnings(data);
            }
        }
        return true;
    } catch { return false; }
}

module.exports = {
    checkLinkWarning,
    setLinkWarning,
    clearLinkWarning,
    WarningModel
};
