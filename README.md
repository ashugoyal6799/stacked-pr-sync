# Stacked PR Sync

A Node.js CLI tool for syncing stacked pull requests with advanced conflict detection and resolution.

## Features

- **Pre-conflict Detection**: Identifies potential merge conflicts before starting sync
- **Modular Architecture**: Clean separation of concerns with dedicated modules
- **Configuration-Driven**: JSON-based configuration for stacks and settings
- **Interactive CLI**: User-friendly command-line interface with colored output
- **Safety Features**: Automatic stashing, conflict resolution, and cleanup

## Installation

### Global Installation (Recommended)

```bash
npm install -g stacked-pr-sync
```

### Local Installation

```bash
npm install stacked-pr-sync
```

### From Source

```bash
git clone https://github.com/your-org/stacked-pr-sync.git
cd stacked-pr-sync
npm install
npm link  # Makes it available globally
```

## Usage

### Basic Usage

```bash
# Use default stack from config
stacked-pr-sync

# Use specific stack
stacked-pr-sync feature-stack

# Use custom branch list
stacked-pr-sync master feature-1 feature-2 feature-3
```

### Command Line Options

```bash
# Show help
stacked-pr-sync --help

# List available stacks
stacked-pr-sync --list

# Show detailed configuration
stacked-pr-sync --config

# Skip pre-conflict detection
stacked-pr-sync --skip-conflict-check
```

### Programmatic Usage

```javascript
const { syncStackedPRs } = require('stacked-pr-sync');

// Sync branches programmatically
syncStackedPRs(['master', 'feature-1', 'feature-2'])
  .then(() => console.log('Sync completed!'))
  .catch((error) => console.error('Sync failed:', error));
```

## Configuration

Create `stacked-pr-config.json` in your project root:

```json
{
  "stacks": {
    "feature-stack": {
      "description": "Example feature stack",
      "branches": ["master", "feature-1", "feature-2", "feature-3"]
    },
    "auth-stack": {
      "description": "Authentication feature stack",
      "branches": ["main", "auth-base", "user-auth", "admin-auth"]
    }
  },
  "defaultStack": "feature-stack",
  "settings": {
    "preConflictCheck": {
      "enabled": true,
      "description": "Enable pre-conflict detection before starting sync"
    },
    "autoPush": {
      "enabled": false,
      "description": "Automatically push changes after successful sync"
    },
    "strictMode": {
      "enabled": true,
      "description": "Strict mode - abort on any conflicts or errors"
    }
  }
}
```

## Examples

### Example 1: Simple Stack Sync

```bash
# Create config file
echo '{
  "stacks": {
    "my-feature": {
      "description": "My feature branch stack",
      "branches": ["main", "feature-base", "feature-ui", "feature-api"]
    }
  },
  "defaultStack": "my-feature"
}' > stacked-pr-config.json

# Run sync
stacked-pr-sync
```

### Example 2: Custom Branch List

```bash
# Sync specific branches without config
stacked-pr-sync main feature-1 feature-2 feature-3
```

### Example 3: Skip Conflict Check

```bash
# Use old behavior (no pre-conflict detection)
stacked-pr-sync --skip-conflict-check feature-stack
```

## Workflow

1. **Pre-flight Checks**: Validate git repository and working directory
2. **Remote Sync**: Fetch latest changes and check branch sync status
3. **Conflict Detection**: Perform dry-run merges to detect potential conflicts
4. **Local Sync**: Execute actual merges in sequence
5. **Post-processing**: Push changes and restore original state

## Safety Features

- **Working Directory Clean**: Checks for uncommitted changes
- **Automatic Stashing**: Safely stashes changes before sync
- **Conflict Detection**: Identifies conflicts before they occur
- **Cleanup**: Always returns to original branch and cleans up temp branches
- **Error Handling**: Comprehensive error handling with user options

## Troubleshooting

### Common Issues

1. **"Not in a git repository"**

   - Make sure you're in a git repository directory
   - Run `git init` if needed

2. **"No configuration file found"**

   - Create `stacked-pr-config.json` in your project root
   - Or use command-line arguments: `stacked-pr-sync branch1 branch2 branch3`

3. **Merge conflicts detected**
   - Resolve conflicts manually as instructed
   - Or use `--skip-conflict-check` to use old behavior

### Getting Help

```bash
# Show help
stacked-pr-sync --help

# List available stacks
stacked-pr-sync --list

# Show configuration
stacked-pr-sync --config
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Commit your changes: `git commit -am 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## Development

```bash
# Clone the repository
git clone https://github.com/your-org/stacked-pr-sync.git
cd stacked-pr-sync

# Install dependencies
npm install

# Run linting
npm run lint

# Format code
npm run format

# Test the CLI
node bin/stacked-pr-sync.js --help
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-org/stacked-pr-sync/issues)
- **Documentation**: [GitHub Wiki](https://github.com/your-org/stacked-pr-sync/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/stacked-pr-sync/discussions)
