const fs = require('fs')
const path = require('path')
const { logWarning } = require('./logger')

// Load configuration file
function loadConfig() {
  // Look for config in current working directory
  const configPath = path.join(process.cwd(), 'stacked-pr-config.json')

  if (!fs.existsSync(configPath)) {
    return null
  }

  try {
    const configData = fs.readFileSync(configPath, 'utf8')
    const config = JSON.parse(configData)
    
    // Set default settings if not present
    if (!config.settings) {
      config.settings = {
        preConflictCheck: { enabled: true, description: 'Enable pre-conflict detection before starting sync' },
        autoPush: { enabled: false, description: 'Automatically push changes after successful sync' },
        strictMode: { enabled: true, description: 'Strict mode - abort on any conflicts or errors' },
      }
    }
    
    return config
  } catch (error) {
    logWarning('Failed to load config file, using command line arguments')
    return null
  }
}

// Show detailed configuration
function showConfig() {
  const config = loadConfig()

  if (!config) {
    console.error('No configuration file found')
    console.log('Create scripts/stacked-pr-config.json to define your stacks')
    return
  }

  console.log('Stacked PR Sync Configuration')
  console.log('==============================')
  console.log('')
  
  console.log('Stacks:')
  Object.keys(config.stacks).forEach((stack) => {
    const stackConfig = config.stacks[stack]
    console.log(`  ${stack}: ${stackConfig.description}`)
    console.log(`    Branches: ${stackConfig.branches.join(' → ')}`)
    if (config.defaultStack === stack) {
      console.log('    (default)')
    }
    console.log('')
  })

  if (config.settings) {
    console.log('Settings:')
    Object.keys(config.settings).forEach((setting) => {
      const settingConfig = config.settings[setting]
      const status = settingConfig.enabled ? '✓ Enabled' : '✗ Disabled'
      console.log(`  ${setting}: ${status}`)
      console.log(`    ${settingConfig.description}`)
    })
    console.log('')
  }

  console.log('Default Stack:')
  console.log(`  ${config.defaultStack || 'None'}`)
}

// List available stacks
function listStacks() {
  const config = loadConfig()

  if (!config) {
    console.error('No configuration file found')
    console.log('Create scripts/stacked-pr-config.json to define your stacks')
    return
  }

  console.log('Available stacks:')
  Object.keys(config.stacks).forEach((stack) => {
    const stackConfig = config.stacks[stack]
    console.log(`  ${stack}: ${stackConfig.description}`)
    console.log(`    Branches: ${stackConfig.branches.join(' → ')}`)
    if (config.defaultStack === stack) {
      console.log('    (default)')
    }
    console.log('')
  })

  // Show settings if available
  if (config.settings) {
    console.log('Configuration Settings:')
    Object.keys(config.settings).forEach((setting) => {
      const settingConfig = config.settings[setting]
      const status = settingConfig.enabled ? '✓ Enabled' : '✗ Disabled'
      console.log(`  ${setting}: ${status}`)
      console.log(`    ${settingConfig.description}`)
    })
    console.log('')
  }
}

module.exports = {
  loadConfig,
  showConfig,
  listStacks,
} 
