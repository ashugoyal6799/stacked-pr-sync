const { performDryRunMerge } = require('../utils/git')
const { logStep, logSuccess, logError, logInfo } = require('../utils/logger')

// Check all potential merge conflicts before starting sync
async function checkAllPotentialConflicts(branches) {
  logStep('Conflict Check', 'Checking for potential merge conflicts across all branches...')

  const conflicts = []

  for (let i = 0; i < branches.length - 1; i++) {
    const sourceBranch = branches[i]
    const targetBranch = branches[i + 1]

    logInfo(`Checking: ${sourceBranch} → ${targetBranch}`)
    const result = performDryRunMerge(sourceBranch, targetBranch)

    if (result.hasConflicts) {
      conflicts.push({
        sourceBranch,
        targetBranch,
        error: result.error,
      })
      logError(`⚠ Potential conflicts detected: ${sourceBranch} → ${targetBranch}`)
    } else {
      logSuccess(`✓ No conflicts: ${sourceBranch} → ${targetBranch}`)
    }
  }

  return conflicts
}

// Handle detected conflicts before starting sync
async function handlePreDetectedConflicts(conflicts) {
  if (conflicts.length === 0) {
    logSuccess('No potential conflicts detected! Safe to proceed with sync.')
    return true
  }

  logError(`\n⚠️  ${conflicts.length} potential merge conflict(s) detected:`)
  conflicts.forEach((conflict, index) => {
    logError(`  ${index + 1}. ${conflict.sourceBranch} → ${conflict.targetBranch}`)
  })

  logWarning('\nYou must resolve these conflicts before proceeding with the sync.')
  logInfo('Please resolve conflicts in the following order:')

  conflicts.forEach((conflict, index) => {
    logInfo(`  ${index + 1}. Switch to ${conflict.targetBranch} and merge ${conflict.sourceBranch}`)
    logInfo(`     git checkout ${conflict.targetBranch}`)
    logInfo(`     git merge ${conflict.sourceBranch}`)
    logInfo(`     # Resolve conflicts, then: git add . && git commit`)
  })

  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(
      '\nOptions:\n1. Abort and resolve conflicts manually\n2. Continue anyway (not recommended)\n\nEnter your choice (1-2): ',
      (answer) => {
        rl.close()

        switch (answer.trim()) {
          case '1':
            logInfo('Aborting sync. Please resolve conflicts manually and run the script again.')
            resolve(false)
            break
          case '2':
            logWarning('Continuing with sync despite detected conflicts...')
            logInfo('This may cause issues during the merge process.')
            resolve(true)
            break
          default:
            logError('Invalid choice. Aborting...')
            resolve(false)
        }
      }
    )
  })
}

module.exports = {
  checkAllPotentialConflicts,
  handlePreDetectedConflicts,
}
