import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePushNotifications } from "./usePushNotifications";

let cookieSetSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.restoreAllMocks();
  cookieSetSpy = vi.spyOn(document, "cookie", "set");
});

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  delete (window as unknown as Record<string, unknown>).PushManager;
});

describe("usePushNotifications", () => {
  it("reports push as unsupported and sets the timezone cookie when serviceWorker/PushManager are unavailable", () => {
    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isPushSupported).toBe(false);
    expect(result.current.isSubscribed).toBe(false);
    expect(cookieSetSpy).toHaveBeenCalledTimes(1);
    expect(cookieSetSpy.mock.calls[0][0]).toMatch(/^chorez_timezone=.*; path=\/; max-age=31536000; SameSite=Lax$/);
  });

  it("registers the service worker and reports isPushSupported + existing subscription state when supported", async () => {
    const getSubscription = vi.fn().mockResolvedValue({ endpoint: "https://push.example/1" });
    const register = vi.fn().mockResolvedValue({
      pushManager: { getSubscription },
    });
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });
    Object.defineProperty(window, "PushManager", {
      value: function () {},
      configurable: true,
    });

    const { result } = renderHook(() => usePushNotifications());

    expect(result.current.isPushSupported).toBe(true);
    await waitFor(() => expect(result.current.isSubscribed).toBe(true));
    expect(register).toHaveBeenCalledWith("/sw.js");
  });

  it("handleEnableNotifications is a no-op when push isn't supported", async () => {
    const { result } = renderHook(() => usePushNotifications());

    await act(async () => {
      await result.current.handleEnableNotifications();
    });

    expect(result.current.isSubscribing).toBe(false);
    expect(result.current.isSubscribed).toBe(false);
  });

  it("handleEnableNotifications subscribes and posts to /api/push/subscribe when permission is granted", async () => {
    const getSubscription = vi.fn().mockResolvedValue(null);
    const subscribe = vi.fn().mockResolvedValue({ endpoint: "https://push.example/2" });
    const register = vi.fn().mockResolvedValue({ pushManager: { getSubscription } });
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register,
        ready: Promise.resolve({ pushManager: { subscribe } }),
      },
      configurable: true,
    });
    Object.defineProperty(window, "PushManager", {
      value: function () {},
      configurable: true,
    });
    // @ts-expect-error jsdom doesn't implement Notification by default
    window.Notification = { requestPermission: vi.fn().mockResolvedValue("granted") };
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "QUJDRA"; // base64url for "ABCD"
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.isPushSupported).toBe(true));

    await act(async () => {
      await result.current.handleEnableNotifications();
    });

    expect(subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/subscribe",
      expect.objectContaining({ method: "POST" })
    );
    expect(result.current.isSubscribed).toBe(true);
    expect(result.current.isSubscribing).toBe(false);
  });
});
