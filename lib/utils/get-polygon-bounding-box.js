'use strict'

module.exports = function (points) {
  let xmin = Number.POSITIVE_INFINITY
  let ymin = Number.POSITIVE_INFINITY
  let xmax = Number.NEGATIVE_INFINITY
  let ymax = Number.NEGATIVE_INFINITY

  points.forEach(([x, y]) => {
    if (x < xmin) xmin = x
    if (y < ymin) ymin = y
    if (x > xmax) xmax = x
    if (y > ymax) ymax = y
  })

  return [
    xmin,
    ymin,
    xmax,
    ymax
  ]
}
