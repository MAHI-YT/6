const { cmd } = require('../command');
const axios = require('axios');

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
            return reply(`🎙️ *Gemini Voice AI*\n\n❌ Please provide your question!\n\n*Usage:*\n• \`.geminivoice Hello, how are you?\`\n• \`.gvoice Tell me a joke\`\n• \`.aivoice What is the weather like?\`\n\n_Powered by DARKZONE-MD_`);
        }

        // Send processing message
        const processingMsg = await conn.sendMessage(from, {
            text: `🎙️ *Gemini Voice AI*\n\n💭 *Your Question:* ${text}\n\n⏳ Generating voice response...\n\n_Please wait..._`
        }, { quoted: mek });

        // API Key
        const apiKey = 'freeApikey';
        
        // Call Gemini Voice API
        const apiUrl = `https://anabot.my.id/api/ai/geminiVoice?text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;
        
        console.log(`[GeminiVoice] Calling API: ${apiUrl}`);

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
        
        console.log(`[GeminiVoice] Response:`, JSON.stringify(data));

        // Validate response
        if (!data || !data.success) {
            return reply("❌ Gemini AI did not respond. Please try again.");
        }

        if (!data.data || !data.data.result) {
            return reply("❌ Failed to generate voice response. Please try again.");
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

        // Delete processing message
        try {
            await conn.sendMessage(from, { delete: processingMsg.key });
        } catch (e) {}

        // Send as voice message (PTT - Push To Talk)
        await conn.sendMessage(from, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: true  // This makes it a voice note
        }, { quoted: mek });

        // Send caption separately
        await conn.sendMessage(from, {
            text: `🎙️ *Gemini Voice AI*\n\n💭 *Question:* ${text}\n\n━━━━━━━━━━━━━━━━━━━━━\n*🤖 Powered by DARKZONE-MD*\n━━━━━━━━━━━━━━━━━━━━━`
        });

    } catch (e) {
        console.error("[GeminiVoice] Error:", e);
        reply("❌ An error occurred. Please try again.\n\n_DARKZONE-MD_");
    }
});

// ========== GEMINI VOICE WITH REPLY SUPPORT ==========

cmd({
    pattern: "askvoice",
    alias: ["voiceask", "talkto", "askai"],
    react: "💬",
    desc: "Ask Gemini AI anything - responds with voice",
    category: "ai",
    use: ".askvoice <question> OR reply to message",
    filename: __filename
},
async (conn, mek, m, { from, quoted, args, reply }) => {
    try {
        let text = args.join(' ').trim();
        
        // If no text provided, check if replying to a message
        if (!text && quoted && quoted.text) {
            text = quoted.text;
        }
        
        if (!text) {
            return reply(`💬 *Ask Voice AI*\n\n❌ Please provide a question!\n\n*Usage:*\n• \`.askvoice What is AI?\`\n• Reply to any message with \`.askvoice\`\n\n_Powered by DARKZONE-MD_`);
        }

        await reply(`💬 Processing: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"\n\n⏳ Generating voice...`);

        const apiKey = 'freeApikey';
        const apiUrl = `https://anabot.my.id/api/ai/geminiVoice?text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;

        const response = await axios({
            method: 'GET',
            url: apiUrl,
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        if (!response.data || !response.data.success || !response.data.data?.result) {
            return reply("❌ Failed to get response. Try again.");
        }

        const audioUrl = response.data.data.result;

        // Download audio
        const audioBuffer = await axios({
            method: 'GET',
            url: audioUrl,
            responseType: 'arraybuffer',
            timeout: 30000
        }).then(res => Buffer.from(res.data));

        // Send voice note
        await conn.sendMessage(from, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: mek });

    } catch (e) {
        console.error("[AskVoice] Error:", e.message);
        reply("❌ Error occurred. Please try again.");
    }
});

// ========== GEMINI AUDIO (SENDS AS AUDIO FILE, NOT VOICE) ==========

cmd({
    pattern: "geminiaudio",
    alias: ["gaudio", "aiaudio"],
    react: "🔊",
    desc: "Get Gemini AI response as audio file",
    category: "ai",
    use: ".geminiaudio <question>",
    filename: __filename
},
async (conn, mek, m, { from, args, reply }) => {
    try {
        const text = args.join(' ').trim();
        
        if (!text) {
            return reply(`🔊 *Gemini Audio*\n\n❌ Please provide your question!\n\n*Usage:* \`.geminiaudio Hello\`\n\n_Powered by DARKZONE-MD_`);
        }

        await reply(`🔊 *Generating Audio...*\n\n💭 ${text}\n\n⏳ Please wait...`);

        const apiKey = 'freeApikey';
        const apiUrl = `https://anabot.my.id/api/ai/geminiVoice?text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apiKey)}`;

        const response = await axios({
            method: 'GET',
            url: apiUrl,
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        if (!response.data?.success || !response.data?.data?.result) {
            return reply("❌ Failed to generate audio.");
        }

        const audioUrl = response.data.data.result;

        // Download audio
        const audioBuffer = await axios({
            method: 'GET',
            url: audioUrl,
            responseType: 'arraybuffer',
            timeout: 30000
        }).then(res => Buffer.from(res.data));

        // Send as audio file (not voice note)
        await conn.sendMessage(from, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false,  // This makes it an audio file, not voice note
            fileName: 'gemini_response.mp3'
        }, { quoted: mek });

        await reply(`🔊 *Audio Generated!*\n\n💭 *Query:* ${text}\n\n*🤖 DARKZONE-MD*`);

    } catch (e) {
        console.error("[GeminiAudio] Error:", e.message);
        reply("❌ Error occurred. Please try again.");
    }
});

// ========== CONVERSATION MODE ==========

const conversationHistory = new Map();

cmd({
    pattern: "voicechat",
    alias: ["vchat", "talkvoice"],
    react: "🗣️",
    desc: "Have a voice conversation with Gemini AI",
    category: "ai",
    use: ".voicechat <message>",
    filename: __filename
},
async (conn, mek, m, { from, sender, args, reply }) => {
    try {
        const text = args.join(' ').trim();
        
        if (!text) {
            const hasHistory = conversationHistory.has(sender);
            return reply(`🗣️ *Voice Chat with Gemini*\n\n❌ Please say something!\n\n*Usage:* \`.voicechat Hi there!\`\n\n${hasHistory ? '💬 _You have an active conversation_\n\nUse `.voiceclear` to reset' : '_Start a new conversation!_'}\n\n_Powered by DARKZONE-MD_`);
        }

        // Get or create conversation history
        let history = conversationHistory.get(sender) || [];
        
        // Add current message to history
        history.push(`User: ${text}`);
        
        // Keep only last 5 messages for context
        if (history.length > 5) {
            history = history.slice(-5);
        }
        
        // Create context-aware prompt
        const contextPrompt = history.join('\n') + '\nAI:';

        await reply(`🗣️ *Processing...*\n\n💭 "${text}"\n\n⏳ Generating response...`);

        const apiKey = 'freeApikey';
        const apiUrl = `https://anabot.my.id/api/ai/geminiVoice?text=${encodeURIComponent(contextPrompt)}&apikey=${encodeURIComponent(apiKey)}`;

        const response = await axios({
            method: 'GET',
            url: apiUrl,
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });

        if (!response.data?.success || !response.data?.data?.result) {
            return reply("❌ Failed to get response.");
        }

        const audioUrl = response.data.data.result;

        // Download audio
        const audioBuffer = await axios({
            method: 'GET',
            url: audioUrl,
            responseType: 'arraybuffer',
            timeout: 30000
        }).then(res => Buffer.from(res.data));

        // Update history
        history.push(`AI: [Voice Response]`);
        conversationHistory.set(sender, history);

        // Send voice response
        await conn.sendMessage(from, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: mek });

    } catch (e) {
        console.error("[VoiceChat] Error:", e.message);
        reply("❌ Error occurred. Please try again.");
    }
});

// ========== CLEAR CONVERSATION ==========

cmd({
    pattern: "voiceclear",
    alias: ["clearvconvo", "resetvoice"],
    react: "🗑️",
    desc: "Clear voice chat conversation history",
    category: "ai",
    use: ".voiceclear",
    filename: __filename
},
async (conn, mek, m, { sender, reply }) => {
    try {
        if (conversationHistory.has(sender)) {
            conversationHistory.delete(sender);
            reply("✅ *Conversation Cleared!*\n\n🗑️ Your voice chat history has been reset.\n\n_Start a new conversation with `.voicechat`_\n\n*DARKZONE-MD*");
        } else {
            reply("ℹ️ No active conversation to clear.\n\n*DARKZONE-MD*");
        }
    } catch (e) {
        reply("❌ Error occurred.");
    }
});
