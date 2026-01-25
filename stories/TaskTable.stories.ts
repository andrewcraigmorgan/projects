import type { Meta, StoryObj } from '@storybook/vue3';
import TaskTable from '~/components/tasks/TaskTable.vue';

const meta: Meta<typeof TaskTable> = {
  title: 'Tasks/TaskTable',
  component: TaskTable,
  tags: ['autodocs'],
  argTypes: {
    tasks: {
      control: 'object',
      description: 'Array of tasks to display',
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
    enableDragDrop: {
      control: 'boolean',
      description: 'Enable drag and drop reordering',
    },
    assigneeOptions: {
      control: 'object',
      description: 'Available users for assignment',
    },
    milestones: {
      control: 'object',
      description: 'Available milestones',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTasks = [
  {
    id: '1',
    title: 'Implement user authentication',
    status: 'in_progress' as const,
    priority: 'high' as const,
    taskNumber: 1,
    subtaskCount: 3,
    order: 0,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [{ _id: 'u1', name: 'John Doe', email: 'john@example.com' }],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Design database schema',
    status: 'todo' as const,
    priority: 'medium' as const,
    taskNumber: 2,
    subtaskCount: 0,
    order: 1,
    milestone: { id: 'ms1', name: 'Phase 1' },
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Write API documentation',
    status: 'open' as const,
    priority: 'low' as const,
    taskNumber: 3,
    subtaskCount: 0,
    order: 2,
    isExternal: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    title: 'Set up CI/CD pipeline',
    status: 'done' as const,
    priority: 'high' as const,
    taskNumber: 4,
    subtaskCount: 2,
    order: 3,
    assignees: [
      { _id: 'u1', name: 'John Doe', email: 'john@example.com' },
      { _id: 'u2', name: 'Jane Smith', email: 'jane@example.com' },
    ],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const assigneeOptions = [
  { id: 'u1', name: 'John Doe', email: 'john@example.com', role: 'team' as const },
  { id: 'u2', name: 'Jane Smith', email: 'jane@example.com', role: 'team' as const },
  { id: 'u3', name: 'Client User', email: 'client@example.com', role: 'client' as const },
];

const milestones = [
  { id: 'ms1', name: 'Phase 1' },
  { id: 'ms2', name: 'Phase 2' },
  { id: 'ms3', name: 'MVP Launch' },
];

export const Default: Story = {
  args: {
    tasks: sampleTasks,
    projectCode: 'PRJ',
    assigneeOptions,
    milestones,
  },
};

export const Loading: Story = {
  args: {
    tasks: [],
    loading: true,
    projectCode: 'PRJ',
  },
};

export const Empty: Story = {
  args: {
    tasks: [],
    projectCode: 'PRJ',
  },
};

export const WithQuickAdd: Story = {
  args: {
    tasks: sampleTasks.slice(0, 2),
    projectId: 'project-123',
    projectCode: 'PRJ',
    assigneeOptions,
  },
  render: (args) => ({
    components: { TaskTable },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4">
        <TaskTable v-bind="args" />
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Note: Quick-add requires API connection to create tasks.
        </p>
      </div>
    `,
  }),
};

export const WithoutDragDrop: Story = {
  args: {
    tasks: sampleTasks,
    projectCode: 'PRJ',
    enableDragDrop: false,
    assigneeOptions,
  },
};

export const ManyTasks: Story = {
  args: {
    tasks: Array.from({ length: 15 }, (_, i) => ({
      id: `task-${i + 1}`,
      title: `Task ${i + 1}: ${['Fix bug', 'Add feature', 'Write tests', 'Update docs', 'Refactor code'][i % 5]}`,
      status: ['todo', 'open', 'in_progress', 'in_review', 'done'][i % 5] as const,
      priority: ['low', 'medium', 'high'][i % 3] as const,
      taskNumber: i + 1,
      subtaskCount: i % 3,
      order: i,
      dueDate: i % 2 === 0 ? new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString() : undefined,
      assignees: i % 3 === 0 ? [{ _id: 'u1', name: 'John Doe', email: 'john@example.com' }] : undefined,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    projectCode: 'PRJ',
    assigneeOptions,
  },
};
