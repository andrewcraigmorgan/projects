import type { Meta, StoryObj } from '@storybook/vue3';
import TaskForm from '~/components/tasks/TaskForm.vue';

const meta: Meta<typeof TaskForm> = {
  title: 'Tasks/TaskForm',
  component: TaskForm,
  tags: ['autodocs'],
  argTypes: {
    task: {
      control: 'object',
      description: 'Existing task data for editing',
    },
    parentTask: {
      control: 'object',
      description: 'Parent task when creating a subtask',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading state on submit button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const CreateNew: Story = {
  args: {},
  render: (args) => ({
    components: { TaskForm },
    setup() {
      function handleSubmit(data: any) {
        console.log('Submit:', data);
      }
      function handleCancel() {
        console.log('Cancel');
      }
      return { args, handleSubmit, handleCancel };
    },
    template: `
      <div class="p-4 max-w-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <TaskForm
          v-bind="args"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </div>
    `,
  }),
};

export const EditExisting: Story = {
  args: {
    task: {
      id: 'task-123',
      title: 'Implement user authentication',
      description: 'Add login and signup functionality with OAuth support.',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  },
  render: (args) => ({
    components: { TaskForm },
    setup() {
      function handleSubmit(data: any) {
        console.log('Submit:', data);
      }
      function handleCancel() {
        console.log('Cancel');
      }
      return { args, handleSubmit, handleCancel };
    },
    template: `
      <div class="p-4 max-w-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <TaskForm
          v-bind="args"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </div>
    `,
  }),
};

export const CreateSubtask: Story = {
  args: {
    parentTask: {
      id: 'parent-task-1',
      title: 'Main feature implementation',
      status: 'in_progress',
      priority: 'high',
      taskNumber: 10,
      subtaskCount: 2,
      order: 0,
    },
  },
  render: (args) => ({
    components: { TaskForm },
    setup() {
      function handleSubmit(data: any) {
        console.log('Submit:', data);
      }
      function handleCancel() {
        console.log('Cancel');
      }
      return { args, handleSubmit, handleCancel };
    },
    template: `
      <div class="p-4 max-w-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <TaskForm
          v-bind="args"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </div>
    `,
  }),
};

export const Loading: Story = {
  args: {
    task: {
      id: 'task-123',
      title: 'Some task',
      description: '',
      status: 'todo',
      priority: 'medium',
    },
    loading: true,
  },
  render: (args) => ({
    components: { TaskForm },
    setup() {
      function handleSubmit(data: any) {
        console.log('Submit:', data);
      }
      function handleCancel() {
        console.log('Cancel');
      }
      return { args, handleSubmit, handleCancel };
    },
    template: `
      <div class="p-4 max-w-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <TaskForm
          v-bind="args"
          @submit="handleSubmit"
          @cancel="handleCancel"
        />
      </div>
    `,
  }),
};
