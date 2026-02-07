// ============================================================
//  DARKZONE-MD Sticker Utilities
//  Created By Irfan Ahmad
//  FIXED: ffmpeg syntax, cleanup, error handling
// ============================================================

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const Crypto = require('crypto');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

/**
 * Fetch an image from URL
 */
async function fetchImage(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
        return response.data;
    } catch (error) {
        console.error('[fetchImage Error]:', error.message);
        throw new Error('Could not fetch image.');
    }
}

/**
 * Fetch a GIF from URL
 */
async function fetchGif(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
        return response.data;
    } catch (error) {
        console.error('[fetchGif Error]:', error.message);
        throw new Error('Could not fetch GIF.');
    }
}

/**
 * Convert GIF to WebP sticker (FIXED syntax!)
 */
async function gifToSticker(gifBuffer) {
    const randomName = Crypto.randomBytes(6).toString('hex');
    const inputPath = path.join(tmpdir(), `${randomName}.gif`);
    const outputPath = path.join(tmpdir(), `${randomName}.webp`);

    try {
        fs.writeFileSync(inputPath, gifBuffer);

        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .on('error', (err) => reject(err))
                .on('end', () => resolve(true))
                .addOutputOptions([
                    '-vcodec', 'libwebp',
                    '-vf', "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse",
                    '-loop', '0',
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
        console.error('[gifToSticker Error]:', err.message);
        throw err;
    } finally {
        try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (e) { }
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) { }
    }
}

/**
 * Convert GIF buffer to video (MP4) buffer
 */
async function gifToVideo(gifBuffer) {
    const randomName = Crypto.randomBytes(6).toString('hex');
    const gifPath = path.join(tmpdir(), `${randomName}.gif`);
    const mp4Path = path.join(tmpdir(), `${randomName}.mp4`);

    try {
        fs.writeFileSync(gifPath, gifBuffer);

        await new Promise((resolve, reject) => {
            ffmpeg(gifPath)
                .outputOptions([
                    '-movflags', 'faststart',
                    '-pix_fmt', 'yuv420p',
                    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                ])
                .on('error', (err) => reject(err))
                .on('end', () => resolve(true))
                .save(mp4Path);
        });

        const videoBuffer = fs.readFileSync(mp4Path);
        return videoBuffer;
    } catch (err) {
        console.error('[gifToVideo Error]:', err.message);
        throw err;
    } finally {
        try { if (fs.existsSync(gifPath)) fs.unlinkSync(gifPath); } catch (e) { }
        try { if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path); } catch (e) { }
    }
}

module.exports = { fetchImage, fetchGif, gifToSticker, gifToVideo };