/**
 * @module classes/db
 */

const { Emitter } = require('../../mixins/common/events')
const { fs } = require('../../utils')

const DOS_PATHSEP = '/'
const DOS_EXTSEP = '.'
const DOS_CURRENT = '.'
const DOS_PARENT = '..'

let fileSystems = []

class FS extends Emitter {

  constructor (db, cwd) {
    super()

    this._db = db
    this._cwd = cwd

    fileSystems.push(this)
  }

  destroy () {
    _.pull(fileSystems, this)
  }

  path_split (path) { return path.split(DOS_PATHSEP) }

  path_join (paths) { return paths.join(DOS_PATHSEP) }

  normalize (path) {
    let cwd = this.cwd()
    let newparts = []
    let paths = this.path_split(path)
    let i = 0
    let len = paths.length
    let p = paths[i]
    while (i < len) {
      if (p === DOS_CURRENT) {
        newparts = newparts.concat(cwd)
      }
      else if (p === DOS_PARENT) {
        newparts = newparts.concat(cwd.slice(0, cwd.length - 1))
      }
      else {
        newparts.push(p)
      }
      i++
      p = paths[i]
    }
    return newparts
  }

  pathname (paths) { return this.path_join(paths) }

  dirname (path) {
    let parts = this.normalize(path)
    if (_.last(parts).indexOf(DOS_EXTSEP)) {
      parts.pop()
    }
    return this.path_join(parts)
  }

  basename (path) { return _.first(this.filename(path).split(DOS_EXTSEP)) }

  extname (path) { return _.last(this.filename(path).split(DOS_EXTSEP)) }

  filename (path) { return _.last(this.normalize(path)) }

  get volumes () {
    return this._db.tables
  }

  mounted (name) {
    return !_.isUndefined(_.find(this._db.tables, name))
  }

  mountTable (name) {
    return this._db[name]
  }

  async mount (name, realpath) {
    if (!this.mounted(name)) {
      await this._db.addTable(name)
      let table = this.mountTable(name)
      if (table) {
        let json = await fs.readFile(realpath, 'utf8')
        if (json) {
          table.set(_.ref(JSON.parse(json)))
        }
      }
      this.emitToAll('mount', name)
    }
  }

  async dump (name, realpath) {
    if (this.mounted(name)) {
      let table = this.mountTable(name)
      if (table) {
        let docs = await table.toArray()
        await fs.writeFile(realpath, JSON.stringify(_.deref(docs)), 'utf8')
      }
    }
  }

  async unmount (name) {
    if (this.mounted(name)) {
      await this._db.deleteTable(name)
      this.emitToAll('unmount', name)
      return true
    }
    return false
  }

  static emitToAll () {
    for (let fs of fileSystems) {
      fs.emit(...arguments)
    }
  }

  async get (mount, q) {
    let table = this.mountTable(mount)
    return table ? table.get(q) : undefined
  }

  async set (mount, doc) {
    let table = this.mountTable(mount)
    return table ? table.set(doc) : undefined
  }

  async delete (mount, q) {
    let table = this.mountTable(mount)
    return table ? table.delete(q) : undefined
  }

  async count (mount, q) {
    let table = this.mountTable(mount)
    return table ? table.count(q) : 0
  }

  async exists (mount, q) {
    let table = this.mountTable(mount)
    return table ? await table.count(q) > 0 : false
  }

  async filter (mount, q) {
    let table = this.mountTable(mount)
    return table ? table.filter(q) : []
  }

}

module.exports = {
  FS,
  DOS_PATHSEP,
  DOS_EXTSEP,
  DOS_CURRENT,
  DOS_PARENT,
}
