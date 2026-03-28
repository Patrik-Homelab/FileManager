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

    let albums: { id: string; name: string | null }[] = $state([]);
    let isLoading = $state(false);
    let selectedAlbumId = $state<string | null>(null);
    let isAdding = $state(false);

    $effect(() => {
        if (open) {
            loadAlbums();
        }
    });

    async function loadAlbums() {
        isLoading = true;
        const res = await API.albums.list();
        if (res.status) {
            albums = res.data;
        } else {
            toast.error('Failed to load albums');
        }
        isLoading = false;
    }

    async function addToAlbum() {
        if (!selectedAlbumId) {
            toast.error('Please select an album');
            return;
        }

        if (fileIds.length === 0) {
            toast.error('No files selected');
            return;
        }

        isAdding = true;
        const res = await API.albums.addFiles({
            albumId: selectedAlbumId,
            fileIds
        });
        isAdding = false;

        if (!res.status) {
            toast.error(res.message);
            return;
        }

        toast.success(`Successfully added ${fileIds.length} files to album`);
        open = false;
        selectedAlbumId = null;
    }
</script>

<Sheet.Root bind:open>
    <Sheet.Content>
        <Sheet.Header>
            <Sheet.Title>Add to existing Album</Sheet.Title>
            <Sheet.Description>
                Select an album to add {fileIds.length}
                {fileIds.length === 1 ? 'file' : 'files'} to.
            </Sheet.Description>
        </Sheet.Header>

        <div class="max-h-[80vh] flex-1 overflow-y-auto py-6">
            {#if isLoading}
                <div class="flex items-center justify-center p-4 text-muted-foreground">
                    Loading albums...
                </div>
            {:else if albums.length === 0}
                <div
                    class="rounded-md border border-border bg-muted p-4 text-center text-muted-foreground"
                >
                    You don't have any albums yet.
                </div>
            {:else}
                <div class="space-y-4">
                    <div class="flex flex-col gap-2">
                        {#each albums as album (album.id)}
                            <button
                                class="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors {selectedAlbumId ===
                                album.id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:bg-muted'}"
                                onclick={() => (selectedAlbumId = album.id)}
                            >
                                <span class="truncate font-medium"
                                    >{album.name || 'Unnamed Album'}</span
                                >
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
                onclick={addToAlbum}
                disabled={isAdding || albums.length === 0 || !selectedAlbumId}
            >
                {isAdding ? 'Adding...' : 'Add to Album'}
            </Button>
        </Sheet.Footer>
    </Sheet.Content>
</Sheet.Root>
