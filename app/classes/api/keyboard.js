/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')

const _KEYDOWN = 1
const _KEYUP = 0

class Keyboard extends Emitter {

  constructor (count = 255) {
    super()

    this._count = count
    this._keys = {}
    this._joystick = 0
    this._mods = 0

    window.addEventListener('keydown', this.onKeydown.bind(this))
    window.addEventListener('keyup', this.onKeyup.bind(this))
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }
  get stack () { return this._stack }
  get count () { return this._count }

  get keys () { return this._keys }
  get mods () { return this._mods }
  get joystick () { return this._joystick }

  async boot (cold = true) {
    this.clear()
    if (cold) {
      this.reset()
      this._buffer = RCS.memoryManager.alloc(RCS.i8, 4 * this._count)
      this._stack = new RCS.Stack(this._buffer, true)
    }
  }

  reset () {
    this.clear()
  }

  tick (t) {
  }

  clear () {
    this._keys = {}
    this._joystick = 0
    this._mods = 0

    if (this._buffer) {
      this._stack.reset()
    }
  }

  shut () {
    this._buffer.free()
    this._buffer = undefined
  }

  onKeydown (e) {
    let code = e.keyCode
    let numpad = e.location === 3
    this._keys[code] = _KEYDOWN

    switch (code) {
      case 16: // Shift
        this._mods |= 0x01
        break

      case 17: // Ctrl
        this._mods |= 0x02
        break

      case 18: // Alt
        this._mods |= 0x04
        break

      case 38: // up
        this._joystick |= 0x01
        break

      case 56: // numpad 8
        if (numpad) {
          this._joystick |= 0x01
        }
        break

      case 40: // down
        this._joystick |= 0x02
        break

      case 50: // numpad 2
        if (numpad) {
          this._joystick |= 0x02
        }
        break

      case 37: // left
        this._joystick |= 0x04
        break

      case 52: // numpad 4
        if (numpad) {
          this._joystick |= 0x04
        }
        break

      case 39: // right
        this._joystick |= 0x08
        break

      case 54: // numpad 6
        if (numpad) {
          this._joystick |= 0x08
        }
        break

      case 32: // button 1
        this._joystick |= 0x10
        break
    }

    this._stack.push(_KEYDOWN, code, this._mods, this._joystick)

    // e.preventDefault()
    e.stopPropagation()
  }

  onKeyup (e) {
    let code = e.keyCode
    let numpad = e.location === 3
    this._keys[code] = _KEYUP

    switch (e.keyCode) {
      case 16: // Shift
        this._mods &= ~0x01
        break

      case 17: // Ctrl
        this._mods &= ~0x02
        break

      case 18: // Alt
        this._mods &= ~0x04
        break

      case 38: // up
        this._joystick &= ~0x01
        break

      case 56: // numpad 8
        if (numpad) {
          this._joystick &= ~0x01
        }
        break

      case 40: // down
        this._joystick &= ~0x02
        break

      case 50: // numpad 2
        if (numpad) {
          this._joystick &= ~0x02
        }
        break

      case 37: // left
        this._joystick &= ~0x04
        break

      case 52: // numpad 4
        if (numpad) {
          this._joystick &= ~0x04
        }
        break

      case 39: // right
        this._joystick &= ~0x08
        break

      case 54: // numpad 6
        if (numpad) {
          this._joystick &= ~0x08
        }
        break

      case 32: // button 1
        this._joystick &= ~0x10
        break
    }

    this._stack.push(_KEYUP, code, this._mods, this._joystick)

    // e.preventDefault()
    e.stopPropagation()
  }

  shift () { return this._mods & 0x01 }

  ctrl () { return this._mods & 0x02 }

  alt () { return this._mods & 0x04 }

  key (which) { return this._keys[which] }

  pop () {
    let joystick = this._stack.pop()
    let mods = this._stack.pop()
    let code = this._stack.pop()
    let type = this._stack.pop()

    return {
      type,
      code,
      mods,
      joystick,
    }
  }

}

module.exports = {
  Keyboard,
}
