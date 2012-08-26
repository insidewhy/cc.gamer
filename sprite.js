// Generated by CoffeeScript 1.3.3
(function() {
  var FriendEntity, Game, HeroEntity, ImpostorEntity, MAX_FRIENDS, MAX_IMPOSTORS, MyEntity, game, resources;

  resources = new cc.Resources;

  MAX_IMPOSTORS = 20;

  MAX_FRIENDS = 5;

  Game = cc.Game.extend({
    backgroundColor: [1.0, 0.72, 0.0, 1.0],
    gravity: {
      x: 0,
      y: 20
    },
    surfaceSheet: resources.spriteSheet('surfaces.png', 64, 64),
    autopilot: false,
    booted: function() {
      var i;
      this.input.fallthrough = true;
      this.input.bind(cc.key.z, 'left');
      this.input.bind(cc.key.z, 'left');
      this.input.bind(cc.key.left, 'left');
      this.input.bind(cc.key.c, 'right');
      this.input.bind(cc.key.right, 'right');
      this.input.bind(cc.key.x, 'jump');
      this.input.bind(cc.key.up, 'jump');
      this.input.bind(cc.key.a, 'toggle_autopilot');
      this.input.bind(cc.key.t, 'toggle_scale');
      this.input.bind(cc.key.r, 'reload');
      this.viewport.setWidth(this.width * 2);
      this.addSurface(this.surfaceSheet, 0, 0, this.height - 64, this.viewport.width, 64);
      this.addSurface(this.surfaceSheet, 6, 0, 0, 64, this.height - 64, 0.7);
      this.addSurface(this.surfaceSheet, 6, this.viewport.width - 64, 0, 64, this.height - 64, 0.3);
      this.hero = this.spawnEntity(HeroEntity, 64, 0);
      i = 0;
      while (true) {
        this.spawnEntity(ImpostorEntity, cc.rand(64, this.viewport.width - 64), cc.rand(64, this.viewport.height - 64));
        if (++i === MAX_IMPOSTORS) {
          break;
        }
      }
      i = 0;
      while (true) {
        this.spawnEntity(FriendEntity, cc.rand(64, this.viewport.width - 64), cc.rand(64, this.viewport.height - 64));
        if (++i === MAX_FRIENDS) {
          break;
        }
      }
    },
    update: function() {
      if (this.input.pressed.reload) {
        document.location.reload(true);
      }
      if (this.input.pressed.toggle_scale) {
        this.setScale(this.scale === 2 ? 1 : 2);
      }
      if (this.input.pressed.toggle_autopilot) {
        this.autopilot = !this.autopilot;
      }
      return this.parent();
    }
  });

  game = new Game(resources, {
    scale: 1
  });

  MyEntity = cc.Entity.extend({
    spriteSheet: resources.spriteSheet('chars.png', 32, 48),
    hitbox: {
      width: 24,
      height: 42,
      offset: {
        y: 6
      }
    }
  });

  HeroEntity = MyEntity.extend({
    friction: 0,
    bounciness: 0,
    category: 1,
    density: 1,
    mask: 2,
    init: function(game, x, y, settings) {
      this.timer = game.timer(1);
      this.parent(game, x, y, settings);
      this.pos.y = 80;
      this.addSprite('walk', 0.1, [30, 31, 32, 31]);
      return this.parent(game, x, y, settings);
    },
    update: function() {
      var vY;
      if (this.pos.x > 160) {
        this.game.viewport.scrollTo(this.pos.x - 160, 0);
      }
      this.parent();
      if (this.game.input.released.toggle_autopilot) {
        this.setV(0, 0);
      }
      if (this.timer.expired()) {
        if (this.game.autopilot) {
          this.setV(cc.rand(-200, 200), cc.rand(-200, 100));
        }
        this.timer.reset();
      }
      vY = this.game.input.pressed.jump ? -300 : this.v.y;
      if (this.game.input.state.left) {
        this.setV(-200, vY);
      } else if (this.game.input.state.right) {
        this.setV(200, vY);
      } else if (vY) {
        this.setV(this.v.x, vY);
      }
    }
  });

  ImpostorEntity = MyEntity.extend({
    bounciness: 0.7,
    density: 0.2,
    category: 2,
    mask: 1,
    init: function(game, x, y, settings) {
      this.v.x = 20;
      this.parent(game, x, y, settings);
      return this.addSprite('walk', 0.1, [27, 28, 29, 28]);
    }
  });

  FriendEntity = MyEntity.extend({
    density: 0.2,
    category: 6,
    mask: 5,
    init: function(game, x, y, settings) {
      this.v.x = -20;
      this.parent(game, x, y, settings);
      return this.addSprite('walk', 0.1, [81, 82, 83, 82]);
    }
  });

  window.webGLStart = function() {
    var cons, now;
    cons = document.getElementById('console');
    cons.innerHTML = 0;
    now = new Date().getTime();
    setInterval(function() {
      var _now;
      _now = new Date().getTime();
      cons.innerHTML = (Math.floor(game.ticks / ((_now - now) / 1000))) + " : " + game.updates + " : " + game.skips;
      now = _now;
      return game.ticks = game.skips = game.updates = 0;
    }, 1000);
    return game.main("#game-canvas");
  };

}).call(this);
