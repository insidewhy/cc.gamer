cc.module('cc.Timer').defines -> @set cc.Class.extend {
  # do not call.. use game.timer
  # length = time in seconds until expiry
  # now = current time in seconds (reference to game.now)
  init: (@_game, @_length = 0) ->
    @_expires = if @_length then @_game.now + @_length else 0
    return
  expiresIn: (@_length) -> @_expires = @_game.now + @_length ; this
  expired: -> @_game.now >= @_expires
  rearm: -> @expiresIn @_length
}
# vim:ts=2 sw=2
