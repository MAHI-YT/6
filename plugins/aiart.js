const { cmd } = require('../command');
const axios = require('axios');

// ========== SINGLE PINTEREST IMAGE (FIXED) ==========

cmd({
    pattern: "pinimg",
    alias: ["pinterestimg", "onepin", "pinone"],
    react: "📌",
    desc: "Get single random Pinterest image",
    category: "download",
    use: ".pin1 <search>",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        const query = args.join(' ').trim();
        
        if (!query) {
            return reply("📌 *Pinterest Single Image*\n\n❌ Please provide search query!\n\n*Usage:* `.pin1 anime`\n\n_Powered by DARKZONE-MD_");
        }

        await reply(`🔍 Searching for: *${query}*\n\n⏳ Please wait...`);

        // Use same working format as main command
        const url = `https://api-faa.my.id/faa/pinterest?query=${encodeURIComponent(query)}`;
        
        console.log(`[Pin1] Calling API: ${url}`);

        const response = await axios({
            method: 'GET',
            url: url,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        const data = response.data;
        
        console.log(`[Pin1] Response status: ${data.status}`);
        
        if (!data || !data.status || !data.result || data.result.length === 0) {
            return reply("❌ No images found. Try different search.");
        }

        // Get random image from results
        const images = data.result;
        const randomIndex = Math.floor(Math.random() * images.length);
        const randomImage = images[randomIndex];

        console.log(`[Pin1] Selected image ${randomIndex + 1}/${images.length}`);

        // Download image
        const imageBuffer = await axios({
            method: 'GET',
            url: randomImage,
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }).then(res => Buffer.from(res.data));

        // Send image
        await conn.sendMessage(from, {
            image: imageBuffer,
            caption: `📌 *Pinterest Image*\n\n🔍 *Search:* ${query}\n📷 *Total Found:* ${images.length}\n🎲 *Selected:* Random #${randomIndex + 1}\n\n━━━━━━━━━━━━━━━━━━━━━\n*📥 Downloaded by DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━`
        }, { quoted: mek });

    } catch (e) {
        console.error("[Pin1] Error:", e.message);
        reply("❌ An error occurred. Please try again.\n\n_DARKZONE-MD_");
    }
});

// ========== PINTEREST WITH COUNT (FIXED) ==========

cmd({
    pattern: "pindl",
    alias: ["pinget", "getpin", "pincount"],
    react: "📦",
    desc: "Download specific number of Pinterest images",
    category: "download", 
    use: ".pindl <count> <search>",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        if (args.length < 2) {
            return reply("📦 *Pinterest Bulk Download*\n\n❌ Invalid format!\n\n*Usage:* `.pindl 5 anime`\n\n_First number, then search query_\n\n*Example:*\n• `.pindl 3 cats`\n• `.pindl 5 wallpaper`\n• `.pindl 10 nature`\n\n*Max:* 10 images\n\n_Powered by DARKZONE-MD_");
        }

        const count = parseInt(args[0]);
        const query = args.slice(1).join(' ').trim();

        if (isNaN(count) || count < 1) {
            return reply("❌ Please provide valid number!\n\n*Example:* `.pindl 3 cats`");
        }

        if (!query) {
            return reply("❌ Please provide search query!\n\n*Example:* `.pindl 5 anime`");
        }

        const maxCount = Math.min(count, 10); // Max 10 images

        await reply(`📦 *Pinterest Bulk Download*\n\n🔍 Search: *${query}*\n📷 Requested: *${maxCount} images*\n\n⏳ Downloading...`);

        // Use same working format as main command
        const url = `https://api-faa.my.id/faa/pinterest?query=${encodeURIComponent(query)}`;
        
        console.log(`[PinDL] Calling API: ${url}`);

        const response = await axios({
            method: 'GET',
            url: url,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        const data = response.data;
        
        console.log(`[PinDL] Response status: ${data.status}`);

        if (!data || !data.status || !data.result || data.result.length === 0) {
            return reply("❌ No images found. Try different search.");
        }

        const images = data.result;
        const actualCount = Math.min(maxCount, images.length);
        let sentCount = 0;

        console.log(`[PinDL] Found ${images.length} images, sending ${actualCount}`);

        for (let i = 0; i < actualCount; i++) {
            try {
                const imageUrl = images[i];
                
                // Validate URL
                if (!imageUrl || !imageUrl.startsWith('http')) {
                    console.log(`[PinDL] Invalid URL at index ${i}`);
                    continue;
                }

                // Download image
                const imageBuffer = await axios({
                    method: 'GET',
                    url: imageUrl,
                    responseType: 'arraybuffer',
                    timeout: 30000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }).then(res => Buffer.from(res.data));

                // Send image
                await conn.sendMessage(from, {
                    image: imageBuffer,
                    caption: `📌 *Pinterest [${i + 1}/${actualCount}]*\n\n🔍 *Search:* ${query}\n\n━━━━━━━━━━━━━━━━━━━━━\n*📥 DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━`
                }, { quoted: mek });

                sentCount++;
                console.log(`[PinDL] Sent image ${i + 1}/${actualCount}`);
                
                // Delay between images
                await new Promise(resolve => setTimeout(resolve, 1500));

            } catch (imgErr) {
                console.error(`[PinDL] Failed image ${i + 1}:`, imgErr.message);
                continue;
            }
        }

        // Final message
        if (sentCount > 0) {
            await reply(`✅ *Download Complete!*\n\n📷 *Sent:* ${sentCount}/${actualCount} images\n🔍 *Query:* ${query}\n\n━━━━━━━━━━━━━━━━━━━━━\n*🌟 DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━`);
        } else {
            await reply("❌ Failed to download images. Please try again.");
        }

    } catch (e) {
        console.error("[PinDL] Error:", e.message);
        reply("❌ An error occurred. Please try again.\n\n_DARKZONE-MD_");
    }
});

// ========== PINTEREST RANDOM ==========

cmd({
    pattern: "pinrandom",
    alias: ["randompin", "pinrand"],
    react: "🎲",
    desc: "Get random Pinterest image from category",
    category: "download",
    use: ".pinrandom <category>",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        const query = args.join(' ').trim();
        
        if (!query) {
            return reply(`🎲 *Pinterest Random*\n\n❌ Please provide category!\n\n*Popular Categories:*\n• anime\n• nature\n• cars\n• aesthetic\n• wallpaper\n• art\n• cute\n\n*Usage:* \`.pinrandom anime\`\n\n_Powered by DARKZONE-MD_`);
        }

        await reply(`🎲 Getting random *${query}* image...\n\n⏳ Please wait...`);

        // Use same working format
        const url = `https://api-faa.my.id/faa/pinterest?query=${encodeURIComponent(query)}`;
        
        console.log(`[PinRandom] Calling API: ${url}`);

        const response = await axios({
            method: 'GET',
            url: url,
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        const data = response.data;

        if (!data || !data.status || !data.result || data.result.length === 0) {
            return reply("❌ No images found. Try different category.");
        }

        // Get random image
        const images = data.result;
        const randomIndex = Math.floor(Math.random() * images.length);
        const randomImage = images[randomIndex];

        // Download image
        const imageBuffer = await axios({
            method: 'GET',
            url: randomImage,
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }).then(res => Buffer.from(res.data));

        // Send image
        await conn.sendMessage(from, {
            image: imageBuffer,
            caption: `🎲 *Random Pinterest Image*\n\n📂 *Category:* ${query}\n📷 *Available:* ${images.length} images\n\n━━━━━━━━━━━━━━━━━━━━━\n*📥 Downloaded by DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━\n\n_Use \`.pinrandom ${query}\` for another_`
        }, { quoted: mek });

    } catch (e) {
        console.error("[PinRandom] Error:", e.message);
        reply("❌ An error occurred. Please try again.\n\n_DARKZONE-MD_");
    }
});
