import { expect, it } from "vitest";
import { workspaceFixture } from "../test/workspace-fixture";
import { readTasks, writeTasks } from "./task-workspace";

it("creates tasks only under .startspace and reads the relocated file", async () => {
  const fixture = workspaceFixture();
  const empty = await readTasks(fixture.handle);
  await writeTasks(fixture.handle, empty);
  expect(fixture.files.has("tasks.json")).toBe(false);
  expect(await readTasks(fixture.handle)).toEqual(empty);
});

it("warns about a legacy root file without overwriting it", async () => {
  const fixture = workspaceFixture({ "tasks.json": '{"tasks":[]}' });
  await expect(readTasks(fixture.handle)).rejects.toThrow("Move tasks.json");
  await expect(writeTasks(fixture.handle, { version: 1, tasks: [], columns: [] })).rejects.toThrow("Move tasks.json");
  expect(fixture.files.get("tasks.json")).toBe('{"tasks":[]}');
  expect(fixture.files.has(".startspace/tasks.json")).toBe(false);
});

it("prefers the canonical task file and preserves it on write failure", async () => {
  const fixture = workspaceFixture({
    "tasks.json": "legacy",
    ".startspace/tasks.json": '{"version":1,"tasks":[],"columns":[]}',
  });
  expect((await readTasks(fixture.handle)).tasks).toEqual([]);
  fixture.failWrites.add(".startspace/tasks.json");
  await expect(writeTasks(fixture.handle, { version: 1, tasks: [], columns: [] })).rejects.toThrow("disk failure");
  expect(fixture.files.get(".startspace/tasks.json")).toBe('{"version":1,"tasks":[],"columns":[]}');
});
