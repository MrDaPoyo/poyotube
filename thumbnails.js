const ffmpeg = require('fluent-ffmpeg');
const path = require('path');

function generateThumbnail(videoPath, outputDir, timestamp = '00:00:01') {
    return new Promise((resolve, reject) => {
        // Extract the base name of the video file (without extension)
        const videoName = path.basename(videoPath, path.extname(videoPath));
        const outputFile = path.join(outputDir, `${videoName}.jpg`); // Thumbnail will have the same name

        ffmpeg(videoPath)
            .screenshots({
                timestamps: [timestamp], // Time in video to capture (e.g., '00:00:01')
                filename: `${videoName}.jpg`, // Thumbnail file name
                folder: outputDir,
                size: '320x240', // Adjust size as needed
            })
            .on('end', () => resolve(outputFile))
            .on('error', (err) => reject(err));
    });
}

module.exports = generateThumbnail;