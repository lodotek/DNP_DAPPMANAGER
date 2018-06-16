const semver = require('semver')
const fs = require('fs')
const base64Img = require('base64-img')
const dockerList_default = require('../modules/dockerList')
const parse = require('../utils/parse')
const res =   require('../utils/res')
const ethchain = require('../watchers/ethchain')

// CALL DOCUMENTATION:
// > result = packages =
//   [
//     {
//       name: packageName, (string)
//       status: 'Preparing', (string)
//       currentVersion: '0.1.2' or null, (String)
//     },
//     ...
//   ]

function createListDirectory(getDirectory,
  dockerList=dockerList_default) {

  return async function listDirectory() {

    // Make sure the chain is synced
    if(await ethchain.isSyncing()) {
      return res.success("Mainnet is syncing", [])
    }

    // List of available packages in the directory
    const packages = await getDirectory()
    // List of current packages locally
    const dnpList = await dockerList.listContainers()

    // Extend package object contents
    for (const pkg of packages) {

      // Fetch the current package version
      const _package = dnpList.filter(c => c.name == pkg.name)[0]
      pkg.currentVersion = _package ? _package.version : null

    }

    return res.success("Listed directory with " + packages.length + " packages", packages)

  }
}


module.exports = createListDirectory