/**
 * @module classes
 */

const { Emitter } = require('../mixins/common/events')

const INACTIVE = 0
const ACTIVE = 1

class Readline extends Emitter {

  constructor (tty, options) {
    super()

    this._tty = tty
    this._status = INACTIVE
    this._cursor = 0
    this._options = _.extend({}, {
      tabs: true,
      tabWidth: 2,
    }, options || {})

    this._onKeydown = this.onKeydown.bind(this)
  }

  get tty () { return this._tty }
  get status () { return this._status }
  get options () { return this._options }
  get active () { return this._status === ACTIVE }

  get startPos () { return this._startPos }

  get cursor () { return this._cursor }
  set cursor (value) {
    if (value !== this._cursor) {
      this._cursor = Math.max(0, Math.min(value, this.length))
      this.updateCursor()
    }
  }

  get text () { return this._text }
  set text (value) {
    if (value !== this._text) {
      this._text = value
      this.update()
    }
  }
  get length () { return this._text.length }

  start (text = '') {
    this._startPos = this.tty.caret
    this._status = ACTIVE
    this.text = text
    window.addEventListener('keydown', this._onKeydown)
    this.tty.hasCaret = true
    this.emit('start', text)
    return this
  }

  end () {
    this._status = INACTIVE
    window.removeEventListener('keydown', this._onKeydown)
    this.tty.hasCaret = false
    this.emit('end', this._text)
    return this
  }

  onKeydown (e) {
    switch (e.key) {

      case 'Backspace':
        this.delete(this._cursor - 1, 1)
        this.moveBy(-1)
        break

      case 'Delete':
        this.delete(this._cursor, 1)
        break

      case 'Tab':
        if (this._options.accept_tabs) {
          this.insert(this._cursor, _.repeat(' ', this._options.tab_width))
          this.moveBy(this._options.tab_width)
        }
        break

      case 'ArrowLeft':
        if (e.metaKey) {
          this.moveToStart()
        }
        else {
          this.moveBy(-1)
        }
        break

      case 'ArrowRight':
        if (e.metaKey) {
          this.moveToEnd()
        }
        else {
          this.moveBy(1)
        }
        break

      case 'Escape':
        this.text = ''
        break

      case 'Enter':
        this.end()
        break

      default:
        if (e.key.length === 1) {
          this.insert(this._cursor, e.key)
        }
        break

    }
  }

  moveToStart () {
    this.cursor = 0
    return this
  }

  moveToEnd () {
    this.cursor = this.length
    return this
  }

  moveBy (c = 1) {
    this.cursor = this._cursor + c
    return this
  }

  updateCursor () {
    this.tty.moveTo(this._startPos.x + this._cursor, this._startPos.y)
    return this
  }

  update () {
    this.tty.moveTo(this._startPos.x, this._startPos.y)
    this.tty.clearEol()
    this.tty.print(this._text)
    this.tty.update()
    return this
  }

  clear () {
    this.text = ''
    return this
  }

  insert (i, text) {
    let t = this._text
    if (i >= 0 && i < this.length) {
      t = t.substring(0, i - 1) + text + t.substring(i)
    }
    else {
      t += text
    }
    this.text = t
    return this
  }

  delete (i, c = 1) {
    let t = this._text
    if (i >= 0 && i < this.length) {
      t = t.splice(i, i + c - 1)
    }
    this.text = t
    return this
  }

}

module.exports = {
  Readline,
  INACTIVE,
  ACTIVE,
}
