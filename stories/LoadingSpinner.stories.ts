import type { Meta, StoryObj } from '@storybook/vue3';
import LoadingSpinner from '~/components/ui/LoadingSpinner.vue';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Spinner size',
    },
    center: {
      control: 'boolean',
      description: 'Center the spinner with padding',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
    center: true,
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    center: true,
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
    center: true,
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    center: true,
  },
};

export const NotCentered: Story = {
  args: {
    size: 'md',
    center: false,
  },
};

export const AllSizes: Story = {
  render: () => ({
    components: { LoadingSpinner },
    template: `
      <div class="flex items-center gap-8">
        <div class="text-center">
          <LoadingSpinner size="sm" :center="false" />
          <p class="text-xs text-gray-500 mt-2">Small</p>
        </div>
        <div class="text-center">
          <LoadingSpinner size="md" :center="false" />
          <p class="text-xs text-gray-500 mt-2">Medium</p>
        </div>
        <div class="text-center">
          <LoadingSpinner size="lg" :center="false" />
          <p class="text-xs text-gray-500 mt-2">Large</p>
        </div>
      </div>
    `,
  }),
};

export const InlineWithText: Story = {
  render: () => ({
    components: { LoadingSpinner },
    template: `
      <div class="flex items-center gap-2">
        <LoadingSpinner size="sm" :center="false" />
        <span class="text-gray-600">Loading data...</span>
      </div>
    `,
  }),
};
