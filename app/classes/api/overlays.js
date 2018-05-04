/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')

class Overlay extends Emitter {

  constructor (width, height, offsetX = 0, offsetY = 0) {
    super()

    this._width = width
    this._height = height
    this._offsetX = offsetX
    this._offsetY = offsetY
    this._last = 0
  }

  create () {
    this._canvas = new PIXI.CanvasRenderTarget(this._width, this._height)

    this._tex = PIXI.Texture.fromCanvas(this._canvas.canvas, PIXI.SCALE_MODES.NEAREST)
    this._tex.scaleMode = PIXI.SCALE_MODES.NEAREST

    this._sprite = new PIXI.Sprite(this._tex)

    this._context = this._canvas.canvas.getContext('2d', { alpha: true, antialias: false })
  }

  get width () { return this._width }
  get height () { return this._height }
  get last () { return this._last }

  get canvas () { return this._canvas }
  get tex () { return this._tex }
  get sprite () { return this._sprite }
  get context () { return this._context }

  tick (t) {
  }

  reset () {
    if (this._sprite) {
      this._sprite.x = this._offsetX
      this._sprite.y = this._offsetY
    }
  }

  shut () {
    if (this._canvas) {
      this._canvas.destroy()
      this._canvas = null
    }
  }

  update () {
    RCS.video.force_update = true
  }

}


class ScreenOverlay extends Overlay {

  constructor (width, height, offsetX, offsetY) {
    super(width, height, offsetX, offsetY)

    this.create()
  }

}


class SpriteOverlay extends Overlay {

  constructor (width, height, offsetX, offsetY) {
    super(width, height, offsetX, offsetY)

    this.create()
  }

}


class ScanlinesOverlay extends Overlay {

  constructor (width, height, offsetX, offsetY, gap = 3, alpha = 0.35) {
    super(width, height, offsetX, offsetY)

    this._gap = gap
    this._alpha = alpha

    this.create()
  }

  reset () {
    super.reset()

    let a = this._alpha * 255
    let data = this._context.getImageData(0, 0, this._width, this._height)
    let pixels = data.data
    let sz = this._width * 4
    let idx
    for (let y = 0; y < this._height; y += this._gap) {
      idx = y * sz
      for (let i = idx; i < idx + sz; i += 4) {
        pixels.set([0, 0, 0, a], i)
      }
    }
    this._context.putImageData(data, 0, 0)
  }

}


class ScanlineOverlay extends Overlay {

  constructor (width, height, offsetX, offsetY, refresh = 50, alpha = 0.1, speed = 16) {
    super(width, height, offsetX, offsetY)

    this._refresh = refresh
    this._speed = speed
    this._alpha = alpha

    this.create()
  }

  reset () {
    super.reset()

    let data = this._context.getImageData(0, 0, this._width, this._height)
    let pixels = data.data
    let sz = this._width * 4
    let len = this._height * sz
    let l = 0
    let h = this._height
    let a = this._alpha * 255
    let aa
    for (let y = 0; y < len; y += sz) {
      aa = l / h * a
      for (let x = y; x < y + sz; x += 4) {
        pixels.set([25, 25, 25, aa], x)
      }
      l++
    }
    this._context.putImageData(data, 0, 0)

    this._sprite.y = -this._sprite.height + this._offsetY
  }

  tick (t) {
    if (t - this._last >= this._refresh) {
      this._sprite.y += this._speed
      if (this._sprite.y > this._height) {
        this._sprite.y = -this._sprite.height
      }
      this._last = t

      this.update()
    }
  }

}


class NoisesOverlay extends Overlay {

  constructor (width, height, offsetX, offsetY, refresh = 250, count = 8, rate = 0.85, red = 100, green = 100, blue = 100, alpha = 0.15) {
    super(width, height, offsetX, offsetY)

    this._refresh = refresh
    this._count = count
    this._rate = rate
    this._red = red
    this._green = green
    this._blue = blue
    this._alpha = alpha

    this._noises = {}
    this._noiseKeys = []
  }

  reset () {
    super.reset()

    this._noises = {}

    let a = this._alpha * 255
    for (let c = 0; c < this._count; c++) {
      let noise = new Overlay(this._width, this._height)
      noise.create()
      noise.sprite.visible = c === 0

      let data = noise.context.getImageData(0, 0, this._width, this._height)
      let pixels = data.data
      let len = pixels.length
      let r = this._red
      let g = this._green
      let b = this._blue
      let _rate = this._rate
      for (let i = 0; i < len; i += 4) {
        if (Math.random() >= _rate) {
          pixels.set([Math.trunc(Math.random() * r), Math.trunc(Math.random() * g), Math.trunc(Math.random() * b), a], i)
        }
      }
      noise.context.putImageData(data, 0, 0)
      this._noises[c] = noise
      RCS.stage.addChild(noise.sprite)
    }

    this._noiseKeys = _.keys(this._noises)
  }

  shut () {
    super.shut()
    for (let k in this._noises) {
      let noise = this._noises[k]
      noise.shut()
    }
    this._noises = {}
    this._noiseKeys = []
  }

  tick (t) {
    if (t - this._last >= this._refresh) {
      const keys = this._noiseKeys
      const noises = this._noises
      for (let k of keys) {
        noises[k].sprite.visible = false
      }
      let noise = keys[Math.trunc(Math.random() * keys.length)]
      _.set(noises, [noise, 'sprite.visible'], true)
      this._last = t

      this.update()
    }
  }

}


class RgbOverlay extends Overlay {

  constructor (width, height, offsetX, offsetY, alpha = 0.075) {
    super(width, height, offsetX, offsetY)

    this._alpha = alpha

    this.create()
  }

  reset () {
    super.reset()

    let data = this._context.getImageData(0, 0, this._width, this._height)
    let pixels = data.data
    let len = pixels.length
    let a = this._alpha * 255
    for (let i = 0; i < len; i += 12) {
      pixels.set([100, 100, 100, a], i)
    }
    this._context.putImageData(data, 0, 0)
  }
}


class CrtOverlay extends Overlay {

  constructor (width, height, offsetX, offsetY, radius = 0.25, inside_alpha = 0.2, outside_alpha = 0.15) {
    super(width, height, offsetX, offsetY)

    this._radius = radius
    this._inside_alpha = inside_alpha
    this._outside_alpha = outside_alpha

    this.create()
  }

  reset () {
    super.reset()

    this._context.globalCompositeOperation = 'darker'
    let gradient = this._context.createRadialGradient(this._width / 2, this._height / 2, this._height / 2, this._width / 2, this._height / 2, this._height / this._radius)
    gradient.addColorStop(0, 'rgba(255, 255, 255, ' + this._inside_alpha + ')')
    gradient.addColorStop(1, 'rgba(0, 0, 0, ' + this._outside_alpha + ')')
    this._context.fillStyle = gradient
    this._context.fillRect(0, 0, this._width, this._height)
    this._context.globalCompositeOperation = 'source-over'
  }

}


class TextCursorOverlay extends Overlay {

  constructor (width, height, offsetX, offsetY, refresh = 500) {
    super(width, height, offsetX, offsetY)

    this._refresh = refresh
    this._x = 1
    this._y = 1

    this.create()
  }

  tick (t) {
    if (t - this._last >= this._refresh) {
      this._sprite.visible = !this._sprite.visible
      this._last = t

      this.update()
    }
  }

  reset () {
    super.reset()

    let data = this._context.getImageData(0, 0, this._width, this._height)
    let pixels = new Uint32Array(data.data.buffer)
    let c = RCS.palette.get(9)
    for (let i = 0; i < this._width * this._height; i++) {
      pixels[i] = c
    }
    this._context.putImageData(data, 0, 0)
  }

  get x () { return this._x }
  set x (value) {
    if (value !== this._x) {
      this._x = value
      this.update()
    }
  }

  get y () { return this._y }
  set y (value) {
    if (value !== this._y) {
      this._y = value
      this.update()
    }
  }

  update () {
    this._sprite.x = (this._x - 1) * this._sprite.width + RCS.text.offsetX + this._offsetX
    this._sprite.y = (this._y - 1) * this._sprite.height + RCS.text.offsetY + this._offsetY
    super.update()
  }

}


class MouseCursorOverlay extends Overlay {

  constructor (width, height, offsetX, offsetY, refresh = 5) {
    super(width, height, offsetX, offsetY)

    this._refresh = refresh
    this._x = 0
    this._y = 0

    this.create()
  }

  reset () {
    super.reset()

    let buf = RCS.strings_to_buffer([
      'X',
      'XX',
      'X@X',
      'X@@X',
      'X@@@X',
      'X@@@@X',
      'X@@@@@X',
      'X@@XXXX',
      'X@X',
      'XX',
    ], { X: 1, '@': 2 }, this._width, this._height)

    let data = this._context.getImageData(0, 0, this._width, this._height)
    let pixels = new Uint32Array(data.data.buffer)
    for (let i = 0; i < this._width * this._height; i++) {
      pixels[i] = RCS.palette.get(buf[i])
    }
    this._context.putImageData(data, 0, 0)
  }

  tick (t) {
    if (t - this._last >= this._refresh) {
      this._last = t

      this.update()
    }
  }

  get x () { return this._x }
  set x (value) {
    if (value !== this._x) {
      this._x = value
      this.update()
    }
  }

  get y () { return this._y }
  set y (value) {
    if (value !== this._y) {
      this._y = value
      this.update()
    }
  }

  update () {
    this._sprite.x = this._x * this._sprite.scale.x + this._offsetX
    this._sprite.y = this._y * this._sprite.scale.y + this._offsetY
    super.update()
  }

}


class Overlays extends Emitter {

  constructor () {
    super()

    let width = RCS.renderer.width
    let height = RCS.renderer.height
    let scale = RCS.video.scale
    let marginX = RCS.video.marginX
    let marginY = RCS.video.marginY

    this._overlays = ['screen', 'sprite', 'textCursor', 'mouseCursor', 'scanlines', 'scanline', 'rgb', 'noises', 'crt', 'monitor']

    this.textCursor = new TextCursorOverlay(RCS.text.chr_width, RCS.text.chr_height)
    this.textCursor.sprite.scale = new PIXI.Point(scale, scale)
    RCS.stage.addChild(this.textCursor.sprite)

    this.sprite = new SpriteOverlay(RCS.video.width, RCS.video.height)
    this.sprite.sprite.scale = new PIXI.Point(scale, scale)
    RCS.stage.addChild(this.sprite.sprite)

    this.screen = new ScreenOverlay(RCS.video.width, RCS.video.height)
    this.screen.sprite.scale = new PIXI.Point(scale, scale)
    RCS.stage.addChild(this.screen.sprite)

    this.mouseCursor = new MouseCursorOverlay(RCS.sprite.width, RCS.sprite.height)
    this.mouseCursor.sprite.scale = new PIXI.Point(scale, scale)
    RCS.stage.addChild(this.mouseCursor.sprite)

    this.scanlines = new ScanlinesOverlay(width, height)
    RCS.stage.addChild(this.scanlines.sprite)

    this.scanline = new ScanlineOverlay(width, height)
    RCS.stage.addChild(this.scanline.sprite)

    this.rgb = new RgbOverlay(width, height)
    RCS.stage.addChild(this.rgb.sprite)

    this.noises = new NoisesOverlay(width, height)

    this.crt = new CrtOverlay(width, height)
    RCS.stage.addChild(this.crt.sprite)

    let tex = PIXI.Texture.fromImage(RCS.DIRS.cwd + '/imgs/crt.png')
    this.monitor = new PIXI.Sprite(tex)
    this.monitor.width = width
    this.monitor.height = height
    RCS.stage.addChild(this.monitor)
  }

  tick (t) {
    this.screen.tick(t)
    this.sprite.tick(t)
    this.scanlines.tick(t)
    this.scanline.tick(t)
    this.rgb.tick(t)
    this.noises.tick(t)
    this.crt.tick(t)
    this.textCursor.tick(t)
    this.mouseCursor.tick(t)
  }

  async boot (cold = true) {
    if (cold) {
      this.reset()
    }
  }

  reset () {
    this.screen.reset()
    this.sprite.reset()
    this.scanlines.reset()
    this.scanline.reset()
    this.rgb.reset()
    this.noises.reset()
    this.crt.reset()
    this.textCursor.reset()
    this.mouseCursor.reset()
  }

  shut () {
    for (let k in this._overlays) {
      if (this[k]) {
        let o = this[k].canvas
        o.shut()
      }
    }
  }

}

module.exports = {
  ScreenOverlay,
  SpriteOverlay,
  ScanlinesOverlay,
  ScanlineOverlay,
  NoisesOverlay,
  RgbOverlay,
  CrtOverlay,
  TextCursorOverlay,
  MouseCursorOverlay,
  Overlays,
}
