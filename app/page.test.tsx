import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useUserMock = vi.fn();
vi.mock("@auth0/nextjs-auth0/client", () => ({
  useUser: () => useUserMock(),
}));

const { default: LandingPage } = await import("./page");

describe("LandingPage", () => {
  beforeEach(() => {
    useUserMock.mockReset();
    useUserMock.mockReturnValue({ user: null, isLoading: false });
  });

  it("renders the main headings and CTAs unchanged", () => {
    render(<LandingPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: /Chores, actually done\./i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /One place to run the whole home\./i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Up and running in three steps/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: /Ready to get your household in sync\?/i })
    ).toBeInTheDocument();

    // "Get Started" CTAs appear in the navbar, hero, and CTA banner.
    expect(screen.getAllByRole("link", { name: /Get Started/i }).length).toBeGreaterThanOrEqual(3);
  });

  it("shows a Log In link (pointing at the login route) when logged out", () => {
    useUserMock.mockReturnValue({ user: null, isLoading: false });
    render(<LandingPage />);

    const loginLinks = screen.getAllByRole("link", { name: /Log In/i });
    expect(loginLinks.length).toBeGreaterThanOrEqual(2);
    loginLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/auth/login?returnTo=/dashboard");
    });
    expect(screen.queryByRole("link", { name: /Log Out/i })).not.toBeInTheDocument();
  });

  it("shows a Log Out link (pointing at the logout route) when logged in", () => {
    useUserMock.mockReturnValue({ user: { name: "Alice" }, isLoading: false });
    render(<LandingPage />);

    const logoutLinks = screen.getAllByRole("link", { name: /Log Out/i });
    expect(logoutLinks.length).toBeGreaterThanOrEqual(2);
    logoutLinks.forEach((link) => {
      expect(link).toHaveAttribute("href", "/auth/logout");
    });
    expect(screen.queryByRole("link", { name: /Log In/i })).not.toBeInTheDocument();
  });

  it("renders no login/logout link while the auth state is loading", () => {
    useUserMock.mockReturnValue({ user: null, isLoading: true });
    render(<LandingPage />);

    expect(screen.queryByRole("link", { name: /Log In/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Log Out/i })).not.toBeInTheDocument();
  });
});
