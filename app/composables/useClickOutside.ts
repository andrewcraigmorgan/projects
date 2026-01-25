import { onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Composable to handle click-outside detection for dropdowns and modals.
 * Automatically attaches/detaches event listeners on mount/unmount.
 *
 * @param elementRefs - Single ref or array of refs to elements to check clicks against
 * @param callback - Function to call when a click occurs outside all referenced elements
 */
export function useClickOutside(
  elementRefs: Ref<HTMLElement | null> | Ref<HTMLElement | null>[],
  callback: () => void
) {
  const refs = Array.isArray(elementRefs) ? elementRefs : [elementRefs]

  function handleClickOutside(event: MouseEvent) {
    const target = event.target as Node

    const isClickInside = refs.some((ref) => {
      return ref.value && ref.value.contains(target)
    })

    if (!isClickInside) {
      callback()
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleClickOutside)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
  })
}
