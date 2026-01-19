import type { Meta, StoryObj } from '@storybook/vue3';
import StepIndicator from '~/components/ui/StepIndicator.vue';

const meta: Meta<typeof StepIndicator> = {
  title: 'UI/StepIndicator',
  component: StepIndicator,
  tags: ['autodocs'],
  argTypes: {
    steps: {
      control: 'object',
      description: 'Array of steps (strings or {id, label} objects)',
    },
    currentStep: {
      control: 'text',
      description: 'Current step ID (when using object steps)',
    },
    currentStepIndex: {
      control: 'number',
      description: 'Current step index (when using string steps)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    steps: ['Upload', 'Map Fields', 'Preview', 'Complete'],
    currentStepIndex: 0,
  },
};

export const SecondStep: Story = {
  args: {
    steps: ['Upload', 'Map Fields', 'Preview', 'Complete'],
    currentStepIndex: 1,
  },
};

export const ThirdStep: Story = {
  args: {
    steps: ['Upload', 'Map Fields', 'Preview', 'Complete'],
    currentStepIndex: 2,
  },
};

export const Complete: Story = {
  args: {
    steps: ['Upload', 'Map Fields', 'Preview', 'Complete'],
    currentStepIndex: 3,
  },
};

export const WithObjectSteps: Story = {
  args: {
    steps: [
      { id: 'details', label: 'Project Details' },
      { id: 'team', label: 'Team Members' },
      { id: 'settings', label: 'Settings' },
      { id: 'review', label: 'Review' },
    ],
    currentStep: 'team',
  },
};

export const ThreeSteps: Story = {
  args: {
    steps: ['Start', 'Configure', 'Finish'],
    currentStepIndex: 1,
  },
};

export const FiveSteps: Story = {
  args: {
    steps: ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'],
    currentStepIndex: 2,
  },
};

export const CheckoutExample: Story = {
  args: {
    steps: [
      { id: 'cart', label: 'Cart' },
      { id: 'shipping', label: 'Shipping' },
      { id: 'payment', label: 'Payment' },
      { id: 'confirm', label: 'Confirm' },
    ],
    currentStep: 'payment',
  },
};

export const ProgressComparison: Story = {
  render: () => ({
    components: { StepIndicator },
    template: `
      <div class="space-y-8">
        <div>
          <p class="text-sm text-gray-500 mb-2">Step 1 of 4</p>
          <StepIndicator :steps="['Upload', 'Map', 'Preview', 'Done']" :current-step-index="0" />
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-2">Step 2 of 4</p>
          <StepIndicator :steps="['Upload', 'Map', 'Preview', 'Done']" :current-step-index="1" />
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-2">Step 3 of 4</p>
          <StepIndicator :steps="['Upload', 'Map', 'Preview', 'Done']" :current-step-index="2" />
        </div>
        <div>
          <p class="text-sm text-gray-500 mb-2">Step 4 of 4 (Complete)</p>
          <StepIndicator :steps="['Upload', 'Map', 'Preview', 'Done']" :current-step-index="3" />
        </div>
      </div>
    `,
  }),
};
