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
  getBranchStatus,
  getSyncDetails,
  checkOriginExists,
} = require('../utils/git')
const { logStep, logSuccess, logError, logWarning, logInfo, logCommand } = require('../utils/logger')
const { loadConfig } = require('../utils/config')
const { checkAllPotentialConflicts, handlePreDetectedConflicts } = require('./conflict-detector')

// Check all branches and show status report
function checkBranchStatuses(branches) {
  logStep('Checking', `Checking branches: ${branches.join(', ')}`)
  console.log('')

  const branchStatuses = []
  const outOfSyncBranches = []

  for (const branch of branches) {
    const status = getBranchStatus(branch)
    branchStatuses.push(status)

    if (status.syncStatus === 'out-of-sync') {
      outOfSyncBranches.push(branch)
    }

    // Display status with details
    let statusIcon = '❓'
    let statusText = ''

    if (status.syncStatus === 'in-sync') {
      statusIcon = '✅'
      statusText = 'In sync with origin'
    } else if (status.syncStatus === 'out-of-sync') {
      statusIcon = '❌'
      const details = getSyncDetails(branch)
      if (details.ahead > 0 && details.behind > 0) {
        statusText = `Out of sync (diverged: ${details.ahead} ahead, ${details.behind} behind)`
      } else if (details.ahead > 0) {
        statusText = `Out of sync (local ahead by ${details.ahead} commits)`
      } else if (details.behind > 0) {
        statusText = `Out of sync (remote ahead by ${details.behind} commits)`
      } else {
        statusText = 'Out of sync'
      }
    } else if (status.syncStatus === 'no-remote') {
      statusIcon = '🏠'
      statusText = 'No remote branch found'
    } else if (status.syncStatus === 'not-found') {
      statusIcon = '❌'
      statusText = 'Branch not found'
    }

    logInfo(`${statusIcon} ${branch}: ${statusText}`)
  }

  console.log('')
  return { branchStatuses, outOfSyncBranches }
}

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
      '\nOptions:\n1. Sync all branches automatically\n2. Sync branches one by one\n3. Continue without syncing\n4. Abort\n\nEnter your choice (1-4): ',
      (answer) => {
        rl.close()

        switch (answer.trim()) {
          case '1':
            logInfo('Auto-syncing all branches with origin...')
            syncAllBranches(outOfSyncBranches)
            resolve()
            break
          case '2':
            logInfo('Syncing branches one by one...')
            syncBranchesOneByOne(outOfSyncBranches)
            resolve()
            break
          case '3':
            logWarning('Continuing without syncing branches...')
            logInfo('This might cause issues if branches are out of sync.')
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
  logError(`\n❌ Merge conflicts detected when merging from ${sourceBranch} into ${currentBranch}`)
  logInfo('🛑 Sync aborted due to conflicts.')
  logInfo('📋 Please resolve conflicts manually and then restart the sync process.')
  
  console.log('')
  logInfo('📋 How to resolve conflicts:')
  logInfo('1. Open the conflicted files in your editor')
  logInfo('2. Look for conflict markers: <<<<<<< HEAD, =======, >>>>>>>')
  logInfo('3. Edit the files to resolve conflicts')
  logInfo('4. Save the files')
  logInfo('5. Stage the resolved files: git add <filename>')
  logInfo('6. Complete the merge: git commit')
  logInfo('7. Restart the sync: npx stacked-pr-sync master feature1 feature2 feature3')
  console.log('')
  
  logInfo('💡 Current state:')
  logInfo(`   • You are on branch: ${currentBranch}`)
  logInfo(`   • Merge from ${sourceBranch} is in progress`)
  logInfo(`   • Resolve conflicts and complete the merge`)
  logInfo(`   • Then restart the sync process`)
  console.log('')
  
  logInfo('🚀 To restart after resolving conflicts:')
  logInfo(`   npx stacked-pr-sync master feature1 feature2 feature3`)
  console.log('')

  // Exit the process - user needs to restart
  process.exit(1)
}

// Handle uncommitted changes
async function handleUncommittedChanges() {
  logWarning('Working directory has uncommitted changes')
  logInfo('Auto-stashing changes to continue...')

  try {
    logCommand('git stash push -m "Auto-stash before PR sync"')
    execSync('git stash push -m "Auto-stash before PR sync"', { stdio: 'inherit' })
    logSuccess('Changes stashed successfully')
    return 'stashed'
  } catch (error) {
    logError('Failed to stash changes. Please commit or stash manually and try again.')
    process.exit(1)
  }
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
    // Step 1: Smart origin detection and status report
    const { branchStatuses, outOfSyncBranches } = checkBranchStatuses(branches)

    // Step 2: Handle origin sync if needed
    const originExists = checkOriginExists()
    
    if (outOfSyncBranches.length > 0) {
      if (originExists) {
        await handleOutOfSyncBranches(outOfSyncBranches)
      } else {
        logInfo('No origin remote found. Continuing with local branches only.')
      }
    } else {
      if (originExists) {
        logSuccess('All branches are in sync with origin!')
      } else {
        logInfo('No origin remote found. Working with local branches only.')
      }
    }

    // Step 3: Pre-check for potential merge conflicts
    const config = loadConfig()
    const shouldCheckConflicts = !config || !config.settings || config.settings.preConflictCheck.enabled

    if (shouldCheckConflicts) {
      const potentialConflicts = await checkAllPotentialConflicts(branches)
      await handlePreDetectedConflicts(potentialConflicts)
    } else {
      logWarning('Skipping pre-conflict check (disabled in config)')
      logInfo('This may result in conflicts during the sync process.')
    }

    // Step 4: Sync branches locally
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
          // Stop immediately on conflicts
          handleConflicts(nextBranch, currentBranch)
        } else {
          logError(`Failed to merge changes from ${currentBranch} to ${nextBranch}`)
          break
        }
      }
    }

    logSuccess('\nStacked PR sync completed successfully!')

    // Step 5: Ask user to push changes (only if origin exists)
    const pushOriginExists = checkOriginExists()
    if (pushOriginExists) {
      await askToPushChanges(branches)
    } else {
      logInfo('No origin remote found. Skipping push options.')
    }

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
  checkBranchStatuses,
}
