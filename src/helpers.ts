import { exec } from 'child_process'
import {
  REGISTRY_URL,
  REMOTE_VERSION_FAIL_TIMEOUT,
  REMOTE_VERSION_MAX_TRIES,
} from './constants'
import fetch from 'node-fetch'

export const parseFolders = (folders: string): string[] =>
  folders.split(' ').filter((f) => f !== '')

export const folderHasGitChanges = async (branch: string, folder: string) => {
  const output = await run(`git diff origin/${branch} ${folder}`)
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

  const json = await res.json()
  const { version, error } = extractVersionFromResp(json)

  if (error) {
    console.log(
      `Tag 'latest' does not exist for package. Response from NPM was: ${JSON.stringify(
        json,
        null,
        2,
      )}`,
    )
    return
  } else {
    return version
  }
}

const extractVersionFromResp = (
  resp: any,
): { version?: string; error?: Error } => {
  try {
    return {
      version: resp['dist-tags']['latest'],
    }
  } catch (e) {
    return { error: e }
  }
}

export const run = async (cmd: string): Promise<string> =>
  new Promise((resolve, reject) => {
    exec(cmd, (error, stdout) => {
      if (error) return reject(error)
      resolve(stdout)
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
