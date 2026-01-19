import type { Meta, StoryObj } from '@storybook/vue3';
import Avatar from '~/components/ui/Avatar.vue';

const meta: Meta<typeof Avatar> = {
  title: 'UI/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    name: {
      control: 'text',
      description: 'Person name (first letter used as initial)',
    },
    avatar: {
      control: 'text',
      description: 'Avatar image URL',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      description: 'Avatar size',
    },
    role: {
      control: 'select',
      options: ['team', 'client', undefined],
      description: 'User role (affects color)',
    },
    showRole: {
      control: 'boolean',
      description: 'Show role badge',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: 'John Doe',
    size: 'md',
  },
};

export const TeamMember: Story = {
  args: {
    name: 'Alice Smith',
    role: 'team',
    size: 'md',
  },
};

export const Client: Story = {
  args: {
    name: 'Bob Client',
    role: 'client',
    size: 'md',
  },
};

export const WithRoleBadge: Story = {
  args: {
    name: 'Jane Developer',
    role: 'team',
    showRole: true,
    size: 'md',
  },
};

export const ClientWithBadge: Story = {
  args: {
    name: 'External Client',
    role: 'client',
    showRole: true,
    size: 'md',
  },
};

export const AllSizes: Story = {
  render: () => ({
    components: { Avatar },
    template: `
      <div class="flex items-end gap-4">
        <div class="text-center">
          <Avatar name="John" size="xs" />
          <p class="text-xs text-gray-500 mt-2">XS</p>
        </div>
        <div class="text-center">
          <Avatar name="John" size="sm" />
          <p class="text-xs text-gray-500 mt-2">SM</p>
        </div>
        <div class="text-center">
          <Avatar name="John" size="md" />
          <p class="text-xs text-gray-500 mt-2">MD</p>
        </div>
        <div class="text-center">
          <Avatar name="John" size="lg" />
          <p class="text-xs text-gray-500 mt-2">LG</p>
        </div>
      </div>
    `,
  }),
};

export const RoleComparison: Story = {
  render: () => ({
    components: { Avatar },
    template: `
      <div class="space-y-4">
        <div class="flex items-center gap-4">
          <Avatar name="Team Member" role="team" showRole />
        </div>
        <div class="flex items-center gap-4">
          <Avatar name="Client User" role="client" showRole />
        </div>
      </div>
    `,
  }),
};

export const AvatarOnly: Story = {
  render: () => ({
    components: { Avatar },
    template: `
      <Avatar name="John Doe" size="lg">
        <template #default></template>
      </Avatar>
    `,
  }),
};
