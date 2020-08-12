import path from 'path'
import { spawn } from 'child_process'
import {
  REGISTRY_URL,
  REMOTE_VERSION_FAIL_TIMEOUT,
  REMOTE_VERSION_MAX_TRIES,
} from './constants'
import fetch from 'node-fetch'

export { red, green } from 'chalk'

export const parseFolders = (folders: string): string[] =>
  folders.split(' ').filter((f) => f !== '')

export const folderHasGitChanges = async (branch: string, folder: string) => {
  const { output } = await run(`git diff ${branch} ${folder}`)
  return output.length > 0
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getRemoteVersion(
  name: string,
  count = 0,
): Promise<string> {
  if (count === REMOTE_VERSION_MAX_TRIES) {
    throw new Error('Could not get remote version. Max tries exceeded.')
  }

  const url = REGISTRY_URL + name
  const res = await fetch(url)

  if (res.status === 404) {
    return
  }
  if (!res.ok) {
    console.log(`Server responded with ${res.status}. Retrying...`)
    await sleep(REMOTE_VERSION_FAIL_TIMEOUT)
    return getRemoteVersion(name, ++count)
  }

  return (await res.json())['dist-tags']['latest']
}

export const run = (cmd: string): Promise<{ code: number; output: string }> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, [], { shell: true, stdio: 'inherit' })
    const output: string[] = []

    child.stdout?.on('data', (data: Buffer) => {
      output.push(data.toString())
    })

    child.stderr?.on('data', (data: string) => {
      output.push(data.toString())
    })

    child.on('close', (code: number) => {
      if (code !== 0) {
        return reject(
          `The command '${cmd}' exited with status code ${code}. \n\n ${output.join()}`,
        )
      }
      resolve({ code, output: output.join() })
    })
  })

export const validateEnvironment = (
  mode: string,
  folder: string,
  folders: string,
  branch: string,
) => {
  const { GITHUB_WORKSPACE } = process.env
  const failedMsg: string[] = []
  let failed = false

  if (!GITHUB_WORKSPACE) {
    failedMsg.push(
      `GITHUB_WORKSPACE not set in environment. Did you check out the repository?`,
    )
    failed = true
  }

  if (mode === 'publish') {
    if (!folder) {
      failedMsg.push('Missing `folder` argument')
      failed = true
    }
  } else if (mode === 'version') {
    if (!folders) {
      failedMsg.push('Missing `folders` argument')
      failed = true
    }
    if (!branch) {
      failedMsg.push('Missing `branch` argument')
      failed = true
    }
  } else {
    failedMsg.push('Mode needs to be either `publish` or `version`')
    failed = true
  }

  return { failed, failedMsg }
}
