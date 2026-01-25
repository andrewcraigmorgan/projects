import type { Meta, StoryObj } from '@storybook/vue3';
import Header from '~/components/layout/Header.vue';
import Button from '~/components/ui/Button.vue';

const meta: Meta<typeof Header> = {
  title: 'Layout/Header',
  component: Header,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Page title',
    },
    backLink: {
      control: 'text',
      description: 'URL for back navigation',
    },
    backLabel: {
      control: 'text',
      description: 'Label for back link (screen readers)',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Dashboard',
  },
};

export const WithBackLink: Story = {
  args: {
    title: 'Project Details',
    backLink: '/projects',
    backLabel: 'Back to Projects',
  },
};

export const WithActions: Story = {
  render: () => ({
    components: { Header, Button },
    template: `
      <Header title="Tasks">
        <template #actions>
          <Button size="sm" variant="secondary">Export</Button>
          <Button size="sm">Add Task</Button>
        </template>
      </Header>
    `,
  }),
};

export const WithTitleSlot: Story = {
  render: () => ({
    components: { Header, Button },
    template: `
      <Header>
        <template #title>
          <div class="flex items-center gap-2">
            <h1 class="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">Project Alpha</h1>
            <span class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Active</span>
          </div>
        </template>
        <template #actions>
          <Button size="sm" variant="secondary">Settings</Button>
        </template>
      </Header>
    `,
  }),
};

export const WithBackAndActions: Story = {
  render: () => ({
    components: { Header, Button },
    template: `
      <Header title="Edit Task" back-link="/tasks">
        <template #actions>
          <Button size="sm" variant="secondary">Cancel</Button>
          <Button size="sm">Save</Button>
        </template>
      </Header>
    `,
  }),
};

export const LongTitle: Story = {
  args: {
    title: 'This is a very long title that should be truncated on smaller screens',
    backLink: '/projects',
  },
};
