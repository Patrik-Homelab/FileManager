import { Server } from '$/lib/server/server';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
    try {
        const res = await Server.ssr.folders.list(event);
        if (!res.status) {
            throw error(res.code, res.message);
        }
        return {
            folders: res.data
        };
    } catch (e) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const err = e as any;
        if (err?.status && err?.body?.message) {
            throw error(err.status, err.body.message);
        }
        throw error(500, 'Failed to load folders');
    }
}) satisfies PageServerLoad;
