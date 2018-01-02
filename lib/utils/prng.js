'use strict'

const fastRandom = require('fast-random')
const { Perlin2 } = require('tumult')
const { map, clamp } = require('missing-math')

let seed = 0
let perlin = new Perlin2(seed)
let randomizer = fastRandom(seed)

function setSeed (newSeed) {
  seed = newSeed
  randomizer = fastRandom(seed)
  perlin.seed(seed)
}

const random = () => randomizer.nextFloat()
const randomFloat = (min, max) => randomizer.nextFloat() * (max - min) + min
const randomInt = (min, max) => Math.floor(randomFloat(min, max))
const hash2d = (x, y) => Math.abs(Math.sin(Math.sin(x * 15.31) + Math.cos(y * 11.33 * (seed + 1)) + x + seed))


function perlinMap (octaves, opts) {
  opts = Object.assign({}, {
    clamp: [0, 1]
  }, opts || {})

  return new Perlin2(random())
    .transform(function (x, y) {
      return map(clamp(this.gen(x / octaves, y / octaves), -(1 - Number.EPSILON), 1 - Number.EPSILON), -1, 1, opts.clamp[0], opts.clamp[1])
    })
}

module.exports = {
  setSeed,
  random,
  randomInt,
  randomFloat,
  perlin: (x, y) => perlin.gen(x, y),
  perlinOctavate: (octaves, x, y) => perlin.octavate(octaves, x, y),
  perlinMap,
  hash2d
}
