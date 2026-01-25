import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import TagSelector from '~/components/ui/TagSelector.vue';

const meta: Meta<typeof TagSelector> = {
  title: 'UI/TagSelector',
  component: TagSelector,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'object',
      description: 'Selected tags',
    },
    availableTags: {
      control: 'object',
      description: 'All available tags to select from',
    },
    canCreateTags: {
      control: 'boolean',
      description: 'Allow creating new tags',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTags = [
  { id: '1', name: 'Bug', color: '#ef4444' },
  { id: '2', name: 'Feature', color: '#3b82f6' },
  { id: '3', name: 'Enhancement', color: '#8b5cf6' },
  { id: '4', name: 'Documentation', color: '#10b981' },
  { id: '5', name: 'Urgent', color: '#f97316' },
];

export const Default: Story = {
  render: () => ({
    components: { TagSelector },
    setup() {
      const selected = ref<typeof sampleTags>([]);
      return { selected, sampleTags };
    },
    template: `
      <div class="p-4 w-80">
        <TagSelector
          v-model="selected"
          :available-tags="sampleTags"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Selected: {{ selected.map(t => t.name).join(', ') || 'none' }}
        </p>
      </div>
    `,
  }),
};

export const WithPreselection: Story = {
  render: () => ({
    components: { TagSelector },
    setup() {
      const selected = ref([sampleTags[0], sampleTags[2]]);
      return { selected, sampleTags };
    },
    template: `
      <div class="p-4 w-80">
        <TagSelector
          v-model="selected"
          :available-tags="sampleTags"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Selected: {{ selected.map(t => t.name).join(', ') }}
        </p>
      </div>
    `,
  }),
};

export const WithCreateOption: Story = {
  render: () => ({
    components: { TagSelector },
    setup() {
      const selected = ref<typeof sampleTags>([]);
      const tags = ref([...sampleTags]);

      function handleCreateTag(name: string) {
        const newTag = {
          id: `new-${Date.now()}`,
          name,
          color: '#6b7280',
        };
        tags.value.push(newTag);
        selected.value.push(newTag);
      }

      return { selected, tags, handleCreateTag };
    },
    template: `
      <div class="p-4 w-80">
        <TagSelector
          v-model="selected"
          :available-tags="tags"
          :can-create-tags="true"
          @create-tag="handleCreateTag"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Selected: {{ selected.map(t => t.name).join(', ') || 'none' }}
        </p>
        <p class="mt-2 text-xs text-gray-500">Type a new tag name and click "Create" to add it</p>
      </div>
    `,
  }),
};

export const ManyTags: Story = {
  render: () => ({
    components: { TagSelector },
    setup() {
      const selected = ref<typeof sampleTags>([]);
      const manyTags = [
        ...sampleTags,
        { id: '6', name: 'Backend', color: '#0891b2' },
        { id: '7', name: 'Frontend', color: '#db2777' },
        { id: '8', name: 'Design', color: '#7c3aed' },
        { id: '9', name: 'Testing', color: '#059669' },
        { id: '10', name: 'DevOps', color: '#d97706' },
      ];
      return { selected, manyTags };
    },
    template: `
      <div class="p-4 w-80">
        <TagSelector
          v-model="selected"
          :available-tags="manyTags"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Selected: {{ selected.map(t => t.name).join(', ') || 'none' }}
        </p>
      </div>
    `,
  }),
};
