/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')

class Mouse extends Emitter {

  constructor () {
    super()

    this._x = 0
    this._y = 0
    this._btns = 0

    let stage = RCS.stage
    if (stage) {
      stage.interactive = true

      stage.on('mousedown', this.onMouseDown.bind(this))
      stage.on('rightdown', this.onMouseDown.bind(this))
      stage.on('touchstart', this.onMouseDown.bind(this))

      stage.on('mousemove', this.onMouseMove.bind(this))

      stage.on('mouseup', this.onMouseUp.bind(this))
      stage.on('touchend', this.onMouseUp.bind(this))
      stage.on('mouseupoutside', this.onMouseUp.bind(this))
      stage.on('touchendoutside', this.onMouseUp.bind(this))
    }
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }
  get size () { return this._size }

  get x () { return this._x }
  get y () { return this._y }
  get btns () { return this._btns }
  get left () { return this._btns & 0x01 }
  get middle () { return this._btns & 0x02 }
  get right () { return this._btns & 0x04 }

  async boot (cold = true) {
    this.clear()
    if (cold) {
      this.reset()
      this._buffer = RCS.memoryManager.alloc(RCS.i32, 3)
    }
  }

  reset () {
    this.clear()

    let renderer = RCS.renderer
    this._size = new PIXI.Point(renderer.width - RCS.video.marginX / 2, renderer.height - RCS.video.marginY / 2)
  }

  tick (t) {
  }

  clear () {
    this._x = 0
    this._y = 0
    this._btns = 0
    if (this._buffer) {
      this.array.fill(0)
      RCS.video.refresh()
    }
  }

  shut () {
    this._buffer.free()
    this._buffer = undefined
  }

  onMouseDown (e) {
    switch (e.data.originalEvent.button) {
      case 0: // left
        this._btns |= 0x01
        break

      case 1: // middle
        this._btns |= 0x02
        break

      case 2: // right
        this._btns |= 0x04
        break
    }
  }

  onMouseUp (e) {
    switch (e.data.originalEvent.button) {
      case 0: // left
        this._btns &= ~0x01
        break

      case 1: // middle
        this._btns &= ~0x02
        break

      case 2: // right
        this._btns &= ~0x04
        break
    }
  }

  onMouseMove (e) {
    if (this._size) {
      let size = this._size
      let marginX = RCS.video.marginX * 0.25
      let marginY = RCS.video.marginY * 0.25
      let cursor = RCS.overlays.mouseCursor

      let x = Math.trunc(Math.min(size.x + marginX, Math.max(marginX, e.data.global.x)) / cursor.sprite.scale.x)
      let y = Math.trunc(Math.min(size.y + marginY, Math.max(marginY, e.data.global.y)) / cursor.sprite.scale.y)

      this._x = x
      this._y = y

      cursor.x = x
      cursor.y = y

      this._updateBuffer()

      RCS.video.refresh(false)
    }
  }

  _updateBuffer () {
    this.array.set([this._x, this._y, this._btns], 0)
  }

}

module.exports = {
  Mouse,
}
