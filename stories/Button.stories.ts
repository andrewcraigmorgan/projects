import type { Meta, StoryObj } from '@storybook/vue3';
import Button from '~/components/ui/Button.vue';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: 'Button style variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Button size',
    },
    loading: {
      control: 'boolean',
      description: 'Show loading spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the button',
    },
    label: {
      control: 'text',
      description: 'Button label (slot content)',
    },
  },
  args: {
    label: 'Button',
  },
  render: (args) => ({
    components: { Button },
    setup() {
      const { label, ...props } = args;
      return { label, props };
    },
    template: `<Button v-bind="props">{{ label }}</Button>`,
  }),
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    label: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    label: 'Secondary Button',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    label: 'Delete',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    label: 'Ghost Button',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    label: 'Small',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    label: 'Large Button',
  },
};

export const Loading: Story = {
  args: {
    loading: true,
    label: 'Loading...',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Disabled',
  },
};

export const AllVariants: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div class="flex flex-wrap gap-4">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    `,
  }),
};

export const AllSizes: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div class="flex items-center gap-4">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
    `,
  }),
};
