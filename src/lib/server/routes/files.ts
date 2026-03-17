import { AnyFormDataInput, type ErrorApiResponse } from '@patrick115/sveltekitapi';
import { readdir, unlink } from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import type { SuccessApiResponse } from '../../../types/types';
import { authProcedure } from '../api';
import { uploadFile } from '../functions';
import { conn } from '../variables';

export const filesRouter = {
    upload: authProcedure.POST.input(AnyFormDataInput).query(async ({ input, ctx }) => {
        const file = await uploadFile(input, ctx.id);
        if (!file) {
            return {
                status: false,
                code: 400,
                message: 'No file uploaded'
            } satisfies ErrorApiResponse;
        }

        return {
            status: true
        } as const;
    }),
    list: authProcedure.POST.input(
        z.object({
            limit: z.number().default(40),
            offset: z.number().default(0),
            orderBy: z.enum(['upload_date', 'original_name', 'size']).default('upload_date'),
            orderDir: z.enum(['asc', 'desc']).default('desc'),
            type: z.string().optional()
        })
    ).query(async ({ input, ctx }) => {
        let query = conn.selectFrom('files').selectAll().where('uploaded_by', '=', ctx.id);

        if (input.type) {
            query = query.where('mime_type', 'like', `${input.type}%`);
        }

        const data = await query
            .orderBy(input.orderBy, input.orderDir)
            .limit(input.limit)
            .offset(input.offset)
            .execute();
        return {
            status: true,
            data
        } satisfies SuccessApiResponse<typeof data>;
    }),
    get: authProcedure.POST.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
        const file = await conn
            .selectFrom('files')
            .selectAll()
            .where('id', '=', input.id)
            .where('uploaded_by', '=', ctx.id)
            .executeTakeFirst();
        if (!file) {
            return {
                status: false,
                code: 404,
                message: 'File not found'
            } satisfies ErrorApiResponse;
        }
        return {
            status: true,
            data: file
        } satisfies SuccessApiResponse<typeof file>;
    }),
    delete: authProcedure.POST.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
        const file = await conn
            .selectFrom('files')
            .selectAll()
            .where('id', '=', input.id)
            .where('uploaded_by', '=', ctx.id)
            .executeTakeFirst();
        if (!file) {
            return {
                status: false,
                code: 404,
                message: 'File not found'
            } satisfies ErrorApiResponse;
        }

        const ext = path.extname(file.original_name);
        const filename = `${file.id}${ext}`;
        const filePath = path.join(path.resolve('uploads'), filename);

        try {
            await unlink(filePath);
        } catch (e) {
            console.error('Failed to delete file from disk', e);
        }

        //Delete cached variants for images
        const uploadsDir = path.resolve('uploads');
        try {
            const files = await readdir(uploadsDir);
            const cachedFiles = files.filter((f) => f.startsWith(`${file.id}_`) && f.endsWith(ext));

            await Promise.all(cachedFiles.map((f) => unlink(path.join(uploadsDir, f))));
        } catch (e) {
            console.error('Failed to delete cached variants', e);
        }

        await conn.deleteFrom('files').where('id', '=', input.id).execute();

        return {
            status: true
        } as const;
    })
};
