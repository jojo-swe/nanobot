# Fork Configuration Template

This file helps manage the fork-specific configurations and makes it easier to sync with upstream changes.

## Fork Identity

```python
# Fork configuration that can be easily updated
FORK_CONFIG = {
    "name": "pocketbot",
    "display_name": "PocketBot",
    "description": "Pocket-sized personal AI assistant with web interface",
    "package_name": "pocketbot-ai",
    "cli_command": "pocketbot",
    "config_dir": ".pocketbot",
    "original_repo": "HKUDS/nanobot",
    "fork_repo": "jojo-swe/nanobot",
    "maintainer": "jojo-swe",
    "maintainer_email": "74981366+jojo-swe@users.noreply.github.com",
    "version_suffix": "+jojo"
}
```

## Files That Need Fork-Specific Updates

When syncing with upstream, these files typically need updates:

1. **pyproject.toml**
   - `name` field
   - `description` field  
   - `authors` and `maintainers`
   - `[project.scripts]` command name
   - Repository URLs

2. **README.md**
   - Project title and description
   - CLI command examples
   - Configuration directory paths
   - Repository links
   - Docker references

3. **CLI and Config**
   - Default config directory
   - CLI command names
   - Help text and descriptions

## Upstream Sync Process

1. **Add upstream remote** (one-time setup):
   ```bash
   git remote add upstream https://github.com/HKUDS/nanobot.git
   ```

2. **Fetch upstream changes**:
   ```bash
   git fetch upstream
   ```

3. **Merge upstream changes**:
   ```bash
   git checkout main
   git merge upstream/main
   ```

4. **Update fork-specific files**:
   - Apply the fork configuration updates
   - Test functionality
   - Update version if needed

5. **Resolve conflicts**:
   - Keep fork-specific changes
   - Preserve upstream improvements
   - Test thoroughly

## Automated Sync Script

```bash
#!/bin/bash
# sync-upstream.sh - Sync fork with upstream

echo "Syncing pocketbot fork with upstream nanobot..."

# Fetch latest changes
git fetch upstream

# Merge upstream main
git checkout main
git merge upstream/main

# Update fork-specific configurations
# (This would be automated with a script)

echo "Sync complete! Please review and test changes."
```

## Version Management

Use semantic versioning with fork identifier:
- Format: `{upstream_version}+{fork_suffix}`
- Example: `0.1.3.post7+jojo`

This ensures:
- Clear upstream version tracking
- Fork identification
- Easy comparison with original
