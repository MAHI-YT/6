const fs = require('fs')
const path = require('path')

const antiStatusFile = path.join(__dirname, '../data/antistatus.json')
const warningsFile = path.join(__dirname, '../data/status_warnings.json')

// Load settings
function loadAntiStatusSettings() {
    try {
        if (fs.existsSync(antiStatusFile)) {
            return JSON.parse(fs.readFileSync(antiStatusFile, 'utf8'))
        }
    } catch (err) {}
    return {}
}

// Load warnings
function loadWarnings() {
    try {
        if (fs.existsSync(warningsFile)) {
            return JSON.parse(fs.readFileSync(warningsFile, 'utf8'))
        }
    } catch (err) {}
    return {}
}

// Save warnings
function saveWarnings(warnings) {
    try {
        const dataDir = path.dirname(warningsFile)
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true })
        }
        fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2))
    } catch (err) {
        console.error('Error saving warnings:', err)
    }
}

// Add warning
function addWarning(groupId, userId) {
    const warnings = loadWarnings()
    const key = `${groupId}_${userId}`
    warnings[key] = (warnings[key] || 0) + 1
    saveWarnings(warnings)
    return warnings[key]
}

// Get warnings
function getWarnings(groupId, userId) {
    const warnings = loadWarnings()
    const key = `${groupId}_${userId}`
    return warnings[key] || 0
}

// Reset warnings
function resetWarnings(groupId, userId) {
    const warnings = loadWarnings()
    const key = `${groupId}_${userId}`
    delete warnings[key]
    saveWarnings(warnings)
}

// Check if message contains status mention
function isStatusMention(message) {
    if (!message) return false
    
    // Check for status link patterns
    const statusPatterns = [
        /https?:\/\/wa\.me\/status\//i,
        /https?:\/\/(?:www\.)?whatsapp\.com\/status\//i,
        /status\/\d+/i
    ]
    
    // Get message text
    let text = ''
    
    if (typeof message === 'string') {
        text = message
    } else if (message.conversation) {
        text = message.conversation
    } else if (message.extendedTextMessage) {
        text = message.extendedTextMessage?.text || ''
        
        // Check for status context info
        if (message.extendedTextMessage?.contextInfo?.mentionedJid?.includes('status@broadcast')) {
            return true
        }
        if (message.extendedTextMessage?.contextInfo?.isForwarded && 
            message.extendedTextMessage?.contextInfo?.forwardedNewsletterMessageInfo) {
            return true
        }
    }
    
    // Check text patterns
    for (let pattern of statusPatterns) {
        if (pattern.test(text)) {
            return true
        }
    }
    
    // Check for status broadcast mention
    if (message.extendedTextMessage?.contextInfo?.participant?.includes('status')) {
        return true
    }
    
    // Check for quoted status
    if (message.extendedTextMessage?.contextInfo?.quotedMessage?.statusMessage) {
        return true
    }
    
    return false
}

// Check if user is admin
async function isUserAdmin(conn, groupId, userId) {
    try {
        const metadata = await conn.groupMetadata(groupId)
        const userNumber = userId.replace(/[:@].*/g, '')
        
        for (let p of metadata.participants) {
            const pNumber = p.id.replace(/[:@].*/g, '')
            const pLid = p.lid ? p.lid.replace(/[:@].*/g, '') : ''
            
            if ((pNumber === userNumber || pLid === userNumber) && 
                (p.admin === "admin" || p.admin === "superadmin")) {
                return true
            }
        }
    } catch (err) {}
    return false
}

// Check if bot is admin
async function isBotAdmin(conn, groupId) {
    try {
        const metadata = await conn.groupMetadata(groupId)
        const botId = conn.user?.id || ''
        const botNumber = botId.replace(/[:@].*/g, '')
        
        for (let p of metadata.participants) {
            const pNumber = p.id.replace(/[:@].*/g, '')
            const pLid = p.lid ? p.lid.replace(/[:@].*/g, '') : ''
            
            if ((pNumber === botNumber || pLid === botNumber) && 
                (p.admin === "admin" || p.admin === "superadmin")) {
                return true
            }
        }
    } catch (err) {}
    return false
}

// Main handler function
async function handleAntiStatus(conn, mek, msg) {
    try {
        const chatId = mek.key.remoteJid
        
        // Only for groups
        if (!chatId || !chatId.endsWith('@g.us')) return
        
        // Check if anti-status is enabled
        const settings = loadAntiStatusSettings()
        if (!settings[chatId]) return
        
        // Check if bot is admin
        const botAdmin = await isBotAdmin(conn, chatId)
        if (!botAdmin) return
        
        // Get sender
        const senderId = mek.key.participant || mek.key.remoteJid
        if (!senderId) return
        
        // Skip if sender is admin
        const senderAdmin = await isUserAdmin(conn, chatId, senderId)
        if (senderAdmin) return
        
        // Skip if message is from bot
        if (mek.key.fromMe) return
        
        // Check if message contains status mention
        const message = mek.message
        if (!isStatusMention(message)) return
        
        // Status mention detected!
        console.log('Status mention detected from:', senderId)
        
        // Delete the message
        try {
            await conn.sendMessage(chatId, {
                delete: {
                    remoteJid: chatId,
                    fromMe: false,
                    id: mek.key.id,
                    participant: mek.key.participant
                }
            })
        } catch (delErr) {
            console.error('Failed to delete status message:', delErr)
        }
        
        // Add warning
        const warningCount = addWarning(chatId, senderId)
        const senderNumber = senderId.replace(/[:@].*/g, '')
        
        if (warningCount >= 3) {
            // Kick user after 3 warnings
            try {
                await conn.sendMessage(chatId, {
                    text: `🚫 *USER REMOVED!*\n\n👤 @${senderNumber}\n❌ Reached 3/3 warnings for status mentions.\n\n⛔ User has been removed from the group.`,
                    mentions: [senderId]
                })
                
                await conn.groupParticipantsUpdate(chatId, [senderId], 'remove')
                
                // Reset warnings after kick
                resetWarnings(chatId, senderId)
                
            } catch (kickErr) {
                console.error('Failed to kick user:', kickErr)
                await conn.sendMessage(chatId, {
                    text: `⚠️ @${senderNumber} has 3/3 warnings but I couldn't remove them. Please check my admin permissions.`,
                    mentions: [senderId]
                })
            }
            
        } else {
            // Send warning
            const remainingWarnings = 3 - warningCount
            
            await conn.sendMessage(chatId, {
                text: `⚠️ *WARNING ${warningCount}/3*\n\n👤 @${senderNumber}\n🚫 Status mentions are not allowed!\n\n⛔ ${remainingWarnings} warning(s) remaining before removal.`,
                mentions: [senderId]
            })
        }
        
    } catch (err) {
        console.error('Error in anti-status handler:', err)
    }
}

module.exports = {
    handleAntiStatus,
    isStatusMention,
    loadAntiStatusSettings
}
