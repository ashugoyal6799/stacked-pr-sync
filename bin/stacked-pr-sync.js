#!/usr/bin/env node

const { syncStackedPRs } = require('../src')
const { parseArguments } = require('../src/utils/cli')
const { logInfo, logSuccess, logError } = require('../src/utils/logger')

// Main execution
if (require.main === module) {
  try {
  const branches = parseArguments()

    console.log('')
    logInfo('🚀 Starting Stacked PR Sync')
    logInfo('==========================')
    logInfo(`📋 Branch sequence: ${branches.join(' → ')}`)
    console.log('')

  syncStackedPRs(branches)
    .then(() => {
        console.log('')
        logSuccess('✅ Stacked PR sync completed successfully!')
        console.log('')
        logInfo('💡 Next steps:')
        logInfo('   • Review the changes in each branch')
        logInfo('   • Push branches if needed: git push origin <branch>')
        logInfo('   • Create/update pull requests')
        console.log('')
    })
    .catch((error) => {
        console.log('')
        logError(`❌ Sync failed: ${error.message}`)
        console.log('')
        logInfo('💡 Troubleshooting:')
        logInfo('   • Check if all branches exist')
        logInfo('   • Ensure working directory is clean')
        logInfo('   • Resolve any merge conflicts manually')
        console.log('')
      process.exit(1)
    })
  } catch (error) {
    logError(`❌ Error: ${error.message}`)
    process.exit(1)
  }
} 