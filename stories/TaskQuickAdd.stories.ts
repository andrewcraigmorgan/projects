import type { Meta, StoryObj } from '@storybook/vue3';
import TaskQuickAdd from '~/components/tasks/TaskQuickAdd.vue';

const meta: Meta<typeof TaskQuickAdd> = {
  title: 'Tasks/TaskQuickAdd',
  component: TaskQuickAdd,
  tags: ['autodocs'],
  argTypes: {
    projectId: {
      control: 'text',
      description: 'Project ID to create task in',
    },
    parentTaskId: {
      control: 'text',
      description: 'Parent task ID for subtasks',
    },
    status: {
      control: 'select',
      options: ['todo', 'awaiting_approval', 'open', 'in_review', 'done'],
      description: 'Initial status for new task',
    },
    placeholder: {
      control: 'text',
      description: 'Input placeholder text',
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'A quick-add input for creating tasks. Type a task title and press Enter to create.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    projectId: 'project-123',
  },
  render: (args) => ({
    components: { TaskQuickAdd },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 max-w-lg">
        <TaskQuickAdd
          :project-id="args.projectId"
          :status="args.status"
          :placeholder="args.placeholder"
        />
        <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Note: This component requires API connection to create tasks.
        </p>
      </div>
    `,
  }),
};

export const ForSubtask: Story = {
  args: {
    projectId: 'project-123',
    parentTaskId: 'parent-task-456',
    placeholder: 'Add a subtask... (press Enter)',
  },
  render: (args) => ({
    components: { TaskQuickAdd },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 max-w-lg">
        <TaskQuickAdd
          :project-id="args.projectId"
          :parent-task-id="args.parentTaskId"
          :placeholder="args.placeholder"
        />
      </div>
    `,
  }),
};

export const WithCustomStatus: Story = {
  args: {
    projectId: 'project-123',
    status: 'open',
    placeholder: 'Add an open task...',
  },
  render: (args) => ({
    components: { TaskQuickAdd },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 max-w-lg">
        <TaskQuickAdd
          :project-id="args.projectId"
          :status="args.status"
          :placeholder="args.placeholder"
        />
      </div>
    `,
  }),
};

export const InContext: Story = {
  args: {
    projectId: 'project-123',
  },
  render: (args) => ({
    components: { TaskQuickAdd },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 max-w-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To Do</h3>
        <div class="space-y-2">
          <div class="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
            Existing task 1
          </div>
          <div class="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
            Existing task 2
          </div>
          <TaskQuickAdd
            :project-id="args.projectId"
          />
        </div>
      </div>
    `,
  }),
};
