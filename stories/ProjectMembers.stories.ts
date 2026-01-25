import type { Meta, StoryObj } from '@storybook/vue3';
import ProjectMembers from '~/components/projects/ProjectMembers.vue';

const meta: Meta<typeof ProjectMembers> = {
  title: 'Projects/ProjectMembers',
  component: ProjectMembers,
  tags: ['autodocs'],
  argTypes: {
    projectId: {
      control: 'text',
      description: 'Project ID to load members for',
    },
    ownerId: {
      control: 'text',
      description: 'Owner user ID',
    },
  },
  parameters: {
    docs: {
      description: {
        component: 'Displays and manages project team members with role-based grouping. Requires API connection to load member data.',
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
    components: { ProjectMembers },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4 max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <ProjectMembers :project-id="args.projectId" />
        <p class="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Note: Loading members requires API connection.
        </p>
      </div>
    `,
  }),
};

export const InCard: Story = {
  args: {
    projectId: 'project-123',
  },
  render: (args) => ({
    components: { ProjectMembers },
    setup() {
      return { args };
    },
    template: `
      <div class="p-4">
        <div class="max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4">
          <ProjectMembers :project-id="args.projectId" />
        </div>
      </div>
    `,
  }),
};
