/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')

const PALETTE_MAX = 64

class Palette extends Emitter {

  constructor () {
    super()

    this.reset()
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }
  get size () { return PALETTE_MAX }

  async boot (cold = true) {
    this.clear()
    if (cold) {
      this._buffer = RCS.memoryManager.alloc(RCS.i32, this.size)
      this.reset()
    }
  }

  reset () {
    if (this._buffer) {
      this.set(0, '#00000000')
      this.set(1, '#000000ff')
      this.set(2, '#ffffffff')
      this.set(3, '#131313ff')
      this.set(4, '#1b1b1bff')
      this.set(5, '#272727ff')
      this.set(6, '#3d3d3dff')
      this.set(7, '#5d5d5dff')
      this.set(8, '#858585ff')
      this.set(9, '#b4b4b4ff')
      this.set(10, '#c7cfddff')
      this.set(11, '#92a1b9ff')
      this.set(12, '#657392ff')
      this.set(13, '#424c6eff')
      this.set(14, '#2a2f4eff')
      this.set(15, '#1a1932ff')
      this.set(16, '#0e071bff')
      this.set(17, '#1c121cff')
      this.set(18, '#391f21ff')
      this.set(19, '#5d2c28ff')
      this.set(20, '#8a4836ff')
      this.set(21, '#bf6f4aff')
      this.set(22, '#e69c69ff')
      this.set(23, '#f6ca9fff')
      this.set(24, '#edab50ff')
      this.set(25, '#e07438ff')
      this.set(26, '#c64524ff')
      this.set(27, '#8e251dff')
      this.set(28, '#ff5000ff')
      this.set(29, '#ed7614ff')
      this.set(30, '#ffa214ff')
      this.set(31, '#ffc825ff')
      this.set(32, '#ffeb57ff')
      this.set(33, '#d3fc7eff')
      this.set(34, '#99e65fff')
      this.set(35, '#5ac54fff')
      this.set(36, '#33984bff')
      this.set(37, '#1e6f50ff')
      this.set(38, '#134c4cff')
      this.set(39, '#0c2e44ff')
      this.set(40, '#00396dff')
      this.set(41, '#0069aaff')
      this.set(42, '#0098dcff')
      this.set(43, '#00cdf9ff')
      this.set(44, '#0cf1ffff')
      this.set(45, '#94fdffff')
      this.set(46, '#fdd2edff')
      this.set(47, '#f389f5ff')
      this.set(48, '#db3ffdff')
      this.set(49, '#7a09faff')
      this.set(50, '#3003d9ff')
      this.set(51, '#0c0293ff')
      this.set(52, '#03193fff')
      this.set(53, '#3b1443ff')
      this.set(54, '#622461ff')
      this.set(55, '#93388fff')
      this.set(56, '#ca52c9ff')
      this.set(57, '#c85086ff')
      this.set(58, '#f68187ff')
      this.set(59, '#f5555dff')
      this.set(60, '#ea323cff')
      this.set(61, '#c42430ff')
      this.set(62, '#891e2bff')
      this.set(63, '#571c27ff')
    }
  }

  tick (t) {
  }

  clear () {
    if (this._buffer) {
      this.array.fill(0)
      RCS.video.refresh()
    }
  }

  shut () {
    if (this._buffer) {
      this._buffer.free()
      this._buffer = undefined
    }
  }

  get (c) {
    return this.array[c]
  }

  set (c, r, g, b, a) {
    this.array[c] = this.rgba_to_num(r, g, b, a)
  }

  refresh (flip = true) {
    RCS.video.refresh(flip)
    RCS.video.force_update = true
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

    if (_.isString(r)) {
      let c = new window.Color(r)
      let a = _.parseInt('0x' + r.substr(r.length - 2))
      r = c.rgbNumber() << 8 | a
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
    for (let c = 0; c < this.size; c++) {
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
