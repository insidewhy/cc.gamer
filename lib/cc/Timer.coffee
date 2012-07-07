cc.module('cc.Timer').defines -> @set cc.Class.extend {
  # do not call.. use game.timer
  # duration = time in seconds until expiry
  init: (@_game, duration = 0) -> @expiresIn duration; return
  expiresIn: (@duration) -> @expires = @_game.now + @duration ; return
  expired: -> @_game.now >= @expires
  delta: -> @game.now - @expires
  reset: -> @expiresIn @duration ; return

  # set timer to expire at end of world
  pause: -> @expires = Number.MAX_VALUE ; return

  # schedule expiration for next duration
  unpause: ->
    @expires = Math.floor(@_game.now / @duration) * @duration + @duration
    return
}
# vim:ts=2 sw=2
