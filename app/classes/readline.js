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
        else if (e.ctrlKey) {
          this.moveByWord(-1)
        }
        else {
          this.moveBy(-1)
        }
        break

      case 'ArrowRight':
        if (e.metaKey) {
          this.moveToEnd()
        }
        else if (e.ctrlKey) {
          this.moveByWord(1)
        }
        else {
          this.moveBy(1)
        }
        break

      case 'Home':
        this.moveToStart()
        break

      case 'End':
        this.moveToEnd()
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
          this.moveBy(1)
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

  get words () {
    const alphanum = _.map('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', s => s.charCodeAt(0))
    let words = []
    let s = 0
    let w
    let t = this.text
    for (let i = 0; i < t.length; i++) {
      if (_.includes(alphanum, t.charCodeAt(i))) {
        if (!w) {
          w = ''
          s = i
        }
        w += t.charAt(i)
      }
      else if (w) {
        words.push({ text: w, start: s, end: s + w.length, length: w.length })
        w = undefined
        s = 0
      }
    }

    if (w) {
      words.push({ text: w, start: s, end: s + w.length, length: w.length })
    }

    return words
  }

  getWordAt (x) {
    let i = 0
    for (let w of this.words) {
      if (x >= w.start && x <= w.end) {
        return i
      }
      i++
    }
    return -1
  }

  moveByWord (c = 1) {
    let i = this.getWordAt(this._cursor)
    let w = _.get(this.words, i)
    if (w) {
      if (c < 0 && this._cursor > w.start) {
        this.cursor = w.start
      }
      else if (c > 0 && this._cursor < w.end) {
        this.cursor = w.end
      }
      else {
        w = _.get(this.words, i + c)
        if (w) {
          this.cursor = c < 0 ? w.start : w.end
        }
      }
    }
  }

  updateCursor () {
    this.tty.moveTo(this._startPos.x + this._cursor, this._startPos.y)
    return this
  }

  update () {
    this.tty.moveTo(this._startPos.x, this._startPos.y)
    this.tty.clearEol()
    this.tty.print(this._text)
    this.updateCursor()
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
      t = t.substring(0, i) + text + t.substring(i)
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
      t = t.substring(0, i) + t.substring(i + c)
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
