/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')
const { video } = require('./index')

const PALETTE_MAX = 32

class Palette extends Emitter {

  constructor () {
    super()

    this._buffer = RCS.memoryManager.alloc(RCS.i32, PALETTE_MAX)
    this.reset()
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }
  get size () { return PALETTE_MAX }

  reset () {
    this.set(0, 0x000000ff)
    this.set(1, 0xffffffff)
    this.set(2, 0x120723ff)
    this.set(3, 0x080e41ff)
    this.set(4, 0x12237aff)
    this.set(5, 0x4927a1ff)
    this.set(6, 0x7f65d0ff)
    this.set(7, 0x60c8d0ff)
    this.set(8, 0xaad7dfff)
    this.set(9, 0x331a36ff)
    this.set(10, 0x993dadff)
    this.set(11, 0xdf8085ff)
    this.set(12, 0xf2d5e8ff)
    this.set(13, 0x152418ff)
    this.set(14, 0x12451aff)
    this.set(15, 0x50bf50ff)
    this.set(16, 0x8fea88ff)
    this.set(17, 0xf2efdeff)
    this.set(18, 0x28130dff)
    this.set(19, 0x5f1500ff)
    this.set(20, 0x3f2a00ff)
    this.set(21, 0x5e4800ff)
    this.set(22, 0x91382dff)
    this.set(23, 0x9c6526ff)
    this.set(24, 0xbfd367ff)
    this.set(25, 0xe2d38eff)
    this.set(26, 0x211f35ff)
    this.set(27, 0x36324bff)
    this.set(28, 0x5a5871ff)
    this.set(29, 0x877f97ff)
    this.set(30, 0xc1aebdff)
    this.set(31, 0xe3d1d6ff)
  }

  clear () {
    this.array.fill(0)
    video.refresh()
  }

  shut () {
    this._buffer.free()
    this._buffer = undefined
  }

  get (c) {
    return this.array[c]
  }

  set (c, r, g, b, a) {
    this.array[c] = this.rgba_to_num(r, g, b, a)
  }

  red (rgba) { return this.split_rgba(rgba).r }

  green (rgba) { return this.split_rgba(rgba).g }

  blue (rgba) { return this.split_rgba(rgba).b }

  alpha (rgba) { return this.split_rgba(rgba).a }

  split_rgba (rgba) {
    return {
      r: rgba >> (RCS.littleEndian ? 24 : 0) & 0xFF,
      g: rgba >> (RCS.littleEndian ? 16 : 8) & 0xFF,
      b: rgba >> (RCS.littleEndian ? 8 : 16) & 0xFF,
      a: rgba >> (RCS.littleEndian ? 0 : 24) & 0xFF,
    }
  }

  rgba_to_num (r, g, b, a) {
    let reverse = x => {
      let s32 = new Uint32Array(4)
      let s8 = new Uint8Array(s32.buffer)
      let t32 = new Uint32Array(4)
      let t8 = new Uint8Array(t32.buffer)
      s32[0] = x
      t8[0] = s8[3]
      t8[1] = s8[2]
      t8[2] = s8[1]
      t8[3] = s8[0]
      return t32[0]
    }

    let c = r

    if (r && g) {
      c = a << 24 | r << 16 | g << 8 | b
    }

    return RCS.littleEndian ? reverse(c) : c
  }

  rgba_to_palette (r, g, b, a) {
    let mem = this.array
    let color = this.rgba_to_num(r, g, b, a)
    for (let c = 0; c < this.pal_count; c++) {
      if (mem[c] === color) {
        return c
      }
    }
    return -1
  }

}

module.exports = {
  Palette,
  PALETTE_MAX,
}
