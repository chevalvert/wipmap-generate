#!/usr/bin/env node
'use strict'

const fs = require('fs-extra')
const path = require('path')
const args = require(path.join(__dirname, 'args'))
const env = process.env.NODE_ENV || 'production'

const generate = require('../')

const prefix = `WIPMAP[${args.x};${args.y}]`
console.time(prefix)

const wipmap = generate(args.x, args.y)

fs.outputJson(args.output, wipmap, { spaces: env !== 'production' ? 2 : 0 }, (err) => {
  if (err) throw err
})

if (env !== 'production') {
  const png = require(path.join(__dirname, '..', 'lib', 'utils', 'write-png'))
  const output = args.output ? args.output.replace('.json', '.png') : path.join(process.cwd(), 'output.png')
  png(wipmap, { output })
    .then(output => console.log(`✔︎  Success: ${output}`))
    .catch(err => console.log(err))
}

console.timeEnd(prefix)
