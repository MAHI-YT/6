// ============================================================
//  DARKZONE-MD Message Store
//  Created By Irfan Ahmad
//
//  🔴 ROOT CAUSE FIX: Message limit prevents infinite growth
//  🔴 Before: message.json grew to 100MB+ → RAM exhaustion → CRASH
//  🔴 Now: Maximum 500 messages kept, auto-cleanup every 10 minutes
// ============================================================

const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');

const storeDir = path.join(process.cwd(), 'store');

// ============================================================
//  CONFIGURATION
// ============================================================
const MAX_MESSAGES = 500;          // Keep only last 500 messages
const MAX_CONTACTS = 5000;         // Max contacts to store
const CLEANUP_INTERVAL = 10 * 60 * 1000; // Cleanup every 10 minutes
const MAX_MESSAGE_AGE = 2 * 60 * 60 * 1000; // 2 hours max age

// ============================================================
//  SAFE JSON READ/WRITE (with file locking prevention)
// ============================================================
let writeQueue = {};
let isWriting = {};

const readJSON = async (file) => {
    try {
        const filePath = path.join(storeDir, file);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
};

const writeJSON = async (file, data) => {
    try {
        // Prevent concurrent writes to same file
        if (isWriting[file]) {
            writeQueue[file] = data;
            return;
        }

        isWriting[file] = true;
        await fs.mkdir(storeDir, { recursive: true });
        const filePath = path.join(storeDir, file);

        // Write to temp file first, then rename (atomic write)
        const tmpPath = filePath + '.tmp';
        await fs.writeFile(tmpPath, JSON.stringify(data, null, 2));
        await fs.rename(tmpPath, filePath);

        isWriting[file] = false;

        // Process queued write
        if (writeQueue[file]) {
            const queuedData = writeQueue[file];
            delete writeQueue[file];
            await writeJSON(file, queuedData);
        }
    } catch (e) {
        isWriting[file] = false;
        console.error(`[Store Write Error] ${file}:`, e.message);
    }
};

// ============================================================
//  HELPER: Check JID types
// ============================================================
const isGroupJid = (jid) => jid && jid.endsWith('@g.us');
const isBroadcastJid = (jid) => jid && jid.endsWith('@broadcast');
const isNewsletterJid = (jid) => jid && jid.endsWith('@newsletter');

// ============================================================
//  CONTACTS
// ============================================================
const saveContact = async (jid, name) => {
    try {
        if (!jid || !name || isGroupJid(jid) || isBroadcastJid(jid) || isNewsletterJid(jid)) return;

        const contacts = await readJSON('contact.json');
        const index = contacts.findIndex((c) => c.jid === jid);

        if (index > -1) {
            contacts[index].name = name;
        } else {
            contacts.push({ jid, name });
        }

        // Limit contacts
        if (contacts.length > MAX_CONTACTS) {
            contacts.splice(0, contacts.length - MAX_CONTACTS);
        }

        await writeJSON('contact.json', contacts);
    } catch (e) {
        console.error('[SaveContact Error]:', e.message);
    }
};

const getContacts = async () => {
    try {
        return await readJSON('contact.json');
    } catch {
        return [];
    }
};

// ============================================================
//  MESSAGES (WITH LIMIT — PREVENTS CRASH!)
// ============================================================
const saveMessage = async (message) => {
    try {
        if (!message || !message.key) return;

        const jid = message.key.remoteJid;
        const id = message.key.id;
        if (!id || !jid) return;

        // Save contact
        if (message.pushName) {
            const sender = message.key.participant || message.key.remoteJid;
            await saveContact(sender, message.pushName);
        }

        let messages = await readJSON('message.json');
        const timestamp = message.messageTimestamp
            ? (typeof message.messageTimestamp === 'number'
                ? message.messageTimestamp * 1000
                : Date.now())
            : Date.now();

        const index = messages.findIndex((msg) => msg.id === id && msg.jid === jid);

        if (index > -1) {
            messages[index].message = message;
            messages[index].timestamp = timestamp;
        } else {
            messages.push({ id, jid, message, timestamp });
        }

        // ════════════════════════════════════════════
        //  🔴 CRITICAL FIX: Limit message count!
        //  This prevents the JSON file from growing infinitely
        //  which was causing RAM exhaustion and bot crash
        // ════════════════════════════════════════════
        if (messages.length > MAX_MESSAGES) {
            // Sort by timestamp (newest first), keep only MAX_MESSAGES
            messages.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            messages = messages.slice(0, MAX_MESSAGES);
        }

        await writeJSON('message.json', messages);
    } catch (e) {
        console.error('[SaveMessage Error]:', e.message);
    }
};

// ============================================================
//  LOAD MESSAGE (for anti-delete)
// ============================================================
const loadMessage = async (id) => {
    try {
        if (!id) return null;
        const messages = await readJSON('message.json');
        return messages.find((msg) => msg.id === id) || null;
    } catch {
        return null;
    }
};

// ============================================================
//  GET NAME
// ============================================================
const getName = async (jid) => {
    try {
        const contacts = await readJSON('contact.json');
        const contact = contacts.find((c) => c.jid === jid);
        return contact ? contact.name : jid.split('@')[0].replace(/_/g, ' ');
    } catch {
        return jid ? jid.split('@')[0] : 'Unknown';
    }
};

// ============================================================
//  GROUP METADATA
// ============================================================
const saveGroupMetadata = async (jid, client) => {
    try {
        if (!isGroupJid(jid)) return;

        const groupMetadata = await client.groupMetadata(jid);
        const metadata = {
            jid: groupMetadata.id,
            subject: groupMetadata.subject,
            subjectOwner: groupMetadata.subjectOwner,
            subjectTime: groupMetadata.subjectTime
                ? new Date(groupMetadata.subjectTime * 1000).toISOString()
                : null,
            size: groupMetadata.size,
            creation: groupMetadata.creation
                ? new Date(groupMetadata.creation * 1000).toISOString()
                : null,
            owner: groupMetadata.owner,
            desc: groupMetadata.desc,
            descId: groupMetadata.descId,
            linkedParent: groupMetadata.linkedParent,
            restrict: groupMetadata.restrict,
            announce: groupMetadata.announce,
            isCommunity: groupMetadata.isCommunity,
            isCommunityAnnounce: groupMetadata.isCommunityAnnounce,
            joinApprovalMode: groupMetadata.joinApprovalMode,
            memberAddMode: groupMetadata.memberAddMode,
            ephemeralDuration: groupMetadata.ephemeralDuration,
        };

        const metadataList = await readJSON('metadata.json');
        const index = metadataList.findIndex((m) => m.jid === jid);
        if (index > -1) {
            metadataList[index] = metadata;
        } else {
            metadataList.push(metadata);
        }
        await writeJSON('metadata.json', metadataList);

        // Save participants separately
        const participants = groupMetadata.participants.map((p) => ({
            jid,
            participantId: p.id,
            admin: p.admin,
        }));
        await writeJSON(`${jid}_participants.json`, participants);
    } catch (e) {
        console.error('[SaveGroupMetadata Error]:', e.message);
    }
};

const getGroupMetadata = async (jid) => {
    try {
        if (!isGroupJid(jid)) return null;
        const metadataList = await readJSON('metadata.json');
        const metadata = metadataList.find((m) => m.jid === jid);
        if (!metadata) return null;

        const participants = await readJSON(`${jid}_participants.json`);
        return { ...metadata, participants };
    } catch {
        return null;
    }
};

// ============================================================
//  MESSAGE COUNT (for group activity tracking)
// ============================================================
const saveMessageCount = async (message) => {
    try {
        if (!message || !message.key) return;

        const jid = message.key.remoteJid;
        const sender = message.key.participant || message.sender;
        if (!jid || !sender || !isGroupJid(jid)) return;

        const messageCounts = await readJSON('message_count.json');
        const index = messageCounts.findIndex((r) => r.jid === jid && r.sender === sender);

        if (index > -1) {
            messageCounts[index].count += 1;
        } else {
            messageCounts.push({ jid, sender, count: 1 });
        }

        await writeJSON('message_count.json', messageCounts);
    } catch (e) {
        console.error('[SaveMessageCount Error]:', e.message);
    }
};

// ============================================================
//  INACTIVE MEMBERS
// ============================================================
const getInactiveGroupMembers = async (jid) => {
    try {
        if (!isGroupJid(jid)) return [];

        const groupMetadata = await getGroupMetadata(jid);
        if (!groupMetadata || !groupMetadata.participants) return [];

        const messageCounts = await readJSON('message_count.json');
        const inactiveMembers = groupMetadata.participants.filter((p) => {
            const record = messageCounts.find((msg) => msg.jid === jid && msg.sender === p.participantId);
            return !record || record.count === 0;
        });

        return inactiveMembers.map((m) => m.participantId);
    } catch {
        return [];
    }
};

// ============================================================
//  GROUP MEMBERS MESSAGE COUNT
// ============================================================
const getGroupMembersMessageCount = async (jid) => {
    try {
        if (!isGroupJid(jid)) return [];

        const messageCounts = await readJSON('message_count.json');
        const groupCounts = messageCounts
            .filter((r) => r.jid === jid && r.count > 0)
            .sort((a, b) => b.count - a.count);

        return Promise.all(
            groupCounts.map(async (record) => ({
                sender: record.sender,
                name: await getName(record.sender),
                messageCount: record.count,
            }))
        );
    } catch {
        return [];
    }
};

// ============================================================
//  CHAT SUMMARY
// ============================================================
const getChatSummary = async () => {
    try {
        const messages = await readJSON('message.json');
        const distinctJids = [...new Set(messages.map((msg) => msg.jid))];

        const summaries = await Promise.all(
            distinctJids.map(async (jid) => {
                const chatMessages = messages.filter((msg) => msg.jid === jid);
                const messageCount = chatMessages.length;
                const lastMessage = chatMessages.sort(
                    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
                )[0];
                const chatName = isGroupJid(jid) ? jid : await getName(jid);

                return {
                    jid,
                    name: chatName,
                    messageCount,
                    lastMessageTimestamp: lastMessage ? lastMessage.timestamp : null,
                };
            })
        );

        return summaries.sort(
            (a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0)
        );
    } catch {
        return [];
    }
};

// ============================================================
//  AUTO CLEANUP — Removes old messages periodically
// ============================================================
async function cleanupOldMessages() {
    try {
        const messages = await readJSON('message.json');
        if (messages.length === 0) return;

        const now = Date.now();
        const filtered = messages.filter((msg) => {
            const age = now - (msg.timestamp || 0);
            return age < MAX_MESSAGE_AGE;
        });

        // Only write if we actually removed something
        if (filtered.length < messages.length) {
            await writeJSON('message.json', filtered);
            console.log(`[🧹] Cleaned ${messages.length - filtered.length} old messages (kept ${filtered.length})`);
        }
    } catch (e) {
        console.error('[Cleanup Error]:', e.message);
    }
}

// Run cleanup every 10 minutes
setInterval(cleanupOldMessages, CLEANUP_INTERVAL);

// ============================================================
//  COMBINED SAVE (message + count)
// ============================================================
const saveMessageV2 = async (message) => {
    try {
        await Promise.all([
            saveMessage(message),
            saveMessageCount(message),
        ]);
    } catch (e) {
        // Don't crash if save fails
        console.error('[SaveV2 Error]:', e.message);
    }
};

// ============================================================
//  EXPORTS
// ============================================================
module.exports = {
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
    saveMessage: saveMessageV2,
};