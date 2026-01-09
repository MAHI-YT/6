const { cmd } = require('../command');
const axios = require('axios');
const FormData = require('form-data');

cmd({
    pattern: "toanime",
    alias: ["anime", "animeme", "animefy"],
    desc: "Convert photo to anime style",
    category: "tools",
    react: "🎨",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        // Check if user replied to an image or sent image with command
        const isQuotedImage = quoted?.mimetype?.startsWith('image');
        const isDirectImage = mek.message?.imageMessage;

        if (!isQuotedImage && !isDirectImage) {
            return await conn.sendMessage(from, { 
                text: "❌ Please reply to an image or send an image with the command!\n\n*Example:* Reply to a photo with *.toanime*" 
            }, { quoted: mek });
        }

        // React to show processing
        await conn.sendMessage(from, { 
            react: { text: "⏳", key: mek.key } 
        });

        await conn.sendMessage(from, { 
            text: "🎨 Converting to anime style... Please wait!" 
        }, { quoted: mek });

        // Download the image
        let buffer;
        if (isQuotedImage) {
            buffer = await quoted.download();
        } else {
            buffer = await conn.downloadMediaMessage(mek);
        }

        if (!buffer) {
            await conn.sendMessage(from, { 
                react: { text: "❌", key: mek.key } 
            });
            return reply("❌ Failed to download image!");
        }

        // Create form data
        const formData = new FormData();
        formData.append('image', buffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg'
        });

        // Send to API
        const response = await axios.post('https://api-faa.my.id/faa/toanime', formData, {
            headers: {
                ...formData.getHeaders()
            },
            responseType: 'arraybuffer',
            timeout: 60000
        });

        // Check if response is an image
        const contentType = response.headers['content-type'];
        
        if (contentType && contentType.includes('image')) {
            // Send the anime image
            await conn.sendMessage(from, {
                image: Buffer.from(response.data),
                caption: "🎨 *Anime Style Photo* ✨\n\n_Converted successfully!_"
            }, { quoted: mek });

            await conn.sendMessage(from, { 
                react: { text: "✅", key: mek.key } 
            });
        } else {
            // If response is JSON, try to get image URL
            const jsonResponse = JSON.parse(Buffer.from(response.data).toString());
            
            if (jsonResponse.result || jsonResponse.url || jsonResponse.image) {
                const imageUrl = jsonResponse.result || jsonResponse.url || jsonResponse.image;
                
                await conn.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: "🎨 *Anime Style Photo* ✨\n\n_Converted successfully!_"
                }, { quoted: mek });

                await conn.sendMessage(from, { 
                    react: { text: "✅", key: mek.key } 
                });
            } else {
                throw new Error("Invalid API response");
            }
        }

    } catch (e) {
        console.error("ToAnime Error:", e);
        
        await conn.sendMessage(from, { 
            react: { text: "❌", key: mek.key } 
        });

        await conn.sendMessage(from, { 
            text: `❌ Failed to convert image!\n\nError: ${e.message}` 
        }, { quoted: mek });
    }
});
