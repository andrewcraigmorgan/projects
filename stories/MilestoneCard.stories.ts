import type { Meta, StoryObj } from '@storybook/vue3';
import MilestoneCard from '~/components/milestones/MilestoneCard.vue';

const meta: Meta<typeof MilestoneCard> = {
  title: 'Components/MilestoneCard',
  component: MilestoneCard,
  tags: ['autodocs'],
  argTypes: {
    milestone: {
      control: 'object',
      description: 'Milestone data object',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const baseMilestone = {
  id: 'milestone-1',
  projectId: 'project-1',
  name: 'Phase 1 - MVP',
  description: 'Initial release with core features',
  status: 'active' as const,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  taskStats: {
    total: 10,
    completed: 3,
  },
};

export const Active: Story = {
  args: {
    milestone: baseMilestone,
  },
};

export const Pending: Story = {
  args: {
    milestone: {
      ...baseMilestone,
      name: 'Phase 2 - Enhancement',
      status: 'pending',
      taskStats: {
        total: 8,
        completed: 0,
      },
    },
  },
};

export const Completed: Story = {
  args: {
    milestone: {
      ...baseMilestone,
      name: 'Phase 0 - Setup',
      status: 'completed',
      taskStats: {
        total: 5,
        completed: 5,
      },
    },
  },
};

export const HighProgress: Story = {
  args: {
    milestone: {
      ...baseMilestone,
      name: 'Almost Done Sprint',
      taskStats: {
        total: 12,
        completed: 10,
      },
    },
  },
};

export const NoTasks: Story = {
  args: {
    milestone: {
      ...baseMilestone,
      name: 'Empty Milestone',
      description: 'No tasks have been added yet',
      taskStats: {
        total: 0,
        completed: 0,
      },
    },
  },
};

export const LongDescription: Story = {
  args: {
    milestone: {
      ...baseMilestone,
      name: 'Q1 2024 Release',
      description: 'This milestone includes all features planned for the first quarter of 2024, including user authentication improvements, dashboard redesign, and performance optimizations.',
      taskStats: {
        total: 25,
        completed: 8,
      },
    },
  },
};

export const AllStatuses: Story = {
  render: () => ({
    components: { MilestoneCard },
    setup() {
      const milestones = [
        { ...baseMilestone, id: '1', name: 'Pending Milestone', status: 'pending', taskStats: { total: 5, completed: 0 } },
        { ...baseMilestone, id: '2', name: 'Active Milestone', status: 'active', taskStats: { total: 10, completed: 4 } },
        { ...baseMilestone, id: '3', name: 'Completed Milestone', status: 'completed', taskStats: { total: 8, completed: 8 } },
      ];
      return { milestones };
    },
    template: `
      <div class="p-4 space-y-4 max-w-xl">
        <MilestoneCard
          v-for="milestone in milestones"
          :key="milestone.id"
          :milestone="milestone"
        />
      </div>
    `,
  }),
};
