import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import Modal from '~/components/ui/Modal.vue';
import Button from '~/components/ui/Button.vue';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Whether the modal is open',
    },
    title: {
      control: 'text',
      description: 'Modal title',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => ({
    components: { Modal, Button },
    setup() {
      const isOpen = ref(false);
      return { args, isOpen };
    },
    template: `
      <div>
        <Button @click="isOpen = true">Open Modal</Button>
        <Modal :open="isOpen" :title="args.title" @close="isOpen = false">
          <p class="text-gray-600 dark:text-gray-300">This is the modal content. Click outside or press escape to close.</p>
        </Modal>
      </div>
    `,
  }),
  args: {
    title: 'Modal Title',
  },
};

export const WithFooter: Story = {
  render: (args) => ({
    components: { Modal, Button },
    setup() {
      const isOpen = ref(false);
      return { args, isOpen };
    },
    template: `
      <div>
        <Button @click="isOpen = true">Open Modal</Button>
        <Modal :open="isOpen" :title="args.title" @close="isOpen = false">
          <p class="text-gray-600 dark:text-gray-300">Are you sure you want to delete this item? This action cannot be undone.</p>
          <template #footer>
            <div class="flex justify-end gap-3">
              <Button variant="secondary" @click="isOpen = false">Cancel</Button>
              <Button variant="danger" @click="isOpen = false">Delete</Button>
            </div>
          </template>
        </Modal>
      </div>
    `,
  }),
  args: {
    title: 'Confirm Delete',
  },
};

export const NoTitle: Story = {
  render: () => ({
    components: { Modal, Button },
    setup() {
      const isOpen = ref(false);
      return { isOpen };
    },
    template: `
      <div>
        <Button @click="isOpen = true">Open Modal</Button>
        <Modal :open="isOpen" @close="isOpen = false">
          <div class="text-center py-4">
            <svg class="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Success!</h3>
            <p class="mt-2 text-gray-600 dark:text-gray-300">Your changes have been saved.</p>
          </div>
        </Modal>
      </div>
    `,
  }),
};

export const FormModal: Story = {
  render: () => ({
    components: { Modal, Button },
    setup() {
      const isOpen = ref(false);
      return { isOpen };
    },
    template: `
      <div>
        <Button @click="isOpen = true">Create New</Button>
        <Modal :open="isOpen" title="Create Item" @close="isOpen = false">
          <form @submit.prevent="isOpen = false" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-primary-500" placeholder="Enter name" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-primary-500" rows="3" placeholder="Enter description"></textarea>
            </div>
          </form>
          <template #footer>
            <div class="flex justify-end gap-3">
              <Button variant="secondary" @click="isOpen = false">Cancel</Button>
              <Button @click="isOpen = false">Create</Button>
            </div>
          </template>
        </Modal>
      </div>
    `,
  }),
};
