/**
 * @module app
 */

const { Emitter } = require('./mixins/common/events')

class Test extends Emitter {

  start () {
    let font = new RCS.Font('tiny')
    font.on('loaded', () => {
      RCS.console = new RCS.TTY(font)

      RCS.console.println('Welcome to RCS-16', 45)
      RCS.console.print('Copyright (c) 2018, ArianeSoft Inc.', 8)

      RCS.console.draw()
    })
  }

}

module.exports = {
  Test,
}
