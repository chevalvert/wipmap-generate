'use strict'

const fastRandom = require('fast-random')
const { Perlin2 } = require('tumult')
const { map } = require('missing-math')

module.exports = ({
  seed = 'wipmap',
  offset = [0, 0],
  steps = [1, 1]
} = {}) => {
  seed = parseInt(seed, 36)
  const r = fastRandom(seed)
  const api = {
    random: r.nextFloat,
    randomFloat: (min, max) => r.nextFloat() * (max - min) + min,
    randomInt: (min, max) => Math.floor(r.nextFloat() * (max - min) + min),
    perlinMap: (octaves, clamp = [0, 1]) =>
      new Perlin2(api.random()).transform(function (i, j) {
        return map(
          this.gen((1 + offset[0] + i * steps[0]) / octaves, (1 + offset[1] + j * steps[1]) / octaves),
          -1, 1,
          clamp[0], clamp[1]
        )
      })
  }
  return api
}
