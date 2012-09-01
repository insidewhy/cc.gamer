# A timer synced to the game clock. SyncTimers with the same
# duration will always expire on the same frame. The offset
# attribute can be used to stagger it against other SyncTimers.
# After "resetting" the SyncTimer after a pause, the SyncTimer may
# fire on the very next frame if it corresponds with the SyncTimer's
# duration.
cc.module('cc.SyncTimer').defines -> @set cc.Class.extend {
  # do not call.. use game.syncTimer
  # duration = time in seconds until expiry
  # offset   = offset duration against world time, defaults to 0
  init: (@_game, @duration = 0, @offset = 0) ->
    if @duration then @reset() else @pause()
    return

  expired: -> @_game.now >= @expires
  delta: -> @_game.now - @expires
  setDuration: (@duration) -> @reset() ; return

  # set timer to expire at end of world
  pause: -> @expires = Number.MAX_VALUE ; return

  # duration is synched to the game world when reset
  reset: ->
    @expires = Math.floor((@_game.now / @duration) - @offset) *
               @duration + @duration + @offset
    return
}
# vim:ts=2 sw=2
