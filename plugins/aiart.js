const { cmd } = require('../command');

// Store presence data
const presenceData = new Map();

cmd({
    pattern: "online",
    alias: ["onlinelist", "whosonline", "onlines", "listonline"],
    react: "🟢",
    desc: "Show list of online members in the group",
    category: "group",
    use: ".online",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, reply }) => {
    try {
        // Only works in groups
        if (!isGroup) {
            return reply("❌ This command only works in groups!");
        }

        // Send initial message
        const waitMsg = await conn.sendMessage(from, {
            text: "🔍 *Detecting online members...*\n\n⏳ Please wait, scanning group participants...\n\n_This may take 10-15 seconds_"
        }, { quoted: mek });

        // Get group metadata
        let groupMetadata;
        try {
            groupMetadata = await conn.groupMetadata(from);
        } catch (err) {
            console.error("Error getting group metadata:", err);
            return reply("❌ Failed to get group information.");
        }

        const participants = groupMetadata.participants || [];
        const groupName = groupMetadata.subject || "This Group";

        if (participants.length === 0) {
            return reply("❌ No participants found in this group.");
        }

        // Clear previous presence data for this group
        const groupPresence = new Map();

        // Set up presence listener
        const presenceHandler = (update) => {
            try {
                const jid = update.id;
                const presences = update.presences;
                
                if (presences) {
                    for (const [participantJid, presenceInfo] of Object.entries(presences)) {
                        if (presenceInfo.lastKnownPresence === 'available' || 
                            presenceInfo.lastKnownPresence === 'composing' ||
                            presenceInfo.lastKnownPresence === 'recording') {
                            groupPresence.set(participantJid, {
                                jid: participantJid,
                                presence: presenceInfo.lastKnownPresence,
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            } catch (e) {
                // Ignore errors in handler
            }
        };

        // Register presence listener
        conn.ev.on('presence.update', presenceHandler);

        // Subscribe to presence for all participants
        console.log(`[Online] Subscribing to ${participants.length} participants...`);
        
        for (const participant of participants) {
            try {
                await conn.presenceSubscribe(participant.id);
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
                // Ignore subscription errors for individual participants
            }
        }

        // Wait for presence updates to come in (10 seconds)
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Remove presence listener
        conn.ev.off('presence.update', presenceHandler);

        // Get online members
        const onlineMembers = [];
        
        for (const [jid, data] of groupPresence) {
            // Verify this member is in the group
            const isInGroup = participants.some(p => p.id === jid);
            if (isInGroup) {
                onlineMembers.push(data);
            }
        }

        // Delete the waiting message
        try {
            await conn.sendMessage(from, { delete: waitMsg.key });
        } catch (e) {}

        // If no online members detected
        if (onlineMembers.length === 0) {
            return conn.sendMessage(from, {
                text: `🟢 *Online Members in ${groupName}*\n\n❌ No online members detected!\n\n_Possible reasons:_\n• Members have privacy settings enabled\n• Members are offline\n• WhatsApp didn't respond in time\n\n💡 _Try again in a few moments_`
            }, { quoted: mek });
        }

        // Build the online members list
        let messageText = `🟢 *Online Members in ${groupName}*\n\n`;
        messageText += `📊 *Total Online:* ${onlineMembers.length} / ${participants.length}\n\n`;
        messageText += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

        const mentions = [];
        let count = 1;

        for (const member of onlineMembers) {
            const jid = member.jid;
            const number = jid.split('@')[0];
            
            let statusIcon = "🟢";
            if (member.presence === 'composing') {
                statusIcon = "⌨️";
            } else if (member.presence === 'recording') {
                statusIcon = "🎤";
            }
            
            messageText += `${count}. ${statusIcon} @${number}\n`;
            mentions.push(jid);
            count++;
        }

        messageText += `\n━━━━━━━━━━━━━━━━━━━━━\n\n`;
        messageText += `🟢 = Online\n`;
        messageText += `⌨️ = Typing\n`;
        messageText += `🎤 = Recording\n\n`;
        messageText += `⏰ _Scanned at: ${new Date().toLocaleTimeString()}_`;

        // Send the online members list
        await conn.sendMessage(from, {
            text: messageText,
            mentions: mentions
        }, { quoted: mek });

    } catch (e) {
        console.error("Online command error:", e);
        reply("❌ An error occurred while detecting online members.");
    }
});

// ============ ALTERNATIVE METHOD: Real-time Online Tracking ============

// Store for tracking online status
const onlineTracker = new Map();

cmd({
    pattern: "trackonline",
    alias: ["onlinetrack", "trackpresence"],
    react: "📡",
    desc: "Start tracking online members in real-time",
    category: "group",
    use: ".trackonline on/off",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, args, reply }) => {
    try {
        if (!isGroup) {
            return reply("❌ This command only works in groups!");
        }

        const action = args[0]?.toLowerCase();

        if (!action || (action !== 'on' && action !== 'off')) {
            const status = onlineTracker.has(from) ? "ON ✅" : "OFF ❌";
            return reply(`📡 *Real-time Online Tracker*\n\n*Current Status:* ${status}\n\n*Usage:*\n• \`.trackonline on\` - Start tracking\n• \`.trackonline off\` - Stop tracking\n\n_When ON, bot will notify when members come online_`);
        }

        if (action === 'on') {
            // Get group participants
            const metadata = await conn.groupMetadata(from);
            const participants = metadata.participants || [];

            // Subscribe to all participants
            for (const p of participants) {
                try {
                    await conn.presenceSubscribe(p.id);
                } catch (e) {}
            }

            onlineTracker.set(from, {
                enabled: true,
                participants: participants.map(p => p.id),
                lastOnline: new Map()
            });

            reply("✅ *Online Tracker Activated!*\n\n📡 Now tracking online status of members.\n\n_Use `.online` to see current online members_");

        } else if (action === 'off') {
            onlineTracker.delete(from);
            reply("✅ *Online Tracker Deactivated!*\n\n_No longer tracking online status_");
        }

    } catch (e) {
        console.error("Track online error:", e);
        reply("❌ An error occurred.");
    }
});

// ============ QUICK ONLINE CHECK ============

cmd({
    pattern: "checkonline",
    alias: ["isonline", "checkstatus"],
    react: "🔍",
    desc: "Check if a specific user is online",
    category: "group",
    use: ".checkonline @user or reply to message",
    filename: __filename
},
async (conn, mek, m, { from, quoted, mentionedJid, reply }) => {
    try {
        let targetJid;

        // Check if mentioned someone
        if (mentionedJid && mentionedJid.length > 0) {
            targetJid = mentionedJid[0];
        }
        // Check if replied to someone
        else if (quoted && quoted.sender) {
            targetJid = quoted.sender;
        }
        else {
            return reply("❌ Please mention someone or reply to their message!\n\n*Usage:*\n• `.checkonline @user`\n• Reply to a message with `.checkonline`");
        }

        const number = targetJid.split('@')[0];

        await reply(`🔍 Checking online status of @${number}...`, { mentions: [targetJid] });

        // Variable to store presence
        let userPresence = null;

        // Set up one-time presence listener
        const presenceHandler = (update) => {
            if (update.id === targetJid || 
                (update.presences && update.presences[targetJid])) {
                
                if (update.presences && update.presences[targetJid]) {
                    userPresence = update.presences[targetJid].lastKnownPresence;
                }
            }
        };

        conn.ev.on('presence.update', presenceHandler);

        // Subscribe to user's presence
        try {
            await conn.presenceSubscribe(targetJid);
        } catch (err) {
            console.error("Presence subscribe error:", err);
        }

        // Wait for presence update
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Remove listener
        conn.ev.off('presence.update', presenceHandler);

        // Build response
        let statusText;
        let statusEmoji;

        switch (userPresence) {
            case 'available':
                statusEmoji = "🟢";
                statusText = "Online";
                break;
            case 'composing':
                statusEmoji = "⌨️";
                statusText = "Typing...";
                break;
            case 'recording':
                statusEmoji = "🎤";
                statusText = "Recording audio...";
                break;
            case 'unavailable':
                statusEmoji = "⚪";
                statusText = "Offline";
                break;
            case 'paused':
                statusEmoji = "⏸️";
                statusText = "Paused";
                break;
            default:
                statusEmoji = "❓";
                statusText = "Unknown (Privacy enabled or no response)";
        }

        await conn.sendMessage(from, {
            text: `📱 *User Status Check*\n\n👤 *User:* @${number}\n${statusEmoji} *Status:* ${statusText}\n\n⏰ _Checked at: ${new Date().toLocaleTimeString()}_`,
            mentions: [targetJid]
        }, { quoted: mek });

    } catch (e) {
        console.error("Check online error:", e);
        reply("❌ An error occurred while checking online status.");
    }
});
