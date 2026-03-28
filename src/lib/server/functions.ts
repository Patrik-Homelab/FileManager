import type { UserData, UserState } from '$/types/types';
import type { Cookies } from '@sveltejs/kit';
import { mkdir, stat, writeFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateThumbnail, THUMBNAIL_PROMISES } from './thumbnails';
import { conn, jwt } from './variables';

export const getCookieData = (cookies: Cookies): UserState => {
    const cookie = cookies.get('session');
    if (!cookie) {
        return {
            logged: false
        };
    }

    const data = jwt.getCookie<UserData>(cookie);

    if (!data) {
        return {
            logged: false
        };
    }

    return {
        logged: true,
        data
    };
};

export const existsAsync = async (path: string) => {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
};

export const uploadFile = async (fd: FormData, user_id: number) => {
    const file = fd.get('file') as File;
    if (!file) {
        return null;
    }

    let type: 'files' | 'images' | 'videos' = 'files';
    if (file.type.startsWith('image/')) {
        type = 'images';
    } else if (file.type.startsWith('video/')) {
        type = 'videos';
    }

    const id = uuidv4();
    const originalName = file.name || 'unknown';
    const ext = path.extname(originalName);

    const filename = `${id}${ext}`;
    const uploadDir = path.resolve('uploads');

    if (!(await existsAsync(uploadDir))) {
        await mkdir(uploadDir, { recursive: true });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, filename);

    const relativePath = fd.get('path') as string | null;

    await writeFile(filePath, buffer);

    await conn
        .insertInto('files')
        .values({
            id,
            original_name: originalName,
            mime_type: file.type,
            size: file.size,
            uploaded_by: user_id,
            path: relativePath || ''
        })
        .execute();

    if (type === 'videos') {
        const promise = generateThumbnail(filename);
        THUMBNAIL_PROMISES[filename] = promise;
        // The promise will clean itself up once resolved via raw route,
        // or we could clean it up here, but memory is small. Let's just hook then:
        promise
            .then(() => {
                delete THUMBNAIL_PROMISES[filename];
            })
            .catch(() => {
                delete THUMBNAIL_PROMISES[filename];
            });
    }

    return {
        id: id,
        path: filePath,
        url: `/raw/${type}/${filename}`,
        type
    };
};
