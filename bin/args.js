'use strict'

const fs = require('fs')
const path = require('path')
const minimist = require('minimist')

const minimistOpts = {
  boolean: ['help', 'version'],
  string: ['output'],
  alias: {
    help: ['h'],
    version: ['v'],
    output: ['o']
  }
}

const argv = minimist(process.argv.slice(2), minimistOpts)

if (argv.help) {
  console.log(fs.readFileSync(path.join(__dirname, 'usage.txt'), 'utf-8'))
  process.exit(0)
}

if (argv.version) {
  const pckg = require(path.join(__dirname, '..', 'package.json'))
  console.log(pckg.version)
  process.exit(0)
}

if (argv._.length < 2) {
  console.log(`See 'wipmap-generate -h' for usage`)
  process.exit(0)
}

argv.x = argv._[0]
argv.y = argv._[1]

module.exports = argv
