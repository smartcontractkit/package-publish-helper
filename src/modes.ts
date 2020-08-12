import path from 'path'
import semver from 'semver'
import {
  parseFolders,
  run,
  folderHasGitChanges,
  getRemoteVersion,
  red,
  green,
} from './helpers'

type ShouldPublish = 'yes' | 'no'

export async function shouldPackagePublish(
  folder: string,
): Promise<{ should_publish: ShouldPublish }> {
  const output: string[] = []
  let should_publish: ShouldPublish

  const localPackagePath = path.join(
    process.env.GITHUB_WORKSPACE,
    folder,
    'package.json',
  )
  const { version, name } = require(localPackagePath)
  const remoteVersion = await getRemoteVersion(name)

  console.log(`Remote version is ${remoteVersion}, local verison is ${version}`)

  if (semver.gt(version, remoteVersion)) {
    console.log(green(`Package should publish`))
    should_publish = 'yes'
  } else {
    should_publish = 'no'
    console.log('Package should not publish')
  }

  return { should_publish }
}

export async function shouldVersionBeUpdated(
  foldersStr: string,
  targetBranch: string,
): Promise<{ output: string[]; error: boolean }> {
  const folders = parseFolders(foldersStr)
  const output = []
  let error = false

  for (const folder of folders) {
    if (!(await folderHasGitChanges(targetBranch, folder))) {
      console.log(green(`No changes found for ${folder}`))
      continue
    }
    const localRelativePackagePath = path.join(folder, 'package.json')
    const localAbsolutePackagePath = path.join(
      process.env.GITHUB_WORKSPACE,
      localRelativePackagePath,
    )
    const localPackage = require(localAbsolutePackagePath)
    const targetPackageRaw = await run(
      `git show origin/${targetBranch}:${localRelativePackagePath}`,
    )
    const targetPackage = JSON.parse(targetPackageRaw)

    if (semver.lte(localPackage.version, targetPackage.version)) {
      output.push(
        red(
          `Package version needs to be updated in ${folder}. It's less than or equal to ${targetBranch} (${localPackage.version})`,
        ),
      )
      error = true
    } else {
      console.log(
        green(`Changes found for ${folder} but version has been updated`),
      )
    }
  }

  return { output, error }
}
