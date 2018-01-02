'use strict'

const fs = require('fs-extra')
const path = require('path')
const { createCanvas } = require('canvas')
const prng = require(path.join(__dirname, 'prng'))
const inside = require('point-in-polygon');
const { map, normalize } = require('missing-math')
const Poisson = require('poisson-disk-sampling')

const CONFIG = require(path.join(__dirname, '..', '..', 'config.json'))

const defaultOpts = {
  width: 800,
  height: 600,
  margin: 100,
  output: path.join(process.cwd(), 'output.png')
}

const colors = {
  'TAIGA' : '#66CCFF',
  'JUNGLE' : '#FF8000',
  'SWAMP' : '#3C421E',
  'TUNDRA' : '#800000',
  'PLAINS' : '#80FF00',
  'FOREST' : '#008040',
  'DESERT' : 'yellow',
  'WATER' : 'blue'
}
const getColorFromBiomeType = type => colors[type]

module.exports = (wipmap, opts) => new Promise((resolve, reject) => {
  opts = Object.assign({}, defaultOpts, opts || {})

  const canvas = createCanvas(opts.width + opts.margin * 2, opts.height + opts.margin * 2)
  const ctx = canvas.getContext('2d')

  const out = fs.createWriteStream(opts.output)
  const stream = canvas.pngStream();
  stream.on('data', chunk => out.write(chunk))
  stream.on('end', chunk => resolve(opts.output))

  ;(function background () {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(opts.margin, opts.margin, canvas.width - opts.margin * 2, canvas.height - opts.margin * 2)
  })()

  ;(function fill () {
    const cells = wipmap.voronoi.cells.map((cell, index) => {
      if (~cell.indexOf(-1)) return
      if (!wipmap.biomes[index]) return

      const normalizedPositions = cell.reduce((positions, position) => {
        const point = normalize(wipmap.voronoi.positions[position])
        return [...positions, point]
      }, [])

      // TODO: sanityze voronoi in the map generator function
      if (~normalizedPositions.indexOf(null)) return

      return {
        positions: normalizedPositions,
        type: wipmap.biomes[index].type,
        color: getColorFromBiomeType(wipmap.biomes[index].type)
      }
    }).filter(cell => cell)

    const noiseX = prng.perlinMap(CONFIG.distortionOctaves, { clamp: [-CONFIG.distortion, CONFIG.distortion] })
    const noiseY = prng.perlinMap(CONFIG.distortionOctaves, { clamp: [-CONFIG.distortion, CONFIG.distortion] })

    ;(function poisson() {
      const poisson = new Poisson([opts.width, opts.height], 2)
      const points = poisson.fill()
      console.log('Poisson disk sampling length', points.length)
      points.forEach(([x, y]) => {
        x += opts.margin
        y += opts.margin
        const rndx = noiseX(x, y) + prng.randomFloat(-CONFIG.gradient, CONFIG.gradient)
        const rndy = noiseY(x, y) + prng.randomFloat(-CONFIG.gradient, CONFIG.gradient)
        cells.forEach((cell, index) => {
          if (!cell) return
          if (cell.type === 'WATER') return
          if (inside([x + rndx, y + rndy], cell.positions)) {
            ctx.fillStyle = cell.color
            ctx.fillRect(x, y, 1, 1)
          }
        })
      })
    })()

    // ;(function fill () {
    //   for (let x = opts.margin; x < canvas.width - opts.margin; x++) {
    //     for (let y = opts.margin; y < canvas.height - opts.margin; y++) {
    //       const rndx = noiseX(x, y) + prng.randomFloat(-CONFIG.gradient, CONFIG.gradient)
    //       const rndy = noiseY(x, y) + prng.randomFloat(-CONFIG.gradient, CONFIG.gradient)
    //       cells.forEach((cell, index) => {
    //         if (!cell) return
    //         if (inside([x + rndx, y + rndy], cell.positions)) {
    //           if (cell.type !== 'WATER' || (x % 2 === 0 && y % 2 === 0)) {
    //             ctx.fillStyle = cell.color
    //             ctx.fillRect(x, y, 1, 1)
    //           }
    //         }
    //       })
    //     }
    //   }
    // })()
  })()

  // ;(function debugNoise (octaves) {
  //   const noise = prng.perlinMap(octaves, { clamp: [0, 1]})
  //   for (let x = opts.margin; x < canvas.width - opts.margin; x++) {
  //     for (let y = opts.margin; y < canvas.height - opts.margin; y++) {
  //       const v = Math.floor(noise(x, y) * 255)
  //       ctx.fillStyle = `rgb(${v}, ${v}, ${v})`
  //       ctx.fillRect(x, y, 1, 1)
  //     }
  //   }
  // })(64)

  ;(function crop () {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
    const [x1, y1] = normalize([0, 0])
    const [x2, y2] = normalize([0.5, 0.5])
    const width = canvas.width
    const height = canvas.height
    ctx.rect(x2, y2, width - x2 * 2, height - y2 * 2)
    ctx.rect(x1, y1, width - x1 * 2, height - y1 * 2)
    ctx.fill('evenodd')
  })()

  // ;(function voronoi () {
  //   ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
  //   wipmap.voronoi.cells.forEach(cell => {
  //     if (~cell.indexOf(-1)) return
  //     if (cell.filter(position => !wipmap.voronoi.positions[position]).length) return

  //     ctx.beginPath()
  //     cell.forEach((position, index) => {
  //       const [x, y] = normalize(wipmap.voronoi.positions[position])
  //       if (index === 0) ctx.moveTo(x, y)
  //       else ctx.lineTo(x, y)
  //     })
  //     ctx.stroke()
  //   })
  // })()

  // ;(function sites () {
  //   ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)'
  //   ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  //   wipmap.biomes.forEach(biome => {
  //     const [x, y] = normalize(biome.site)
  //     const [fromX, fromY] = normalize(biome.point)
  //     ctx.beginPath()
  //     ctx.moveTo(x, y)
  //     ctx.lineTo(fromX, fromY)
  //     ctx.stroke()
  //     ctx.fillRect(x - 5, y - 5, 10, 10)
  //   })
  // })()

  // ;(function grid () {
  //   ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
  //   ctx.beginPath()
  //   for (let i = 0; i <= CONFIG.width; i++) {
  //     const [x1, y1] = normalize([i, 0])
  //     const [x2, y2] = normalize([i, CONFIG.height])
  //     ctx.moveTo(x1, y1)
  //     ctx.lineTo(x2, y2)
  //   }
  //   for (let j = 0; j <= CONFIG.height; j++) {
  //     const [x1, y1] = normalize([0, j])
  //     const [x2, y2] = normalize([CONFIG.width, j])
  //     ctx.moveTo(x1, y1)
  //     ctx.lineTo(x2, y2)
  //   }
  //   ctx.stroke()
  // })()

  ;(function legend () {
    ctx.font = '10px Courier';
    Object.entries(colors).forEach(([name, color], index) => {
      const x = 10
      const y = canvas.height - 20 - 15 * index
      ctx.fillStyle = color
      ctx.fillRect(10, y, 10, 10)
      ctx.fillStyle = '#000000'
      ctx.fillText(name, x + 15, y + 8);
    })
  })()

  ;(function crop () {

  })

  return undefined

  function normalize (point) {
    if (point) return [
      map(point[0], 0, CONFIG.width, opts.margin, opts.margin + opts.width),
      map(point[1], 0, CONFIG.height, opts.margin, opts.margin + opts.height)
    ]
  }
})
