<script lang="ts">
    import { API } from '$/lib/api';
    import { goto, invalidateAll } from '$app/navigation';
    import { page } from '$app/stores';
    import AddToFolderDialog from '$lib/components/add-to-folder-dialog.svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
    import * as Table from '$lib/components/ui/table/index.js';
    import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
    import FileText from '@lucide/svelte/icons/file-text';
    import FolderPlus from '@lucide/svelte/icons/folder-plus';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import { toast } from 'svelte-sonner';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let files = $derived(data.files);

    let isFolderDialogOpen = $state(false);
    let selectedFileForFolder = $state<string | null>(null);

    function openFolderDialog(id: string) {
        selectedFileForFolder = id;
        isFolderDialogOpen = true;
    }

    function deleteFile(id: string) {
        toast('Are you sure you want to delete this file?', {
            action: {
                label: 'Delete',
                onClick: async () => {
                    const res = await API.files.delete({ id });
                    if (!res.status) {
                        toast.error(res.message);
                        return;
                    }
                    toast.success('File removed successfully');
                    invalidateAll();
                }
            },
            cancel: {
                label: 'Cancel',
                onClick: () => {}
            }
        });
    }

    function getExt(filename: string) {
        return filename.substring(filename.lastIndexOf('.'));
    }

    function formatSize(bytes: number) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function sort(by: 'upload_date' | 'original_name' | 'size', dir: 'asc' | 'desc') {
        const url = new URL($page.url);
        url.searchParams.set('orderBy', by);
        url.searchParams.set('orderDir', dir);
        // eslint-disable-next-line svelte/no-navigation-without-resolve
        goto(url);
    }
</script>

<div class="flex h-full flex-col gap-4 p-4">
    <div class="flex items-center justify-between">
        <DropdownMenu.Root>
            <DropdownMenu.Trigger class="ml-auto">
                {#snippet child({ props })}
                    <Button variant="outline" size="sm" {...props}>
                        <ArrowUpDown class="mr-2 h-4 w-4" />
                        Sort by
                    </Button>
                {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
                <DropdownMenu.Label>Sort by</DropdownMenu.Label>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onclick={() => sort('upload_date', 'desc')}>
                    Date (Newest)
                </DropdownMenu.Item>
                <DropdownMenu.Item onclick={() => sort('upload_date', 'asc')}>
                    Date (Oldest)
                </DropdownMenu.Item>
                <DropdownMenu.Item onclick={() => sort('original_name', 'asc')}>
                    Name (A-Z)
                </DropdownMenu.Item>
                <DropdownMenu.Item onclick={() => sort('original_name', 'desc')}>
                    Name (Z-A)
                </DropdownMenu.Item>
                <DropdownMenu.Item onclick={() => sort('size', 'desc')}>
                    Size (Largest)
                </DropdownMenu.Item>
                <DropdownMenu.Item onclick={() => sort('size', 'asc')}>
                    Size (Smallest)
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </div>

    {#if files.length === 0}
        <Card.Root class="border-destructive/50 bg-destructive/10">
            <Card.Header>
                <Card.Title class="text-destructive">No files uploaded</Card.Title>
            </Card.Header>
            <Card.Content>
                <p class="text-destructive-foreground">There are no files uploaded yet.</p>
            </Card.Content>
        </Card.Root>
    {:else}
        <Card.Root>
            <Card.Content class="p-0">
                <Table.Root>
                    <Table.Header>
                        <Table.Row>
                            <Table.Head>Name</Table.Head>
                            <Table.Head>Size</Table.Head>
                            <Table.Head>Date</Table.Head>
                            <Table.Head class="text-right">Actions</Table.Head>
                        </Table.Row>
                    </Table.Header>
                    <Table.Body>
                        {#each files as file (file.id)}
                            <Table.Row>
                                <Table.Cell class="font-medium">
                                    <div class="flex items-center gap-2">
                                        <FileText class="h-4 w-4 text-muted-foreground" />
                                        <!-- eslint-disable svelte/no-navigation-without-resolve -->
                                        <a
                                            href="/raw/file/{file.id}{getExt(file.original_name)}"
                                            target="_blank"
                                            class="text-primary hover:underline"
                                        >
                                            {file.original_name}
                                        </a>
                                        <!-- eslint-enable svelte/no-navigation-without-resolve -->
                                    </div>
                                </Table.Cell>
                                <Table.Cell>{formatSize(file.size)}</Table.Cell>
                                <Table.Cell
                                    >{new Date(file.upload_date).toLocaleDateString()}</Table.Cell
                                >
                                <Table.Cell class="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onclick={() => openFolderDialog(file.id)}
                                        title="Add to folder"
                                    >
                                        <FolderPlus class="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onclick={() => deleteFile(file.id)}
                                    >
                                        <Trash2 class="h-4 w-4 text-destructive" />
                                    </Button>
                                </Table.Cell>
                            </Table.Row>
                        {/each}
                    </Table.Body>
                </Table.Root>
            </Card.Content>
        </Card.Root>
    {/if}
</div>

{#if selectedFileForFolder}
    <AddToFolderDialog bind:open={isFolderDialogOpen} fileIds={[selectedFileForFolder]} />
{/if}
