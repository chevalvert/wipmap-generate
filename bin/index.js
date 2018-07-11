#!/usr/bin/env node
'use strict'

const fs = require('fs-extra')
const path = require('path')
const args = require(path.join(__dirname, 'args'))
const env = process.env.NODE_ENV || 'production'

const generate = require('./../')
const png = require('./../lib/utils/write-png')

process.title = `WIPMAP ${args.x};${args.y}`
console.time(process.title)

console.time('generation')
const wipmap = generate(args.x, args.y)
console.timeEnd('generation')

;[].concat(args.output || []).forEach(output => {
  const filepath = path.resolve(output)
  const filetype = path.extname(output)

  console.time(filepath)
  switch (filetype) {
    case '.json':
      fs.outputJson(filepath, wipmap, { spaces: env !== 'production' ? 2 : 0 }, err => {
        if (err) throw err
      })
      break
    case '.png':
      png(wipmap, { filepath }).catch(err => { console.log(err) })
      break
  }
  console.timeEnd(filepath)
})

console.timeEnd(process.title)
