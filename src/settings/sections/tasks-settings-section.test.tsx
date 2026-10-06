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
    await act(async () => root.render(<TasksSettingsSection />));

    expect(
      Array.from(container.querySelectorAll("li"), (item) => item.textContent),
    ).toEqual(DEFAULT_COLUMNS.map((column) => column.title));
  } finally {
    await act(async () => root.unmount());
  }
});
