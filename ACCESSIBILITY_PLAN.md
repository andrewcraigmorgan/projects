# Accessibility Remediation Plan

A prioritized plan to address accessibility issues across all components.

---

## Phase 1: Foundation (High Impact, Low Effort)

These fixes establish patterns used throughout the codebase and have immediate screen reader impact.

### 1.1 Loading & Status Indicators
- [ ] **LoadingSpinner.vue** - Add `role="status"` and `aria-label="Loading"`
- [ ] **Button.vue** - Add `aria-busy="true"` and `aria-disabled` when loading/disabled

### 1.2 Decorative Icons
- [ ] Add `aria-hidden="true"` to all decorative SVGs in:
  - EmptyState.vue
  - StatCard.vue
  - StepIndicator.vue (checkmark)
  - TaskCard.vue (checkmark, drag handle)

### 1.3 Icon-Only Buttons
- [ ] Add `aria-label` to all icon-only buttons:
  - TaskCard.vue (copy ID button)
  - TaskTable.vue (configure columns)
  - TagCard.vue (edit, color picker)
  - MilestoneCard.vue (edit)
  - ProjectMembers.vue (invite)
  - Sidebar.vue (logout)
  - RichTextEditor.vue (all toolbar buttons)

---

## Phase 2: Forms & Inputs (High Impact, Medium Effort)

Form accessibility is critical for task management functionality.

### 2.1 Input Component
- [ ] **Input.vue**
  - Add `aria-required` when required prop is true
  - Add `aria-invalid="true"` when error exists
  - Add `aria-describedby` linking to error message
  - Add `role="alert"` to error message element
  - Support `aria-label` prop for inputs without visible labels

### 2.2 Form Components
- [ ] **TaskQuickAdd.vue** - Add `aria-label` to input field
- [ ] **TaskForm.vue** - Add labels/aria-labels to all fields, error handling
- [ ] **InviteMemberModal.vue** - Add `role="alert"` to error/success messages

### 2.3 Rich Text Editor
- [ ] **RichTextEditor.vue**
  - Add `aria-label` to all toolbar buttons
  - Add `aria-pressed` for toggle buttons (bold, italic, etc.)
  - Add `role="toolbar"` with `aria-label` to toolbar container
  - Properly hide file input from accessibility tree

---

## Phase 3: Modal & Dialog (High Impact, Medium Effort)

Modals are used frequently and need proper focus management.

### 3.1 Modal Component
- [ ] **Modal.vue**
  - Add `role="dialog"` and `aria-modal="true"`
  - Add `aria-labelledby` pointing to title
  - Implement focus trap (trap focus within modal when open)
  - Handle Escape key to close
  - Return focus to trigger element on close

### 3.2 Replace Native Dialogs
- [ ] Replace `window.confirm()` with accessible Modal in:
  - MilestoneCard.vue (delete confirmation)
  - TagCard.vue (delete confirmation)

### 3.3 Context Menu
- [ ] **TaskContextMenu.vue**
  - Add `role="menu"` to container
  - Add `role="menuitem"` to items
  - Add keyboard navigation (Escape to close, arrow keys)

---

## Phase 4: Select & Dropdown (High Impact, High Effort)

Custom dropdowns are complex but heavily used.

### 4.1 Select Component
- [ ] **Select.vue**
  - Add `role="combobox"` to trigger button
  - Add `aria-expanded`, `aria-haspopup="listbox"`
  - Add `role="listbox"` to dropdown panel
  - Add `role="option"` and `aria-selected` to options
  - Add `aria-label` to search input
  - Implement arrow key navigation
  - Add Home/End key support

### 4.2 Date Picker
- [ ] **DatePicker.vue**
  - Add `aria-haspopup="dialog"` and `aria-expanded` to trigger
  - Add `aria-label` to quick date buttons
  - Add proper labeling to custom date input

---

## Phase 5: Navigation & Layout (Medium Impact, Low Effort)

Improve landmark structure for screen reader navigation.

### 5.1 Semantic Landmarks
- [ ] **Sidebar.vue** - Wrap navigation in `<nav>` element
- [ ] **ProjectNav.vue** - Use `<nav>` with `role="tablist"`

### 5.2 Current Page Indication
- [ ] **Sidebar.vue** - Add `aria-current="page"` to active nav link
- [ ] **ProjectNav.vue** - Add `aria-selected` to active tab

### 5.3 Skip Links
- [ ] Add skip navigation link to main layout (skip to main content)

---

## Phase 6: Tables & Lists (Medium Impact, Medium Effort)

Improve data table and list accessibility.

### 6.1 Task Table
- [ ] **TaskTable.vue**
  - Add `scope="col"` to column headers
  - Add `aria-sort` attribute to sortable columns
  - Add `aria-label` to table describing its purpose
  - Announce sort changes with `aria-live` region

### 6.2 Semantic Lists
- [ ] Convert div-based lists to `<ul>/<li>` in:
  - TaskList.vue
  - ProjectMembers.vue
  - InviteMemberModal.vue (pending invitations)

---

## Phase 7: Cards & Progress (Low Impact, Low Effort)

Improve semantic structure of card components.

### 7.1 Card Components
- [ ] **Card.vue** - Use `<article>` or add `role="region"` with `aria-label`
- [ ] **TaskCard.vue** - Add `aria-expanded` to expand button
- [ ] **StatCard.vue** - Consider `role="status"` for dynamic values

### 7.2 Progress Indicators
- [ ] **MilestoneCard.vue** - Add `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- [ ] **StepIndicator.vue** - Add `aria-current="step"` to current step

---

## Phase 8: Drag & Drop (Medium Impact, High Effort)

Provide keyboard alternatives for drag-and-drop functionality.

### 8.1 Keyboard Alternatives
- [ ] **TaskBoard.vue** - Add keyboard controls to move tasks between columns
- [ ] **TaskList.vue** - Add keyboard controls to reorder tasks
- [ ] **TaskTable.vue** - Add keyboard reordering support

### 8.2 Implementation Options
- Option A: Arrow keys with modifier (e.g., Ctrl+Arrow to move)
- Option B: Action menu with "Move to..." options
- Option C: Both approaches for different user preferences

### 8.3 Announcements
- [ ] Add `aria-live` region to announce task movements
- [ ] Provide clear instructions for keyboard users

---

## Phase 9: Color & Visual (Low Impact, Medium Effort)

Ensure information isn't conveyed by color alone.

### 9.1 Color Independence
- [ ] **TagCard.vue** - Add text labels or patterns alongside colors
- [ ] Role badges - Add icons or text alongside color coding
- [ ] Priority indicators - Ensure text/icon backup for colors

### 9.2 Reduced Motion
- [ ] Add `prefers-reduced-motion` media query support
- [ ] Provide option to disable animations

---

## Phase 10: Testing & Documentation

### 10.1 Automated Testing
- [ ] Add axe-core or similar for automated a11y testing
- [ ] Add a11y checks to CI pipeline

### 10.2 Manual Testing
- [ ] Test with screen readers (NVDA, VoiceOver)
- [ ] Test keyboard-only navigation
- [ ] Test with browser zoom (200%)

### 10.3 Documentation
- [ ] Document keyboard shortcuts
- [ ] Create accessibility statement
- [ ] Add a11y props documentation to component library

---

## Priority Summary

| Phase | Impact | Effort | Components |
|-------|--------|--------|------------|
| 1. Foundation | High | Low | 6 |
| 2. Forms | High | Medium | 4 |
| 3. Modals | High | Medium | 4 |
| 4. Select | High | High | 2 |
| 5. Navigation | Medium | Low | 2 |
| 6. Tables | Medium | Medium | 3 |
| 7. Cards | Low | Low | 4 |
| 8. Drag & Drop | Medium | High | 3 |
| 9. Color | Low | Medium | 3 |
| 10. Testing | High | Medium | - |

---

## Recommended Order

1. **Phase 1** → Quick wins, immediate impact
2. **Phase 2** → Forms are core functionality
3. **Phase 3** → Modals block interaction if inaccessible
4. **Phase 5** → Low effort, improves navigation
5. **Phase 4** → High effort but Select is used everywhere
6. **Phase 6** → Tables display primary data
7. **Phase 7** → Polish card components
8. **Phase 9** → Color independence
9. **Phase 8** → Drag-and-drop is enhancement, not critical path
10. **Phase 10** → Ongoing testing and maintenance
