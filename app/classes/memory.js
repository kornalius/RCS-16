/**
 * @module classes
 */

const { Emitter } = require('../mixins/common/events')

const hexy = require('hexy')
const { hex, littleEndian } = require('../utils.js')

const RAM_SIZE = 4 * 1024 * 1024
const RAM = new ArrayBuffer(RAM_SIZE)

const DEFAULT_TYPE = 'i8'

const sizes = {
  i8: 1,
  s8: 1,
  i16: 2,
  s16: 2,
  i32: 4,
  s32: 4,
  f32: 4,
  str: 64,
}

const sizeNames = {
  i8: 'Uint8',
  s8: 'Int8',
  i16: 'Uint16',
  s16: 'Int16',
  i32: 'Uint32',
  s32: 'Int32',
  f32: 'Float32',
}

const sizeOf = function (type, value) {
  if (type === 'str') {
    return value.length
  }
  return _.isNumber(type) ? type : sizes[type]
}

class MemBlock extends Emitter {

  constructor (type = DEFAULT_TYPE, offset = 0, count = 1) {
    super()

    let size = sizeOf(type) * count

    offset = Math.ceil(offset / 4) * 4
    size = Math.ceil(size / 4) * 4

    this._type = type
    this._offset = offset
    this._count = count
    this._size = size
    this._active = true

    this._array = new window[sizeNames[type] + 'Array'](RAM, this._offset, this._count)
    this._view = new DataView(this._array.buffer)
  }

  free () {
    this._active = false
  }

  get active () { return this._active }
  get type () { return this._type }
  get offset () { return this._offset }
  get count () { return this._count }
  get top () { return this._offset }
  get bottom () { return this._offset + this._size - 1 }

  get size () { return this._size }
  get array () { return this._array }
  get view () { return this._view }

  clear () {
    this.fill()
  }

  db (type = DEFAULT_TYPE, offset = this._offset, ...args) {
    let sz = sizes[type]
    let fn = this._view['set' + sizeNames[type]]
    for (let a of args) {
      fn.call(this._view, offset, a)
      offset += sz
    }
  }

  ld (type = DEFAULT_TYPE, offset = this._offset) {
    return this._view['get' + sizeNames[type]](offset, littleEndian)
  }

  ldb (offset) {
    return this.ld('i8', offset)
  }

  ldw (offset) {
    return this.ld('i16', offset)
  }

  ldd (offset) {
    return this.ld('i32', offset)
  }

  ldf (offset) {
    return this.ld('f32', offset)
  }

  st (type = DEFAULT_TYPE, offset = this._offset, value = 0) {
    let size = sizeOf(type, value)
    this._view['set' + sizeNames[type]](offset, value, littleEndian)
    return offset + size
  }

  stb (offset, value = 0) {
    return this.st('i8', offset, value)
  }

  stw (offset, value = 0) {
    return this.st('i16', offset, value)
  }

  std (offset, value = 0) {
    return this.st('i32', offset, value)
  }

  stf (offset, value = 0) {
    return this.st('f32', offset, value)
  }

  ldl (offset = 0, count = 1) {
    return this._array.slice(offset, offset + count - 1)
  }

  lds (offset = this._offset, count = sizes.str) {
    let s = ''
    const c = Math.min(this._count, offset + count - 1)
    const mem = this._array
    while (offset <= c) {
      let c = mem[offset++]
      if (c === 0) {
        break
      }
      s += String.fromCharCode(c)
    }
    return s
  }

  stl (offset = this._offset, value) {
    this._array.set(Array.from(value.entries()), offset)
    return offset + value.length
  }

  sts (offset = this._offset, str = '', len = str.length) {
    for (let c of str) {
      this._array[offset++] = c
      len--
      if (len < 0) {
        break
      }
    }
    return offset
  }

  fill (value = 0, offset = this._offset, count = this._count) {
    this._array.fill(value, offset, offset + count - 1)
  }

  copy (src, tgt, count = 1) {
    this._array.copyWithin(tgt, src, src + count - 1)
  }

  read (offset, type = DEFAULT_TYPE) {
    if (_.isNumber(type)) {
      return this.ldl(offset, offset + sizeOf(type) - 1)
    }
    else if (type === 'str') {
      return this.lds(offset)
    }
    else {
      return this.ld(type, offset)
    }
  }

  write (value, offset = this._offset, type = DEFAULT_TYPE) {
    if (_.isNumber(type)) {
      let size = sizeOf(type, value)
      this._array.set(value.subarray(0, type - 1), offset)
      return offset + size
    }
    else if (type === 'str') {
      return this.sts(offset, value)
    }
    else {
      return this.st(type, offset, value)
    }
  }

  dump (offset = 0, size = 1024) {
    console.log('Dumping', size, ' bytes from memory at ', hex(offset))
    console.log(hexy.hexy(RAM, { offset, length: size, width: 16, caps: 'upper', indent: 2 }))
  }

}

module.exports = {
  MemBlock,
  DEFAULT_TYPE,
  RAM_SIZE,
  RAM,
  sizes,
  sizeOf,
}
