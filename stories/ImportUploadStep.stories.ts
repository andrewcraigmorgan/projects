import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import UploadStep from '~/components/import/UploadStep.vue';

const meta: Meta<typeof UploadStep> = {
  title: 'Import/UploadStep',
  component: UploadStep,
  tags: ['autodocs'],
  argTypes: {
    tasksFile: {
      control: 'object',
      description: 'Selected tasks CSV file',
    },
    projectsFile: {
      control: 'object',
      description: 'Selected projects CSV file',
    },
    parsedTasksCount: {
      control: 'number',
      description: 'Number of tasks found in the CSV',
    },
    parsedProjectsCount: {
      control: 'number',
      description: 'Number of projects found in the CSV',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {
  args: {
    tasksFile: null,
    projectsFile: null,
    parsedTasksCount: 0,
    parsedProjectsCount: 0,
  },
};

export const WithTasksFile: Story = {
  args: {
    tasksFile: { name: 'tasks.csv' } as File,
    projectsFile: null,
    parsedTasksCount: 156,
    parsedProjectsCount: 0,
  },
};

export const WithBothFiles: Story = {
  args: {
    tasksFile: { name: 'tasks.csv' } as File,
    projectsFile: { name: 'projects.csv' } as File,
    parsedTasksCount: 156,
    parsedProjectsCount: 8,
  },
};

export const Interactive: Story = {
  render: () => ({
    components: { UploadStep },
    setup() {
      const tasksFile = ref<File | null>(null);
      const projectsFile = ref<File | null>(null);
      const parsedTasksCount = ref(0);
      const parsedProjectsCount = ref(0);

      function handleTasksFile(file: File) {
        tasksFile.value = file;
        // Simulate parsing
        parsedTasksCount.value = Math.floor(Math.random() * 200) + 50;
      }

      function handleProjectsFile(file: File) {
        projectsFile.value = file;
        parsedProjectsCount.value = Math.floor(Math.random() * 20) + 5;
      }

      function handleContinue() {
        console.log('Continue to next step');
      }

      return {
        tasksFile,
        projectsFile,
        parsedTasksCount,
        parsedProjectsCount,
        handleTasksFile,
        handleProjectsFile,
        handleContinue,
      };
    },
    template: `
      <div class="p-4 max-w-2xl">
        <UploadStep
          :tasks-file="tasksFile"
          :projects-file="projectsFile"
          :parsed-tasks-count="parsedTasksCount"
          :parsed-projects-count="parsedProjectsCount"
          @tasks-file="handleTasksFile"
          @projects-file="handleProjectsFile"
          @continue="handleContinue"
        />
      </div>
    `,
  }),
};
