/**
 * @module mixins
 */

const UserTablesMixin = Mixin(superclass => class UserTablesMixin extends superclass {

  constructor () {
    super()

    this.clearVersions()
  }

  get versions () { return this._versions }
  set versions (value) {
    if (this._versions !== value) {
      this._versions = value
      this.updateVersions()
    }
  }

  get userTables () {
    let latest = _.maxBy(this._versions, 'version')
    return _.omit(latest, ['id', 'version'])
  }

  clearVersions () {
    this._versions = [
      _.extend({ id: _.uuid(), version: 1 }, this.defaultVersion),
    ]
  }

  deleteVersions () {
    this.clearVersions()
    localStorage.removeItem(this._name + '_versions')
  }

  updateVersions () {
    for (let v of this._versions) {
      this._db.version(v.version).stores(_.omit(v, ['id', 'version']))
    }
    this.saveVersions()
  }

  addTable (name, indexes) {
    let latest = _.clone(this.userTables)
    this._versions.push(_.extend(latest, indexes, { id: _.uuid(), version: latest.version + 1 }))
    this.updateVersions()
  }

  removeTable (name) {
    let latest = _.clone(this.userTables)
    delete latest[name]
    this._versions.push(latest)
    this.updateVersions()
  }

  table (name) { return this._db[name] }

  schema (name) {
    let schema = this.userTables
    return name ? schema[name] : schema
  }

  loadVersions () {
    let versions = localStorage.getItem(this.name + '_versions')
    if (!_.isEmpty(versions)) {
      this._versions = JSON.parse(versions)
    }
    return this
  }

  saveVersions () {
    localStorage.setItem(this.name + '_versions', JSON.stringify(this._versions))
    return this
  }

})

module.exports = {
  UserTablesMixin,
}
