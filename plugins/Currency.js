const axios = require('axios');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../command');
const FormData = require('form-data');

cmd({
    pattern: "nanobanana",
    alias: ["nano", "banana", "aiedit", "editai"],
    react: "🍌",
    desc: "Edit image using Nano Banana AI with custom prompt",
    category: "image",
    use: ".nanobanana <prompt> (reply to image)",
    filename: __filename,
},
async (conn, mek, m, { from, quoted, reply, args }) => {
    try {
        const prompt = args.join(' ');
        
        // Check if prompt is provided
        if (!prompt) {
            return reply(`🍌 *NANO BANANA AI EDITOR*

❗ Please provide a prompt!

*Usage:*
Reply to an image with prompt

*Examples:*
• .nanobanana make it cartoon style
• .nanobanana turn into anime
• .nanobanana add sunglasses`);
        }

        // Must reply to image
        if (!quoted || !quoted.imageMessage) {
            return reply("🖼️ Please reply to an image with your prompt!");
        }

        await reply("⏳ Downloading image...");

        // Download image from WhatsApp
        const stream = await downloadContentFromMessage(
            quoted.imageMessage,
            'image'
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        await reply("📤 Uploading image to server...");

        // Upload to tmpfiles.org
        const form = new FormData();
        form.append('file', buffer, {
            filename: 'image.jpg',
            contentType: 'image/jpeg'
        });

        const uploadRes = await axios.post(
            'https://tmpfiles.org/api/v1/upload',
            form,
            { headers: form.getHeaders() }
        );

        const imageUrl = uploadRes.data.data.url.replace(
            'tmpfiles.org/',
            'tmpfiles.org/dl/'
        );

        await reply("🍌 Processing with Nano Banana AI...\n⏳ Please wait...");

        // METHOD 1: Try POST with JSON body
        let resultUrl = null;
        
        try {
            const response = await axios.post(
                'https://api-faa.my.id/faa/nano-banana',
                {
                    imageUrl: imageUrl,
                    prompt: prompt
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 120000
                }
            );
            
            const data = response.data;
            resultUrl = data.result || data.data?.result || data.url || data.data?.url || data.image;
            
        } catch (e1) {
            console.log("Method 1 failed, trying Method 2...");
            
            // METHOD 2: Try POST with form-urlencoded
            try {
                const params = new URLSearchParams();
                params.append('imageUrl', imageUrl);
                params.append('prompt', prompt);
                
                const response = await axios.post(
                    'https://api-faa.my.id/faa/nano-banana',
                    params,
                    {
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        timeout: 120000
                    }
                );
                
                const data = response.data;
                resultUrl = data.result || data.data?.result || data.url || data.data?.url || data.image;
                
            } catch (e2) {
                console.log("Method 2 failed, trying Method 3...");
                
                // METHOD 3: Try GET with proper headers
                try {
                    const apiUrl = `https://api-faa.my.id/faa/nano-banana?imageUrl=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`;
                    
                    const response = await axios.get(apiUrl, {
                        headers: {
                            'Accept': 'application/json',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://api-faa.my.id/',
                            'Origin': 'https://api-faa.my.id'
                        },
                        timeout: 120000
                    });
                    
                    const data = response.data;
                    resultUrl = data.result || data.data?.result || data.url || data.data?.url || data.image;
                    
                } catch (e3) {
                    console.log("Method 3 failed, trying Method 4...");
                    
                    // METHOD 4: Try with different parameter names
                    try {
                        const response = await axios.post(
                            'https://api-faa.my.id/faa/nano-banana',
                            {
                                image: imageUrl,
                                text: prompt
                            },
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                                },
                                timeout: 120000
                            }
                        );
                        
                        const data = response.data;
                        resultUrl = data.result || data.data?.result || data.url || data.data?.url || data.image;
                        
                    } catch (e4) {
                        console.log("All methods failed");
                        console.log("Error details:", e4?.response?.data || e4.message);
                        throw e4;
                    }
                }
            }
        }

        // Check if we got result
        if (!resultUrl) {
            return reply("❌ API returned no image. Please try different prompt.");
        }

        // Send edited image
        await conn.sendMessage(
            from,
            {
                image: { url: resultUrl },
                caption: `✨ *NANO BANANA AI*

🎨 *Prompt:* ${prompt}

> 🍌 Image Edited Successfully!`
            },
            { quoted: m }
        );

    } catch (err) {
        console.error("NANO BANANA ERROR:", err?.response?.data || err.message);
        
        const statusCode = err?.response?.status;
        
        if (statusCode === 403) {
            return reply(`❌ *API Access Denied (403)*

The API might be:
• Blocked in your region
• Requiring API key
• Under maintenance

Please check if the API is working.`);
        }
        
        if (statusCode === 404) {
            return reply("❌ API endpoint not found. API might have changed.");
        }
        
        if (statusCode === 429) {
            return reply("⏳ Too many requests. Please wait and try again.");
        }
        
        reply("❌ Failed: " + (err?.response?.data?.message || err.message));
    }
});
