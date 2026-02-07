// ============================================================
//  DARKZONE-MD Presence Control
//  Created By Irfan Ahmad
//  FIXED: Removed fragile stack trace hack
//  FIXED: Removed conn.sendMessage override (was breaking things)
// ============================================================

const config = require('../config');

// ============================================================
//  PRESENCE HANDLER
// ============================================================
const PresenceControl = async (conn, update) => {
    try {
        if (!update || !update.id) return;

        // Always Online mode
        if (config.ALWAYS_ONLINE === 'true') {
            await conn.sendPresenceUpdate('available', update.id);
            return;
        }

        // Mirror user's presence
        const presences = update.presences;
        if (!presences) return;

        const keys = Object.keys(presences);
        if (keys.length === 0) return;

        const userPresence = presences[keys[0]]?.lastKnownPresence;
        if (!userPresence) return;

        let presenceState;
        switch (userPresence) {
            case 'available':
            case 'online':
                presenceState = 'available';
                break;
            case 'unavailable':
            case 'offline':
                presenceState = 'unavailable';
                break;
            case 'composing':
            case 'recording':
                // Don't override when auto features are enabled
                if (config.AUTO_TYPING === 'true' || config.AUTO_RECORDING === 'true') {
                    return;
                }
                presenceState = 'available';
                break;
            default:
                presenceState = 'unavailable';
        }

        await conn.sendPresenceUpdate(presenceState, update.id);
    } catch (err) {
        // Silently ignore presence errors
    }
};

// ============================================================
//  BOT ACTIVITY FILTER (SIMPLIFIED — No more conn override!)
// ============================================================
const BotActivityFilter = (conn) => {
    // Simple approach: just ensure bot presence is set correctly
    // NO MORE overriding conn.sendMessage (that was causing issues)

    if (config.ALWAYS_ONLINE === 'true') {
        // Send available presence every 30 seconds
        setInterval(async () => {
            try {
                await conn.sendPresenceUpdate('available');
            } catch (e) { }
        }, 30000);
    }
};

module.exports = { PresenceControl, BotActivityFilter };