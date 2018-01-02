'use strict'

const path = require('path')

const voronoi = require('voronoi-diagram')
const prng = require(path.join(__dirname, 'utils', 'prng'))
const CONFIG = require(path.join(__dirname, '..', 'config.json'))

const BIOMES_TYPES = [
  ['TAIGA', 'JUNGLE', 'SWAMP'],
  ['TUNDRA', 'FOREST', 'PLAINS'],
  ['TUNDRA', 'PLAINS', 'DESERT']
]

function findBiomeType (temperature, humidity) {
  const i = Math.floor(temperature * BIOMES_TYPES[0].length)
  const j = Math.floor(humidity * BIOMES_TYPES.length)
  const type = BIOMES_TYPES[i][j]
  // console.log((temperature * 50 - 10).toFixed(0)  + '°C', (humidity * 100).toFixed(0) + '%', type)
  return type
}

function onBoundary (i, j, w, h) {
  return (i === 0 || i === w - 1) || (j === 0 || j === h - 1)
}

module.exports = function generate (seedX, seedY) {
  const hash = prng.hash2d(seedX, seedY) + ''
  const seed = parseInt(hash.split('0.').pop())
  prng.setSeed(seed)

  const maps = {
    temperature: prng.perlinMap(2),
    humidity: prng.perlinMap(2)
  }

  const biomes = Array(CONFIG.width * CONFIG.height).fill().map((_, index) => {
    const i = index % CONFIG.width
    const j = (index - i) / CONFIG.width

    const biome = createBiome(i, j)
    const isBound = onBoundary(i, j, CONFIG.width, CONFIG.height)
    if (!isBound) biome.site = biome.point.map(p => p + prng.randomFloat(-CONFIG.jitter, CONFIG.jitter))
    return biome
  })

  let ring = []
  for (let i = -1; i < CONFIG.width + 1; i++) {
    ring.push(createBiome(i, -1))
    ring.push(createBiome(i, CONFIG.height))
  }

  for (let j = 0; j < CONFIG.height; j++) {
    ring.push(createBiome(-1, j))
    ring.push(createBiome(CONFIG.width, j))
  }

  const cells = voronoi(biomes
                        .concat(ring)
                        .map(biome => biome.site))

  // sanitise voronoi cell
  // NOTE: cannot use filter because length must stay the same
  cells.positions = cells.positions.map(([x, y]) => {
    if (x >= 0 && y >= 0 && x <= CONFIG.width && y <= CONFIG.height) { return [x, y] }
  })

  return { biomes, voronoi: cells }

  function createBiome (i, j) {
    const point = [i + 0.5, j + 0.5]

    const isWater = prng.random() < CONFIG.probablities.water
    const temperature = maps.temperature(point[0], point[1])
    const humidity = maps.humidity(point[0], point[1])

    return {
      i,
      j,
      point,
      site: point,
      humidity,
      temperature,
      type: isWater ? 'WATER' : findBiomeType(temperature, humidity)
    }
  }
}
