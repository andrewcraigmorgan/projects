import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import Dropdown from '~/components/ui/Dropdown.vue';

const meta: Meta<typeof Dropdown> = {
  title: 'UI/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md'],
      description: 'Dropdown size',
    },
    variant: {
      control: 'select',
      options: ['default', 'subtle'],
      description: 'Visual style variant',
    },
    showDot: {
      control: 'boolean',
      description: 'Show colored dot indicator',
    },
    searchableThreshold: {
      control: 'number',
      description: 'Number of options before becoming searchable',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when no value selected',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-400' },
  { value: 'review', label: 'In Review', color: 'bg-purple-400' },
  { value: 'done', label: 'Done', color: 'bg-green-500' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const countryOptions = [
  { value: 'us', label: 'United States' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'ca', label: 'Canada' },
  { value: 'au', label: 'Australia' },
  { value: 'de', label: 'Germany' },
  { value: 'fr', label: 'France' },
  { value: 'jp', label: 'Japan' },
  { value: 'cn', label: 'China' },
  { value: 'in', label: 'India' },
  { value: 'br', label: 'Brazil' },
];

export const Default: Story = {
  render: (args) => ({
    components: { Dropdown },
    setup() {
      const value = ref('medium');
      return { args, value, priorityOptions };
    },
    template: '<Dropdown v-bind="args" v-model="value" :options="priorityOptions" />',
  }),
  args: {
    placeholder: 'Select priority',
  },
};

export const WithColorDots: Story = {
  render: (args) => ({
    components: { Dropdown },
    setup() {
      const value = ref('in_progress');
      return { args, value, statusOptions };
    },
    template: '<Dropdown v-bind="args" v-model="value" :options="statusOptions" />',
  }),
  args: {
    showDot: true,
    placeholder: 'Select status',
  },
};

export const Searchable: Story = {
  render: (args) => ({
    components: { Dropdown },
    setup() {
      const value = ref('');
      return { args, value, countryOptions };
    },
    template: `
      <div>
        <p class="text-sm text-gray-500 mb-2">This dropdown has more than 5 options, so it automatically becomes searchable.</p>
        <Dropdown v-bind="args" v-model="value" :options="countryOptions" />
      </div>
    `,
  }),
  args: {
    placeholder: 'Select country',
    searchPlaceholder: 'Search countries...',
  },
};

export const Sizes: Story = {
  render: () => ({
    components: { Dropdown },
    setup() {
      const small = ref('medium');
      const medium = ref('medium');
      return { small, medium, priorityOptions };
    },
    template: `
      <div class="flex items-center gap-4">
        <div>
          <p class="text-xs text-gray-500 mb-1">Small</p>
          <Dropdown v-model="small" :options="priorityOptions" size="sm" />
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Medium</p>
          <Dropdown v-model="medium" :options="priorityOptions" size="md" />
        </div>
      </div>
    `,
  }),
};

export const Variants: Story = {
  render: () => ({
    components: { Dropdown },
    setup() {
      const subtle = ref('todo');
      const defaultVar = ref('todo');
      return { subtle, defaultVar, statusOptions };
    },
    template: `
      <div class="flex items-center gap-4">
        <div>
          <p class="text-xs text-gray-500 mb-1">Subtle (default)</p>
          <Dropdown v-model="subtle" :options="statusOptions" variant="subtle" show-dot />
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">Default</p>
          <Dropdown v-model="defaultVar" :options="statusOptions" variant="default" show-dot />
        </div>
      </div>
    `,
  }),
};

export const CustomThreshold: Story = {
  render: (args) => ({
    components: { Dropdown },
    setup() {
      const value = ref('');
      return { args, value, statusOptions };
    },
    template: `
      <div>
        <p class="text-sm text-gray-500 mb-2">Threshold set to 3, so 4 options triggers searchable mode.</p>
        <Dropdown v-bind="args" v-model="value" :options="statusOptions" />
      </div>
    `,
  }),
  args: {
    searchableThreshold: 3,
    showDot: true,
    placeholder: 'Select status',
  },
};

export const InTableContext: Story = {
  render: () => ({
    components: { Dropdown },
    setup() {
      const tasks = ref([
        { id: 1, title: 'Design homepage', status: 'in_progress', priority: 'high' },
        { id: 2, title: 'Write tests', status: 'todo', priority: 'medium' },
        { id: 3, title: 'Deploy to staging', status: 'review', priority: 'high' },
      ]);
      return { tasks, statusOptions, priorityOptions };
    },
    template: `
      <table class="w-full text-sm">
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th class="px-4 py-2 text-left">Task</th>
            <th class="px-4 py-2 text-left">Status</th>
            <th class="px-4 py-2 text-left">Priority</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="task in tasks" :key="task.id" class="hover:bg-gray-50 dark:hover:bg-gray-800">
            <td class="px-4 py-2">{{ task.title }}</td>
            <td class="px-4 py-2">
              <Dropdown v-model="task.status" :options="statusOptions" show-dot size="sm" />
            </td>
            <td class="px-4 py-2">
              <Dropdown v-model="task.priority" :options="priorityOptions" size="sm" />
            </td>
          </tr>
        </tbody>
      </table>
    `,
  }),
};
