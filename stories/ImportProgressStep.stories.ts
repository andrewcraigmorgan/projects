import type { Meta, StoryObj } from '@storybook/vue3';
import ProgressStep from '~/components/import/ProgressStep.vue';

const meta: Meta<typeof ProgressStep> = {
  title: 'Import/ProgressStep',
  component: ProgressStep,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Shows a loading spinner while import is in progress. This is a simple stateless component.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
