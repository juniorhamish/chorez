# Requirements

### Overview & Goals
Allow users to update their name in the application. By default, new users sign up using Auth0 and their name is set to their email address. We need to provide a UI to change this and a backend mechanism to persist the change.

### Scope
- **In Scope**:
    - Adding a settings/profile UI for name updates (via `ux-designer`).
    - Implementing the backend plumbing to save the name change (in the database or Auth0).
    - Reflecting the updated name in the dashboard greeting.
- **Out of Scope**:
    - Updating other profile fields (avatar, etc.) unless requested.
    - Full account management (password reset, etc.).

# Technical Design

### Current Implementation
- `DashboardClient` uses `useUser()` from `@auth0/nextjs-auth0/client`.
- Greeting is `Good morning, {userName}! 👋`.
- Database schema exists with a `users` table containing `full_name`.

### Key Decisions
- **Source of Truth**: We will store the name in the application's database (`users` table).
- **Backend Communication**: Use Next.js Server Actions to update the user profile.
- **Matching Strategy**: Match Auth0 `user.email` with the `users` table's `email` field.
- **UI Integration**: `ux-designer` will provide the design for the update name feature.

### Proposed Changes
- **Database**: Use existing `users` table.
- **Server Action**: Create a Server Action to update the `full_name` for a given user email.
- **Dashboard UI**:
    - Add a "Settings" button or integrate with the existing "UserIcon" button.
    - Show a modal or section to edit the name.
- **Greeting Logic**: Update the greeting to prefer the DB name if available, otherwise fall back to Auth0 name.

# Testing

### Validation Approach
- Verify that the new name is saved to the database.
- Verify that the dashboard reflects the new name after a refresh or update.
- Verify that the fallback to email works if no name is set.

### Key Scenarios
- **Name Update**: User enters a new name and saves. Greeting updates.
- **Empty Name**: Ensure the UI handles empty inputs gracefully.

# Delivery Steps

### ✓ Step 1: Design the Name Update UI
Use `ux-designer` to generate a name update interface within the dashboard.
- Prompt `ux-designer` to add a settings modal or a profile section to `app/dashboard/dashboard-client.tsx`.

### ✓ Step 2: Create Server Action for Name Update
Implement a server-side function to update the database.
- Create `lib/actions/user-actions.ts`.
- Implement `updateUserName` using the Neon database client.

### ✓ Step 3: Integrate UI with Server Action
Connect the generated UI to the Server Action.
- Update `app/dashboard/dashboard-client.tsx` to call the Server Action.
- Handle loading and success states.

### ✓ Step 4: Update Greeting to use DB Name
Ensure the greeting reflects the name stored in the database.
- Fetch the user record from the DB in `DashboardClient` or pass it down from the server component.
- Priority: DB Name > Auth0 name/given_name.
