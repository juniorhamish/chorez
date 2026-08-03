import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import WeekStrip from "./WeekStrip";
import { getWeekDays, getStartOfWeek } from "@/lib/dashboard/date-utils";

const WEEK_START = getStartOfWeek(new Date("2024-06-10")); // a Monday
const WEEK_DAYS = getWeekDays(WEEK_START);

function baseProps(overrides: Partial<Parameters<typeof WeekStrip>[0]> = {}) {
  return {
    weekDays: WEEK_DAYS,
    selectedDay: WEEK_START,
    setSelectedDay: vi.fn(),
    goToPreviousDay: vi.fn(),
    goToNextDay: vi.fn(),
    goToCurrentWeek: vi.fn(),
    isCurrentWeek: false,
    weekRangeLabel: "Jun 10 - 16",
    ...overrides,
  };
}

describe("WeekStrip", () => {
  it("filters by day: clicking a day selects it", async () => {
    const user = userEvent.setup();
    const setSelectedDay = vi.fn();
    render(<WeekStrip {...baseProps({ setSelectedDay })} />);

    // Wednesday is the 3rd day (Mon, Tue, Wed) in this Mon-start week.
    const wednesday = WEEK_DAYS[2];
    await user.click(screen.getByText(wednesday.date.split(" ")[1]));

    expect(setSelectedDay).toHaveBeenCalledWith(wednesday.fullDate);
  });

  it("navigates to the previous/next day via the chevron buttons", async () => {
    const user = userEvent.setup();
    const goToPreviousDay = vi.fn();
    const goToNextDay = vi.fn();
    render(<WeekStrip {...baseProps({ goToPreviousDay, goToNextDay })} />);

    await user.click(screen.getByRole("button", { name: "Previous Day" }));
    await user.click(screen.getByRole("button", { name: "Next Day" }));

    expect(goToPreviousDay).toHaveBeenCalledTimes(1);
    expect(goToNextDay).toHaveBeenCalledTimes(1);
  });

  it("jumps back to the current week when the week label is clicked", async () => {
    const user = userEvent.setup();
    const goToCurrentWeek = vi.fn();
    render(<WeekStrip {...baseProps({ goToCurrentWeek, isCurrentWeek: false })} />);

    await user.click(screen.getByText("Jun 10 - 16"));

    expect(goToCurrentWeek).toHaveBeenCalledTimes(1);
  });

  it("disables the week label button once already on the current week", () => {
    render(<WeekStrip {...baseProps({ isCurrentWeek: true })} />);

    expect(screen.getByText("Jun 10 - 16")).toBeDisabled();
  });
});
