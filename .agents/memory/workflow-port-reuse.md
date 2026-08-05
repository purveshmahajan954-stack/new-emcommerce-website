---
name: Workflow port reuse
description: Port-binding behavior to account for when restarting imported Python web servers.
---

For small imported Python web servers managed by a Replit workflow, enable TCP socket address reuse when the workflow may be restarted quickly.

**Why:** A rapid stop/start can leave port 5000 temporarily unavailable even after the prior process exits, causing a false startup failure.

**How to apply:** Prefer a small `TCPServer` subclass with `allow_reuse_address = True` rather than changing the workflow port or creating a second service.