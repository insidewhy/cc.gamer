cc.module('cc.Input').defines ->
  key = cc.key = {
    backspace:    8
    tab:          9
    enter:        13
    shift:        16
    ctrl:         17
    alt:          18
    pause:        19
    break:        19
    space:        32
    pageup:       33
    pagedown:     34
    end:          35
    home:         36
    left:         37
    up:           38
    right:        39
    down:         40
    insert:       45
    delete:       46
    multiply:     106
    add:          107
    substract:    109
    divide:       111
    f11:          122
    f12:          123
    fullstop:     190
    period:       190
    forwardslash: 191
    backslash:    220
  }

  for i in ['A'.charCodeAt(0) .. 'Z'.charCodeAt(0)]
    char = String.fromCharCode i
    key[char.toLowerCase()] = i

  for i in [0..9]
    idx = '0'.charCodeAt(0) + i
    char = i.toString()
    key[char] = idx
    key['n' + char] = idx
    key['numpad' + char] = i + 96
    key['f' + char] = i + 112

  @set cc.Class.extend {
    state:     {} # currently pressed
    pressed:   {} # pressed on last frame
    released:  {} # released on last frame
    _bindings: {}

    enable: ->
      window.addEventListener('keydown', (e) => @press e, false)
      window.addEventListener('keyup', (e) => @release e, false)
      return

    press: (e) ->
      code = e.keyCode
      bind = @_bindings[code]
      if bind
        @pressed[bind] = code
        @state[bind]   = code
      do e.stopPropagation
      do e.preventDefault
      return

    release: (e) ->
      code = e.keyCode
      bind = @_bindings[code]
      if bind
        delete @pressed[bind]
        delete @state[bind]
        @released[bind] = code
      return

    # call from game loop during update to update pressed/released
    update: ->
      @released = {}
      @pressed = {}

    bind: (key, state) ->
      @_bindings[key] = state
  }

# vim:ts=2 sw=2
