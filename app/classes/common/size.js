/**
 * @module classes
 */

const { Emitter } = require('../../mixins/common/events')

let Size = class Size extends Emitter {

  constructor (w, h) {
    super()
    let s = this._serialize(w, h)
    this.w = s.w
    this.h = s.h
  }

  _serialize (w, h) {
    if (w instanceof Size) {
      return { w: w.w, h: w.h }
    }
    else if (_.isArray(w)) {
      return { w: _.get(w, 0, 0), h: _.get(w, 1, 0) }
    }
    return { w, h }
  }

  clear () {
    this.w = 0
    this.h = 0
    return this
  }

  get width () { return this.w }
  get height () { return this.h }
  get halfWidth () { return Math.floor(this.w / 2) }
  get halfHeight () { return Math.floor(this.h / 2) }
  get length () { return Math.sqrt(this.w * this.w + this.h * this.h) }

  get isEmpty () { return this.w === 0 && this.h === 0 }
  get isSquare () { return this.w === this.h }
  get aspectRatio () { return this.w / this.h }
  get area () { return this.w * this.h }
  get perimeter () { return this.w * 2 + this.h * 2 }

  set width (value) { this.w = value }
  set height (value) { this.h = value }

  flip () {
    return new Size(this.h, this.w)
  }

  enlarge (w, h) {
    ({ w, h } = this._serialize(w, h))
    this.w += w
    this.h += h
    return this
  }

  shrink (w, h) {
    ({ w, h } = this._serialize(w, h))
    this.w -= w
    this.h -= h
    return this
  }

  resize (w, h) {
    ({ w, h } = this._serialize(w, h))
    this.w = w
    this.h = h
    return this
  }

  scale (s) {
    this.w *= s
    this.h *= s
    return this
  }

  clone () {
    return new Size(this.w, this.h)
  }

  lt (w, h) {
    ({ w, h } = this._serialize(w, h))
    return this.w < w && this.h < h
  }

  gt (w, h) {
    ({ w, h } = this._serialize(w, h))
    return this.w > w && this.h > h
  }

  le (w, h) {
    ({ w, h } = this._serialize(w, h))
    return this.w <= w && this.h <= h
  }

  ge (w, h) {
    ({ w, h } = this._serialize(w, h))
    return this.w >= w && this.h >= h
  }

  eq (w, h) {
    ({ w, h } = this._serialize(w, h))
    return this.w === w && this.h === h
  }

  ne (w, h) {
    ({ w, h } = this._serialize(w, h))
    return this.w !== w || this.h !== h
  }

  toString () {
    return '(w=' + this.w + ', h=' + this.h + ')'
  }

  toArray () {
    return [this.w, this.h]
  }

}

module.exports = {
  Size,
}
