/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const TOKENS = require('./tokens/tokens')

class FrameItem extends Emitter {

  constructor (frame, name, type, value, classFrame) {
    super()

    this._frame = frame
    this._name = name
    this._type = type
    this._value = value
    this._classFrame = classFrame
  }

  get frame () { return this._frame }
  get name () { return this._name }
  get type () { return this._type }
  get value () { return this._value }
  get classFrame () { return this._classFrame }
  get local () { return this._frame.local }
  get global () { return this._frame.global }

  is (type) {
    return this._type === type || this._name === type
  }

}

class Frame extends Emitter {

  constructor (frames, name, type, global = false, inherits) {
    super()

    this._id = _.uuid()
    this._name = name
    this._frames = frames
    this._type = type
    this._global = global
    this._items = []
    this._inherits = inherits
  }

  get id () { return this._id }
  get name () { return this._name }
  get type () { return this._type }
  get items () { return this._items }
  get local () { return !this._global }
  get global () { return this._global }
  get inherits () { return this._inherits }

  add (name, type, value, classFrame) {
    let i = new FrameItem(this, name, type, value, classFrame)
    this._items.push(i)
    return i
  }

  exists (name, type) {
    let parts = name.split('.')
    name = _.first(parts)

    let v = _.find(this._items, type ? { name, type } : { name })

    if (!v && this._inherits) {
      v = this._inherits.exists(name, type)
      if (v && v.classFrame) {
        v = v.classFrame.exists(_.rest(parts, 1).join('.'), type)
      }
    }

    return v
  }

}

class Frames extends Emitter {

  constructor () {
    super ()

    this.reset()
  }

  get queue () { return this._queue }
  get current () { return this._queue[this._current] }

  get realQueue () {
    let q = []

    if (this.current) {
      q.push(this.current)
    }

    for (let i = this._prev.length - 1; i >= 0; i--) {
      let c = this._prev[i]
      if (c !== -1) {
        q.push(this._queue[c])
      }
    }

    return q
  }

  error () {
    console.error(...arguments)
  }

  reset () {
    this._queue = []
    this._prev = []
    this._current = -1
  }

  start (name, type, global = false, inherits) {
    let f = new Frame(this, name, type, global, inherits)
    this._prev.push(this._current)
    this._queue.push(f)
    this._current = this._queue.length - 1
    return f
  }

  end (pop = true) {
    if (pop) {
      if (_.isEmpty(this._queue)) {
        this.error('Empty stack frames')
      }
      else {
        this._queue.pop()
      }
    }
    this._current = this._prev.pop()
    return this.current
  }

  add (name, type, value, classFrame) {
    if (this.current) {
      return this.current.add(name, type, value, classFrame)
    }
    else {
      this.error('No current stack frame')
      return undefined
    }
  }

  exists (name, type) {
    for (let q of this.realQueue) {
      let fi = q.exists(name, type)
      if (fi) {
        return fi
      }
    }

    return undefined
  }

  isInType (type) {
    for (let q of this.realQueue) {
      if (q.type === type) {
        return q
      }
    }
    return undefined
  }

  get inClass () {
    return this.isInType(TOKENS.CLASS)
  }

  get inFunction () {
    return this.isInType(TOKENS.FN)
  }

}

module.exports = {
  Frame,
  FrameItem,
  Frames,
}
