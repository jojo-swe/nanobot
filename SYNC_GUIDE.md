# Upstream Sync Guide

This guide explains how to keep the pocketbot fork in sync with the upstream HKUDS/nanobot repository while preserving fork-specific changes.

## Setup (One-time)

1. **Add upstream remote**:
   ```bash
   cd /path/to/your/fork
   git remote add upstream https://github.com/HKUDS/nanobot.git
   git remote -v  # Verify both remotes exist
   ```

2. **Create a sync branch** (optional but recommended):
   ```bash
   git checkout -b sync-upstream
   ```

## Regular Sync Process

### 1. Fetch Upstream Changes
```bash
git fetch upstream
git fetch origin  # Also fetch your fork's changes
```

### 2. Review Upstream Changes
```bash
git log --oneline upstream/main --since="3 months ago"
git diff main..upstream/main --name-only
```

### 3. Merge Upstream Changes
```bash
git checkout main
git merge upstream/main
```

### 4. Resolve Conflicts

Common conflict areas and how to handle them:

**pyproject.toml conflicts**:
```bash
# Keep fork-specific values:
# - name: "pocketbot-ai" 
# - description with fork mention
# - authors/maintainers
# - [project.scripts] command
# - repository URLs
```

**README.md conflicts**:
```bash
# Keep fork-specific changes:
# - Project title and branding
# - CLI command examples (pocketbot vs nanobot)
# - Repository links
# - Configuration paths (~/.pocketbot/)
```

**CLI/Config conflicts**:
```bash
# Keep fork-specific defaults:
# - Config directory paths
# - Command names
# - Help text
```

### 5. Update Fork-Specific Files

After merging, run this checklist:

- [ ] Update `pyproject.toml` with fork branding
- [ ] Update `README.md` CLI examples
- [ ] Update Docker references
- [ ] Update version number if needed
- [ ] Test all CLI commands work
- [ ] Test web UI functionality
- [ ] Verify config directory paths

### 6. Test Thoroughly
```bash
# Test basic functionality
pocketbot status
pocketbot agent -m "Test message"
pocketbot web  # Test web UI

# Test with different configurations
# (test your specific use cases)
```

### 7. Commit and Push
```bash
git add .
git commit -m "sync: Merge upstream changes and update fork branding

- Merge upstream HKUDS/nanobot@<version>
- Update pocketbot branding
- Fix configuration paths
- Update Docker references"
git push origin main
```

## Automated Sync Script

Create `scripts/sync-upstream.sh`:

```bash
#!/bin/bash
set -e

echo "🔄 Syncing pocketbot with upstream nanobot..."

# Fetch latest changes
echo "📥 Fetching upstream changes..."
git fetch upstream
git fetch origin

# Show what's being merged
echo "📋 Changes to be merged:"
git log --oneline main..upstream/main | head -10

# Merge changes
echo "🔀 Merging upstream changes..."
git checkout main
git merge upstream/main

# Update fork-specific files automatically
echo "🔧 Updating fork-specific configurations..."
# Add your update scripts here

# Test basic functionality
echo "🧪 Running basic tests..."
pocketbot status

echo "✅ Sync complete! Please review changes and test thoroughly."
echo "📝 Don't forget to:"
echo "   - Update version if needed"
echo "   - Test all features"
echo "   - Update CHANGELOG.md"
echo "   - Push changes when ready"
```

## Conflict Resolution Strategies

### Strategy 1: Keep Fork Changes (Most Common)

For files like `pyproject.toml`, `README.md`:
```bash
# During merge conflict, choose our changes
git checkout --ours pyproject.toml
# Then manually merge any new upstream additions
```

### Strategy 2: Accept Upstream Changes

For core functionality files:
```bash
# Accept upstream improvements
git checkout --theirs nanobot/agent/loop.py
# Then test and add any fork-specific modifications needed
```

### Strategy 3: Manual Merge

For complex conflicts:
```bash
# Use merge tool
git mergetool
# Or edit manually
vim <conflicted-file>
```

## Version Management

When syncing upstream releases:

1. **Check upstream version**:
   ```bash
   git tag | grep -E "v[0-9]" | tail -1
   ```

2. **Update fork version**:
   - If upstream: `0.1.4`
   - Fork version: `0.1.4+jojo`

3. **Update CHANGELOG.md**:
   ```markdown
   ## v0.1.4+jojo (2026-XX-XX)
   
   ### Upstream Changes
   - [Merge upstream v0.1.4 changes]
   
   ### Fork Changes  
   - Update branding
   - Fix configuration paths
   ```

## Testing After Sync

Essential tests to run after each sync:

1. **CLI Commands**:
   ```bash
   pocketbot onboard
   pocketbot status
   pocketbot agent -m "Test"
   pocketbot web
   ```

2. **Configuration Loading**:
   ```bash
   # Test config loads from correct path
   ls ~/.pocketbot/config.json
   pocketbot status
   ```

3. **Web UI**:
   ```bash
   pocketbot web &
   curl http://localhost:8080
   ```

4. **Docker** (if you use it):
   ```bash
   docker build -t pocketbot .
   docker run --rm pocketbot status
   ```

## Troubleshooting

### Common Issues

1. **Config directory conflicts**:
   - Ensure all code references `~/.pocketbot/`
   - Check hardcoded paths in source code

2. **CLI command not found**:
   - Verify `[project.scripts]` in pyproject.toml
   - Reinstall package: `pip install -e .`

3. **Import errors**:
   - Package name conflicts (should remain `nanobot` internally)
   - Check Python path and installation

4. **Docker path issues**:
   - Update volume mounts in Docker commands
   - Check container internal paths

### Getting Help

- Check this guide first
- Review git merge conflict documentation
- Test changes in a separate branch
- Keep backups of working configurations

## Best Practices

1. **Regular syncs**: Sync monthly or when major upstream releases occur
2. **Test thoroughly**: Always test after syncing
3. **Document changes**: Update CHANGELOG.md with sync details
4. **Backup configs**: Keep backup of working configurations
5. **Branch strategy**: Use separate branches for testing sync changes
