# Requirements

### Overview & Goals
Introduce a task view toggle in the dashboard to allow users to switch between viewing only their own assigned tasks and all tasks for the household.

### Scope
- **In Scope**:
    - Adding a toggle/tab component for "My Tasks" vs "Household Tasks".
    - Updating the task filtering logic in `DashboardClient`.
    - Displaying assignment information (who the task is for) when in the "Household" view.
- **Out of Scope**:
    - Backend changes to task assignment logic (this remains mock data for now).
    - Persistent storage of the toggle state (e.g., in a DB or cookie).

# Technical Design

### Current Implementation
- `DashboardClient` filters `MOCK_TASKS` based on `selectedDay` and `selectedRoom`.
- `MOCK_TASKS` have an `assignedTo` field matching IDs in the `USERS` array.
- The current user's name is available via `userName` (derived from Auth0 or DB).

### Key Decisions
- **Current User Mapping**: Since tasks use mock IDs like "u1", we will treat "u1" as the logged-in user for the "My Tasks" view to maintain consistency with the existing mock data where "Alex" (u1) is the primary user.
- **UI Element**: A segmented control or tab-like toggle in the dashboard header or near the task list.
- **Visual Feedback**: When in "Household" view, task cards should clearly show who they are assigned to (e.g., via a small avatar or name tag).

### Proposed Changes
- **File**: `app/dashboard/dashboard-client.tsx`
    - Add `viewMode` state (`'mine' | 'household'`), defaulting to `'mine'`.
    - Update `filteredTasks` useMemo to include `viewMode` in the filtering logic.
    - Add a toggle UI in the dashboard.
    - Update task card rendering to show the assigned user when in `'household'` mode.

# Testing

### Validation Approach
- Toggle between "My Tasks" and "Household Tasks" and verify the list changes correctly.
- Ensure "My Tasks" only shows tasks assigned to "u1".
- Ensure "Household Tasks" shows all tasks for the selected day/room.
- Verify that the assigned user is visible on task cards in "Household" mode.

### Key Scenarios
- **Switching Views**: User clicks "Household", more tasks appear (assigned to others). User clicks "My Tasks", list shrinks back.
- **Filtering interactions**: Ensure day and room filters still work in combination with the view toggle.

# Delivery Steps

### ✓ Step 1: Add View Mode state and Toggle UI
Define the state for switching views and add the UI component.
- Add `const [viewMode, setViewMode] = useState<'mine' | 'household'>('mine');` to `DashboardClient`.
- Add a stylized toggle (e.g., using Framer Motion for smooth transitions) below the greeting or above the task list.

### ✓ Step 2: Update Filtering Logic
Incorporate `viewMode` into the `filteredTasks` calculation.
- Update the `useMemo` for `filteredTasks` to filter by `assignedTo === 'u1'` if `viewMode === 'mine'`.

### ✓ Step 3: Enhance Task Cards for Household View
Show who each task is assigned to.
- Update the task card rendering inside `DashboardClient`.
- If `viewMode === 'household'`, display a small indicator (name or avatar) of the assigned user on the task card.
- Use the `USERS` array to look up the name/color for the assigned user.
