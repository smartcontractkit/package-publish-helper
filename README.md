# package-publish-helper

A GitHub Action to help with tasks related to publishing NPM packages. Two modes of operation: `version` and `publish`.

## version

Checks to see if the version number of a package in a monorepo needs to be updated.

Works as follows: if changes have been made to a package when comparing it to the `develop` branch, but the version number has not been updated, log the packages and fail the run.

### version inputs

| Name      | Description                                                                       | Default   |
| --------- | --------------------------------------------------------------------------------- | --------- |
| `mode`    | (**required**) The mode to run the action in (`version` or `publish`).            |           |
| `folders` | (**required**) A space-separated list of subdirectories of the packages to check. |           |
| `branch`  | The branch to use when running the diff and comparing the version.                | `develop` |

### version usage

```yaml
jobs:
  check:
    name: Run Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repo
        uses: actions/checkout@v2
        with:
          fetch-depth: 0 # fetch entire git history so compare branch will be available

      - name: Determine if package verisons need to be updated
        uses: smartcontractkit/package-publish-helper@master
        with:
          mode: version
          folders: styleguide tools/redux tools/local-storage tools/ts-helpers tools/json-api-client
```

## publish

Checks to see if a package in a monorepo should be published.

Works as follows: if the version of the package is greater than the version published on NPM, output `yes`.

### publish inputs

| Name     | Description                                                            | Default |
| -------- | ---------------------------------------------------------------------- | ------- |
| `mode`   | (**required**) The mode to run the action in (`version` or `publish`). |         |
| `folder` | (**required**) The relative path to the folder to check.               |         |

### publish outputs

| Name             | Description                       |
| ---------------- | --------------------------------- |
| `should_publish` | Resolves to either `yes` or `no`. |

### publish usage

```yaml
jobs:
  publish:
    name: Publish styleguide
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v2

      - name: Determine if publish is necessary
        id: helper
        uses: smartcontractkit/package-publish-helper@master
        with:
          mode: publish
          folder: styleguide

      - name: Publish
        if: steps.helper.outputs.should_publish == 'yes'
        run: echo This package should publish!
```
