'use strict'

const fs = require('fs-extra')
const path = require('path')
const { createCanvas } = require('canvas')
const { map } = require('missing-math')

const defaultOpts = {
  filepath: path.join(process.cwd(), 'output.png'),
  width: 960,
  height: 450,
  margin: 0,
  draw: [
    'background',
    'poisson',
    'voronoi',
    'landmarks',
    // 'grid',
    'sites',
    'title',
    'legend'
  ],
  colors: {
    'TAIGA': '#66CCFF',
    'JUNGLE': '#FF8000',
    'SWAMP': '#3C421E',
    'TUNDRA': '#800000',
    'PLAINS': '#80FF00',
    'FOREST': '#008040',
    'DESERT': 'yellow',
    'WATER': 'blue'
  }
}

module.exports = (wipmap, opts) => new Promise((resolve, reject) => {
  opts = Object.assign({}, defaultOpts, opts || {})

  const canvas = createCanvas(opts.width + opts.margin * 2, opts.height + opts.margin * 2)
  const ctx = canvas.getContext('2d')

  const out = fs.createWriteStream(opts.filepath)
  const stream = canvas.pngStream()
  stream.on('data', chunk => out.write(chunk))
  stream.on('end', chunk => resolve(opts.filepath))

  const getColorFromBiomeType = type => opts.colors[type]

  const drawMethods = {
    background: () => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(opts.margin, opts.margin, canvas.width - opts.margin * 2, canvas.height - opts.margin * 2)
    },

    poisson: () => {
      Object.entries(wipmap.points).forEach(([type, points]) => {
        ctx.fillStyle = getColorFromBiomeType(type)

        points.forEach(point => {
          const x = map(point[0], 0, wipmap.width, opts.margin, opts.width + opts.margin)
          const y = map(point[1], 0, wipmap.height, opts.margin, opts.height + opts.margin)
          ctx.fillRect(x, y, 2, 2)
        })
      })
    },

    landmarks: () => {
      ctx.fillStyle = 'black'
      Object.entries(wipmap.landmarks || {}).forEach(([type, points]) => {
        points.forEach(point => {
          const [x, y] = ignoreVoronoiOuterRing(point)
          ctx.fillText(type, x, y)
        })
      })
    },

    crop: () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
      const [x1, y1] = ignoreVoronoiOuterRing([0, 0])
      const [x2, y2] = ignoreVoronoiOuterRing([0.5, 0.5])
      const width = canvas.width
      const height = canvas.height
      ctx.rect(x2, y2, width - x2 * 2, height - y2 * 2)
      ctx.rect(x1, y1, width - x1 * 2, height - y1 * 2)
      ctx.fill('evenodd')
    },

    voronoi: (filled) => {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      wipmap.biomes.forEach(biome => {
        ctx.fillStyle = getColorFromBiomeType(biome.type)
        ctx.beginPath()
        biome.cell.forEach((position, index) => {
          const [x, y] = ignoreVoronoiOuterRing(position)
          if (index === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        })
        filled && ctx.closePath()
        filled && ctx.fill()
        ctx.stroke()
      })
    },

    sites: () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      wipmap.biomes.forEach(biome => {
        if (!biome.isBoundary) {
          const [x, y] = ignoreVoronoiOuterRing(biome.site)
          ctx.beginPath()
          ctx.fillRect(x - 5, y - 5, 10, 10)
        }
      })
    },

    grid: () => {
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i <= wipmap.width; i++) {
        const [x1, y1] = ignoreVoronoiOuterRing([i, 0])
        const [x2, y2] = ignoreVoronoiOuterRing([i, wipmap.height])
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
      for (let j = 0; j <= wipmap.height; j++) {
        const [x1, y1] = ignoreVoronoiOuterRing([0, j])
        const [x2, y2] = ignoreVoronoiOuterRing([wipmap.width, j])
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
      }
      ctx.stroke()
    },

    legend: () => {
      ctx.font = '10px Courier'
      Object.entries(opts.colors).forEach(([name, color], index) => {
        const [x, y] = [10, canvas.height - 20 - 15 * index]
        const { width } = ctx.measureText(name)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(x - 5, y - 5, width + 25, 20)

        ctx.fillStyle = color
        ctx.fillRect(10, y, 10, 10)

        ctx.fillStyle = '#000000'
        ctx.fillText(name, x + 15, y + 8)
      })
    },

    title: () => {
      ctx.font = '10px Courier'

      const title = `[${wipmap.x};${wipmap.y}]`
      const { width } = ctx.measureText(title)

      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(7.5, 7.5, width + 5, 20)

      ctx.fillStyle = '#000000'
      ctx.fillText(title, 10, 20)
    }
  }

  opts.draw
    .filter(cmd => drawMethods.hasOwnProperty(cmd) && typeof drawMethods[cmd] === 'function')
    .forEach(cmd => drawMethods[cmd]())

  function ignoreVoronoiOuterRing (point) {
    return point && [
      map(point[0], 0.5, wipmap.width - 0.5, 0, opts.width),
      map(point[1], 0.5, wipmap.height - 0.5, 0, opts.height)
    ]
  }
})
