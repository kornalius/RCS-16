/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')
const { fs, path } = require('../../utils')

class BDF {

  constructor () {
    this.meta = undefined
    this.glyphs = undefined
  }

  load (data) {
    this.meta = {}
    this.glyphs = {}

    let fontLines = data.split('\n')
    let declarationStack = []
    let currentChar

    for (let i = 0; i < fontLines.length; i++) {
      let line = fontLines[i]
      let line_data = line.split(/\s+/)
      let declaration = line_data[0]

      switch (declaration) {
        case 'STARTFONT':
          declarationStack.push(declaration)
          this.meta.version = Math.abs(line_data[1])
          break
        case 'FONT':
          this.meta.name = Math.abs(line_data[1])
          break
        case 'SIZE':
          this.meta.size = {
            points: Math.abs(line_data[1]),
            resolutionX: Math.abs(line_data[2]),
            resolutionY: Math.abs(line_data[3]),
          }
          break
        case 'FONTBOUNDINGBOX':
          this.meta.boundingBox = {
            width: Math.abs(line_data[1]),
            height: Math.abs(line_data[2]),
            x: Math.abs(line_data[3]),
            y: Math.abs(line_data[4]),
          }
          break
        case 'STARTPROPERTIES':
          declarationStack.push(declaration)
          this.meta.properties = {}
          break
        case 'FONT_DESCENT':
          this.meta.properties.fontDescent = Math.abs(line_data[1])
          break
        case 'FONT_ASCENT':
          this.meta.properties.fontAscent = Math.abs(line_data[1])
          break
        case 'DEFAULT_CHAR':
          this.meta.properties.defaultChar = Math.abs(line_data[1])
          break
        case 'ENDPROPERTIES':
          declarationStack.pop()
          break
        case 'CHARS':
          this.meta.totalChars = Math.abs(line_data[1])
          break
        case 'STARTCHAR':
          declarationStack.push(declaration)
          currentChar = {
            name: Math.abs(line_data[1]),
            bytes: [],
            bitmap: [],
          }
          break
        case 'ENCODING':
          currentChar.code = Math.abs(line_data[1])
          currentChar.char = String.fromCharCode(Math.abs(line_data[1]))
          break
        case 'SWIDTH':
          currentChar.scalableWidthX = Math.abs(line_data[1])
          currentChar.scalableWidthY = Math.abs(line_data[2])
          break
        case 'DWIDTH':
          currentChar.deviceWidthX = Math.abs(line_data[1])
          currentChar.deviceWidthY = Math.abs(line_data[2])
          break
        case 'BBX':
          currentChar.boundingBox = {
            x: Math.abs(line_data[3]),
            y: Math.abs(line_data[4]),
            width: Math.abs(line_data[1]),
            height: Math.abs(line_data[2]),
          }
          break
        case 'BITMAP':
          for (let row = 0; row < currentChar.boundingBox.height; row++, i++) {
            let byte = parseInt(fontLines[i + 1], 16)
            currentChar.bytes.push(byte)
            currentChar.bitmap[row] = []
            for (let bit = 7; bit >= 0; bit--) {
              currentChar.bitmap[row][7 - bit] = byte & 1 << bit ? 1 : 0
            }
          }
          break
        case 'ENDCHAR':
          declarationStack.pop()
          this.glyphs[currentChar.code] = currentChar
          currentChar = undefined
          break
        case 'ENDFONT':
          declarationStack.pop()
          break
      }
    }

    if (declarationStack.length) {
      throw "Couldn't correctly parse font"
    }
  }
}

class Text extends Emitter {

  constructor (char_count = 256, char_width = 6, char_height = 10, char_offsetX = 0, char_offsetY = 4) {
    super()

    this._chr_count = char_count
    this._chr_width = char_width
    this._chr_height = char_height
    this._chr_offset_x = char_offsetX
    this._chr_offset_y = char_offsetY
    this._chr_size = this._chr_width * this._chr_height

    this._width = Math.round(RCS.video.width / this._chr_width)
    this._height = Math.round(RCS.video.height / this._chr_height)
    this._size = this._width * this._height * 3

    this._fnt_size = this._chr_count * this._chr_size
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }

  get fnt_buffer () { return this._fnt_buffer }
  get fnt_array () { return this._fnt_buffer.array }
  get fnt_size () { return this._fnt_size }

  get chr_count () { return this._chr_count }
  get chr_width () { return this._chr_width }
  get chr_height () { return this._chr_height }
  get chr_offset_x () { return this._chr_offset_x }
  get chr_offset_y () { return this._chr_offset_y }
  get chr_size () { return this._chr_size }

  get width () { return this._width }
  get height () { return this._height }
  get size () { return this._size }

  tick (t) {
    if (RCS.video.force_update) {
      this.draw()
      RCS.video.force_update = false
    }
  }

  async boot (cold = true) {
    this.clear()
    if (cold) {
      this._fnt_buffer = RCS.memoryManager.alloc(RCS.i8, this._fnt_size)
      this._buffer = RCS.memoryManager.alloc(RCS.i8, this._size)
      await this.reset()
    }
  }

  async reset () {
    RCS.video.force_update = false
    this.clear()
    return this.load_fnt()
  }

  clear () {
    if (this._buffer) {
      this.array.fill(0)
      this.refresh()
    }
  }

  shut () {
    this._fnt_buffer.free()
    this._fnt_buffer = undefined

    this._buffer.free()
    this._buffer = undefined
  }

  async load_fnt () {
    let b = new BDF()
    let ff = await fs.readFile('../fonts/ctrld-fixed-10r.bdf', 'utf-8')
    b.load(ff)

    // let points = b.meta.size.points
    let fontAscent = b.meta.properties.fontAscent
    // let fontDescent = b.meta.properties.fontDescent
    let baseline = fontAscent + this._chr_offset_y

    let cw = this._chr_width
    let fnt_sz = this._chr_size
    let osx = this._chr_offset_x

    var mem = this.fnt_array

    for (let k in b.glyphs) {
      let g = b.glyphs[k]
      let bb = g.boundingBox
      let dsc = baseline - bb.height - bb.y
      let ptr = g.code * fnt_sz

      for (let y = 0; y < bb.height; y++) {
        let p = ptr + (y + dsc) * cw
        for (let x = 0; x < bb.width; x++) {
          mem[p + x + bb.x + osx] |= g.bitmap[y][x]
        }
      }
    }

    return b
  }

  draw () {
    let cw = this._chr_width
    let ch = this._chr_height
    let tw = this._width
    let th = this._height
    let w = RCS.video.width
    let fnt_sz = this._chr_size

    var fnt_mem = this.fnt_array
    var mem = this.array

    let idx = 0
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        let c = mem[idx]
        if (c) {
          let fg = mem[idx + 1] ? 2 : 0
          let bg = mem[idx + 2] ? 2 : 0

          let px = x * cw
          let py = y * ch

          let ptr = c * fnt_sz
          for (let by = 0; by < ch; by++) {
            let pi = (py + by) * w + px
            for (let bx = 0; bx < cw; bx++) {
              RCS.video.pixel(pi++, fnt_mem[ptr++] ? fg : bg)
            }
          }
        }
        idx += 3
      }
    }
  }

  refresh (flip = true) {
    RCS.video.refresh(flip)
    RCS.video.force_update = true
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

  put_char (ch, fg = 1, bg = 0) {
    switch (ch.charCodeAt(0)) {
      case 13:
      case 10:
        this.cr()
        return
      case 8:
        this.bs()
        return
    }

    let { x, y } = this.pos()
    this.array.set([ch.charCodeAt(0), fg, bg], this.index(x, y))

    RCS.overlays.textCursor.x++
    if (RCS.overlays.textCursor.x > this._width) {
      this.cr()
    }

    this.refresh()
  }

  print (text, fg, bg) {
    for (let c of text) {
      this.put_char(c, fg, bg)
    }
    return this
  }

  pos () { return { x: RCS.overlays.textCursor.x, y: RCS.overlays.textCursor.y } }

  move_to (x, y) {
    if (x > this._width) {
      x = this._width
    }
    else if (x < 1) {
      x = 1
    }
    if (y > this._height) {
      y = this._height
    }
    else if (y < 1) {
      y = 1
    }

    RCS.overlays.textCursor.x = x
    RCS.overlays.textCursor.y = y

    this.refresh(false)
  }

  move_by (x, y) { return this.move_to(RCS.overlays.textCursor.x + x, RCS.overlays.textCursor.y + y) }

  bol () { return this.move_to(1, RCS.overlays.textCursor.y) }

  eol () { return this.move_to(this._width, RCS.overlays.textCursor.y) }

  bos () { return this.move_to(1, 1) }

  eos () { return this.move_to(this._width, this._height) }

  bs () { this.left(); this.put_char(' '); return this.left() }

  cr () { return this.move_to(1, RCS.overlays.textCursor.y + 1) }

  lf () { return this.move_to(RCS.overlays.textCursor.x, RCS.overlays.textCursor.y + 1) }

  up () { return this.move_to(RCS.overlays.textCursor.x, RCS.overlays.textCursor.y - 1) }

  left () { return this.move_to(RCS.overlays.textCursor.x - 1, RCS.overlays.textCursor.y) }

  down () { return this.move_to(RCS.overlays.textCursor.x, RCS.overlays.textCursor.y + 1) }

  right () { return this.move_to(RCS.overlays.textCursor.x + 1, RCS.overlays.textCursor.y) }

  clear_eol () {
    let { x, y } = this.pos()
    let s = this.index(x, y)
    this.array.fill(0, s, this.index(this._width, y) - s)
    this.refresh()
  }

  clear_eos () {
    let { x, y } = this.pos()
    let s = this.index(x, y)
    this.array.fill(0, s, this._size - s)
    this.refresh()
  }

  clear_bol () {
    let { x, y } = this.pos()
    let s = this.index(x, y)
    this.array.fill(0, s, this.index(1, y) - s)
    this.refresh()
  }

  clear_bos () {
    let { x, y } = this.pos()
    this.array.fill(0, 0, this.index(x, y) - 1)
    this.refresh()
  }

  copy_lin (sy, ty) {
    let si = this.line(sy)
    this.array.copy(si.start, this.line(ty), si.length)
    this.refresh()
  }

  copy_col (sx, tx) {
    let mem = this.array
    sx *= 3
    tx *= 3
    for (let y = 0; y < this._height; y++) {
      let i = this.line(y)
      mem.copy(i.start + sx, i.start + tx, 3)
    }
    this.refresh()
  }

  erase_lin (y) {
    let i = this.line(y)
    this.array.fill(0, i.start, i.length)
    this.refresh()
  }

  erase_col (x) {
    let mem = this.array
    let ls = this.line(0).start + x * 3
    for (let y = 0; y < this._height; y++) {
      mem.fill(0, ls, 3)
      ls += this._width * 3
    }
    this.refresh()
  }

  scroll (dy) {
    if (dy > 0) {
      let i = this.line(dy + 1)
      this.array.copy(i.start, 0, this._size)
      i = this.line(dy)
      let s = i.start
      this.array.fill(0, s, this._size - s)
      this.refresh()
    }
    else if (dy < 0) {
      let i = this.line(dy + 1)
      this.array.copy(i.start, 0, this._size)
      i = this.line(dy)
      let s = i.start
      this.array.fill(0, s, this._size - s)
      this.refresh()
    }
  }

}

module.exports = {
  BDF,
  Text,
}
