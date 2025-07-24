# Stacked PR Sync

A simple tool to sync stacked pull requests with smart conflict detection.

## 🚀 Quick Start

```bash
# Install
npm install stacked-pr-sync

# Use
npx stacked-pr-sync master feature1 feature2 feature3
```

That's it! 🎉

## 📋 How It Works

Syncs branches in sequence: `master → feature1 → feature2 → feature3`

1. **Checks branch status** and shows what needs syncing
2. **Syncs with origin** (if you want)
3. **Merges branches locally** in order
4. **Stops on conflicts** - you resolve them manually
5. **Offers to push** changes when done

## 🎯 Example

```bash
# You have changes in feature3, want to sync up to master
npx stacked-pr-sync master feature1 feature2 feature3

# Tool shows:
📋 Branch Status Report:
✅ master: In sync with origin
❌ feature1: Out of sync (local ahead by 2 commits)
🏠 feature2: No remote branch found

# You choose to sync with origin
# Tool merges: master → feature1 → feature2 → feature3
# If conflicts occur, tool stops and you resolve them
# After resolving, run the same command again
```

## 🔧 Options

```bash
# Show help
npx stacked-pr-sync --help
```

## 🛡️ Safety Features

- **Smart detection**: Shows exactly what each branch needs
- **Auto-stash**: Safely handles uncommitted changes
- **Conflict safety**: Stops immediately on conflicts
- **User control**: You choose what to sync and push

## 🚨 When Conflicts Occur

```bash
❌ Merge conflicts detected in feature2
🛑 Sync aborted due to conflicts.

# You resolve conflicts manually:
git add .
git commit

# Then restart:
npx stacked-pr-sync master feature1 feature2 feature3
```

## 📁 Configuration (Optional)

Create `stacked-pr-config.json` for reusable branch stacks:

```json
{
  "stacks": {
    "my-feature": {
      "branches": ["master", "feature1", "feature2", "feature3"]
    }
  },
  "defaultStack": "my-feature"
}
```

Then use:
```bash
npx stacked-pr-sync my-feature
```

## 💡 Pro Tips

- **Start with base branch**: List branches in dependency order
- **Resolve conflicts**: Tool stops, you resolve, then restart
- **Push when ready**: Choose what to push after successful sync

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📄 License

MIT License

---

**Simple, safe, and effective stacked PR syncing** 🚀
