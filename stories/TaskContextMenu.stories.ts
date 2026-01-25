import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import TaskContextMenu from '~/components/tasks/TaskContextMenu.vue';

const meta: Meta<typeof TaskContextMenu> = {
  title: 'Tasks/TaskContextMenu',
  component: TaskContextMenu,
  tags: ['autodocs'],
  argTypes: {
    task: {
      control: 'object',
      description: 'Task object for the context menu',
    },
    x: {
      control: 'number',
      description: 'X position of the menu',
    },
    y: {
      control: 'number',
      description: 'Y position of the menu',
    },
    visible: {
      control: 'boolean',
      description: 'Whether the menu is visible',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTask = {
  id: 'task-1',
  title: 'Implement user authentication',
  status: 'in_progress' as const,
  priority: 'high' as const,
  taskNumber: 42,
  subtaskCount: 3,
  order: 0,
};

export const Default: Story = {
  render: () => ({
    components: { TaskContextMenu },
    setup() {
      const visible = ref(true);
      return { visible, sampleTask };
    },
    template: `
      <div class="p-4 h-64">
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Context menu positioned at (100, 100):</p>
        <TaskContextMenu
          :task="sampleTask"
          :x="100"
          :y="100"
          :visible="visible"
          @close="visible = false"
        />
      </div>
    `,
  }),
};

export const Interactive: Story = {
  render: () => ({
    components: { TaskContextMenu },
    setup() {
      const visible = ref(false);
      const x = ref(0);
      const y = ref(0);

      function handleContextMenu(event: MouseEvent) {
        event.preventDefault();
        x.value = event.clientX;
        y.value = event.clientY;
        visible.value = true;
      }

      return { visible, x, y, sampleTask, handleContextMenu };
    },
    template: `
      <div
        class="p-4 h-64 bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600"
        @contextmenu="handleContextMenu"
      >
        <p class="text-sm text-gray-600 dark:text-gray-400">Right-click anywhere in this area to open the context menu</p>
        <TaskContextMenu
          :task="sampleTask"
          :x="x"
          :y="y"
          :visible="visible"
          @close="visible = false"
        />
      </div>
    `,
  }),
};

export const Hidden: Story = {
  args: {
    task: sampleTask,
    x: 100,
    y: 100,
    visible: false,
  },
  render: (args) => ({
    components: { TaskContextMenu },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 h-64">
        <p class="text-sm text-gray-600 dark:text-gray-400">Context menu is hidden (visible: false)</p>
        <TaskContextMenu v-bind="args" />
      </div>
    `,
  }),
};
