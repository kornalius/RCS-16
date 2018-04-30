/**
 * @module mixins
 */

const ChildrenMixin = Mixin(superclass => class ChildrenMixin extends superclass {

  constructor () {
    super(...arguments)

    this._parent = undefined
    this._children = []
  }

  get parent () {
    return this._parent
  }

  get root () {
    let p = this.parent
    while (p) {
      if (!p.parent) {
        break
      }
      p = p.parent
    }
    return p
  }

  get children () {
    return this._children
  }

  get count () {
    return this._children.length
  }

  get firstChild () {
    return _.first(this._children)
  }

  get lastChild () {
    return _.last(this._children)
  }

  get previousSibling () {
    if (this._parent) {
      let idx = this._parent.indexOf(this)
      return this._parent.at(idx - 1)
    }
    return undefined
  }

  get nextSibling () {
    if (this._parent) {
      let idx = this._parent.indexOf(this)
      return this._parent.at(idx + 1)
    }
    return undefined
  }

  each (cb) {
    _.each(this._children, cb)
    return this
  }

  map (cb) {
    return _.map(this._children, cb)
  }

  filter (cb) {
    return _.filter(this._children, cb)
  }

  at (index) {
    return _.nth(this._children, index)
  }

  indexOf (child) {
    return this._children.indexOf(child)
  }

  contains (child) {
    return this.indexOf(child) !== -1
  }

  appendChild (child) {
    if (!this.contains(child)) {
      this._children(child)
      child._parent = this
    }
    return this
  }

  insertChildAt (child, index) {
    if (!this.contains(child)) {
      this._children.splice(index, 0, child)
      child._parent = this
    }
    return this
  }

  insertBefore (child, before) {
    if (!this.contains(child)) {
      let idx = this.indexOf(before)
      if (idx !== -1) {
        this._children.splice(idx, 0, child)
        child._parent = this
      }
    }
    return this
  }

  replaceChild (newChild, oldChild) {
    if (!this.contains(newChild)) {
      let idx = this.indexOf(oldChild)
      if (idx !== -1) {
        this._children.splice(idx, 1, newChild)
        oldChild._parent = null
        newChild._parent = this
      }
    }
    return this
  }

  removeChild (child) {
    if (this.contains(child)) {
      _.pull(this._children, child)
      child._parent = undefined
    }
    return this
  }

  removeChildren () {
    this.forEachChild(c => { c._parent = undefined })
    this._children = []
    return this
  }

})

module.exports = {
  ChildrenMixin,
}
