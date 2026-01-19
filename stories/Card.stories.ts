import type { Meta, StoryObj } from '@storybook/vue3';
import Card from '~/components/ui/Card.vue';
import Button from '~/components/ui/Button.vue';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: 'text',
      description: 'Card header title',
    },
    padding: {
      control: 'boolean',
      description: 'Apply padding to content area',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { Card },
    template: `
      <Card>
        <p class="text-gray-600 dark:text-gray-300">This is the card content.</p>
      </Card>
    `,
  }),
};

export const WithTitle: Story = {
  render: () => ({
    components: { Card },
    template: `
      <Card title="Card Title">
        <p class="text-gray-600 dark:text-gray-300">This card has a title in the header.</p>
      </Card>
    `,
  }),
};

export const WithTitleAndActions: Story = {
  render: () => ({
    components: { Card, Button },
    template: `
      <Card title="API Keys">
        <template #actions>
          <Button size="sm">Create Key</Button>
        </template>
        <p class="text-gray-600 dark:text-gray-300">Manage your API keys here.</p>
      </Card>
    `,
  }),
};

export const WithFooter: Story = {
  render: () => ({
    components: { Card, Button },
    template: `
      <Card title="Settings">
        <p class="text-gray-600 dark:text-gray-300">Configure your account settings.</p>
        <template #footer>
          <div class="flex justify-end gap-2">
            <Button variant="secondary">Cancel</Button>
            <Button>Save Changes</Button>
          </div>
        </template>
      </Card>
    `,
  }),
};

export const WithCustomHeader: Story = {
  render: () => ({
    components: { Card },
    template: `
      <Card>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">Custom Header</h3>
              <p class="text-sm text-gray-500">With subtitle</p>
            </div>
            <span class="px-2 py-1 text-xs bg-green-100 text-green-700">Active</span>
          </div>
        </template>
        <p class="text-gray-600 dark:text-gray-300">Card with a fully custom header.</p>
      </Card>
    `,
  }),
};

export const NoPadding: Story = {
  render: () => ({
    components: { Card },
    template: `
      <Card title="Table View" :padding="false">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr>
              <td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">Item 1</td>
              <td class="px-4 py-2 text-sm text-green-600">Active</td>
            </tr>
            <tr>
              <td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">Item 2</td>
              <td class="px-4 py-2 text-sm text-gray-500">Inactive</td>
            </tr>
          </tbody>
        </table>
      </Card>
    `,
  }),
};

export const FullExample: Story = {
  render: () => ({
    components: { Card, Button },
    template: `
      <Card title="Organization">
        <template #actions>
          <Button size="sm" variant="secondary">Edit</Button>
        </template>
        <dl class="space-y-3">
          <div>
            <dt class="text-sm font-medium text-gray-500">Name</dt>
            <dd class="text-gray-900 dark:text-gray-100">Acme Corporation</dd>
          </div>
          <div>
            <dt class="text-sm font-medium text-gray-500">Members</dt>
            <dd class="text-gray-900 dark:text-gray-100">12</dd>
          </div>
        </dl>
        <template #footer>
          <a href="#" class="text-sm text-primary-600 hover:text-primary-500">View all members</a>
        </template>
      </Card>
    `,
  }),
};
