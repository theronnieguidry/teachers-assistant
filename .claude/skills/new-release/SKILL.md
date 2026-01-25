---
name: new-release
description: Create and publish a new release of TA Teachers Assistant - bumps versions, commits, tags, and pushes to trigger GitHub Actions build
---

# New Release Skill

You are automating the release workflow for TA Teachers Assistant. This skill bumps versions across all config files, commits, tags, and pushes to trigger the GitHub Actions release pipeline.

## Prerequisites

Before running this skill, ensure:
- GitHub secrets are configured (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`)
- You have push access to the repository
- The `.github/workflows/release.yml` workflow exists

---

## Execution Process

### Phase 1: Pre-flight Checks

Run these checks and STOP if any fail:

```bash
# 1. Check for uncommitted changes
git status --porcelain
```

If there are uncommitted changes, ask the user:
- "There are uncommitted changes. Would you like me to commit them first, or abort the release?"

```bash
# 2. Verify current branch
git branch --show-current
```

Warn if not on `master` branch, but allow proceeding if user confirms.

```bash
# 3. Check remote is configured
git remote get-url origin
```

### Phase 2: Determine Version

1. Read current version:
```bash
node -p "require('./package.json').version"
```

2. **Ask the user** which version bump type they want:
   - **patch** (0.1.0 → 0.1.1): Bug fixes, minor updates
   - **minor** (0.1.0 → 0.2.0): New features, backward compatible
   - **major** (0.1.0 → 1.0.0): Breaking changes

3. Calculate and display the new version before proceeding.

### Phase 2.5: Generate Release Notes

**IMPORTANT**: This phase generates user-friendly release notes that end users will see in the update dialog.

1. **Get commits since last release:**
```bash
# Get the last tag
git describe --tags --abbrev=0

# Get commits since that tag
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

If no previous tag exists (first release), get all commits:
```bash
git log --oneline
```

2. **Analyze and categorize commits** by their prefix:
   - `feat:` → "What's New" section
   - `fix:` → "Bug Fixes" section
   - `perf:` → "Performance Improvements" section
   - `chore:`, `docs:`, `refactor:`, `test:`, `ci:` → Usually omit (internal changes)

3. **Transform technical commit messages to user-friendly language:**

   Examples:
   | Technical Commit | User-Friendly Note |
   |------------------|-------------------|
   | `feat: add dark mode toggle to settings` | Added dark mode - find it in Settings |
   | `fix: resolve null pointer in auth flow` | Fixed a login issue that could cause crashes |
   | `fix: correct worksheet html escaping` | Fixed display issues with some worksheets |
   | `feat: implement keyboard shortcuts` | Added keyboard shortcuts for faster workflow |
   | `perf: optimize initial load time` | App now starts faster |

   Guidelines for transformation:
   - Remove technical jargon (null pointer, escaping, refactor, etc.)
   - Focus on user benefit, not implementation detail
   - Use active voice ("Added", "Fixed", "Improved")
   - Keep it short and scannable

4. **Generate the release notes in this format:**
```markdown
What's New:
• [user-friendly feature description]
• [user-friendly feature description]

Bug Fixes:
• [user-friendly fix description]
• [user-friendly fix description]

Performance:
• [user-friendly improvement description]
```

   Omit any section that has no entries.

5. **Show the generated notes to the user for review:**
```
Here are the release notes for v{VERSION}:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
What's New:
• Added dark mode - find it in Settings
• Added keyboard shortcuts for faster workflow

Bug Fixes:
• Fixed a crash that could occur with empty worksheets
• Fixed display issues with some worksheets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do these release notes look good?
```

6. **Ask for user approval** using AskUserQuestion with options:
   - **Approve** - Proceed with these notes
   - **Edit** - Let me modify the notes
   - **Cancel** - Abort the release

7. **If user chooses Edit:**
   - Write the current notes to `RELEASE_NOTES.md`
   - Tell user: "I've written the notes to RELEASE_NOTES.md. Please edit the file, then tell me when you're done."
   - Wait for user confirmation
   - Read the edited `RELEASE_NOTES.md`
   - Show the updated notes and ask for approval again

8. **Write final approved notes to `RELEASE_NOTES.md`**

### Phase 3: Bump Versions

Update version in all three locations:

```bash
# 1. Bump package.json (without creating git tag)
npm version <patch|minor|major> --no-git-tag-version
```

2. Read the new version from package.json

3. Update `src-tauri/Cargo.toml`:
   - Find line: `version = "X.Y.Z"`
   - Replace with new version

4. Update `src-tauri/tauri.conf.json`:
   - Find: `"version": "X.Y.Z"`
   - Replace with new version

### Phase 4: Commit and Tag

```bash
# 1. Stage version changes AND release notes
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/tauri.conf.json RELEASE_NOTES.md

# 2. Commit with standard message
git commit -m "chore: release v{VERSION}"

# 3. Create annotated tag
git tag -a v{VERSION} -m "Release v{VERSION}"
```

### Phase 5: Push to Remote

```bash
# Push commit and tag together
git push origin master --follow-tags
```

### Phase 6: Confirm Release

After pushing, provide:

1. **GitHub Actions URL** to monitor the build:
   ```
   https://github.com/theronnieguidry/teachers-assistant/actions
   ```

2. **Expected Release URL** (will be available after build completes):
   ```
   https://github.com/theronnieguidry/teachers-assistant/releases/tag/v{VERSION}
   ```

3. Summary message:
   ```
   Release v{VERSION} initiated!

   The GitHub Actions workflow is now:
   1. Building the Windows installer
   2. Signing the binary
   3. Creating the GitHub Release
   4. Uploading installer + latest.json for auto-updates

   Monitor progress: https://github.com/theronnieguidry/teachers-assistant/actions
   ```

---

## Error Handling

### Uncommitted Changes
If `git status --porcelain` returns output:
- List the changed files
- Ask user to commit or stash them first
- Do NOT proceed with release

### Version Mismatch
If versions in package.json, Cargo.toml, or tauri.conf.json don't match:
- Report the mismatch
- Offer to sync them to the highest version before bumping

### Push Failure
If `git push` fails:
- Check if remote is ahead: `git fetch && git status`
- Suggest: `git pull --rebase` then retry

### Tag Already Exists
If the tag already exists:
- Report: "Tag v{VERSION} already exists"
- Suggest incrementing to next version

---

## Rollback Instructions

If you need to undo a release that hasn't been pushed:

```bash
# Remove the local tag
git tag -d v{VERSION}

# Reset the commit
git reset --soft HEAD~1

# Restore original versions
git checkout -- package.json package-lock.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
```

If already pushed but build failed:

```bash
# Delete remote tag
git push origin --delete v{VERSION}

# Delete local tag
git tag -d v{VERSION}

# Revert commit
git revert HEAD
git push
```

---

## Version File Locations

| File | Purpose |
|------|---------|
| `package.json` | Frontend version (`"version": "X.Y.Z"`) |
| `package-lock.json` | Auto-updated by npm |
| `src-tauri/Cargo.toml` | Rust/Tauri version (`version = "X.Y.Z"`) |
| `src-tauri/tauri.conf.json` | App bundle version (`"version": "X.Y.Z"`) |
| `RELEASE_NOTES.md` | User-facing release notes (read by GitHub Actions) |

---

## Quick Reference

```bash
# Check current version
node -p "require('./package.json').version"

# Dry run - see what would change
npm version patch --no-git-tag-version && git diff

# Monitor GitHub Actions
gh run list --workflow=release.yml

# Check latest release
gh release list --limit 1
```
