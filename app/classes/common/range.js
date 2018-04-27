/**
 * @module classes
 */

const { Emitter } = require('../../mixins/common/events')

let Range = class Range extends Emitter {

  constructor (start, end) {
    super()
    let r = this._serialize(start, end)
    this.start = r.start
    this.end = r.end
  }

  _serialize (start, end) {
    if (start instanceof Range) {
      return { start: start.start, end: start.end }
    }
    else if (_.isArray(start)) {
      return { start: _.get(start, 0, 0), end: _.get(start, 1, 0) }
    }
    return { start, end }
  }

  static from (...value) {
    return new Range(...value)
  }

  clear () {
    this.start = 0
    this.end = 0
    return this
  }

  get halfRange () { return Math.floor((this.start - this.end) / 2) }

  get length () { return Math.abs(this.end - this.start) }

  get isEmpty () { return this.start === 0 && this.end === 0 }

  flip () {
    return new Range(this.end, this.start)
  }

  add (start, end) {
    ({ start, end } = this._serialize(start, end))
    this.start += start
    this.end += end
    return this
  }

  sub (start, end) {
    ({ start, end } = this._serialize(start, end))
    this.start -= start
    this.end -= end
    return this
  }

  mul (start, end) {
    ({ start, end } = this._serialize(start, end))
    this.start *= start
    this.end *= end
    return this
  }

  div (start, end) {
    ({ start, end } = this._serialize(start, end))
    this.start /= start
    this.end /= end
    return this
  }

  shrinkLeft (by) {
    this.start += by
    return this
  }

  shrinkRight (by) {
    this.end -= by
    return this
  }

  extendLeft (by) {
    this.start -= by
    return this
  }

  extendRight (by) {
    this.end += by
    return this
  }

  resize (start, end) {
    ({ start, end } = this._serialize(start, end))
    this.start = start
    this.end = end
    return this
  }

  clone () {
    return new Range(this.start, this.end)
  }

  lt (start, end) {
    ({ start, end } = this._serialize(start, end))
    return this.start < start && this.end < end
  }

  gt (start, end) {
    ({ start, end } = this._serialize(start, end))
    return this.start > start && this.end > end
  }

  le (start, end) {
    ({ start, end } = this._serialize(start, end))
    return this.start <= start && this.end <= end
  }

  ge (start, end) {
    ({ start, end } = this._serialize(start, end))
    return this.start >= start && this.end >= end
  }

  eq (start, end) {
    ({ start, end } = this._serialize(start, end))
    return this.start === start && this.end === end
  }

  ne (start, end) {
    ({ start, end } = this._serialize(start, end))
    return this.start !== start || this.end !== end
  }

  toString () {
    return '(start=' + this.start + ', end=' + this.end + ')'
  }

  toArray () {
    return [this.start, this.end]
  }

}

module.exports = {
  Range,
}
