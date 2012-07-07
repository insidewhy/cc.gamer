cc.module('cc.Timer').defines -> @set cc.Class.extend {
  # TODO: offset
  # do not call.. use game.timer
  # duration = time in seconds until expiry
  init: (@_game, @duration = 0) ->
    if @duration then do @reset else do @pause
    return

  expired: -> @_game.now >= @expires
  delta: -> @game.now - @expires
  setDuration: (@duration) -> do @reset ; return

  # set timer to expire at end of world
  pause: -> @expires = Number.MAX_VALUE ; return

  # duration is synched to the game world when reset
  reset: ->
    @expires = Math.floor(@_game.now / @duration) * @duration + @duration
    return
}
# vim:ts=2 sw=2
