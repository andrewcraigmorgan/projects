import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import MappingStep from '~/components/import/MappingStep.vue';

const meta: Meta<typeof MappingStep> = {
  title: 'Import/MappingStep',
  component: MappingStep,
  tags: ['autodocs'],
  argTypes: {
    taskColumns: {
      control: 'object',
      description: 'Columns found in the tasks CSV',
    },
    projectColumns: {
      control: 'object',
      description: 'Columns found in the projects CSV',
    },
    taskColumnMap: {
      control: 'object',
      description: 'Current task column mappings',
    },
    projectColumnMap: {
      control: 'object',
      description: 'Current project column mappings',
    },
    hasProjectsFile: {
      control: 'boolean',
      description: 'Whether a projects file was uploaded',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const systemTaskFields = [
  { key: 'title', label: 'Title', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'project', label: 'Project', required: true },
  { key: 'status', label: 'Status', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'dueDate', label: 'Due Date', required: false },
  { key: 'assignee', label: 'Assignee', required: false },
];

const systemProjectFields = [
  { key: 'name', label: 'Project Name', required: true },
  { key: 'code', label: 'Project Code', required: false },
  { key: 'description', label: 'Description', required: false },
];

const sampleTaskColumns = ['Task Name', 'Details', 'Project', 'State', 'Urgency', 'Deadline', 'Owner', 'Notes'];
const sampleProjectColumns = ['Name', 'Code', 'Description', 'Client', 'Start Date'];

export const TasksOnly: Story = {
  args: {
    taskColumns: sampleTaskColumns,
    projectColumns: [],
    taskColumnMap: {
      title: 'Task Name',
      description: 'Details',
      project: 'Project',
    },
    projectColumnMap: {},
    systemTaskFields,
    systemProjectFields,
    hasProjectsFile: false,
  },
};

export const WithProjects: Story = {
  args: {
    taskColumns: sampleTaskColumns,
    projectColumns: sampleProjectColumns,
    taskColumnMap: {
      title: 'Task Name',
      description: 'Details',
      project: 'Project',
      status: 'State',
      priority: 'Urgency',
      dueDate: 'Deadline',
    },
    projectColumnMap: {
      name: 'Name',
      code: 'Code',
      description: 'Description',
    },
    systemTaskFields,
    systemProjectFields,
    hasProjectsFile: true,
  },
};

export const EmptyMappings: Story = {
  args: {
    taskColumns: sampleTaskColumns,
    projectColumns: [],
    taskColumnMap: {},
    projectColumnMap: {},
    systemTaskFields,
    systemProjectFields,
    hasProjectsFile: false,
  },
};

export const Interactive: Story = {
  render: () => ({
    components: { MappingStep },
    setup() {
      const taskColumnMap = ref({
        title: 'Task Name',
        project: 'Project',
      });
      const projectColumnMap = ref({});

      function updateTaskMap(value: Record<string, string>) {
        taskColumnMap.value = value;
      }

      function updateProjectMap(value: Record<string, string>) {
        projectColumnMap.value = value;
      }

      return {
        taskColumnMap,
        projectColumnMap,
        updateTaskMap,
        updateProjectMap,
        sampleTaskColumns,
        systemTaskFields,
        systemProjectFields,
      };
    },
    template: `
      <div class="p-4 max-w-3xl">
        <MappingStep
          :task-columns="sampleTaskColumns"
          :project-columns="[]"
          :task-column-map="taskColumnMap"
          :project-column-map="projectColumnMap"
          :system-task-fields="systemTaskFields"
          :system-project-fields="systemProjectFields"
          :has-projects-file="false"
          @update:task-column-map="updateTaskMap"
          @update:project-column-map="updateProjectMap"
          @back="() => console.log('Back')"
          @continue="() => console.log('Continue')"
        />
      </div>
    `,
  }),
};
