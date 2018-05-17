/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const TOKENS = require('./tokens')

class FrameItem extends Emitter {

  constructor (frame, name, type, value) {
    super()

    this._frame = frame
    this._name = name
    this._type = type
    this._value = value
  }

  get frame () { return this._frame }
  get name () { return this._name }
  get type () { return this._type }
  get value () { return this._value }
  get local () { return this._frame.local }
  get global () { return this._frame.global }

  is (type) {
    return this._type === type || this._name === type
  }

  get isVar () { return this.is(TOKENS.VAR) }
  get isClass () { return this.is(TOKENS.CLASS) }
  get isFn () { return this.is(TOKENS.FN) }

}

class Frame extends Emitter {

  constructor (frames, type, global = false) {
    super()

    this._frames = frames
    this._type = type
    this._global = global
    this._items = []
  }

  get type () { return this._type }
  get items () { return this._items }
  get local () { return !this._global }
  get global () { return this._global }

  add (name, type, value) {
    let i = new FrameItem(this, name, type, value)
    this._items.push(i)
    return i
  }

  exists (name, type) {
    return _.find(this._items, type ? { name, type } : { name })
  }

  fn_exists (name) {
    return this.exists(name, TOKENS.FN)
  }

  var_exists (name) {
    return this.exists(name, TOKENS.VAR)
  }

  class_exists (name) {
    return this.exists(name, TOKENS.CLASS)
  }

}

class Frames extends Emitter {

  constructor () {
    super ()

    this.reset()
  }

  get queue () { return this._queue }
  get current () { return _.last(this._queue) }

  reset () {
    this._queue = []
  }

  start (type, global = false) {
    this._queue.push(new Frame(this, type, global))
  }

  end () {
    this._queue.pop()
  }

  add (name, type, value) {
    return this.current.add(name, type, value)
  }

  find (name) {
    return _.find(this._queue, { name })
  }

  exists (name, type) {
    for (let i = this._queue.length - 1; i >= 0; i--) {
      let c = this._queue[i]
      let fi = c.exists(name, type)
      if (fi) {
        return fi
      }
    }
    return undefined
  }

  fn_exists (name) {
    return this.exists(name, TOKENS.FN)
  }

  class_exists (name) {
    return this.exists(name, TOKENS.CLASS)
  }

  var_exists (name) {
    return this.exists(name, TOKENS.VAR)
  }

}

module.exports = {
  Frame,
  FrameItem,
  Frames,
}
