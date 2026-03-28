<script lang="ts">
    import { resolve } from '$app/paths';
    import * as Card from '$lib/components/ui/card/index.js';
    import CirclePlay from '@lucide/svelte/icons/circle-play';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const album = $derived(data.album);
    const images = $derived(data.images);

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
</script>

<svelte:head>
    <title>{album.name || 'Album'} | Uploader</title>
</svelte:head>

<div class="container mx-auto max-w-7xl p-4">
    <div class="mb-6">
        {#if album.name}
            <h1 class="text-3xl font-bold">{album.name}</h1>
        {/if}
        <p class="text-muted-foreground">
            Created on {formatDate(album.created_at)}
        </p>
    </div>

    {#if images.length === 0}
        <Card.Root class="border-destructive/50 bg-destructive/10">
            <Card.Header>
                <Card.Title class="text-destructive">No images in album</Card.Title>
            </Card.Header>
            <Card.Content>
                <p class="text-destructive-foreground">This album is empty.</p>
            </Card.Content>
        </Card.Root>
    {:else}
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {#each images as image (image.id)}
                {@const isVideo = image.mime_type.startsWith('video/')}
                <a
                    href={resolve(
                        `/raw/${isVideo ? 'videos' : 'images'}/${image.id}${getExt(image.original_name)}`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="group relative aspect-square overflow-hidden rounded-lg bg-muted transition-transform hover:scale-105"
                >
                    <img
                        src="/raw/images/{image.id}{getExt(image.original_name)}?width=400"
                        alt={image.original_name}
                        class="h-full w-full object-cover"
                        loading="lazy"
                    />
                    {#if isVideo}
                        <div
                            class="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/40"
                        >
                            <CirclePlay class="h-12 w-12 text-white/80" />
                        </div>
                    {/if}
                    <div
                        class="absolute right-0 bottom-0 left-0 bg-black/60 p-2 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                        <p class="truncate" title={image.original_name}>{image.original_name}</p>
                    </div>
                </a>
            {/each}
        </div>
    {/if}
</div>
