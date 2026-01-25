import type { Meta, StoryObj } from '@storybook/vue3';
import TagCard from '~/components/tags/TagCard.vue';

const meta: Meta<typeof TagCard> = {
  title: 'Components/TagCard',
  component: TagCard,
  tags: ['autodocs'],
  argTypes: {
    tag: {
      control: 'object',
      description: 'Tag data object',
    },
    colors: {
      control: 'object',
      description: 'Available color options for the color picker',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const defaultColors = [
  '#ef4444', '#f97316', '#f59e0b',
  '#84cc16', '#22c55e', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#a855f7', '#ec4899',
];

export const Default: Story = {
  args: {
    tag: {
      id: 'tag-1',
      name: 'Bug',
      color: '#ef4444',
    },
    colors: defaultColors,
  },
};

export const FeatureTag: Story = {
  args: {
    tag: {
      id: 'tag-2',
      name: 'Feature',
      color: '#3b82f6',
    },
    colors: defaultColors,
  },
};

export const EnhancementTag: Story = {
  args: {
    tag: {
      id: 'tag-3',
      name: 'Enhancement',
      color: '#8b5cf6',
    },
    colors: defaultColors,
  },
};

export const UrgentTag: Story = {
  args: {
    tag: {
      id: 'tag-4',
      name: 'Urgent',
      color: '#f97316',
    },
    colors: defaultColors,
  },
};

export const LongName: Story = {
  args: {
    tag: {
      id: 'tag-5',
      name: 'Needs Investigation',
      color: '#6366f1',
    },
    colors: defaultColors,
  },
};

export const AllTags: Story = {
  render: () => ({
    components: { TagCard },
    setup() {
      const tags = [
        { id: '1', name: 'Bug', color: '#ef4444' },
        { id: '2', name: 'Feature', color: '#3b82f6' },
        { id: '3', name: 'Enhancement', color: '#8b5cf6' },
        { id: '4', name: 'Documentation', color: '#10b981' },
        { id: '5', name: 'Urgent', color: '#f97316' },
        { id: '6', name: 'Backend', color: '#0891b2' },
      ];
      return { tags, defaultColors };
    },
    template: `
      <div class="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <TagCard
          v-for="tag in tags"
          :key="tag.id"
          :tag="tag"
          :colors="defaultColors"
        />
      </div>
    `,
  }),
};
