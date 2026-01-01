const { cmd } = require('../command');
const config = require('../config');
const axios = require('axios');
const FormData = require('form-data');

cmd({
    pattern: "faceswap",
    alias: ["swap", "fs"],
    desc: "Swap faces between two images",
    category: "tools",
    react: "🔄",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        // Check if replying to an image
        const isQuotedImage = quoted && (
            quoted.mtype === 'imageMessage' || 
            (quoted.message && quoted.message.imageMessage)
        );
        
        const isDirectImage = mek.message?.imageMessage || 
                              m.mtype === 'imageMessage';

        if (!isQuotedImage && !isDirectImage) {
            return reply(`❌ *ᴘʟᴇᴀsᴇ sᴇɴᴅ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴀɴ ɪᴍᴀɢᴇ!*\n\n*ᴜsᴀɢᴇ:*\n1️⃣ sᴇɴᴅ ғɪʀsᴛ ɪᴍᴀɢᴇ ᴡɪᴛʜ ᴄᴀᴘᴛɪᴏɴ .faceswap\n2️⃣ ᴛʜᴇɴ ʀᴇᴘʟʏ ᴛᴏ ʙᴏᴛ's ᴍᴇssᴀɢᴇ ᴡɪᴛʜ sᴇᴄᴏɴᴅ ɪᴍᴀɢᴇ`);
        }

        // Show processing
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // Download the first image
        let imageBuffer;
        
        if (isDirectImage) {
            // Image sent with command
            imageBuffer = await m.download();
        } else if (isQuotedImage) {
            // Replying to an image
            imageBuffer = await quoted.download();
        }

        if (!imageBuffer) {
            return reply("❌ ғᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ ɪᴍᴀɢᴇ!");
        }

        // Store first image and ask for second
        const waitMsg = await conn.sendMessage(from, {
            text: `✅ *ғɪʀsᴛ ɪᴍᴀɢᴇ ʀᴇᴄᴇɪᴠᴇᴅ!*\n\n📷 *ɴᴏᴡ sᴇɴᴅ ᴛʜᴇ sᴇᴄᴏɴᴅ ɪᴍᴀɢᴇ*\n\n⏳ ʏᴏᴜ ʜᴀᴠᴇ 60 sᴇᴄᴏɴᴅs...`
        }, { quoted: mek });

        const waitMsgId = waitMsg.key.id;

        // Wait for second image
        let secondImageBuffer = null;
        let receivedSecondImage = false;

        const handler = async (msgData) => {
            try {
                if (receivedSecondImage) return;

                const receivedMsg = msgData.messages[0];
                if (!receivedMsg?.message) return;
                if (receivedMsg.key.remoteJid !== from) return;

                // Check if it's from the same user
                const msgSender = receivedMsg.key.participant || receivedMsg.key.remoteJid;
                const originalSender = mek.key.participant || mek.key.remoteJid;
                
                if (msgSender !== originalSender) return;

                // Check if it's an image
                const msgType = Object.keys(receivedMsg.message)[0];
                const isImage = msgType === 'imageMessage' || 
                               (msgType === 'extendedTextMessage' && 
                                receivedMsg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage);

                if (!isImage && msgType !== 'imageMessage') {
                    // Check for viewOnce image
                    if (receivedMsg.message.viewOnceMessage?.message?.imageMessage ||
                        receivedMsg.message.viewOnceMessageV2?.message?.imageMessage) {
                        // Handle viewOnce
                    } else {
                        return;
                    }
                }

                receivedSecondImage = true;

                // Download second image
                try {
                    let downloadStream;
                    
                    if (receivedMsg.message.imageMessage) {
                        downloadStream = await conn.downloadMediaMessage(receivedMsg);
                    } else if (receivedMsg.message.viewOnceMessage?.message?.imageMessage) {
                        downloadStream = await conn.downloadMediaMessage({
                            key: receivedMsg.key,
                            message: receivedMsg.message.viewOnceMessage.message
                        });
                    } else if (receivedMsg.message.viewOnceMessageV2?.message?.imageMessage) {
                        downloadStream = await conn.downloadMediaMessage({
                            key: receivedMsg.key,
                            message: receivedMsg.message.viewOnceMessageV2.message
                        });
                    }

                    if (downloadStream) {
                        secondImageBuffer = downloadStream;
                    }
                } catch (dlErr) {
                    console.error('Download error:', dlErr);
                }

                if (!secondImageBuffer) {
                    await reply("❌ ғᴀɪʟᴇᴅ ᴛᴏ ᴅᴏᴡɴʟᴏᴀᴅ sᴇᴄᴏɴᴅ ɪᴍᴀɢᴇ!");
                    return;
                }

                // React processing
                await conn.sendMessage(from, { react: { text: '🔄', key: mek.key } });

                await conn.sendMessage(from, {
                    text: `✅ *sᴇᴄᴏɴᴅ ɪᴍᴀɢᴇ ʀᴇᴄᴇɪᴠᴇᴅ!*\n\n⏳ *ᴘʀᴏᴄᴇssɪɴɢ ғᴀᴄᴇ sᴡᴀᴘ...*\n\n_ᴛʜɪs ᴍᴀʏ ᴛᴀᴋᴇ ᴀ ᴍᴏᴍᴇɴᴛ..._`
                }, { quoted: receivedMsg });

                // Process face swap using API
                try {
                    const form = new FormData();
                    form.append('image1', imageBuffer, { filename: 'image1.jpg', contentType: 'image/jpeg' });
                    form.append('image2', secondImageBuffer, { filename: 'image2.jpg', contentType: 'image/jpeg' });

                    // Try multiple APIs
                    let resultBuffer = null;
                    
                    // API Option 1
                    try {
                        const response = await axios.post('https://api.apibox.pro/faceswap', form, {
                            headers: { ...form.getHeaders() },
                            responseType: 'arraybuffer',
                            timeout: 60000
                        });
                        resultBuffer = Buffer.from(response.data);
                    } catch (api1Err) {
                        console.log('API 1 failed:', api1Err.message);
                    }

                    // API Option 2
                    if (!resultBuffer) {
                        try {
                            const base64Img1 = imageBuffer.toString('base64');
                            const base64Img2 = secondImageBuffer.toString('base64');
                            
                            const response = await axios.post('https://api.ryzendesu.vip/api/ai/faceswap', {
                                image1: base64Img1,
                                image2: base64Img2
                            }, {
                                responseType: 'arraybuffer',
                                timeout: 60000
                            });
                            resultBuffer = Buffer.from(response.data);
                        } catch (api2Err) {
                            console.log('API 2 failed:', api2Err.message);
                        }
                    }

                    // API Option 3
                    if (!resultBuffer) {
                        try {
                            const form2 = new FormData();
                            form2.append('target', imageBuffer, { filename: 'target.jpg' });
                            form2.append('source', secondImageBuffer, { filename: 'source.jpg' });
                            
                            const response = await axios.post('https://api.nekobot.xyz/api/imagegen?type=faceswap', form2, {
                                headers: { ...form2.getHeaders() },
                                timeout: 60000
                            });
                            
                            if (response.data?.message) {
                                const imgResponse = await axios.get(response.data.message, { responseType: 'arraybuffer' });
                                resultBuffer = Buffer.from(imgResponse.data);
                            }
                        } catch (api3Err) {
                            console.log('API 3 failed:', api3Err.message);
                        }
                    }

                    if (resultBuffer) {
                        // Success - send result
                        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
                        
                        await conn.sendMessage(from, {
                            image: resultBuffer,
                            caption: `✅ *ғᴀᴄᴇ sᴡᴀᴘ ᴄᴏᴍᴘʟᴇᴛᴇ!*\n\n> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ${config.OWNER_NAME}`
                        }, { quoted: receivedMsg });
                    } else {
                        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                        await reply("❌ ғᴀᴄᴇ sᴡᴀᴘ ғᴀɪʟᴇᴅ! ᴀᴘɪ ɴᴏᴛ ᴀᴠᴀɪʟᴀʙʟᴇ.");
                    }

                } catch (processErr) {
                    console.error('Process error:', processErr);
                    await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                    await reply("❌ ғᴀᴄᴇ sᴡᴀᴘ ᴘʀᴏᴄᴇssɪɴɢ ғᴀɪʟᴇᴅ!");
                }

            } catch (handlerErr) {
                console.error('Handler error:', handlerErr);
            }
        };

        // Add listener
        conn.ev.on("messages.upsert", handler);

        // Timeout after 60 seconds
        setTimeout(async () => {
            conn.ev.off("messages.upsert", handler);
            
            if (!receivedSecondImage) {
                await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
                await conn.sendMessage(from, {
                    text: `❌ *ᴛɪᴍᴇᴏᴜᴛ!*\n\nʏᴏᴜ ᴅɪᴅɴ'ᴛ sᴇɴᴅ ᴛʜᴇ sᴇᴄᴏɴᴅ ɪᴍᴀɢᴇ ɪɴ 60 sᴇᴄᴏɴᴅs.\n\nᴘʟᴇᴀsᴇ ᴛʀʏ ᴀɢᴀɪɴ ᴡɪᴛʜ .faceswap`
                }, { quoted: mek });
            }
        }, 60000);

    } catch (e) {
        console.error("FaceSwap Error:", e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
        reply(`❌ ᴇʀʀᴏʀ: ${e.message}`);
    }
});
