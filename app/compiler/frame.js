import _ from 'lodash'

export var Frame
export var Frames
export var FrameItem

Frames = class {

  constructor () {
    this.reset()
  }

  reset () {
    this.current = null
  }

  start (type) { this.current = new Frame(this, this.current, type) }

  end () { this.current = this.current.parent }

  add (node, parent, item_type) { return this.current.add(node, parent, item_type) }

  exists (name, item_type) {
    let c = this.current
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
    return this.exists(name, 'fn')
  }

  class_exists (name) {
    return this.exists(name, 'class')
  }

  var_exists (name) {
    return this.exists(name, 'var')
  }

}

FrameItem = class {

  constructor (frame, parent, node, item_type) {
    this.frame = frame
    this.parent = parent
    this.item_type = item_type
    this.node = node
  }

  get data () { return this.node.data }

  get name () { return this.node.value }

  get type () { return this.node.type }

  get is_var () { return this.item_type === 'var' }

  get is_class () { return this.item_type === 'class' }

  get is_fn () { return this.item_type === 'fn' }

  get is_local () { return this.frame.is_local }

  get is_global () { return this.frame.is_global }

}

Frame = class {

  constructor (frames, parent, type) {
    this.frames = frames
    this.parent = parent
    this.type = type
    this.items = []
  }

  get name () { return this.parent ? '$s' : '$g' }

  get is_local () { return this.parent !== null }

  get is_global () { return this.parent === null }

  add (node, parent, item_type) {
    let i = new FrameItem(this, parent, node, item_type)
    this.items.push(i)
    node._global = this.is_global
    return i
  }

  exists (name, item_type) { return _.find(this.items, item_type ? { name, item_type } : { name }) }

  fn_exists (name) {
    return this.exists(name, 'fn')
  }

  var_exists (name) {
    return this.exists(name, 'var')
  }

  class_exists (name) {
    return this.exists(name, 'class')
  }

}
