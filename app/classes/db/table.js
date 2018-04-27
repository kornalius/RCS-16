/**
 * @module fs
 */

const { Emitter } = require('../../mixins/events')
const { Doc } = require('./doc')
const { micromatch, sift } = require('../../utils')
const { qs } = require('./qs')

sift.use({
  $contains: function (a, b) {
    if (_.isArray(a)) {
      if (_.isArray(b)) {
        for (let v of b) {
          if (_.includes(a, v)) {
            return true
          }
        }
        return false
      }
      return _.includes(a, b)
    }
    return b.indexOf(a) !== -1
  },
  $mm: function (a, b) {
    return !_.isEmpty(micromatch(b, a, { basename: true, dot: true, nocase: true }))
  },
})

class Table extends Emitter {

  static get fields () {
    return ['_id', '_type', '_path', '_name', '_created', '_modified', '_attr', '_size', '_data']
  }

  static get indexFields () {
    let fields = Table.fields
    fields[0] = '&_id'
    return fields
  }

  constructor (db, name) {
    super ()

    this._db = db
    this._table = db.db[name]

    this._map()
  }

  get db () {
    return this._db
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

  get name () {
    return this.tablename
  }

  _map () {
    this._table.mapToClass(Doc)

    let that = this
    this._table.hook('reading', obj => {
      if (obj) {
        Object.defineProperty(obj, '_table', {
          enumerable: false,
          configurable: true,
          value: that,
        })
      }
      return obj
    })

    return this
  }

  _queryField (q, filter = false) {
    if (_.isString(q)) {
      return filter ? { _id: q } : { field: '_id', value: q }
    }
    else if (q instanceof Doc) {
      let id = _.get(q, '_id')
      if (id) {
        return filter ? { _id: id } : { field: '_id', value: id }
      }
    }
    else {
      if (!_.isEmpty(q.pattern)) {
        return q
      }
      return { pattern: q }
    }
    return undefined
  }

  emptyCollection () {
    let db = this._db.db
    return new db.Collection(new db.WhereClause(this))
  }

  async filter (q) {
    let qf = this._queryField(q)
    if (qf) {
      let s = sift(qf.pattern)
      let f = await this._table.filter(s)
      if (!_.isEmpty(qf.sortBy)) {
        f = f.orderBy(qf.sortBy)
      }
      return f
    }
    return this.emptyCollection()
  }

  async get (q) {
    let result

    let qf = this._queryField(q)
    if (qf) {
      if (qf.field === '_id') {
        result = await this._table.get(qf.value)
      }
      else {
        let f = await this.filter(qf)
        result = _.first(await f.toArray())
      }
    }

    return result
  }

  _formatData (d) {
    if (d instanceof Uint32Array) {
      return d
    }
    if (!d) {
      return new Uint32Array(0)
    }
    else if (_.isString(d)) {
      return new Uint32Array(_.map(d, c => c.charCodeAt(0)))
    }
    else if (_.isNumber(d)) {
      return new Uint32Array([d])
    }
    else if (_.isArray(d)) {
      return this._formatData(JSON.stringify(_.deref(d)))
    }
    return d
  }

  _calcSize (doc) {
    let d = _.get(doc, '_data')
    return d ? d.length : 0
  }

  _ensureFields (doc) {
    if (_.isArray(doc)) {
      _.each(doc, d => this._ensureFields(d))
    }
    else {
      let now = Date.now()
      _.set(doc, '_id', _.get(doc, '_id', _.uuid()))
      _.set(doc, '_path', _.get(doc, '_path', ''))
      _.set(doc, '_name', _.get(doc, '_name', 'untitled'))
      _.set(doc, '_type', _.get(doc, '_type', 'txt'))
      _.set(doc, '_created', _.get(doc, '_created', now))
      _.set(doc, '_attr', _.get(doc, '_attr', ''))
      _.set(doc, '_modified', now)
      _.set(doc, '_data', this._formatData(_.get(doc, '_data')))
      _.set(doc, '_size', this._calcSize(doc))
    }
  }

  async set (doc) {
    if (_.isArray(doc)) {
      _.remove(doc, d => d instanceof Doc && !doc.writable)
      this._ensureFields(doc)
      return this._table.bulkPut(_.deref(doc))
    }
    else {
      if (doc instanceof Doc && !doc.writable) {
        return undefined
      }
      this._ensureFields(doc)
      return this._table.put(_.deref(doc))
    }
  }

  async count (q) {
    let qf = this._queryField(q, true)
    if (qf) {
      if (qf.field === '_id') {
        let result = await this._table.get(qf.value)
        return result ? 1 : 0
      }
      else {
        let f = await this.filter(qf)
        return f.count()
      }
    }
    return 0
  }

  async exists (q) {
    if (_.isArray(q)) {
      for (let query of q) {
        if (!await this.exists(query)) {
          return false
        }
      }
      return true
    }
    else {
      return await this.count(q) > 0
    }
  }

  async delete (q) {
    if (_.isArray(q)) {
      return this._table.bulkDelete(_.map(q, '_id'))
    }
    else {
      let qf = this._queryField(q)
      if (qf) {
        if (qf.field === '_id') {
          return this._table.delete(qf.value)
        }
        else {
          let f = await this.filter(qf)
          return f.delete()
        }
      }
      return undefined
    }
  }

  static qs (pattern) {
    return qs(pattern, {
      allowDots: true,
      allowPrototypes: true,
      ignoreQueryPrefix: true,
      delimiter: /[&;]/,
    })
  }

  async find (pattern) {
    if (_.isString(pattern)) {
      pattern = Table.qs(pattern)
    }
    let f = await this.filter(pattern)
    return f.toArray()
  }

}

module.exports = {
  Table,
}
