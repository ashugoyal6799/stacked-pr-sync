const { execSync } = require('child_process')
const { logStep, logSuccess, logError, logWarning, logInfo, logCommand } = require('./logger')

// Check if we're in a git repository
function checkGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' })
    return true
  } catch (error) {
    return false
  }
}

// Get current branch name
function getCurrentBranch() {
  try {
    return execSync('git branch --show-current', { encoding: 'utf8' }).trim()
  } catch (error) {
    throw new Error('Failed to get current branch name')
  }
}

// Check if working directory is clean (excluding the script files)
function isWorkingDirectoryClean() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' })
    const lines = status
      .trim()
      .split('\n')
      .filter((line) => line.trim() !== '')

    // Filter out changes to our script files
    const scriptFiles = ['scripts/stacked-pr-sync.js', 'scripts/stacked-pr-config.json']
    const filteredLines = lines.filter((line) => {
      const fileName = line.substring(3) // Remove status prefix (e.g., " M ")
      return !scriptFiles.some((scriptFile) => fileName.includes(scriptFile))
    })

    return filteredLines.length === 0
  } catch (error) {
    throw new Error('Failed to check git status')
  }
}

// Fetch latest changes from remote
function fetchLatest() {
  try {
    logStep('Fetching', 'Fetching latest changes from remote...')
    logCommand('git fetch origin')
    execSync('git fetch origin', { stdio: 'inherit' })
    logSuccess('Fetched latest changes')
    return true
  } catch (error) {
    logWarning('Fetch failed, but continuing with local branches...')
    logInfo('This might be due to network issues or authentication problems.')
    logInfo('The script will continue with your local branch state.')
    return false
  }
}

// Check if a branch is in sync with origin
function isBranchInSync(branchName) {
  try {
    // Get local commit hash
    const localCommit = execSync(`git rev-parse ${branchName}`, { encoding: 'utf8' }).trim()

    // Check if remote branch exists
    try {
      const remoteCommit = execSync(`git rev-parse origin/${branchName}`, { encoding: 'utf8' }).trim()
      return localCommit === remoteCommit
    } catch (error) {
      // Remote branch doesn't exist, consider it in sync
      logInfo(`Remote branch origin/${branchName} doesn't exist, skipping sync check`)
      return true
    }
  } catch (error) {
    logWarning(`Could not check sync status for ${branchName}: ${error.message}`)
    return false
  }
}

// Switch to a branch
function switchToBranch(branchName) {
  try {
    logStep('Switching', `Switching to branch: ${branchName}`)

    // Check if branch exists locally
    try {
      execSync(`git show-ref --verify --quiet refs/heads/${branchName}`)
      logCommand(`git checkout ${branchName}`)
      execSync(`git checkout ${branchName}`, { stdio: 'inherit' })
    } catch (error) {
      // Branch doesn't exist locally, try to checkout from remote
      logInfo(`Branch ${branchName} doesn't exist locally, checking out from remote...`)
      logCommand(`git checkout -b ${branchName} origin/${branchName}`)
      execSync(`git checkout -b ${branchName} origin/${branchName}`, { stdio: 'inherit' })
    }

    logSuccess(`Switched to branch: ${branchName}`)
  } catch (error) {
    throw new Error(`Failed to switch to branch: ${branchName}`)
  }
}

// Merge changes from a source branch locally
function mergeFromBranch(sourceBranch) {
  try {
    logStep('Merging', `Merging changes from ${sourceBranch}...`)
    logCommand(`git merge ${sourceBranch}`)
    execSync(`git merge ${sourceBranch}`, { stdio: 'inherit' })
    logSuccess(`Successfully merged changes from ${sourceBranch}`)
    return true
  } catch (error) {
    logError(`Failed to merge changes from ${sourceBranch}`)
    logWarning('This might be due to conflicts. Please resolve conflicts manually and then continue.')
    return false
  }
}

// Check for merge conflicts
function hasConflicts() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' })
    return status.includes('UU') || status.includes('AA') || status.includes('DD')
  } catch (error) {
    return false
  }
}

// Perform dry-run merge to check for potential conflicts
function performDryRunMerge(sourceBranch, targetBranch) {
  const tempBranchName = `temp-dry-run-${Date.now()}`
  let currentBranch = null

  try {
    logInfo(`Checking potential conflicts: ${sourceBranch} → ${targetBranch}`)

    // Get current branch before starting
    currentBranch = getCurrentBranch()

    // Create a temporary branch for dry-run
    execSync(`git checkout -b ${tempBranchName} ${targetBranch}`, { stdio: 'ignore' })

    // Try to merge source into temp branch
    try {
      execSync(`git merge ${sourceBranch} --no-commit --no-ff`, { stdio: 'ignore' })

      // If we get here, no conflicts occurred
      execSync(`git merge --abort`, { stdio: 'ignore' })
      return { hasConflicts: false }
    } catch (mergeError) {
      // Check if this is a conflict error
      const status = execSync('git status --porcelain', { encoding: 'utf8' })
      const hasConflicts = status.includes('UU') || status.includes('AA') || status.includes('DD')

      // Clean up temp branch
      execSync(`git merge --abort`, { stdio: 'ignore' })

      return { hasConflicts, error: mergeError.message }
    }
  } catch (error) {
    return { hasConflicts: false, error: error.message }
  } finally {
    // Always clean up and return to original branch
    try {
      execSync(`git checkout ${currentBranch}`, { stdio: 'ignore' })
      execSync(`git branch -D ${tempBranchName}`, { stdio: 'ignore' })
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
}

module.exports = {
  checkGitRepo,
  getCurrentBranch,
  isWorkingDirectoryClean,
  fetchLatest,
  isBranchInSync,
  switchToBranch,
  mergeFromBranch,
  hasConflicts,
  performDryRunMerge,
}
