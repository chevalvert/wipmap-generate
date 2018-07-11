'use strict'

const fs = require('fs-extra')
const path = require('path')
const { createCanvas } = require('canvas')
const { map } = require('missing-math')

const defaultOpts = {
  width: 800,
  height: 600,
  margin: 100,
  filepath: path.join(process.cwd(), 'output.png')
}

const colors = {
  'TAIGA': '#66CCFF',
  'JUNGLE': '#FF8000',
  'SWAMP': '#3C421E',
  'TUNDRA': '#800000',
  'PLAINS': '#80FF00',
  'FOREST': '#008040',
  'DESERT': 'yellow',
  'WATER': 'blue'
}
const getColorFromBiomeType = type => colors[type]

module.exports = (wipmap, opts) => new Promise((resolve, reject) => {
  opts = Object.assign({}, defaultOpts, opts || {})

  const canvas = createCanvas(opts.width + opts.margin * 2, opts.height + opts.margin * 2)
  const ctx = canvas.getContext('2d')

  const out = fs.createWriteStream(opts.filepath)
  const stream = canvas.pngStream()
  stream.on('data', chunk => out.write(chunk))
  stream.on('end', chunk => resolve(opts.filepath))

  background()
  legend()
  title()

  // poisson()
  crop()

  voronoi(true)
  landmarks()

  // grid()
  // sites()

  return undefined

  function background () {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(opts.margin, opts.margin, canvas.width - opts.margin * 2, canvas.height - opts.margin * 2)
  }

  function poisson () {
    Object.entries(wipmap.points).forEach(([type, points]) => {
      ctx.fillStyle = getColorFromBiomeType(type)

      points.forEach(point => {
        const x = map(point[0], 0, wipmap.width, opts.margin, opts.width + opts.margin)
        const y = map(point[1], 0, wipmap.height, opts.margin, opts.height + opts.margin)
        ctx.fillRect(x, y, 2, 2)
      })
    })
  }

  function landmarks () {
    ctx.fillStyle = 'black'
    Object.entries(wipmap.landmarks || {}).forEach(([type, points]) => {
      points.forEach(point => {
        const [x, y] = normalize(point)
        ctx.fillText(type, x, y)
      })
    })
  }

  function crop () {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    const [x1, y1] = normalize([0, 0])
    const [x2, y2] = normalize([0.5, 0.5])
    const width = canvas.width
    const height = canvas.height
    ctx.rect(x2, y2, width - x2 * 2, height - y2 * 2)
    ctx.rect(x1, y1, width - x1 * 2, height - y1 * 2)
    ctx.fill('evenodd')
  }

  function voronoi (filled) {
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    wipmap.biomes.forEach(biome => {
      ctx.fillStyle = getColorFromBiomeType(biome.type)
      ctx.beginPath()
      biome.cell.forEach((position, index) => {
        const [x, y] = normalize(position)
        if (index === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      filled && ctx.closePath()
      filled && ctx.fill()
      ctx.stroke()
    })
  }

  function sites () {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    wipmap.biomes.forEach(biome => {
      if (!biome.isBoundary) {
        const [x, y] = normalize(biome.site)
        ctx.beginPath()
        ctx.fillRect(x - 5, y - 5, 10, 10)
      }
    })
  }

  function grid () {
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i <= wipmap.width; i++) {
      const [x1, y1] = normalize([i, 0])
      const [x2, y2] = normalize([i, wipmap.height])
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    for (let j = 0; j <= wipmap.height; j++) {
      const [x1, y1] = normalize([0, j])
      const [x2, y2] = normalize([wipmap.width, j])
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()
  }

  function legend () {
    ctx.font = '10px Courier';
    Object.entries(colors).forEach(([name, color], index) => {
      const x = 10
      const y = canvas.height - 20 - 15 * index
      ctx.fillStyle = color
      ctx.fillRect(10, y, 10, 10)
      ctx.fillStyle = '#000000'
      ctx.fillText(name, x + 15, y + 8);
    })
  }

  function title () {
    ctx.font = '10px Courier';
    ctx.fillText(`[${wipmap.x};${wipmap.y}]`, 10, 20);
  }

  function normalize (point) {
    if (point) return [
      map(point[0], 0, wipmap.width, opts.margin, opts.margin + opts.width),
      map(point[1], 0, wipmap.height, opts.margin, opts.margin + opts.height)
    ]
  }
})
