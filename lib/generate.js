'use strict'

const Voronoi = require('voronoi-diagram')
const Poisson = require('poisson-disk-sampling')
const inside = require('point-in-polygon')
const { map } = require('missing-math')
const PRNG = require('./utils/prng')

const defaultOpts = require('./../wipmap.config.json')

module.exports = function generate (x, y, opts) {
  opts = Object.assign({}, defaultOpts, opts || {})

  const width = opts.width
  const height = opts.height

  // NOTE: altough the seed is given as a String, the prng converts it to an integer
  const seed = opts.seed || 'wipmap'
  const prng = PRNG({
    seed,
    offset: [x, y],
    steps: [1, 1]
  })

  const maps = {
    temperature: prng.perlinMap(width),
    humidity: prng.perlinMap(height),
    distortionX: prng.perlinMap(1, [-opts.distortion, opts.distortion]),
    distortionY: prng.perlinMap(1, [-opts.distortion, opts.distortion]),
    jitterX: prng.perlinMap(2, [-opts.jitter, opts.jitter]),
    jitterY: prng.perlinMap(2, [-opts.jitter, opts.jitter])
  }

  const sites = Array(width * height).fill().map((_, index) => {
    const x = index % width
    const y = (index - x) / width

    const site = [x + 0.5, y + 0.5]
    return onBoundary(x, y)
      ? site
      : [site[0] + maps.jitterX(x, y), site[1] + maps.jitterY(x, y)]
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

    const temperature = maps.temperature(site[0], site[1])
    const humidity = maps.humidity(site[0], site[1])
    const isWater = humidity < opts.probablities.water && temperature < prng.random()

    let type = isWater ? 'WATER' : calcBiomeType(temperature, humidity)

    return {
      site: ignoreVoronoiOuterRing(site),
      cell: cellPoints.map(ignoreVoronoiOuterRing),
      type,
      isBoundary: onBoundary(site[0] - 0.5, site[1] - 0.5)
    }
  }).filter(biome => biome)

  // NOTE: Sampling normalization is done with K*K area distribution,
  // then by mapping point to the actual map dimensions
  const K = 100
  const minDistance = 1 / (Math.sqrt(opts.poissonDensity) * 100) * K
  const poisson = new Poisson([K, K], minDistance, minDistance * 2, 10, prng.random)
  const points = poisson.fill().map(([x, y]) => {
    x = (x / K) * width
    y = (y / K) * height

    if (x < 0.5 || x > width - 0.5 || y < 0.5 || y > height - 0.5) return

    ;[x, y] = ignoreVoronoiOuterRing([x, y])

    const distortion = [
      maps.distortionX(x, y),
      maps.distortionY(x, y)
    ]

    const gradient = [
      prng.randomFloat(-opts.gradient, opts.gradient),
      prng.randomFloat(-opts.gradient, opts.gradient)
    ]

    const parentBiome = biomes.find(biome => inside([x + distortion[0], y + distortion[1]], biome.cell))
    const gradientedBiome = biomes.find(biome => inside([x + distortion[0] + gradient[0], y + distortion[1] + gradient[1]], biome.cell))
    if (!parentBiome || !gradientedBiome) return

    let biomeType = gradientedBiome.type

    // Disable gradient on WATER biome and biome next to WATER
    if (gradientedBiome.type !== 'WATER' && parentBiome.type === 'WATER') biomeType = 'WATER'
    if (gradientedBiome.type === 'WATER' && parentBiome.type !== 'WATER') biomeType = parentBiome.type

    return [
      ...[x, y].map(a => a.toFixed(opts.decimals)),
      biomeType
    ]
  }).filter(point => point)
    .sort((a, b) => a[1] - b[1])
    .reduce((categories, [x, y, biome]) => {
      categories[biome] = categories[biome] || []
      categories[biome].push([x, y])
      return categories
    }, {})

  return {
    x,
    y,
    seed,
    width,
    height,
    biomes,
    points
  }

  function onBoundary (i, j) {
    return (i === 0 || i === width - 1) || (j === 0 || j === height - 1)
  }

  function ignoreVoronoiOuterRing (point) {
    return point && [
      map(point[0], 0.5, width - 0.5, 0, width),
      map(point[1], 0.5, height - 0.5, 0, height)
    ]
  }

  function calcBiomeType (temperature, humidity) {
    const i = Math.floor(temperature * opts.biomesMap[0].length)
    const j = Math.floor(humidity * opts.biomesMap.length)
    const type = opts.biomesMap[i][j]
    return type
  }
}
