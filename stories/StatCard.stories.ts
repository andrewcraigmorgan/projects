import type { Meta, StoryObj } from '@storybook/vue3';
import StatCard from '~/components/ui/StatCard.vue';

const meta: Meta<typeof StatCard> = {
  title: 'UI/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
      description: 'Stat label',
    },
    value: {
      control: 'text',
      description: 'Stat value',
    },
    color: {
      control: 'select',
      options: ['primary', 'green', 'blue', 'orange', 'purple'],
      description: 'Color theme for the icon background',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Total Projects',
    value: '24',
    color: 'primary',
  },
};

export const Primary: Story = {
  args: {
    label: 'Organization',
    value: 'Acme Corp',
    color: 'primary',
  },
};

export const Green: Story = {
  args: {
    label: 'Active Tasks',
    value: '128',
    color: 'green',
  },
};

export const Blue: Story = {
  args: {
    label: 'Members',
    value: '12',
    color: 'blue',
  },
};

export const Orange: Story = {
  args: {
    label: 'Pending',
    value: '5',
    color: 'orange',
  },
};

export const Purple: Story = {
  args: {
    label: 'Completed',
    value: '89%',
    color: 'purple',
  },
};

export const WithCustomIcon: Story = {
  render: () => ({
    components: { StatCard },
    template: `
      <StatCard label="Members" :value="12" color="green">
        <template #icon>
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </template>
      </StatCard>
    `,
  }),
};

export const DashboardGrid: Story = {
  render: () => ({
    components: { StatCard },
    template: `
      <div class="grid grid-cols-3 gap-4">
        <StatCard label="Organization" value="Acme Corp" color="primary">
          <template #icon>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </template>
        </StatCard>
        <StatCard label="Members" :value="12" color="green">
          <template #icon>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </template>
        </StatCard>
        <StatCard label="Your Role" value="Admin" color="blue">
          <template #icon>
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </template>
        </StatCard>
      </div>
    `,
  }),
};

export const AllColors: Story = {
  render: () => ({
    components: { StatCard },
    template: `
      <div class="grid grid-cols-5 gap-4">
        <StatCard label="Primary" value="100" color="primary" />
        <StatCard label="Green" value="200" color="green" />
        <StatCard label="Blue" value="300" color="blue" />
        <StatCard label="Orange" value="400" color="orange" />
        <StatCard label="Purple" value="500" color="purple" />
      </div>
    `,
  }),
};
