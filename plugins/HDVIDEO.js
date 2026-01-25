
const config = require('../config')
const { cmd } = require('../command')

cmd({
    pattern: "delete",
    alias: ["del", "d", "remove"],
    react: "🗑️",
    desc: "Delete a message by replying to it",
    category: "utility",
    filename: __filename
},
async (conn, mek, m, { from, isGroup, quoted, reply, sender }) => {
    try {
        // Check if replying to a message
        if (!quoted) {
            return reply("❌ *Reply to a message to delete it!*\n\n📝 *Usage:* Reply to any message with `.delete`")
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
        
        // Get bot info
        const botId = conn.user?.id || ''
        const botNumber = botId.replace(/[:@].*/g, '')
        const senderNumber = senderId.replace(/[:@].*/g, '')
        
        // Check if bot owner
        const ownerNumber = (config.OWNER_NUMBER || config.ownerNumber || '').replace(/[^0-9]/g, '')
        const isOwner = senderNumber === ownerNumber
        
        // Get quoted message key
        const quotedKey = quoted.key || m.quoted?.key
        if (!quotedKey) {
            return reply("❌ Could not get message information.")
        }
        
        // Check if quoted message is from bot
        const quotedSender = quotedKey.participant || quotedKey.remoteJid || ''
        const quotedNumber = quotedSender.replace(/[:@].*/g, '')
        const isFromBot = quotedKey.fromMe || quotedNumber === botNumber
        
        // Permission check
        if (isGroup) {
            // Get group metadata
            const metadata = await conn.groupMetadata(from)
            const participants = metadata.participants || []
            
            let isBotAdmin = false
            let isSenderAdmin = false
            
            for (let p of participants) {
                const pNumber = p.id.replace(/[:@].*/g, '')
                const pLid = p.lid ? p.lid.replace(/[:@].*/g, '') : ''
                const isAdmin = p.admin === "admin" || p.admin === "superadmin"
                
                if (isAdmin) {
                    // Check bot
                    if (pNumber === botNumber || pLid === botNumber) {
                        isBotAdmin = true
                    }
                    // Check sender
                    if (pNumber === senderNumber || pLid === senderNumber) {
                        isSenderAdmin = true
                    }
                }
            }
            
            // Permission check
            if (!isOwner && !isSenderAdmin) {
                return reply("❌ Only *Group Admins* and *Bot Owner* can use this command.")
            }
            
            // Bot must be admin to delete others' messages
            if (!isFromBot && !isBotAdmin) {
                return reply("❌ I need to be an *Admin* to delete others' messages!")
            }
        }
        
        // Delete the quoted message
        await conn.sendMessage(from, {
            delete: {
                remoteJid: from,
                fromMe: isFromBot,
                id: quotedKey.id,
                participant: quotedKey.participant
            }
        })
        
        // Delete the command message
        await conn.sendMessage(from, { delete: mek.key })
        
    } catch (e) {
        console.error("Delete error:", e)
        reply("❌ Failed to delete message.")
    }
})
