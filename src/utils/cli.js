const { showConfig, listStacks, loadConfig } = require('./config')

// Show help information
function showHelp() {
  console.log('🚀 Stacked PR Sync Tool')
  console.log('=======================')
  console.log('')
  console.log('Simple usage:')
  console.log('  npx stacked-pr-sync master feature1 feature2 feature3')
  console.log('  npm run sync master feature1 feature2 feature3')
  console.log('')
  console.log('Examples:')
  console.log('  # Sync branches: master → feature1 → feature2 → feature3')
  console.log('  npx stacked-pr-sync master feature1 feature2 feature3')
  console.log('')
  console.log('  # If you have a config file with predefined stacks')
  console.log('  npx stacked-pr-sync my-stack')
  console.log('  npx stacked-pr-sync  # uses default stack')
  console.log('')
  console.log('Options:')
  console.log('  --help, -h              Show this help message')
  console.log('')
  console.log('Quick Start:')
  console.log('  1. Install: npm install stacked-pr-sync')
  console.log('  2. Run: npx stacked-pr-sync master feature1 feature2')
  console.log('  3. That\'s it! 🎉')
  console.log('')
  console.log('Configuration (optional):')
  console.log('  Create stacked-pr-config.json to define reusable stacks')
}

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2)

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  const filteredArgs = args.filter((arg) => !['--help', '-h'].includes(arg))

  // If no arguments provided, try to use default stack
  if (filteredArgs.length === 0) {
    const config = loadConfig()
    if (config && config.defaultStack && config.stacks[config.defaultStack]) {
      console.log(`📋 Using default stack: ${config.defaultStack}`)
      return config.stacks[config.defaultStack].branches
    } else {
      console.log('❌ No branches specified and no default stack found.')
      console.log('')
      console.log('Usage examples:')
      console.log('  npx stacked-pr-sync master feature1 feature2 feature3')
      console.log('  npm run sync master feature1 feature2 feature3')
      console.log('')
      console.log('Or create a config file with predefined stacks.')
      showHelp()
      process.exit(1)
    }
  }

  // Check if first argument is a stack name
  if (filteredArgs.length === 1 && !filteredArgs[0].startsWith('-')) {
    const config = loadConfig()
    if (config && config.stacks[filteredArgs[0]]) {
      console.log(`📋 Using stack: ${filteredArgs[0]}`)
      return config.stacks[filteredArgs[0]].branches
    } else {
      // If not a stack name, treat as branch list
      console.log(`📋 Using branches: ${filteredArgs.join(' → ')}`)
      return filteredArgs
    }
  }

  // Use command line arguments as branches
  console.log(`📋 Using branches: ${filteredArgs.join(' → ')}`)
  return filteredArgs
}

module.exports = {
  parseArguments,
  showHelp
}
