import { existsAsync } from '$/lib/server/functions';
import { conn } from '$/lib/server/variables';
import { error } from '@sveltejs/kit';
import crypto from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, readdir, stat, unlink, writeFile } from 'fs/promises';
import path from 'path';
import tar from 'tar-stream';
import { v4 as uuidv4 } from 'uuid';
import type { RequestHandler } from './$types';

async function authenticate(request: Request) {
    let token = request.headers.get('Authorization')?.replace('Bearer ', '');
    const url = new URL(request.url);
    if (!token) {
        token = url.searchParams.get('token') || '';
    }

    if (!token) {
        throw error(401, 'Unauthorized: Missing token');
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const apiKey = await conn
        .selectFrom('api_keys')
        .selectAll()
        .where('key', '=', hashedToken)
        .executeTakeFirst();

    if (!apiKey) {
        throw error(401, 'Unauthorized: Invalid token');
    }

    const user = await conn
        .selectFrom('users')
        .selectAll()
        .where('id', '=', apiKey.user_id)
        .executeTakeFirst();

    if (!user) {
        throw error(401, 'Unauthorized: User not found');
    }

    return user;
}

export const GET: RequestHandler = async ({ params, request }) => {
    const user = await authenticate(request);
    const { id } = params;

    const folder = await conn
        .selectFrom('folders')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

    if (!folder) throw error(404, 'Folder not found');
    if (folder.created_by !== user.id) throw error(403, 'Forbidden');

    const files = await conn
        .selectFrom('folder_files')
        .innerJoin('files', 'files.id', 'folder_files.file_id')
        .select(['files.id', 'files.original_name', 'files.size'])
        .where('folder_files.folder_id', '=', id)
        .execute();

    const pack = tar.pack();

    const uploadDir = path.resolve('uploads');

    // Asynchronously add all files to tar pack
    (async () => {
        try {
            for (const file of files) {
                const ext = path.extname(file.original_name);
                const filePath = path.join(uploadDir, `${file.id}${ext}`);
                const fileStat = await stat(filePath).catch(() => null);

                if (fileStat) {
                    const entry = pack.entry({ name: file.original_name, size: fileStat.size });
                    const rs = createReadStream(filePath);
                    rs.pipe(entry);
                    await new Promise<void>((resolve, reject) => {
                        rs.on('end', resolve);
                        rs.on('error', reject);
                    });
                }
            }
        } catch (e) {
            console.error('Error packing tar:', e);
        } finally {
            pack.finalize();
        }
    })();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Response(pack as any, {
        headers: {
            'Content-Type': 'application/x-tar',
            'Content-Disposition': `attachment; filename="folder-${id}.tar"`
        }
    });
};

export const POST: RequestHandler = async ({ params, request }) => {
    const user = await authenticate(request);
    const { id } = params;

    const folder = await conn
        .selectFrom('folders')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

    if (!folder) throw error(404, 'Folder not found');
    if (folder.created_by !== user.id) throw error(403, 'Forbidden');

    if (!request.body) {
        throw error(400, 'Empty body');
    }

    const uploadDir = path.resolve('uploads');
    if (!(await existsAsync(uploadDir))) {
        await mkdir(uploadDir, { recursive: true });
    }

    const extract = tar.extract();

    // Node stream utility to read from extract stream
    const handleFile = async (
        header: tar.Headers,
        stream: NodeJS.ReadableStream,
        next: () => void
    ) => {
        if (header.type !== 'file') {
            stream.resume();
            return next();
        }

        const originalName = path.basename(header.name);

        // Check if file with same name exists in folder
        const existingFile = await conn
            .selectFrom('folder_files')
            .innerJoin('files', 'files.id', 'folder_files.file_id')
            .select(['files.id', 'files.original_name'])
            .where('folder_files.folder_id', '=', id)
            .where('files.original_name', '=', originalName)
            .executeTakeFirst();

        if (existingFile) {
            // Check if file is in other folders or albums
            const otherFolders = await conn
                .selectFrom('folder_files')
                .select('folder_id')
                .where('file_id', '=', existingFile.id)
                .where('folder_id', '!=', id)
                .execute();

            const albums = await conn
                .selectFrom('album_images')
                .select('album_id')
                .where('file_id', '=', existingFile.id)
                .execute();

            if (otherFolders.length === 0 && albums.length === 0) {
                // Delete from disk completely
                const extToRemove = path.extname(existingFile.original_name);
                const fileToRemovePath = path.join(uploadDir, `${existingFile.id}${extToRemove}`);
                try {
                    await unlink(fileToRemovePath);

                    // Delete variants
                    const filesInDir = await readdir(uploadDir);
                    const cachedFiles = filesInDir.filter(
                        (f) => f.startsWith(`${existingFile.id}_`) && f.endsWith(extToRemove)
                    );
                    await Promise.all(cachedFiles.map((f) => unlink(path.join(uploadDir, f))));
                } catch (e) {
                    console.error('Failed to delete old file from disk', e);
                }

                // Delete from DB completely
                await conn.deleteFrom('files').where('id', '=', existingFile.id).execute();
            } else {
                // Keep file, just unlink from current folder
                await conn
                    .deleteFrom('folder_files')
                    .where('folder_id', '=', id)
                    .where('file_id', '=', existingFile.id)
                    .execute();
            }
        }

        const ext = path.extname(originalName);
        const fileId = uuidv4();
        const filename = `${fileId}${ext}`;
        const filePath = path.join(uploadDir, filename);

        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));

        stream.on('end', async () => {
            const buffer = Buffer.concat(chunks);
            await writeFile(filePath, buffer);

            // Determine basic mime type based on extension
            let mimeType = 'application/octet-stream';
            const lowerExt = ext.toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(lowerExt))
                mimeType = `image/${lowerExt.substring(1)}`;
            else if (['.mp4', '.mkv', '.webm', '.avi'].includes(lowerExt))
                mimeType = `video/${lowerExt.substring(1)}`;
            else if (lowerExt === '.txt') mimeType = 'text/plain';

            await conn
                .insertInto('files')
                .values({
                    id: fileId,
                    original_name: originalName,
                    mime_type: mimeType,
                    size: buffer.length,
                    uploaded_by: user.id
                })
                .execute();

            await conn
                .insertInto('folder_files')
                .values({ folder_id: id, file_id: fileId })
                .execute();

            next();
        });

        stream.on('error', (err) => {
            console.error('Error reading tar entry', err);
            next();
        });
    };

    extract.on('entry', handleFile);

    try {
        // Convert Web Stream to Node Stream and pipe to tar extract
        const reader = request.body.getReader();
        const readLoop = async () => {
            const { done, value } = await reader.read();
            if (value) extract.write(Buffer.from(value));
            if (done) {
                extract.end();
            } else {
                readLoop();
            }
        };
        await readLoop();

        await new Promise<void>((resolve, reject) => {
            extract.on('finish', resolve);
            extract.on('error', reject);
        });
    } catch (e) {
        console.error('Error parsing tar archive:', e);
        throw error(500, 'Error processing tar upload');
    }

    return new Response('Folder synced successfully', { status: 200 });
};
