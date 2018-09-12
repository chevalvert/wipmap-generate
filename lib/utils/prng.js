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
    perlinMap: (resolution, clamp = [0, 1]) => {
      const noise = new Perlin2(api.random())
      return (i, j) => {
        const x = (offset[0] + i * steps[0]) / resolution
        const y = (offset[1] + j * steps[1]) / resolution
        const value = noise.gen(x % 256, y % 256)
        return map(value, -1, 1, ...clamp)
      }
    }
  }
  return api
}
