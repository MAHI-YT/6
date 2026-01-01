const { cmd } = require('../command');
const config = require('../config');
const axios = require('axios');

cmd({
    pattern: "faceswap",
    alias: ["swap", "fs"],
    desc: "Swap faces - Reply to first image, send second with command",
    category: "tools",
    react: "🔄",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        // Method 1: Send image with caption .faceswap (first image)
        // Then reply to bot's message with second image
        
        const isQuotedImage = quoted && (
            quoted.mtype === 'imageMessage' || 
            quoted.message?.imageMessage
        );
        
        const isDirectImage = mek.message?.imageMessage || 
                              m.mtype === 'imageMessage';

        // If sending image with command = first image
        if (isDirectImage && !isQuotedImage) {
            await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
            
            const firstImage = await m.download();
            if (!firstImage) return reply("❌ ғᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ɪᴍᴀɢᴇ!");

            // Store image in global temp
            global.faceswapTemp = global.faceswapTemp || {};
            const sender = mek.key.participant || mek.key.remoteJid;
            global.faceswapTemp[sender] = {
                image: firstImage,
                time: Date.now()
            };

            await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
            return await reply(`✅ *ғɪʀsᴛ ɪᴍᴀɢᴇ sᴀᴠᴇᴅ!*\n\n📷 *ɴᴏᴡ sᴇɴᴅ sᴇᴄᴏɴᴅ ɪᴍᴀɢᴇ ᴡɪᴛʜ:* .faceswap\n\n⏳ ᴠᴀʟɪᴅ ғᴏʀ 5 ᴍɪɴᴜᴛᴇs`);
        }

        // If sending second image with command
        if (isDirectImage) {
            const sender = mek.key.participant || mek.key.remoteJid;
            
            // Check if first image exists
            if (!global.faceswapTemp?.[sender]) {
                return reply(`❌ *ɴᴏ ғɪʀsᴛ ɪᴍᴀɢᴇ ғᴏᴜɴᴅ!*\n\n*ʜᴏᴡ ᴛᴏ ᴜsᴇ:*\n1️⃣ sᴇɴᴅ ғɪʀsᴛ ɪᴍᴀɢᴇ ᴡɪᴛʜ .faceswap\n2️⃣ sᴇɴᴅ sᴇᴄᴏɴᴅ ɪᴍᴀɢᴇ ᴡɪᴛʜ .faceswap`);
            }

            // Check if expired (5 minutes)
            if (Date.now() - global.faceswapTemp[sender].time > 300000) {
                delete global.faceswapTemp[sender];
                return reply("❌ ғɪʀsᴛ ɪᴍᴀɢᴇ ᴇxᴘɪʀᴇᴅ! ᴘʟᴇᴀsᴇ sᴛᴀʀᴛ ᴀɢᴀɪɴ.");
            }

            await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

            const firstImage = global.faceswapTemp[sender].image;
            const secondImage = await m.download();
            
            if (!secondImage) return reply("❌ ғᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ sᴇᴄᴏɴᴅ ɪᴍᴀɢᴇ!");

            await reply("⏳ *ᴘʀᴏᴄᴇssɪɴɢ ғᴀᴄᴇ sᴡᴀᴘ...*\n\n_ᴛʜɪs ᴍᴀʏ ᴛᴀᴋᴇ 30-60 sᴇᴄᴏɴᴅs..._");

            // Process face swap
            let resultBuffer = null;

            // API Option 1 - Using base64
            try {
                const base64Img1 = firstImage.toString('base64');
                const base64Img2 = secondImage.toString('base64');
                
                const response = await axios.post('https://api.ryzendesu.vip/api/ai/faceswap', {
                    sourceImage: `data:image/jpeg;base64,${base64Img1}`,
                    targetImage: `data:image/jpeg;base64,${base64Img2}`
                }, {
                    timeout: 120000
                });
                
                if (response.data?.result) {
                    const imgRes = await axios.get(response.data.result, { responseType: 'arraybuffer' });
                    resultBuffer = Buffer.from(imgRes.data);
                }
            } catch (err) {
                console.log('API 1 error:', err.message);
            }

            // API Option 2
            if (!resultBuffer) {
                try {
                    const FormData = require('form-data');
                    const form = new FormData();
                    form.append('source', firstImage, 'source.jpg');
                    form.append('target', secondImage, 'target.jpg');
                    
                    const response = await axios.post('https://api.vhtear.com/faceswap', form, {
                        headers: form.getHeaders(),
                        responseType: 'arraybuffer',
                        timeout: 120000
                    });
                    resultBuffer = Buffer.from(response.data);
                } catch (err) {
                    console.log('API 2 error:', err.message);
                }
            }

            // Clear temp
            delete global.faceswapTemp[sender];

            if (resultBuffer) {
                await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
                
                await conn.sendMessage(from, {
                    image: resultBuffer,
                    caption: `✅ *ғᴀᴄᴇ sᴡᴀᴘ ᴄᴏᴍᴘʟᴇᴛᴇ!*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.OWNER_NAME}`
                }, { quoted: mek });
            } else {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                await reply("❌ ғᴀᴄᴇ sᴡᴀᴘ ғᴀɪʟᴇᴅ! ᴀᴘɪ ɴᴏᴛ ʀᴇsᴘᴏɴᴅɪɴɢ.");
            }
            return;
        }

        // If no image
        return reply(`📷 *ғᴀᴄᴇ sᴡᴀᴘ*\n\n*ʜᴏᴡ ᴛᴏ ᴜsᴇ:*\n\n1️⃣ sᴇɴᴅ ғɪʀsᴛ ɪᴍᴀɢᴇ ᴡɪᴛʜ ᴄᴀᴘᴛɪᴏɴ: .faceswap\n2️⃣ sᴇɴᴅ sᴇᴄᴏɴᴅ ɪᴍᴀɢᴇ ᴡɪᴛʜ ᴄᴀᴘᴛɪᴏɴ: .faceswap\n\n✅ ᴅᴏɴᴇ!`);

    } catch (e) {
        console.error("FaceSwap Error:", e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ ᴇʀʀᴏʀ: ${e.message}`);
    }
});
