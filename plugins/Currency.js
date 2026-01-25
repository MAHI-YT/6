const config = require('../config')
const { cmd } = require('../command')
const fs = require('fs')
const path = require('path')

// Data files
const antiStatusFile = path.join(__dirname, '../data/antistatus.json')
const warningsFile = path.join(__dirname, '../data/status_warnings.json')
const dataDir = path.join(__dirname, '../data')

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
}

// Load anti-status settings
function loadAntiStatusSettings() {
    try {
        if (fs.existsSync(antiStatusFile)) {
            return JSON.parse(fs.readFileSync(antiStatusFile, 'utf8'))
        }
    } catch (err) {
        console.error('Error loading anti-status settings:', err)
    }
    return {}
}

// Save anti-status settings
function saveAntiStatusSettings(settings) {
    try {
        fs.writeFileSync(antiStatusFile, JSON.stringify(settings, null, 2))
    } catch (err) {
        console.error('Error saving anti-status settings:', err)
    }
}

// Load warnings
function loadWarnings() {
    try {
        if (fs.existsSync(warningsFile)) {
            return JSON.parse(fs.readFileSync(warningsFile, 'utf8'))
        }
    } catch (err) {
        console.error('Error loading warnings:', err)
    }
    return {}
}

// Save warnings
function saveWarnings(warnings) {
    try {
        fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2))
    } catch (err) {
        console.error('Error saving warnings:', err)
    }
}

// Add warning to user
function addWarning(groupId, userId) {
    const warnings = loadWarnings()
    const key = `${groupId}_${userId}`
    warnings[key] = (warnings[key] || 0) + 1
    saveWarnings(warnings)
    return warnings[key]
}

// Reset user warnings
function resetWarnings(groupId, userId) {
    const warnings = loadWarnings()
    const key = `${groupId}_${userId}`
    delete warnings[key]
    saveWarnings(warnings)
}

// Export for handler
module.exports.loadAntiStatusSettings = loadAntiStatusSettings
module.exports.addWarning = addWarning
module.exports.resetWarnings = resetWarnings

// ✅ Extract all possible ID formats from a JID
function extractAllIds(jid) {
    if (!jid) return []
    
    const ids = []
    const jidStr = String(jid)
    
    // Add original
    ids.push(jidStr)
    
    // Remove @s.whatsapp.net or @lid
    const withoutSuffix = jidStr.split('@')[0]
    ids.push(withoutSuffix)
    
    // Remove :XX part if exists
    if (withoutSuffix.includes(':')) {
        const numericPart = withoutSuffix.split(':')[0]
        ids.push(numericPart)
    }
    
    // Extract only digits
    const digitsOnly = jidStr.replace(/\D/g, '')
    if (digitsOnly.length >= 10) {
        ids.push(digitsOnly)
    }
    
    return [...new Set(ids)] // Remove duplicates
}

// ✅ Check if two JIDs match (handles LID)
function jidMatch(jid1, jid2) {
    if (!jid1 || !jid2) return false
    
    const ids1 = extractAllIds(jid1)
    const ids2 = extractAllIds(jid2)
    
    // Check if any ID matches
    for (let id1 of ids1) {
        for (let id2 of ids2) {
            if (id1 === id2) return true
        }
    }
    
    return false
}

// ✅ Check if user is bot owner
function isBotOwner(senderId) {
    // Get owner from config (try multiple possible config keys)
    let ownerNumber = ''
    
    if (config.OWNER_NUMBER) ownerNumber = config.OWNER_NUMBER
    else if (config.ownerNumber) ownerNumber = config.ownerNumber
    else if (config.SUDO) ownerNumber = config.SUDO
    else if (config.sudo) ownerNumber = config.sudo
    else if (config.OWNER) ownerNumber = config.OWNER
    else if (config.owner) ownerNumber = config.owner
    
    ownerNumber = String(ownerNumber).replace(/[^0-9]/g, '')
    
    const senderIds = extractAllIds(senderId)
    
    console.log('Owner Number:', ownerNumber)
    console.log('Sender IDs:', senderIds)
    
    for (let id of senderIds) {
        const numericId = id.replace(/\D/g, '')
        if (numericId === ownerNumber || id === ownerNumber) {
            return true
        }
    }
    
    return false
}

// ✅ MAIN FUNCTION: Check admin status with full LID support
async function checkAdminStatus(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId)
        const participants = metadata.participants || []
        
        // Get all bot IDs
        const botId = conn.user?.id || ''
        const botLid = conn.user?.lid || ''
        const botJid = conn.user?.jid || ''
        
        console.log('========== ADMIN CHECK DEBUG ==========')
        console.log('Chat ID:', chatId)
        console.log('Sender ID:', senderId)
        console.log('Bot ID:', botId)
        console.log('Bot LID:', botLid)
        console.log('Total participants:', participants.length)
        
        let isBotAdmin = false
        let isSenderAdmin = false
        
        // Loop through all participants
        for (let participant of participants) {
            const isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin'
            
            if (!isAdmin) continue // Skip non-admins
            
            // Get all participant IDs
            const pId = participant.id || ''
            const pLid = participant.lid || ''
            
            console.log('--- Checking Admin ---')
            console.log('Participant ID:', pId)
            console.log('Participant LID:', pLid)
            console.log('Admin type:', participant.admin)
            
            // Check if this admin is the BOT
            const isBotMatch = jidMatch(pId, botId) || 
                               jidMatch(pId, botLid) || 
                               jidMatch(pId, botJid) ||
                               jidMatch(pLid, botId) || 
                               jidMatch(pLid, botLid) ||
                               jidMatch(pLid, botJid)
            
            if (isBotMatch) {
                isBotAdmin = true
                console.log('✅ BOT IS ADMIN')
            }
            
            // Check if this admin is the SENDER
            const isSenderMatch = jidMatch(pId, senderId) || 
                                  jidMatch(pLid, senderId)
            
            if (isSenderMatch) {
                isSenderAdmin = true
                console.log('✅ SENDER IS ADMIN')
            }
        }
        
        console.log('========== RESULT ==========')
        console.log('Bot is Admin:', isBotAdmin)
        console.log('Sender is Admin:', isSenderAdmin)
        console.log('============================')
        
        return { isBotAdmin, isSenderAdmin }
        
    } catch (err) {
        console.error('Error in checkAdminStatus:', err)
        return { isBotAdmin: false, isSenderAdmin: false }
    }
}

// ✅ Get sender ID from message
function getSenderId(conn, mek, m, sender) {
    let senderId = null
    
    // Method 1: From message key participant
    if (mek.key?.participant) {
        senderId = mek.key.participant
    }
    // Method 2: From m.sender
    else if (m?.sender) {
        senderId = m.sender
    }
    // Method 3: From sender parameter
    else if (sender) {
        senderId = sender
    }
    // Method 4: From m.key.participant
    else if (m?.key?.participant) {
        senderId = m.key.participant
    }
    // Method 5: If from bot itself
    else if (mek.key?.fromMe) {
        senderId = conn.user?.id
    }
    
    console.log('getSenderId result:', senderId)
    return senderId
}

// ========== COMMAND: antistatus ==========
cmd({
    pattern: "antistatus",
    alias: ["antistatuslink", "nostatus"],
    react: "🚫",
    desc: "Enable/Disable anti-status mention in group",
    category: "group",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, args, reply, sender }) => {
    try {
        // Only works in groups
        if (!isGroup) {
            return reply("❌ This command can only be used in groups.")
        }
        
        // ✅ Get sender ID using fixed function
        const senderId = getSenderId(conn, mek, m, sender)
        
        if (!senderId) {
            return reply("❌ Could not identify sender. Please try again.")
        }
        
        console.log('\n🔍 ANTISTATUS COMMAND TRIGGERED')
        console.log('Sender:', senderId)
        
        // ✅ Check if bot owner FIRST
        const isOwner = isBotOwner(senderId)
        console.log('Is Bot Owner:', isOwner)
        
        // ✅ If owner, allow without checking admin
        let isSenderAdmin = false
        let isBotAdmin = false
        
        if (isOwner) {
            // Owner always has permission, just check if bot is admin
            const adminStatus = await checkAdminStatus(conn, from, senderId)
            isBotAdmin = adminStatus.isBotAdmin
            isSenderAdmin = true // Owner is always allowed
        } else {
            // Not owner, check admin status
            const adminStatus = await checkAdminStatus(conn, from, senderId)
            isBotAdmin = adminStatus.isBotAdmin
            isSenderAdmin = adminStatus.isSenderAdmin
        }
        
        // ✅ Permission check
        if (!isOwner && !isSenderAdmin) {
            return reply("❌ *Permission Denied!*\n\nOnly *Group Admins* and *Bot Owner* can use this command.")
        }
        
        // ✅ Bot must be admin
        if (!isBotAdmin) {
            return reply("❌ *I need to be an Admin to use this feature!*\n\nPlease make me admin first.")
        }
        
        // Process command
        const action = args[0]?.toLowerCase()
        const settings = loadAntiStatusSettings()
        
        // Show current status if no argument
        if (!action || (action !== 'on' && action !== 'off')) {
            const currentStatus = settings[from] ? '🟢 ON' : '🔴 OFF'
            
            return reply(`🚫 *ANTI-STATUS MENTION*

📊 *Current Status:* ${currentStatus}

📝 *Usage:*
• \`.antistatus on\` - Enable
• \`.antistatus off\` - Disable

⚠️ *How it works:*
• Detects status mentions in group
• Deletes the message
• Warns the user (3 warnings max)
• Kicks user after 3 warnings

👤 *Your Role:* ${isOwner ? 'Bot Owner' : 'Group Admin'}`)
        }
        
        if (action === 'on') {
            settings[from] = true
            saveAntiStatusSettings(settings)
            
            return reply(`✅ *ANTI-STATUS ENABLED!*

🔍 I will now:
• Delete status mention messages
• Warn users (max 3 times)
• Kick user after 3 warnings

⚠️ Status mentions are not allowed!

👤 Enabled by: ${isOwner ? 'Bot Owner' : 'Group Admin'}`)
            
        } else if (action === 'off') {
            settings[from] = false
            saveAntiStatusSettings(settings)
            
            return reply(`✅ *ANTI-STATUS DISABLED!*

🔕 Status mentions are now allowed in this group.

👤 Disabled by: ${isOwner ? 'Bot Owner' : 'Group Admin'}`)
        }
        
    } catch (e) {
        console.error("Error in antistatus command:", e)
        reply("❌ Failed to update settings. Error: " + e.message)
    }
})

// ========== COMMAND: resetwarn ==========
cmd({
    pattern: "resetwarn",
    alias: ["clearwarn", "resetwarning"],
    react: "🔄",
    desc: "Reset warnings for a user",
    category: "group",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, quoted, args, reply, sender }) => {
    try {
        if (!isGroup) {
            return reply("❌ This command can only be used in groups.")
        }
        
        // Get sender ID
        const senderId = getSenderId(conn, mek, m, sender)
        
        if (!senderId) {
            return reply("❌ Could not identify sender.")
        }
        
        // Check permissions
        const isOwner = isBotOwner(senderId)
        const { isSenderAdmin } = await checkAdminStatus(conn, from, senderId)
        
        if (!isOwner && !isSenderAdmin) {
            return reply("❌ Only *Group Admins* and *Bot Owner* can use this command.")
        }
        
        // Get target user
        let targetId
        if (quoted) {
            targetId = quoted.key?.participant || quoted.sender
        } else if (args[0]) {
            targetId = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        }
        
        if (!targetId) {
            return reply("❌ Reply to a user or provide their number.\n\n📝 *Usage:* `.resetwarn @user` or `.resetwarn 923001234567`")
        }
        
        resetWarnings(from, targetId)
        
        const targetNumber = String(targetId).replace(/[^0-9]/g, '').slice(0, 15)
        
        await conn.sendMessage(from, {
            text: `✅ *Warnings Reset!*\n\n👤 User: @${targetNumber}\n⚠️ Warnings: 0/3`,
            mentions: [targetId]
        })
        
    } catch (e) {
        console.error("Error in resetwarn command:", e)
        reply("❌ Failed to reset warnings.")
    }
})

// ========== COMMAND: checkwarn ==========
cmd({
    pattern: "checkwarn",
    alias: ["warnings", "warncount"],
    react: "⚠️",
    desc: "Check warnings for a user",
    category: "group",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, quoted, args, reply, sender }) => {
    try {
        if (!isGroup) {
            return reply("❌ This command can only be used in groups.")
        }
        
        // Get target user
        let targetId
        if (quoted) {
            targetId = quoted.key?.participant || quoted.sender
        } else if (args[0]) {
            targetId = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        } else {
            // Check own warnings
            targetId = getSenderId(conn, mek, m, sender)
        }
        
        if (!targetId) {
            return reply("❌ Could not identify user.")
        }
        
        const warnings = loadWarnings()
        const key = `${from}_${targetId}`
        const warnCount = warnings[key] || 0
        
        const targetNumber = String(targetId).replace(/[^0-9]/g, '').slice(0, 15)
        
        await conn.sendMessage(from, {
            text: `⚠️ *Warning Status*\n\n👤 User: @${targetNumber}\n⚠️ Warnings: ${warnCount}/3\n${warnCount >= 3 ? '❌ Will be kicked on next violation!' : `✅ ${3 - warnCount} warning(s) remaining`}`,
            mentions: [targetId]
        })
        
    } catch (e) {
        console.error("Error in checkwarn command:", e)
        reply("❌ Failed to check warnings.")
    }
})
