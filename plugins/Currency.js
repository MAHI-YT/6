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

// Get user warnings
function getUserWarnings(groupId, oderId) {
    const warnings = loadWarnings()
    const key = `${groupId}_${userId}`
    return warnings[key] || 0
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
module.exports.getUserWarnings = getUserWarnings
module.exports.resetWarnings = resetWarnings

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
        
        // Get sender ID
        let senderId
        if (mek.key.fromMe) {
            senderId = conn.user?.id
        } else {
            senderId = mek.key.participant || m?.sender || sender
        }
        
        if (!senderId) {
            return reply("❌ Could not identify sender.")
        }
        
        const senderNumber = senderId.replace(/[:@].*/g, '')
        const ownerNumber = (config.OWNER_NUMBER || config.ownerNumber || '').replace(/[^0-9]/g, '')
        const isOwner = senderNumber === ownerNumber
        
        // Get group metadata
        const metadata = await conn.groupMetadata(from)
        const participants = metadata.participants || []
        
        const botId = conn.user?.id || ''
        const botNumber = botId.replace(/[:@].*/g, '')
        
        let isBotAdmin = false
        let isSenderAdmin = false
        
        for (let p of participants) {
            const pNumber = p.id.replace(/[:@].*/g, '')
            const pLid = p.lid ? p.lid.replace(/[:@].*/g, '') : ''
            const isAdmin = p.admin === "admin" || p.admin === "superadmin"
            
            if (isAdmin) {
                if (pNumber === botNumber || pLid === botNumber) {
                    isBotAdmin = true
                }
                if (pNumber === senderNumber || pLid === senderNumber) {
                    isSenderAdmin = true
                }
            }
        }
        
        // Check permissions
        if (!isOwner && !isSenderAdmin) {
            return reply("❌ Only *Group Admins* and *Bot Owner* can use this command.")
        }
        
        // Check if bot is admin
        if (!isBotAdmin) {
            return reply("❌ I need to be an *Admin* to use this feature!")
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
• Kicks user after 3 warnings`)
        }
        
        if (action === 'on') {
            settings[from] = true
            saveAntiStatusSettings(settings)
            
            return reply(`✅ *ANTI-STATUS ENABLED!*

🔍 I will now:
• Delete status mention messages
• Warn users (max 3 times)
• Kick user after 3 warnings

⚠️ Status mentions are not allowed!`)
            
        } else if (action === 'off') {
            settings[from] = false
            saveAntiStatusSettings(settings)
            
            return reply(`✅ *ANTI-STATUS DISABLED!*

🔕 Status mentions are now allowed in this group.`)
        }
        
    } catch (e) {
        console.error("Error in antistatus command:", e)
        reply("❌ Failed to update settings.")
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
        
        // Get sender ID
        let senderId
        if (mek.key.fromMe) {
            senderId = conn.user?.id
        } else {
            senderId = mek.key.participant || m?.sender || sender
        }
        
        const senderNumber = senderId.replace(/[:@].*/g, '')
        const ownerNumber = (config.OWNER_NUMBER || config.ownerNumber || '').replace(/[^0-9]/g, '')
        const isOwner = senderNumber === ownerNumber
        
        // Get group metadata
        const metadata = await conn.groupMetadata(from)
        const participants = metadata.participants || []
        
        let isSenderAdmin = false
        
        for (let p of participants) {
            const pNumber = p.id.replace(/[:@].*/g, '')
            const pLid = p.lid ? p.lid.replace(/[:@].*/g, '') : ''
            const isAdmin = p.admin === "admin" || p.admin === "superadmin"
            
            if (isAdmin && (pNumber === senderNumber || pLid === senderNumber)) {
                isSenderAdmin = true
                break
            }
        }
        
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
        
        return reply(`✅ *Warnings Reset!*\n\n👤 User: @${targetNumber}\n⚠️ Warnings: 0/3`, {
            mentions: [targetId]
        })
        
    } catch (e) {
        console.error("Error in resetwarn command:", e)
        reply("❌ Failed to reset warnings.")
    }
})
