const ffmpeg = require('fluent-ffmpeg');
const nsfwjs = require('nsfwjs');
const tf = require('@tensorflow/tfjs-node');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');

// Load NSFW.js model
async function loadModel() {
    return await nsfwjs.load();
}

// Extract frames from video
function extractFrames(videoPath, outputDir, frameInterval = 5) {
    return new Promise((resolve, reject) => {
        const framePattern = path.join(outputDir, 'frame-%03d.jpg');
        ffmpeg(videoPath)
            .outputOptions(['-vf', `fps=1/${frameInterval}`]) // Extract 1 frame every `frameInterval` seconds
            .output(framePattern)
            .on('end', () => {
                fs.readdir(outputDir, (err, files) => {
                    if (err) reject(err);
                    resolve(files.filter((file) => file.startsWith('frame-')).map((file) => path.join(outputDir, file)));
                });
            })
            .on('error', reject)
            .run();
    });
}

// Analyze frames for NSFW content
async function analyzeFrames(frames, model) {
    for (const framePath of frames) {
        const img = await loadImage(framePath);
        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const predictions = await model.classify(canvas);

        // Check if any prediction is NSFW with a high confidence
        const nsfwPrediction = predictions.find((p) =>
            ['Porn', 'Hentai', 'Sexy'].includes(p.className) && p.probability > 0.8
        );

        // Cleanup the frame
        fs.unlinkSync(framePath);

        if (nsfwPrediction) {
            return true; // Video is NSFW
        }
    }
    return false; // Video is not NSFW
}

// Main function
async function detectNSFW(videoPath, outputDir = './frames', frameInterval = 5) {
    try {
        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const model = await loadModel();
        const frames = await extractFrames(videoPath, outputDir, frameInterval);
        const isNSFW = await analyzeFrames(frames, model);

        // Cleanup output directory
        fs.rmdirSync(outputDir, { recursive: true });

        return isNSFW;
    } catch (error) {
        console.error('Error detecting NSFW content:', error);
        throw error;
    }
}

module.exports = detectNSFW;
