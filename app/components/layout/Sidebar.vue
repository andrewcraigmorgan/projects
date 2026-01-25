<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useOrganizationStore } from '~/stores/organization'

const authStore = useAuthStore()
const orgStore = useOrganizationStore()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const { isMobile } = useBreakpoints()

const navigation = [
  { name: 'Dashboard', href: '/dashboard?from=nav', icon: 'home' },
  { name: 'My Tasks', href: '/my-tasks', icon: 'clipboard-list' },
  { name: 'Projects', href: '/projects', icon: 'folder' },
  { name: 'Settings', href: '/settings', icon: 'cog' },
]

const route = useRoute()

function isActive(href: string) {
  // Strip query params for comparison
  const path = href.split('?')[0]
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <div class="flex h-full w-64 flex-col bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
    <!-- Logo & Close Button -->
    <div class="flex h-16 items-center justify-between px-4 sm:px-6">
      <div class="flex items-center gap-2">
        <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20">
          <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h1 class="text-xl font-bold text-white">Projects</h1>
      </div>
      <!-- Mobile close button -->
      <button
        v-if="isMobile"
        class="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors -mr-2"
        aria-label="Close sidebar"
        @click="emit('close')"
      >
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Organization Selector -->
    <div class="px-3 sm:px-4 mb-4">
      <UiSelect
        v-if="orgStore.organizations.length > 0"
        :model-value="orgStore.currentOrganization?.id"
        :options="orgStore.organizations.map(o => ({ value: o.id, label: o.name }))"
        placeholder="Select organization..."
        search-placeholder="Search organizations..."
        searchable
        variant="dark"
        size="md"
        @update:model-value="orgStore.setCurrentOrganization(orgStore.organizations.find(o => o.id === $event)!)"
      />
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 px-2 sm:px-3">
      <NuxtLink
        v-for="item in navigation"
        :key="item.name"
        :to="item.href"
        :class="[
          isActive(item.href)
            ? 'bg-gradient-to-r from-primary-600/90 to-primary-500/90 text-white shadow-lg shadow-primary-500/20'
            : 'text-gray-300 hover:bg-white/5 hover:text-white',
          'group flex items-center px-3 py-3 sm:py-2.5 text-sm font-medium rounded-lg transition-all duration-200 min-h-[44px]',
        ]"
      >
        <svg
          class="mr-3 h-5 w-5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            v-if="item.icon === 'home'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
          <path
            v-if="item.icon === 'clipboard-list'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
          />
          <path
            v-if="item.icon === 'folder'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
          <path
            v-if="item.icon === 'cog'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
        </svg>
        {{ item.name }}
      </NuxtLink>
    </nav>

    <!-- User -->
    <div class="border-t border-gray-800/50 p-3 sm:p-4">
      <div class="flex items-center min-h-[44px] p-2 rounded-lg bg-white/5">
        <div
          class="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-lg shadow-primary-500/20"
        >
          {{ authStore.user?.name?.[0]?.toUpperCase() || '?' }}
        </div>
        <div class="ml-3 flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">
            {{ authStore.user?.name }}
          </p>
          <p class="text-xs text-gray-400 truncate">
            {{ authStore.user?.email }}
          </p>
        </div>
        <button
          class="ml-2 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 -mr-2"
          title="Logout"
          aria-label="Logout"
          @click="authStore.logout()"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
