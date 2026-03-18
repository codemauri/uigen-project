import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";

// ── Hoisted mock references ───────────────────────────────────────────────
// vi.hoisted ensures these are available when vi.mock factories run (which are
// hoisted before imports by vitest's transform).

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

// ── Import mocked modules for assertion ───────────────────────────────────

import { signIn as signInAction, signUp as signUpAction } from "@/actions";
import { getAnonWorkData, clearAnonWork } from "@/lib/anon-work-tracker";
import { getProjects } from "@/actions/get-projects";
import { createProject } from "@/actions/create-project";

const mockSignInAction = vi.mocked(signInAction);
const mockSignUpAction = vi.mocked(signUpAction);
const mockGetAnonWorkData = vi.mocked(getAnonWorkData);
const mockClearAnonWork = vi.mocked(clearAnonWork);
const mockGetProjects = vi.mocked(getProjects);
const mockCreateProject = vi.mocked(createProject);

// ── Fixtures ───────────────────────────────────────────────────────────────

const anonWork = {
  messages: [{ role: "user", content: "hello" }],
  fileSystemData: { "/src/App.tsx": { type: "file", content: "export default () => <div/>" } },
};

// ── Lifecycle ─────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAnonWorkData.mockReturnValue(null);
  mockGetProjects.mockResolvedValue([]);
  mockCreateProject.mockResolvedValue({ id: "proj-new" } as any);
});

afterEach(() => {
  cleanup();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe("useAuth — initial state", () => {
  test("isLoading starts as false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
  });

  test("exposes signIn, signUp, and isLoading", () => {
    const { result } = renderHook(() => useAuth());
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
    expect(typeof result.current.isLoading).toBe("boolean");
  });
});

// ── signIn ────────────────────────────────────────────────────────────────

describe("useAuth — signIn", () => {
  test("returns the action result on success", async () => {
    mockSignInAction.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuth());

    let response: any;
    await act(async () => {
      response = await result.current.signIn("user@example.com", "password123");
    });

    expect(response).toEqual({ success: true });
  });

  test("returns the action result on failure", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });
    const { result } = renderHook(() => useAuth());

    let response: any;
    await act(async () => {
      response = await result.current.signIn("user@example.com", "wrong");
    });

    expect(response).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("does not navigate when sign-in fails", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "Invalid credentials" });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "wrong");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("resets isLoading to false after sign-in completes", async () => {
    mockSignInAction.mockResolvedValue({ success: false, error: "bad" });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("sets isLoading to true while sign-in is in-flight", async () => {
    let resolveAction!: (v: any) => void;
    mockSignInAction.mockReturnValue(new Promise((res) => { resolveAction = res; }));
    const { result } = renderHook(() => useAuth());

    // Fire signIn without awaiting so we can check intermediate state
    let signInDone = false;
    act(() => {
      result.current.signIn("user@example.com", "password123").then(() => {
        signInDone = true;
      });
    });

    // isLoading should flip to true once the state update flushes
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    // Resolve the pending action and wait for the hook to finish
    await act(async () => {
      resolveAction({ success: false, error: "bad" });
    });

    expect(result.current.isLoading).toBe(false);
    expect(signInDone).toBe(true);
  });

  describe("post-sign-in navigation", () => {
    test("creates project from anon work and navigates to it", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "proj-anon" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-anon");
      // Should not fetch existing projects when anon work is present
      expect(mockGetProjects).not.toHaveBeenCalled();
    });

    test("navigates to most recent project when no anon work exists", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "proj-recent" }, { id: "proj-older" }] as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-recent");
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    test("creates a new project when no anon work and no existing projects", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "proj-brand-new" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({ messages: [], data: {} })
      );
      expect(mockPush).toHaveBeenCalledWith("/proj-brand-new");
    });

    test("ignores anon work when messages array is empty", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      // Anon work exists in storage but has no messages — should not be migrated
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue([{ id: "proj-existing" }] as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-existing");
    });

    test("clears anon work before navigating away", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "proj-anon" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signIn("user@example.com", "password123");
      });

      // clearAnonWork must run before router.push
      const clearOrder = mockClearAnonWork.mock.invocationCallOrder[0];
      const pushOrder = mockPush.mock.invocationCallOrder[0];
      expect(clearOrder).toBeLessThan(pushOrder);
    });
  });
});

// ── signUp ────────────────────────────────────────────────────────────────

describe("useAuth — signUp", () => {
  test("returns the action result on success", async () => {
    mockSignUpAction.mockResolvedValue({ success: true });
    const { result } = renderHook(() => useAuth());

    let response: any;
    await act(async () => {
      response = await result.current.signUp("new@example.com", "password123");
    });

    expect(response).toEqual({ success: true });
  });

  test("returns the action result on failure", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });
    const { result } = renderHook(() => useAuth());

    let response: any;
    await act(async () => {
      response = await result.current.signUp("existing@example.com", "password123");
    });

    expect(response).toEqual({ success: false, error: "Email already registered" });
  });

  test("does not navigate when sign-up fails", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "Email already registered" });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("existing@example.com", "password123");
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("resets isLoading to false after sign-up completes", async () => {
    mockSignUpAction.mockResolvedValue({ success: false, error: "bad" });
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(false);
  });

  describe("post-sign-up navigation", () => {
    test("creates project from anon work and navigates to it", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue({ id: "proj-anon" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockCreateProject).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: anonWork.messages,
          data: anonWork.fileSystemData,
        })
      );
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/proj-anon");
    });

    test("creates a new project and navigates to it when no anon work and no projects", async () => {
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "proj-first" } as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-first");
    });

    test("navigates to most recent project on sign-up when user already has projects", async () => {
      // Edge case: user signs up but a project was migrated (or pre-existed somehow)
      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetProjects.mockResolvedValue([{ id: "proj-existing" }] as any);

      const { result } = renderHook(() => useAuth());
      await act(async () => {
        await result.current.signUp("new@example.com", "password123");
      });

      expect(mockPush).toHaveBeenCalledWith("/proj-existing");
      expect(mockCreateProject).not.toHaveBeenCalled();
    });
  });
});
