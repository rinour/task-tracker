---
name: Vietnamese Productivity Engine
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#0058be'
  on-secondary: '#ffffff'
  secondary-container: '#2170e4'
  on-secondary-container: '#fefcff'
  tertiary: '#3a495f'
  on-tertiary: '#ffffff'
  tertiary-container: '#516177'
  on-tertiary-container: '#ccdcf7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#d8e2ff'
  secondary-fixed-dim: '#adc6ff'
  on-secondary-fixed: '#001a42'
  on-secondary-fixed-variant: '#004395'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Be Vietnam Pro
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Be Vietnam Pro
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0.005em
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The brand personality centers on quiet efficiency, deliberate speed, and professional precision tailored for modern Vietnamese product teams, tech-forward agencies, and knowledge workers. The UI creates a focused, calm workspace—eliminating decorative clutter so high-velocity task management feels effortless.

Drawing influence from high-performance desktop productivity platforms like Linear and Asana, the design language applies a **Refined Modern Minimalist** aesthetic:
- **High-density scannability**: Strict spatial balance allowing extensive task data on screen without cognitive fatigue.
- **Micro-tactility**: Subtle interactive states, crisp hairline borders, and purposeful contrast indicators instead of heavy structural dividers.
- **Native Vietnamese typographic harmony**: Balanced diacritical mark clearances avoiding clipped accents while maintaining tight line-height dynamics.

## Colors
The color architecture reinforces clarity and priority sorting through purposeful semantic tiers on a crisp neutral canvas.

### Core Canvas
- **Background (`#F8FAFC`)**: Canvas slate that prevents eye strain during prolonged screen sessions.
- **Surface / Cards (`#FFFFFF`)**: Pure white containers creating immediate layer separation over canvas slate.
- **Dividers & Hairlines (`#E2E8F0`)**: Restrained structural framing for rows, table columns, and view panels.

### Typography & Content
- **Main Text (`#0F172A`)**: High-contrast, slate-tinted black for primary readability and task titles.
- **Secondary Text (`#64748B`)**: Balanced medium-gray for secondary metadata, project tags, and timestamps.
- **Muted Text (`#94A3B8`)**: Placeholders and empty state cues.

### Brand & Interactive
- **Primary Interactive (`#4F46E5`)**: Indigo 600 reserved for primary actions, selected navigation states, and active workflows.
- **Primary Hover / Pressed (`#4338CA`)**: Deeper indigo feedback for interactive clickdown states.

### Status & Priority Semantics
- **Đang thực hiện (In Progress / Active Accent)**: `#3B82F6` (Blue 500)
- **Hoàn thành (Done / Success)**: `#16A34A` (Green 600)
- **Cần chú ý / Trung bình (Warning / Medium)**: `#F59E0B` (Amber 500)
- **Quá hạn / Khẩn cấp (Danger / Overdue / High)**: `#DC2626` (Red 600)

## Typography
`Be Vietnam Pro` serves as the primary system typeface. Engineered specifically for the Vietnamese language, it provides natural handling of circumflexes, horns, and stacked tone marks (hỏi, ngã, nặng) without awkward line-spacing inflation or text-box clipping.

### Hierarchy Application
- **Display & Large Headlines**: Project overview dashboards and workspace switchers.
- **Headline Medium / Small**: Board column headers ("Cần làm", "Đang thực hiện", "Hoàn thành") and modal sheet titles.
- **Body Medium (`13px`)**: Default task row size for desktop data density, yielding compact scannability while remaining legible.
- **Label Small**: Compact priority badges, status pills, and meta tags.
- **Code Mono**: System identifiers, branch references, and task IDs (e.g., `TASK-1024`).

## Layout & Spacing
Built on a strict **8px base grid** (with 4px micro-steps for compact list densities and metadata tag padding).

### Layout System
- **Desktop Architecture (≥ 1280px)**: Three-zone productivity layout:
  1. Left collapsible rail: 240px wide for workspaces, views, and projects.
  2. Center workspace: Multi-column fluid canvas (Board, List, Timeline views).
  3. Context slide-over drawer: 480px fixed-width drawer for deep task inspection and comment threads.
- **Tablet (768px - 1279px)**: Navigation drawer collapses into an icon-rail (64px) or slide-in flyout; board columns scroll horizontally.
- **Mobile (< 768px)**: Single-column view with bottom navigation, full-screen detail views, and sticky quick-action bars.

### Content Spacing
- Internal task cards apply `space-sm` (`8px`) vertical and `space-md` (`16px`) horizontal padding.
- Kanbans use `gutter` (`16px`) between columns.
- Table list rows maintain a standard `36px` to `40px` row height.

## Elevation & Depth
This design system avoids heavy drop shadows, relying on layered surface tones and subtle hairline boundaries to preserve a fast, tactile desktop feel.

### Depth Levels
- **Level 0 (Base Canvas)**: `#F8FAFC`. Unelevated foundation.
- **Level 1 (Cards, Table Rows, Panels)**: `#FFFFFF` surface with a `1px solid #E2E8F0` border. Zero shadow in idle state.
- **Level 2 (Hovered Card / Active Drag)**: `1px solid #CBD5E1`, with shadow `0 4px 12px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(15, 23, 42, 0.03)`.
- **Level 3 (Context Menus, Popovers, Dropdowns)**: `#FFFFFF` surface, `1px solid #E2E8F0`, shadow `0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)`.
- **Level 4 (Modal Dialogs & Command Bar `Ctrl+K`)**: Centered floating overlay, `#FFFFFF`, shadow `0 20px 30px -10px rgba(15, 23, 42, 0.16)`. Backdrop overlay using `#0F172A` at 40% opacity with a `2px` blur.

## Shapes
The shape system balances modern softness with structured spatial discipline.

- **Base Radius (`rounded-md`, 8px - 10px)**: Primary form inputs, dropdown containers, list items, and desktop task cards.
- **Container Radius (`rounded-lg`, 12px - 14px)**: Modals, board columns, floating popovers, and slide-in panels.
- **Micro Radius (`rounded-sm`, 4px - 6px)**: Checkboxes, keyboard shortcut badges (`Kbd`), and inline code chips.
- **Full Radius (`rounded-full`, 9999px)**: User avatar rings, status indicator dots, and pill tags.

## Components

### Buttons
- **Primary ("Tạo công việc", "Lưu thay đổi")**: Background `#4F46E5`, text `#FFFFFF`, radius `8px`, height `36px` (desktop compact) or `40px` (mobile). Hover: `#4338CA`. Active: scale `0.99`. Focus: outline `2px solid #818CF8`, offset `2px`.
- **Secondary ("Hủy", "Tùy chọn")**: Background `#FFFFFF`, border `1px solid #E2E8F0`, text `#0F172A`. Hover: `#F1F5F9`.
- **Ghost / Subtle ("Thêm tiêu chí")**: Transparent background, text `#64748B`. Hover: `#F1F5F9`, text `#0F172A`.
- **Danger ("Xóa công việc")**: Background `#FEE2E2`, text `#DC2626`. Hover: `#DC2626`, text `#FFFFFF`.

### Chips & Badges (Priority & Status)
Compact `22px` height, `rounded-full` or `rounded-md`, `label-sm` typography:
- **Ưu tiên Khẩn cấp / Cao**: Background `#FEF2F2`, text `#DC2626`, border `1px solid #FCA5A5`.
- **Ưu tiên Trung bình**: Background `#FFFBEB`, text `#D97706`, border `1px solid #FCD34D`.
- **Ưu tiên Thấp**: Background `#F1F5F9`, text `#475569`, border `1px solid #CBD5E1`.
- **Trạng thái Cần làm**: Background `#F8FAFC`, text `#475569`, border `1px solid #E2E8F0`.
- **Trạng thái Đang thực hiện**: Background `#EFF6FF`, text `#2563EB`, border `1px solid #BFDBFE`.
- **Trạng thái Hoàn thành**: Background `#F0FDF4`, text `#16A34A`, border `1px solid #BBF7D0`.

### Task Checkboxes & Status Toggles
- `18px x 18px` square with `4px` corner radius.
- Unchecked: `1.5px solid #CBD5E1`, background `#FFFFFF`. Hover: border `#4F46E5`.
- Checked: Background `#16A34A`, border `#16A34A`, centered white micro checkmark with smooth pop animation.

### Input Fields & Search Bars
- Standard input height `36px`, border `1px solid #E2E8F0`, radius `8px`, padding `0 12px`, text `#0F172A`.
- Placeholder `#94A3B8`.
- Focus state: border `#4F46E5`, subtle outer glow `0 0 0 3px rgba(79, 70, 229, 0.12)`.

### Cards & Board Columns
- **Board Column Container**: Background `#F1F5F9` (slate 100) or transparent, width `320px`, padding `8px`, header displays status title with task count badge (e.g., "Đang thực hiện 4").
- **Task Card**: Background `#FFFFFF`, border `1px solid #E2E8F0`, radius `10px`, padding `12px`. Contains: Title, task ID tag, priority chip, due date indicator (red text if past due date), and assignee avatar stack (`24px` circles).

### Productivity Specific Components
- **Command Palette (`Ctrl + K` / `Cmd + K`)**: Modal centered at upper third of viewport, includes dynamic search filter for tasks, projects ("Dự án"), and members ("Thành viên").
- **Quick-Add Task Row**: Inline ghost row allowing single-keystroke creation with `@` mention for assignees and `#` for tags.