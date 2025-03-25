### Tech
**Frontend:**
  - Three.js (3D map and characters)
  - Vite

**Backend:**
  - Elixir with Phoenix (Channels, GenServers, and Presence)
  - WebSockets for game updates (JSON messages)

**Infra:**
  - Pulumi (IaC, TypeScript)
  - Cloudflare Pages (static assets hosting with GitHub binding for continuous deployment)
  - Gigalixir (runs the Elixir service)

### Design
- Each game instance (two teams, 5 players per team) runs as a self-contained process.
- No authentication, no authorization. All players are guests.

---