# Planning Rules

- Use `.plan/` for plans that need durable context or approval.
- Name plans `NNN-YYYY-MM-DD-topic.md`.
- Include: goal, scope, assumptions, open questions, steps, validation, risks, rollout, and rollback.
- Mark each plan `draft`, `active`, `done`, or `superseded`.
- Use repository-relative paths and update replaced plans with a link to their replacement.
- Keep plans aligned with the product definition and architecture in `.doc/`; when the product or architecture changes, update or supersede the affected plans.
- For StartSpace, plans are especially useful when choosing the tech stack, defining the storage shape for StartSpace metadata/config, implementing a major module (bookmarks, notes, tasks, search, import/export), or making a browser-support or API-availability decision. Record the decision as an ADR in `docs/decisions/` when it is substantive.
