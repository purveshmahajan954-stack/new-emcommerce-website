---
name: Database connection resilience
description: Keep PostgreSQL startup and pool errors from taking down the web server.
---

Database connectivity can fail independently of the HTTP server, especially when a Supabase host or credential is stale. PostgreSQL pool and client error events must be handled explicitly, and initialization failures should be logged without preventing the app from serving requests.

**Why:** An invalid Supabase connection first caused registration failures, then an unhandled client error terminated the Express process during startup.

**How to apply:** When changing database initialization or pool behavior, preserve non-fatal startup handling and add error listeners for both the pool and checked-out clients.