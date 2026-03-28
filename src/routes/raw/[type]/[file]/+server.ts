import { THUMBNAIL_PROMISES, generateThumbnail } from '$/lib/server/thumbnails';
import { error } from '@sveltejs/kit';
import { createReadStream, existsSync } from 'fs';
import { stat, writeFile } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { Readable } from 'stream';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
    const { type, file } = params;
    const uploadsDir = path.resolve('uploads');

    const ext = path.extname(file);
    const uuid = path.basename(file, ext);

    if (file.includes('..') || file.includes('/')) {
        throw error(400, 'Invalid filename');
    }

    const originalFilePath = path.join(uploadsDir, file);

    if (!existsSync(originalFilePath)) {
        throw error(404, 'File not found');
    }

    if (type === 'images') {
        let sourceFilePath = originalFilePath;
        let effectiveExt = ext;

        const isVideo = ['.mp4', '.webm', '.avi', '.mov', '.mkv'].includes(ext.toLowerCase());
        if (isVideo) {
            if (file in THUMBNAIL_PROMISES) {
                await THUMBNAIL_PROMISES[file];
            }

            const previewPath = path.join(uploadsDir, `${file}_preview.png`);
            if (!existsSync(previewPath)) {
                await generateThumbnail(file);
            }

            if (existsSync(previewPath)) {
                sourceFilePath = previewPath;
                effectiveExt = '.png';
            } else {
                throw error(404, 'Thumbnail not found');
            }
        }

        const format = url.searchParams.get('format');
        const quality = url.searchParams.get('quality');
        const width = url.searchParams.get('width');

        if (format || quality || width) {
            const q = quality ? parseInt(quality) : 75;
            const w = width ? parseInt(width) : null;
            const f = format || effectiveExt.substring(1).replace('.', '');

            const cacheFilename = `${uuid}_q${q}_w${w || 'orig'}.${f}`;
            const cacheFilePath = path.join(uploadsDir, cacheFilename);

            if (existsSync(cacheFilePath)) {
                const stats = await stat(cacheFilePath);
                const stream = createReadStream(cacheFilePath);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return new Response(Readable.toWeb(stream) as any, {
                    headers: {
                        'Content-Type': `image/${f}`,
                        'Content-Length': stats.size.toString()
                    }
                });
            }

            let pipeline = sharp(sourceFilePath);
            if (w) {
                pipeline = pipeline.resize(w);
            }

            if (f === 'png') {
                pipeline = pipeline.png({ quality: q });
            } else if (f === 'jpg' || f === 'jpeg') {
                pipeline = pipeline.jpeg({ quality: q });
            } else if (f === 'webp') {
                pipeline = pipeline.webp({ quality: q });
            }

            const buffer = await pipeline.toBuffer();
            await writeFile(cacheFilePath, buffer);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return new Response(buffer as any, {
                headers: {
                    'Content-Type': `image/${f}`,
                    'Content-Length': buffer.length.toString()
                }
            });
        }
    }

    const stats = await stat(originalFilePath);
    const stream = createReadStream(originalFilePath);

    let contentType = 'application/octet-stream';
    const lowerExt = ext.toLowerCase();
    if (lowerExt === '.png') contentType = 'image/png';
    else if (lowerExt === '.jpg' || lowerExt === '.jpeg') contentType = 'image/jpeg';
    else if (lowerExt === '.gif') contentType = 'image/gif';
    else if (lowerExt === '.webp') contentType = 'image/webp';
    else if (lowerExt === '.mp4') contentType = 'video/mp4';
    else if (lowerExt === '.webm') contentType = 'video/webm';
    else if (lowerExt === '.pdf') contentType = 'application/pdf';

    const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Content-Length': stats.size.toString()
    };

    if (type === 'file') {
        headers['Content-Disposition'] = `attachment; filename="${file}"`;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response(Readable.toWeb(stream) as any, {
        headers
    });
};
