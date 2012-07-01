cc.module('cc.Sprite').defines -> @set cc.Class.extend {
  frames: null
  timer: null
  frame: 0   # current tile index
  tile: null # tile at current frame index

  # not to be called externally!! only from Entity.addSprite
  init: (@sheet, @frameLength, _frames) ->
    nCols = @sheet.imgWidth() / @sheet.tileWidth
    @frames = []
    for frame in _frames
      @frames.push vec2.createFrom(frame % nCols, Math.floor(frame / nCols))
    @tile = @frames[0]

  update: ->
    if @timer.expired()
      do @timer.reset
      @frame = 0 if ++@frame is @frames.length
      @tile = @frames[@frame]
    return

  rewind: ->
    @frame = 0
    this
}
# vim:ts=2 sw=2
