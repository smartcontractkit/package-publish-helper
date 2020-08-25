jest.mock('node-fetch')
import _fetch from 'node-fetch'
// @ts-ignore
const fetch = _fetch as jest.Mock

import { parseFolders, getRemoteVersion } from '../src/helpers'
import * as constants from '../src/constants'

describe('parseFolders', () => {
  it('should parse folders correctly', () => {
    const input = ' subdir styleguide  tools/redux tools/subdir/another  '
    const output = [
      'subdir',
      'styleguide',
      'tools/redux',
      'tools/subdir/another',
    ]
    expect(parseFolders(input)).toEqual(output)
  })
})

describe('getRemoteVersion', () => {
  const name = '@fake/package'

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return if remote package is not found', async () => {
    fetch.mockResolvedValue({
      status: 404,
    })
    const version = await getRemoteVersion(name)
    expect(version).toBeUndefined()
  })

  it('should try again when a request fails', async () => {
    fetch.mockResolvedValue({ ok: false, status: 401 })
    //@ts-ignore
    constants.REMOTE_VERSION_FAIL_TIMEOUT = 1
    await expect(getRemoteVersion(name)).rejects.toThrow()
    expect(fetch).toHaveBeenCalledTimes(constants.REMOTE_VERSION_MAX_TRIES)
  })

  it('should return the version number on success', async () => {
    const version = '0.0.1'
    const json = { 'dist-tags': { latest: version } }
    fetch.mockResolvedValue({ ok: true, status: 200, json: () => json })
    await expect(getRemoteVersion(name)).resolves.toEqual(version)
  })

  it('should return if latest dist-tag does not exist', async () => {
    const json = { 'dist-tags': {} }
    fetch.mockResolvedValue({ ok: true, status: 200, json: () => json })
    const version = await getRemoteVersion(name)
    expect(version).toBeUndefined()
  })
})
