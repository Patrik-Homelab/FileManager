<script lang="ts">
    import { API } from '$/lib/api';
    import { goto, invalidateAll } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import FolderIcon from '@lucide/svelte/icons/folder';
    import Link from '@lucide/svelte/icons/link';
    import Plus from '@lucide/svelte/icons/plus';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import { toast } from 'svelte-sonner';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let folders = $derived(data.folders);
    let newFolderName = $state('');
    let isCreating = $state(false);

    function formatDate(date: Date) {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    async function copyFolderLink(folderId: string) {
        const folderUrl = `${page.url.origin}/folder/${folderId}`;
        try {
            await navigator.clipboard.writeText(folderUrl);
            toast.success('Folder link copied to clipboard!');
        } catch {
            toast.info(`Folder URL: ${folderUrl}`);
        }
    }

    function deleteFolder(id: string) {
        toast('Are you sure you want to delete this folder?', {
            action: {
                label: 'Delete',
                onClick: async () => {
                    const res = await API.folders.delete({ id });
                    if (!res.status) {
                        toast.error(res.message);
                        return;
                    }
                    toast.success('Folder deleted successfully');
                    await invalidateAll();
                }
            },
            cancel: {
                label: 'Cancel',
                onClick: () => {}
            }
        });
    }

    async function createFolder(e: Event) {
        e.preventDefault();
        if (!newFolderName.trim()) {
            toast.error('Folder name cannot be empty');
            return;
        }

        isCreating = true;
        const res = await API.folders.create({ name: newFolderName.trim() });
        isCreating = false;

        if (!res.status) {
            toast.error(res.message);
            return;
        }

        toast.success('Folder created successfully');
        newFolderName = '';
        await invalidateAll();
    }
</script>

<div class="flex h-[calc(100vh-4.1rem)] flex-col gap-4 p-4">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">My Folders</h1>

        <form class="flex items-center gap-2" onsubmit={createFolder}>
            <Input
                placeholder="New folder name..."
                bind:value={newFolderName}
                disabled={isCreating}
                class="w-48 sm:w-64"
            />
            <Button type="submit" disabled={isCreating || !newFolderName.trim()}>
                <Plus class="mr-2 h-4 w-4" />
                Create
            </Button>
        </form>
    </div>

    <div class="flex-1 overflow-y-auto">
        {#if folders.length === 0}
            <Card.Root class="border-muted">
                <Card.Header>
                    <Card.Title>No folders yet</Card.Title>
                </Card.Header>
                <Card.Content>
                    <p class="text-muted-foreground">
                        Create your first folder using the input above.
                    </p>
                </Card.Content>
            </Card.Root>
        {:else}
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {#each folders as folder (folder.id)}
                    <Card.Root class="overflow-hidden transition-shadow hover:shadow-md">
                        <Card.Header>
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <Card.Title class="text-lg">
                                        {folder.name}
                                    </Card.Title>
                                    <Card.Description>
                                        Created {formatDate(folder.created_at)}
                                    </Card.Description>
                                </div>
                            </div>
                        </Card.Header>
                        <Card.Content>
                            <div class="flex items-center gap-2">
                                <Badge variant="secondary">
                                    <FolderIcon class="mr-1 h-3 w-3" />
                                    {folder.fileCount}
                                    {folder.fileCount === 1 ? 'file' : 'files'}
                                </Badge>
                            </div>
                        </Card.Content>
                        <Card.Footer class="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onclick={() => goto(resolve(`/folder/${folder.id}`))}
                                class="flex-1"
                            >
                                Open Folder
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onclick={() => copyFolderLink(folder.id)}
                                class="h-9 w-9"
                            >
                                <Link class="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onclick={() => deleteFolder(folder.id)}
                                class="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive/90"
                            >
                                <Trash2 class="h-4 w-4" />
                            </Button>
                        </Card.Footer>
                    </Card.Root>
                {/each}
            </div>
        {/if}
    </div>
</div>
