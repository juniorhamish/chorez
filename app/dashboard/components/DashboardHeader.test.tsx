import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardHeader from "./DashboardHeader";
import React from "react";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<"div">) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockProps = {
  greeting: "Hello",
  userName: "Alex",
  incompleteTasksCount: 5,
  viewMode: 'mine' as const,
  setViewMode: vi.fn(),
  users: [],
  households: [],
  activeHousehold: { id: "h1", name: "My Home", role: "admin" as const },
  isHouseholdMenuOpen: false,
  setIsHouseholdMenuOpen: vi.fn(),
  switchingHouseholdId: null,
  handleSwitchHousehold: vi.fn(),
  isRefreshing: false,
  handleRefresh: vi.fn(),
  openProfileSettings: vi.fn(),
  openAddTask: vi.fn(),
  openTaskLibrary: vi.fn(),
  openInviteMember: vi.fn(),
  openManageHousehold: vi.fn(),
  isHouseholdAdmin: true,
  isOptimizingSchedule: false,
  hasUndoableOptimization: false,
  onOptimizeSchedule: vi.fn(),
  onViewLastOptimization: vi.fn(),
  openHelp: vi.fn(),
};

describe("DashboardHeader", () => {
  it("renders title and greeting", () => {
    render(<DashboardHeader {...mockProps} />);
    expect(screen.getByText(/Hello, Alex!/)).toBeDefined();
  });

  it("renders Add Task button", () => {
    render(<DashboardHeader {...mockProps} />);
    expect(screen.getByLabelText("Add Task")).toBeDefined();
  });

  it("renders desktop buttons", () => {
    render(<DashboardHeader {...mockProps} />);
    // Note: In jsdom, all elements are usually "visible" unless specifically styled with display: none.
    // Testing Library doesn't know about Tailwind's hidden classes unless we load the CSS.
    expect(screen.getByLabelText("Refresh Tasks")).toBeDefined();
    expect(screen.getByLabelText("Profile Settings")).toBeDefined();
    expect(screen.getByLabelText("Task Library")).toBeDefined();
    expect(screen.getByLabelText("Help")).toBeDefined();
    expect(screen.getByLabelText("Log Out")).toBeDefined();
  });

  it("renders More options button for mobile", () => {
    render(<DashboardHeader {...mockProps} />);
    expect(screen.getByLabelText("More options")).toBeDefined();
  });

  it("opens More menu when clicked", () => {
    render(<DashboardHeader {...mockProps} />);
    const moreButton = screen.getByLabelText("More options");
    fireEvent.click(moreButton);
    
    // Check if items inside the menu are rendered
    // Since we mock AnimatePresence/motion, they should appear immediately
    expect(screen.getAllByText("Refresh Tasks").length).toBeGreaterThan(0);
    expect(screen.getByText("Profile Settings")).toBeDefined();
    expect(screen.getByText("Task Library")).toBeDefined();
    expect(screen.getByText("Help & Feedback")).toBeDefined();
    expect(screen.getByText("Log Out")).toBeDefined();
  });
});
