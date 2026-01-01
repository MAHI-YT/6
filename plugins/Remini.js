const axios = require('axios');
const { cmd } = require('../command');
const FormData = require('form-data');

// Store active face swap sessions
const faceSwapSessions = {};

// Function to upload image to Catbox.moe
async function uploadToCatbox(buffer) {
    try {
        const formData = new FormData();
        formData.append('reqtype', 'fileupload');
        formData.append('fileToUpload', buffer, { 
            filename: 'image.jpg',
            contentType: 'image/jpeg'
        });
        
        const response = await axios.post('https://catbox.moe/user/api.php', formData, {
            headers: formData.getHeaders(),
            timeout: 30000
        });
        
        return response.data;
    } catch (error) {
        console.error('Catbox Upload Error:', error);
        throw new Error('Failed to upload image');
    }
}

// Main command to start face swap session
cmd({
    pattern: "faceswap",
    alias: ["fs", "swapface", "swap"],
    react: "🔄",
    desc: "Swap faces between two images",
    category: "tools",
    use: ".faceswap",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply }) => {
    try {
        const sessionKey = `${from}_${sender}`;
        
        // Check if session already exists
        if (faceSwapSessions[sessionKey]) {
            const remaining = Math.max(0, Math.floor((60000 - (Date.now() - faceSwapSessions[sessionKey].startTime)) / 1000));
            return reply(`⚠️ *Active Session Found!*\n\n📸 Images received: ${faceSwapSessions[sessionKey].images.length}/2\n⏱️ Time remaining: ${remaining} seconds\n\n_Send your images or wait for session to expire._`);
        }
        
        // Create new session
        faceSwapSessions[sessionKey] = {
            images: [],
            startTime: Date.now(),
            from: from,
            sender: sender
        };
        
        await reply(`🔄 *Face Swap Session Started!*\n\n📸 Send *2 images* within *60 seconds*\n\n🖼️ *Image 1:* Face to swap (source)\n🖼️ *Image 2:* Target image\n\n⏱️ Timer: 60 seconds\n\n_Send images one by one or both together!_`);
        
        // Auto-expire session after 60 seconds
        setTimeout(async () => {
            if (faceSwapSessions[sessionKey]) {
                const session = faceSwapSessions[sessionKey];
                if (session.images.length < 2) {
                    delete faceSwapSessions[sessionKey];
                    try {
                        await conn.sendMessage(from, { 
                            text: `⏰ *Session Expired!*\n\n❌ You sent ${session.images.length}/2 images within 60 seconds.\n\n_Type .faceswap to start again._`
                        });
                    } catch (e) {
                        console.error('Session expire message error:', e);
                    }
                }
            }
        }, 60000);
        
    } catch (error) {
        console.error('Face Swap Start Error:', error);
        reply("❌ An error occurred while starting face swap session.");
    }
});

// Image listener for face swap
cmd({
    on: "image"
}, async (conn, mek, m, { from, sender, isGroup }) => {
    try {
        const sessionKey = `${from}_${sender}`;
        
        // Check if user has active session
        if (!faceSwapSessions[sessionKey]) {
            return; // No active session, ignore
        }
        
        const session = faceSwapSessions[sessionKey];
        
        // Check if session expired
        if (Date.now() - session.startTime > 60000) {
            delete faceSwapSessions[sessionKey];
            return;
        }
        
        // Check if already processing
        if (session.processing) {
            return;
        }
        
        // Already have 2 images
        if (session.images.length >= 2) {
            return;
        }
        
        // React to show processing
        await conn.sendMessage(from, { 
            react: { text: "⏳", key: mek.key }
        });
        
        // Download the image
        const imageBuffer = await mek.download();
        
        if (!imageBuffer || imageBuffer.length === 0) {
            await conn.sendMessage(from, { 
                react: { text: "❌", key: mek.key }
            });
            return await conn.sendMessage(from, { 
                text: "❌ Failed to download image. Please send again." 
            }, { quoted: mek });
        }
        
        // Upload to catbox
        const imageUrl = await uploadToCatbox(imageBuffer);
        
        if (!imageUrl || !imageUrl.startsWith('http')) {
            await conn.sendMessage(from, { 
                react: { text: "❌", key: mek.key }
            });
            return await conn.sendMessage(from, { 
                text: "❌ Failed to upload image. Please try again." 
            }, { quoted: mek });
        }
        
        session.images.push(imageUrl);
        
        const timeRemaining = Math.max(0, Math.floor((60000 - (Date.now() - session.startTime)) / 1000));
        
        if (session.images.length === 1) {
            // First image received
            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key }
            });
            await conn.sendMessage(from, { 
                text: `✅ *Image 1 Received!*\n\n📸 Now send the *second image* (target)\n⏱️ Time remaining: ${timeRemaining} seconds`
            }, { quoted: mek });
            
        } else if (session.images.length === 2) {
            // Second image received - process face swap
            session.processing = true;
            
            await conn.sendMessage(from, { 
                react: { text: "🔄", key: mek.key }
            });
            await conn.sendMessage(from, { 
                text: "✅ *Image 2 Received!*\n\n🔄 Processing face swap...\n⏳ _This may take up to 2 minutes..._"
            }, { quoted: mek });
            
            try {
                // Call face swap API
                const apiUrl = `https://api.elrayyxml.web.id/api/tools/faceswap?url1=${encodeURIComponent(session.images[0])}&url2=${encodeURIComponent(session.images[1])}`;
                
                const response = await axios.get(apiUrl, { 
                    responseType: 'arraybuffer',
                    timeout: 120000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                // Check if response is valid image
                if (!response.data || response.data.length === 0) {
                    throw new Error('Empty response from API');
                }
                
                // Send the swapped image
                await conn.sendMessage(from, {
                    image: Buffer.from(response.data),
                    caption: `🔄 *Face Swap Complete!*\n\n✅ Successfully swapped faces!\n\n📸 Source: Image 1\n🎯 Target: Image 2\n\n*DARKZONE-MD*`,
                    contextInfo: {
                        mentionedJid: [sender],
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363416743041101@newsletter',
                            newsletterName: "DARKZONE-MD",
                            serverMessageId: 143,
                        },
                    },
                }, { quoted: mek });
                
                await conn.sendMessage(from, { 
                    react: { text: "✅", key: mek.key }
                });
                
            } catch (apiError) {
                console.error('Face Swap API Error:', apiError);
                await conn.sendMessage(from, { 
                    react: { text: "❌", key: mek.key }
                });
                await conn.sendMessage(from, { 
                    text: `❌ *Face Swap Failed!*\n\n${apiError.message || 'API error occurred'}\n\n_Please try again with .faceswap_`
                }, { quoted: mek });
            }
            
            // Clear session
            delete faceSwapSessions[sessionKey];
        }
        
    } catch (error) {
        console.error('Face Swap Image Handler Error:', error);
        const sessionKey = `${from}_${sender}`;
        
        if (faceSwapSessions[sessionKey]) {
            delete faceSwapSessions[sessionKey];
        }
        
        await conn.sendMessage(from, { 
            react: { text: "❌", key: mek.key }
        });
        await conn.sendMessage(from, { 
            text: "❌ *Error!*\n\nFailed to process image.\n\n_Please try again with .faceswap_"
        }, { quoted: mek });
    }
});

// Cancel command
cmd({
    pattern: "cancelswap",
    alias: ["csw", "cancelfs"],
    react: "❌",
    desc: "Cancel active face swap session",
    category: "tools",
    use: ".cancelswap",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply }) => {
    try {
        const sessionKey = `${from}_${sender}`;
        
        if (faceSwapSessions[sessionKey]) {
            delete faceSwapSessions[sessionKey];
            return reply("✅ Face swap session cancelled successfully!");
        } else {
            return reply("⚠️ You don't have any active face swap session.");
        }
        
    } catch (error) {
        console.error('Cancel Swap Error:', error);
        reply("❌ An error occurred.");
    }
});
