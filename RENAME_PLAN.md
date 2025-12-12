# Loom → Loominal Rename Plan

## Overview

Rename the project from "Loom" to "Loominal" to enable consistent branding across both GitHub (organization) and npm (scope).

**New branding:**
- GitHub org: `github.com/loominal`
- npm scope: `@loominal`
- Project name: Loominal

**Component naming:**
- Repos use clean names: `loominal/warp`, `loominal/weft`, etc. (NOT `loominal/loominal-warp`)
- Component names (Warp, Weft, Pattern, Shuttle) remain unchanged
- Docker images: `ghcr.io/loominal/warp`, `ghcr.io/loominal/weft`, etc.

## Phase 0: Prerequisites (COMPLETE)

- [x] Create GitHub organization `loominal` - **SECURED 2025-12-12**
- [ ] Create npm organization `loominal` (for `@loominal` scope)
- [ ] Verify npm org is secured before proceeding to publishing phases

---

## Batch 1: Code and Documentation Updates (Parallel)

These phases can run in parallel. They update the monorepo locally without touching external systems.

### Phase 1.1: Update Package Manifests
- **Status:** COMPLETE
- **Effort:** S
- **Tasks:**
  - [x] Update `warp/package.json`: `@loom/warp` → `@loominal/warp`
  - [x] Update `weft/package.json`: `@loom/weft` → `@loominal/weft`
  - [x] Update `pattern/package.json`: `@loom/pattern` → `@loominal/pattern`
  - [x] Update `shuttle/package.json`: `@loom/shuttle` → `@loominal/shuttle`
  - [x] Update any `shared` or internal package references
  - [x] Update all cross-dependencies between packages
- **Done When:** All package.json files reference `@loominal/*` scope

### Phase 1.2: Update Docker References
- **Status:** COMPLETE
- **Effort:** S
- **Tasks:**
  - [x] Update Dockerfiles with base image references (if any)
  - [x] Update docker-compose files: `ghcr.io/mdlopresti/loom-*` → `ghcr.io/loominal/*`
  - [x] Update Kubernetes manifests in loom-tools
  - [x] Update any example configs or scripts that reference Docker images
- **Done When:** All Docker image references point to `ghcr.io/loominal/*`

### Phase 1.3: Update Environment Variables and Config
- **Status:** COMPLETE
- **Effort:** S
- **Tasks:**
  - [x] Rename `LOOM_PROJECT_ID` → `LOOMINAL_PROJECT_ID`
  - [x] Rename `LOOM_AGENT_ID` → `LOOMINAL_AGENT_ID`
  - [x] Search codebase for all `LOOM_*` environment variable references and rename
  - [x] Rename config file: `.loom-config.json` → `.loominal-config.json`
  - [x] Update config file detection in code
  - [x] Update all documentation with new env var and config names
- **Done When:** All env vars use `LOOMINAL_*` prefix, config file is `.loominal-config.json`

### Phase 1.4: Update Documentation
- **Status:** COMPLETE
- **Effort:** M
- **Tasks:**
  - [x] Main README: Update title "Loom" → "Loominal"
  - [x] Main README: Update GitHub URLs `mdlopresti/loom-*` → `loominal/*`
  - [x] Main README: Update npm scope `@loom/*` → `@loominal/*`
  - [x] Main README: Update Docker images `ghcr.io/mdlopresti/loom-*` → `ghcr.io/loominal/*`
  - [x] Component READMEs: warp, weft, pattern, loom-tools, shuttle
  - [x] Update CLAUDE.md files (if any)
  - [x] Update example configurations
  - [x] Update GitHub Actions workflow examples
- **Done When:** All documentation references new naming conventions

### Phase 1.5: Update Source Code References
- **Status:** COMPLETE
- **Effort:** M
- **Tasks:**
  - [x] Search for hardcoded "loom" strings in source code
  - [x] Update import paths if needed
  - [x] Update any display strings or user-facing messages
  - [x] Update logging/telemetry references
  - [x] Update test fixtures and mocks
  - [ ] Run tests to verify nothing broke (manual step)
- **Done When:** All source code uses new naming, tests pass

---

## Batch 2: Repository Setup (After Batch 1)

These phases create the new GitHub repositories and set up CI/CD. They depend on Batch 1 being complete.

### Phase 2.1: Create GitHub Repositories
- **Status:** Blocked
- **Depends On:** Batch 1 complete
- **Effort:** S
- **Tasks:**
  - [ ] Create `loominal/warp` (public)
  - [ ] Create `loominal/weft` (public)
  - [ ] Create `loominal/pattern` (public)
  - [ ] Create `loominal/shuttle` (public)
  - [ ] Create `loominal/tools` (public)
  - [ ] Set repository descriptions and topics
  - [ ] Configure default branch to `main`
- **Done When:** All repositories exist under `github.com/loominal`

### Phase 2.2: Configure GitHub Actions Secrets
- **Status:** Blocked
- **Depends On:** Phase 2.1
- **Effort:** S
- **Tasks:**
  - [ ] Add NPM_TOKEN to organization secrets (once npm org is created)
  - [ ] Configure GITHUB_TOKEN permissions for GHCR
  - [ ] Add any other required secrets (Azure, etc.)
  - [ ] Set up GitHub Actions permissions for GHCR publishing
- **Done When:** All secrets configured for CI/CD pipelines

### Phase 2.3: Update CI/CD Workflows
- **Status:** Blocked
- **Depends On:** Phase 2.1
- **Effort:** M
- **Tasks:**
  - [ ] Update GitHub Actions workflows for new org context
  - [ ] Update container registry references in workflows
  - [ ] Update npm publishing workflows for `@loominal` scope
  - [ ] Update any branch protection rules references
  - [ ] Test workflow syntax (can use `act` locally if available)
- **Done When:** All workflows updated and syntax-validated

---

## Batch 3: Initial Repository Push (After Batch 2)

### Phase 3.1: Push Code to New Repositories
- **Status:** Blocked
- **Depends On:** Phase 2.1, Batch 1
- **Effort:** S
- **Tasks:**
  - [ ] Add git remotes for new loominal repos
  - [ ] Push warp code to `loominal/warp`
  - [ ] Push weft code to `loominal/weft`
  - [ ] Push pattern code to `loominal/pattern`
  - [ ] Push shuttle code to `loominal/shuttle`
  - [ ] Push tools code to `loominal/tools`
  - [ ] Verify all branches and tags pushed correctly
- **Done When:** All code is in new repositories with full git history

---

## Batch 4: Publishing and Validation (After Batch 3)

These phases can run in parallel once code is pushed and CI/CD is working.

### Phase 4.1: Publish to npm
- **Status:** Blocked
- **Depends On:** Phase 3.1, npm org created
- **Effort:** M
- **Tasks:**
  - [ ] Verify npm organization `@loominal` is created and accessible
  - [ ] Build all packages locally
  - [ ] Publish `@loominal/warp@1.0.0` (or appropriate version)
  - [ ] Publish `@loominal/weft@1.0.0`
  - [ ] Publish `@loominal/pattern@1.0.0`
  - [ ] Publish `@loominal/shuttle@1.0.0`
  - [ ] Publish any shared packages
  - [ ] Test installation: `npm install @loominal/warp`
- **Done When:** All packages published and installable from npm

### Phase 4.2: Publish Docker Images
- **Status:** Blocked
- **Depends On:** Phase 3.1, Phase 2.2
- **Effort:** M
- **Tasks:**
  - [ ] Trigger GitHub Actions to build warp image
  - [ ] Trigger build for weft image
  - [ ] Trigger build for pattern image
  - [ ] Trigger build for tools image
  - [ ] Verify images appear in `ghcr.io/loominal/*`
  - [ ] Test pulling images: `docker pull ghcr.io/loominal/warp:latest`
  - [ ] Tag stable versions appropriately
- **Done When:** All Docker images built and pullable from GHCR

### Phase 4.3: End-to-End Testing
- **Status:** Blocked
- **Depends On:** Phase 4.1, Phase 4.2
- **Effort:** M
- **Tasks:**
  - [ ] Test MCP server installation via npm
  - [ ] Test Docker-based deployment
  - [ ] Test Kubernetes deployment with new images
  - [ ] Verify agent communication works end-to-end
  - [ ] Check all documentation examples work
  - [ ] Validate CI/CD pipelines run successfully
- **Done When:** All deployment methods verified working with new naming

---

## Batch 5: Migration and Cleanup (After Batch 4)

### Phase 5.1: Add Deprecation Notices
- **Status:** Blocked
- **Depends On:** Phase 4.3
- **Effort:** S
- **Tasks:**
  - [ ] Add deprecation notice to `mdlopresti/loom` README
  - [ ] Add deprecation notice to `mdlopresti/loom-warp` README
  - [ ] Add deprecation notice to `mdlopresti/loom-weft` README
  - [ ] Add deprecation notice to `mdlopresti/loom-pattern` README
  - [ ] Add deprecation notice to `mdlopresti/loom-tools` README
  - [ ] Add deprecation notice to `mdlopresti/loom-shuttle` README (if exists)
  - [ ] Archive old repositories (make read-only)
  - [ ] Add redirect links to new org in all old READMEs
- **Done When:** All old repos have clear deprecation notices

### Phase 5.2: Update External References
- **Status:** Blocked
- **Depends On:** Phase 4.3
- **Effort:** S
- **Tasks:**
  - [ ] Update any blog posts or announcements
  - [ ] Update social media links (if any)
  - [ ] Update any external documentation or wikis
  - [ ] Search for mentions in other projects and notify maintainers
  - [ ] Update package manager listings (if any)
- **Done When:** All known external references updated or notified

---

## Backlog / Future Considerations

- [ ] Consider publishing deprecation package to old `@loom/*` scope that warns users
- [ ] Set up analytics/telemetry to track adoption of new naming
- [ ] Plan communication strategy for existing users (if any)
- [ ] Consider domain name registration (loominal.dev, loominal.io, etc.)
- [ ] Update any presentation materials or demos

---

## Critical Decisions

### 1. Repository Naming (DECIDED)
**Decision:** Use clean names without prefix: `loominal/warp`, `loominal/weft`, etc.
**Rationale:** Organization name provides context, cleaner URLs, more professional

### 2. Environment Variables (DECIDED)
**Decision:** Hard cutover to `LOOMINAL_*`
- `LOOM_PROJECT_ID` → `LOOMINAL_PROJECT_ID`
- `LOOM_AGENT_ID` → `LOOMINAL_AGENT_ID`
- All other `LOOM_*` vars → `LOOMINAL_*`

**Rationale:** Clean break with rebrand, no legacy baggage

### 3. Config File Name (DECIDED)
**Decision:** Rename to `.loominal-config.json` only

**Rationale:** Clean break with rebrand, no legacy baggage

### 4. Version Numbering (DECIDED)
**Decision:** Continue existing version numbers from current packages

**Rationale:** Maintains version history continuity despite rebrand

---

## Success Criteria

The rename is complete when:

1. All code and documentation uses `loominal` naming
2. All packages published to `@loominal` npm scope
3. All Docker images published to `ghcr.io/loominal/*`
4. CI/CD pipelines working in new GitHub org
5. End-to-end testing passes with new naming
6. Old repositories archived with deprecation notices
7. No broken links in documentation

---

## Suggested First Actions

After npm org is secured:

1. **Run Batch 1 in parallel:** All phases can execute simultaneously
   - Assign Phase 1.1 (Package Manifests)
   - Assign Phase 1.2 (Docker References)
   - Assign Phase 1.3 (Env Vars)
   - Assign Phase 1.4 (Documentation)
   - Assign Phase 1.5 (Source Code)

2. ~~**Make critical decisions:** Environment variables and config file naming strategy~~ **DONE**

3. **Prepare for Batch 2:** Have npm token ready for secrets configuration
