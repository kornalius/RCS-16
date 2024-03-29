/**
 * @module app
 */

const { Emitter } = require('./mixins/common/events')
const { path } = require('./utils')

class Test extends Emitter {

  async start () {
    RCS.console = new RCS.TTY(await new RCS.Font('tiny').load())

    RCS.console.println('Welcome to RCS-16', 45)
    RCS.console.println('Copyright (c) 2018, ArianeSoft Inc.', 8)

    RCS.sound.load('boot', 'boot.wav')
    RCS.sound.load('boot2', 'boot2.wav')

    RCS.sound.play('boot', { volume: 0.15 })
    RCS.sound.play('boot2', { volume: 0.75 })

    // let m = RCS.memoryManager.alloc('i8', 13)
    // m.array.set([0x01, 0x01, 0x02, 'F', '3', 0x00, 0x03, 0x10, 0x08, 0x14, 0x30, 0x00, 0x00], 0)
    // let n = RCS.sound.note(m)
    // RCS.sound.play(n)

    let fn = await RCS.main.compile(undefined, path.join(RCS.DIRS.cwd, '/app', 'test.rcs'), true)
    fn()

    RCS.console.print('\n>')
    RCS.console.draw()

    new RCS.Readline(RCS.console)
      .start()
      .on('end', e => console.log(e.detail))
  }

}

module.exports = {
  Test,
}
