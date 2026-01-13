const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "sora",
    alias: ["soravideo", "text2video", "genvideo"],
    desc: "Generate video from text using Sora AI",
    category: "ai",
    react: "🎬",
    filename: __filename
},
async(conn, mek, m, {
    from, quoted, args, q, reply
}) => {
    try {
        const input = q || (quoted && quoted.text) || '';

        if (!input) {
            return reply(`❌ *Please provide a prompt!*

*Usage:* .sora <your prompt>
*Example:* .sora a cute cat playing in the garden

*Available Ratios:*
• 16:9 (default)
• 9:16
• 1:1`);
        }

        // Parse ratio if provided (e.g., .sora 16:9 cat playing)
        let ratio = "16:9";
        let prompt = input;
        
        const ratioMatch = input.match(/^(16:9|9:16|1:1)\s+/i);
        if (ratioMatch) {
            ratio = ratioMatch[1];
            prompt = input.replace(ratioMatch[0], '').trim();
        }

        if (!prompt) {
            return reply("❌ Please provide a prompt after the ratio!");
        }

        // Encode parameters
        const encodedPrompt = encodeURIComponent(prompt);
        const encodedRatio = encodeURIComponent(ratio);
        
        const baseUrl = "https://rynekoo-api.hf.space";
        const createUrl = `${baseUrl}/video.gen/sora/create?prompt=${encodedPrompt}&ratio=${encodedRatio}`;
        
        // Send initial waiting message
        await reply(`🎬 *Sora AI Video Generator*

📝 *Prompt:* ${prompt}
📐 *Ratio:* ${ratio}

⏳ Initializing video generation...`);

        // Step 1: Create video generation task
        const createResponse = await axios.get(createUrl, { 
            timeout: 60000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const createData = createResponse.data;

        if (!createData?.success || !createData?.result?.id) {
            throw new Error('Failed to initialize video generation');
        }

        const taskId = createData.result.id;
        
        await reply(`✅ *Task Created Successfully!*

🆔 *Task ID:* ${taskId}
📊 *Status:* Processing...

⏳ Please wait while your video is being generated...
(This may take 1-5 minutes)`);

        // Step 2: Poll for video status
        const statusUrl = `${baseUrl}/video.gen/sora/status?id=${taskId}`;
        
        let attempts = 0;
        const maxAttempts = 40; // Max 40 attempts
        const pollInterval = 8000; // 8 seconds between checks
        
        let videoUrl = null;
        let lastStatus = "processing";

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;

            try {
                const statusResponse = await axios.get(statusUrl, {
                    timeout: 30000,
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                const statusData = statusResponse.data;
                
                if (statusData?.success && statusData?.result) {
                    const status = statusData.result.status?.toLowerCase();
                    const output = statusData.result.output;

                    // Check for completion
                    if (status === 'completed' || status === 'succeeded' || status === 'success' || status === 'done') {
                        if (output) {
                            videoUrl = Array.isArray(output) ? output[0] : output;
                            break;
                        }
                    }
                    
                    // Check for failure
                    if (status === 'failed' || status === 'error' || status === 'cancelled') {
                        throw new Error(`Video generation ${status}`);
                    }

                    lastStatus = status;
                }
            } catch (pollError) {
                if (pollError.message.includes('generation')) {
                    throw pollError;
                }
                console.log(`Poll attempt ${attempts} failed, retrying...`);
            }
        }

        if (!videoUrl) {
            throw new Error('Video generation timed out after maximum attempts');
        }

        // Step 3: Download and send the video
        await reply("📥 *Downloading your video...*");

        await conn.sendMessage(from, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: `🎬 *Sora AI Video Generation*

📝 *Prompt:* ${prompt}
📐 *Ratio:* ${ratio}
🆔 *Task ID:* ${taskId}

✅ *Generated Successfully!*

_Powered by Sora AI_`
        }, { quoted: m });

    } catch (error) {
        console.error("Sora command error:", error);
        
        let errorMessage = "❌ *Video Generation Failed*\n\n";
        
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            errorMessage += "⏱️ Connection timeout. The server is not responding.";
        } else if (error.response?.status === 429) {
            errorMessage += "🚫 Rate limit exceeded. Please wait and try again later.";
        } else if (error.response?.status === 500) {
            errorMessage += "🔧 Server error. Please try again later.";
        } else if (error.response?.status === 404) {
            errorMessage += "🔍 API endpoint not found.";
        } else if (error.message.includes('timed out')) {
            errorMessage += "⏱️ Video generation took too long.\nPlease try with a simpler prompt.";
        } else if (error.message.includes('failed') || error.message.includes('error')) {
            errorMessage += "🔧 Generation failed. Try a different prompt.";
        } else if (error.message.includes('initialize')) {
            errorMessage += "🚫 Could not start generation. API may be down.";
        } else {
            errorMessage += `🔄 Error: ${error.message}\nPlease try again.`;
        }
        
        await reply(errorMessage);
    }
});
