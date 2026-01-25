import type { Meta, StoryObj } from '@storybook/vue3';
import TaskCard from '~/components/tasks/TaskCard.vue';

const meta: Meta<typeof TaskCard> = {
  title: 'Tasks/TaskCard',
  component: TaskCard,
  tags: ['autodocs'],
  argTypes: {
    task: {
      control: 'object',
      description: 'Task object with title, status, priority, etc.',
    },
    depth: {
      control: 'number',
      description: 'Indentation level for subtasks',
    },
    showEstimatedHours: {
      control: 'boolean',
      description: 'Show estimated hours badge',
    },
    projectCode: {
      control: 'text',
      description: 'Project code prefix for task ID',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseTask = {
  id: 'task-123',
  title: 'Implement user authentication',
  status: 'in_progress' as const,
  priority: 'high' as const,
  taskNumber: 42,
  subtaskCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const projectUsers = [
  { id: 'user1', name: 'John Doe', email: 'john@example.com', role: 'team' as const },
  { id: 'user2', name: 'Jane Smith', email: 'jane@example.com', role: 'team' as const },
  { id: 'user3', name: 'Client User', email: 'client@example.com', role: 'client' as const },
];

const milestones = [
  { id: 'ms1', name: 'Phase 1' },
  { id: 'ms2', name: 'Phase 2' },
  { id: 'ms3', name: 'MVP Launch' },
];

export const Default: Story = {
  args: {
    task: baseTask,
    projectCode: 'PRJ',
  },
};

export const WithAssignees: Story = {
  args: {
    task: {
      ...baseTask,
      assignees: [
        { _id: 'user1', name: 'John Doe', email: 'john@example.com' },
      ],
    },
    projectCode: 'PRJ',
    projectUsers,
  },
};

export const MultipleAssignees: Story = {
  args: {
    task: {
      ...baseTask,
      assignees: [
        { _id: 'user1', name: 'John Doe', email: 'john@example.com' },
        { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
      ],
    },
    projectCode: 'PRJ',
    projectUsers,
  },
};

export const WithTags: Story = {
  args: {
    task: {
      ...baseTask,
      tags: [
        { id: 'tag1', name: 'Bug', color: '#ef4444' },
        { id: 'tag2', name: 'Urgent', color: '#f97316' },
      ],
    },
    projectCode: 'PRJ',
  },
};

export const WithDueDate: Story = {
  args: {
    task: {
      ...baseTask,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    projectCode: 'PRJ',
  },
};

export const WithEstimatedHours: Story = {
  args: {
    task: {
      ...baseTask,
      estimatedHours: 8,
    },
    projectCode: 'PRJ',
    showEstimatedHours: true,
  },
};

export const WithSubtasks: Story = {
  args: {
    task: {
      ...baseTask,
      subtaskCount: 5,
    },
    projectCode: 'PRJ',
  },
};

export const WithMilestone: Story = {
  args: {
    task: {
      ...baseTask,
      milestone: { id: 'ms1', name: 'Phase 1' },
    },
    projectCode: 'PRJ',
    milestones,
  },
};

export const ExternalTask: Story = {
  args: {
    task: {
      ...baseTask,
      isExternal: true,
      title: 'External integration task',
    },
    projectCode: 'PRJ',
  },
};

export const AllStatuses: Story = {
  render: () => ({
    components: { TaskCard },
    setup() {
      const statuses = ['todo', 'awaiting_approval', 'open', 'in_review', 'done'];
      const tasks = statuses.map((status, i) => ({
        ...baseTask,
        id: `task-${i}`,
        taskNumber: i + 1,
        title: `Task with status: ${status}`,
        status,
      }));
      return { tasks };
    },
    template: `
      <div class="space-y-2 p-4">
        <TaskCard
          v-for="task in tasks"
          :key="task.id"
          :task="task"
          project-code="PRJ"
        />
      </div>
    `,
  }),
};

export const AllPriorities: Story = {
  render: () => ({
    components: { TaskCard },
    setup() {
      const priorities = [undefined, 'low', 'medium', 'high'];
      const tasks = priorities.map((priority, i) => ({
        ...baseTask,
        id: `task-${i}`,
        taskNumber: i + 1,
        title: `Task with priority: ${priority || 'none'}`,
        priority,
        status: 'todo',
      }));
      return { tasks };
    },
    template: `
      <div class="space-y-2 p-4">
        <TaskCard
          v-for="task in tasks"
          :key="task.id"
          :task="task"
          project-code="PRJ"
        />
      </div>
    `,
  }),
};

export const FullExample: Story = {
  args: {
    task: {
      ...baseTask,
      title: 'Complete user authentication flow with OAuth',
      status: 'in_review',
      priority: 'high',
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      estimatedHours: 16,
      subtaskCount: 3,
      milestone: { id: 'ms2', name: 'Phase 2' },
      assignees: [
        { _id: 'user1', name: 'John Doe', email: 'john@example.com' },
        { _id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
      ],
      tags: [
        { id: 'tag1', name: 'Feature', color: '#3b82f6' },
        { id: 'tag2', name: 'Backend', color: '#8b5cf6' },
      ],
    },
    projectCode: 'AUTH',
    projectUsers,
    milestones,
    showEstimatedHours: true,
  },
};
