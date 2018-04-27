/**
 * @module mixins
 */

const { Emitter } = require('../common/events')

const DocMixin = Mixin(superclass => class DocMixin extends superclass {

  constructor (table, value = {}) {
    super()

    this._table = table
    this.id = _.uuid()
    _.extend(this, value)
  }

  get db () { return this._table.db }

  get table () { return this._table }

  clear () {
    let id = this.id
    let t = this._table
    for (let key of _.keys(this)) {
      delete this[key]
    }
    this._table = t
    this.id = id
  }

  ensureFields (single = false) {
    _.set(this, 'id', _.get(this, 'id', single ? 1 : _.uuid()))
    // _.set(this, '_modified', Date.now())
  }

  serialize (value) {
    return _.omit(value, ['id', '_table'])
  }

  get (path) {
    if (path) {
      return _.get(this, path)
    }
    else {
      return _.clone(this)
    }
  }

  async set (path, value, update = false) {
    if (value) {
      let v = this.serialize(value)
      if (update) {
        v = _.extend(_.get(this, path), v)
      }
      _.set(this, path, v)
    }
    else {
      let v = this.serialize(path)
      if (!update) {
        this.clear()
      }
      _.extend(this, v)
    }
    return this.save()
  }

  async update (path, value) {
    return this.set(path, value, true)
  }

  async delete () {
    return this.table.delete(this.id)
  }

  async save () {
    return await this.table.put(_.deref(_.omit(this, ['_table'])))
  }

})


class Doc extends mix(Emitter)
.with(
  DocMixin,
) {
}

module.exports = {
  DocMixin,
  Doc,
}
