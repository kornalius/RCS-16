/**
 * @module classes
 */

const { Emitter } = require('../../mixins/common/events')

const INACTIVE = 0
const ACTIVE = 1

class Readline extends Emitter {

  constructor (text, options) {
    super()

    this._cursor = 0
    this._status = INACTIVE
    this._options = _.extend({}, {
      tabs: true,
      tabWidth: 2,
    }, options || {})

    this.on('keydown', this.keydown.bind(this))
  }

  get cursor () { return this._cursor }
  get status () { return this._status }
  get options () { return this._options }

  get active () { return this._status === ACTIVE }

  start (text, cursor) {
    this.start_pos = this.vid.txt_pos()
    this.status = ACTIVE
    this.set_text(text || '')
    this.set_cursor(cursor || this.length)
    return this
  }

  end () {
    this.status = INACTIVE
    return this
  }

  keydown (key) {
    switch (key) {

      case 8: // backspace
        this.delete_text(this.cursor - 1, 1)
        this.move_cursor(-1)
        break

      case 46: // del
        this.delete_text(this.cursor, 1)
        break

      case 9: // tab
        if (this.options.accept_tabs) {
          this.insert_text(this.cursor, _.repeat(' ', this.options.tab_width))
          this.move_cursor(this.options.tab_width)
        }
        break

      case 37: // left
        this.move_cursor(-1)
        break

      case 39: // right
        this.move_cursor(1)
        break

      case 36: // home
        this.move_start()
        break

      case 35: // end
        this.move_end()
        break

      case 27: // esc
        this.set_text('')
        break

      case 13: // enter
        this.end()
        break

    }
  }

  get length () { return this.text.length }

  set_cursor (c) {
    this.cursor = Math.max(0, Math.min(this.cursor + c, this.length))
    return this.update_cursor()
  }

  move_start () { return this.set_cursor(0) }

  move_end () { return this.set_cursor(this.length - 1) }

  move_cursor (c = 1) { return this.set_cursor(this.cursor + c) }

  update_cursor () {
    this.vid.txt_move_to(this.start_pos.x + this.cursor, this.start_pos.y)
    return this
  }

  update () {
    this.vid.txt_move_to(this.start_pos.x, this.start_pos.y)
    this.vid.txt_clear_eol()
    this.vid.txt_print(this.text)
    this.vid.txt_refresh()
    return this
  }

  clear_text () { return this.set_text('') }

  set_text (text) {
    if (text !== this.text) {
      this.text = text
      this.update()
      this.set_cursor(this.cursor)
    }
    return this
  }

  insert_text (i, text) {
    let t = this.text
    if (i >= 0 && i < this.length) {
      t = t.substring(0, i - 1) + text + t.substring(i)
    }
    else {
      t += text
    }
    return this.set_text(t)
  }

  delete_text (i, c = 1) {
    let t = this.text
    if (i >= 0 && i < this.length) {
      t = t.splice(i, i + c - 1)
    }
    return this.set_text(t)
  }

}
