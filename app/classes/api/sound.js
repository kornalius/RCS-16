/**
 * @module classes/api
 */

const { Emitter } = require('../../mixins/common/events')
const Wad = require('web-audio-daw')

/*
  shapes (1 = sine, 2 = square, 3 = triangle, 4 = sawtooth)

  [ cmd, value, ..., 00 ]

  cmd ( 0 = end, 1 = shape, 2 = pitch, 3 = volume, 4 = loop, 5 = detune, 6 = wait, 7 = label, 8 = envelop, 9 = filter, 10 = delay, 11 = vibrato, 12 = tremolo )

  value (2 bytes)

  ENVELOP ( 20 = sustain, 21 = hold, 22 = release, 23 = decay, 24 = attack )

  FILTER ( 30 = type (L H), 31 = freq, 32 = Q, 33 = envelop)

  REVERB ( )

  DELAY ( 40 = time, 41 = wet, 42 = feedback )

  VIBRATO ( 50 = shape, 51 = magnitude, 52 = speed, 53 = attack )

  TREMOLO ( 60 = shape, 61 = magnitude, 62 = speed, 63 = attack )
*/

class Sound extends Emitter {

  constructor () {
    super ()

    this._sounds = {}
  }

  get sounds () { return this._sounds }

  async boot (cold = true) {
    this.stopAll()
    if (cold) {
      this.reset()
    }
  }

  stopAll () {
    for (let k in this._sounds) {
      let s = this._sounds[k]
      if (s.playable) {
        s.stop()
      }
    }
  }

  reset () {
    this.stopAll()
    this._sounds = {}
  }

  shut () {
    this._sounds = {}
  }

  tick (t) {
  }

  load (name, path, loop) {
    this._sounds[name] = new Wad({ source: 'file://' + RCS.DIRS.cwd + '/sounds/' + path, loop: loop || false })
  }

  play (name, options = {}) {
    let s = this._sounds[name]
    if (s) {
      s.play(_.defaultsDeep({}, options, { env: { hold: 500 } }))
    }
  }

  stop (name) {
    let s = this._sounds[name]
    if (s) {
      s.stop()
    }
  }

  free (name) {
    delete this._sounds[name]
  }

  process_note (buffer, offset) {
    // note ( 0 = end, 1 = shape, 2 = pitch, 3 = volume, 4 = loop, 5 = detune, 6 = wait, 7 = label, 8 = envelop, 9 = filter, 10 = delay, 11 = vibrato, 12 = tremolo )

    let note = {
      source: 'sine',
    }

    let r

    let cmd = buffer.ldb(offset++)
    while (cmd !== 0) {
      switch (cmd) {
        case 1:  // shape
          let value = buffer.ldb(offset++)
          if (value === 1) {
            note.source = 'sine'
          }
          else if (value === 2) {
            note.source = 'square'
          }
          else if (value === 3) {
            note.source = 'triangle'
          }
          else if (value === 4) {
            note.source = 'sawtooth'
          }
          else if (value === 5) {
            note.source = buffer.lds(offset)
            offset += note.source.length + 1
          }
          break

        case 2:  // pitch
          note.pitch = buffer.lds(offset, 3)
          offset += 3
          break

        case 3:  // volume
          note.volume = buffer.ldb(offset) / 100
          offset++
          break

        case 4:  // loop
          note.loop = buffer.ldb(offset) === 1
          offset++
          break

        case 5:  // detune
          note.detune = buffer.ldb(offset) / 100
          offset++
          break

        case 6:  // wait
          note.wait = buffer.ldw(offset)
          offset += 2
          break

        case 7:  // label
          note.label = buffer.ldb(offset)
          offset++
          break

        case 8:  // envelop
          r = this.process_envelop(offset)
          note.env = r.envelop
          offset = r.offset
          break

        case 9:  // filter
          r = this.process_filter(offset)
          note.filter = r.filter
          offset = r.offset
          break

        case 10:  // delay
          r = this.process_delay(offset)
          note.delay = r.delay
          offset = r.offset
          break

        case 11:  // vibrato
          r = this.process_vibrato(offset)
          note.vibrato = r.vibrato
          offset = r.offset
          break

        case 12:  // tremolo
          r = this.process_tremolo(offset)
          note.tremolo = r.tremolo
          offset = r.offset
          break
      }

      cmd = buffer.ldb(offset++)
    }

    return { note, offset }
  }

  process_envelop (buffer, offset) {
    // ENVELOP ( 20 = sustain, 21 = hold, 22 = release, 23 = decay, 24 = attack )

    let envelop = {
    }

    let cmd = buffer.ldb(offset++)
    while (cmd !== 0) {
      switch (cmd) {
        case 20:  // sustain
          envelop.sustain = buffer.ldb(offset) / 100
          offset++
          break

        case 21:  // hold
          envelop.hold = buffer.ldw(offset)
          offset += 2
          break

        case 22:  // release
          envelop.release = buffer.ldw(offset)
          offset += 2
          break

        case 23:  // decay
          envelop.decay = buffer.ldw(offset)
          offset += 2
          break

        case 24:  // attack
          envelop.attack = buffer.ldw(offset)
          offset += 2
          break
      }

      cmd = buffer.ldb(offset++)
    }

    return { envelop, offset }
  }

  process_filter (buffer, offset) {
    // FILTER ( 30 = type (L H), 31 = freq, 32 = Q, 33 = envelop)

    let filter = {
    }

    let cmd = buffer.ldb(offset++)
    while (cmd !== 0) {
      switch (cmd) {
        case 30:  // type (L H)
          let value = buffer.ldb(offset)
          offset++
          if (value === 1) {
            filter.type = 'lowpass'
          }
          else if (value === 2) {
            filter.type = 'hipass'
          }
          break

        case 31:  // freq
          filter.freq = buffer.ldw(offset)
          offset += 2
          break

        case 32:  // Q
          filter.q = buffer.ldb(offset)
          offset++
          break

        case 33:  // envelop
          let r = this.process_envelop(offset)
          filter.env = r.envelop
          offset = r.offset
          break
      }

      cmd = buffer.ldb(offset++)
    }

    return { filter, offset }
  }

  process_reverb (buffer, offset) {

  }

  process_delay (buffer, offset) {
    // DELAY ( 40 = time, 41 = wet, 42 = feedback )

    let delay = {
    }

    let cmd = buffer.ldb(offset++)
    while (cmd !== 0) {
      switch (cmd) {
        case 40:  // time
          delay.time = buffer.ldw(offset)
          offset += 2
          break

        case 41:  // wet
          delay.freq = buffer.ldw(offset)
          offset += 2
          break

        case 42:  // feedback
          delay.feedback = buffer.ldw(offset)
          offset += 2
          break
      }

      cmd = buffer.ldb(offset++)
    }

    return { delay, offset }
  }

  process_vibrato (buffer, offset) {
    // VIBRATO ( 50 = shape, 51 = magnitude, 52 = speed, 53 = attack )

    let vibrato = {
    }

    let cmd = buffer.ldb(offset++)
    while (cmd !== 0) {
      switch (cmd) {
        case 50:  // time
          let value = buffer.ldb(offset)
          offset++
          if (value === 1) {
            vibrato.shape = 'sine'
          }
          else if (value === 2) {
            vibrato.shape = 'square'
          }
          else if (value === 3) {
            vibrato.shape = 'triangle'
          }
          else if (value === 4) {
            vibrato.shape = 'sawtooth'
          }
          break

        case 51:  // magnitude
          vibrato.magnitude = buffer.ldw(offset)
          offset += 2
          break

        case 52:  // speed
          vibrato.speed = buffer.ldw(offset)
          offset += 2
          break

        case 53:  // attack
          vibrato.attack = buffer.ldw(offset)
          offset += 2
          break
      }

      cmd = buffer.ldb(offset++)
    }

    return { vibrato, offset }
  }

  process_tremolo (buffer, offset) {
    // TREMOLO ( 60 = shape, 61 = magnitude, 62 = speed, 63 = attack )

    let tremolo = {
    }

    let cmd = buffer.ldb(offset++)
    while (cmd !== 0) {
      switch (cmd) {
        case 60:  // shape
          let value = buffer.ldb(offset)
          offset++
          if (value === 1) {
            tremolo.shape = 'sine'
          }
          else if (value === 2) {
            tremolo.shape = 'square'
          }
          else if (value === 3) {
            tremolo.shape = 'triangle'
          }
          else if (value === 4) {
            tremolo.shape = 'sawtooth'
          }
          break

        case 61:  // magnitude
          tremolo.magnitude = buffer.ldw(offset)
          offset += 2
          break

        case 62:  // speed
          tremolo.speed = buffer.ldw(offset)
          offset += 2
          break

        case 63:  // attack
          tremolo.attack = buffer.ldw(offset)
          offset += 2
          break
      }

      cmd = buffer.ldb(offset++)
    }

    return { tremolo, offset }
  }

  note (buffer, offset) {
    let { note } = this.process_note(buffer, offset)
    let id = _.uniqueId()
    this._sounds[id] = new Wad(note)
    return id
  }

  poly () {
    let id = _.uniqueId()
    this._sounds[id] = new Wad.Poly()
    return id
  }

  poly_add (poly_id, wad_id) {
    this._sounds[poly_id].add(this._sounds[wad_id])
  }

  poly_remove (poly_id, wad_id) {
    this._sounds[poly_id].remove(this._sounds[wad_id])
  }

}

module.exports = {
  Sound,
}
