<script setup lang="ts">
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useApi } from '~/composables/useApi'
import { useOrganizationStore } from '~/stores/organization'

interface Props {
  modelValue: string
  placeholder?: string
  editable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Write something...',
  editable: true,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const { fetchApi } = useApi()
const orgStore = useOrganizationStore()

// Track if we're currently processing to avoid loops
const isProcessing = ref(false)

// Convert file to base64
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Upload image to our server and return the URL
async function uploadImage(base64Data: string, filename: string, mimeType: string): Promise<string | null> {
  const organizationId = orgStore.currentOrganization?.id
  if (!organizationId) {
    console.warn('No organization selected, cannot upload image')
    return null
  }

  try {
    const response = await fetchApi<{
      success: boolean
      data: { attachment: { url: string } }
    }>('/api/attachments', {
      method: 'POST',
      body: {
        organizationId,
        filename,
        mimeType,
        data: base64Data,
      },
    })

    if (response.success) {
      return response.data.attachment.url
    }
    return null
  } catch (error) {
    console.error('Failed to upload image:', error)
    return null
  }
}

// Process and upload a file
async function processAndUploadFile(file: File | Blob): Promise<string | null> {
  const base64 = await fileToBase64(file)
  const mimeType = file.type || 'image/png'
  const filename = file instanceof File ? file.name : `image-${Date.now()}.png`
  return await uploadImage(base64, filename, mimeType)
}

// Remove external images that can't be loaded (replace with placeholder text)
function removeExternalImages(html: string): string {
  // Replace external image tags with a placeholder
  return html.replace(
    /<img[^>]+src="(?!data:|\/api\/attachments\/)[^"]*"[^>]*>/gi,
    '<em>[Image could not be loaded - please copy the image directly or upload it]</em>'
  )
}

const editor = useEditor({
  content: props.modelValue,
  editable: props.editable,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Image.configure({
      inline: true,
      allowBase64: true,
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-primary-600 dark:text-primary-400 underline',
      },
    }),
    Placeholder.configure({
      placeholder: props.placeholder,
    }),
  ],
  editorProps: {
    handlePaste: (view, event) => {
      const clipboardData = event.clipboardData
      if (!clipboardData) return false

      // First priority: Check for image files in clipboard (direct image copy)
      const items = clipboardData.items
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) {
            // Upload the image
            processAndUploadFile(file).then((url) => {
              if (url) {
                editor.value?.chain().focus().setImage({ src: url }).run()
              } else {
                // Fallback to base64 if upload fails
                fileToBase64(file).then((base64) => {
                  editor.value?.chain().focus().setImage({ src: base64 }).run()
                })
              }
            })
          }
          return true
        }
      }

      // Second priority: Check for HTML with images
      const html = clipboardData.getData('text/html')
      if (html && /<img[^>]+src=/i.test(html)) {
        // Let the paste happen, then clean up external images
        setTimeout(() => {
          if (!editor.value || isProcessing.value) return
          isProcessing.value = true

          const currentHtml = editor.value.getHTML()

          // Check for external images (not our API URLs and not base64)
          const hasExternalImages = /<img[^>]+src="(?!data:|\/api\/attachments\/)[^"]+"/i.test(currentHtml)

          if (hasExternalImages) {
            // Remove external images and show placeholder
            const cleanHtml = removeExternalImages(currentHtml)
            editor.value.commands.setContent(cleanHtml, false)
            emit('update:modelValue', cleanHtml)
          }

          isProcessing.value = false
        }, 100)

        return false // Let default paste happen first
      }

      // Let default paste happen
      return false
    },
    handleDrop: (view, event, slice, moved) => {
      if (moved) return false

      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return false

      // Check for image files
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          event.preventDefault()
          processAndUploadFile(file).then((url) => {
            if (url) {
              editor.value?.chain().focus().setImage({ src: url }).run()
            }
          })
          return true
        }
      }

      return false
    },
  },
  onUpdate: ({ editor }) => {
    if (!isProcessing.value) {
      emit('update:modelValue', editor.getHTML())
    }
  },
})

// Watch for external changes
watch(() => props.modelValue, (value) => {
  if (editor.value && editor.value.getHTML() !== value) {
    editor.value.commands.setContent(value, false)
  }
})

watch(() => props.editable, (value) => {
  editor.value?.setEditable(value)
})

// Toolbar actions
function toggleBold() {
  editor.value?.chain().focus().toggleBold().run()
}

function toggleItalic() {
  editor.value?.chain().focus().toggleItalic().run()
}

function toggleStrike() {
  editor.value?.chain().focus().toggleStrike().run()
}

function toggleCode() {
  editor.value?.chain().focus().toggleCode().run()
}

function toggleHeading(level: 1 | 2 | 3) {
  editor.value?.chain().focus().toggleHeading({ level }).run()
}

function toggleBulletList() {
  editor.value?.chain().focus().toggleBulletList().run()
}

function toggleOrderedList() {
  editor.value?.chain().focus().toggleOrderedList().run()
}

function toggleBlockquote() {
  editor.value?.chain().focus().toggleBlockquote().run()
}

function toggleCodeBlock() {
  editor.value?.chain().focus().toggleCodeBlock().run()
}

function setLink() {
  const url = window.prompt('Enter URL')
  if (url) {
    editor.value?.chain().focus().setLink({ href: url }).run()
  }
}

function unsetLink() {
  editor.value?.chain().focus().unsetLink().run()
}

// Image handling
const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)

function triggerImageUpload() {
  fileInput.value?.click()
}

async function handleImageUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploading.value = true
  try {
    const url = await processAndUploadFile(file)
    if (url) {
      editor.value?.chain().focus().setImage({ src: url }).run()
    } else {
      // Fallback to base64
      const base64 = await fileToBase64(file)
      editor.value?.chain().focus().setImage({ src: base64 }).run()
    }
  } finally {
    uploading.value = false
    target.value = ''
  }
}

function addImageByUrl() {
  const url = window.prompt('Enter image URL')
  if (url) {
    editor.value?.chain().focus().setImage({ src: url }).run()
  }
}

onBeforeUnmount(() => {
  editor.value?.destroy()
})
</script>

<template>
  <div class="rich-text-editor border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">
    <!-- Toolbar -->
    <div
      v-if="editable"
      class="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
    >
      <!-- Text formatting -->
      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('bold') }"
        title="Bold"
        @click="toggleBold"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z" />
        </svg>
      </button>

      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('italic') }"
        title="Italic"
        @click="toggleItalic"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 4h4m-2 0v16m4-16h-4m0 16h4" transform="skewX(-15)" />
        </svg>
      </button>

      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('strike') }"
        title="Strikethrough"
        @click="toggleStrike"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12h16M9 4v4m6-4v4M9 16v4m6-4v4" />
        </svg>
      </button>

      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-mono text-sm"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('code') }"
        title="Inline Code"
        @click="toggleCode"
      >
        &lt;/&gt;
      </button>

      <div class="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

      <!-- Headings -->
      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-bold"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('heading', { level: 1 }) }"
        title="Heading 1"
        @click="toggleHeading(1)"
      >
        H1
      </button>

      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-bold"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('heading', { level: 2 }) }"
        title="Heading 2"
        @click="toggleHeading(2)"
      >
        H2
      </button>

      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-bold"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('heading', { level: 3 }) }"
        title="Heading 3"
        @click="toggleHeading(3)"
      >
        H3
      </button>

      <div class="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

      <!-- Lists -->
      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('bulletList') }"
        title="Bullet List"
        @click="toggleBulletList"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('orderedList') }"
        title="Numbered List"
        @click="toggleOrderedList"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 6h13M7 12h13M7 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      </button>

      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('blockquote') }"
        title="Quote"
        @click="toggleBlockquote"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
        </svg>
      </button>

      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('codeBlock') }"
        title="Code Block"
        @click="toggleCodeBlock"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
      </button>

      <div class="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />

      <!-- Link -->
      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'bg-gray-200 dark:bg-gray-700': editor?.isActive('link') }"
        title="Add Link"
        @click="editor?.isActive('link') ? unsetLink() : setLink()"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </button>

      <!-- Image -->
      <button
        type="button"
        class="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        :class="{ 'opacity-50': uploading }"
        :disabled="uploading"
        title="Upload Image"
        @click="triggerImageUpload"
      >
        <svg v-if="!uploading" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </button>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleImageUpload"
      />

      <!-- Paste tip -->
      <div class="ml-auto text-xs text-gray-400 dark:text-gray-500">
        Tip: Copy images directly (right-click → Copy Image)
      </div>
    </div>

    <!-- Editor Content -->
    <EditorContent
      :editor="editor"
      class="prose dark:prose-invert max-w-none p-4 min-h-[200px] focus:outline-none"
    />
  </div>
</template>

<style>
.rich-text-editor .ProseMirror {
  outline: none;
  min-height: 200px;
}

.rich-text-editor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: #9ca3af;
  pointer-events: none;
  height: 0;
}

.rich-text-editor .ProseMirror img {
  max-width: 100%;
  height: auto;
  margin: 1rem 0;
}

.rich-text-editor .ProseMirror pre {
  background: #1f2937;
  color: #e5e7eb;
  padding: 1rem;
  border-radius: 0.25rem;
  overflow-x: auto;
}

.rich-text-editor .ProseMirror code {
  background: #374151;
  color: #fbbf24;
  padding: 0.125rem 0.25rem;
  border-radius: 0.125rem;
}

.rich-text-editor .ProseMirror pre code {
  background: none;
  color: inherit;
  padding: 0;
}

.rich-text-editor .ProseMirror blockquote {
  border-left: 4px solid #6366f1;
  padding-left: 1rem;
  margin-left: 0;
  font-style: italic;
  color: #6b7280;
}

.rich-text-editor .ProseMirror h1 {
  font-size: 1.875rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.rich-text-editor .ProseMirror h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.rich-text-editor .ProseMirror h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.rich-text-editor .ProseMirror ul,
.rich-text-editor .ProseMirror ol {
  padding-left: 1.5rem;
}

.rich-text-editor .ProseMirror ul {
  list-style-type: disc;
}

.rich-text-editor .ProseMirror ol {
  list-style-type: decimal;
}
</style>
