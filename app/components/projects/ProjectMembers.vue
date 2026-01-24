<script setup lang="ts">
import { useApi } from '~/composables/useApi'
import { useAuthStore } from '~/stores/auth'

interface Member {
  user: { _id: string; name: string; email: string; avatar?: string }
  role: 'team' | 'client'
  addedAt: string
}

interface Props {
  projectId: string
  ownerId?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'members-changed'): void
}>()

const { fetchApi } = useApi()
const authStore = useAuthStore()

const members = ref<Member[]>([])
const owner = ref<{ _id: string; name: string; email: string; avatar?: string } | null>(null)
const loading = ref(true)
const showInviteModal = ref(false)

async function loadMembers() {
  loading.value = true
  try {
    const response = await fetchApi<{
      success: boolean
      data: {
        owner: typeof owner.value
        members: Member[]
      }
    }>(`/api/projects/${props.projectId}/members`)

    if (response.success) {
      owner.value = response.data.owner
      members.value = response.data.members
    }
  } catch {
    // Silently fail
  } finally {
    loading.value = false
  }
}

async function changeRole(userId: string, newRole: 'team' | 'client') {
  try {
    await fetchApi(`/api/projects/${props.projectId}/members/${userId}`, {
      method: 'PATCH',
      body: { role: newRole },
    })
    await loadMembers()
    emit('members-changed')
  } catch {
    // Silently fail
  }
}

async function removeMember(userId: string, name: string) {
  if (!confirm(`Remove ${name} from this project?`)) return

  try {
    await fetchApi(`/api/projects/${props.projectId}/members/${userId}`, {
      method: 'DELETE',
    })
    await loadMembers()
    emit('members-changed')
  } catch {
    // Silently fail
  }
}

// Group members by role
const teamMembers = computed(() =>
  members.value.filter((m) => m.role === 'team')
)
const clientMembers = computed(() =>
  members.value.filter((m) => m.role === 'client')
)

const isOwner = computed(() =>
  owner.value?._id === authStore.user?.id
)

onMounted(loadMembers)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Members</h3>
      <UiButton size="sm" @click="showInviteModal = true">
        Invite
      </UiButton>
    </div>

    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400">
      Loading members...
    </div>

    <div v-else class="space-y-6">
      <!-- Owner -->
      <div v-if="owner">
        <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Owner</h4>
        <div class="flex items-center gap-3 py-2">
          <UiAvatar :name="owner.name" :avatar="owner.avatar" size="sm" role="team" />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ owner.name }}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ owner.email }}</p>
          </div>
          <span class="text-xs font-medium px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
            Owner
          </span>
        </div>
      </div>

      <!-- Team Members -->
      <div v-if="teamMembers.length > 0">
        <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Team <span class="text-gray-400 dark:text-gray-500">({{ teamMembers.length }})</span>
        </h4>
        <div class="space-y-1">
          <div
            v-for="member in teamMembers"
            :key="member.user._id"
            class="flex items-center gap-3 py-2 group"
          >
            <UiAvatar :name="member.user.name" :avatar="member.user.avatar" size="sm" role="team" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ member.user.name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ member.user.email }}</p>
            </div>
            <span class="text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
              Team
            </span>
            <!-- Actions (visible on hover) -->
            <div class="hidden group-hover:flex items-center gap-1">
              <button
                class="text-xs text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400"
                title="Change to Client"
                @click="changeRole(member.user._id, 'client')"
              >
                To Client
              </button>
              <button
                v-if="member.user._id !== authStore.user?.id"
                class="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 ml-2"
                title="Remove member"
                @click="removeMember(member.user._id, member.user.name)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Client Members -->
      <div v-if="clientMembers.length > 0">
        <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
          Clients <span class="text-gray-400 dark:text-gray-500">({{ clientMembers.length }})</span>
        </h4>
        <div class="space-y-1">
          <div
            v-for="member in clientMembers"
            :key="member.user._id"
            class="flex items-center gap-3 py-2 group"
          >
            <UiAvatar :name="member.user.name" :avatar="member.user.avatar" size="sm" role="client" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ member.user.name }}</p>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ member.user.email }}</p>
            </div>
            <span class="text-xs font-medium px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              Client
            </span>
            <!-- Actions (visible on hover) -->
            <div class="hidden group-hover:flex items-center gap-1">
              <button
                class="text-xs text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                title="Change to Team"
                @click="changeRole(member.user._id, 'team')"
              >
                To Team
              </button>
              <button
                class="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 ml-2"
                title="Remove member"
                @click="removeMember(member.user._id, member.user.name)"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="teamMembers.length === 0 && clientMembers.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
        No members yet. Invite someone to get started.
      </div>
    </div>

    <!-- Invite modal -->
    <ProjectsInviteMemberModal
      :open="showInviteModal"
      :project-id="projectId"
      @close="showInviteModal = false"
      @invited="loadMembers(); emit('members-changed')"
    />
  </div>
</template>
