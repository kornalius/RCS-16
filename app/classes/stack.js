/**
 * @module classes
 */

const { Emitter } = require('../mixins/common/events')
const { sizeOf } = require('./memory')

let mem_stacks = {}

class Stack extends Emitter {

  constructor (buffer, rolling = false, entry_type = 'i8', count = 255, entry_size = 0) {
    super()

    this._entry_type = buffer ? buffer.type : entry_type
    this._entry_size = buffer ? buffer.size : entry_size || sizeOf(this._entry_type)
    this._count = count
    this._rolling = rolling

    this._size = this._count * this._entry_size

    this._buffer = buffer || RCS.memoryManager.alloc(this._entry_type, this._size)

    mem_stacks[this._buffer.top] = this

    this.reset()
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }
  get top () { return this._buffer.top }
  get bottom () { return this._buffer.bottom }

  get ptr () { return this._ptr }
  get size () { return this._size }

  get entry_type () { return this._entry_type }
  get entry_size () { return this._entry_size }
  get count () { return this._count }
  get rolling () { return this._rolling }

  reset () {
    this._ptr = this.top
    this.clear()
  }

  clear () {
    this.array.fill(0)
  }

  free () {
    mem_stacks[this.top] = undefined
  }

  push (...value) {
    let sz = this._entry_size
    let t = this._entry_type
    let top = this.top
    let bottom = this.bottom
    let rolling = this._rolling

    for (let v of value) {
      if (rolling && this._ptr >= bottom) {
        this._buffer.copy(top + sz, top, bottom - sz)
        this._ptr -= sz
      }
      if (this._ptr + sz < bottom) {
        this._buffer.write(v, this._ptr, t)
        this._ptr += sz
      }
      else {
        break
      }
    }
  }

  pop () {
    if (this._ptr > this.top) {
      this._ptr -= this._entry_size
      return this._buffer.read(this._ptr, this._entry_type)
    }
    else {
      return undefined
    }
  }

  get used () { return Math.trunc((this._ptr - this.top) / this._entry_size) }

}

module.exports = {
  mem_stacks,
  Stack,
}
