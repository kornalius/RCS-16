/**
 * @module classes
 */

const { Emitter } = require('../mixins/common/events')
const { DEFAULT_TYPE, sizeOf } = require('./memory')

const sizeOfFormat = function (type) {
  if (_.isObject(type)) {
    let sz = 0
    for (let name in type) {
      let t = _.get(type, name, DEFAULT_TYPE)
      sz += _.isObject(t) ? sizeOfFormat(t) : sizeOf(t)
    }
    return sz
  }
  else {
    return sizeOf(type)
  }
}

class Struct extends Emitter {

  constructor (format, buffer, offset = 0) {
    super()

    this._format = format
    this._offset = offset
    this._size = sizeOfFormat(format)

    this._buffer = buffer || RCS.memoryManager.alloc('i8', this._size)

    this.reset()

    this._assignProperties()
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }
  get size () { return this._size }
  get format () { return this._format }
  get offset () { return this._offset }

  reset () {
    this.clear()
  }

  clear () {
    this.array.fill(0, this._offset, this._offset + this._size - 1)
  }

  free () {
  }

  _assignProperties (offset = 0) {
    let fmt = this._format
    for (let name in fmt) {
      let type = _.get(fmt, name, DEFAULT_TYPE)
      let size
      let n = '_' + name
      let entry

      if (_.isObject(type)) {
        entry = new Struct(type, this._buffer, offset)
        size = entry.size
      }
      else {
        size = sizeOfFormat(type)
        if (!_.isNumber(type) && ['i16', 's16', 'i32', 's32', 'f32'].indexOf(type) !== -1) {
          while (offset % 2 !== 0) { offset++ }
        }
        entry = { name, type, size, top: offset, bottom: offset + size - 1 }
      }

      Object.defineProperty(this, name, {
        enumerable: true,
        get: () => this.read(entry.top, entry.type),
        set: value => { this.write(value, entry.top, entry.type) },
      })

      this[n] = entry

      offset += size
    }

    return offset
  }

  fromBuffer (buf, offset = 0) {
    this._array.set(buf, offset)
    return this
  }

  toBuffer (offset = 0) {
    let buf = RCS.memoryManager.alloc('i8', sizeOfFormat(this._format))
    buf.write(this._array, offset)
    return buf
  }

  fromObject (obj) {
    for (let name of this._names) {
      if (this[name] instanceof Struct) {
        this[name].fromObject(obj[name])
      }
      else {
        this[name] = obj[name]
      }
    }
    return this
  }

  toObject () {
    let s = {}
    for (let name of this._names) {
      let value = this[name]
      if (value instanceof Struct) {
        s[name] = value.toObject()
      }
      else {
        s[name] = value
      }
    }
    return s
  }

}

module.exports = {
  sizeOfFormat,
  Struct,
}
