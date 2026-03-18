import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolStatus } from "../ToolStatus";

afterEach(() => {
  cleanup();
});

test("shows 'Creating' label for str_replace_editor create command", () => {
  render(
    <ToolStatus
      toolInvocation={{
        toolCallId: "1",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/components/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor str_replace command", () => {
  render(
    <ToolStatus
      toolInvocation={{
        toolCallId: "2",
        toolName: "str_replace_editor",
        args: { command: "str_replace", path: "/components/Button.tsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Editing Button.tsx")).toBeDefined();
});

test("shows 'Editing' label for str_replace_editor insert command", () => {
  render(
    <ToolStatus
      toolInvocation={{
        toolCallId: "3",
        toolName: "str_replace_editor",
        args: { command: "insert", path: "/utils/helpers.ts" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(screen.getByText("Editing helpers.ts")).toBeDefined();
});

test("shows 'Reading' label for str_replace_editor view command", () => {
  render(
    <ToolStatus
      toolInvocation={{
        toolCallId: "4",
        toolName: "str_replace_editor",
        args: { command: "view", path: "/index.tsx" },
        state: "result",
        result: "file contents",
      }}
    />
  );

  expect(screen.getByText("Reading index.tsx")).toBeDefined();
});

test("shows 'Renaming' label for file_manager rename command", () => {
  render(
    <ToolStatus
      toolInvocation={{
        toolCallId: "5",
        toolName: "file_manager",
        args: { command: "rename", path: "/old.tsx", new_path: "/new.tsx" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Renaming old.tsx → new.tsx")).toBeDefined();
});

test("shows 'Deleting' label for file_manager delete command", () => {
  render(
    <ToolStatus
      toolInvocation={{
        toolCallId: "6",
        toolName: "file_manager",
        args: { command: "delete", path: "/temp/unused.ts" },
        state: "result",
        result: { success: true },
      }}
    />
  );

  expect(screen.getByText("Deleting unused.ts")).toBeDefined();
});

test("shows spinner when tool is in progress", () => {
  const { container } = render(
    <ToolStatus
      toolInvocation={{
        toolCallId: "7",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "call",
      }}
    />
  );

  expect(container.querySelector(".animate-spin")).toBeDefined();
  expect(screen.getByText("Creating App.jsx")).toBeDefined();
});

test("shows icon without spinner when tool is complete", () => {
  const { container } = render(
    <ToolStatus
      toolInvocation={{
        toolCallId: "8",
        toolName: "str_replace_editor",
        args: { command: "create", path: "/App.jsx" },
        state: "result",
        result: "Success",
      }}
    />
  );

  expect(container.querySelector(".animate-spin")).toBeNull();
  expect(container.querySelector(".text-emerald-600")).toBeDefined();
});

test("falls back to toolName for unknown tools", () => {
  render(
    <ToolStatus
      toolInvocation={{
        toolCallId: "9",
        toolName: "some_other_tool",
        args: {},
        state: "result",
        result: "ok",
      }}
    />
  );

  expect(screen.getByText("some_other_tool")).toBeDefined();
});
