'use strict'

const path = require('path')
const Voronoi = require('voronoi-diagram')
const Poisson = require('poisson-disk-sampling')
const inside = require('point-in-polygon')
const randomPointsInPolygon = require(path.join(__dirname, 'utils/random-points-in-polygon'))
const prng = require(path.join(__dirname, 'utils', 'prng'))

const defaultOpts = require(path.join(__dirname, '..', 'wipmap.config.json'))

module.exports = function generate (seedX, seedY, opts) {
  opts = Object.assign({}, defaultOpts, opts || {})
  const seed = prng.setSeed(seedX, seedY)

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

    let type = isWater ? 'WATER' : calcBiomeType(temperature, humidity)

    const isForest = (type === 'PLAINS' && prng.random() < opts.probablities.forest)
    if (isForest) type = 'FOREST'

    return {
      site,
      cell: cellPoints,
      type,
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
  .sort((a, b) => a[1] - b[1])
  .reduce((categories, [x, y, biome]) => {
    categories[biome] = categories[biome] || []
    categories[biome].push([x, y])
    return categories
  }, {})

  const landmarks = Object.entries(opts.landmarks).reduce((categories, [name, landmark]) => {
    categories[name] = Array(landmark.length).fill().map((_, index) => {
      const biomeType = landmark.biomes[index % landmark.biomes.length]
      const possibleBiomes = biomes.filter(({ type }) => type === biomeType)

      if (!possibleBiomes.length) return
      const biome = possibleBiomes[Math.floor(prng.random() * possibleBiomes.length)]
      const [x, y] = randomPointsInPolygon(1, biome.cell, prng.random)[0]
      return [
        x.toFixed(opts.decimals),
        y.toFixed(opts.decimals),
        biomeType
      ]
    }).filter(point => point)
    .sort((a, b) => {
      if (a[2] < b[2]) return -1
      if (a[2] > b[2]) return 1
      return 0
    })

    return categories
  }, {})

  return {
    seed,
    x: seedX,
    y: seedY,
    width,
    height,
    biomes,
    points,
    landmarks
  }

  function onBoundary (i, j) {
    return (i === 0 || i === width - 1) || (j === 0 || j === height - 1)
  }

  function calcBiomeType (temperature, humidity) {
    const i = Math.floor(temperature * opts.biomesMap[0].length)
    const j = Math.floor(humidity * opts.biomesMap.length)
    const type = opts.biomesMap[i][j]
    return type
  }
}
