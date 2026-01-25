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
function addWarning(groupId, oderId) {
    const warnings = loadWarnings()
    const key = `${groupId}_${oderId}`
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

// ✅ FIXED: Proper LID support for checking admin status
async function checkAdminStatus(conn, chatId, senderId) {
    try {
        const metadata = await conn.groupMetadata(chatId)
        const participants = metadata.participants || []
        
        // Get bot IDs
        const botId = conn.user?.id || ''
        const botLid = conn.user?.lid || ''
        
        // Normalize bot IDs - extract numeric part only
        const botNumber = botId.replace(/[:@].*/g, '')
        const botLidNumber = botLid ? botLid.replace(/[:@].*/g, '') : ''
        
        // Normalize sender ID
        const senderNumber = senderId.replace(/[:@].*/g, '')
        
        console.log('=== DEBUG INFO ===')
        console.log('Bot ID:', botId)
        console.log('Bot LID:', botLid)
        console.log('Bot Number:', botNumber)
        console.log('Bot LID Number:', botLidNumber)
        console.log('Sender ID:', senderId)
        console.log('Sender Number:', senderNumber)
        
        let isBotAdmin = false
        let isSenderAdmin = false
        
        for (let p of participants) {
            const isAdmin = p.admin === "admin" || p.admin === "superadmin"
            
            // Normalize participant IDs
            const pId = p.id || ''
            const pLid = p.lid || ''
            const pNumber = pId.replace(/[:@].*/g, '')
            const pLidNumber = pLid.replace(/[:@].*/g, '')
            
            if (isAdmin) {
                console.log('Admin found - ID:', pId, 'LID:', pLid, 'Number:', pNumber, 'LID Number:', pLidNumber)
                
                // Check if this participant is the bot
                if (pNumber === botNumber || 
                    pNumber === botLidNumber || 
                    pLidNumber === botNumber || 
                    pLidNumber === botLidNumber ||
                    pId === botId ||
                    pId === botLid ||
                    pLid === botId ||
                    pLid === botLid) {
                    isBotAdmin = true
                    console.log('✅ Bot is admin')
                }
                
                // Check if this participant is the sender
                if (pNumber === senderNumber || 
                    pLidNumber === senderNumber ||
                    pId === senderId ||
                    pLid === senderId) {
                    isSenderAdmin = true
                    console.log('✅ Sender is admin')
                }
            }
        }
        
        console.log('Final - Bot Admin:', isBotAdmin, '| Sender Admin:', isSenderAdmin)
        console.log('=== END DEBUG ===')
        
        return { isBotAdmin, isSenderAdmin }
        
    } catch (err) {
        console.error('Error checking admin status:', err)
        return { isBotAdmin: false, isSenderAdmin: false }
    }
}

// ✅ Check if user is bot owner
function isBotOwner(senderId) {
    const senderNumber = senderId.replace(/[:@].*/g, '')
    
    // Get owner number from config
    const ownerNumber = (
        config.OWNER_NUMBER || 
        config.ownerNumber || 
        config.SUDO || 
        config.sudo || 
        ''
    ).toString().replace(/[^0-9]/g, '')
    
    console.log('Owner check - Sender:', senderNumber, 'Owner:', ownerNumber)
    
    return senderNumber === ownerNumber
}

// Command to toggle anti-status
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
        
        // ✅ FIXED: Get sender ID properly with correct logic
        let senderId
        
        if (mek.key.fromMe) {
            // Message is from bot itself
            senderId = conn.user?.id
        } else {
            // Get actual sender from group message
            senderId = mek.key.participant || m?.sender || sender || m?.key?.participant
        }
        
        if (!senderId) {
            return reply("❌ Could not identify sender.")
        }
        
        console.log('Command sender:', senderId)
        
        // ✅ Check if bot owner first
        const isOwner = isBotOwner(senderId)
        console.log('Is bot owner:', isOwner)
        
        // ✅ Check admin status with LID support
        const { isBotAdmin, isSenderAdmin } = await checkAdminStatus(conn, from, senderId)
        
        // ✅ Allow if bot owner OR group admin
        if (!isOwner && !isSenderAdmin) {
            return reply("❌ *Permission Denied!*\n\nOnly *Group Admins* and *Bot Owner* can use this command.")
        }
        
        // Check if bot is admin
        if (!isBotAdmin) {
            return reply("❌ *I need to be an Admin to use this feature!*\n\nPlease make me admin first.")
        }
        
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

// Command to reset warnings
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
        
        // Get sender ID properly
        let senderId
        if (mek.key.fromMe) {
            senderId = conn.user?.id
        } else {
            senderId = mek.key.participant || m?.sender || sender || m?.key?.participant
        }
        
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
            targetId = quoted.key.participant || quoted.sender
        } else if (args[0]) {
            targetId = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        }
        
        if (!targetId) {
            return reply("❌ Reply to a user or provide their number.\n\n📝 *Usage:* `.resetwarn @user` or `.resetwarn 923001234567`")
        }
        
        resetWarnings(from, targetId)
        
        const targetNumber = targetId.replace(/[:@].*/g, '')
        
        await conn.sendMessage(from, {
            text: `✅ *Warnings Reset!*\n\n👤 User: @${targetNumber}\n⚠️ Warnings: 0/3`,
            mentions: [targetId]
        })
        
    } catch (e) {
        console.error("Error in resetwarn command:", e)
        reply("❌ Failed to reset warnings.")
    }
})

// Command to check warnings
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
            targetId = quoted.key.participant || quoted.sender
        } else if (args[0]) {
            targetId = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        } else {
            // Check own warnings
            if (mek.key.fromMe) {
                targetId = conn.user?.id
            } else {
                targetId = mek.key.participant || m?.sender || sender
            }
        }
        
        if (!targetId) {
            return reply("❌ Could not identify user.")
        }
        
        const warnings = loadWarnings()
        const key = `${from}_${targetId}`
        const warnCount = warnings[key] || 0
        
        const targetNumber = targetId.replace(/[:@].*/g, '')
        
        await conn.sendMessage(from, {
            text: `⚠️ *Warning Status*\n\n👤 User: @${targetNumber}\n⚠️ Warnings: ${warnCount}/3\n${warnCount >= 3 ? '❌ Will be kicked on next violation!' : `✅ ${3 - warnCount} warning(s) remaining`}`,
            mentions: [targetId]
        })
        
    } catch (e) {
        console.error("Error in checkwarn command:", e)
        reply("❌ Failed to check warnings.")
    }
})
