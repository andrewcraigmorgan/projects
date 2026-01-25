import type { Meta, StoryObj } from '@storybook/vue3';
import CompleteStep from '~/components/import/CompleteStep.vue';

const meta: Meta<typeof CompleteStep> = {
  title: 'Import/CompleteStep',
  component: CompleteStep,
  tags: ['autodocs'],
  argTypes: {
    results: {
      control: 'object',
      description: 'Import results with created counts and errors',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: {
    results: {
      projects: { created: 8, errors: [] },
      tasks: { created: 156, errors: [] },
      milestones: { created: 12, errors: [] },
      tags: { created: 5, errors: [] },
    },
  },
};

export const PartialSuccess: Story = {
  args: {
    results: {
      projects: { created: 7, errors: ['Project "Test" already exists'] },
      tasks: { created: 148, errors: ['Task "Duplicate" already exists', 'Invalid date format for "Review meeting"'] },
      milestones: { created: 10, errors: [] },
    },
  },
};

export const WithErrors: Story = {
  args: {
    results: {
      projects: { created: 5, errors: ['Project "Old Project" failed: Invalid status', 'Project "Another" failed: Missing name'] },
      tasks: { created: 120, errors: ['Task at row 15: Missing title', 'Task at row 42: Invalid priority', 'Task at row 67: Project not found', 'Task at row 89: Invalid date'] },
    },
  },
};

export const MinimalImport: Story = {
  args: {
    results: {
      projects: { created: 2, errors: [] },
      tasks: { created: 15, errors: [] },
    },
  },
};

export const LargeImport: Story = {
  args: {
    results: {
      projects: { created: 25, errors: [] },
      tasks: { created: 1523, errors: ['3 tasks skipped due to missing required fields'] },
      milestones: { created: 48, errors: [] },
      tags: { created: 32, errors: [] },
    },
  },
};
