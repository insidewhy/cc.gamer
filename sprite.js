// Generated by CoffeeScript 1.3.3
(function() {
  var FriendEntity, Game, HeroEntity, ImpostorEntity, MyEntity, SPAWN_FRIENDS, SPAWN_IMPOSTORS, game, resources;

  resources = new cc.Resources;

  SPAWN_IMPOSTORS = 10;

  SPAWN_FRIENDS = 10;

  Game = cc.Game.extend({
    backgroundColor: [1.0, 0.72, 0.0, 1.0],
    gravity: {
      x: 0,
      y: 20
    },
    surfaceSheet: resources.spriteSheet('surfaces.png', 64, 64),
    _spawnImpostors: function() {
      var i;
      i = 0;
      while (true) {
        this.spawnEntity(ImpostorEntity, cc.rand(64, this.viewport.width - 64), cc.rand(64, this.viewport.height - 64));
        if (++i === SPAWN_IMPOSTORS) {
          break;
        }
      }
    },
    _spawnFriends: function() {
      var i;
      i = 0;
      while (true) {
        this.spawnEntity(FriendEntity, cc.rand(64, this.viewport.width - 64), cc.rand(64, this.viewport.height - 64));
        if (++i === SPAWN_FRIENDS) {
          break;
        }
      }
    },
    booted: function() {
      var h, w;
      this.input.fallthrough = true;
      this.input.bind(cc.key.z, 'left');
      this.input.bind(cc.key.z, 'left');
      this.input.bind(cc.key.left, 'left');
      this.input.bind(cc.key.c, 'right');
      this.input.bind(cc.key.right, 'right');
      this.input.bind(cc.key.x, 'jump');
      this.input.bind(cc.key.up, 'jump');
      this.input.bind(cc.key.i, 'spawn_impostors');
      this.input.bind(cc.key.f, 'spawn_friends');
      this.input.bind(cc.key.t, 'toggle_scale');
      this.input.bind(cc.key.r, 'reload');
      this.viewport.setWidth(this.width * 2);
      w = this.surfaceSheet.tileWidth;
      h = this.surfaceSheet.tileWidth;
      this.addSurface(this.surfaceSheet, 0, 0, this.height - w, this.viewport.width, w, 0.5);
      this.addSurface(this.surfaceSheet, 1, w * 5, this.height - (2 * h), this.viewport.width - (w * 10), h, 0.5);
      this.addSurface(this.surfaceSheet, 6, 0, 0, w, this.height - h, 0.5);
      this.addSurface(this.surfaceSheet, 6, this.viewport.width - w, 0, w, this.height - h, 0.5);
      this.hero = this.spawnEntity(HeroEntity, w + 30, 0);
      this._spawnImpostors();
      this._spawnFriends();
    },
    update: function() {
      if (this.input.pressed.reload) {
        document.location.reload(true);
      }
      if (this.input.pressed.toggle_scale) {
        this.setScale(this.scale === 2 ? 1 : 2);
      }
      if (this.input.pressed.spawn_friends) {
        this._spawnFriends();
      }
      if (this.input.pressed.spawn_impostors) {
        this._spawnImpostors();
      }
      return this.parent();
    }
  });

  game = new Game(resources, {
    scale: 1
  });

  MyEntity = cc.Entity.extend({
    maxV: {
      x: 200,
      y: 200
    },
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
    category: 1,
    density: 1,
    mask: 2,
    init: function(game, x, y, settings) {
      var _this = this;
      this.parent(game, x, y, settings);
      this.pos.y = 80;
      this.addSprite('walk', 0.1, [30, 31, 32, 31]);
      this.parent(game, x, y, settings);
      this.onStomp(function(entity) {
        if (_this.game.input.state.jump) {
          return _this.jump(_this.v.x, -300);
        } else {
          return _this.jump(_this.v.x, -170);
        }
      });
      return this.onHit(function(entity) {});
    },
    update: function() {
      this.game.viewport.scrollTo(this.pos.x - (160 / this.game.scale), this.pos.y - 64);
      this.parent();
      if (this.game.input.released.left || this.game.input.released.right) {
        this.setA(0, this.a.y);
      } else if (this.game.input.state.left) {
        this.setA(-1000, this.a.y);
      } else if (this.game.input.state.right) {
        this.setA(1000, this.a.y);
      }
      if (this.standing && this.game.input.pressed.jump) {
        this.jump(this.v.x, -300);
      }
    }
  });

  ImpostorEntity = MyEntity.extend({
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
