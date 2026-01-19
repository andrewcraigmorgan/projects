import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import Input from '~/components/ui/Input.vue';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search'],
      description: 'Input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    label: {
      control: 'text',
      description: 'Label text',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the input',
    },
    required: {
      control: 'boolean',
      description: 'Mark as required',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { Input },
    setup() {
      const value = ref('');
      return { args, value };
    },
    template: '<Input v-bind="args" v-model="value" />',
  }),
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  render: (args) => ({
    components: { Input },
    setup() {
      const value = ref('');
      return { args, value };
    },
    template: '<Input v-bind="args" v-model="value" />',
  }),
  args: {
    label: 'Email Address',
    type: 'email',
    placeholder: 'you@example.com',
  },
};

export const Required: Story = {
  render: (args) => ({
    components: { Input },
    setup() {
      const value = ref('');
      return { args, value };
    },
    template: '<Input v-bind="args" v-model="value" />',
  }),
  args: {
    label: 'Full Name',
    placeholder: 'John Doe',
    required: true,
  },
};

export const WithError: Story = {
  render: (args) => ({
    components: { Input },
    setup() {
      const value = ref('invalid-email');
      return { args, value };
    },
    template: '<Input v-bind="args" v-model="value" />',
  }),
  args: {
    label: 'Email',
    type: 'email',
    error: 'Please enter a valid email address',
  },
};

export const Password: Story = {
  render: (args) => ({
    components: { Input },
    setup() {
      const value = ref('');
      return { args, value };
    },
    template: '<Input v-bind="args" v-model="value" />',
  }),
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter password',
  },
};

export const Disabled: Story = {
  render: (args) => ({
    components: { Input },
    setup() {
      const value = ref('Disabled value');
      return { args, value };
    },
    template: '<Input v-bind="args" v-model="value" />',
  }),
  args: {
    label: 'Disabled Input',
    disabled: true,
  },
};

export const Search: Story = {
  render: (args) => ({
    components: { Input },
    setup() {
      const value = ref('');
      return { args, value };
    },
    template: '<Input v-bind="args" v-model="value" />',
  }),
  args: {
    type: 'search',
    placeholder: 'Search...',
  },
};
