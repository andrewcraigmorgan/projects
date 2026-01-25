import type { Meta, StoryObj } from '@storybook/vue3';
import TaskList from '~/components/tasks/TaskList.vue';

const meta: Meta<typeof TaskList> = {
  title: 'Tasks/TaskList',
  component: TaskList,
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
    depth: {
      control: 'number',
      description: 'Nesting depth for subtasks',
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
    assignees: [{ _id: 'u1', name: 'John Doe', email: 'john@example.com' }],
  },
  {
    id: '2',
    title: 'Design database schema',
    status: 'todo' as const,
    priority: 'medium' as const,
    taskNumber: 2,
    subtaskCount: 0,
    order: 1,
  },
  {
    id: '3',
    title: 'Write API documentation',
    status: 'open' as const,
    priority: 'low' as const,
    taskNumber: 3,
    subtaskCount: 0,
    order: 2,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
  },
];

export const Default: Story = {
  args: {
    tasks: sampleTasks,
    projectCode: 'PRJ',
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
    tasks: sampleTasks,
    projectId: 'project-123',
    projectCode: 'PRJ',
  },
  render: (args) => ({
    components: { TaskList },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 max-w-3xl">
        <TaskList v-bind="args" />
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
  },
};

export const NestedSubtasks: Story = {
  args: {
    tasks: [
      {
        ...sampleTasks[0],
        subtasks: [
          { id: '1-1', title: 'Subtask 1', status: 'todo', priority: 'medium', taskNumber: 1, subtaskCount: 0, order: 0, parentTask: '1' },
          { id: '1-2', title: 'Subtask 2', status: 'in_progress', priority: 'high', taskNumber: 2, subtaskCount: 0, order: 1, parentTask: '1' },
        ],
      },
    ],
    projectCode: 'PRJ',
    depth: 0,
  },
};

export const ManyTasks: Story = {
  args: {
    tasks: Array.from({ length: 10 }, (_, i) => ({
      id: `task-${i + 1}`,
      title: `Task ${i + 1}: ${['Fix bug', 'Add feature', 'Write tests', 'Update docs', 'Refactor code'][i % 5]}`,
      status: ['todo', 'open', 'in_progress', 'in_review', 'done'][i % 5] as const,
      priority: ['low', 'medium', 'high'][i % 3] as const,
      taskNumber: i + 1,
      subtaskCount: i % 3,
      order: i,
    })),
    projectCode: 'PRJ',
  },
};
