# Issue #20: Project Unification + Library + Objective Tagging (K-3 MVP)

## Implementation Progress

### Completed Phases

#### Phase 1: Data Model Foundation ✅
**Files Created:**
- `src/types/artifacts.ts` - Unified types for the new architecture

**Types Added:**
- `ProjectType`: `"learning_path" | "quick_create"`
- `ArtifactType`: `"student_page" | "teacher_script" | "answer_key" | "lesson_plan" | "print_pack"`
- `UnifiedProject`: Consolidates project data with artifact references
- `LocalArtifact`: Generated content with metadata and objective tags
- `DesignPack`: Collection of design inspiration items
- `ObjectiveTag`: Curriculum standard references (e.g., `K.MATH.COUNT.1_20`)
- `GradeBand`: Grade groupings for filtering

**Helper Functions:**
- `gradeToGradeBand()`: Maps grades to bands (K, 1, 2, 3, 4-6)
- `mapLegacyArtifactType()`: Converts old types to new unified types
- `getArtifactTypeLabel()`: Human-readable labels
- `parseObjectiveId()`: Parses objective ID format

---

#### Phase 2: Local Storage Services ✅
**Rust Tauri Commands:**
- `src-tauri/src/commands/library_storage.rs` - Artifact CRUD + search
- `src-tauri/src/commands/design_pack_storage.rs` - Design pack management
- `src-tauri/src/commands/project_storage.rs` - Unified project storage

**TypeScript Services (with browser fallback):**
- `src/services/library-storage.ts` - Artifact operations
- `src/services/design-pack-storage.ts` - Design pack operations
- `src/services/local-project-storage.ts` - Project operations

**Zustand Stores:**
- `src/stores/artifactStore.ts` - Library state with filtering/sorting
- `src/stores/designPackStore.ts` - Design pack management
- `src/stores/unifiedProjectStore.ts` - Unified project state

---

#### Phase 3: Wizard Integration ✅
**Files Created:**
- `src/components/wizard/ProjectSelectionStep.tsx` - New Step 1 component

**Files Modified:**
- `src/stores/wizardStore.ts` - Added project selection state and actions
- `src/components/wizard/WizardSteps.tsx` - Added ProjectSelectionStep
- `src/components/wizard/WizardProgress.tsx` - Updated to 7 steps
- `src/components/wizard/WizardDialog.tsx` - Updated step reference
- `src/components/wizard/index.ts` - Export new component

**New Wizard Flow (7 Steps):**
1. **Project Selection** (NEW) - Choose project type, select/create project, optional design pack
2. **Details** - Grade, subject, format, difficulty
3. **Inspiration** - Select design inspiration items
4. **AI** - Choose AI provider (Local/Premium)
5. **Output** - Select output folder
6. **Review** - Review and edit prompt
7. **Generate** - Generation progress

**New State Fields:**
```typescript
selectedProjectId: string | null;
selectedProjectType: ProjectType;
createNewProject: boolean;
newProjectName: string;
linkedObjectiveId: string | null;
selectedDesignPackId: string | null;
```

**New Actions:**
- `setSelectedProject()`
- `setSelectedProjectType()`
- `setCreateNewProject()`
- `setNewProjectName()`
- `setLinkedObjective()`
- `setSelectedDesignPack()`

---

#### Phase 4: Preview Tab Standardization ✅
**Files Modified:**
- `src/components/preview/PreviewTabs.tsx` - Added `StandardizedPreviewTabs`

**5 Standard Tabs:**
1. Student Page
2. Teacher Script
3. Answer Key
4. Lesson Plan
5. Print Pack (combines all for single print job)

---

#### Phase 5: Library View ✅
**Files Created:**
- `src/components/library/LibraryView.tsx` - Main library component
- `src/components/library/ArtifactCard.tsx` - Card and list item display
- `src/components/library/LibraryFilters.tsx` - Filter panel
- `src/components/library/index.ts` - Exports

**Features:**
- Grid and list view modes
- Search functionality
- Filter by: Project, Grade, Subject, Artifact Type
- Sort by: Date, Name, Grade

**Integration:**
- Added Library tab to `src/components/layout/MainContent.tsx`

---

#### Phase 6: Design Packs UI ✅
**Files Created:**
- `src/components/design-packs/DesignPacksPanel.tsx` - Main panel component
- `src/components/design-packs/index.ts` - Exports

**Features:**
- Create new design packs
- Add items via drag-drop
- Delete packs and items
- View item details

---

#### Phase 7: Data Migration ✅
**Files Created:**
- `src/lib/migration.ts` - Migration utilities

**Functions:**
- `isMigrationNeeded()` - Check if migration required
- `getMigrationStatus()` / `saveMigrationStatus()` - Track migration state
- `migrateProject()` - Convert legacy Project to UnifiedProject
- `migrateProjectVersion()` - Convert versions to LocalArtifacts
- `migrateInspirationItems()` - Convert inspiration to DesignPack
- `runMigration()` - Full migration orchestration
- `inferObjectiveTags()` - Heuristic objective detection

---

### Test Coverage

#### Unit Tests
| File | Tests | Description |
|------|-------|-------------|
| `src/__tests__/types/artifacts.test.ts` | 15 | Type helpers (gradeToGradeBand, mapLegacyArtifactType, etc.) |
| `src/__tests__/stores/wizardStore.test.ts` | 45+ | Project selection, step navigation, regeneration |
| `src/__tests__/stores/learnerStore.test.ts` | 20+ | Mastery tracking, profile management |

#### E2E Tests
| File | Tests | Description |
|------|-------|-------------|
| `e2e/wizard.spec.ts` | 21 | Full 7-step wizard flow, all updated for new structure |

**Key E2E Test Updates:**
- WIZ-002: Verifies all 7 step labels (Project, Details, Inspiration, AI, Output, Review, Generate)
- WIZ-003: Tests ProjectSelectionStep content
- WIZ-003b: Tests ClassDetailsStep (now Step 2)
- WIZ-006 through WIZ-015: Updated navigation for new step order
- WIZ-016 through WIZ-021: Prompt Review tests updated for Step 6

---

### Commits

| Commit | Description |
|--------|-------------|
| `f2e6b55` | Phase 1-2, 4-7: Data models, storage, library, design packs, migration |
| `f849f4b` | Phase 3: Wizard integration with ProjectSelectionStep |

---

### Branch
`claude/implement-issue-20-8AeOU`

---

### Remaining Work
- Integration testing with actual Tauri commands
- Performance optimization for large libraries
- Additional E2E tests for library and design packs views
