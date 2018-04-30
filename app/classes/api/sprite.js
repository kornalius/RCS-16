/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')
const { video, palette, overlays } = require('./index')

const SPRITE_MAX = 128
const SPRITE_SIZE = 64

class Sprite extends Emitter {

  constructor () {
    super()

    this._list = []
    this._width = SPRITE_SIZE
    this._height = SPRITE_SIZE
    this._size = this._width * this._height
    this._buffer = RCS.memoryManager.alloc(RCS.i8, this._size * SPRITE_MAX)

    this._canvas = []
    this._context = []
    this._texture = []

    for (let i = 0; i < SPRITE_MAX; i++) {
      let c = new PIXI.CanvasBuffer(this._width, this._height)
      let ctx = c.canvas.getContext('2d', { alpha: true, antialias: false })
      let t = PIXI.Texture.fromCanvas(c.canvas, PIXI.SCALE_MODES.NEAREST)
      t.scaleMode = PIXI.SCALE_MODES.NEAREST
      this._canvas[i] = c
      this._context[i] = ctx
      this._texture[i] = t
    }
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }
  get list () { return this._list }
  get width () { return this._width }
  get height () { return this._height }
  get size () { return this._size }

  tick (t) {
    if (video.force_update) {
      this.draw()
      video.force_update = false
    }
  }

  get (idx) {
    let s = idx * this._size
    let e = s + this._size
    return this.array.slice(s, e)
  }

  set (idx, memBlock) {
    let s = idx * this._size
    let e = s + this._size
    this._buffer.copy()
  }

  // update pixels in PIXI.Texture
  update (idx) {
    let sw = this._width
    let sh = this._height
    let ss = this._size
    let mem = this.array

    let ctx = this._context[idx]
    let data = ctx.getImageData(0, 0, sw, sh)
    let pixels = new Uint32Array(data.data.buffer)
    let ptr = idx * ss
    for (let by = 0; by < sh; by++) {
      let pi = by * sw
      for (let bx = 0; bx < sw; bx++) {
        pixels[pi++] = palette[mem[ptr++]]
      }
    }
    ctx.putImageData(data, 0, 0)

    let uid = this._texture[idx].uid
    for (let s of overlays.sprite.children) {
      if (s.texture.uid === uid) {
        s.texture.update()
      }
    }
  }

  reset () {
    this.clear()
  }

  clear () {
    this.array.fill(0)
    for (let i = 0; i < SPRITE_MAX; i++) {
      this.update(i)
    }
    video.refresh(true)
  }

  shut () {
    this._buffer.free()
    this._buffer = undefined
  }

  find (name) {
    for (let s of overlays.stage.children) {
      if (s.__name === name) {
        return s
      }
    }
    return null
  }

  add (name, idx, x, y, z) {
    let s = new PIXI.Sprite(this._texture[idx])
    s.position = new PIXI.Point(x, y)
    s.__name = name
    overlays.sprite.addChild(s)
  }

  del (name) {
    let s = this.find(name)
    if (s) {
      overlays.sprite.removeChild(s)
    }
  }

  move (name, x, y, z) {
    let s = this.find(name)
    if (s) {
      s.position = new PIXI.Point(x, y)
      if (z) {
        s.z = z
      }
      video.refresh(false)
    }
  }

  move_by (name, x, y) {
    let s = this.find(name)
    if (s) {
      s.position = new PIXI.Point(s.position.x + x, s.position.y + y)
      video.refresh(false)
    }
  }

}

module.exports = {
  Sprite,
  SPRITE_MAX,
  SPRITE_SIZE,
}
