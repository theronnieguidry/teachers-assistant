# ADR-0001: Local-First Canonical Storage for Inspiration and Design Packs

- Status: Accepted
- Date: 2026-02-12
- Owner: Architecture
- Related Issues: #34, #33, #35

## Context

The current model splits teacher mental models:

- Inspiration items are stored in Supabase.
- Design packs are stored locally.

This creates inconsistent behavior across wizard, design-pack management, and generation payload assembly.

## Decision

Adopt **local-first canonical storage** for both inspiration and design packs.

- Canonical authoring and selection state lives in local app storage.
- Cloud `inspiration_items` is treated as legacy/import source, not the canonical active source.
- Future cloud sync remains optional and additive; it does not replace local canonical behavior.

## Why this decision

- Matches single-device homeschool teacher workflows.
- Reduces auth/network coupling for core creation flow.
- Makes wizard behavior deterministic across online/offline states.
- Eliminates duplicate concepts in UI (no separate “cloud inspiration vs local pack” model).

## Migration Plan

### Phase 1: Read-path unification

- Make wizard/design-pack screens read from local canonical stores first.
- Keep compatibility import path for legacy cloud inspiration records.

### Phase 2: Legacy import conversion

- Convert legacy cloud inspiration entries into one or more local design packs.
- Use deterministic naming (for example: `Migrated Inspiration (YYYY-MM-DD)`).
- Preserve source metadata (URL/title/type) during conversion.

### Phase 3: Generation payload unification

- Build generation inspiration payload from local selected sources only:
  - ad-hoc local inspiration selections
  - selected local design pack items

### Phase 4: Cleanup

- Remove UI copy that implies separate cloud/local inspiration systems.
- Keep cloud import-only tooling behind explicit migration action if needed.

## Rollback Plan

If migration causes regressions:

1. Re-enable legacy cloud read fallback for wizard inspiration selection.
2. Stop new conversion jobs (do not delete already-migrated local artifacts).
3. Keep generation path functional by reading previously persisted local selections.
4. Re-run migration after fixes from a known-good backup snapshot of local store.

## Operational Notes

- No destructive delete of cloud inspiration records during migration.
- Migration should be idempotent: repeated runs should not duplicate converted items.
- Conversion and payload merge behavior should be covered by unit tests.

## UI Mental Model Guardrail

User-facing wording should consistently present one concept:

- “Inspiration” is local and immediately available in the app.
- “Import from cloud” is a migration/sync action, not a separate day-to-day mode.
