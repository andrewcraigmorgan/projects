<script setup lang="ts">
import type { SpecificationMilestone } from '~/composables/useSpecification'
import { useMilestoneSignoff } from '~/composables/useSpecification'
import { useAuthStore } from '~/stores/auth'

interface Props {
  milestone: SpecificationMilestone
  expanded: boolean
  isApprover: boolean
  isProjectOwner: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  toggle: []
  refresh: []
}>()

const authStore = useAuthStore()
const milestoneId = computed(() => props.milestone.id)
const { signOff, revokeSignoff } = useMilestoneSignoff(milestoneId)

// UI state
const showSignoffModal = ref(false)
const signoffNotes = ref('')
const signingOff = ref(false)
const showRevokeConfirm = ref<string | null>(null)

// Computed
const signoffStatusColor = computed(() => {
  switch (props.milestone.signoffStatus.status) {
    case 'complete':
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
    case 'partial':
      return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30'
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700'
  }
})

const canSignOff = computed(() => {
  return props.isApprover &&
         !props.milestone.isLocked &&
         !props.milestone.signoffStatus.signoffs.some(s => s.signedBy.id === authStore.user?.id)
})

const progressPercent = computed(() => {
  if (props.milestone.taskStats.total === 0) return 0
  return Math.round((props.milestone.taskStats.completed / props.milestone.taskStats.total) * 100)
})

// Handlers
async function handleSignOff() {
  signingOff.value = true
  try {
    await signOff(signoffNotes.value || undefined)
    showSignoffModal.value = false
    signoffNotes.value = ''
    emit('refresh')
  } catch (e) {
    console.error('Failed to sign off:', e)
  } finally {
    signingOff.value = false
  }
}

async function handleRevoke(signoffId: string) {
  try {
    await revokeSignoff(signoffId)
    showRevokeConfirm.value = null
    emit('refresh')
  } catch (e) {
    console.error('Failed to revoke signoff:', e)
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
    <!-- Header -->
    <div
      class="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
      @click="emit('toggle')"
    >
      <div class="flex items-center gap-3">
        <!-- Expand/collapse icon -->
        <svg
          class="w-5 h-5 text-gray-400 transition-transform"
          :class="{ 'rotate-90': expanded }"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>

        <!-- Lock icon -->
        <svg
          v-if="milestone.isLocked"
          class="w-5 h-5 text-green-600 dark:text-green-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          title="Milestone is locked (signed off)"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>

        <div>
          <h3 class="font-medium text-gray-900 dark:text-gray-100">
            {{ milestone.name }}
          </h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ formatDate(milestone.startDate) }} - {{ formatDate(milestone.endDate) }}
            <span class="ml-2">|</span>
            <span class="ml-2">{{ milestone.taskStats.completed }}/{{ milestone.taskStats.total }} tasks</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Progress bar -->
        <div class="w-24 h-2 bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            class="h-full bg-primary-500"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>

        <!-- Sign-off status badge -->
        <span
          class="px-2 py-1 text-xs font-medium"
          :class="signoffStatusColor"
        >
          {{ milestone.signoffStatus.signedCount }}/{{ milestone.signoffStatus.totalApprovers }} signed
        </span>
      </div>
    </div>

    <!-- Expanded content -->
    <div v-if="expanded" class="border-t border-gray-200 dark:border-gray-700">
      <!-- Description and meta -->
      <div v-if="milestone.description" class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 prose prose-sm dark:prose-invert max-w-none" v-html="milestone.description" />

      <!-- Sign-off section -->
      <div class="px-4 py-3 bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300">Sign-off Status</h4>
          <UiButton
            v-if="canSignOff"
            size="sm"
            @click.stop="showSignoffModal = true"
          >
            Sign Off
          </UiButton>
        </div>

        <!-- Sign-off list -->
        <div v-if="milestone.signoffStatus.signoffs.length > 0" class="space-y-2">
          <div
            v-for="signoff in milestone.signoffStatus.signoffs"
            :key="signoff.id"
            class="flex items-center justify-between text-sm"
          >
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span class="text-gray-700 dark:text-gray-300">{{ signoff.signedBy.name }}</span>
              <span class="text-gray-500 dark:text-gray-400">- {{ new Date(signoff.signedAt).toLocaleString() }}</span>
              <span v-if="signoff.notes" class="text-gray-500 dark:text-gray-400 italic">"{{ signoff.notes }}"</span>
            </div>
            <button
              v-if="isProjectOwner"
              class="text-red-600 hover:text-red-700 dark:text-red-400 text-xs"
              @click.stop="showRevokeConfirm = signoff.id"
            >
              Revoke
            </button>
          </div>
        </div>
        <p v-else class="text-sm text-gray-500 dark:text-gray-400">
          No sign-offs yet
        </p>
      </div>

      <!-- Tasks list -->
      <div v-if="milestone.tasks.length > 0" class="divide-y divide-gray-100 dark:divide-gray-700">
        <SpecificationTaskRow
          v-for="task in milestone.tasks"
          :key="task.id"
          :task="task"
          :depth="0"
        />
      </div>
      <div v-else class="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
        No tasks in this milestone
      </div>
    </div>

    <!-- Sign-off Modal -->
    <UiModal
      :open="showSignoffModal"
      title="Sign Off Milestone"
      @close="showSignoffModal = false"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          You are about to sign off on the milestone "{{ milestone.name }}".
          <span v-if="milestone.signoffStatus.totalApprovers > 1">
            {{ milestone.signoffStatus.totalApprovers - milestone.signoffStatus.signedCount - 1 }} more approver(s) need to sign off after you.
          </span>
          <span v-else>
            This will lock the milestone and prevent further changes to tasks.
          </span>
        </p>

        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes (optional)
          </label>
          <textarea
            v-model="signoffNotes"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Any comments about this sign-off..."
            @click.stop
          />
        </div>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton
            variant="secondary"
            @click="showSignoffModal = false"
          >
            Cancel
          </UiButton>
          <UiButton
            :loading="signingOff"
            @click="handleSignOff"
          >
            Confirm Sign-off
          </UiButton>
        </div>
      </div>
    </UiModal>

    <!-- Revoke Confirmation Modal -->
    <UiModal
      :open="!!showRevokeConfirm"
      title="Revoke Sign-off"
      @close="showRevokeConfirm = null"
    >
      <div class="space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to revoke this sign-off? This will unlock the milestone and allow changes to tasks again.
        </p>

        <div class="flex justify-end gap-3 pt-4">
          <UiButton
            variant="secondary"
            @click="showRevokeConfirm = null"
          >
            Cancel
          </UiButton>
          <UiButton
            variant="danger"
            @click="handleRevoke(showRevokeConfirm!)"
          >
            Revoke Sign-off
          </UiButton>
        </div>
      </div>
    </UiModal>
  </div>
</template>
