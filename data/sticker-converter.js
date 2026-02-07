// ============================================================
//  DARKZONE-MD Sticker Converter (Sticker → Image)
//  Created By Irfan Ahmad
// ============================================================

const fs = require('fs');
const path = require('path');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);

class StickerConverter {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        this.ensureTempDir();
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async convertStickerToImage(stickerBuffer) {
        const timestamp = Date.now();
        const tempPath = path.join(this.tempDir, `sticker_${timestamp}.webp`);
        const outputPath = path.join(this.tempDir, `image_${timestamp}.png`);

        try {
            await fs.promises.writeFile(tempPath, stickerBuffer);

            await new Promise((resolve, reject) => {
                ffmpeg(tempPath)
                    .on('error', (err) => reject(err))
                    .on('end', () => resolve(true))
                    .output(outputPath)
                    .run();
            });

            const imageBuffer = await fs.promises.readFile(outputPath);
            return imageBuffer;
        } catch (error) {
            console.error('[StickerConverter Error]:', error.message);
            throw new Error('Failed to convert sticker to image');
        } finally {
            // Always cleanup
            await Promise.all([
                fs.promises.unlink(tempPath).catch(() => {}),
                fs.promises.unlink(outputPath).catch(() => {}),
            ]);
        }
    }
}

module.exports = new StickerConverter();