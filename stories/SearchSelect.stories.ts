import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import SearchSelect from '~/components/ui/SearchSelect.vue';

const meta: Meta<typeof SearchSelect> = {
  title: 'UI/SearchSelect',
  component: SearchSelect,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'text',
      description: 'Selected option ID',
    },
    options: {
      control: 'object',
      description: 'Available options with id and label',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder when nothing selected',
    },
    searchPlaceholder: {
      control: 'text',
      description: 'Placeholder in search input',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const projectOptions = [
  { id: '1', label: 'Project Alpha' },
  { id: '2', label: 'Project Beta' },
  { id: '3', label: 'Project Gamma' },
  { id: '4', label: 'Website Redesign' },
  { id: '5', label: 'Mobile App' },
];

const organizationOptions = [
  { id: 'org1', label: 'Acme Corporation' },
  { id: 'org2', label: 'TechStart Inc.' },
  { id: 'org3', label: 'Design Studio' },
];

export const Default: Story = {
  render: () => ({
    components: { SearchSelect },
    setup() {
      const selected = ref<string | undefined>(undefined);
      return { selected, projectOptions };
    },
    template: `
      <div class="p-4 w-64">
        <SearchSelect
          v-model="selected"
          :options="projectOptions"
          placeholder="Select project..."
          search-placeholder="Search projects..."
        />
        <p class="mt-4 text-sm text-gray-400">Selected: {{ selected || 'none' }}</p>
      </div>
    `,
  }),
};

export const WithPreselection: Story = {
  render: () => ({
    components: { SearchSelect },
    setup() {
      const selected = ref('2');
      return { selected, projectOptions };
    },
    template: `
      <div class="p-4 w-64">
        <SearchSelect
          v-model="selected"
          :options="projectOptions"
          placeholder="Select project..."
          search-placeholder="Search projects..."
        />
        <p class="mt-4 text-sm text-gray-400">Selected: {{ selected }}</p>
      </div>
    `,
  }),
};

export const Organizations: Story = {
  render: () => ({
    components: { SearchSelect },
    setup() {
      const selected = ref<string | undefined>(undefined);
      return { selected, organizationOptions };
    },
    template: `
      <div class="p-4 w-64">
        <SearchSelect
          v-model="selected"
          :options="organizationOptions"
          placeholder="Select organization..."
          search-placeholder="Search organizations..."
        />
        <p class="mt-4 text-sm text-gray-400">Selected: {{ selected || 'none' }}</p>
      </div>
    `,
  }),
};

export const ManyOptions: Story = {
  render: () => ({
    components: { SearchSelect },
    setup() {
      const selected = ref<string | undefined>(undefined);
      const manyOptions = Array.from({ length: 20 }, (_, i) => ({
        id: `${i + 1}`,
        label: `Option ${i + 1}`,
      }));
      return { selected, manyOptions };
    },
    template: `
      <div class="p-4 w-64">
        <SearchSelect
          v-model="selected"
          :options="manyOptions"
          placeholder="Select option..."
          search-placeholder="Type to search..."
        />
        <p class="mt-4 text-sm text-gray-400">Selected: {{ selected || 'none' }}</p>
      </div>
    `,
  }),
};
