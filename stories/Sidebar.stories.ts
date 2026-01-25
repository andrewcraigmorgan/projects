import type { Meta, StoryObj } from '@storybook/vue3';
import Sidebar from '~/components/layout/Sidebar.vue';

const meta: Meta<typeof Sidebar> = {
  title: 'Layout/Sidebar',
  component: Sidebar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    () => ({
      template: '<div class="h-screen"><story /></div>',
    }),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Sidebar },
    template: `
      <Sidebar />
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'The sidebar requires auth and organization stores to be populated. In Storybook, it shows the default structure with navigation items.',
      },
    },
  },
};

export const InLayout: Story = {
  render: () => ({
    components: { Sidebar },
    template: `
      <div class="flex h-screen">
        <Sidebar />
        <main class="flex-1 bg-gray-100 dark:bg-gray-900 p-6">
          <div class="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700">
            <h1 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Main Content Area</h1>
            <p class="mt-2 text-gray-600 dark:text-gray-400">This is where the page content goes.</p>
          </div>
        </main>
      </div>
    `,
  }),
};
