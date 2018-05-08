/**
 * @module app
 */

const utils = require('./utils')

const { Scheduler } = require('./classes/common/scheduler')
const { Point } = require('./classes/common/point')
const { Rect } = require('./classes/common/rect')
const { Range } = require('./classes/common/range')
const { Size } = require('./classes/common/size')

const { DB } = require('./classes/db/db')
const { Doc } = require('./classes/db/doc')
const { Table } = require('./classes/db/table')
const { FS } = require('./classes/db/fs')

const { sizes } = require('./classes/memory')
const { MemoryManager } = require('./classes/memorymanager')

const { Stack } = require('./classes/stack')

const { Test } = require('./test')

// Check for littleEndian
let b = new ArrayBuffer(4)
let a = new Uint32Array(b)
let c = new Uint8Array(b)
a[0] = 0xdeadbeef

const littleEndian = c[0] === 0xef

let _main
let _memoryManager
let _fs
let _scheduler

class RCSClass {
  constructor () {
    this.littleEndian = true
  }

  get DIRS () { return utils.dirs }
  get app () { return utils.app }
  get userPath () { return utils.userPath }

  get APP_NAME () { return utils.name }
  get VERSION () { return utils.version }
  get IS_WIN () { return utils.IS_WIN }
  get IS_OSX () { return utils.IS_OSX }
  get IS_LINUX () { return utils.IS_LINUX }

  get electron () { return utils.electron }
  get remote () { return utils.remote }
  get screen () { return utils.screen }
  get BrowserWindow () { return utils.BrowserWindow }

  get openFile () { return utils.openFile }
  get saveFile () { return utils.saveFile }
  get messageBox () { return utils.messageBox }

  get raf () { return utils.raf }
  get caf () { return utils.raf.cancel }
  get process () { return utils.process }

  get Dexie () { return utils.Dexie }
  get encode () { return utils.encode }
  get decode () { return utils.decode }

  get os () { return utils.os }
  get child_process () { return utils.child_process }
  get dns () { return utils.dns }
  get http () { return utils.http }
  get https () { return utils.https }
  get net () { return utils.net }
  get querystring () { return utils.querystring }
  get stream () { return utils.stream }
  get tls () { return utils.tls }
  get tty () { return utils.tty }
  get url () { return utils.url }
  get zlib () { return utils.zlib }
  get zip () { return utils.pako }

  get math () { return utils.math }
  get observable () { return utils.observable }
  get micromatch () { return utils.micromatch }
  get stringToFunction () { return utils.stringToFunction }
  get got () { return utils.got }
  get server () { return utils.server }

  get debounce () { return utils.debounce }
  get throttle () { return utils.throttle }

  get keyToString () { return utils.keyToString }
  get stringToKey () { return utils.stringToKey }
  get keyevent () { return utils.keyevent }

  get isEvent () { return utils.isEvent }

  get storeProps () { return utils.storeProps }
  get restoreProps () { return utils.restoreProps }

  get buffer_to_string () { return utils.buffer_to_string }
  get buffer_to_string_hex () { return utils.buffer_to_string_hex }
  get hex_string_to_buffer () { return utils.hex_string_to_buffer }
  get string_buffer () { return utils.string_buffer }
  get strings_to_buffer () { return utils.strings_to_buffer }
  get hex () { return utils.hex }
  get buffer_dump () { return utils.buffer_dump }

  get DB () { return DB }
  get Doc () { return Doc }
  get Table () { return Table }
  get FS () { return FS }

  get Stack () { return Stack }

  get main () {
    if (!_main) {
      _main = new Main()
    }
    return _main
  }

  get fs () {
    if (!_fs) {
      _fs = new FS()
    }
    return _fs
  }

  get i8 () { return 'i8' }
  get s8 () { return 's8' }
  get i16 () { return 'i16' }
  get s16 () { return 's16' }
  get i32 () { return 'i32' }
  get s32 () { return 's32' }
  get f32 () { return 'f32' }
  get str () { return 'str' }

  get memoryManager () {
    if (!_memoryManager) {
      _memoryManager = new MemoryManager()
    }
    return _memoryManager
  }

  get scheduler () {
    if (!_scheduler) {
      _scheduler = new Scheduler()
    }
    return _scheduler
  }

}

window.RCS = new RCSClass()

_.uuid = utils.uuid
_.deref = utils.deref
_.ref = utils.ref
_.now = utils.now
_.littleEndian = littleEndian
_.wrapAround = utils.wrapAround

window.Color = utils.Color
window.Point = Point
window.Rect = Rect
window.Range = Range
window.Size = Size

_.isPoint = function (value) {
  return value instanceof Point
}

_.isRect = function (value) {
  return value instanceof Rect
}

_.isRange = function (value) {
  return value instanceof Range
}

_.isSize = function (value) {
  return value instanceof Size
}

_.isUUID = function (value) {
  return utils.isUUID(value)
}

const Main = require('./main')

RCS.main.on('start', async () => {
  await RCS.main.boot()

  let test = new Test()
  test.start()
})
