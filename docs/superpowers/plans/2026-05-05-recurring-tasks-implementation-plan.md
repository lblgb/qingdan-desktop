# Recurring Tasks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an independent recurring-task subsystem with period progress records and upgrade application time semantics to minute-level precision.

**Architecture:** Add a new `recurring` domain alongside existing tasks, with separate SQLite tables and Tauri commands for recurring templates, generated periods, and progress entries. Keep existing task UI and storage intact while upgrading reminder, display, and overdue logic to compare full timestamps and format time to the minute.

**Tech Stack:** Tauri 2, Rust, SQLite, React 19, TypeScript, Zustand, Vitest

---

## File Structure

- `src-tauri/src/models/mod.rs`
  - Add recurring domain request/response types.
- `src-tauri/src/db/mod.rs`
  - Add recurring table creation and migrations.
- `src-tauri/src/commands/recurring.rs`
  - Add recurring CRUD, period generation, and progress entry commands.
- `src-tauri/src/commands/mod.rs`
  - Export recurring commands.
- `src-tauri/src/lib.rs`
  - Register recurring commands.
- `src-tauri/src/db/tests.rs`
  - Add migration and persistence tests for recurring tables.
- `src-tauri/src/commands/tasks.rs`
  - Upgrade date-range and overdue comparisons to preserve minute precision where needed.
- `src/features/recurring/recurring.types.ts`
  - Add frontend recurring types.
- `src/features/recurring/recurring.storage.ts`
  - Add Tauri/local storage bridge for recurring commands.
- `src/features/recurring/recurring.storage.test.ts`
  - Add storage contract tests.
- `src/features/recurring/recurring.reminders.ts`
  - Derive recurring overdue / pending submission reminder buckets.
- `src/features/recurring/recurring.reminders.test.ts`
  - Add reminder derivation tests.
- `src/features/recurring/recurring.overview.ts`
  - Build recurring summary snapshot.
- `src/features/recurring/recurring.overview.test.ts`
  - Add recurring overview tests.
- `src/lib/date.ts`
  - Upgrade shared date formatting helpers to minute precision.
- `src/features/tasks/task.reminders.ts`
  - Reuse shared time formatting and keep reminder comparison precise to the minute.
- `src/features/tasks/task.overview.ts`
  - Keep day-level aggregation explicit while avoiding accidental date-only semantics in minute-sensitive logic.
- `src/stores/taskStore.ts`
  - Add recurring state slice and actions or co-located state block.
- `src/components/RecurringTaskCenter.tsx`
  - New primary UI for recurring task management.
- `src/components/RecurringTaskCenter.test.tsx`
  - Add UI interaction tests.
- `src/components/TaskOverview.tsx`
  - Read recurring summary only.
- `src/app/AppShell.tsx`
  - Add recurring entry to the top action cluster.
- `docs/ARCHITECTURE.md`
  - Record recurring subsystem and minute-level time semantics.
- `docs/WORKLOG.md`
  - Record implementation notes.

## Tasks

### Task 1: Define recurring backend model with tests first

- [ ] Write failing Rust DB/command tests for recurring tables, current period generation, and progress-entry persistence.
- [ ] Run the targeted Rust tests and confirm they fail for missing recurring structures.
- [ ] Implement recurring SQLite tables and Rust model structs with the minimum fields from the design.
- [ ] Re-run the targeted Rust tests and confirm they pass.

### Task 2: Implement recurring command layer with tests first

- [ ] Write failing Rust command tests for creating a recurring task, listing periods, adding progress, and deriving submitted status from entry existence.
- [ ] Run the targeted Rust tests and confirm they fail for missing command behavior.
- [ ] Implement the minimum recurring commands and period-advancement logic needed to satisfy the tests.
- [ ] Re-run the targeted Rust tests and confirm they pass.

### Task 3: Add frontend recurring storage and derivation with tests first

- [ ] Write failing Vitest tests for recurring storage contracts, reminder derivation, and overview summary.
- [ ] Run the targeted Vitest tests and confirm they fail.
- [ ] Implement `src/features/recurring` storage, reminder, and overview modules with minimal code.
- [ ] Re-run the targeted Vitest tests and confirm they pass.

### Task 4: Add recurring UI and store integration with tests first

- [ ] Write failing component/store tests for opening the recurring center, rendering current periods, and editing progress entries.
- [ ] Run the targeted Vitest tests and confirm they fail.
- [ ] Implement the recurring UI entry, center component, and store integration.
- [ ] Re-run the targeted Vitest tests and confirm they pass.

### Task 5: Upgrade existing task time semantics to minute precision with tests first

- [ ] Write failing tests for minute-level date formatting, reminder labels, and overdue detection around same-day different-minute boundaries.
- [ ] Run the targeted Vitest tests and confirm they fail.
- [ ] Implement the minimum changes in shared date helpers, reminders, and overview logic to satisfy the tests.
- [ ] Re-run the targeted Vitest tests and confirm they pass.

### Task 6: Verify integrated behavior and update docs

- [ ] Run `npm test` and confirm the full frontend suite passes.
- [ ] Run `npm run build` and confirm the frontend build passes.
- [ ] Run `cargo test` in `src-tauri` and confirm the Rust suite passes.
- [ ] Update architecture/worklog docs to reflect the recurring subsystem and minute-level time semantics.
