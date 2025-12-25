# Refactor to proper pnpm workspace

The current structure uses a single `package.json` with relative imports across packages. This needs to be refactored into a proper monorepo using pnpm workspaces to align with tRPC's architecture and improve modularity.

### Tasks
- [ ] Initialize `pnpm-workspace.yaml`.
- [ ] Create `@tinyrpc/server` package in `packages/server`.
- [ ] Create `@tinyrpc/client` package in `packages/client`.
- [ ] Move shared types if necessary or ensure proper linking.
- [ ] Update example to use `@tinyrpc/server` and `@tinyrpc/client` via workspace protocol.
- [ ] Configure `tsconfig.json` for project references or workspace-wide resolution.
- [ ] Clean up root `package.json` to act as a workspace manager.
