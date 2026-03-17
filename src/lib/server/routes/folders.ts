import type { SuccessApiResponse } from '$/types/types';
import { type ErrorApiResponse } from '@patrick115/sveltekitapi';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { authProcedure, procedure } from '../api';
import { conn } from '../variables';

export const foldersRouter = {
    create: authProcedure.POST.input(
        z.object({
            name: z.string()
        })
    ).query(async ({ input, ctx }) => {
        const folderId = uuid();

        await conn
            .insertInto('folders')
            .values({
                id: folderId,
                name: input.name,
                created_by: ctx.id
            })
            .execute();

        return {
            status: true,
            data: { id: folderId }
        } satisfies SuccessApiResponse<{ id: string }>;
    }),

    get: procedure.POST.input(z.object({ id: z.string() })).query(async ({ input }) => {
        const folder = await conn
            .selectFrom('folders')
            .selectAll()
            .where('id', '=', input.id)
            .executeTakeFirst();

        if (!folder) {
            return {
                status: false,
                code: 404,
                message: 'Folder not found'
            } satisfies ErrorApiResponse;
        }

        const files = await conn
            .selectFrom('folder_files')
            .innerJoin('files', 'files.id', 'folder_files.file_id')
            .select([
                'files.id',
                'files.original_name',
                'files.mime_type',
                'files.size',
                'files.upload_date'
            ])
            .where('folder_files.folder_id', '=', input.id)
            .orderBy('files.upload_date', 'desc')
            .execute();

        return {
            status: true,
            data: {
                folder,
                files
            }
        } satisfies SuccessApiResponse<{
            folder: typeof folder;
            files: typeof files;
        }>;
    }),

    list: authProcedure.GET.query(async ({ ctx }) => {
        const folders = await conn
            .selectFrom('folders')
            .selectAll()
            .where('created_by', '=', ctx.id)
            .orderBy('created_at', 'desc')
            .execute();

        const foldersWithCounts = await Promise.all(
            folders.map(async (folder) => {
                const count = await conn
                    .selectFrom('folder_files')
                    .select(({ fn }) => fn.count('file_id').as('count'))
                    .where('folder_id', '=', folder.id)
                    .executeTakeFirst();

                return {
                    ...folder,
                    fileCount: Number(count?.count || 0)
                };
            })
        );

        return {
            status: true,
            data: foldersWithCounts
        } satisfies SuccessApiResponse<typeof foldersWithCounts>;
    }),

    addFiles: authProcedure.POST.input(
        z.object({
            folderId: z.string(),
            fileIds: z.array(z.string()).min(1)
        })
    ).query(async ({ input, ctx }) => {
        const folder = await conn
            .selectFrom('folders')
            .select(['id', 'created_by'])
            .where('id', '=', input.folderId)
            .executeTakeFirst();

        if (!folder || folder.created_by !== ctx.id) {
            return {
                status: false,
                code: 403,
                message: 'Folder not found or unauthorized'
            } satisfies ErrorApiResponse;
        }

        const files = await conn
            .selectFrom('files')
            .select(['id'])
            .where('id', 'in', input.fileIds)
            .where('uploaded_by', '=', ctx.id)
            .execute();

        if (files.length !== input.fileIds.length) {
            return {
                status: false,
                code: 400,
                message: 'Some files do not exist'
            } satisfies ErrorApiResponse;
        }

        // Avoid adding duplicate entries
        for (const file of files) {
            await conn
                .insertInto('folder_files')
                .ignore()
                .values({ folder_id: input.folderId, file_id: file.id })
                .execute();
        }

        return { status: true } as const;
    }),

    removeFiles: authProcedure.POST.input(
        z.object({
            folderId: z.string(),
            fileIds: z.array(z.string()).min(1)
        })
    ).query(async ({ input, ctx }) => {
        const folder = await conn
            .selectFrom('folders')
            .select(['id', 'created_by'])
            .where('id', '=', input.folderId)
            .executeTakeFirst();

        if (!folder || folder.created_by !== ctx.id) {
            return {
                status: false,
                code: 403,
                message: 'Folder not found or unauthorized'
            } satisfies ErrorApiResponse;
        }

        await conn
            .deleteFrom('folder_files')
            .where('folder_id', '=', input.folderId)
            .where('file_id', 'in', input.fileIds)
            .execute();

        return { status: true } as const;
    }),

    delete: authProcedure.POST.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
        const folder = await conn
            .selectFrom('folders')
            .select(['id', 'created_by'])
            .where('id', '=', input.id)
            .executeTakeFirst();

        if (!folder) {
            return {
                status: false,
                code: 404,
                message: 'Folder not found'
            } satisfies ErrorApiResponse;
        }

        if (folder.created_by !== ctx.id) {
            return {
                status: false,
                code: 403,
                message: 'Not authorized to delete this folder'
            } satisfies ErrorApiResponse;
        }

        await conn.deleteFrom('folders').where('id', '=', input.id).execute();

        return {
            status: true
        } as const;
    })
};
