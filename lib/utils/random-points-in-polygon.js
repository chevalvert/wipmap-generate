'use strict'

const inside = require('point-in-polygon')
const aabb = require('./get-polygon-bounding-box')

module.exports = function (len, polygon, random, MAX_ATTEMPTS = 30) {
  random = random || Math.random

  const [xmin, ymin, xmax, ymax] = aabb(polygon)
  const points = []

  let attempts = 0
  while (points.length < len && attempts < MAX_ATTEMPTS) {
    const x = random() * (xmax - xmin) + xmin
    const y = random() * (ymax - ymin) + ymin
    if (inside([x, y], polygon)) {
      points.push([x, y])
      continue
    }
    attempts++
  }

  return points
}
