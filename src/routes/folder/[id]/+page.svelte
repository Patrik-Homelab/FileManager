<script lang="ts">
    import { API } from '$/lib/api';
    import { invalidateAll } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import Copy from '@lucide/svelte/icons/copy';
    import FileText from '@lucide/svelte/icons/file-text';
    import Image from '@lucide/svelte/icons/image';
    import Terminal from '@lucide/svelte/icons/terminal';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import Video from '@lucide/svelte/icons/video';
    import { toast } from 'svelte-sonner';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const folder = $derived(data.folder);
    const files = $derived(data.files);

    function getExt(filename: string) {
        return filename.substring(filename.lastIndexOf('.'));
    }

    function formatDate(date: Date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function formatBytes(bytes: number) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getFileIcon(mime_type: string) {
        if (mime_type.startsWith('image/')) return Image;
        if (mime_type.startsWith('video/')) return Video;
        return FileText;
    }

    function getCategoryPath(mime_type: string) {
        if (mime_type.startsWith('image/')) return 'images';
        if (mime_type.startsWith('video/')) return 'videos';
        return 'files';
    }

    async function removeFile(fileId: string) {
        const res = await API.folders.removeFiles({ folderId: folder.id, fileIds: [fileId] });
        if (!res.status) {
            toast.error(res.message);
            return;
        }
        toast.success('File removed from folder');
        await invalidateAll();
    }

    async function copyText(text: string, message: string) {
        try {
            await navigator.clipboard.writeText(text);
            toast.success(message);
        } catch {
            toast.info('Failed to copy to clipboard');
        }
    }
</script>

<svelte:head>
    <title>{folder.name || 'Folder'} | Uploader</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-4">
    <div class="mb-6 flex items-start justify-between">
        <div>
            <h1 class="text-3xl font-bold">{folder.name}</h1>
            <p class="mt-1 text-muted-foreground">
                Created on {formatDate(folder.created_at)}
            </p>
        </div>
    </div>

    <Card.Root class="mb-8">
        <Card.Header>
            <Card.Title class="flex items-center gap-2">
                <Terminal class="h-5 w-5" />
                CLI Sync Commands
            </Card.Title>
            <Card.Description
                >Use these commands to sync this folder using tar. API Key required if folder is
                private.</Card.Description
            >
        </Card.Header>
        <Card.Content class="space-y-4">
            <div>
                <p class="mb-1 text-sm font-medium">Download folder contents:</p>
                <div class="flex items-center gap-2">
                    <code
                        class="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-sm font-bold tracking-tight whitespace-nowrap text-muted-foreground"
                    >
                        curl -s "{page.url.origin}/api/folder/{folder.id}?token=YOUR_API_KEY" | tar
                        -xf -
                    </code>
                    <Button
                        variant="outline"
                        size="icon"
                        onclick={() =>
                            copyText(
                                `curl -s "${page.url.origin}/api/folder/${folder.id}?token=YOUR_API_KEY" | tar -xf -`,
                                'Download command copied!'
                            )}
                    >
                        <Copy class="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <div>
                <p class="mb-1 text-sm font-medium">Upload files to folder:</p>
                <div class="flex items-center gap-2">
                    <code
                        class="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-sm font-bold tracking-tight whitespace-nowrap text-muted-foreground"
                    >
                        tar -cf - . | curl -X POST --data-binary @- "{page.url
                            .origin}/api/folder/{folder.id}?token=YOUR_API_KEY"
                    </code>
                    <Button
                        variant="outline"
                        size="icon"
                        onclick={() =>
                            copyText(
                                `tar -cf - . | curl -X POST --data-binary @- "${page.url.origin}/api/folder/${folder.id}?token=YOUR_API_KEY"`,
                                'Upload command copied!'
                            )}
                    >
                        <Copy class="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </Card.Content>
    </Card.Root>

    {#if files.length === 0}
        <Card.Root class="border-dashed">
            <Card.Header>
                <Card.Title>Empty Folder</Card.Title>
            </Card.Header>
            <Card.Content>
                <p class="text-muted-foreground">
                    This folder has no files yet. Upload some or add existing files from your
                    library.
                </p>
            </Card.Content>
        </Card.Root>
    {:else}
        <div class="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div class="divide-y divide-border">
                {#each files as file (file.id)}
                    {@const FileIcon = getFileIcon(file.mime_type)}
                    <div class="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
                        <div class="rounded-lg bg-muted p-2">
                            <FileIcon class="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <a
                                href={resolve(
                                    `/raw/${getCategoryPath(file.mime_type)}/${file.id}${getExt(file.original_name)}`
                                )}
                                target="_blank"
                                class="block truncate font-medium hover:underline"
                            >
                                {file.original_name}
                            </a>
                            <div class="mt-1 flex items-center gap-2">
                                <Badge variant="secondary" class="py-0 text-xs font-normal">
                                    {formatBytes(file.size)}
                                </Badge>
                                <span class="text-xs text-muted-foreground" title={file.mime_type}>
                                    {formatDate(file.upload_date)}
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            class="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onclick={() => removeFile(file.id)}
                            title="Remove from folder"
                        >
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>
