/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')
const { fs } = require('../../utils')

const FONTBANK = {
  tiny: { path: '4x6' },
  normal: { path: '6x10' },
  normal_bold: { path: '6x10b' },
  normal_italic: { path: '6x10O' },
  normal_bold_italic: { path: '6x10BO' },
  large: { path: '8x13' },
  large_bold: { path: '8x13b' },
  extra_large: { path: '14x14' },
  extra_large_bold: { path: '14x14b' },
  extra_large_italic: { path: '14x14O' },
  extra_large_bold_italic: { path: '14x14BO' },
}

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
          this.meta.version = line_data[1]
          break
        case 'FONT':
          this.meta.name = line_data[1]
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
            width: Math.abs(line_data[1]),
            height: Math.abs(line_data[2]),
            x: Math.abs(line_data[3]),
            y: Math.abs(line_data[4]),
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

let fontCache = {}
let fontCacheIndex = 0

class Font extends Emitter {

  constructor (path, width = 0, height = 0, offsetx = 0, offsety = 0, count = 256) {
    super()

    let f = FONTBANK[path]
    if (f) {
      path = f.path
      width = f.width || width
      height = f.height || height
      offsetx = f.offsetx || offsetx
      offsety = f.offsety || offsety
      count = f.count || count
    }

    this._path = path
    this._width = width
    this._height = height
    this._offsetX = offsetx
    this._offsetY = offsety
    this._count = count

    this._load_fnt(this._path, this._width, this._height, this._offsetx, this._offsety, this._count)
  }

  get buffer () { return this._buffer }
  get array () { return this._buffer.array }
  get size () { return this._size }

  get bdf () { return this._bdf }
  get path () { return this._path }
  get count () { return this._count || this._bdf.meta.totalChars }
  get width () { return this._width || this._bdf.meta.boundingBox.width }
  get height () { return this._height || this._bdf.meta.boundingBox.height }
  get offsetx () { return this._offsetX || this._bdf.meta.boundingBox.x }
  get offsety () { return this._offsetY || this._bdf.meta.boundingBox.y }

  get name () { return this._bdf.meta.name }
  get boundingbox () { return this._bdf.meta.boundingBox }
  get descent () { return this._bdf.meta.properties.fontDescent }
  get ascent () { return this._bdf.meta.properties.fontAscent }

  get char_size () { return this._char_size }

  shut () {
    this._buffer.free()
    this._buffer = undefined
  }

  async _load_fnt () {
    if (!fontCache[this._path]) {
      let b = new BDF()
      let ff = await fs.readFile(RCS.DIRS.cwd + '/fonts/' + this._path + '.bdf', 'utf-8')
      b.load(ff)
      this._bdf = b

      this._char_size = this.width * this.height
      this._size = this.count * this._char_size

      if (this._buffer) {
        this._buffer.free()
      }
      this._buffer = RCS.memoryManager.alloc(RCS.i8, this._size)

      let baseline = this.ascent + this.descent + this.offsety
      let cw = this.width
      let fnt_sz = this._char_size
      let osx = this.offsetx
      let mem = this.array

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

      this._id = fontCacheIndex++
      fontCache[this._path] = this
    }

    this.emit('loaded')
  }

}

module.exports = {
  FONTBANK,
  fontCache,
  fontCacheIndex,
  BDF,
  Font,
}
