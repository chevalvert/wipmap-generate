'use strict'

const path = require('path')
const fastRandom = require('fast-random')
const { Perlin2 } = require('tumult')
const { map, clamp } = require('missing-math')
const CONFIG = require(path.join(__dirname, '..', '..', 'wipmap.config.json'))

let seed = 0
let perlin = new Perlin2(seed)
let perlinOffset = { x: 0, y: 0 }
let randomizer = fastRandom(seed)

function setSeed (seedX, seedY) {
  const hash = hash2d(seedX, seedY) + ''
  const seed = parseInt(hash.split('0.').pop())

  randomizer = fastRandom(seed)
  // FIXME: correct offset from map to map
  perlinOffset = { x: seedX, y: seedY }
}

const random = () => randomizer.nextFloat()
const randomFloat = (min, max) => randomizer.nextFloat() * (max - min) + min
const randomInt = (min, max) => Math.floor(randomFloat(min, max))
const hash2d = (x, y) => Math.abs(Math.sin(Math.sin(x * 15.31) + Math.cos(y * 11.33 * (seed + 1)) + x + seed))


function perlinMap (octaves, opts) {
  opts = Object.assign({}, {
    clamp: [0, 1]
  }, opts || {})

  // FIXME: correct offset from map to map
  return new Perlin2(random())
    .transform(function (x, y) {
      const offX = x + perlinOffset.x
      const offY = y + perlinOffset.y
      return map(clamp(this.gen(offX / octaves, offY / octaves), -(1 - Number.EPSILON), 1 - Number.EPSILON), -1, 1, opts.clamp[0], opts.clamp[1])
    })
}

module.exports = {
  setSeed,
  random,
  randomInt,
  randomFloat,
  // FIXME: correct offset from map to map
  perlin: (x, y) => perlin.gen(x + perlinOffset.x, y + perlinOffset.y),
  perlinOctavate: (octaves, x, y) => perlin.octavate(octaves, x + perlinOffset.x, y + perlinOffset.y),
  perlinMap,
  hash2d
}
