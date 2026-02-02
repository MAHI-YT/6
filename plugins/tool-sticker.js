// ═══════════════════════════════════════════════════════════
// 🎨 STICKER PLUGIN - DARKZONE-MD
// Supports: Image, Video, GIF, Quoted Media
// ═══════════════════════════════════════════════════════════

const { cmd } = require('../command');
const config = require('../config');
const fs = require('fs');
const path = require('path');
const Crypto = require('crypto');
const { tmpdir } = require('os');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

ffmpeg.setFfmpegPath(ffmpegPath);

// ═══════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

const tempDir = path.join(tmpdir(), 'sticker-temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

function getRandom(ext) {
    return path.join(tempDir, `${Crypto.randomBytes(6).toString('hex')}${ext}`);
}

async function cleanFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
        }
    } catch (e) {}
}

// ═══════════════════════════════════════════════════════════
// 🖼️ IMAGE TO WEBP STICKER
// ═══════════════════════════════════════════════════════════

async function imageToWebp(buffer) {
    const inputPath = getRandom('.png');
    const outputPath = getRandom('.webp');
    
    try {
        await fs.promises.writeFile(inputPath, buffer);
        
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                    '-loop', '0',
                    '-preset', 'default',
                    '-an',
                    '-vsync', '0'
                ])
                .toFormat('webp')
                .on('error', reject)
                .on('end', resolve)
                .save(outputPath);
        });
        
        const result = await fs.promises.readFile(outputPath);
        await cleanFile(inputPath);
        await cleanFile(outputPath);
        return result;
        
    } catch (error) {
        await cleanFile(inputPath);
        await cleanFile(outputPath);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════
// 🎬 VIDEO TO WEBP STICKER (SHORT VIDEOS)
// ═══════════════════════════════════════════════════════════

async function videoToWebp(buffer) {
    const inputPath = getRandom('.mp4');
    const outputPath = getRandom('.webp');
    
    try {
        await fs.promises.writeFile(inputPath, buffer);
        
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                    '-loop', '0',
                    '-ss', '00:00:00',
                    '-t', '00:00:10',  // Max 10 seconds
                    '-preset', 'default',
                    '-an',
                    '-vsync', '0'
                ])
                .toFormat('webp')
                .on('error', reject)
                .on('end', resolve)
                .save(outputPath);
        });
        
        const result = await fs.promises.readFile(outputPath);
        await cleanFile(inputPath);
        await cleanFile(outputPath);
        return result;
        
    } catch (error) {
        await cleanFile(inputPath);
        await cleanFile(outputPath);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════
// 🎞️ GIF TO WEBP STICKER
// ═══════════════════════════════════════════════════════════

async function gifToWebp(buffer) {
    const inputPath = getRandom('.gif');
    const outputPath = getRandom('.webp');
    
    try {
        await fs.promises.writeFile(inputPath, buffer);
        
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .outputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                    '-loop', '0',
                    '-preset', 'default',
                    '-an',
                    '-vsync', '0'
                ])
                .toFormat('webp')
                .on('error', reject)
                .on('end', resolve)
                .save(outputPath);
        });
        
        const result = await fs.promises.readFile(outputPath);
        await cleanFile(inputPath);
        await cleanFile(outputPath);
        return result;
        
    } catch (error) {
        await cleanFile(inputPath);
        await cleanFile(outputPath);
        throw error;
    }
}

// ═══════════════════════════════════════════════════════════
// 📥 DOWNLOAD MEDIA FROM MESSAGE
// ═══════════════════════════════════════════════════════════

async function downloadMedia(message, mediaType) {
    try {
        const stream = await downloadContentFromMessage(message, mediaType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    } catch (error) {
        console.error('Download error:', error);
        throw new Error('Failed to download media');
    }
}

// ═══════════════════════════════════════════════════════════
// 🎨 MAIN STICKER COMMAND
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "sticker",
    alias: ["s", "stiker", "stic", "stk"],
    desc: "Convert image/video/gif to sticker",
    category: "converter",
    react: "🎨",
    filename: __filename
},
async (conn, mek, m, { from, quoted, q, reply }) => {
    try {
        const packname = config.STICKER_NAME || "DARKZONE-MD";
        const author = config.OWNER_NAME || "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟";
        
        let mediaMessage = null;
        let mediaType = null;
        
        // Check if replying to a message with media
        if (m.quoted) {
            if (m.quoted.imageMessage) {
                mediaMessage = m.quoted.imageMessage;
                mediaType = 'image';
            } else if (m.quoted.videoMessage) {
                mediaMessage = m.quoted.videoMessage;
                mediaType = 'video';
                
                // Check video duration (max 10 seconds for sticker)
                const duration = m.quoted.videoMessage.seconds || 0;
                if (duration > 15) {
                    return reply("⚠️ Video is too long! Maximum 15 seconds for sticker.");
                }
            } else if (m.quoted.stickerMessage) {
                return reply("❌ This is already a sticker!");
            } else if (m.quoted.documentMessage) {
                const mime = m.quoted.documentMessage.mimetype || '';
                if (mime.includes('image')) {
                    mediaMessage = m.quoted.documentMessage;
                    mediaType = 'document';
                } else if (mime.includes('video')) {
                    mediaMessage = m.quoted.documentMessage;
                    mediaType = 'document';
                }
            }
        }
        
        // Check current message for media
        if (!mediaMessage && mek.message) {
            if (mek.message.imageMessage) {
                mediaMessage = mek.message.imageMessage;
                mediaType = 'image';
            } else if (mek.message.videoMessage) {
                mediaMessage = mek.message.videoMessage;
                mediaType = 'video';
                
                const duration = mek.message.videoMessage.seconds || 0;
                if (duration > 15) {
                    return reply("⚠️ Video is too long! Maximum 15 seconds for sticker.");
                }
            }
        }
        
        if (!mediaMessage) {
            return reply("📸 Please send an image/video with the command or reply to an image/video.\n\n*Usage:*\n• Send image with caption `.sticker`\n• Reply to image/video with `.sticker`\n• Short videos (max 15 sec) supported!");
        }
        
        await reply("⏳ Creating sticker...");
        
        // Determine download type
        let downloadType = mediaType;
        if (downloadType === 'document') {
            const mime = mediaMessage.mimetype || '';
            downloadType = mime.includes('video') ? 'video' : 'image';
        }
        
        // Download media
        const buffer = await downloadMedia(mediaMessage, downloadType);
        
        if (!buffer || buffer.length === 0) {
            return reply("❌ Failed to download media. Please try again.");
        }
        
        let stickerBuffer;
        
        // Convert based on media type
        if (downloadType === 'video') {
            // Video to sticker
            stickerBuffer = await videoToWebp(buffer);
        } else {
            // Check if it's a GIF (animated)
            const isGif = mediaMessage.mimetype && mediaMessage.mimetype.includes('gif');
            if (isGif) {
                stickerBuffer = await gifToWebp(buffer);
            } else {
                stickerBuffer = await imageToWebp(buffer);
            }
        }
        
        // Add metadata using wa-sticker-formatter
        const sticker = new Sticker(stickerBuffer, {
            pack: packname,
            author: author,
            type: StickerTypes.FULL,
            categories: ['🎨', '✨'],
            id: Crypto.randomBytes(8).toString('hex'),
            quality: 70
        });
        
        const finalBuffer = await sticker.toBuffer();
        
        await conn.sendMessage(from, {
            sticker: finalBuffer
        }, { quoted: mek });
        
    } catch (error) {
        console.error("Sticker error:", error);
        reply("❌ Failed to create sticker. Error: " + error.message);
    }
});

// ═══════════════════════════════════════════════════════════
// 🎬 VIDEO STICKER COMMAND (Dedicated)
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "vsticker",
    alias: ["vs", "videosticker", "vids", "gif"],
    desc: "Convert video/gif to animated sticker",
    category: "converter",
    react: "🎬",
    filename: __filename
},
async (conn, mek, m, { from, quoted, q, reply }) => {
    try {
        const packname = config.STICKER_NAME || "DARKZONE-MD";
        const author = config.OWNER_NAME || "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟";
        
        let mediaMessage = null;
        let mediaType = null;
        
        // Check quoted message
        if (m.quoted) {
            if (m.quoted.videoMessage) {
                mediaMessage = m.quoted.videoMessage;
                mediaType = 'video';
                
                const duration = m.quoted.videoMessage.seconds || 0;
                if (duration > 15) {
                    return reply("⚠️ Video is too long!\n\n📝 *Maximum:* 15 seconds\n📝 *Your video:* " + duration + " seconds\n\nPlease send a shorter video.");
                }
            } else if (m.quoted.imageMessage) {
                // Check if GIF
                const mime = m.quoted.imageMessage.mimetype || '';
                if (mime.includes('gif')) {
                    mediaMessage = m.quoted.imageMessage;
                    mediaType = 'image';
                } else {
                    return reply("❌ Please reply to a video or GIF!\n\nFor image stickers, use `.sticker`");
                }
            }
        }
        
        // Check current message
        if (!mediaMessage && mek.message) {
            if (mek.message.videoMessage) {
                mediaMessage = mek.message.videoMessage;
                mediaType = 'video';
                
                const duration = mek.message.videoMessage.seconds || 0;
                if (duration > 15) {
                    return reply("⚠️ Video is too long! Maximum 15 seconds.");
                }
            }
        }
        
        if (!mediaMessage) {
            return reply("🎬 *Video Sticker Creator*\n\n*Usage:*\n• Send video with caption `.vsticker`\n• Reply to video with `.vsticker`\n\n⚠️ *Limits:*\n• Max duration: 15 seconds\n• Shorter videos = better quality");
        }
        
        await reply("⏳ Creating video sticker...\n\n_This may take a moment..._");
        
        // Download video
        const buffer = await downloadMedia(mediaMessage, 'video');
        
        if (!buffer || buffer.length === 0) {
            return reply("❌ Failed to download video.");
        }
        
        // Convert to webp
        const stickerBuffer = await videoToWebp(buffer);
        
        // Add metadata
        const sticker = new Sticker(stickerBuffer, {
            pack: packname,
            author: author,
            type: StickerTypes.FULL,
            categories: ['🎬', '✨'],
            id: Crypto.randomBytes(8).toString('hex'),
            quality: 60
        });
        
        const finalBuffer = await sticker.toBuffer();
        
        await conn.sendMessage(from, {
            sticker: finalBuffer
        }, { quoted: mek });
        
    } catch (error) {
        console.error("Video sticker error:", error);
        reply("❌ Failed to create video sticker. Error: " + error.message);
    }
});

// ═══════════════════════════════════════════════════════════
// 🔄 STICKER TO IMAGE/VIDEO
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "toimg",
    alias: ["stickertoimg", "toimage", "stimg"],
    desc: "Convert sticker to image",
    category: "converter",
    react: "🖼️",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!m.quoted || !m.quoted.stickerMessage) {
            return reply("❌ Please reply to a sticker!");
        }
        
        await reply("⏳ Converting sticker to image...");
        
        const buffer = await downloadMedia(m.quoted.stickerMessage, 'sticker');
        
        // Check if animated
        const isAnimated = m.quoted.stickerMessage.isAnimated;
        
        if (isAnimated) {
            // Convert animated sticker to video/gif
            const inputPath = getRandom('.webp');
            const outputPath = getRandom('.mp4');
            
            await fs.promises.writeFile(inputPath, buffer);
            
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .outputOptions([
                        '-movflags', 'faststart',
                        '-pix_fmt', 'yuv420p',
                        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2'
                    ])
                    .toFormat('mp4')
                    .on('error', reject)
                    .on('end', resolve)
                    .save(outputPath);
            });
            
            const videoBuffer = await fs.promises.readFile(outputPath);
            await cleanFile(inputPath);
            await cleanFile(outputPath);
            
            await conn.sendMessage(from, {
                video: videoBuffer,
                caption: "✅ Converted from animated sticker"
            }, { quoted: mek });
            
        } else {
            // Static sticker - convert to PNG
            const inputPath = getRandom('.webp');
            const outputPath = getRandom('.png');
            
            await fs.promises.writeFile(inputPath, buffer);
            
            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .toFormat('png')
                    .on('error', reject)
                    .on('end', resolve)
                    .save(outputPath);
            });
            
            const imageBuffer = await fs.promises.readFile(outputPath);
            await cleanFile(inputPath);
            await cleanFile(outputPath);
            
            await conn.sendMessage(from, {
                image: imageBuffer,
                caption: "✅ Converted from sticker"
            }, { quoted: mek });
        }
        
    } catch (error) {
        console.error("ToImg error:", error);
        reply("❌ Failed to convert sticker. Error: " + error.message);
    }
});

// ═══════════════════════════════════════════════════════════
// ✏️ CUSTOM STICKER (with pack name)
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "steal",
    alias: ["take", "swipe", "rename"],
    desc: "Create sticker with custom pack name",
    category: "converter",
    react: "✏️",
    filename: __filename
},
async (conn, mek, m, { from, quoted, q, reply }) => {
    try {
        let mediaMessage = null;
        let mediaType = null;
        
        // Parse pack name and author
        let packname = config.STICKER_NAME || "DARKZONE-MD";
        let author = config.OWNER_NAME || "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟";
        
        if (q) {
            const parts = q.split('|').map(p => p.trim());
            if (parts[0]) packname = parts[0];
            if (parts[1]) author = parts[1];
        }
        
        // Check for sticker first
        if (m.quoted && m.quoted.stickerMessage) {
            const buffer = await downloadMedia(m.quoted.stickerMessage, 'sticker');
            
            const sticker = new Sticker(buffer, {
                pack: packname,
                author: author,
                type: StickerTypes.FULL,
                categories: ['✨'],
                quality: 70
            });
            
            const finalBuffer = await sticker.toBuffer();
            
            return await conn.sendMessage(from, {
                sticker: finalBuffer
            }, { quoted: mek });
        }
        
        // Check for image/video
        if (m.quoted) {
            if (m.quoted.imageMessage) {
                mediaMessage = m.quoted.imageMessage;
                mediaType = 'image';
            } else if (m.quoted.videoMessage) {
                mediaMessage = m.quoted.videoMessage;
                mediaType = 'video';
            }
        }
        
        if (!mediaMessage) {
            return reply("✏️ *Steal/Rename Sticker*\n\n*Usage:*\n• `.steal PackName | Author`\n• `.steal MyPack`\n\nReply to a sticker, image, or video!");
        }
        
        await reply("⏳ Creating custom sticker...");
        
        const buffer = await downloadMedia(mediaMessage, mediaType);
        
        let stickerBuffer;
        if (mediaType === 'video') {
            stickerBuffer = await videoToWebp(buffer);
        } else {
            stickerBuffer = await imageToWebp(buffer);
        }
        
        const sticker = new Sticker(stickerBuffer, {
            pack: packname,
            author: author,
            type: StickerTypes.FULL,
            categories: ['✨'],
            quality: 70
        });
        
        const finalBuffer = await sticker.toBuffer();
        
        await conn.sendMessage(from, {
            sticker: finalBuffer
        }, { quoted: mek });
        
    } catch (error) {
        console.error("Steal error:", error);
        reply("❌ Failed. Error: " + error.message);
    }
});

// ═══════════════════════════════════════════════════════════
// 🔲 CIRCLE/ROUNDED STICKER
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "circle",
    alias: ["round", "rounded"],
    desc: "Create circle/rounded sticker",
    category: "converter",
    react: "⭕",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!m.quoted || !m.quoted.imageMessage) {
            return reply("❌ Please reply to an image!");
        }
        
        await reply("⏳ Creating circle sticker...");
        
        const buffer = await downloadMedia(m.quoted.imageMessage, 'image');
        
        const sticker = new Sticker(buffer, {
            pack: config.STICKER_NAME || "DARKZONE-MD",
            author: config.OWNER_NAME || "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟",
            type: StickerTypes.CIRCLE,
            categories: ['⭕'],
            quality: 70
        });
        
        const finalBuffer = await sticker.toBuffer();
        
        await conn.sendMessage(from, {
            sticker: finalBuffer
        }, { quoted: mek });
        
    } catch (error) {
        console.error("Circle error:", error);
        reply("❌ Failed. Error: " + error.message);
    }
});

// ═══════════════════════════════════════════════════════════
// ✂️ CROP STICKER
// ═══════════════════════════════════════════════════════════

cmd({
    pattern: "crop",
    alias: ["cropped"],
    desc: "Create cropped sticker (no resize)",
    category: "converter",
    react: "✂️",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        if (!m.quoted || !m.quoted.imageMessage) {
            return reply("❌ Please reply to an image!");
        }
        
        await reply("⏳ Creating cropped sticker...");
        
        const buffer = await downloadMedia(m.quoted.imageMessage, 'image');
        
        const sticker = new Sticker(buffer, {
            pack: config.STICKER_NAME || "DARKZONE-MD",
            author: config.OWNER_NAME || "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟",
            type: StickerTypes.CROPPED,
            categories: ['✂️'],
            quality: 70
        });
        
        const finalBuffer = await sticker.toBuffer();
        
        await conn.sendMessage(from, {
            sticker: finalBuffer
        }, { quoted: mek });
        
    } catch (error) {
        console.error("Crop error:", error);
        reply("❌ Failed. Error: " + error.message);
    }
});

console.log("✅ Sticker Plugin Loaded - Image + Video + GIF Support");
