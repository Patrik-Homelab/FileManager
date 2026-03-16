import { router } from '../api';
import { albumsRouter } from './albums';
import { apiKeysRouter } from './api_keys';
import { authRouter } from './auth';
import { filesRouter } from './files';
import { foldersRouter } from './folders';
import upload from './upload';
import { usersRouter } from './users';

//DOCS: https://raw.githubusercontent.com/patrick11514/SveltekitAPI/refs/heads/main/README.md
export const r = router({
    auth: authRouter,
    files: filesRouter,
    users: usersRouter,
    apiKeys: apiKeysRouter,
    albums: albumsRouter,
    folders: foldersRouter,
    upload
});

export type AppRouter = typeof r;
