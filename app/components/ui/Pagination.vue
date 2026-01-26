<script setup lang="ts">
interface Props {
  currentPage: number
  totalPages: number
  total?: number
  limit?: number
  showItemCount?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  total: 0,
  limit: 50,
  showItemCount: true,
})

const emit = defineEmits<{
  'update:page': [page: number]
}>()

// Calculate visible page numbers
const visiblePages = computed(() => {
  const pages: (number | 'ellipsis')[] = []
  const current = props.currentPage
  const total = props.totalPages

  if (total <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= total; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)

    if (current <= 3) {
      // Near the start: 1 2 3 4 5 ... last
      pages.push(2, 3, 4, 5, 'ellipsis', total)
    } else if (current >= total - 2) {
      // Near the end: 1 ... last-4 last-3 last-2 last-1 last
      pages.push('ellipsis', total - 4, total - 3, total - 2, total - 1, total)
    } else {
      // In the middle: 1 ... current-1 current current+1 ... last
      pages.push('ellipsis', current - 1, current, current + 1, 'ellipsis', total)
    }
  }

  return pages
})

// Calculate item range for display
const itemRange = computed(() => {
  if (!props.total) return null
  const start = (props.currentPage - 1) * props.limit + 1
  const end = Math.min(props.currentPage * props.limit, props.total)
  return { start, end }
})

function goToPage(page: number) {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('update:page', page)
  }
}
</script>

<template>
  <div
    v-if="totalPages > 1 || (showItemCount && total > 0)"
    class="flex flex-col sm:flex-row items-center justify-between gap-3 py-3"
  >
    <!-- Item count -->
    <div
      v-if="showItemCount && itemRange"
      class="text-sm text-gray-500 dark:text-gray-400"
    >
      Showing <span class="font-medium text-gray-700 dark:text-gray-300">{{ itemRange.start }}</span>
      to <span class="font-medium text-gray-700 dark:text-gray-300">{{ itemRange.end }}</span>
      of <span class="font-medium text-gray-700 dark:text-gray-300">{{ total }}</span> items
    </div>

    <!-- Pagination controls -->
    <nav
      v-if="totalPages > 1"
      class="flex items-center gap-1"
      aria-label="Pagination"
    >
      <!-- Previous button -->
      <button
        :disabled="currentPage <= 1"
        class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-colors"
        aria-label="Previous page"
        @click="goToPage(currentPage - 1)"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <!-- Page numbers -->
      <template v-for="(page, index) in visiblePages" :key="index">
        <span
          v-if="page === 'ellipsis'"
          class="px-2 py-1 text-gray-400 dark:text-gray-500"
        >
          ...
        </span>
        <button
          v-else
          :aria-current="page === currentPage ? 'page' : undefined"
          class="min-w-[2.25rem] px-3 py-1.5 text-sm font-medium transition-colors"
          :class="page === currentPage
            ? 'bg-primary-600 text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
      </template>

      <!-- Next button -->
      <button
        :disabled="currentPage >= totalPages"
        class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-transparent transition-colors"
        aria-label="Next page"
        @click="goToPage(currentPage + 1)"
      >
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  </div>
</template>
