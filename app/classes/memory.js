const hexy = require('hexy')
const { hex, littleEndian } = require('../utils.js')

const RAM_SIZE = 4 * 1024 * 1024
const RAM = new Uint8Array(RAM_SIZE)

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

class MemBlock {

  constructor (type, offset, size) {
    this._size = size || 1
    this._top = offset || 0
    this._active = true

    this._array = new window[sizeNames[type] + 'Array'](RAM, this._top, this._size)
    this._view = new DataView(this._array.buffer)
  }

  free () {
    this._active = false
  }

  get top () { return this._top }
  set top (value) {
    if (value !== this._top) {
      this._top = value
    }
  }

  get bottom () { return this._top + this._size - 1 }

  get size () { return this._size }
  set size (value) {
    if (value !== this._size) {
      this._size = value
    }
  }

  get array () { return this._array }
  get view () { return this._view }

  get active () { return this._active }
  set active (value) {
    if (value !== this._active) {
      this._active = value
    }
  }

  clear () { this.fill(0, this.top, this.size) }

  db (type, offset, ...args) {
    let sz = sizes[type]
    let fn = this._view['set' + sizeNames[type]]
    for (let a of args) {
      fn.call(this._view, offset, a)
      offset += sz
    }
  }

  ld (type, offset) {
    return this._view['get' + sizeNames[type]](offset, littleEndian)
  }

  ldb (offset) { return this.ld('i8', offset) }

  ldw (offset) { return this.ld('i16', offset) }

  ldd (offset) { return this.ld('i32', offset) }

  ldf (offset) { return this.ld('f32', offset) }

  st (type, offset, value) {
    let size = sizeOf(type, value)
    this._view['set' + sizeNames[type]](offset, value, littleEndian)
    return offset + size
  }

  stb (offset, value) { return this.st('i8', offset, value) }

  stw (offset, value) { return this.st('i16', offset, value) }

  std (offset, value) { return this.st('i32', offset, value) }

  stf (offset, value) { return this.st('f32', offset, value) }

  ldl (offset, size) {
    return this._array.slice(offset, offset + size - 1)
  }

  lds (offset, size) {
    if (_.isString(offset)) {
      return offset
    }

    let s = ''
    size = size || sizes.str
    const bottom = Math.min(offset + size - 1, this.bottom)
    const mem = this._array
    while (offset <= bottom) {
      const c = mem[offset++]
      if (c === 0) {
        break
      }
      s += String.fromCharCode(c)
    }
    return s
  }

  stl (offset, value, size) {
    this._array.set(value.subarray(0, size || value.byteLength), offset)
    return offset + size
  }

  sts (offset, str, size) {
    size = size || sizes.str - 1
    let a = _.map(str.split(''), i => i.charCodeAt(0))
    a.length = Math.min(size, a.length)
    this.fill(0, offset, size)
    this._array.set(a, offset)
    return offset + size
  }

  fill (value, top, size) {
    if (_.isUndefined(top)) {
      top = this._top
    }
    if (_.isUndefined(size)) {
      size = this._size
    }
    this._array.fill(value || 0, top, top + size)
  }

  copy (src, tgt, size) {
    this._array.copyWithin(tgt, src, src + size - 1)
  }

  read (offset, type = 'i8') {
    let size = sizeOf(type)
    if (_.isNumber(type)) {
      return this._array.slice(offset, offset + size - 1)
    }
    else if (type === 'str') {
      return this.lds(offset)
    }
    else {
      return this.ld(type, offset)
    }
  }

  write (value, offset, type = 'i8') {
    let size = sizeOf(type, value)
    if (_.isNumber(type)) {
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
  RAM_SIZE,
  RAM,
  sizes,
  sizeOf,
}
