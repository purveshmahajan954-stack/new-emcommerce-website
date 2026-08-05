---
name: Imported static sites
description: Durable setup guidance for imported HTML sites with generated Replit workflows.
---

For imported static HTML projects, keep the existing server command and file layout whenever possible; first verify that the workflow's runtime is installed in the current Replit environment.

**Why:** An imported workflow can reference a language runtime that is not included in the imported project's generated module list, causing a startup failure even when the site itself is valid.

**How to apply:** Check the workflow command and available runtime before adding dependencies or restructuring a static export. Add only the missing runtime module, then verify the workflow and rendered pages.