/**
 * @module classes
 */

const { Emitter } = require('../../mixins/common/events')

let Point = class Point extends Emitter {

  constructor (x = 0, y = 0) {
    super()
    let p = this._serialize(x, y)
    this.x = p.x
    this.y = p.y
  }

  _serialize (x, y) {
    if (x instanceof Point) {
      return { x: x.x, y: x.y }
    }
    else if (_.isArray(x)) {
      return { x: _.get(x, 0, 0), y: _.get(x, 1, 0) }
    }
    return { x, y }
  }

  static from (...value) {
    return new Range(...value)
  }

  clear () {
    this.x = 0
    this.y = 0
    return this
  }

  get left () { return this.x }
  set left (value) { this.x = value }

  get top () { return this.y }
  set top (value) { this.y = value }

  get negative () { return new Point(-this.x, -this.y) }
  get round () { return new Point(Math.round(this.x), Math.round(this.y)) }
  get area () { return this.x * this.y }
  get min () { return Math.min(this.x, this.y) }
  get max () { return Math.max(this.x, this.y) }
  get magnitude () { return Math.sqrt(this.x * this.x + this.y * this.y) }
  get magnitudesq () { return this.x * this.x + this.y * this.y }
  get length () { return Math.sqrt(this.x * this.x + this.y * this.y) }
  get unit () { return this.div(this.length) }
  get center () { return new Point(Math.floor(this.x / 2), Math.floor(this.y / 2)) }

  get normalize () {
    let mag = this.magnitude()
    return new Point(this.x / mag, this.y / mag)
  }

  add (x, y) {
    ({ x, y } = this._serialize(x, y))
    this.x += x
    this.y += y
    return this
  }

  sub (x, y) {
    ({ x, y } = this._serialize(x, y))
    this.x -= x
    this.y -= y
    return this
  }

  mul (x, y) {
    ({ x, y } = this._serialize(x, y))
    this.x *= x
    this.y *= y
    return this
  }

  div (x, y) {
    ({ x, y } = this._serialize(x, y))
    this.x /= x
    this.y /= y
    return this
  }

  gt (x, y) {
    ({ x, y } = this._serialize(x, y))
    return this.x > x && this.y > y
  }

  ge (x, y) {
    ({ x, y } = this._serialize(x, y))
    return this.x >= x && this.y >= y
  }

  above (x, y) {
    ({ x, y } = this._serialize(x, y))
    return this.x > x || this.y > y
  }

  lt (x, y) {
    ({ x, y } = this._serialize(x, y))
    return this.x < x || this.y < y
  }

  le (x, y) {
    ({ x, y } = this._serialize(x, y))
    return this.x <= x || this.y <= y
  }

  beneath (x, y) {
    ({ x, y } = this._serialize(x, y))
    return this.x < x && this.y < y
  }

  eq (x, y) {
    ({ x, y } = this._serialize(x, y))
    return this.x === x && this.y === y
  }

  ne (x, y) {
    ({ x, y } = this._serialize(x, y))
    return this.x !== x || this.y !== y
  }

  distance (x, y) {
    ({ x, y } = this._serialize(x, y))
    let dx = this.x - x
    let dy = this.y - y
    return Math.sqrt(dx * dx + dy * dy)
  }

  distancesq (x, y) {
    ({ x, y } = this._serialize(x, y))
    let dx = this.x - x
    let dy = this.y - y
    return dx * dx + dy * dy
  }

  cross (x, y) {
    ({ x, y } = this._serialize(x, y))
    return this.x * y - this.y * x
  }

  dot (x, y) {
    ({ x, y } = this._serialize(x, y))
    return this.x * x + this.y * y
  }

  flip () {
    return new Point(this.y, this.x)
  }

  angle (x, y) {
    ({ x, y } = this._serialize(x, y))
    let p = new Point(x, y)
    return Math.atan2(p.cross(this), p.dot(this))
  }

  moveTo (x, y) {
    ({ x, y } = this._serialize(x, y))
    this.x = x
    this.y = y
    return this
  }

  offset (x, y) {
    ({ x, y } = this._serialize(x, y))
    this.x += x
    this.y += y
    return this
  }

  clone () {
    return new Point(this.x, this.y)
  }

  degreesTo (x, y) {
    ({ x, y } = this._serialize(x, y))
    let dx = this.x - x
    let dy = this.y - y
    let angle = Math.atan2(dy, dx)
    return angle * (180 / Math.PI)
  }

  rotate (theta) {
    return new Point(this.x * Math.cos(theta) - this.y * Math.sin(theta), this.x * Math.sin(theta) + this.y * Math.cos(theta))
  }

  pow (p) {
    return new Point(Math.pow(this.x, p), Math.pow(this.y, p))
  }

  interpolate (x, y, f) {
    ({ x, y } = this._serialize(x, y))
    return new Point((this.x + x) * f, (this.y + y) * f)
  }

  within (x, y, w, h) {
    if (x instanceof window.Rect) {
      h = x.h
      w = x.w
      y = x.y
      x = x.x
    }

    let minX = x
    let maxX = minX + w
    let minY = y
    let maxY = minY + h

    if (w < 0) {
      minX = maxX
      maxX = x
    }

    if (h < 0) {
      minY = maxY
      maxY = y
    }

    return minX <= this.x && this.x < maxX && minY <= this.y && this.y < maxY
  }

  forEachPoints (ex, ey, cb, context = this) {
    if (ex instanceof Point) {
      context = cb
      cb = ey
      ey = ex.y
      ex = ex.x
    }

    let dx = Math.abs(ex - this.x)
    let dy = Math.abs(ey - this.y)
    let dy2 = 2 * dy
    let dd = dy - dx
    let dd2 = 2 * dd
    let p = dd2

    let x = this.x
    let y = this.y
    let end = ex

    if (this.x > ex) {
      x = ex
      y = ey
      end = this.x
    }

    cb.call(context, x, y)
    while (x < end) {
      x++
      if (p < 0) {
        p += dy2
      }
      else {
        y++
        p += dd2
      }
      cb.call(context, x, y)
    }
  }

  toString () {
    return '(x=' + this.x + ', y=' + this.y + ')'
  }

  toAngle () {
    return this.angle(this)
  }

  toArray () {
    return [this.x, this.y]
  }

}

module.exports = {
  Point,
}
