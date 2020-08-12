import * as core from '@actions/core'
import { shouldPackagePublish, shouldVersionBeUpdated } from './modes'
import { validateEnvironment, run } from './helpers'

async function main() {
  const mode = core.getInput('mode')
  const folders = core.getInput('folders')
  const folder = core.getInput('folder')
  const branch = core.getInput('branch')
  const { failed, failedMsg } = validateEnvironment(
    mode,
    folder,
    folders,
    branch,
  )

  if (failed) {
    core.setFailed(failedMsg.join('\n'))
    return
  }

  process.chdir(process.env.GITHUB_WORKSPACE)

  try {
    if (mode === 'publish') {
      const { should_publish } = await shouldPackagePublish(folder)
      core.setOutput('should_publish', should_publish)
    } else {
      const { error, output } = await shouldVersionBeUpdated(folders, branch)
      if (error) {
        core.setFailed(output.join('\n'))
      }
    }
  } catch (e) {
    core.setFailed(e.message)
  }
}
main()
