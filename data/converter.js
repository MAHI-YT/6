// ============================================================
//  DARKZONE-MD Audio Converter
//  Created By Irfan Ahmad
//  Merged converter.js + play-converter.js into ONE file
// ============================================================

const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const { spawn } = require('child_process');

class AudioConverter {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        this.ensureTempDir();
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async cleanFile(file) {
        try {
            if (file && fs.existsSync(file)) {
                await fs.promises.unlink(file);
            }
        } catch (e) { }
    }

    async convert(buffer, args, ext, ext2) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const inputPath = path.join(this.tempDir, `${timestamp}_${random}.${ext}`);
        const outputPath = path.join(this.tempDir, `${timestamp}_${random}.${ext2}`);

        try {
            await fs.promises.writeFile(inputPath, buffer);

            return new Promise((resolve, reject) => {
                const ffmpegProc = spawn(ffmpegPath, [
                    '-y',
                    '-i', inputPath,
                    ...args,
                    outputPath,
                ], { timeout: 60000 });

                let errorOutput = '';
                ffmpegProc.stderr.on('data', (data) => {
                    errorOutput += data.toString();
                });

                ffmpegProc.on('close', async (code) => {
                    await this.cleanFile(inputPath);

                    if (code !== 0) {
                        await this.cleanFile(outputPath);
                        return reject(new Error(`FFmpeg failed (code ${code})`));
                    }

                    try {
                        const result = await fs.promises.readFile(outputPath);
                        await this.cleanFile(outputPath);
                        resolve(result);
                    } catch (readError) {
                        reject(new Error('Failed to read converted file'));
                    }
                });

                ffmpegProc.on('error', async (err) => {
                    await this.cleanFile(inputPath);
                    await this.cleanFile(outputPath);
                    reject(new Error('FFmpeg failed to start'));
                });
            });
        } catch (err) {
            await this.cleanFile(inputPath);
            await this.cleanFile(outputPath);
            throw err;
        }
    }

    // ============================================================
    //  STANDARD MP3 CONVERSION
    // ============================================================
    toAudio(buffer, ext) {
        return this.convert(buffer, [
            '-vn',
            '-ac', '2',
            '-ar', '44100',
            '-b:a', '192k',
            '-acodec', 'libmp3lame',
            '-f', 'mp3',
        ], ext, 'mp3');
    }

    // ============================================================
    //  OPUS (PTT / Voice Note)
    // ============================================================
    toPTT(buffer, ext) {
        return this.convert(buffer, [
            '-vn',
            '-c:a', 'libopus',
            '-b:a', '128k',
            '-vbr', 'on',
            '-compression_level', '10',
            '-application', 'voip',
        ], ext, 'opus');
    }

    // ============================================================
    //  WHATSAPP AUDIO (with fallback)
    // ============================================================
    async toWhatsAppAudio(buffer, ext) {
        try {
            return await this.toAudio(buffer, ext);
        } catch (mp3Error) {
            console.log('[Converter] MP3 failed, trying OPUS...');
            try {
                return await this.toPTT(buffer, ext);
            } catch (opusError) {
                throw new Error('All conversion attempts failed');
            }
        }
    }
}

module.exports = new AudioConverter();