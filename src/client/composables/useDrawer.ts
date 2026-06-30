import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

export function useDrawer() {
  const isOpen = ref(false)

  function open() { isOpen.value = true }
  function close() { isOpen.value = false }
  function toggle() { isOpen.value = !isOpen.value }

  let router: ReturnType<typeof useRouter> | null = null
  try { router = useRouter() } catch { /* no router in SSR */ }

  let unregister: (() => void) | undefined

  onMounted(() => {
    if (router) {
      unregister = router.afterEach(() => close())
    }
  })

  onUnmounted(() => {
    unregister?.()
  })

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && isOpen.value) close()
  }

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onUnmounted(() => document.removeEventListener('keydown', onKeydown))

  return { isOpen, open, close, toggle }
}
