/**
 * @module classes
 */

const { Emitter } = require('../../mixins/events')

const _FOLDER = 'dir'

class Doc extends Emitter {

  constructor (table, value = {}) {
    super()

    if (table) {
      Object.defineProperty(this, '_table', {
        enumerable: false,
        configurable: true,
        value: table,
      })
    }
    this.id = _.uuid()
    _.extend(this, value)
  }

  get db () {
    return this._table.db
  }

  get dbname () {
    return _.get(this, '_db.name')
  }

  get table () {
    return this._table
  }

  get tablename () {
    return _.get(this, '_table.name')
  }

  touch () {
    let now = Date.now()
    if (!this._created) {
      this._created = now
    }
    this._modified = now
    return this
  }

  async save () {
    this.touch()
    return this.table.set(this)
  }

  get pathname () {
    return this.dirname + (this._type ? '.' + this._type : '')
  }

  get dirname () {
    return (this._path || '') + this._name
  }

  get isFolder () {
    return this._type === _FOLDER
  }

  get type () {
    return this._type
  }

  set type (value) {
    if (!this.readonly && this._type !== value) {
      this._type = value
      this.save()
    }
  }

  get path () {
    return this._path
  }

  set path (value) {
    if (!this.readonly && this._path !== value) {
      this._path = value
      this.save()
    }
  }

  get name () {
    return this._name
  }

  set name (value) {
    if (!this.readonly && this._name !== value) {
      this._name = value
      this.save()
    }
  }

  get attr () {
    return this._attr
  }

  set attr (value) {
    if (!this.readonly && this._attr !== value) {
      this._attr = value
      this.save()
    }
  }

  _hasAttr (attr) {
    return _.includes(_.get(this, '_attr', '').split(), (attr || '').toLowerCase())
  }

  get size () {
    return this._size
  }

  set size (value) {
    if (!this.readonly && this._size !== value) {
      this._size = value
      this.save()
    }
  }

  get readable () {
    return this._hasAttr('r')
  }

  get writable () {
    return this._hasAttr('w')
  }

  get readonly () {
    return this.readable && !this.writable
  }

  async children () {
    let f = await this._table.filter({ _path: this.dirname })
    return f.toArray()
  }

  async add (doc) {
    if (_.isArray(doc)) {
      _.each(doc, async d => await this.addChild(d))
      return undefined
    }
    else {
      this._table.ensureFields(doc)
      doc.path = this.dirname
      return this._table.set(doc)
    }
  }

  async deleteChildren () {
    return this._table.delete({ _path: this.dirname })
  }

  async delete () {
    if (this.isFolder) {
      await this.deleteChildren()
    }
    return this._table.delete(this)
  }

}

module.exports = {
  Doc,
}
