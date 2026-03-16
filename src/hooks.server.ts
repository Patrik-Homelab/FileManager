import { ORIGIN } from '$env/static/private';
import { error, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    const { request, url } = event;

    const allowedPaths = ['/api/upload'];

    const isFormPost =
        request.method === 'POST' ||
        request.method === 'PUT' ||
        request.method === 'PATCH' ||
        request.method === 'DELETE';

    const contentType = request.headers.get('content-type') ?? '';
    const isFormType =
        contentType.includes('application/x-www-form-urlencoded') ||
        contentType.includes('multipart/form-data') ||
        contentType.includes('text/plain');

    if (isFormPost && isFormType && process.env.NODE_ENV === 'production') {
        const origin = request.headers.get('origin');

        if (!allowedPaths.includes(url.pathname) && !url.pathname.startsWith('/api/folder/')) {
            if (!origin || ORIGIN !== origin) {
                error(403, 'Cross-site POST form submissions are forbidden');
            }
        }
    }

    return resolve(event);
};
