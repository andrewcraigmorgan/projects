import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import FilterDropdown from '~/components/ui/FilterDropdown.vue';

const meta: Meta<typeof FilterDropdown> = {
  title: 'UI/FilterDropdown',
  component: FilterDropdown,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'object',
      description: 'Selected values array',
    },
    options: {
      control: 'object',
      description: 'Available filter options',
    },
    label: {
      control: 'text',
      description: 'Label shown in dropdown header',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when no selection',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-blue-400' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-yellow-400' },
  { value: 'done', label: 'Done', color: 'bg-green-400' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-400' },
  { value: 'high', label: 'High', color: 'bg-orange-400' },
];

export const Default: Story = {
  render: () => ({
    components: { FilterDropdown },
    setup() {
      const selected = ref<string[]>([]);
      return { selected, statusOptions };
    },
    template: `
      <div class="p-4">
        <FilterDropdown
          v-model="selected"
          :options="statusOptions"
          label="Status"
          placeholder="All Statuses"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Selected: {{ selected }}</p>
      </div>
    `,
  }),
};

export const WithPreselection: Story = {
  render: () => ({
    components: { FilterDropdown },
    setup() {
      const selected = ref(['todo', 'in_progress']);
      return { selected, statusOptions };
    },
    template: `
      <div class="p-4">
        <FilterDropdown
          v-model="selected"
          :options="statusOptions"
          label="Status"
          placeholder="All Statuses"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Selected: {{ selected }}</p>
      </div>
    `,
  }),
};

export const PriorityFilter: Story = {
  render: () => ({
    components: { FilterDropdown },
    setup() {
      const selected = ref<string[]>([]);
      return { selected, priorityOptions };
    },
    template: `
      <div class="p-4">
        <FilterDropdown
          v-model="selected"
          :options="priorityOptions"
          label="Priority"
          placeholder="All Priorities"
        />
        <p class="mt-4 text-sm text-gray-600 dark:text-gray-400">Selected: {{ selected }}</p>
      </div>
    `,
  }),
};

export const MultipleFilters: Story = {
  render: () => ({
    components: { FilterDropdown },
    setup() {
      const selectedStatus = ref<string[]>([]);
      const selectedPriority = ref<string[]>([]);
      return { selectedStatus, selectedPriority, statusOptions, priorityOptions };
    },
    template: `
      <div class="p-4 flex gap-2">
        <FilterDropdown
          v-model="selectedStatus"
          :options="statusOptions"
          label="Status"
          placeholder="Status"
        />
        <FilterDropdown
          v-model="selectedPriority"
          :options="priorityOptions"
          label="Priority"
          placeholder="Priority"
        />
      </div>
    `,
  }),
};
