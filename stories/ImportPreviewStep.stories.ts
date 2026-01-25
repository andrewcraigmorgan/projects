import type { Meta, StoryObj } from '@storybook/vue3';
import PreviewStep from '~/components/import/PreviewStep.vue';

const meta: Meta<typeof PreviewStep> = {
  title: 'Import/PreviewStep',
  component: PreviewStep,
  tags: ['autodocs'],
  argTypes: {
    previewTasks: {
      control: 'object',
      description: 'Sample tasks to preview',
    },
    totalTasks: {
      control: 'number',
      description: 'Total number of tasks to import',
    },
    totalProjects: {
      control: 'number',
      description: 'Total number of projects to import',
    },
    organizationName: {
      control: 'text',
      description: 'Target organization name',
    },
    importing: {
      control: 'boolean',
      description: 'Whether import is in progress',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const samplePreviewTasks = [
  { title: 'Implement user authentication', project: 'Backend API', status: 'todo', priority: 'high', dueDate: '2024-02-15' },
  { title: 'Design homepage mockup', project: 'Website Redesign', status: 'in_progress', priority: 'medium', dueDate: '2024-02-10' },
  { title: 'Write API documentation', project: 'Backend API', status: 'todo', priority: 'low', dueDate: '' },
  { title: 'Set up CI/CD pipeline', project: 'DevOps', status: 'done', priority: 'high', dueDate: '2024-01-30' },
  { title: 'Database schema design', project: 'Backend API', status: 'review', priority: 'medium', dueDate: '2024-02-20' },
];

export const Default: Story = {
  args: {
    previewTasks: samplePreviewTasks,
    totalTasks: 156,
    totalProjects: 8,
    organizationName: 'Acme Corporation',
    importing: false,
  },
};

export const ManyTasks: Story = {
  args: {
    previewTasks: Array.from({ length: 10 }, (_, i) => ({
      title: `Task ${i + 1}: ${['Fix bug', 'Add feature', 'Write tests', 'Update docs', 'Refactor'][i % 5]}`,
      project: ['Project Alpha', 'Project Beta', 'Project Gamma'][i % 3],
      status: ['todo', 'in_progress', 'done'][i % 3],
      priority: ['low', 'medium', 'high'][i % 3],
      dueDate: i % 2 === 0 ? '2024-03-01' : '',
    })),
    totalTasks: 523,
    totalProjects: 15,
    organizationName: 'Large Enterprise Inc.',
    importing: false,
  },
};

export const WithoutProjects: Story = {
  args: {
    previewTasks: samplePreviewTasks.slice(0, 3),
    totalTasks: 45,
    totalProjects: 0,
    organizationName: 'Small Startup',
    importing: false,
  },
};

export const Importing: Story = {
  args: {
    previewTasks: samplePreviewTasks,
    totalTasks: 156,
    totalProjects: 8,
    organizationName: 'Acme Corporation',
    importing: true,
  },
};
