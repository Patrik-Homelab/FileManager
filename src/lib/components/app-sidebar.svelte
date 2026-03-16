<script lang="ts">
    import { page } from '$app/state';
    import * as Sidebar from '$lib/components/ui/sidebar/index.js';
    import FileText from '@lucide/svelte/icons/file-text';
    import Folder from '@lucide/svelte/icons/folder';
    import FolderOpen from '@lucide/svelte/icons/folder-open';
    import House from '@lucide/svelte/icons/house';
    import Image from '@lucide/svelte/icons/image';
    import Settings from '@lucide/svelte/icons/settings';
    import Users from '@lucide/svelte/icons/users';
    import Video from '@lucide/svelte/icons/video';

    let { user }: { user: { username: string } } = $props();

    const groups = [
        {
            label: 'General',
            items: [
                {
                    title: 'Dashboard',
                    url: '/',
                    icon: House
                },
                {
                    title: 'Users',
                    url: '/users',
                    icon: Users
                },
                {
                    title: 'Settings',
                    url: '/settings',
                    icon: Settings
                }
            ]
        },
        {
            label: 'Content',
            items: [
                {
                    title: 'Images',
                    url: '/images',
                    icon: Image
                },
                {
                    title: 'Albums',
                    url: '/albums',
                    icon: FolderOpen
                },
                {
                    title: 'Folders',
                    url: '/folders',
                    icon: Folder
                },
                {
                    title: 'Videos',
                    url: '/videos',
                    icon: Video
                },
                {
                    title: 'Files',
                    url: '/files',
                    icon: FileText
                }
            ]
        }
    ];
</script>

<Sidebar.Root>
    <Sidebar.Header>
        <div class="flex flex-col px-4 py-2">
            <h1 class="text-lg font-semibold">File Manager</h1>
            <span class="text-sm text-muted-foreground">Welcome, {user.username}</span>
        </div>
    </Sidebar.Header>
    <Sidebar.Content>
        {#each groups as group (group.label)}
            <Sidebar.Group>
                <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
                <Sidebar.GroupContent>
                    <Sidebar.Menu>
                        {#each group.items as item (item.title)}
                            <Sidebar.MenuItem>
                                <Sidebar.MenuButton isActive={page.url.pathname === item.url}>
                                    {#snippet child({ props })}
                                        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                                        <a href={item.url} {...props}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    {/snippet}
                                </Sidebar.MenuButton>
                            </Sidebar.MenuItem>
                        {/each}
                    </Sidebar.Menu>
                </Sidebar.GroupContent>
            </Sidebar.Group>
        {/each}
    </Sidebar.Content>
    <Sidebar.Footer />
</Sidebar.Root>
