/**
 * @module classes
 */

const { Emitter } = require('../mixins/common/events')
const { sizeOf } = require('./memory')
const { Struct, sizeOfFormat } = require('./struct')

class Stack extends Emitter {

  constructor (buffer, rolling = false, type = 'i8', count = 255) {
    super()

    this._type = buffer ? buffer.type : type
    this._count = count
    this._rolling = rolling
    this._size = this._count * this._entry_size

    this._buffer = buffer || RCS.memoryManager.alloc(this._type, this._size)

    this.reset()
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }
  get top () { return this._buffer.top }
  get bottom () { return this._buffer.bottom }

  get ptr () { return this._ptr }
  get size () { return this._size }

  get type () { return this._type }
  get count () { return this._count }
  get rolling () { return this._rolling }

  reset () {
    this.clear()
  }

  clear () {
    this._ptr = this.top
    this.array.fill(0)
    this._types = []
  }

  free () {
  }

  push (...value) {
    let sz
    let t = this._type
    let top = this.top
    let bottom = this.bottom
    let rolling = this._rolling

    for (let v of value) {
      if (v instanceof Struct) {
        this._types.push(v.format)
        v = v.toBuffer()
        t = 'i8'
        sz = v.byteLength
      }
      else {
        t = this._type
        sz = sizeOf(t)
        this._types.push(t)
      }

      if (rolling && this._ptr >= bottom) {
        this._buffer.copy(top + sz, top, bottom - sz)
        this._ptr -= sz
      }

      if (this._ptr + sz <= bottom) {
        this._buffer.write(v, this._ptr, t)
        this._ptr += sz
      }
      else {
        break
      }
    }
  }

  pop () {
    let t = this._types.pop()
    let sz = sizeOf(t)
    let value

    if (this._ptr > this.top) {
      if (_.isObject(t)) {
        this._ptr -= sizeOfFormat(t)
        value = new Struct(t, this._buffer, this._ptr)
      }
      else {
        this._ptr -= sz
        value = this._buffer.read(this._ptr, t)
      }
    }
    return value
  }

}

module.exports = {
  Stack,
}
