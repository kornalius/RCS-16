/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')

PIXI.Point.prototype.distance = target => {
  Math.sqrt((this.x - target.x) * (this.x - target.x) + (this.y - target.y) * (this.y - target.y))
}

const VIDEO_WIDTH = 480
const VIDEO_HEIGHT = 400
const VIDEO_SCALE = 2
const VIDEO_OFFSETX = 0
const VIDEO_OFFSETY = 0
const VIDEO_MARGINX = 4
const VIDEO_MARGINY = 4

RCS.stage = new PIXI.Container()
RCS.renderer = new PIXI.autoDetectRenderer(100, 100, null, { roundPixels: true, autoResize: true })

class Video extends Emitter {

  constructor (scale = VIDEO_SCALE, offsetX = VIDEO_OFFSETX, offsetY = VIDEO_OFFSETY, marginX = VIDEO_MARGINX, marginY = VIDEO_MARGINY) {
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

    RCS.renderer.resize(this._width * this._scale + this._marginX, this._height * this._scale + this._marginY)
    RCS.renderer.view.style.position = 'absolute'
    RCS.renderer.view.style.top = Math.trunc(this._marginX / 2) + 'px'
    RCS.renderer.view.style.left = Math.trunc(this._marginY / 2) + 'px'

    window.addEventListener('resize', () => {
      this.resize()
    })

    document.body.appendChild(RCS.renderer.view)

    this.reset()

    setTimeout(() => {
      this.resize()
    }, 100)

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
    if (this.force_update) {
      this.force_update = false
      if (this.force_flip) {
        this.flip()
      }
      RCS.renderer.render(RCS.stage)
    }
  }

  async boot (cold = true) {
    this.clear()
    if (cold) {
      this.reset()
      this._buffer = RCS.memoryManager.alloc(RCS.i8, this._size)
    }
  }

  reset () {
    this.clear()
  }

  update (flip = true) {
    this.force_update = true
    if (!this.force_flip) {
      this.force_flip = flip
    }
  }

  clear () {
    if (this._buffer) {
      this.array.fill(0)
      this.update()
    }
  }

  shut () {
    if (this._buffer) {
      this._buffer.free()
      this._buffer = undefined
    }
  }

  resize () {
    // let ratio = Math.min(window.innerWidth / this.width, window.innerHeight / this.height)
    // this.RCS.stage.scale.x = this.RCS.stage.scale.y = ratio
    // RCS.renderer.resize(Math.ceil(this.width * ratio), Math.ceil(this.height * ratio))
    RCS.renderer.view.style.left = window.innerWidth * 0.5 - RCS.renderer.width * 0.5 + 'px'
    RCS.renderer.view.style.top = window.innerHeight * 0.5 - RCS.renderer.height * 0.5 + 'px'

    this.update()
  }

  flip () {
    if (this._buffer && RCS.palette.buffer) {
      let screenOverlay = RCS.overlays.screen
      let data = screenOverlay.context.getImageData(0, 0, screenOverlay.width, screenOverlay.height)
      let pixels = new Uint32Array(data.data.buffer)

      let mem = this.array
      for (let i = 0; i < this.size; i++) {
        pixels[i] = RCS.palette.get(mem[i])
      }

      screenOverlay.context.putImageData(data, 0, 0)

      this.force_flip = false
    }
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
    this.update()
  }

}

module.exports = {
  Video,
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  VIDEO_SCALE,
  VIDEO_MARGINX,
  VIDEO_MARGINY,
  VIDEO_OFFSETX,
  VIDEO_OFFSETY,
}
