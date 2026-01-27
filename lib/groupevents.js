const { isJidGroup } = require('jawi');
const config = require('../config');

const ppUrls = [
    'https://i.ibb.co/9mb9vpXb/IMG-20260124-WA0727.jpg',
    'https://i.ibb.co/gM7NPd71/IMG-20260124-WA0730.jpg',
    'https://i.ibb.co/WWRxnc5D/IMG-20260124-WA0728.jpg',
];

const GroupEvents = async (conn, update) => {
    try {
        // Debug log to check if event is triggered
        console.log('📢 Group Event Received:', JSON.stringify(update, null, 2));

        if (!update || !update.id || !update.participants || !update.action) {
            console.log('❌ Invalid update object');
            return;
        }

        const isGroup = isJidGroup(update.id);
        if (!isGroup) {
            console.log('❌ Not a group chat');
            return;
        }

        console.log('✅ Processing group event:', update.action);

        const metadata = await conn.groupMetadata(update.id);
        const participants = update.participants;
        const desc = metadata.desc || "No Description";
        const groupMembersCount = metadata.participants.length;

        let ppUrl;
        try {
            ppUrl = await conn.profilePictureUrl(update.id, 'image');
        } catch {
            ppUrl = ppUrls[Math.floor(Math.random() * ppUrls.length)];
        }

        for (const num of participants) {
            const userName = num.split("@")[0];
            const timestamp = new Date().toLocaleString();

            if (update.action === "add" && config.WELCOME === "true") {
                console.log('📨 Sending welcome message to:', userName);
                
                const WelcomeText = `╭─〔 *🤖 ${config.BOT_NAME}* 〕\n` +
                    `├─▸ *Welcome @${userName} to ${metadata.subject}* 🎉\n` +
                    `├─ *You are member number ${groupMembersCount}* \n` +
                    `├─ *Time joined:* ${timestamp}\n` +
                    `╰─➤ *Please read group description*\n\n` +
                    `╭──〔 📜 *Group Description* 〕\n` +
                    `├─ ${desc}\n` +
                    `╰─🚀 *Powered by ${config.BOT_NAME}*`;

                await conn.sendMessage(update.id, {
                    image: { url: ppUrl },
                    caption: WelcomeText,
                    mentions: [num]
                });
                
                console.log('✅ Welcome message sent!');

            } else if (update.action === "remove" && config.GOODBYE === "true") {
                console.log('📨 Sending goodbye message for:', userName);
                
                const GoodbyeText = `╭─〔 *🤖 ${config.BOT_NAME}* 〕\n` +
                    `├─▸ *Goodbye @${userName}* 😔\n` +
                    `├─ *Time left:* ${timestamp}\n` +
                    `├─ *Members remaining:* ${groupMembersCount}\n` +
                    `╰─➤ *We'll miss you!*\n\n` +
                    `╰─🚀 *Powered by ${config.BOT_NAME}*`;

                await conn.sendMessage(update.id, {
                    image: { url: ppUrl },
                    caption: GoodbyeText,
                    mentions: [num]
                });
                
                console.log('✅ Goodbye message sent!');

            } else if (update.action === "demote" && config.ADMIN_ACTION === "true") {
                const demoter = update.author?.split("@")[0] || "Admin";
                await conn.sendMessage(update.id, {
                    text: `╭─〔 *⚠️ Admin Event* 〕\n` +
                          `├─ @${demoter} demoted @${userName}\n` +
                          `├─ *Time:* ${timestamp}\n` +
                          `├─ *Group:* ${metadata.subject}\n` +
                          `╰─➤ *Powered by ${config.BOT_NAME}*`,
                    mentions: [update.author, num].filter(Boolean)
                });

            } else if (update.action === "promote" && config.ADMIN_ACTION === "true") {
                const promoter = update.author?.split("@")[0] || "Admin";
                await conn.sendMessage(update.id, {
                    text: `╭─〔 *🎉 Admin Event* 〕\n` +
                          `├─ @${promoter} promoted @${userName}\n` +
                          `├─ *Time:* ${timestamp}\n` +
                          `├─ *Group:* ${metadata.subject}\n` +
                          `╰─➤ *Powered by ${config.BOT_NAME}*`,
                    mentions: [update.author, num].filter(Boolean)
                });
            }
        }
    } catch (err) {
        console.error('❌ Group event error:', err);
    }
};

module.exports = GroupEvents;
