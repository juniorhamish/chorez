---
name: ui-generator
description: Generate UI components and layouts using Tailwind CSS and Radix UI primitives.
---

# Skill: Rapid UI Component Generation

## Description
Provides the agent with technical instructions, framework choices, and design tokens needed to mimic a production-grade `v0` generation loop inside the local codebase.

## Trigger Rules
- Triggered when the user asks for a layout, view, dashboard, page, component, styling tweak, or UI mockup.
- Triggered automatically by the `ux-designer` sub-agent.

## Technical Framework Stack
- **Framework**: React 19 / Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Component Primitives**: Radix UI / Shadcn UI
- **Icons**: Lucide React

## Design Token Reference
When generating layouts, always match these design semantics:
- **Spacing Scale**: Follow strict Tailwind spacing (`p-4`, `m-6`, `gap-2`). Avoid arbitrary values like `h-[342px]` unless rendering a complex canvas or chart tracking box.
- **Color Palette**: Use semantic tokens (`bg-background`, `text-foreground`, `border-input`, `bg-primary`, `text-primary-foreground`).
- **Typography**: `font-sans` for main interface, `tracking-tight` for heavy display headers, `text-muted-foreground` for secondary copy.

## Execution Flow
1. **Analyze Prompt**: Deconstruct the layout into a clear component hierarchy (e.g., Shell -> Sidebar -> Main Grid -> Cards).
2. **Draft Primitives**: Ensure atomic elements (Buttons, Inputs) use existing library primitives before creating custom wrappers.
3. **Write File**: Save the file directly to the relevant workspace directory using Junie file-writing capabilities.
4. **Initiate Verification**: Prompt the developer to run the workspace visual preview tool to inspect the output.
