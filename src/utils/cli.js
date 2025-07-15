const { showConfig, listStacks, loadConfig } = require('./config')

// Show help information
function showHelp() {
  console.log('Stacked PR Sync Tool')
  console.log('===================')
  console.log('')
  console.log('Usage:')
  console.log('  node stacked-pr-sync.js <branch1> <branch2> <branch3> ...')
  console.log('  node stacked-pr-sync.js <stack-name>')
  console.log('  node stacked-pr-sync.js (uses default stack from config)')
  console.log('')
  console.log('Examples:')
  console.log('  node stacked-pr-sync.js master feature-1 feature-2 feature-3')
  console.log('  node stacked-pr-sync.js feature-stack')
  console.log('  node stacked-pr-sync.js')
  console.log('')
  console.log('Options:')
  console.log('  --help, -h              Show this help message')
  console.log('  --list, -l              List available stacks from config')
  console.log('  --config, -c            Show detailed configuration')
  console.log('  --skip-conflict-check, -s  Skip pre-conflict detection (use old behavior)')
  console.log('')
  console.log('Configuration:')
  console.log('  Create scripts/stacked-pr-config.json to define your stacks')
  console.log('  Example config:')
  console.log('  {')
  console.log('    "stacks": {')
  console.log('      "my-stack": {')
  console.log('        "description": "My feature stack",')
  console.log('        "branches": ["master", "feature-1", "feature-2"]')
  console.log('      }')
  console.log('    },')
  console.log('    "defaultStack": "my-stack"')
  console.log('  }')
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2)

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  // Check for list flag
  if (args.includes('--list') || args.includes('-l')) {
    listStacks()
    process.exit(0)
  }

  // Check for config flag
  if (args.includes('--config') || args.includes('-c')) {
    showConfig()
    process.exit(0)
  }

  // Check for skip-conflict-check flag
  const skipConflictCheck = args.includes('--skip-conflict-check') || args.includes('-s')
  const filteredArgs = args.filter((arg) => !['--skip-conflict-check', '-s', '--config', '-c'].includes(arg))

  // Store the flag in a global variable or pass it through
  global.skipConflictCheck = skipConflictCheck

  // Check for stack name
  if (filteredArgs.length === 1 && !filteredArgs[0].startsWith('-')) {
    const config = loadConfig()
    if (config && config.stacks[filteredArgs[0]]) {
      return config.stacks[filteredArgs[0]].branches
    } else {
      console.error(`Stack '${filteredArgs[0]}' not found in config`)
      if (config) {
        console.log('Available stacks:')
        Object.keys(config.stacks).forEach((stack) => {
          console.log(`  - ${stack}: ${config.stacks[stack].description}`)
        })
      }
      process.exit(1)
    }
  }

  // Use command line arguments as branches
  if (filteredArgs.length === 0) {
    const config = loadConfig()
    if (config && config.defaultStack && config.stacks[config.defaultStack]) {
      console.log(`Using default stack: ${config.defaultStack}`)
      return config.stacks[config.defaultStack].branches
    } else {
      showHelp()
      process.exit(1)
    }
  }

  return filteredArgs
}

module.exports = {
  showHelp,
  parseArguments,
}
