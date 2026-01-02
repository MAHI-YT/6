const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "pinterestimg",
    alias: ["pinimg", "pinimg", "pinterestdlimg", "pindl"],
    react: "📌",
    desc: "Download images from Pinterest. Search by keyword or provide direct link.",
    category: "download",
    use: ".pinterest <search query> OR .pinterest <pinterest link>",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        // Check if query/link is provided
        const input = args.join(' ').trim();
        
        if (!input) {
            return reply(`📌 *Pinterest Image Downloader*\n\n❌ Please provide a search query or Pinterest link!\n\n*Usage:*\n• \`.pinterest anime girl\`\n• \`.pinterest cats\`\n• \`.pinterest https://pinterest.com/pin/xxx\`\n\n_Powered by DARKZONE-MD_`);
        }

        // Check if input is a link or search query
        const isLink = input.startsWith('http://') || input.startsWith('https://') || input.includes('pinterest.com') || input.includes('pin.it');

        let processingMsg;

        // ========== FEATURE 1: SEARCH BY KEYWORD ==========
        if (!isLink) {
            processingMsg = await conn.sendMessage(from, {
                text: `📌 *Pinterest Search*\n\n🔍 Searching for: *${input}*\n\n⏳ Please wait...`
            }, { quoted: mek });

            // Call Pinterest API with search query
            let apiResponse;
            try {
                apiResponse = await axios.get(`https://api-faa.my.id/faa/pinterest?query=${encodeURIComponent(input)}`, {
                    timeout: 30000
                });
            } catch (apiErr) {
                console.error("Pinterest API Error:", apiErr.message);
                return reply("❌ Failed to search Pinterest. API might be down. Please try again later.");
            }

            // Validate response
            if (!apiResponse.data || !apiResponse.data.status) {
                return reply("❌ No results found. Please try a different search query.");
            }

            const images = apiResponse.data.result;

            if (!images || images.length === 0) {
                return reply(`❌ No images found for "*${input}*". Try a different search query.`);
            }

            // Delete processing message
            try {
                await conn.sendMessage(from, { delete: processingMsg.key });
            } catch (e) {}

            // Send info message
            await conn.sendMessage(from, {
                text: `📌 *Pinterest Search Results*\n\n🔍 *Query:* ${input}\n📷 *Images Found:* ${images.length}\n\n⏳ Sending images...`
            }, { quoted: mek });

            // Send images (limit to 5 to avoid spam)
            const maxImages = Math.min(images.length, 5);
            let sentCount = 0;

            for (let i = 0; i < maxImages; i++) {
                try {
                    const imageUrl = images[i];
                    
                    // Download image
                    const imageResponse = await axios.get(imageUrl, {
                        responseType: 'arraybuffer',
                        timeout: 30000
                    });

                    const imageBuffer = Buffer.from(imageResponse.data);

                    // Send image
                    await conn.sendMessage(from, {
                        image: imageBuffer,
                        caption: `📌 *Pinterest Image ${i + 1}/${maxImages}*\n\n🔍 *Search:* ${input}\n🔗 *Source:* Pinterest\n\n━━━━━━━━━━━━━━━━━━━━━\n*📥 Downloaded by DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━`
                    }, { quoted: mek });

                    sentCount++;
                    
                    // Small delay between images
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (imgErr) {
                    console.error(`Failed to send image ${i + 1}:`, imgErr.message);
                    continue;
                }
            }

            // Final summary message
            if (sentCount > 0) {
                await conn.sendMessage(from, {
                    text: `✅ *Download Complete!*\n\n📷 *Sent:* ${sentCount} images\n🔍 *Query:* ${input}\n\n💡 _Use \`.pinterest ${input} more\` for different images_\n\n*🌟 DARKZONE-MD*`
                }, { quoted: mek });
            } else {
                reply("❌ Failed to download images. Please try again.");
            }

        }
        
        // ========== FEATURE 2: DOWNLOAD FROM LINK ==========
        else {
            processingMsg = await conn.sendMessage(from, {
                text: `📌 *Pinterest Link Download*\n\n🔗 Processing link...\n\n⏳ Please wait...`
            }, { quoted: mek });

            // Call Pinterest API with link
            let apiResponse;
            try {
                apiResponse = await axios.get(`https://api-faa.my.id/faa/pinterest?url=${encodeURIComponent(input)}`, {
                    timeout: 30000
                });
            } catch (apiErr) {
                console.error("Pinterest API Error:", apiErr.message);
                
                // If URL method fails, try as search (some APIs work differently)
                try {
                    apiResponse = await axios.get(`https://api-faa.my.id/faa/pinterest?query=${encodeURIComponent(input)}`, {
                        timeout: 30000
                    });
                } catch (err2) {
                    return reply("❌ Failed to download from this link. Please try again or use search instead.");
                }
            }

            // Validate response
            if (!apiResponse.data || !apiResponse.data.status) {
                return reply("❌ Failed to get image from this link. Please check the URL.");
            }

            const images = apiResponse.data.result;

            if (!images || images.length === 0) {
                return reply("❌ No image found at this link. Please check the URL.");
            }

            // Delete processing message
            try {
                await conn.sendMessage(from, { delete: processingMsg.key });
            } catch (e) {}

            // Get first image (for link download usually returns 1 image)
            const imageUrl = Array.isArray(images) ? images[0] : images;

            // Download image
            let imageBuffer;
            try {
                const imageResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                imageBuffer = Buffer.from(imageResponse.data);
            } catch (downloadErr) {
                console.error("Image download error:", downloadErr.message);
                return reply(`❌ Failed to download image.\n\n🔗 *Direct Link:*\n${imageUrl}\n\n_Try opening in browser_`);
            }

            // Send image
            await conn.sendMessage(from, {
                image: imageBuffer,
                caption: `📌 *Pinterest Image Downloaded*\n\n🔗 *Source:* Pinterest\n📥 *Status:* Success ✅\n\n━━━━━━━━━━━━━━━━━━━━━\n*📥 Downloaded by DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━`
            }, { quoted: mek });

        }

    } catch (e) {
        console.error("Pinterest command error:", e);
        reply("❌ An unexpected error occurred. Please try again later.");
    }
});

// ========== PINTEREST RANDOM IMAGE ==========

cmd({
    pattern: "pinrandom",
    alias: ["randompin", "randompinterest"],
    react: "🎲",
    desc: "Get random Pinterest images by category",
    category: "download",
    use: ".pinrandom <category>",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        const category = args.join(' ').trim();

        if (!category) {
            return reply(`🎲 *Pinterest Random Images*\n\n❌ Please provide a category!\n\n*Popular Categories:*\n• anime\n• nature\n• cars\n• aesthetic\n• quotes\n• wallpaper\n• art\n• fashion\n\n*Usage:* \`.pinrandom anime\`\n\n_Powered by DARKZONE-MD_`);
        }

        const processingMsg = await conn.sendMessage(from, {
            text: `🎲 *Getting Random Images...*\n\n📂 Category: *${category}*\n⏳ Please wait...`
        }, { quoted: mek });

        // Call API
        let apiResponse;
        try {
            apiResponse = await axios.get(`https://api-faa.my.id/faa/pinterest?query=${encodeURIComponent(category)}`, {
                timeout: 30000
            });
        } catch (apiErr) {
            return reply("❌ Failed to fetch images. Please try again.");
        }

        if (!apiResponse.data || !apiResponse.data.status || !apiResponse.data.result) {
            return reply("❌ No images found for this category.");
        }

        const images = apiResponse.data.result;

        if (images.length === 0) {
            return reply("❌ No images found. Try a different category.");
        }

        // Delete processing message
        try {
            await conn.sendMessage(from, { delete: processingMsg.key });
        } catch (e) {}

        // Get random image from results
        const randomIndex = Math.floor(Math.random() * images.length);
        const randomImageUrl = images[randomIndex];

        // Download and send
        try {
            const imageResponse = await axios.get(randomImageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            const imageBuffer = Buffer.from(imageResponse.data);

            await conn.sendMessage(from, {
                image: imageBuffer,
                caption: `🎲 *Random Pinterest Image*\n\n📂 *Category:* ${category}\n🔢 *Total Available:* ${images.length}\n\n━━━━━━━━━━━━━━━━━━━━━\n*📥 Downloaded by DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━\n\n_Use \`.pinrandom ${category}\` for another random image_`
            }, { quoted: mek });

        } catch (err) {
            reply("❌ Failed to download the random image. Please try again.");
        }

    } catch (e) {
        console.error("Pinterest random error:", e);
        reply("❌ An error occurred. Please try again.");
    }
});

// ========== PINTEREST BULK DOWNLOAD ==========

cmd({
    pattern: "pinbulk",
    alias: ["pinterestbulk", "pinall"],
    react: "📦",
    desc: "Download multiple Pinterest images at once",
    category: "download",
    use: ".pinbulk <search> <count>",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        if (args.length < 1) {
            return reply(`📦 *Pinterest Bulk Download*\n\n❌ Please provide search query and count!\n\n*Usage:*\n• \`.pinbulk anime 10\`\n• \`.pinbulk cars 5\`\n\n*Max:* 15 images\n\n_Powered by DARKZONE-MD_`);
        }

        // Parse arguments
        let count = 5; // Default
        let searchQuery = args.join(' ');

        // Check if last argument is a number
        const lastArg = args[args.length - 1];
        if (!isNaN(lastArg)) {
            count = parseInt(lastArg);
            searchQuery = args.slice(0, -1).join(' ');
        }

        // Limit count
        count = Math.min(Math.max(count, 1), 15);

        if (!searchQuery) {
            return reply("❌ Please provide a search query!");
        }

        const processingMsg = await conn.sendMessage(from, {
            text: `📦 *Pinterest Bulk Download*\n\n🔍 *Search:* ${searchQuery}\n📷 *Requested:* ${count} images\n\n⏳ Downloading...`
        }, { quoted: mek });

        // Call API
        let apiResponse;
        try {
            apiResponse = await axios.get(`https://api-faa.my.id/faa/pinterest?query=${encodeURIComponent(searchQuery)}`, {
                timeout: 30000
            });
        } catch (apiErr) {
            return reply("❌ Failed to fetch images. Please try again.");
        }

        if (!apiResponse.data || !apiResponse.data.status || !apiResponse.data.result) {
            return reply("❌ No images found.");
        }

        const images = apiResponse.data.result;
        const actualCount = Math.min(count, images.length);

        // Delete processing message
        try {
            await conn.sendMessage(from, { delete: processingMsg.key });
        } catch (e) {}

        // Send progress message
        await conn.sendMessage(from, {
            text: `📦 *Starting Bulk Download...*\n\n🔍 *Query:* ${searchQuery}\n📷 *Sending:* ${actualCount} images\n\n⏳ Please wait...`
        }, { quoted: mek });

        let successCount = 0;

        for (let i = 0; i < actualCount; i++) {
            try {
                const imageUrl = images[i];

                const imageResponse = await axios.get(imageUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });

                const imageBuffer = Buffer.from(imageResponse.data);

                await conn.sendMessage(from, {
                    image: imageBuffer,
                    caption: `📌 *[${i + 1}/${actualCount}]*\n\n🔍 *Search:* ${searchQuery}\n\n━━━━━━━━━━━━━━━━━━━━━\n*📥 DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━`
                }, { quoted: mek });

                successCount++;

                // Delay between sends
                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (err) {
                console.error(`Failed to send image ${i + 1}:`, err.message);
                continue;
            }
        }

        // Final message
        await conn.sendMessage(from, {
            text: `✅ *Bulk Download Complete!*\n\n📷 *Downloaded:* ${successCount}/${actualCount}\n🔍 *Query:* ${searchQuery}\n\n━━━━━━━━━━━━━━━━━━━━━\n*🌟 DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: mek });

    } catch (e) {
        console.error("Pinterest bulk error:", e);
        reply("❌ An error occurred. Please try again.");
    }
});
