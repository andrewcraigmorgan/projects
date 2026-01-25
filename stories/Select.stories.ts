import type { Meta, StoryObj } from '@storybook/vue3'
import { ref } from 'vue'
import Select from '~/components/ui/Select.vue'

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md'],
      description: 'Component size',
    },
    variant: {
      control: 'select',
      options: ['default', 'subtle', 'dark'],
      description: 'Visual style variant',
    },
    multiple: {
      control: 'boolean',
      description: 'Enable multi-select mode',
    },
    searchable: {
      control: 'select',
      options: [true, false, 'auto'],
      description: 'Search mode: true (always), false (never), auto (threshold-based)',
    },
    searchableThreshold: {
      control: 'number',
      description: 'Number of options before auto-searchable activates',
    },
    showDot: {
      control: 'boolean',
      description: 'Show colored dot indicator',
    },
    coloredBackground: {
      control: 'boolean',
      description: 'Apply color as full background (badge style)',
    },
    showSelectAll: {
      control: 'boolean',
      description: 'Show Select All/Clear buttons (multi-select only)',
    },
    showChips: {
      control: 'boolean',
      description: 'Show selected items as removable chips',
    },
    creatable: {
      control: 'boolean',
      description: 'Allow creating new options',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when no value selected',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Sample data
const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-400' },
  { value: 'review', label: 'In Review', color: 'bg-purple-400' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
]

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const countryOptions = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'cn', label: 'China' },
  { value: 'in', label: 'India' },
  { value: 'br', label: 'Brazil' },
]

const projectOptions = [
  { value: '1', label: 'Project Alpha' },
  { value: '2', label: 'Project Beta' },
  { value: '3', label: 'Project Gamma' },
  { value: '4', label: 'Website Redesign' },
  { value: '5', label: 'Mobile App' },
]

const tagOptions = [
  { value: '1', label: 'Bug', color: '#ef4444' },
  { value: '2', label: 'Feature', color: '#3b82f6' },
  { value: '3', label: 'Enhancement', color: '#8b5cf6' },
  { value: '4', label: 'Documentation', color: '#10b981' },
  { value: '5', label: 'Urgent', color: '#f97316' },
]

// ============================================
// SINGLE SELECT STORIES (replaces Dropdown)
// ============================================

export const Default: Story = {
  render: (args) => ({
    components: { Select },
    setup() {
      const value = ref('medium')
      return { args, value, priorityOptions }
    },
    template: '<Select v-bind="args" v-model="value" :options="priorityOptions" />',
  }),
  args: {
    placeholder: 'Select priority',
  },
}

export const WithColorDots: Story = {
  render: (args) => ({
    components: { Select },
    setup() {
      const value = ref('in_progress')
      return { args, value, statusOptions }
    },
    template: '<Select v-bind="args" v-model="value" :options="statusOptions" />',
  }),
  args: {
    showDot: true,
    placeholder: 'Select status',
  },
}

export const Searchable: Story = {
  render: (args) => ({
    components: { Select },
    setup() {
      const value = ref('')
      return { args, value, countryOptions }
    },
    template: `
      <div>
        <p class="text-sm text-gray-500 mb-2">This select has more than 5 options, so it automatically becomes searchable.</p>
        <Select v-bind="args" v-model="value" :options="countryOptions" />
      </div>
    `,
  }),
  args: {
    placeholder: 'Select country',
    searchPlaceholder: 'Search countries...',
  },
}

export const AlwaysSearchable: Story = {
  render: (args) => ({
    components: { Select },
    setup() {
      const value = ref('')
      return { args, value, priorityOptions }
    },
    template: `
      <div>
        <p class="text-sm text-gray-500 mb-2">Forced searchable mode even with few options.</p>
        <Select v-bind="args" v-model="value" :options="priorityOptions" />
      </div>
    `,
  }),
  args: {
    searchable: true,
    placeholder: 'Select priority',
  },
}

export const Sizes: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const small = ref('medium')
      const medium = ref('medium')
      return { small, medium, priorityOptions }
    },
    template: `
      <div class="flex items-center gap-4">
        <div>
          <p class="text-xs text-gray-500 mb-1">Small</p>
          <Select v-model="small" :options="priorityOptions" size="sm" />
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Medium</p>
          <Select v-model="medium" :options="priorityOptions" size="md" />
        </div>
      </div>
    `,
  }),
}

export const Variants: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const subtle = ref('todo')
      const defaultVar = ref('todo')
      const dark = ref('todo')
      return { subtle, defaultVar, dark, statusOptions }
    },
    template: `
      <div class="flex items-center gap-4">
        <div>
          <p class="text-xs text-gray-500 mb-1">Subtle (default)</p>
          <Select v-model="subtle" :options="statusOptions" variant="subtle" show-dot />
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Default</p>
          <Select v-model="defaultVar" :options="statusOptions" variant="default" show-dot />
        </div>
        <div class="bg-gray-900 p-2 rounded">
          <p class="text-xs text-gray-400 mb-1">Dark</p>
          <Select v-model="dark" :options="statusOptions" variant="dark" show-dot :searchable="true" />
        </div>
      </div>
    `,
  }),
}

export const ColoredBackground: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const value = ref('in_progress')
      return { value, statusOptions }
    },
    template: `
      <div>
        <p class="text-sm text-gray-500 mb-2">Badge-style colored background based on selected option.</p>
        <Select v-model="value" :options="statusOptions" colored-background />
      </div>
    `,
  }),
}

export const InTableContext: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const tasks = ref([
        { id: 1, title: 'Design homepage', status: 'in_progress', priority: 'high' },
        { id: 2, title: 'Write tests', status: 'todo', priority: 'medium' },
        { id: 3, title: 'Deploy to staging', status: 'review', priority: 'high' },
      ])
      return { tasks, statusOptions, priorityOptions }
    },
    template: `
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th class="px-4 py-2 text-left">Task</th>
            <th class="px-4 py-2 text-left">Status</th>
            <th class="px-4 py-2 text-left">Priority</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="task in tasks" :key="task.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
            <td class="px-4 py-2">{{ task.title }}</td>
            <td class="px-4 py-2">
              <Select v-model="task.status" :options="statusOptions" show-dot size="sm" />
            </td>
            <td class="px-4 py-2">
              <Select v-model="task.priority" :options="priorityOptions" size="sm" />
            </td>
          </tr>
        </tbody>
      </table>
    `,
  }),
}

// ============================================
// MULTI-SELECT STORIES (replaces FilterDropdown)
// ============================================

export const MultiSelect: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const selected = ref<string[]>([])
      return { selected, statusOptions }
    },
    template: `
      <div class="p-4">
        <Select
          v-model="selected"
          :options="statusOptions"
          multiple
          placeholder="All Statuses"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Selected: {{ selected }}</p>
      </div>
    `,
  }),
}

export const MultiSelectWithSelectAll: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const selected = ref<string[]>([])
      return { selected, statusOptions }
    },
    template: `
      <div class="p-4">
        <Select
          v-model="selected"
          :options="statusOptions"
          multiple
          show-select-all
          label="Status"
          placeholder="All Statuses"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Selected: {{ selected }}</p>
      </div>
    `,
  }),
}

export const MultiSelectWithPreselection: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const selected = ref(['todo', 'in_progress'])
      return { selected, statusOptions }
    },
    template: `
      <div class="p-4">
        <Select
          v-model="selected"
          :options="statusOptions"
          multiple
          show-select-all
          label="Status"
          placeholder="All Statuses"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Selected: {{ selected }}</p>
      </div>
    `,
  }),
}

export const MultipleFilters: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const selectedStatus = ref<string[]>([])
      const selectedPriority = ref<string[]>([])
      const priorityWithColors = [
        { value: 'low', label: 'Low', color: 'bg-gray-400' },
        { value: 'medium', label: 'Medium', color: 'bg-blue-400' },
        { value: 'high', label: 'High', color: 'bg-orange-400' },
      ]
      return { selectedStatus, selectedPriority, statusOptions, priorityWithColors }
    },
    template: `
      <div class="p-4 flex gap-2">
        <Select
          v-model="selectedStatus"
          :options="statusOptions"
          multiple
          show-select-all
          label="Status"
          placeholder="Status"
        />
        <Select
          v-model="selectedPriority"
          :options="priorityWithColors"
          multiple
          show-select-all
          label="Priority"
          placeholder="Priority"
        />
      </div>
    `,
  }),
}

// ============================================
// DARK VARIANT (replaces SearchSelect)
// ============================================

export const DarkVariant: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const selected = ref<string | undefined>(undefined)
      return { selected, projectOptions }
    },
    template: `
      <div class="p-4 w-64 bg-gray-900 rounded">
        <Select
          v-model="selected"
          :options="projectOptions"
          variant="dark"
          :searchable="true"
          placeholder="Select project..."
          search-placeholder="Search projects..."
        />
        <p class="mt-4 text-sm text-gray-400">Selected: {{ selected || 'none' }}</p>
      </div>
    `,
  }),
}

export const DarkWithPreselection: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const selected = ref('2')
      return { selected, projectOptions }
    },
    template: `
      <div class="p-4 w-64 bg-gray-900 rounded">
        <Select
          v-model="selected"
          :options="projectOptions"
          variant="dark"
          :searchable="true"
          placeholder="Select project..."
        />
        <p class="mt-4 text-sm text-gray-400">Selected: {{ selected }}</p>
      </div>
    `,
  }),
}

// ============================================
// CHIPS MODE (replaces TagSelector)
// ============================================

export const ChipsMode: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const selected = ref<string[]>([])
      return { selected, tagOptions }
    },
    template: `
      <div class="p-4 w-80">
        <Select
          v-model="selected"
          :options="tagOptions"
          multiple
          show-chips
          placeholder="Select tags..."
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Selected: {{ selected.join(', ') || 'none' }}
        </p>
      </div>
    `,
  }),
}

export const ChipsWithPreselection: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const selected = ref(['1', '3'])
      return { selected, tagOptions }
    },
    template: `
      <div class="p-4 w-80">
        <Select
          v-model="selected"
          :options="tagOptions"
          multiple
          show-chips
          placeholder="Select tags..."
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Selected: {{ selected.join(', ') }}
        </p>
      </div>
    `,
  }),
}

export const ChipsWithCreate: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const selected = ref<string[]>([])
      const tags = ref([...tagOptions])

      function handleCreate(name: string) {
        const newTag = {
          value: `new-${Date.now()}`,
          label: name,
          color: '#6b7280',
        }
        tags.value.push(newTag)
        selected.value.push(newTag.value)
      }

      return { selected, tags, handleCreate }
    },
    template: `
      <div class="p-4 w-80">
        <Select
          v-model="selected"
          :options="tags"
          multiple
          show-chips
          creatable
          create-label="Create"
          placeholder="Select tags..."
          @create="handleCreate"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Selected: {{ selected.join(', ') || 'none' }}
        </p>
        <p class="mt-2 text-xs text-gray-500">Type a new tag name and click "Create" to add it</p>
      </div>
    `,
  }),
}

export const ManyChips: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const selected = ref<string[]>([])
      const manyTags = [
        ...tagOptions,
        { value: '6', label: 'Backend', color: '#0891b2' },
        { value: '7', label: 'Frontend', color: '#db2777' },
        { value: '8', label: 'Design', color: '#7c3aed' },
        { value: '9', label: 'Testing', color: '#059669' },
        { value: '10', label: 'DevOps', color: '#d97706' },
      ]
      return { selected, manyTags }
    },
    template: `
      <div class="p-4 w-80">
        <Select
          v-model="selected"
          :options="manyTags"
          multiple
          show-chips
          placeholder="Select tags..."
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Selected: {{ selected.join(', ') || 'none' }}
        </p>
      </div>
    `,
  }),
}

// ============================================
// COMBINED FEATURES
// ============================================

export const AllFeaturesCombined: Story = {
  render: () => ({
    components: { Select },
    setup() {
      const singleValue = ref('in_progress')
      const multiValue = ref<string[]>(['todo'])
      const darkValue = ref('1')
      const chipsValue = ref<string[]>(['1', '2'])

      return {
        singleValue,
        multiValue,
        darkValue,
        chipsValue,
        statusOptions,
        projectOptions,
        tagOptions,
      }
    },
    template: `
      <div class="space-y-8 p-4">
        <div>
          <h3 class="text-sm font-medium mb-2">Single Select with Dots</h3>
          <Select v-model="singleValue" :options="statusOptions" show-dot />
        </div>

        <div>
          <h3 class="text-sm font-medium mb-2">Multi-Select with Select All</h3>
          <Select
            v-model="multiValue"
            :options="statusOptions"
            multiple
            show-select-all
            label="Status"
            placeholder="Filter by status"
          />
        </div>

        <div class="bg-gray-900 p-4 rounded">
          <h3 class="text-sm font-medium mb-2 text-white">Dark Variant Searchable</h3>
          <Select
            v-model="darkValue"
            :options="projectOptions"
            variant="dark"
            :searchable="true"
            placeholder="Select project..."
          />
        </div>

        <div>
          <h3 class="text-sm font-medium mb-2">Chips Mode with Create</h3>
          <Select
            v-model="chipsValue"
            :options="tagOptions"
            multiple
            show-chips
            creatable
            placeholder="Select tags..."
          />
        </div>
      </div>
    `,
  }),
}
