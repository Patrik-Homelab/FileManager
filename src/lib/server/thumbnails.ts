import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import ffmpeg from 'fluent-ffmpeg';
import { existsSync } from 'fs';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export const THUMBNAIL_PROMISES: Record<string, Promise<void>> = {};

export async function generateThumbnail(filename: string): Promise<void> {
    const uploadDir = path.resolve('uploads');
    const videoPath = path.join(uploadDir, filename);
    const previewFilename = `${filename}_preview.png`;
    const previewPath = path.join(uploadDir, previewFilename);

    if (existsSync(previewPath)) {
        return; // Already exists
    }

    return new Promise((resolve) => {
        ffmpeg(videoPath)
            .on('end', () => {
                resolve();
            })
            .on('error', (err) => {
                console.error(`Error generating thumbnail for ${filename}:`, err);
                resolve(); // Resolve anyway so requests don't hang forever
            })
            .screenshots({
                count: 1,
                timestamps: [1],
                filename: previewFilename,
                folder: uploadDir
            });
    });
}
