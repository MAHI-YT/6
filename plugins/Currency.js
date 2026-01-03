const { cmd } = require('../command');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "geminivoice",
    alias: ["gvoice", "aivoice", "voiceai", "gemini", "geminiai"],
    react: "🎙️",
    desc: "Talk with Gemini AI - responds with voice message",
    category: "ai",
    use: ".geminivoice <your question>",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        const text = args.join(' ').trim();
        
        if (!text) {
            return reply(`🎙️ *Gemini Voice AI*\n\n❌ Please provide your question!\n\n*Usage:*\n• \`.geminivoice Hello, how are you?\`\n• \`.gvoice Tell me a joke\`\n• \`.aivoice What is AI?\`\n\n_Powered by DARKZONE-MD_`);
        }

        // Send processing message
        await reply(`🎙️ *Gemini Voice AI*\n\n💭 *Question:* ${text}\n\n⏳ Generating voice response...\n\n_Please wait..._`);

        // API Key
        const apiKey = 'freeApikey';
        
        // Call Gemini Voice API
        const apiUrl = `https://anabot.my.id/api/ai/geminiVoice?text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
        
        console.log(`[GeminiVoice] Calling API...`);

        let apiResponse;
        try {
            apiResponse = await axios({
                method: 'GET',
                url: apiUrl,
                timeout: 60000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json'
                }
            });
        } catch (apiErr) {
            console.error("[GeminiVoice] API Error:", apiErr.message);
            return reply("❌ Failed to connect to Gemini AI. Please try again later.");
        }

        const data = apiResponse.data;
        
        console.log(`[GeminiVoice] Response received`);

        // Validate response
        if (!data || !data.success || !data.data || !data.data.result) {
            return reply("❌ Gemini AI did not respond. Please try again.");
        }

        const audioUrl = data.data.result;
        
        console.log(`[GeminiVoice] Audio URL: ${audioUrl}`);

        // Download audio file
        let audioBuffer;
        try {
            const audioResponse = await axios({
                method: 'GET',
                url: audioUrl,
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            audioBuffer = Buffer.from(audioResponse.data);
        } catch (downloadErr) {
            console.error("[GeminiVoice] Download Error:", downloadErr.message);
            return reply(`❌ Failed to download audio.\n\n🔗 *Direct Link:*\n${audioUrl}`);
        }

        if (!audioBuffer || audioBuffer.length === 0) {
            return reply("❌ Audio file is empty. Please try again.");
        }

        console.log(`[GeminiVoice] Audio size: ${audioBuffer.length} bytes`);

        // Method 1: Send as Voice Note (PTT)
        try {
            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: mek });
            
            console.log(`[GeminiVoice] Sent as voice note`);
            
            // Send caption
            await conn.sendMessage(from, {
                text: `🎙️ *Gemini Voice AI*\n\n💭 *Question:* ${text}\n\n━━━━━━━━━━━━━━━━━━━━━\n*🤖 Powered by DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━`
            });
            
            return;
        } catch (err1) {
            console.log(`[GeminiVoice] Method 1 failed: ${err1.message}`);
        }

        // Method 2: Send as audio/ogg with opus codec
        try {
            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            }, { quoted: mek });
            
            console.log(`[GeminiVoice] Sent as ogg opus`);
            
            await conn.sendMessage(from, {
                text: `🎙️ *Gemini Voice AI*\n\n💭 *Question:* ${text}\n\n*🤖 DARKZONE-MD*`
            });
            
            return;
        } catch (err2) {
            console.log(`[GeminiVoice] Method 2 failed: ${err2.message}`);
        }

        // Method 3: Send as regular audio (not voice note)
        try {
            await conn.sendMessage(from, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });
            
            console.log(`[GeminiVoice] Sent as regular audio`);
            
            await conn.sendMessage(from, {
                text: `🎙️ *Gemini Voice AI*\n\n💭 *Question:* ${text}\n\n*🤖 DARKZONE-MD*`
            });
            
            return;
        } catch (err3) {
            console.log(`[GeminiVoice] Method 3 failed: ${err3.message}`);
        }

        // Method 4: Save to file and send
        try {
            const tempDir = './temp';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempFile = path.join(tempDir, `gemini_${Date.now()}.mp3`);
            fs.writeFileSync(tempFile, audioBuffer);
            
            await conn.sendMessage(from, {
                audio: fs.readFileSync(tempFile),
                mimetype: 'audio/mpeg',
                ptt: true
            }, { quoted: mek });
            
            // Delete temp file
            fs.unlinkSync(tempFile);
            
            console.log(`[GeminiVoice] Sent from temp file`);
            
            await conn.sendMessage(from, {
                text: `🎙️ *Gemini Voice AI*\n\n💭 *Question:* ${text}\n\n*🤖 DARKZONE-MD*`
            });
            
            return;
        } catch (err4) {
            console.log(`[GeminiVoice] Method 4 failed: ${err4.message}`);
        }

        // Method 5: Send audio URL directly
        try {
            await conn.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                ptt: true
            }, { quoted: mek });
            
            console.log(`[GeminiVoice] Sent from URL`);
            
            await conn.sendMessage(from, {
                text: `🎙️ *Gemini Voice AI*\n\n💭 *Question:* ${text}\n\n*🤖 DARKZONE-MD*`
            });
            
            return;
        } catch (err5) {
            console.log(`[GeminiVoice] Method 5 failed: ${err5.message}`);
        }

        // If all methods fail, send link
        reply(`✅ *Voice Generated!*\n\n💭 *Question:* ${text}\n\n🔗 *Listen Here:*\n${audioUrl}\n\n_Click to play_\n\n*🤖 DARKZONE-MD*`);

    } catch (e) {
        console.error("[GeminiVoice] Error:", e);
        reply("❌ An error occurred. Please try again.\n\n_DARKZONE-MD_");
    }
});
