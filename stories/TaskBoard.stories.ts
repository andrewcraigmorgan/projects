import type { Meta, StoryObj } from '@storybook/vue3';
import TaskBoard from '~/components/tasks/TaskBoard.vue';

const meta: Meta<typeof TaskBoard> = {
  title: 'Tasks/TaskBoard',
  component: TaskBoard,
  tags: ['autodocs'],
  argTypes: {
    tasks: {
      control: 'object',
      description: 'Array of tasks to display on the board',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading state',
    },
    projectId: {
      control: 'text',
      description: 'Project ID for quick-add functionality',
    },
    projectCode: {
      control: 'text',
      description: 'Project code prefix for task IDs',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTasks = [
  { id: '1', title: 'Design homepage mockup', status: 'todo', priority: 'high', taskNumber: 1, subtaskCount: 0, order: 0 },
  { id: '2', title: 'Set up project structure', status: 'todo', priority: 'medium', taskNumber: 2, subtaskCount: 3, order: 1 },
  { id: '3', title: 'Review requirements', status: 'awaiting_approval', priority: 'high', taskNumber: 3, subtaskCount: 0, order: 0 },
  { id: '4', title: 'Implement authentication', status: 'open', priority: 'high', taskNumber: 4, subtaskCount: 2, order: 0, assignees: [{ _id: 'u1', name: 'John Doe', email: 'john@example.com' }] },
  { id: '5', title: 'Write API documentation', status: 'open', priority: 'medium', taskNumber: 5, subtaskCount: 0, order: 1 },
  { id: '6', title: 'Database schema design', status: 'in_review', priority: 'high', taskNumber: 6, subtaskCount: 0, order: 0, assignees: [{ _id: 'u1', name: 'John Doe', email: 'john@example.com' }, { _id: 'u2', name: 'Jane Smith', email: 'jane@example.com' }] },
  { id: '7', title: 'Initial setup', status: 'done', priority: 'low', taskNumber: 7, subtaskCount: 0, order: 0 },
  { id: '8', title: 'Create repository', status: 'done', priority: 'medium', taskNumber: 8, subtaskCount: 0, order: 1 },
];

export const Default: Story = {
  args: {
    tasks: sampleTasks,
    projectCode: 'PRJ',
  },
  render: (args) => ({
    components: { TaskBoard },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 h-[600px]">
        <TaskBoard v-bind="args" />
      </div>
    `,
  }),
};

export const Loading: Story = {
  args: {
    tasks: [],
    loading: true,
    projectCode: 'PRJ',
  },
  render: (args) => ({
    components: { TaskBoard },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 h-[600px]">
        <TaskBoard v-bind="args" />
      </div>
    `,
  }),
};

export const Empty: Story = {
  args: {
    tasks: [],
    projectCode: 'PRJ',
  },
  render: (args) => ({
    components: { TaskBoard },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 h-[600px]">
        <TaskBoard v-bind="args" />
      </div>
    `,
  }),
};

export const WithQuickAdd: Story = {
  args: {
    tasks: sampleTasks.slice(0, 4),
    projectId: 'project-123',
    projectCode: 'PRJ',
  },
  render: (args) => ({
    components: { TaskBoard },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 h-[600px]">
        <TaskBoard v-bind="args" />
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Note: Quick-add requires API connection to create tasks.
        </p>
      </div>
    `,
  }),
};

export const ManyTasks: Story = {
  args: {
    tasks: [
      ...sampleTasks,
      { id: '9', title: 'Additional task 1', status: 'todo', priority: 'low', taskNumber: 9, subtaskCount: 0, order: 2 },
      { id: '10', title: 'Additional task 2', status: 'todo', priority: 'medium', taskNumber: 10, subtaskCount: 0, order: 3 },
      { id: '11', title: 'Additional task 3', status: 'open', priority: 'high', taskNumber: 11, subtaskCount: 1, order: 2 },
      { id: '12', title: 'Additional task 4', status: 'done', priority: 'medium', taskNumber: 12, subtaskCount: 0, order: 2 },
    ],
    projectCode: 'PRJ',
  },
  render: (args) => ({
    components: { TaskBoard },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 h-[600px]">
        <TaskBoard v-bind="args" />
      </div>
    `,
  }),
};
