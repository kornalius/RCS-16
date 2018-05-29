/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')

const CARET_TOP_X = 1
const CARET_TOP_Y = 1

class TTY extends Emitter {

  constructor (options = {}) {
    super()

    options = _.extend({
      font: undefined,
      width: 120,
      height: 80,
      caret: { x: CARET_TOP_X, y: CARET_TOP_Y },
      hasCaret: false,
      caretBlink: 750,
    }, options)

    this._font = options.font
    this._width = options.width
    this._height = options.height
    this._size = this._width * this._height * 3

    this._overlay = new RCS.ContainerOverlay(this._width * this._font.width, this._height * this._font.height)
    RCS.overlays.containers.sprite.addChild(this._overlay.sprite)

    this._hasCaret = options.hasCaret
    this._caretx = options.caret.x
    this._carety = options.caret.y
    this._caretBlink = options.caretBlink
    this._lastBlink = 0

    this._caretSprite = RCS.Sprite.rectSprite(this._font.width, this._font.height, 2)
    this._caretSprite.visible = false
    this._overlay.sprite.addChild(this._caretSprite)

    if (options.hasCaret) {
      this.showCaret()
    }

    this.reset()

    this.updateCaretPosition()

    RCS.main.addTick(this)
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }

  get video_buffer () { return this._video_buffer }
  get video_array () { return this._video_buffer.array }

  get font () { return this._font }
  get width () { return this._width }
  get height () { return this._height }
  get size () { return this._size }
  get overlay () { return this._overlay }

  get hasCaret () { return this._hasCaret }
  get caretBlink () { return this._caretBlink }
  get caretSprite () { return this._caretSprite }
  get caretVisible () { return this._caretSprite.visible }
  set caretVisible (value) {
    if (value !== this._caretSprite.visible) {
      this._caretSprite.visible = value
      RCS.video.force_update = true
    }
  }

  get caret () { return { x: this._caretx, y: this._carety } }
  set caret (value) {
    if (value.x !== this._caretx || value.y !== this._carety) {
      this._caretx = _.clamp(value.x, 1, this._width)
      this._carety = _.clamp(value.y, 1, this._height)
      this.updateCaretPosition()
    }
  }

  get caretx () { return this._caretx }
  set caretx (value) {
    if (value !== this._caretx) {
      this._caretx = _.clamp(value, 1, this._width)
      this.updateCaretPosition()
    }
  }

  get carety () { return this._carety }
  set carety (value) {
    if (value !== this._carety) {
      this._carety = _.clamp(value, 1, this._height)
      this.updateCaretPosition()
    }
  }

  showCaret () {
    this._caretVisible = true
  }

  hideCaret () {
    this._caretVisible = false
  }

  toggleCaret () {
    this.caretVisible = !this.caretVisible
  }

  updateCaretPosition () {
    let x = this._caretx - 1
    let y = this._carety - 1
    this._caretSprite.position = new PIXI.Point(x * this._font.width, y * this._font.height)
    RCS.video.force_update = true
  }

  tick (t) {
    if (this._hasCaret && this._caretBlink > 0 && t - this._lastBlink > this._caretBlink) {
      this._lastBlink = t
      this.toggleCaret()
    }
  }

  reset () {
    this.bos()

    if (this._buffer) {
      this._buffer.free()
      this._buffer = undefined
    }
    this._buffer = RCS.memoryManager.alloc(RCS.i8, this._size)

    if (this._video_buffer) {
      this._video_buffer.free()
      this._video_buffer = undefined
    }
    this._video_buffer = RCS.memoryManager.alloc(RCS.i8, this._width * this._font.width * this._height * this._font.height)

    this.clear()
  }

  clear () {
    if (this._buffer) {
      this.array.fill(0)
    }
    if (this._video_buffer) {
      this.video_array.fill(0)
    }
    this.flip()
  }

  shut () {
    if (this._buffer) {
      this._buffer.free()
      this._buffer = undefined
    }

    if (this._video_buffer) {
      this._video_buffer.free()
      this._video_buffer = undefined
    }

    RCS.overlays.containers.sprite.removeChild(this._overlay.sprite)

    this._overlay.shut()

    RCS.main.removeTick(this)
  }

  draw (screenx = 0, screeny = 0) {
    if (this._buffer && this._font) {
      let cw = this._font.width
      let ch = this._font.height
      let tw = this._width
      let th = this._height
      let w = this._overlay.width
      let fnt_sz = this._font.char_size

      var fnt_mem = this._font.array
      var mem = this.array
      var video_mem = this.video_array

      let idx = 0
      for (let y = 0; y < th; y++) {
        let py = screeny + y * ch
        for (let x = 0; x < tw; x++) {
          let c = mem[idx]
          if (c) {
            let px = screenx + x * cw
            let ptr = c * fnt_sz
            for (let by = 0; by < ch; by++) {
              let pi = (py + by) * w + px
              for (let bx = 0; bx < cw; bx++) {
                video_mem[pi++] = fnt_mem[ptr++] ? mem[idx + 1] : mem[idx + 2]
              }
            }
          }
          idx += 3
        }
      }

      this.flip()
      RCS.video.force_update = true
    }
  }

  flip () {
    this._overlay.flip(this.video_array)
  }

  update () {
    this.draw()
  }

  index (x, y) {
    return ((y - 1) * this._width + (x - 1)) * 3
  }

  line (y) {
    let l = this._width * 3
    return { start: y * l, end: (y + 1) * l - 3, length: l }
  }

  char_at (x, y) {
    let tidx = this.index(x, y)
    let mem = this.array
    return { ch: mem[tidx], fg: mem[tidx + 1], bg: mem[tidx + 2] }
  }

  put_char (ch, fg = 2, bg = 0) {
    switch (ch.charCodeAt(0)) {
      case 13:
      case 10:
        this.cr()
        return
      case 8:
        this.bs()
        return
    }

    let { x, y } = this.caret
    this.array.set([ch.charCodeAt(0), fg, bg], this.index(x, y))

    this.caretx++
    if (this._caretx > this._width) {
      this.cr()
    }
  }

  print (text, fg, bg) {
    for (let c of text) {
      this.put_char(c, fg, bg)
    }
    return this
  }

  println (text, fg, bg) {
    return this.print(text + '\n', fg, bg)
  }

  move_to (x, y) {
    this.caretx = x
    this.carety = y
  }

  move_by (x, y) {
    return this.move_to(this._caretx + x, this._carety + y)
  }

  bol () {
    return this.move_to(CARET_TOP_X, this._carety)
  }

  eol () {
    return this.move_to(this._width, this._carety)
  }

  bos () {
    return this.move_to(CARET_TOP_X, CARET_TOP_Y)
  }

  eos () {
    return this.move_to(this._width, this._height)
  }

  bs () {
    this.left()
    this.put_char(' ')
    return this.left()
  }

  cr () {
    return this.move_to(CARET_TOP_X, this._carety + 1)
  }

  lf () {
    return this.move_to(this._caretx, this._carety + 1)
  }

  up () {
    return this.move_to(this._caretx, this._carety - 1)
  }

  left () {
    return this.move_to(this._caretx - 1, this._carety)
  }

  down () {
    return this.move_to(this._caretx, this._carety + 1)
  }

  right () {
    return this.move_to(this._caretx + 1, this._carety)
  }

  clear_eol () {
    let { x, y } = this.caret
    let s = this.index(x, y)
    this.array.fill(0, s, this.index(this._width, y) - s)
  }

  clear_eos () {
    let { x, y } = this.caret
    let s = this.index(x, y)
    this.array.fill(0, s, this._size - s)
  }

  clear_bol () {
    let { x, y } = this.caret
    let s = this.index(x, y)
    this.array.fill(0, s, this.index(1, y) - s)
  }

  clear_bos () {
    let { x, y } = this.caret
    this.array.fill(0, 0, this.index(x, y) - 1)
  }

  copy_line (sy, ty) {
    let si = this.line(sy)
    this.array.copy(si.start, this.line(ty), si.length)
  }

  copy_col (sx, tx) {
    let mem = this.array
    sx *= 3
    tx *= 3
    for (let y = 0; y < this._height; y++) {
      let i = this.line(y)
      mem.copy(i.start + sx, i.start + tx, 3)
    }
  }

  erase_line (y) {
    let i = this.line(y)
    this.array.fill(0, i.start, i.length)
  }

  erase_col (x) {
    let mem = this.array
    let ls = this.line(0).start + x * 3
    for (let y = 0; y < this._height; y++) {
      mem.fill(0, ls, 3)
      ls += this._width * 3
    }
  }

  scroll (dy) {
    if (dy > 0) {
      let i = this.line(dy + 1)
      this.array.copy(i.start, 0, this._size)
      i = this.line(dy)
      let s = i.start
      this.array.fill(0, s, this._size - s)
    }
    else if (dy < 0) {
      let i = this.line(dy + 1)
      this.array.copy(i.start, 0, this._size)
      i = this.line(dy)
      let s = i.start
      this.array.fill(0, s, this._size - s)
    }
  }

}

module.exports = {
  TTY,
}
