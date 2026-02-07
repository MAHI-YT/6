// ============================================================
//  DARKZONE-MD Video/GIF to Sticker Converter
//  Created By Irfan Ahmad
//  FIXED: ffmpeg filter syntax, temp cleanup, error handling
// ============================================================

const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Convert video/GIF buffer to WebP sticker
 * @param {Buffer} videoBuffer - Video or GIF buffer
 * @returns {Promise<Buffer>} - WebP sticker buffer
 */
async function videoToWebp(videoBuffer) {
    const randomName = Crypto.randomBytes(6).toString('hex');
    const inputPath = path.join(tmpdir(), `${randomName}_input.mp4`);
    const outputPath = path.join(tmpdir(), `${randomName}_output.webp`);

    try {
        // Write input file
        fs.writeFileSync(inputPath, videoBuffer);

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .on('error', (err) => reject(err))
                .on('end', () => resolve(true))
                .addOutputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                    '-loop', '0',
                    '-ss', '00:00:00',
                    '-t', '00:00:07',
                    '-preset', 'default',
                    '-an',
                    '-vsync', '0',
                ])
                .toFormat('webp')
                .save(outputPath);
        });

        const webpBuffer = fs.readFileSync(outputPath);
        return webpBuffer;
    } catch (err) {
        console.error('[videoToWebp Error]:', err.message);
        throw err;
    } finally {
        // Always cleanup temp files
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (e) { }
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) { }
    }
}

/**
 * Convert image buffer to WebP sticker
 * @param {Buffer} imageBuffer - Image buffer (jpg/png)
 * @returns {Promise<Buffer>} - WebP sticker buffer
 */
async function imageToWebp(imageBuffer) {
    const randomName = Crypto.randomBytes(6).toString('hex');
    const inputPath = path.join(tmpdir(), `${randomName}_input.png`);
    const outputPath = path.join(tmpdir(), `${randomName}_output.webp`);

    try {
        fs.writeFileSync(inputPath, imageBuffer);

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .on('error', (err) => reject(err))
                .on('end', () => resolve(true))
                .addOutputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease,pad=320:320:-1:-1:color=white@0.0",
                    '-preset', 'default',
                    '-loop', '0',
                    '-an',
                    '-vsync', '0',
                ])
                .toFormat('webp')
                .save(outputPath);
        });

        const webpBuffer = fs.readFileSync(outputPath);
        return webpBuffer;
    } catch (err) {
        console.error('[imageToWebp Error]:', err.message);
        throw err;
    } finally {
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (e) { }
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) { }
    }
}

module.exports = { videoToWebp, imageToWebp };