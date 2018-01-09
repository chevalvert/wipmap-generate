'use strict'

const path = require('path')
const Voronoi = require('voronoi-diagram')
const Poisson = require('poisson-disk-sampling')
const inside = require('point-in-polygon')
const prng = require(path.join(__dirname, 'utils', 'prng'))

const defaultOpts = require(path.join(__dirname, '..', 'wipmap.config.json'))
const BIOMES_TYPES = [
  ['TAIGA', 'JUNGLE', 'SWAMP'],
  ['TUNDRA', 'FOREST', 'PLAINS'],
  ['TUNDRA', 'PLAINS', 'DESERT']
]

function calcBiomeType (temperature, humidity) {
  const i = Math.floor(temperature * BIOMES_TYPES[0].length)
  const j = Math.floor(humidity * BIOMES_TYPES.length)
  const type = BIOMES_TYPES[i][j]
  return type
}

module.exports = function generate (seedX, seedY, opts) {
  opts = Object.assign({}, defaultOpts, opts || {})
  prng.setSeed(seedX, seedY)

  const maps = {
    temperature: prng.perlinMap(2),
    humidity: prng.perlinMap(2),
    distortionX: prng.perlinMap(1 / 8, { clamp: [-opts.distortion, opts.distortion] }),
    distortionY: prng.perlinMap(1 / 8, { clamp: [-opts.distortion, opts.distortion] })
  }

  // Add 2 cells to form outer ring
  const width = opts.width + 2
  const height = opts.height + 2

  const sites = Array(width * height).fill().map((_, index) => {
    const i = index % width
    const j = (index - i) / width

    const site = [i + 0.5, j + 0.5]
    return onBoundary(i, j)
      ? site
      : site.map(v => (v + prng.randomFloat(-opts.jitter, opts.jitter)))
  })

  // NOTE: add outer ring for voronoi stability
  let ring = []
  for (let i = 1; i < width; i++) {
    ring.push([i, 0])
    ring.push([i, height])
  }

  for (let j = 0; j <= height; j++) {
    ring.push([0, j])
    ring.push([width, j])
  }

  const voronoi = Voronoi(sites.concat(ring))
  const biomes = voronoi.cells.map((cell, index) => {
    if (~cell.indexOf(-1)) return

    const site = sites[index]
    if (!site) return

    const cellPoints = cell.reduce((positions, point) => [...positions, voronoi.positions[point]], [])
    if (~cellPoints.indexOf(undefined)) return

    const isWater = prng.random() < opts.probablities.water
    const temperature = maps.temperature(site[0], site[1])
    const humidity = maps.humidity(site[0], site[1])

    return {
      site,
      cell: cellPoints,
      type: isWater ? 'WATER' : calcBiomeType(temperature, humidity),
      isBoundary: onBoundary(site[0] - 0.5, site[1] - 0.5)
    }
  }).filter(biome => biome)

  const K = 100 // Poisson Disk Sampling does not seem to work quite well on size of order [0 ~ 1]
  const minDistance = (1 / (opts.poissonDensity * 100)) * K
  const poisson = new Poisson([width * K, height * K], minDistance, minDistance * 2, 30, prng.random)
  const points = poisson.fill().map(([x, y]) => {
    x /= K
    y /= K

    const distortX = maps.distortionX(x, y)
    const distortY = maps.distortionY(x, y)
    const gradientX = prng.randomFloat(-opts.gradient, opts.gradient)
    const gradientY = prng.randomFloat(-opts.gradient, opts.gradient)
    const parentBiome = biomes.find(biome => inside([x + distortX, y + distortY], biome.cell))
    const gradientedBiome = biomes.find(biome => inside([x + distortX + gradientX, y + distortY + gradientY], biome.cell))
    if (!parentBiome || !gradientedBiome) return

    let biomeType = gradientedBiome.type

    // Disable gradient on WATER biome and biome next to WATER
    if (gradientedBiome.type !== 'WATER' && parentBiome.type === 'WATER') biomeType = 'WATER'
    if (gradientedBiome.type === 'WATER' && parentBiome.type !== 'WATER') biomeType = parentBiome.type

    return [
      x.toFixed(opts.decimals),
      y.toFixed(opts.decimals),
      biomeType
    ]
  }).filter(point => point)
  .reduce((categories, [x, y, biome]) => {
    categories[biome] = categories[biome] || []
    categories[biome].push([x, y])
    return categories
  }, {})

  return {
    x: seedX,
    y: seedY,
    width,
    height,
    biomes,
    points
  }

  function onBoundary (i, j) {
    return (i === 0 || i === width - 1) || (j === 0 || j === height - 1)
  }
}
