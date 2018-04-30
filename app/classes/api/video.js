/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')
const { overlays, palette, text, sprite } = require('./index')

PIXI.Point.prototype.distance = target => {
  Math.sqrt((this.x - target.x) * (this.x - target.x) + (this.y - target.y) * (this.y - target.y))
}

const VIDEO_WIDTH = 378
const VIDEO_HEIGHT = 264

let stage
let renderer

class Video extends Emitter {

  constructor (scale = 3, offsetX = 0, offsetY = 0, marginX = 32, marginY = 32) {
    super()

    this.force_update = false
    this.force_flip = false

    this._width = VIDEO_WIDTH
    this._height = VIDEO_HEIGHT
    this._size = this._width * this._height
    this._scale = scale
    this._offsetX = offsetX
    this._offsetY = offsetY
    this._marginX = marginX
    this._marginY = marginY

    this._buffer = RCS.memoryManager.alloc(RCS.i8, this._size)

    stage = new PIXI.Container()

    renderer = new PIXI.autoDetectRenderer(this._width * this._scale + this._marginX, this._height * this._scale + this._marginY, null, { })
    renderer.view.style.position = 'absolute'
    renderer.view.style.top = Math.trunc(this._marginX / 2) + 'px'
    renderer.view.style.left = Math.trunc(this._marginY / 2) + 'px'

    window.addEventListener('resize', () => {
      // let ratio = Math.min(window.innerWidth / this.width, window.innerHeight / this.height)
      // this.stage.scale.x = this.stage.scale.y = ratio
      // renderer.resize(Math.ceil(this.width * ratio), Math.ceil(this.height * ratio))
      renderer.view.style.left = window.innerWidth * 0.5 - renderer.width * 0.5 + 'px'
      renderer.view.style.top = window.innerHeight * 0.5 - renderer.height * 0.5 + 'px'

      if (this.refresh) {
        this.refresh()
      }
    })

    document.body.appendChild(renderer.view)

    this.reset()

    this.emit('resize')

    this.clear()
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }
  get list () { return this._list }
  get width () { return this._width }
  get height () { return this._height }
  get size () { return this._size }
  get scale () { return this._scale }
  get offsetX () { return this._offsetX }
  get offsetY () { return this._offsetY }
  get marginX () { return this._marginX }
  get marginY () { return this._marginY }

  tick (t) {
    overlays.tick(t)

    if (this.force_update) {
      this.force_update = false

      palette.tick(t)
      text.tick(t)
      sprite.tick(t)

      if (this.force_flip) {
        this.flip()
      }

      renderer.render(stage)
    }
  }

  reset () {
    if (overlays) {
      overlays.reset()
    }
    if (palette) {
      palette.reset()
    }
    if (sprite) {
      sprite.reset()
    }
    if (text) {
      text.reset()
    }
    this.clear()
  }

  refresh (flip = true) {
    this.force_update = true
    if (!this.force_flip) {
      this.force_flip = flip
    }
  }

  clear () {
    this.array.fill(0)
    this.refresh()
  }

  shut () {
    palette.shut()
    text.shut()
    sprite.shut()
    overlays.shut()

    this._buffer.free()
    this._buffer = undefined

    stage.destroy()
    stage = undefined

    renderer.destroy()
    renderer = undefined
  }

  flip () {
    let screenOverlay = this.screen
    let data = screenOverlay.context.getImageData(0, 0, screenOverlay.width, screenOverlay.height)
    let pixels = new Uint32Array(data.data.buffer)

    let mem = this.array
    for (let i = 0; i < this.size; i++) {
      pixels[i] = this._palette.get(mem[i])
    }

    screenOverlay.context.putImageData(data, 0, 0)

    this.force_flip = false
  }

  pixel (i, c) {
    let mem = this.array
    if (c !== undefined && mem[i] !== c) {
      mem[i] = c
    }
    return mem[i]
  }

  pixel_to_index (x, y) { return y * this.width + x }

  index_to_pixel (i) {
    let y = Math.min(Math.trunc(i / this.width), this.height - 1)
    let x = i - y
    return { x, y }
  }

  scroll (x, y) {
    let lw = y * this.width
    let s = lw
    let e = this.size - lw
    this.array.copy(s, 0, e - s)
    this.refresh()
  }

}

module.exports = {
  Video,
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  stage,
  renderer,
}
