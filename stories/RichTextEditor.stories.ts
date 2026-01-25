import type { Meta, StoryObj } from '@storybook/vue3';
import { ref } from 'vue';
import RichTextEditor from '~/components/ui/RichTextEditor.vue';

const meta: Meta<typeof RichTextEditor> = {
  title: 'UI/RichTextEditor',
  component: RichTextEditor,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'text',
      description: 'HTML content',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text when empty',
    },
    editable: {
      control: 'boolean',
      description: 'Whether the editor is editable',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => ({
    components: { RichTextEditor },
    setup() {
      const content = ref('');
      return { content };
    },
    template: `
      <div class="p-4 max-w-2xl">
        <RichTextEditor v-model="content" placeholder="Start writing..." />
      </div>
    `,
  }),
};

export const WithContent: Story = {
  render: () => ({
    components: { RichTextEditor },
    setup() {
      const content = ref('<h2>Project Overview</h2><p>This is a <strong>rich text editor</strong> with support for:</p><ul><li>Bold, italic, and strikethrough</li><li>Headings (H1, H2, H3)</li><li>Bullet and numbered lists</li><li>Code blocks</li><li>Links and images</li></ul>');
      return { content };
    },
    template: `
      <div class="p-4 max-w-2xl">
        <RichTextEditor v-model="content" />
      </div>
    `,
  }),
};

export const ReadOnly: Story = {
  render: () => ({
    components: { RichTextEditor },
    setup() {
      const content = ref('<h2>Read-Only Content</h2><p>This content cannot be edited. The toolbar is hidden and text selection still works for copying.</p><blockquote>This is useful for displaying formatted content without allowing modifications.</blockquote>');
      return { content };
    },
    template: `
      <div class="p-4 max-w-2xl">
        <RichTextEditor v-model="content" :editable="false" />
      </div>
    `,
  }),
};

export const WithCodeBlock: Story = {
  render: () => ({
    components: { RichTextEditor },
    setup() {
      const content = ref('<h3>Code Example</h3><p>Here is some inline <code>code</code> and a code block:</p><pre><code>function hello() {\n  console.log("Hello, World!");\n}</code></pre>');
      return { content };
    },
    template: `
      <div class="p-4 max-w-2xl">
        <RichTextEditor v-model="content" />
      </div>
    `,
  }),
};

export const CustomPlaceholder: Story = {
  render: () => ({
    components: { RichTextEditor },
    setup() {
      const content = ref('');
      return { content };
    },
    template: `
      <div class="p-4 max-w-2xl">
        <RichTextEditor v-model="content" placeholder="Describe the task in detail..." />
      </div>
    `,
  }),
};
