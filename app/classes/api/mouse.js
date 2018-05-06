/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')

class Mouse extends Emitter {

  constructor (spriteIndex = -1, originX = 0, originY = 0, spriteWidth = RCS.sprite.width, spriteHeight = RCS.sprite.height) {
    super()

    this._x = 0
    this._y = 0
    this._btns = 0

    this._originX = originX
    this._originY = originY
    this._spriteWidth = spriteWidth
    this._spriteHeight = spriteHeight
    this.spriteIndex = spriteIndex

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

  get x () { return this._x }
  get y () { return this._y }
  get btns () { return this._btns }
  get left () { return this._btns & 0x01 }
  get middle () { return this._btns & 0x02 }
  get right () { return this._btns & 0x04 }

  get originX () { return this._originX }
  set originX (value) {
    if (value !== this._originX) {
      this._originX = value
    }
  }

  get originY () { return this._originY }
  set originY (value) {
    if (value !== this._originY) {
      this._originY = value
    }
  }

  get spriteWidth () { return this._spriteWidth }
  set spriteWidth (value) {
    if (value !== this._spriteWidth) {
      this._spriteWidth = value
    }
  }

  get spriteHeight () { return this._spriteHeight }
  set spriteHeight (value) {
    if (value !== this._spriteHeight) {
      this._spriteHeight = value
    }
  }

  get spriteIndex () { return this._spriteIndex }
  set spriteIndex (value) {
    if (value !== this._spriteIndex) {
      if (_.isBuffer(value)) {
        this.setSprite(value)
        this._spriteIndex = -1
      }
      else if (_.isNumber(value)) {
        this._spriteIndex = value
        this.setSprite(value !== -1 ? RCS.sprite.get(value) : undefined)
      }
    }
  }

  setSprite (buf, originX = this._originX, originY = this._originY, spriteWidth = this._spriteWidth, spriteHeight = this._spriteHeight) {
    this._originX = originX
    this._originY = originY
    this._spriteWidth = spriteWidth
    this._spriteHeight = spriteHeight

    buf = buf || RCS.strings_to_buffer([
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
    ], { X: 1, '@': 2 }, spriteWidth, spriteHeight)

    setTimeout(() => {
      RCS.overlays.mouseCursor.updateBuffer(buf, spriteWidth, spriteHeight)
    }, 250)
  }

  async boot (cold = true) {
    this.clear()
    if (cold) {
      this.reset()
      this._buffer = RCS.memoryManager.alloc(RCS.i32, 3)
    }
  }

  reset () {
    this.clear()
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
    if (this._buffer) {
      let cursor = RCS.overlays.mouseCursor

      let x = Math.trunc(Math.min(RCS.renderer.width - this._originX, Math.max(this._originX + 1, e.data.global.x)) / cursor.sprite.scale.x)
      let y = Math.trunc(Math.min(RCS.renderer.height - this._originY, Math.max(this._originY + 1, e.data.global.y)) / cursor.sprite.scale.y)

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
