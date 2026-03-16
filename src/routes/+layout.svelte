<script lang="ts">
    import { API } from '$/lib/api';
    import favicon from '$/lib/assets/favicon.svg';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import AppSidebar from '$lib/components/app-sidebar.svelte';
    import ModeToggle from '$lib/components/mode-toggle.svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Separator } from '$lib/components/ui/separator/index.js';
    import * as Sidebar from '$lib/components/ui/sidebar/index.js';
    import { Toaster } from '$lib/components/ui/sonner/index.js';
    import LogOut from '@lucide/svelte/icons/log-out';
    import { ModeWatcher } from 'mode-watcher';
    import type { Snippet } from 'svelte';
    import type { LayoutData } from './$types';
    import './layout.css';

    let { children, data }: { children: Snippet; data: LayoutData } = $props();

    $effect(() => {
        API.hydrateFromServer(data.api);
    });

    async function logout() {
        await API.auth.logout();
        await goto(resolve('/login'));
    }

    function getPageTitle(pathname: string) {
        if (pathname === '/') return 'Dashboard';
        if (pathname === '/login') return 'Login';
        if (pathname.startsWith('/files')) return 'Files';
        if (pathname.startsWith('/images')) return 'Images';
        if (pathname.startsWith('/videos')) return 'Videos';
        if (pathname.startsWith('/users')) return 'Users';
        if (pathname.startsWith('/folders')) return 'Folders';
        if (pathname.startsWith('/albums')) return 'Albums';
        return '';
    }
</script>

<svelte:head>
    <title>{getPageTitle(page.url.pathname)} | Uploader</title>
    <link rel="icon" href={favicon} />
</svelte:head>

<ModeWatcher />
<Toaster position="top-center" />

{#if data.user && page.url.pathname !== '/login' && !page.url.pathname.startsWith('/album/')}
    <Sidebar.Provider>
        <AppSidebar user={data.user} />
        <Sidebar.Inset>
            <header class="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <Sidebar.Trigger class="-ml-1" />
                <Separator orientation="vertical" class="mr-2 h-4" />
                <div class="flex items-center gap-2 px-4">
                    <h1 class="text-lg font-semibold">{getPageTitle(page.url.pathname)}</h1>
                </div>
                <div class="ml-auto flex items-center gap-2">
                    <Button variant="destructive" size="icon" onclick={logout}>
                        <LogOut class="h-[1.2rem] w-[1.2rem]" />
                    </Button>
                    <ModeToggle />
                </div>
            </header>
            <main class="flex-1 overflow-auto p-8">
                {@render children()}
            </main>
        </Sidebar.Inset>
    </Sidebar.Provider>
{:else}
    <div class="absolute top-4 right-4">
        <ModeToggle />
    </div>
    {@render children()}
{/if}
