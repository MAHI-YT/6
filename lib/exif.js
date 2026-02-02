// ═══════════════════════════════════════════════════════════
// 🏷️ EXIF.JS - STICKER METADATA HANDLER - DARKZONE-MD
// Adds pack name, author, and categories to stickers
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
const webp = require('node-webpmux');
const config = require('../config');

ffmpeg.setFfmpegPath(ffmpegPath);

// Temp directory
const tempDir = path.join(tmpdir(), 'exif-temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

// ═══════════════════════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

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
// 📝 CREATE EXIF METADATA
// ═══════════════════════════════════════════════════════════

function createExif(packname, author, categories = ['']) {
    const json = {
        "sticker-pack-id": `https://github.com/ERFAN-Md/DARKZONE-MD`,
        "sticker-pack-name": packname,
        "sticker-pack-publisher": author,
        "emojis": categories,
        "is-avatar-sticker": 0,
        "android-app-store-link": "",
        "ios-app-store-link": ""
    };

    let exifAttr = Buffer.from([
        0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
        0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);

    let jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    let exif = Buffer.concat([exifAttr, jsonBuff]);
    
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    
    return exif;
}

// ═══════════════════════════════════════════════════════════
// 🖼️ IMAGE TO WEBP WITH EXIF
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
// 🎬 VIDEO TO WEBP WITH EXIF
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
                    '-t', '00:00:10',
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
// ✏️ WRITE EXIF TO IMAGE STICKER
// ═══════════════════════════════════════════════════════════

async function writeExifImg(buffer, options = {}) {
    const packname = options.packname || config.STICKER_NAME || "DARKZONE-MD";
    const author = options.author || config.OWNER_NAME || "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟";
    const categories = options.categories || ['🎨', '✨'];
    
    const outputPath = getRandom('.webp');
    
    try {
        // Convert to webp first if not already
        let webpBuffer;
        
        // Check if buffer is already webp
        if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
            webpBuffer = buffer;
        } else {
            webpBuffer = await imageToWebp(buffer);
        }
        
        // Write webp to file
        await fs.promises.writeFile(outputPath, webpBuffer);
        
        // Add exif data
        const img = new webp.Image();
        await img.load(outputPath);
        
        const exif = createExif(packname, author, categories);
        img.exif = exif;
        
        await img.save(outputPath);
        
        return outputPath;
        
    } catch (error) {
        await cleanFile(outputPath);
        
        // Fallback: return without exif
        const fallbackPath = getRandom('.webp');
        try {
            const webpBuffer = await imageToWebp(buffer);
            await fs.promises.writeFile(fallbackPath, webpBuffer);
            return fallbackPath;
        } catch (e) {
            throw error;
        }
    }
}

// ═══════════════════════════════════════════════════════════
// ✏️ WRITE EXIF TO VIDEO STICKER
// ═══════════════════════════════════════════════════════════

async function writeExifVid(buffer, options = {}) {
    const packname = options.packname || config.STICKER_NAME || "DARKZONE-MD";
    const author = options.author || config.OWNER_NAME || "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟";
    const categories = options.categories || ['🎬', '✨'];
    
    const outputPath = getRandom('.webp');
    
    try {
        // Convert video to webp
        const webpBuffer = await videoToWebp(buffer);
        
        // Write to file
        await fs.promises.writeFile(outputPath, webpBuffer);
        
        // Add exif data
        const img = new webp.Image();
        await img.load(outputPath);
        
        const exif = createExif(packname, author, categories);
        img.exif = exif;
        
        await img.save(outputPath);
        
        return outputPath;
        
    } catch (error) {
        await cleanFile(outputPath);
        
        // Fallback: return without exif
        const fallbackPath = getRandom('.webp');
        try {
            const webpBuffer = await videoToWebp(buffer);
            await fs.promises.writeFile(fallbackPath, webpBuffer);
            return fallbackPath;
        } catch (e) {
            throw error;
        }
    }
}

// ═══════════════════════════════════════════════════════════
// ✏️ WRITE EXIF TO EXISTING WEBP
// ═══════════════════════════════════════════════════════════

async function writeExifWebp(buffer, options = {}) {
    const packname = options.packname || config.STICKER_NAME || "DARKZONE-MD";
    const author = options.author || config.OWNER_NAME || "𝐸𝑅𝐹𝒜𝒩 𝒜𝐻𝑀𝒜𝒟";
    const categories = options.categories || ['✨'];
    
    const outputPath = getRandom('.webp');
    
    try {
        // Write buffer to file
        await fs.promises.writeFile(outputPath, buffer);
        
        // Add exif data
        const img = new webp.Image();
        await img.load(outputPath);
        
        const exif = createExif(packname, author, categories);
        img.exif = exif;
        
        await img.save(outputPath);
        
        return outputPath;
        
    } catch (error) {
        // If exif fails, just return the original
        const fallbackPath = getRandom('.webp');
        await fs.promises.writeFile(fallbackPath, buffer);
        return fallbackPath;
    }
}

// ═══════════════════════════════════════════════════════════
// 🔄 ADD EXIF TO BUFFER (Returns Buffer)
// ═══════════════════════════════════════════════════════════

async function addExif(buffer, packname, author, categories = ['✨']) {
    const outputPath = getRandom('.webp');
    
    try {
        await fs.promises.writeFile(outputPath, buffer);
        
        const img = new webp.Image();
        await img.load(outputPath);
        
        const exif = createExif(packname, author, categories);
        img.exif = exif;
        
        await img.save(outputPath);
        
        const result = await fs.promises.readFile(outputPath);
        await cleanFile(outputPath);
        
        return result;
        
    } catch (error) {
        await cleanFile(outputPath);
        return buffer; // Return original if failed
    }
}

// ═══════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
    createExif,
    imageToWebp,
    videoToWebp,
    writeExifImg,
    writeExifVid,
    writeExifWebp,
    addExif
};
