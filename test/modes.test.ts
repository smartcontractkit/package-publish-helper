import * as helpers from '../src/helpers'
import { shouldVersionBeUpdated, shouldPackagePublish } from '../src/modes'

describe('shouldVersionBeUpdated', () => {
  const folders = 'styleguide tools/redux tools/local-storage'
  const branch = 'develop'

  const defaultPackageMock = () => ({ version: '0.0.2' })
  const styleguide = jest.fn(defaultPackageMock)
  const redux = jest.fn(defaultPackageMock)
  const localStorage = jest.fn(defaultPackageMock)
  let folderHasGitChangesSpy: jest.SpyInstance
  let runSpy: jest.SpyInstance

  beforeAll(() => {
    const dir = '/some/cwd'
    const pkg = 'package.json'
    const opts = { virtual: true }

    process.env.GITHUB_WORKSPACE = dir
    folderHasGitChangesSpy = jest.spyOn(helpers, 'folderHasGitChanges')
    runSpy = jest.spyOn(helpers, 'run')
    runSpy.mockReturnValue({ output: '{"version":"0.0.1"}' })
    jest.mock(`${dir}/styleguide/${pkg}`, styleguide, opts)
    jest.mock(`${dir}/tools/redux/${pkg}`, redux, opts)
    jest.mock(`${dir}/tools/local-storage/${pkg}`, localStorage, opts)
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  afterAll(() => {
    delete process.env.GITHUB_WORKSPACE
  })

  it('should NOT error if packages have changes and are updated correctly', async () => {
    folderHasGitChangesSpy.mockReturnValue(true)
    const { error } = await shouldVersionBeUpdated(folders, branch)
    expect(error).toBe(false)
  })

  it('should error if a package has changes but has not been updated', async () => {
    localStorage.mockReturnValue({ version: '0.0.1' })
    folderHasGitChangesSpy.mockReturnValue(true)
    const { error } = await shouldVersionBeUpdated(folders, branch)
    expect(error).toBe(true)
  })

  it('should NOT error if no packages have changes', async () => {
    folderHasGitChangesSpy.mockReturnValue(false)
    const { error } = await shouldVersionBeUpdated(folders, branch)
    expect(error).toBe(false)
    expect(runSpy).not.toHaveBeenCalled()
  })
})

describe('shouldPackagePublish', () => {
  const dir = '/some/cwd'
  const folder = 'styleguide'
  const localPackage = jest.fn()
  let getRemoteVersion: jest.SpyInstance

  beforeAll(() => {
    process.env.GITHUB_WORKSPACE = dir
    getRemoteVersion = jest.spyOn(helpers, 'getRemoteVersion')
    getRemoteVersion.mockResolvedValue('0.0.1')
    jest.mock(`${dir}/${folder}/package.json`, localPackage, { virtual: true })
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  afterAll(() => {
    delete process.env.GITHUB_WORKSPACE
  })

  it('should publish if the local verison is greater', async () => {
    localPackage.mockReturnValue({ version: '0.0.2' })
    const { should_publish } = await shouldPackagePublish(folder)
    expect(should_publish).toEqual('yes')
  })

  it('should not publish if local version is not greater', async () => {
    localPackage.mockReturnValue({ version: '0.0.1' })
    const { should_publish } = await shouldPackagePublish(folder)
    expect(should_publish).toEqual('no')
  })
})
