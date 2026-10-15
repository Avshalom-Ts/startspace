import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { DEFAULT_COLUMNS } from "../../tasks/tasks-model";
import TasksSettingsSection from "./tasks-settings-section";

vi.mock("../../hooks/useWorkspace", () => ({
  useWorkspace: () => ({
    grant: { handle: null, permission: "prompt" },
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("renders default task statuses using the real task hook without a workspace", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);

  try {
    await act(async () => root.render(<TasksSettingsSection hiddenColumnIds={[]} onHiddenColumnIdsChange={vi.fn()} workspaceReady={false} searchLimit={6} onSearchLimitChange={vi.fn()} homeLimit={20} onHomeLimitChange={vi.fn()} />));

    expect(
      Array.from(container.querySelectorAll("li"), (item) => item.textContent),
    ).toEqual(DEFAULT_COLUMNS.map((column) => column.title));
  } finally {
    await act(async () => root.unmount());
  }
});

it("lists columns inside the Home card and toggles only Home exclusions", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const onChange = vi.fn();
  // The real task hook supplies all default columns, even without filesystem access.
  try {
    await act(async () => root.render(
      <TasksSettingsSection searchLimit={6} onSearchLimitChange={vi.fn()}
        homeLimit={20} onHomeLimitChange={vi.fn()} workspaceReady
        hiddenColumnIds={["done"]} onHiddenColumnIdsChange={onChange} />,
    ));
    const home = [...container.querySelectorAll("section")].find((section) => section.querySelector("h2")?.textContent === "Home page")!;
    const switches = home.querySelectorAll<HTMLButtonElement>('[role="switch"]');
    expect([...switches].map((button) => button.getAttribute("aria-label"))).toEqual(DEFAULT_COLUMNS.map((column) => column.title));
    expect([...switches].map((button) => button.getAttribute("aria-checked"))).toEqual(["true", "true", "false"]);
    await act(async () => switches[0]!.click());
    expect(onChange).toHaveBeenLastCalledWith(["done", "todo"]);
    await act(async () => switches[2]!.click());
    expect(onChange).toHaveBeenLastCalledWith([]);
  } finally {
    await act(async () => root.unmount());
  }
});
