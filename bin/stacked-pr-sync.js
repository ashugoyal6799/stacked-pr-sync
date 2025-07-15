#!/usr/bin/env node

const { syncStackedPRs } = require('../src')
const { parseArguments } = require('../src/utils/cli')
const { logInfo, logSuccess, logError } = require('../src/utils/logger')

// Main execution
if (require.main === module) {
  const branches = parseArguments()

  logInfo('Stacked PR Sync Tool')
  logInfo('===================')
  logInfo(`Branches to sync: ${branches.join(' → ')}`)

  syncStackedPRs(branches)
    .then(() => {
      logSuccess('Script completed successfully!')
    })
    .catch((error) => {
      logError(`Script failed: ${error.message}`)
      process.exit(1)
    })
} 