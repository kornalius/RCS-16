/**
 * @module classes
 */

const { Emitter } = require('../mixins/common/events')

const hexy = require('hexy')
const prettyBytes = require('pretty-bytes')
const { MemBlock, sizeOf, DEFAULT_TYPE, RAM_SIZE, RAM } = require('./memory.js')
const { hex } = require('../utils.js')

const collect_delay = 32 * 1024

class MemoryManager extends Emitter {

  constructor () {
    super()

    this._blocks = []
    this._last = 0
  }

  get blocks () { return this._blocks }
  get last () { return this._last }

  tick (t) {
    if (t - this._last >= collect_delay) {
      this.collect()
      this._last = t
    }
  }

  async boot (cold = true) {
    this.clear()
    if (cold) {
      this.reset()
    }
  }

  clear () {
    this._blocks = []
    this._last = 0
  }

  reset () {
    this.collect()
    this.clear()
  }

  shut () {
    this.reset()
  }

  get avail_mem () { return RAM_SIZE }

  get used_mem () {
    let size = 0
    for (let b of this._blocks) {
      if (b.active) {
        size += b.size
      }
    }
    return size
  }

  get free_mem () { return this.avail_mem - this.used_mem }

  alloc (type = DEFAULT_TYPE, count = 1, ...value) {
    let size = sizeOf(type) * count
    let n = 0

    for (let b of this._blocks) {
      if (b.bottom > n) {
        n = b.bottom
      }

      if (!b.active && b.size >= size) {
        if (b.size === size) {
          b._active = true
          return b.top
        }

        let ob = b.bottom
        b.bottom = b.top + size - 1
        b.size = size
        b.count = count
        b._active = true

        let block = new MemBlock(type, b.bottom + 1, ob - (b.bottom + 1))
        this._blocks.push(block)
        return block
      }
    }

    if (n + size > RAM_SIZE) {
      return undefined
    }

    let addr = n

    let block = new MemBlock(type, addr, count)
    block._active = true
    this._blocks.push(block)

    block.fill(0, addr, size)

    if (value) {
      let size = sizeOf(type) * count
      let a = addr
      for (let v of value) {
        block.write(v, a, type)
        a += size
      }
    }

    return block
  }

  free (addr) {
    let b = this.block(addr)
    if (b) {
      b._active = false
    }
  }

  block (addr) {
    for (let b of this._blocks) {
      if (b.top === addr) {
        return b
      }
    }
    return undefined
  }

  type (addr) {
    let b = this.block(addr)
    return b && b.active ? b.type : null
  }

  size (addr) {
    let b = this.block(addr)
    return b && b.active ? b.size : -1
  }

  collect () {
    _.remove(this._blocks, b => !b.active)
  }

  dump () {
    console.log('memory blocks dump...', 'avail:', prettyBytes(this.avail_mem), 'active:', prettyBytes(this.used_mem), 'free:', prettyBytes(this.free_mem))
    for (let b of this._blocks) {
      console.log('')
      console.log('offset:', hex(b.top, 32), 'size:', this.size(b.top), 'type:', this.type(b.top))
      console.log(hexy.hexy(RAM, { offset: b.top, length: Math.min(255, b.size), width: 16, caps: 'upper', indent: 2 }))
    }
  }

}

module.exports = {
  MemoryManager,
}
