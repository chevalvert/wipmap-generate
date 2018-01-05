'use strict'

const fs = require('fs')
const path = require('path')
const minimist = require('minimist')

const minimistOpts = {
  boolean: ['help', 'version'],
  string: ['output', 'X', 'Y'],
  alias: {
    help: ['h'],
    version: ['v'],
    output: ['o'],
    x: ['X'],
    y: ['Y']
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

argv.x = parseFloat(argv.x || argv._[0])
argv.y = parseFloat(argv.y || argv._[1])

if (argv.x === undefined || argv.y === undefined || argv.output === undefined) {
  console.log(`See 'wipmap-generate -h' for usage`)
  process.exit(0)
}

module.exports = argv
