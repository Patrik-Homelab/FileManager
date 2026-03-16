<script lang="ts">
    import { API } from '$/lib/api';
    import { Button } from '$lib/components/ui/button/index.js';
    import * as Sheet from '$lib/components/ui/sheet/index.js';
    import { toast } from 'svelte-sonner';

    let {
        open = $bindable(false),
        fileIds
    }: {
        open: boolean;
        fileIds: string[];
    } = $props();

    let folders: { id: string; name: string }[] = $state([]);
    let isLoading = $state(false);
    let selectedFolderId = $state<string | null>(null);
    let isAdding = $state(false);

    $effect(() => {
        if (open) {
            loadFolders();
        }
    });

    async function loadFolders() {
        isLoading = true;
        const res = await API.folders.list();
        if (res.status) {
            folders = res.data;
        } else {
            toast.error('Failed to load folders');
        }
        isLoading = false;
    }

    async function addToFolder() {
        if (!selectedFolderId) {
            toast.error('Please select a folder');
            return;
        }

        if (fileIds.length === 0) {
            toast.error('No files selected');
            return;
        }

        isAdding = true;
        const res = await API.folders.addFiles({
            folderId: selectedFolderId,
            fileIds
        });
        isAdding = false;

        if (!res.status) {
            toast.error(res.message);
            return;
        }

        toast.success(`Successfully added ${fileIds.length} files to folder`);
        open = false;
        selectedFolderId = null;
    }
</script>

<Sheet.Root bind:open>
    <Sheet.Content>
        <Sheet.Header>
            <Sheet.Title>Add to Folder</Sheet.Title>
            <Sheet.Description>
                Select a folder to add {fileIds.length}
                {fileIds.length === 1 ? 'file' : 'files'} to.
            </Sheet.Description>
        </Sheet.Header>

        <div class="py-6">
            {#if isLoading}
                <div class="flex items-center justify-center p-4 text-muted-foreground">
                    Loading folders...
                </div>
            {:else if folders.length === 0}
                <div
                    class="rounded-md border border-border bg-muted p-4 text-center text-muted-foreground"
                >
                    You don't have any folders yet.
                </div>
            {:else}
                <div class="space-y-4">
                    <div class="flex flex-col gap-2">
                        {#each folders as folder (folder.id)}
                            <button
                                class="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors {selectedFolderId ===
                                folder.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted'}"
                                onclick={() => (selectedFolderId = folder.id)}
                            >
                                <span class="truncate font-medium">{folder.name}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}
        </div>

        <Sheet.Footer>
            <Button variant="outline" onclick={() => (open = false)} disabled={isAdding}>
                Cancel
            </Button>
            <Button
                onclick={addToFolder}
                disabled={isAdding || folders.length === 0 || !selectedFolderId}
            >
                {isAdding ? 'Adding...' : 'Add to Folder'}
            </Button>
        </Sheet.Footer>
    </Sheet.Content>
</Sheet.Root>
