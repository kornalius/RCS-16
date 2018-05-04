/**
 * @module app
 */

const electron = require('electron')
const { remote, screen, dialog } = electron
const { app, BrowserWindow } = remote
const os = require('os')
const _vm = require('vm')
const child_process = require('child_process')
const dns = require('dns')
const http = require('http')
const https = require('https')
const net = require('net')
const querystring = require('querystring')
const stream = require('stream')
const tls = require('tls')
const tty = require('tty')
const url = require('url')
const zlib = require('zlib')
const fs = require('fs-promise')
const path = require('path')
const { Mixin, mix } = require('mixwith')
const uuid = require('uuid/v4')
const Dexie = require('dexie')
const Color = require('color')
const moment = require('moment')
const sift = require('sift')
const raf = require('raf')
require('performance-now')
const _ = require('underscore-plus')
const Sugar = require('sugar')
const math = require('mathjs')
const is = require('is_js')
const micromatch = require('micromatch')
const got = require('got')

require('pixi.js')

window._ = _
_.extend(_, require('lodash'))
_.extend(_, require('underscore-deep-extend'))

_.isColor = function (value) {
  return value instanceof Color
}

_.iterateDeep = function (value, cb, paths = []) {
  cb(value, paths)

  if (_.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      _.iterateDeep(value[i], cb, _.concat(paths, [i]))
    }
  }
  else if (_.isObject(value)) {
    for (let key in value) {
      _.iterateDeep(value[key], cb, _.concat(paths, [key]))
    }
  }
}

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g

const utoa = function (str) {
  return window.btoa(unescape(encodeURIComponent(str)))
}

const atou = function (str) {
  return decodeURIComponent(escape(window.atob(str)))
}


Sugar.extend()

window.is = is
window.math = math
window.Mixin = Mixin
window.mix = mix
window.Color = Color
window.moment = moment
window.utoa = utoa
window.atou = atou

const userPath = path.join(app.getPath('home'), '/.rcs-16')
if (!fs.existsSync(userPath)) {
  fs.mkdirsSync(userPath)
}

const name = app.getName()
const version = app.getVersion()

const IS_WIN = /^win/.test(process.platform)
const IS_OSX = process.platform === 'darwin'
const IS_LINUX = process.platform === 'linux'
const dirs = {
  build: __dirname,
  cwd: app.getAppPath(),
  home: app.getPath('home'),
  app: app.getPath('appData'),
  user: userPath,
  tmp: app.getPath('temp'),
  root: app.getPath('exe'),
  node_modules: path.join(userPath, 'node_modules'),
  packages: path.join(userPath, 'package.json'),
}

console.info(dirs)

const p = function (...args) {
  return path.join(__dirname, ...args)
}

const now = function () {
  return performance.now()
}

const openFile = function (...args) {
  try {
    return dialog.showOpenDialog.apply(dialog, args)
  }
  catch (err) {
    console.error(err)
  }
  return null
}

const saveFile = function (...args) {
  try {
    return dialog.showSaveDialog.apply(dialog, args)
  }
  catch (err) {
    console.error(err)
  }
  return null
}

const messageBox = function (...args) {
  try {
    return dialog.showMessageBox.apply(dialog, args)
  }
  catch (err) {
    console.error(err)
  }
  return null
}

const normalizeMessages = function (...message) {
  let args = []
  for (let m of message) {
    if (_.isArray(m)) {
      args.push(m.join(', '))
    }
    else if (_.isString(m)) {
      args.push(m)
    }
  }
  return args
}

const delay = function (ms) {
  let t = performance.now()
  let c = t
  while (c - t <= ms) {
    c = performance.now()
  }
}

const async = function (context, fn, args, delay) {
  if (_.isNumber(args)) {
    delay = args
    args = []
  }
  if (!_.isArray(args)) {
    args = [args]
  }
  setTimeout(() => {
    fn.call(context, ...args)
  }, delay || 1)
}

const buffer_to_string = function (b) {
  let len = b.length
  let i = 0
  let s = ''
  while (i < len) {
    s += b[i++].toString(16)
  }
  return s
}

const buffer_to_string_hex = function (b) {
  let len = b.length
  let i = 0
  let s = ''
  while (i < len) { s += b[i++].toString(16) }
  return s
}

const hex_string_to_buffer = function (str) {
  let i = 0
  let x = 0
  let len = str.length
  let b = new Uint8Array(Math.trunc(len / 2))
  while (i < len) { b[x++] = parseInt(str.substr(i += 2, 2), 16) }
  return b
}

const string_buffer = function (str, len = 0) {
  len = len || str.length
  let b = new Buffer(len)
  b.write(str, 0, str.length, 'ascii')
  return b
}

const hex = function (value, size = 32) {
  return '$' + _.padStart(value.toString(16), Math.trunc(size / 4), '0')
}

const buffer_dump = function (buffer, options = {}) {
  let width = options.width || 16
  let caps = options.caps || 'upper'
  let indent = _.repeat(' ', options.indent || 0)

  let zero = function (n, max) {
    n = n.toString(16)
    if (caps === 'upper') { n = n.toUpperCase() }
    while (n.length < max) {
      n = '0' + n
    }
    return n
  }

  let len = Math.min(buffer.byteLength, options.length || buffer.byteLength)
  let rows = Math.ceil(len / width)
  let last = len % width || width
  let offsetLength = len.toString(16).length
  if (offsetLength < 6) { offsetLength = 6 }

  let arr = new Uint8Array(buffer)

  let str = indent + 'Offset'
  while (str.length < offsetLength) {
    str += ' '
  }

  str += '  '

  for (let i = 0; i < width; i++) {
    str += ' ' + zero(i, 2)
  }

  if (len) {
    str += '\n'
  }

  let b = 0

  for (let i = 0; i < rows; i++) {
    str += indent + zero(b, offsetLength) + '  '
    let lastBytes = i === rows - 1 ? last : width
    let lastSpaces = width - lastBytes

    for (let j = 0; j < lastBytes; j++) {
      str += ' ' + zero(arr[b], 2)
      b++
    }

    for (let j = 0; j < lastSpaces; j++) {
      str += '   '
    }

    b -= lastBytes
    str += '   '

    for (let j = 0; j < lastBytes; j++) {
      let v = arr[b]
      str += v > 31 && v < 127 || v > 159 ? String.fromCharCode(v) : '.'
      b++
    }

    str += '\n'
  }

  return str
}

const strings_to_buffer = function (arr, def, width, height) {
  let buf = new Uint8Array(width * height)
  let ptr = 0
  for (let y = 0; y < height; y++) {
    let l = _.get(arr, y)
    let len = l ? l.length : 0
    for (let x = 0; x < width; x++) {
      if (l && x < len) {
        let c = l[x]
        let d = def[c]
        if (!_.isUndefined(d)) {
          buf[ptr] = d
        }
      }
      ptr++
    }
  }
  return buf
}

const flatten = function (obj, paths = []) {
  let r = {}

  _.forOwn(obj, key => {
    let p = _.concat(paths, [key]).join('.')
    let value = obj[key]

    _.set(r, p, value)

    if (_.isPlainObject(value)) {
      _.extend(r, flatten(value, _.concat(paths, [key])))
    }
  })

  return r
}

const stringToFunction = function (str) {
  return new Function('', 'return (' + str + ');')()
}

const deref = function (value, refs = {}, path = []) {
  if (!_.isNative(_.get(value, 'constructor')) && !_.isEmpty(path)) {
    let ref = _.findKey(refs, value)
    if (!ref) {
      refs[path.join('.')] = value
    }
    else {
      return '¸' + ref // alt + shift + z
    }
  }
  else if (_.isFunction(value)) {
    return 'Œ' + value.toString() // alt + shift + q
  }

  if (_.isArray(value)) {
    return _.map(value, (v, idx) => deref(v, refs, _.concat(path, [idx])))
  }
  else if (_.isObjectLike(value)) {
    return _.mapValues(value, (v, key) => deref(v, refs, _.concat(path, [key])))
  }
  else {
    return value
  }
}

const ref = function (value, refs = {}, path = []) {
  if (_.isArray(value)) {
    return _.map(value, (v, idx) => ref(v, refs, _.concat(path, [idx])))
  }
  else if (_.isObjectLike(value)) {
    return _.mapValues(value, (v, key) => ref(v, refs, _.concat(path, [key])))
  }

  if (_.isString(value)) {
    if (value.startsWith('¸')) {
      refs[path.join('.')] = value.substr(1)
    }
    else if (value.startsWith('Œ')) {
      value = stringToFunction(value.substr(1))
    }
  }

  if (_.isEmpty(path)) {
    for (let key in refs) {
      _.set(value, key, _.get(value, refs[key]))
    }
  }

  return value
}

const wrapAround = function (value, min, max) {
  if (_.isNumber(min)) {
    value = Math.max(min, value)
  }
  if (_.isNumber(max)) {
    value = Math.min(max, value)
  }
  return value
}

const keymap = {
  3: ['cancel'],
  8: ['backspace'],
  9: ['tab'],
  12: ['clear'],
  13: ['enter', 'return'],
  16: ['shift'],
  17: ['ctrl', 'control'],
  18: ['alt', 'menu'],
  19: ['pause', 'break'],
  20: ['capslock'],
  27: ['escape', 'esc'],
  32: ['space', 'spacebar', ' ', 'space'],
  33: ['pageup'],
  34: ['pagedown'],
  35: ['end'],
  36: ['home'],
  37: ['left'],
  38: ['up'],
  39: ['right'],
  40: ['down'],
  41: ['select'],
  42: ['printscreen'],
  43: ['execute'],
  44: ['snapshot'],
  45: ['insert', 'ins'],
  46: ['delete', 'del'],
  47: ['help'],
  48: ['digit0', '0'],
  49: ['digit1', '1'],
  50: ['digit2', '2'],
  51: ['digit3', '3'],
  52: ['digit4', '4'],
  53: ['digit5', '5'],
  54: ['digit6', '6'],
  55: ['digit7', '7'],
  56: ['digit8', '8'],
  57: ['digit9', '9'],
  59: ['semicolon', ';'],
  59: ['equal', '='],
  65: ['keyA', 'a'],
  66: ['keyB', 'b'],
  67: ['keyC', 'c'],
  68: ['keyD', 'd'],
  69: ['keyE', 'e'],
  70: ['keyF', 'f'],
  71: ['keyG', 'g'],
  72: ['keyH', 'h'],
  73: ['keyI', 'i'],
  74: ['keyJ', 'j'],
  75: ['keyK', 'k'],
  76: ['keyL', 'l'],
  77: ['keyM', 'm'],
  78: ['keyN', 'n'],
  79: ['keyO', 'o'],
  80: ['keyP', 'p'],
  81: ['keyQ', 'q'],
  82: ['keyR', 'r'],
  83: ['keyS', 's'],
  84: ['keyT', 't'],
  85: ['keyU', 'u'],
  86: ['keyV', 'v'],
  87: ['keyW', 'w'],
  88: ['keyX', 'x'],
  89: ['keyY', 'y'],
  90: ['keyZ', 'z'],
  91: ['meta', 'command', 'cmd', 'windows', 'win', 'super', 'meta'],
  93: ['meta', 'command', 'cmd', 'windows', 'win', 'super', 'meta'],
  96: ['numpad0', 'numzero', 'num0'],
  97: ['numpad1', 'numone', 'num1'],
  98: ['numpad2', 'numtwo', 'num2'],
  99: ['numpad3', 'numthree', 'num3'],
  100: ['numpad4', 'numfour', 'num4'],
  101: ['numpad5', 'numfive', 'num5'],
  102: ['numpad6', 'numsix', 'num6'],
  103: ['numpad7', 'numseven', 'num7'],
  104: ['numpad8', 'numeight', 'num8'],
  105: ['numpad9', 'numnine', 'num9'],
  106: ['numpadMultiply', 'nummultiply', 'num*'],
  107: ['numpadAdd', 'numadd', 'num+'],
  108: ['numpadEnter', 'numenter'],
  109: ['numpadSubtract', 'numsubtract', 'num-'],
  110: ['numpadDecimal', 'numdecimal', 'num.'],
  111: ['slash', 'numdivide', 'num/'],
  144: ['numlock', 'lock'],
  112: ['f1'],
  113: ['f2'],
  114: ['f3'],
  115: ['f4'],
  116: ['f5'],
  117: ['f6'],
  118: ['f7'],
  119: ['f8'],
  120: ['f9'],
  121: ['f10'],
  122: ['f11'],
  123: ['f12'],
  145: ['scroll', 'scrolllock', 'scroll'],
  173: ['minus', '-'],
  186: ['semicolon', ';'],
  188: ['comma', ','],
  189: ['dash', '-'],
  190: ['period', '.'],
  191: ['forwardslash', '/'],
  192: ['graveaccent', '`'],
  219: ['openbracket', '['],
  220: ['backslash', '\\'],
  221: ['closebracket', ']'],
  222: ['quote', '\''],
  224: ['meta', 'command', 'cmd', 'windows', 'win', 'super', 'meta'],
}

const keycode = function (c) {
  return keymap[c] ? _.upperFirst(_.first(keymap[c])) : ''
}

const keystring = function (c) {
  return keymap[c] ? _.upperFirst(_.last(keymap[c])) : ''
}

const keyToKeycode = function (key) {
  key = key.toLowerCase()
  for (let code in keymap) {
    if (_.includes(_.map(keymap[code], _.toLower), key)) {
      return code
    }
  }
  return 0
}

const keyevent = function (type, c, ctrl, alt, shift, meta) {
  let e = new KeyboardEvent(type, {
    bubbles: true,
    cancelable: true,
    code: keycode(c),
    ctrlKey: ctrl,
    altKey: alt,
    shiftKey: shift,
    metaKey: meta,
  })
  return e
}

const stringToKey = function (str, delimiter = '+') {
  let keys = _.map(str.toLowerCase().split(delimiter), _.trim)

  let c
  let ctrl = false
  let alt = false
  let shift = false
  let meta = false

  for (let k of keys) {
    let code = keyToKeycode(k)
    if (code !== 0) {
      let _c = _.parseInt(code)
      if (_c === 17) {
        ctrl = true
      }
      else if (_c === 18) {
        alt = true
      }
      else if (_c === 16) {
        shift = true
      }
      else if (_c === 91) {
        meta = true
      }
      else {
        c = _c
      }
    }
  }

  return keyevent('keydown', c, ctrl, alt, shift, meta)
}

const keyToString = function (e, options = {}) {
  const defaultOptions = {
    meta: 'Meta',
    ctrl: 'Ctrl',
    alt: 'Alt',
    shift: 'Shift',
    joinWith: '+'
  }

  const buildKeyMap = e => {
    let c = e.code.toLowerCase()

    let code = keyToKeycode(c)
    let character = keystring(code)

    return {
      character,
      modifiers: {
        meta: e.metaKey,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey
      }
    }
  }

  const buildKeyArray = e => {
    let map = buildKeyMap(e)
    let modifiers = map.modifiers

    let result = []

    if (modifiers.meta) {
      result.push(_.upperFirst(options.meta))
    }
    if (modifiers.ctrl) {
      result.push(_.upperFirst(options.ctrl))
    }
    if (modifiers.alt) {
      result.push(_.upperFirst(options.alt))
    }
    if (modifiers.shift) {
      result.push(_.upperFirst(options.shift))
    }
    if (map.character) {
      result.push(_.upperFirst(map.character))
    }

    return result
  }

  options = _.extend({}, defaultOptions, options)
  return buildKeyArray(e).join(options.joinWith)
}

const isUUID = function (str) {
  return /^(\w{8}(-\w{4}){3}-\w{12}?)$/.test(str)
}

const isEvent = function (el) {
  return el instanceof window.Event
}

const debounces = {}
const debounce = function (name, fn, wait = 0) {
  clearTimeout(debounces[name])
  debounces[name] = setTimeout(fn, wait, ...arguments)
}

const throttlings = {}
const throttle = function (name, fn, wait) {
  const args = arguments

  let t = throttlings[name]
  if (!t) {
    t = {
      throttling: false,
      lastFn: undefined,
      lastTime: undefined,
    }
    throttlings[name] = t
  }

  if (!t.throttling) {
    fn(args)
    t.lastTime = Date.now()
    t.throttling = true
  }
  else {
    clearTimeout(t.lastFn)
    t.lastFn = setTimeout(() => {
      let time = Date.now()
      if (time - t.lastTime >= wait) {
        fn(args)
        t.lastTime = time
      }
    }, wait - (Date.now() - t.lastTime))
  }
}

let _storeProps = {}

const storeProps = function (id, obj, props, clear = false) {
  if (id && obj) {
    let s = _storeProps[id] = {}
    for (let p of props) {
      _.set(s, p, _.get(obj, p))
      if (clear) {
        obj.clearProperty(p)
      }
    }
  }
}

const restoreProps = function (id, obj, props) {
  if (id && obj) {
    let s = _storeProps[id]
    if (s) {
      for (let p of props) {
        _.set(obj, p, _.get(s, p))
      }
      _storeProps[id] = undefined
    }
  }
}

module.exports = {
  _,
  p,
  name,
  version,
  electron,
  dialog,
  openFile,
  saveFile,
  messageBox,
  remote,
  screen,
  BrowserWindow,
  app,
  fs,
  path,
  userPath,
  IS_WIN,
  IS_OSX,
  IS_LINUX,
  dirs,
  Mixin,
  mix,
  normalizeMessages,
  now,
  delay,
  async,
  flatten,
  buffer_to_string,
  buffer_to_string_hex,
  hex_string_to_buffer,
  string_buffer,
  strings_to_buffer,
  hex,
  buffer_dump,
  utoa,
  atou,
  Dexie,
  uuid,
  sift,
  stringToFunction,
  deref,
  ref,
  Color,
  moment,
  os,
  _vm,
  child_process,
  dns,
  http,
  https,
  net,
  querystring,
  stream,
  tls,
  tty,
  url,
  zlib,
  raf,
  wrapAround,
  keyToString,
  keyevent,
  stringToKey,
  keycode,
  keystring,
  keyToKeycode,
  isUUID,
  debounce,
  throttle,
  math,
  isEvent,
  micromatch,
  got,
  storeProps,
  restoreProps,
}
