/**
 * @module classes/db
 */

const { Emitter } = require('../../mixins/common/events')
const { Dexie } = require('../../utils')

class DB extends Emitter {

  constructor (name) {
    super()

    this._db = new Dexie(name)
  }

  get name () {
    return this.dbname
  }

  get db () {
    return this._db
  }

  get dbname () {
    return _.get(this, '_db.name')
  }

  _isPrivateTable (name) {
    return name.startsWith('__')
  }

  get tables () {
    let tables = []
    for (let table of this._db.tables) {
      if (!this._isPrivateTable(table.name)) {
        tables.push(table.name)
      }
    }
    return tables
  }

  _mapTables () {
    for (let table of this._db.tables) {
      if (!this._isPrivateTable(table.name)) {
        this[table.name] = this[table.name] || new RCS.Table(this, table.name)
      }
    }
  }

  async open () {
    if (!this._db.isOpen()) {
      this._loadVersions()
      this._setVersions()
      this._mapTables()
      await this._db.open()
      return true
    }
    return false
  }

  close () {
    this._saveVersions()
    if (this._db.isOpen()) {
      this._db.close()
      return true
    }
    return false
  }

  async addTable (name) {
    let v = _.extend(_.last(this._versions), {
      [name]: RCS.Table.indexFields.join(','),
    })

    this._versions.push(v)
    this.close()

    return this.open()
  }

  async removeTable (name) {
    let v = _.omit(_.last(this._versions), [name])

    this._versions.push(v)
    this.close()

    return this.open()
  }

}

module.exports = {
  DB,
}
