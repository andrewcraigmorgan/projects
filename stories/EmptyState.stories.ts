import type { Meta, StoryObj } from '@storybook/vue3';
import EmptyState from '~/components/ui/EmptyState.vue';
import Button from '~/components/ui/Button.vue';

const meta: Meta<typeof EmptyState> = {
  title: 'UI/EmptyState',
  component: EmptyState,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Main heading text',
    },
    description: {
      control: 'text',
      description: 'Optional description text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'No items found',
    description: 'Get started by creating a new item.',
  },
};

export const WithoutDescription: Story = {
  args: {
    title: 'No projects yet',
  },
};

export const WithCustomIcon: Story = {
  render: () => ({
    components: { EmptyState },
    template: `
      <EmptyState title="No tasks" description="Create your first task to get started.">
        <template #icon>
          <svg class="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </template>
      </EmptyState>
    `,
  }),
};

export const WithActions: Story = {
  render: () => ({
    components: { EmptyState, Button },
    template: `
      <EmptyState title="No projects yet" description="Create your first project or import from another tool.">
        <template #actions>
          <Button>Create Project</Button>
          <Button variant="secondary">Import</Button>
        </template>
      </EmptyState>
    `,
  }),
};

export const FullExample: Story = {
  render: () => ({
    components: { EmptyState, Button },
    template: `
      <EmptyState title="Welcome to Projects!" description="Create your first organization to get started with project management.">
        <template #icon>
          <svg class="h-8 w-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </template>
        <template #actions>
          <Button>Create Organization</Button>
        </template>
      </EmptyState>
    `,
  }),
};
