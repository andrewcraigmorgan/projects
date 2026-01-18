<script setup lang="ts">
interface Props {
  open: boolean
  title?: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

function handleBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) {
    emit('close')
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 overflow-y-auto"
      >
        <div
          class="flex min-h-full items-center justify-center p-4 bg-black/50"
          @click="handleBackdropClick"
        >
          <Transition
            enter-active-class="duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="open"
              class="w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-xl transition-all"
            >
              <div v-if="title" class="border-b px-6 py-4">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ title }}
                </h3>
              </div>
              <div class="px-6 py-4">
                <slot />
              </div>
              <div v-if="$slots.footer" class="border-t px-6 py-4 bg-gray-50">
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
