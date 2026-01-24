<script setup lang="ts">
import { useApi } from '~/composables/useApi'

interface Props {
  open: boolean
  projectId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'invited'): void
}>()

const { fetchApi } = useApi()

// Invite form
const email = ref('')
const role = ref<'team' | 'client'>('client')
const sending = ref(false)
const error = ref('')
const success = ref('')

// Pending invitations
const invitations = ref<Array<{
  id: string
  email: string
  role: string
  invitedBy: { name: string }
  expiresAt: string
  createdAt: string
}>>([])
const loadingInvitations = ref(false)

async function loadInvitations() {
  loadingInvitations.value = true
  try {
    const response = await fetchApi<{
      success: boolean
      data: { invitations: typeof invitations.value }
    }>(`/api/projects/${props.projectId}/invitations`)

    if (response.success) {
      invitations.value = response.data.invitations
    }
  } catch {
    // Silently fail
  } finally {
    loadingInvitations.value = false
  }
}

async function sendInvitation() {
  error.value = ''
  success.value = ''
  sending.value = true

  try {
    const response = await fetchApi<{ success: boolean; data: any }>(`/api/projects/${props.projectId}/invitations`, {
      method: 'POST',
      body: { email: email.value, role: role.value },
    })

    if (response.success) {
      success.value = `Invitation sent to ${email.value}`
      email.value = ''
      role.value = 'client'
      await loadInvitations()
      emit('invited')
    }
  } catch (e: any) {
    error.value = e.data?.message || 'Failed to send invitation'
  } finally {
    sending.value = false
  }
}

async function cancelInvitation(inviteId: string) {
  try {
    await fetchApi(`/api/projects/${props.projectId}/invitations/${inviteId}`, {
      method: 'DELETE',
    })
    await loadInvitations()
  } catch {
    // Silently fail
  }
}

// Load invitations when modal opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    loadInvitations()
    error.value = ''
    success.value = ''
  }
})
</script>

<template>
  <UiModal :open="open" title="Invite Members" size="lg" @close="emit('close')">
    <!-- Invite form -->
    <form @submit.prevent="sendInvitation" class="space-y-4">
      <div
        v-if="error"
        class="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 text-sm"
      >
        {{ error }}
      </div>

      <div
        v-if="success"
        class="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 text-sm"
      >
        {{ success }}
      </div>

      <div class="flex gap-3">
        <div class="flex-1">
          <UiInput
            v-model="email"
            type="email"
            label="Email address"
            placeholder="colleague@example.com"
            required
          />
        </div>
        <div class="w-32">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <select
            v-model="role"
            class="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm focus:ring-1 focus:ring-primary-500 focus:border-primary-500 focus:outline-none dark:[color-scheme:dark]"
          >
            <option value="client">Client</option>
            <option value="team">Team</option>
          </select>
        </div>
      </div>

      <UiButton type="submit" :loading="sending" size="sm">
        Send Invitation
      </UiButton>
    </form>

    <!-- Pending invitations -->
    <div class="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
      <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Pending Invitations</h4>

      <div v-if="loadingInvitations" class="text-sm text-gray-500 dark:text-gray-400">
        Loading...
      </div>

      <div v-else-if="invitations.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
        No pending invitations
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="inv in invitations"
          :key="inv.id"
          class="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700"
        >
          <div class="flex items-center gap-3 min-w-0">
            <span class="text-sm text-gray-900 dark:text-gray-100 truncate">{{ inv.email }}</span>
            <span
              class="text-xs font-medium px-1.5 py-0.5 flex-shrink-0"
              :class="inv.role === 'client'
                ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'"
            >
              {{ inv.role === 'client' ? 'Client' : 'Team' }}
            </span>
          </div>
          <button
            class="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex-shrink-0 ml-3"
            @click="cancelInvitation(inv.id)"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </UiModal>
</template>
