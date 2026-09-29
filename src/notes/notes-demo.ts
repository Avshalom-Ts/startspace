// Synthetic, explicitly opt-in design preview. Never persisted or mixed with a
// real workspace; example text contains no commands or private user data.
import type { NotesIndex } from "../types/notes";
export const demoIndex: NotesIndex = {
  root: { id: "", name: "Demo workspace", noteCount: 0 },
  folders: [
    { id: "Personal", name: "Personal", noteCount: 0 },
    { id: "Personal/Ideas", name: "Ideas", noteCount: 1 },
    { id: "Work", name: "Work", noteCount: 0 },
    { id: "Work/Infrastructure", name: "Infrastructure", noteCount: 0 },
    { id: "Work/Infrastructure/Lab", name: "Lab", noteCount: 3 },
    { id: "Learning", name: "Learning", noteCount: 1 },
  ],
  notes: [
    { id: "Work/Infrastructure/Lab/Lab setup guide.md", title: "Lab setup guide", folder: "Work/Infrastructure/Lab", modifiedAt: "2026-09-28T10:00:00Z", content: "# Lab setup guide\n\nA simple place to keep everything you learn while building your home lab.\n\n## Before you begin\n\n- Choose a dedicated machine\n- Make a backup of important files\n- Plan your network and storage\n\n## Plan the workspace\n\nKeep your notes in ordinary **Markdown files**. You can open them in your favorite editor at any time.\n\n1. Create a folder for your project.\n2. Write down the goals and requirements.\n3. Link your next steps to a local task.\n\n## Useful reference\n\nRead the [Markdown guide](https://www.markdownguide.org) or open [Network planning](Network planning.md).\n\n> Your browser. Your workspace. Your data.\n\n## Example configuration\n\n\`\`\`text\nworkspace/\n  notes/\n  projects/\n\`\`\`\n" },
    { id: "Work/Infrastructure/Lab/Network planning.md", title: "Network planning", folder: "Work/Infrastructure/Lab", modifiedAt: "2026-09-27T09:00:00Z", content: "# Network planning\n\nDocument network zones, device names and recovery procedures.\n\n## Checklist\n\n- Review the diagram\n- Record your changes\n" },
    { id: "Work/Infrastructure/Lab/Backup and restore.md", title: "Backup and restore", folder: "Work/Infrastructure/Lab", modifiedAt: "2026-09-26T09:00:00Z", content: "# Backup and restore\n\nKeep a local copy of your workspace and test how to restore it." },
    { id: "Personal/Ideas/Weekend projects.md", title: "Weekend projects", folder: "Personal/Ideas", modifiedAt: "2026-09-25T09:00:00Z", content: "# Weekend projects\n\nA small collection of ideas for later." },
    { id: "Learning/Reading list.md", title: "Reading list", folder: "Learning", modifiedAt: "2026-09-24T09:00:00Z", content: "# Reading list\n\nKeep useful references beside your notes." },
  ],
};
