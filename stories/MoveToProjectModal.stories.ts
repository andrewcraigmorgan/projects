import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import MoveToProjectModal from '~/components/tasks/MoveToProjectModal.vue';
import Button from '~/components/ui/Button.vue';

const meta: Meta<typeof MoveToProjectModal> = {
  title: 'Tasks/MoveToProjectModal',
  component: MoveToProjectModal,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    task: {
      control: 'object',
      description: 'Task to move',
    },
    currentProjectId: {
      control: 'text',
      description: 'Current project ID (will be excluded from options)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTask = {
  id: 'task-1',
  title: 'Implement user authentication flow',
  status: 'in_progress' as const,
  priority: 'high' as const,
  taskNumber: 42,
  subtaskCount: 3,
  order: 0,
  milestone: { id: 'ms-1', name: 'Phase 1' },
  tags: [
    { id: 'tag-1', name: 'Backend', color: '#3b82f6' },
  ],
};

const simpleTask = {
  id: 'task-2',
  title: 'Fix button styling',
  status: 'todo' as const,
  priority: 'low' as const,
  taskNumber: 43,
  subtaskCount: 0,
  order: 0,
};

export const Default: Story = {
  render: () => ({
    components: { MoveToProjectModal, Button },
    setup() {
      const isOpen = ref(false);
      return { isOpen, sampleTask };
    },
    template: `
      <div class="p-4">
        <Button @click="isOpen = true">Move Task</Button>
        <MoveToProjectModal
          :open="isOpen"
          :task="sampleTask"
          current-project-id="project-123"
          @close="isOpen = false"
        />
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Note: Loading projects requires API connection.
        </p>
      </div>
    `,
  }),
};

export const WithWarnings: Story = {
  render: () => ({
    components: { MoveToProjectModal, Button },
    setup() {
      const isOpen = ref(true);
      return { isOpen, sampleTask };
    },
    template: `
      <div class="p-4">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This task has a milestone and tags that will be cleared when moved.
        </p>
        <MoveToProjectModal
          :open="isOpen"
          :task="sampleTask"
          current-project-id="project-123"
          @close="isOpen = false"
        />
      </div>
    `,
  }),
};

export const SimpleTask: Story = {
  render: () => ({
    components: { MoveToProjectModal, Button },
    setup() {
      const isOpen = ref(false);
      return { isOpen, simpleTask };
    },
    template: `
      <div class="p-4">
        <Button @click="isOpen = true">Move Simple Task</Button>
        <MoveToProjectModal
          :open="isOpen"
          :task="simpleTask"
          current-project-id="project-123"
          @close="isOpen = false"
        />
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          This task has no milestone or tags, so no warnings will be shown.
        </p>
      </div>
    `,
  }),
};

export const OpenByDefault: Story = {
  args: {
    open: true,
    task: sampleTask,
    currentProjectId: 'project-123',
  },
};
