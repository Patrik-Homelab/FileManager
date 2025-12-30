<script lang="ts">
    import { API } from '$/lib/api';
    import { invalidateAll } from '$app/navigation';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import * as Card from '$lib/components/ui/card/index.js';
    import UploadCloud from '@lucide/svelte/icons/cloud-upload';
    import { toast } from 'svelte-sonner';
    import { v4 as uuidv4 } from 'uuid';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let dragging = $state(false);
    let uploading = $state(false);

    type FileStatus = 'pending' | 'uploading' | 'success' | 'error';
    interface FileUpload {
        id: string;
        name: string;
        status: FileStatus;
        message?: string;
    }

    let uploads = $state<FileUpload[]>([]);

    function handleDragEnter(e: DragEvent) {
        e.preventDefault();
        dragging = true;
    }

    function handleDragLeave(e: DragEvent) {
        e.preventDefault();
        dragging = false;
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
    }

    async function handleDrop(e: DragEvent) {
        e.preventDefault();
        dragging = false;
        if (e.dataTransfer?.files) {
            await uploadFiles(e.dataTransfer.files);
        }
    }

    async function handleFileSelect(e: Event) {
        const target = e.target as HTMLInputElement;
        if (target.files) {
            await uploadFiles(target.files);
        }
    }

    function handlePaste(e: ClipboardEvent) {
        if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
            e.preventDefault();
            uploadFiles(e.clipboardData.files);
        }
    }

    function updateUploadStatus(id: string, status: FileStatus, message?: string) {
        uploads = uploads.map((u) => (u.id === id ? { ...u, status, message } : u));
    }

    function removeUpload(id: string) {
        uploads = uploads.filter((u) => u.id !== id);
    }

    async function uploadFiles(files: FileList) {
        uploading = true;

        const newUploads: FileUpload[] = Array.from(files).map((file) => ({
            id: uuidv4(),
            name: file.name,
            status: 'pending'
        }));

        uploads = [...uploads, ...newUploads];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const uploadId = newUploads[i].id;

            updateUploadStatus(uploadId, 'uploading');

            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await API.files.upload(formData);
                if (!res.status) {
                    toast.error(`Upload failed for ${file.name}: ${res.message}`);
                    updateUploadStatus(uploadId, 'error', res.message);
                } else {
                    toast.success(`File ${file.name} uploaded successfully`);
                    updateUploadStatus(uploadId, 'success');
                    setTimeout(() => {
                        removeUpload(uploadId);
                    }, 5000);
                }
            } catch (e) {
                console.error('Upload failed', e);
                toast.error(`Upload failed for ${file.name}`);
                updateUploadStatus(uploadId, 'error', 'Upload failed');
            }
        }
        uploading = false;
        invalidateAll(); // Refresh lists
    }
</script>

<svelte:window onpaste={handlePaste} />

<div class="space-y-6">
    <h2 class="text-2xl font-bold">Dashboard</h2>

    <Card.Root>
        <Card.Content class="p-6">
            <div
                class="cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors
                {dragging
                    ? 'border-primary bg-primary/10'
                    : 'border-muted-foreground/25 hover:border-primary/50'}"
                ondragenter={handleDragEnter}
                ondragleave={handleDragLeave}
                ondragover={handleDragOver}
                ondrop={handleDrop}
                onclick={() => document.getElementById('fileInput')?.click()}
                role="button"
                tabindex="0"
                onkeydown={(e) =>
                    e.key === 'Enter' && document.getElementById('fileInput')?.click()}
            >
                <input
                    type="file"
                    id="fileInput"
                    class="hidden"
                    multiple
                    onchange={handleFileSelect}
                />
                <div class="flex flex-col items-center space-y-2">
                    <UploadCloud class="h-12 w-12 text-muted-foreground" />
                    <div class="text-sm text-muted-foreground">
                        <span class="font-medium text-primary hover:text-primary/80"
                            >Upload a file</span
                        >
                        or drag and drop
                    </div>
                    <p class="text-xs text-muted-foreground">
                        PNG, JPG, GIF, MP4, PDF up to {data.uploadLimit}
                    </p>
                </div>
            </div>

            {#if uploads.length > 0}
                <div class="mt-6 space-y-3">
                    <h3 class="text-sm font-medium text-muted-foreground">Uploads</h3>
                    <div class="space-y-2">
                        {#each uploads as upload (upload.id)}
                            <div
                                class="flex items-center justify-between rounded-lg border bg-card p-3 shadow-sm transition-all"
                            >
                                <div class="flex items-center gap-3">
                                    <span class="text-sm font-medium">{upload.name}</span>
                                </div>
                                <Badge
                                    variant={upload.status === 'error' ? 'destructive' : 'outline'}
                                    class={upload.status === 'pending'
                                        ? 'border-yellow-500/50 bg-yellow-500/15 text-yellow-600 hover:bg-yellow-500/25'
                                        : upload.status === 'success'
                                          ? 'border-green-500/50 bg-green-500/15 text-green-600 hover:bg-green-500/25'
                                          : ''}
                                >
                                    {upload.status === 'pending'
                                        ? 'Pending'
                                        : upload.status === 'uploading'
                                          ? 'Uploading...'
                                          : upload.status === 'success'
                                            ? 'Completed'
                                            : 'Failed'}
                                </Badge>
                            </div>
                        {/each}
                    </div>
                </div>
            {/if}
        </Card.Content>
    </Card.Root>

    {#if uploading}
        <div class="text-center text-primary">Uploading...</div>
    {/if}
</div>
