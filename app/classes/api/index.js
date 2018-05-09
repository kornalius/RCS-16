/**
 * @module classes/api
 */

const { Video } = require('./video')
const { Overlays } = require('./overlays')
const { Palette } = require('./palette')
const { Sprite } = require('./sprite')
const { Mouse } = require('./mouse')
const { Keyboard } = require('./keyboard')
const { Sound } = require('./sound')

const { TTY } = require('./tty')
const { Font } = require('./font')

RCS.Font = Font
RCS.TTY = TTY

RCS.video = new Video()
RCS.palette = new Palette()
RCS.sprite = new Sprite()
RCS.mouse = new Mouse(-1, 1, 1, 7, 10)
RCS.keyboard = new Keyboard()
RCS.overlays = new Overlays()
RCS.sound = new Sound()
