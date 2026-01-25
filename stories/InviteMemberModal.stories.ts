import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import InviteMemberModal from '~/components/projects/InviteMemberModal.vue';
import Button from '~/components/ui/Button.vue';

const meta: Meta<typeof InviteMemberModal> = {
  title: 'Projects/InviteMemberModal',
  component: InviteMemberModal,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    projectId: {
      control: 'text',
      description: 'Project ID to invite members to',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { InviteMemberModal, Button },
    setup() {
      const isOpen = ref(false);
      return { isOpen };
    },
    template: `
      <div class="p-4">
        <Button @click="isOpen = true">Invite Members</Button>
        <InviteMemberModal
          :open="isOpen"
          project-id="project-123"
          @close="isOpen = false"
        />
        <p class="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Note: Sending invitations requires API connection.
        </p>
      </div>
    `,
  }),
};

export const OpenByDefault: Story = {
  args: {
    open: true,
    projectId: 'project-123',
  },
};
