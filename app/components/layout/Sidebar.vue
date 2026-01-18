<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useOrganizationStore } from '~/stores/organization'

const authStore = useAuthStore()
const orgStore = useOrganizationStore()

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: 'home' },
  { name: 'Projects', href: '/projects', icon: 'folder' },
  { name: 'Settings', href: '/settings', icon: 'cog' },
]

const route = useRoute()

function isActive(href: string) {
  return route.path === href || route.path.startsWith(href + '/')
}
</script>

<template>
  <div class="flex h-full w-64 flex-col bg-gray-900">
    <!-- Logo -->
    <div class="flex h-16 items-center px-6">
      <h1 class="text-xl font-bold text-white">Projects</h1>
    </div>

    <!-- Organization Selector -->
    <div class="px-4 mb-4">
      <select
        v-if="orgStore.organizations.length > 0"
        :value="orgStore.currentOrganization?.id"
        class="w-full bg-gray-800 text-white text-sm px-3 py-2 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        @change="orgStore.setCurrentOrganization(orgStore.organizations.find(o => o.id === ($event.target as HTMLSelectElement).value)!)"
      >
        <option
          v-for="org in orgStore.organizations"
          :key="org.id"
          :value="org.id"
        >
          {{ org.name }}
        </option>
      </select>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-1 px-3">
      <NuxtLink
        v-for="item in navigation"
        :key="item.name"
        :to="item.href"
        :class="[
          isActive(item.href)
            ? 'bg-gray-800 text-white'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white',
          'group flex items-center px-3 py-2 text-sm font-medium transition-colors',
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
    <div class="border-t border-gray-800 p-4">
      <div class="flex items-center">
        <div
          class="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium"
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
          class="ml-2 text-gray-400 hover:text-white"
          title="Logout"
          @click="authStore.logout()"
        >
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
