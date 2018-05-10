/**
 * @module compiler
 */

const { Emitter } = require('../mixins/common/events')
const { FN, CLASS, VAR } = require('./tokenizer')

class FrameItem extends Emitter {

  constructor (frame, parent, node, item_type) {
    super()

    this._frame = frame
    this._parent = parent
    this._itemType = item_type
    this._node = node
  }

  get frame () { return this._frame }
  get parent () { return this._parent }
  get itemType () { return this._itemType }
  get node () { return this._node }

  get name () { return this._node.value }
  get type () { return this._node.type }
  get data () { return this._node.data }

  get isVar () { return this._itemType === VAR }
  get isClass () { return this._itemType === CLASS }
  get isFn () { return this._itemType === FN }
  get isLocal () { return this._frame.isLocal }
  get isGlobal () { return this._frame.isGlobal }

}

class Frame extends Emitter {

  constructor (frames, parent, type) {
    super()

    this._frames = frames
    this._parent = parent
    this._type = type
    this._items = []
  }

  get name () { return this._parent ? '$s' : '$g' }
  get parent () { return this._parent }
  get type () { return this._type }
  get items () { return this._items }

  get isLocal () { return this._parent !== null }
  get isGlobal () { return this._parent === null }

  add (node, parent, item_type) {
    let i = new FrameItem(this, parent, node, item_type)
    this._items.push(i)
    node._global = this.isGlobal
    return i
  }

  exists (name, item_type) {
    return _.find(this._items, item_type ? { name, item_type } : { name })
  }

  fn_exists (name) {
    return this.exists(name, FN)
  }

  var_exists (name) {
    return this.exists(name, VAR)
  }

  class_exists (name) {
    return this.exists(name, CLASS)
  }

}

class Frames extends Emitter {

  constructor () {
    super ()

    this.reset()
  }

  get current () { return this._current }

  reset () {
    this._current = null
  }

  start (type) { this._current = new Frame(this, this._current, type) }

  end () { this._current = this._current.parent }

  add (node, parent, item_type) { return this._current.add(node, parent, item_type) }

  exists (name, item_type) {
    let c = this._current
    while (c) {
      let i = c.exists(name, item_type)
      if (i) {
        return i
      }
      c = c.parent
    }
    return null
  }

  fn_exists (name) {
    return this.exists(name, FN)
  }

  class_exists (name) {
    return this.exists(name, CLASS)
  }

  var_exists (name) {
    return this.exists(name, VAR)
  }

}

module.exports = {
  Frame,
  FrameItem,
  Frames,
}
