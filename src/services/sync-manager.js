const { execSync } = require('child_process')
const {
  checkGitRepo,
  getCurrentBranch,
  isWorkingDirectoryClean,
  fetchLatest,
  isBranchInSync,
  switchToBranch,
  mergeFromBranch,
  hasConflicts,
} = require('../utils/git')
const { logStep, logSuccess, logError, logWarning, logInfo, logCommand } = require('../utils/logger')
const { loadConfig } = require('../utils/config')
const { checkAllPotentialConflicts, handlePreDetectedConflicts } = require('./conflict-detector')

// Get list of branches that are out of sync with origin
function getOutOfSyncBranches(branches) {
  const outOfSyncBranches = []

  for (const branch of branches) {
    if (!isBranchInSync(branch)) {
      outOfSyncBranches.push(branch)
    }
  }

  return outOfSyncBranches
}

// Handle out of sync branches with user options
async function handleOutOfSyncBranches(outOfSyncBranches) {
  logWarning(`Found ${outOfSyncBranches.length} branch(es) not in sync with origin:`)
  outOfSyncBranches.forEach((branch) => {
    logWarning(`  - ${branch}`)
  })

  logInfo('Please choose how to handle out-of-sync branches:')

  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(
      '\nOptions:\n1. Sync all branches automatically\n2. Sync branches one by one\n3. Continue without syncing (not recommended)\n4. Abort\n\nEnter your choice (1-4): ',
      (answer) => {
        rl.close()

        switch (answer.trim()) {
          case '1':
            syncAllBranches(outOfSyncBranches)
            resolve()
            break
          case '2':
            syncBranchesOneByOne(outOfSyncBranches)
            resolve()
            break
          case '3':
            logWarning('Continuing without syncing branches...')
            logInfo('This might cause issues during the merge process.')
            resolve()
            break
          case '4':
            logInfo('Operation aborted by user.')
            process.exit(1)
            break
          default:
            logError('Invalid choice. Aborting...')
            process.exit(1)
        }
      }
    )
  })
}

// Sync all branches automatically
function syncAllBranches(branches) {
  logStep('Syncing', `Syncing all branches with origin...`)

  for (const branch of branches) {
    try {
      logInfo(`Syncing ${branch}...`)
      logCommand(`git checkout ${branch}`)
      execSync(`git checkout ${branch}`, { stdio: 'inherit' })
      logCommand(`git pull origin ${branch}`)
      execSync(`git pull origin ${branch}`, { stdio: 'inherit' })
      logSuccess(`Successfully synced ${branch}`)
    } catch (error) {
      logError(`Failed to sync ${branch}`)
    }
  }
}

// Sync branches one by one with user confirmation
async function syncBranchesOneByOne(branches) {
  for (const branch of branches) {
    const shouldSync = await askToSyncBranch(branch)
    if (shouldSync) {
      try {
        logInfo(`Syncing ${branch}...`)
        logCommand(`git checkout ${branch}`)
        execSync(`git checkout ${branch}`, { stdio: 'inherit' })
        logCommand(`git pull origin ${branch}`)
        execSync(`git pull origin ${branch}`, { stdio: 'inherit' })
        logSuccess(`Successfully synced ${branch}`)
      } catch (error) {
        logError(`Failed to sync ${branch}`)
      }
    } else {
      logInfo(`Skipping ${branch}`)
    }
  }
}

// Ask user if they want to sync a specific branch
function askToSyncBranch(branchName) {
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`\nSync ${branchName} with origin? (y/n): `, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes')
    })
  })
}

// Interactive conflict resolution
function handleConflicts(currentBranch, sourceBranch) {
  logError(`\nMerge conflicts detected when merging from ${sourceBranch} into ${currentBranch}`)
  logWarning('Please resolve conflicts manually and then choose an option:')

  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(
      '\nOptions:\n1. Continue after resolving conflicts\n2. Abort merge and stop\n3. Skip this branch and continue with next\n\nEnter your choice (1-3): ',
      (answer) => {
        rl.close()

        switch (answer.trim()) {
          case '1':
            logInfo('Continuing after conflict resolution...')
            resolve('continue')
            break
          case '2':
            logInfo('Aborting merge and stopping...')
            try {
              execSync('git merge --abort', { stdio: 'inherit' })
            } catch (error) {
              // Ignore error if merge was already aborted
            }
            resolve('abort')
            break
          case '3':
            logInfo('Skipping this branch and continuing with next...')
            try {
              execSync('git merge --abort', { stdio: 'inherit' })
            } catch (error) {
              // Ignore error if merge was already aborted
            }
            resolve('skip')
            break
          default:
            logError('Invalid choice. Aborting...')
            resolve('abort')
        }
      }
    )
  })
}

// Handle uncommitted changes
async function handleUncommittedChanges() {
  logWarning('Working directory has uncommitted changes (excluding script files)')
  logInfo('Please choose an option:')

  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(
      '\nOptions:\n1. Continue anyway (not recommended)\n2. Stash changes and continue\n3. Abort\n\nEnter your choice (1-3): ',
      (answer) => {
        rl.close()

        switch (answer.trim()) {
          case '1':
            logWarning('Continuing with uncommitted changes...')
            resolve('continue')
            break
          case '2':
            logInfo('Stashing changes...')
            try {
              logCommand('git stash push -m "Auto-stash before PR sync"')
              execSync('git stash push -m "Auto-stash before PR sync"', { stdio: 'inherit' })
              logSuccess('Changes stashed successfully')
              resolve('stashed')
            } catch (error) {
              logError('Failed to stash changes')
              resolve('abort')
            }
            break
          case '3':
            logInfo('Operation aborted by user.')
            resolve('abort')
            break
          default:
            logError('Invalid choice. Aborting...')
            resolve('abort')
        }
      }
    )
  })
}

// Main function to sync stacked PRs
async function syncStackedPRs(branches) {
  if (!checkGitRepo()) {
    logError('Not in a git repository. Please run this script from a git repository.')
    process.exit(1)
  }

  let stashAction = null
  if (!isWorkingDirectoryClean()) {
    stashAction = await handleUncommittedChanges()
    if (stashAction === 'abort') {
      process.exit(1)
    }
  }

  const originalBranch = getCurrentBranch()
  logInfo(`Starting from branch: ${originalBranch}`)

  try {
    const fetchSuccess = fetchLatest()

    // Step 1: Check if all branches are in sync with origin (only if fetch was successful)
    if (fetchSuccess) {
      const outOfSyncBranches = getOutOfSyncBranches(branches)
      if (outOfSyncBranches.length > 0) {
        await handleOutOfSyncBranches(outOfSyncBranches)
      }
    } else {
      logWarning('Skipping origin sync check due to fetch failure')
      logInfo('Continuing with local branch state...')
    }

    // Step 2: Pre-check for potential merge conflicts (unless skipped)
    const config = loadConfig()
    const shouldCheckConflicts = !global.skipConflictCheck && (!config || !config.settings || config.settings.preConflictCheck.enabled)

    if (shouldCheckConflicts) {
      const potentialConflicts = await checkAllPotentialConflicts(branches)
      const shouldContinue = await handlePreDetectedConflicts(potentialConflicts)

      if (!shouldContinue) {
        logInfo('Sync aborted due to detected conflicts.')
        return
      }
    } else {
      if (global.skipConflictCheck) {
        logWarning('Skipping pre-conflict check (--skip-conflict-check flag used)')
      } else {
        logWarning('Skipping pre-conflict check (disabled in config)')
      }
      logInfo('This may result in conflicts during the sync process.')
    }

    // Step 3: Do everything locally
    logStep('Syncing', 'Syncing branches locally...')

    for (let i = 0; i < branches.length - 1; i++) {
      const currentBranch = branches[i]
      const nextBranch = branches[i + 1]

      logStep('Processing', `Branch ${i + 1}/${branches.length - 1}: ${currentBranch} → ${nextBranch}`)

      // Switch to the next branch
      switchToBranch(nextBranch)

      // Merge changes from the current branch
      const mergeSuccess = mergeFromBranch(currentBranch)

      if (!mergeSuccess) {
        if (hasConflicts()) {
          const action = await handleConflicts(nextBranch, currentBranch)

          if (action === 'abort') {
            logInfo('Operation aborted by user.')
            break
          } else if (action === 'skip') {
            logInfo(`Skipping ${nextBranch}, continuing with next branch...`)
            continue
          }
          // If action is 'continue', user has resolved conflicts manually
        } else {
          logError(`Failed to merge changes from ${currentBranch} to ${nextBranch}`)
          break
        }
      }
    }

    logSuccess('\nStacked PR sync completed successfully!')

    // Step 4: Ask user to push changes
    await askToPushChanges(branches)

    // Return to original branch
    if (originalBranch !== getCurrentBranch()) {
      logInfo(`Returning to original branch: ${originalBranch}`)
      switchToBranch(originalBranch)
    }

    // Restore stashed changes if we stashed them
    if (stashAction === 'stashed') {
      logInfo('Restoring stashed changes...')
      try {
        logCommand('git stash pop')
        execSync('git stash pop', { stdio: 'inherit' })
        logSuccess('Stashed changes restored successfully')
      } catch (error) {
        logWarning('Failed to restore stashed changes automatically')
        logInfo('You can restore them manually with: git stash pop')
      }
    }
  } catch (error) {
    logError(`Error during sync: ${error.message}`)
    process.exit(1)
  }
}

// Ask user to push changes
async function askToPushChanges(branches) {
  const branchesToPush = branches.slice(1) // Exclude master/main branch

  logStep('Push Changes', `Would you like to push the updated branches to origin?`)
  logInfo(`Branches to push: ${branchesToPush.join(', ')}`)

  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question('\nOptions:\n1. Push all branches\n2. Push branches one by one\n3. Skip pushing\n\nEnter your choice (1-3): ', (answer) => {
      rl.close()

      switch (answer.trim()) {
        case '1':
          pushAllBranches(branchesToPush)
          resolve()
          break
        case '2':
          pushBranchesOneByOne(branchesToPush)
          resolve()
          break
        case '3':
          logInfo('Skipping push. You can push manually later.')
          resolve()
          break
        default:
          logError('Invalid choice. Skipping push.')
          resolve()
      }
    })
  })
}

// Push all branches at once
function pushAllBranches(branches) {
  logStep('Pushing', `Pushing all branches to origin...`)

  for (const branch of branches) {
    try {
      logInfo(`Pushing ${branch}...`)
      logCommand(`git push origin ${branch}`)
      execSync(`git push origin ${branch}`, { stdio: 'inherit' })
      logSuccess(`Successfully pushed ${branch}`)
    } catch (error) {
      logError(`Failed to push ${branch}`)
    }
  }
}

// Push branches one by one with user confirmation
async function pushBranchesOneByOne(branches) {
  for (const branch of branches) {
    const shouldPush = await askToPushBranch(branch)
    if (shouldPush) {
      try {
        logInfo(`Pushing ${branch}...`)
        logCommand(`git push origin ${branch}`)
        execSync(`git push origin ${branch}`, { stdio: 'inherit' })
        logSuccess(`Successfully pushed ${branch}`)
      } catch (error) {
        logError(`Failed to push ${branch}`)
      }
    } else {
      logInfo(`Skipping ${branch}`)
    }
  }
}

// Ask user if they want to push a specific branch
function askToPushBranch(branchName) {
  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(`\nPush ${branchName} to origin? (y/n): `, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes')
    })
  })
}

module.exports = {
  syncStackedPRs,
  getOutOfSyncBranches,
  handleOutOfSyncBranches,
  handleConflicts,
  handleUncommittedChanges,
}
