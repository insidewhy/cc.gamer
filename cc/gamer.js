(function() {
  var CC, Module, Self, cc,
    __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

  Self = (function() {

    function Self(ccModName) {
      this.__cc = {
        modName: ccModName
      };
    }

    Self.prototype._getName = function(name) {
      return "" + this.__cc.modName + "." + name;
    };

    Self.prototype.jClass = function(name, val) {
      if (val) {
        cc.jClass(this._getName(name), val);
      } else {
        cc.jClass(this.__cc.modName, name);
      }
      return this;
    };

    Self.prototype.set = function(name, val) {
      if (typeof val !== 'undefined') {
        cc.set(this._getName(name), val);
      } else {
        cc.set(this.__cc.modName, name);
      }
      return this;
    };

    return Self;

  })();

  Module = (function() {

    function Module(name) {
      this.name = name;
      this.status = 'loading';
      this.onloads = [];
      this.deps = [];
    }

    Module.prototype.requires = function() {
      var lib, libs, _i, _len;
      libs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      for (_i = 0, _len = libs.length; _i < _len; _i++) {
        lib = libs[_i];
        this.deps.push(lib);
      }
      return this;
    };

    Module.prototype.parent = function(lib) {
      this._parent = lib;
      this.deps.push(lib);
      return this;
    };

    Module.prototype.pushOnload = function(callback) {
      this.onloads.push(callback);
      return this;
    };

    Module.prototype.jClass = function(classContent) {
      var _this = this;
      this.defines(function() {
        var parent;
        if (_this._parent) {
          parent = cc.get(_this._parent);
          if (!parent) {
            throw "parent " + _this._parent + " does not exist";
          } else if (parent.extend) {
            cc.set(_this.name, parent.extend(classContent));
            return;
          } else {
            classContent.isa = parent;
          }
        }
        return cc.jClass(_this.name, classContent);
      });
      return this;
    };

    Module.prototype.set = function(val) {
      var _this = this;
      this.defines(function() {
        return cc.set(_this.name, val);
      });
      return this;
    };

    Module.prototype.defines = function(defineCallback) {
      var dep, onLoad, toLoad, _i, _len, _ref,
        _this = this;
      this.defineCallback = defineCallback;
      if (!this.deps.length) {
        this._define();
      } else {
        toLoad = this.deps.length;
        onLoad = function(errMod) {
          if (errMod) {
            alert("" + _this.name + ": error loading dependency " + errMod);
            if (_this.script && _this.script.onerror && _this.status !== 'failed') {
              return _this.script.onerror();
            }
          } else if (0 === --toLoad) {
            return _this._define();
          }
        };
        _ref = this.deps;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dep = _ref[_i];
          cc.require(dep, onLoad);
        }
      }
      return this;
    };

    Module.prototype.empty = function() {
      var onload, _i, _len, _ref;
      _ref = this.onloads;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        onload = _ref[_i];
        onload();
      }
      delete this.onloads;
      this.status = 'defined';
    };

    Module.prototype._define = function() {
      var hasKey, onload, self, _i, _len, _ref,
        _this = this;
      this.status = 'loaded';
      self = new Self(this.name);
      try {
        this.defineCallback.call(self);
      } catch (e) {
        this.status = 'failed';
        alert("" + this.name + ".defines failed: " + e.message);
        _ref = this.onloads;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          onload = _ref[_i];
          onload(this.name);
        }
      }
      hasKey = function() {
        var key;
        for (key in self) {
          if (!__hasProp.call(self, key)) continue;
          if (key !== '__cc') {
            return true;
          }
        }
        return false;
      };
      if (hasKey()) {
        cc.set(this.name, self);
      }
      return this.empty();
    };

    return Module;

  })();

  CC = (function() {

    function CC() {
      var re;
      this.firefoxVersion = -1 !== navigator.userAgent.indexOf("Firefox");
      this.ieVersion = navigator.appName === 'Microsoft Internet Explorer' ? (re = /MSIE ([0-9]{1,}[\.0-9]{0,})/, re.exec(navigator.userAgent) ? parseFloat(RegExp.$1) : 0) : 0;
      this.libpath = 'lib';
      this.modules = {};
      this.global = window ? window : GLOBAL;
      this.head = document.getElementsByTagName('head')[0];
      this.ieScriptPollTimeout = 5000;
    }

    CC.prototype.module = function(name) {
      var mod;
      mod = this.modules[name];
      if (mod) {
        return mod;
      } else {
        return cc.modules[name] = new Module(name);
      }
    };

    CC.prototype.namespaceFor = function(ns) {
      var components, current, obj, space, _i, _len, _ref;
      obj = this.global;
      components = ns.split('.');
      _ref = components.slice(0, components.length - 1);
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        space = _ref[_i];
        current = obj[space];
        if (!current) {
          obj = obj[space] = {};
        } else if (typeof current === 'object') {
          obj = current;
        } else {
          alert("namespace conflict, " + ns + " = " + current + " of " + (typeof current));
        }
      }
      return [obj, components[components.length - 1]];
    };

    CC.prototype.set = function(ns, val) {
      var current, key, lastComp, obj, subval, _ref;
      _ref = this.namespaceFor(ns), obj = _ref[0], lastComp = _ref[1];
      current = obj[lastComp];
      if (current) {
        if (typeof current === 'object' && typeof val === 'object') {
          for (key in val) {
            if (!__hasProp.call(val, key)) continue;
            subval = val[key];
            current[key] = subval;
          }
        } else {
          alert("namespace conflict, " + ns + " = " + current + " of " + (typeof current));
        }
      } else {
        obj[lastComp] = val;
      }
      return this;
    };

    CC.prototype.get = function(id) {
      var modId, ret, _i, _len, _ref;
      ret = this.global;
      _ref = id.split('.');
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        modId = _ref[_i];
        try {
          ret = ret[modId];
        } catch (e) {
          throw "cc.get accessing " + id + " at " + modId;
        }
      }
      return ret;
    };

    CC.prototype.jClass = function(ns, clss) {
      if (!(typeof Class !== "undefined" && Class !== null)) {
        throw 'please install Joose to use cc.jClass';
      }
      this.namespaceFor(ns);
      Class(ns, clss);
      return this;
    };

    CC.prototype.scriptOnload = function(script, onload) {
      if (script.readyState) {
        script.onreadystatechange = function() {
          switch (script.readyState) {
            case "loaded":
            case "complete":
              onload();
              return script.onreadystatechange = null;
          }
        };
      } else {
        script.onload = onload;
      }
      return this;
    };

    CC.prototype.loadScript = function(path, onload, onerror) {
      var loaded, script, _ref;
      script = document.createElement('script');
      script.type = 'text/javascript';
      if ('file:' === ((_ref = document.location) != null ? _ref.protocol : void 0) && this.firefoxVersion) {
        loaded = false;
        this.scriptOnload(script, function() {
          loaded = true;
          if (onload) {
            return onload();
          }
        });
        setTimeout(function() {
          if (!loaded) {
            return onerror();
          }
        }, 2000);
      } else {
        if (!this.ieVersion ? onload : void 0) {
          this.scriptOnload(script, onload);
        }
        if (onerror) {
          script.onerror = onerror;
        }
      }
      script.src = path;
      this.head.appendChild(script);
      return script;
    };

    CC.prototype.require = function(name, callback) {
      var loadingModules, mod, path,
        _this = this;
      mod = this.modules[name];
      if (mod) {
        if (callback) {
          if ('failed' === mod.status) {
            callback(name);
          } else if ('defined' !== mod.status) {
            mod.pushOnload(callback);
          } else {
            callback();
          }
        }
        return this;
      }
      mod = this.modules[name] = new Module(name);
      if (callback) {
        mod.pushOnload(callback);
      }
      path = this.libpath + '/' + name.replace(/\./g, '/') + '.js';
      mod.script = this.loadScript(path, null, function() {
        if ('failed' === mod.status) {
          return;
        }
        mod.status = 'failed';
        if (callback) {
          return callback(name);
        } else {
          return alert("error requiring " + name);
        }
      });
      if (this.ieVersion && !this._pollingForStupidIE) {
        loadingModules = [];
        this._pollingForStupidIE = setInterval(function() {
          var key, _i, _len, _ref;
          for (_i = 0, _len = loadingModules.length; _i < _len; _i++) {
            mod = loadingModules[_i];
            if ('loading' === mod.status) {
              mod.script.onerror();
            }
          }
          loadingModules.length = 0;
          _ref = _this.modules;
          for (key in _ref) {
            if (!__hasProp.call(_ref, key)) continue;
            mod = _ref[key];
            if (mod.script && mod.status === 'loading') {
              loadingModules.push(mod);
            }
          }
          if (!loadingModules.length) {
            clearInterval(_this._pollingForStupidIE);
            delete _this._pollingForStupidIE;
          }
        }, this.ieScriptPollTimeout);
      }
      return this;
    };

    return CC;

  })();

  cc = new CC;

  cc.global.cc = cc;

}).call(this);
(function() {

  cc.module('cc.extend').defines(function() {
    var fnTest, initing;
    initing = false;
    fnTest = /kit/.test(function() {
      return kit;
    }) ? /\bparent\b/ : /.*/;
    cc.avoidCloning = function(val) {
      return !val || !(val instanceof Object) || val instanceof cc.Class || val instanceof HTMLElement;
    };
    cc.clone = function(obj) {
      if (cc.avoidCloning(obj)) {
        return obj;
      } else {
        return cc.cloneCloneable(obj);
      }
    };
    cc.cloneCloneable = function(obj) {
      var i, k, retObj, v, val, _i, _len;
      if (obj instanceof Array) {
        retObj = [];
        retObj.length = obj.length;
        for (i = _i = 0, _len = obj.length; _i < _len; i = ++_i) {
          val = obj[i];
          retObj[i] = cc.clone(val);
        }
        return retObj;
      } else {
        retObj = {};
        for (k in obj) {
          v = obj[k];
          retObj[k] = cc.clone(v);
        }
        return retObj;
      }
    };
    cc.extend = function(parent, members) {
      var attr, attrName, attributes, member, name, prntAttr, prntName, prntProto, proto, _ref;
      prntProto = parent.prototype;
      initing = true;
      proto = new parent;
      initing = false;
      attributes = {};
      if (parent.attributes) {
        _ref = parent.attributes;
        for (prntName in _ref) {
          prntAttr = _ref[prntName];
          attributes[prntName] = prntAttr;
        }
      }
      proto.__super = {};
      for (name in members) {
        member = members[name];
        if (typeof member === "function") {
          proto.__super[name] = (function(name, member) {
            return function() {
              return prntProto[name].apply(this.__this, arguments);
            };
          })(name, member);
          proto[name] = typeof prntProto[name] === "function" && fnTest.test(member) ? (function(name, member) {
            return function() {
              var ret, tmp;
              tmp = this.parent;
              this.parent = prntProto[name];
              ret = member.apply(this, arguments);
              this.parent = tmp;
              return ret;
            };
          })(name, member) : member;
        } else if (cc.avoidCloning(member)) {
          proto[name] = member;
        } else {
          attributes[name] = member;
        }
      }
      function ChildClass() {;

      if (initing) {
        return;
      }
      this.__super.__this = this;
      for (attrName in attributes) {
        attr = attributes[attrName];
        this[attrName] = cc.cloneCloneable(attr);
      }
      if (this.init) {
        this.init.apply(this, arguments);
      }
      };

      ChildClass.prototype = proto;
      ChildClass.attributes = attributes;
      ChildClass.constructor = ChildClass;
      ChildClass.extend = function(members) {
        return cc.extend(ChildClass, members);
      };
      ChildClass.inject = function(members) {
        return cc.inject(ChildClass, members);
      };
      return ChildClass;
    };
    return cc.inject = function(clss, members) {
      var backup, member, name, proto;
      proto = clss.prototype;
      for (name in members) {
        member = members[name];
        if (typeof member === "function" && typeof proto[name] === "function" && fnTest.test(member)) {
          backup = proto[name];
          proto[name] = function() {
            var ret, tmp;
            tmp = this.parent;
            this.parent = backup;
            ret = member.apply(this, arguments);
            this.parent = tmp;
            return ret;
          };
        } else {
          proto[name] = member;
        }
      }
      return clss;
    };
  });

  cc.module('cc.Class').defines(function() {
    this.set(cc.extend(Function, {}));
  });

}).call(this);
/**
 * @fileoverview gl-matrix - High performance matrix and vector operations for WebGL
 * @author Brandon Jones
 * @author Colin MacKenzie IV
 * @version 1.3.7
 */

/*
 * Copyright (c) 2012 Brandon Jones, Colin MacKenzie IV
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

// Updated to use a modification of the "returnExportsGlobal" pattern from https://github.com/umdjs/umd

(function (root, factory) {
    if (typeof exports === 'object') {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like enviroments that support module.exports,
        // like Node.
        module.exports = factory(global);
    } else if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define([], function () {
            return factory(root);
        });
    } else {
        // Browser globals
        factory(root);
    }
}(this, function (root) {
    "use strict";

    // Tweak to your liking
    var FLOAT_EPSILON = 0.000001;

    var glMath = {};
    (function() {
        if (typeof(Float32Array) != 'undefined') {
            var y = new Float32Array(1);
            var i = new Int32Array(y.buffer);

            /**
             * Fast way to calculate the inverse square root,
             * see http://jsperf.com/inverse-square-root/5
             *
             * If typed arrays are not available, a slower
             * implementation will be used.
             *
             * @param {Number} number the number
             * @returns {Number} Inverse square root
             */
            glMath.invsqrt = function(number) {
              var x2 = number * 0.5;
              y[0] = number;
              var threehalfs = 1.5;

              i[0] = 0x5f3759df - (i[0] >> 1);

              var number2 = y[0];

              return number2 * (threehalfs - (x2 * number2 * number2));
            };
        } else {
            glMath.invsqrt = function(number) { return 1.0 / Math.sqrt(number); };
        }
    })();

    /**
     * @class System-specific optimal array type
     * @name MatrixArray
     */
    var MatrixArray = null;
    
    // explicitly sets and returns the type of array to use within glMatrix
    function setMatrixArrayType(type) {
        MatrixArray = type;
        return MatrixArray;
    }

    // auto-detects and returns the best type of array to use within glMatrix, falling
    // back to Array if typed arrays are unsupported
    function determineMatrixArrayType() {
        MatrixArray = (typeof Float32Array !== 'undefined') ? Float32Array : Array;
        return MatrixArray;
    }
    
    determineMatrixArrayType();

    /**
     * @class 3 Dimensional Vector
     * @name vec3
     */
    var vec3 = {};
     
    /**
     * Creates a new instance of a vec3 using the default array type
     * Any javascript array-like objects containing at least 3 numeric elements can serve as a vec3
     *
     * @param {vec3} [vec] vec3 containing values to initialize with
     *
     * @returns {vec3} New vec3
     */
    vec3.create = function (vec) {
        var dest = new MatrixArray(3);

        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
            dest[2] = vec[2];
        } else {
            dest[0] = dest[1] = dest[2] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a vec3, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value

     * @returns {vec3} New vec3
     */
    vec3.createFrom = function (x, y, z) {
        var dest = new MatrixArray(3);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;

        return dest;
    };

    /**
     * Copies the values of one vec3 to another
     *
     * @param {vec3} vec vec3 containing values to copy
     * @param {vec3} dest vec3 receiving copied values
     *
     * @returns {vec3} dest
     */
    vec3.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        dest[2] = vec[2];

        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec3} a First vector
     * @param {vec3} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec3.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON
        );
    };

    /**
     * Performs a vector addition
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.add = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] += vec2[0];
            vec[1] += vec2[1];
            vec[2] += vec2[2];
            return vec;
        }

        dest[0] = vec[0] + vec2[0];
        dest[1] = vec[1] + vec2[1];
        dest[2] = vec[2] + vec2[2];
        return dest;
    };

    /**
     * Performs a vector subtraction
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.subtract = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] -= vec2[0];
            vec[1] -= vec2[1];
            vec[2] -= vec2[2];
            return vec;
        }

        dest[0] = vec[0] - vec2[0];
        dest[1] = vec[1] - vec2[1];
        dest[2] = vec[2] - vec2[2];
        return dest;
    };

    /**
     * Performs a vector multiplication
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.multiply = function (vec, vec2, dest) {
        if (!dest || vec === dest) {
            vec[0] *= vec2[0];
            vec[1] *= vec2[1];
            vec[2] *= vec2[2];
            return vec;
        }

        dest[0] = vec[0] * vec2[0];
        dest[1] = vec[1] * vec2[1];
        dest[2] = vec[2] * vec2[2];
        return dest;
    };

    /**
     * Negates the components of a vec3
     *
     * @param {vec3} vec vec3 to negate
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.negate = function (vec, dest) {
        if (!dest) { dest = vec; }

        dest[0] = -vec[0];
        dest[1] = -vec[1];
        dest[2] = -vec[2];
        return dest;
    };

    /**
     * Multiplies the components of a vec3 by a scalar value
     *
     * @param {vec3} vec vec3 to scale
     * @param {number} val Value to scale by
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.scale = function (vec, val, dest) {
        if (!dest || vec === dest) {
            vec[0] *= val;
            vec[1] *= val;
            vec[2] *= val;
            return vec;
        }

        dest[0] = vec[0] * val;
        dest[1] = vec[1] * val;
        dest[2] = vec[2] * val;
        return dest;
    };

    /**
     * Generates a unit vector of the same direction as the provided vec3
     * If vector length is 0, returns [0, 0, 0]
     *
     * @param {vec3} vec vec3 to normalize
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.normalize = function (vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            len = Math.sqrt(x * x + y * y + z * z);

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        } else if (len === 1) {
            dest[0] = x;
            dest[1] = y;
            dest[2] = z;
            return dest;
        }

        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        return dest;
    };

    /**
     * Generates the cross product of two vec3s
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.cross = function (vec, vec2, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            x2 = vec2[0], y2 = vec2[1], z2 = vec2[2];

        dest[0] = y * z2 - z * y2;
        dest[1] = z * x2 - x * z2;
        dest[2] = x * y2 - y * x2;
        return dest;
    };

    /**
     * Caclulates the length of a vec3
     *
     * @param {vec3} vec vec3 to calculate length of
     *
     * @returns {number} Length of vec
     */
    vec3.length = function (vec) {
        var x = vec[0], y = vec[1], z = vec[2];
        return Math.sqrt(x * x + y * y + z * z);
    };

    /**
     * Caclulates the squared length of a vec3
     *
     * @param {vec3} vec vec3 to calculate squared length of
     *
     * @returns {number} Squared Length of vec
     */
    vec3.squaredLength = function (vec) {
        var x = vec[0], y = vec[1], z = vec[2];
        return x * x + y * y + z * z;
    };

    /**
     * Caclulates the dot product of two vec3s
     *
     * @param {vec3} vec First operand
     * @param {vec3} vec2 Second operand
     *
     * @returns {number} Dot product of vec and vec2
     */
    vec3.dot = function (vec, vec2) {
        return vec[0] * vec2[0] + vec[1] * vec2[1] + vec[2] * vec2[2];
    };

    /**
     * Generates a unit vector pointing from one vector to another
     *
     * @param {vec3} vec Origin vec3
     * @param {vec3} vec2 vec3 to point to
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.direction = function (vec, vec2, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0] - vec2[0],
            y = vec[1] - vec2[1],
            z = vec[2] - vec2[2],
            len = Math.sqrt(x * x + y * y + z * z);

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        }

        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        return dest;
    };

    /**
     * Performs a linear interpolation between two vec3
     *
     * @param {vec3} vec First vector
     * @param {vec3} vec2 Second vector
     * @param {number} lerp Interpolation amount between the two inputs
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.lerp = function (vec, vec2, lerp, dest) {
        if (!dest) { dest = vec; }

        dest[0] = vec[0] + lerp * (vec2[0] - vec[0]);
        dest[1] = vec[1] + lerp * (vec2[1] - vec[1]);
        dest[2] = vec[2] + lerp * (vec2[2] - vec[2]);

        return dest;
    };

    /**
     * Calculates the euclidian distance between two vec3
     *
     * Params:
     * @param {vec3} vec First vector
     * @param {vec3} vec2 Second vector
     *
     * @returns {number} Distance between vec and vec2
     */
    vec3.dist = function (vec, vec2) {
        var x = vec2[0] - vec[0],
            y = vec2[1] - vec[1],
            z = vec2[2] - vec[2];
            
        return Math.sqrt(x*x + y*y + z*z);
    };

    // Pre-allocated to prevent unecessary garbage collection
    var unprojectMat = null;
    var unprojectVec = new MatrixArray(4);
    /**
     * Projects the specified vec3 from screen space into object space
     * Based on the <a href="http://webcvs.freedesktop.org/mesa/Mesa/src/glu/mesa/project.c?revision=1.4&view=markup">Mesa gluUnProject implementation</a>
     *
     * @param {vec3} vec Screen-space vector to project
     * @param {mat4} view View matrix
     * @param {mat4} proj Projection matrix
     * @param {vec4} viewport Viewport as given to gl.viewport [x, y, width, height]
     * @param {vec3} [dest] vec3 receiving unprojected result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    vec3.unproject = function (vec, view, proj, viewport, dest) {
        if (!dest) { dest = vec; }

        if(!unprojectMat) {
            unprojectMat = mat4.create();
        }

        var m = unprojectMat;
        var v = unprojectVec;
        
        v[0] = (vec[0] - viewport[0]) * 2.0 / viewport[2] - 1.0;
        v[1] = (vec[1] - viewport[1]) * 2.0 / viewport[3] - 1.0;
        v[2] = 2.0 * vec[2] - 1.0;
        v[3] = 1.0;
        
        mat4.multiply(proj, view, m);
        if(!mat4.inverse(m)) { return null; }
        
        mat4.multiplyVec4(m, v);
        if(v[3] === 0.0) { return null; }

        dest[0] = v[0] / v[3];
        dest[1] = v[1] / v[3];
        dest[2] = v[2] / v[3];
        
        return dest;
    };

    var xUnitVec3 = vec3.createFrom(1,0,0);
    var yUnitVec3 = vec3.createFrom(0,1,0);
    var zUnitVec3 = vec3.createFrom(0,0,1);

    var tmpvec3 = vec3.create();
    /**
     * Generates a quaternion of rotation between two given normalized vectors
     *
     * @param {vec3} a Normalized source vector
     * @param {vec3} b Normalized target vector
     * @param {quat4} [dest] quat4 receiving operation result.
     *
     * @returns {quat4} dest if specified, a new quat4 otherwise
     */
    vec3.rotationTo = function (a, b, dest) {
        if (!dest) { dest = quat4.create(); }
        
        var d = vec3.dot(a, b);
        var axis = tmpvec3;
        if (d >= 1.0) {
            quat4.set(identityQuat4, dest);
        } else if (d < (0.000001 - 1.0)) {
            vec3.cross(xUnitVec3, a, axis);
            if (vec3.length(axis) < 0.000001)
                vec3.cross(yUnitVec3, a, axis);
            if (vec3.length(axis) < 0.000001)
                vec3.cross(zUnitVec3, a, axis);
            vec3.normalize(axis);
            quat4.fromAngleAxis(Math.PI, axis, dest);
        } else {
            var s = Math.sqrt((1.0 + d) * 2.0);
            var sInv = 1.0 / s;
            vec3.cross(a, b, axis);
            dest[0] = axis[0] * sInv;
            dest[1] = axis[1] * sInv;
            dest[2] = axis[2] * sInv;
            dest[3] = s * 0.5;
            quat4.normalize(dest);
        }
        if (dest[3] > 1.0) dest[3] = 1.0;
        else if (dest[3] < -1.0) dest[3] = -1.0;
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec3} vec Vector to represent as a string
     *
     * @returns {string} String representation of vec
     */
    vec3.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ']';
    };

    /**
     * @class 3x3 Matrix
     * @name mat3
     */
    var mat3 = {};

    /**
     * Creates a new instance of a mat3 using the default array type
     * Any javascript array-like object containing at least 9 numeric elements can serve as a mat3
     *
     * @param {mat3} [mat] mat3 containing values to initialize with
     *
     * @returns {mat3} New mat3
     */
    mat3.create = function (mat) {
        var dest = new MatrixArray(9);

        if (mat) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
        } else {
            dest[0] = dest[1] =
            dest[2] = dest[3] =
            dest[4] = dest[5] =
            dest[6] = dest[7] =
            dest[8] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a mat3, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m02
     * @param {number} m10
     * @param {number} m11
     * @param {number} m12
     * @param {number} m20
     * @param {number} m21
     * @param {number} m22

     * @returns {mat3} New mat3
     */
    mat3.createFrom = function (m00, m01, m02, m10, m11, m12, m20, m21, m22) {
        var dest = new MatrixArray(9);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m02;
        dest[3] = m10;
        dest[4] = m11;
        dest[5] = m12;
        dest[6] = m20;
        dest[7] = m21;
        dest[8] = m22;

        return dest;
    };

    /**
     * Calculates the determinant of a mat3
     *
     * @param {mat3} mat mat3 to calculate determinant of
     *
     * @returns {Number} determinant of mat
     */
    mat3.determinant = function (mat) {
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8];

        return a00 * (a22 * a11 - a12 * a21) + a01 * (-a22 * a10 + a12 * a20) + a02 * (a21 * a10 - a11 * a20);
    };

    /**
     * Calculates the inverse matrix of a mat3
     *
     * @param {mat3} mat mat3 to calculate inverse of
     * @param {mat3} [dest] mat3 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat3} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat3.inverse = function (mat, dest) {
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8],

            b01 = a22 * a11 - a12 * a21,
            b11 = -a22 * a10 + a12 * a20,
            b21 = a21 * a10 - a11 * a20,

            d = a00 * b01 + a01 * b11 + a02 * b21,
            id;

        if (!d) { return null; }
        id = 1 / d;

        if (!dest) { dest = mat3.create(); }

        dest[0] = b01 * id;
        dest[1] = (-a22 * a01 + a02 * a21) * id;
        dest[2] = (a12 * a01 - a02 * a11) * id;
        dest[3] = b11 * id;
        dest[4] = (a22 * a00 - a02 * a20) * id;
        dest[5] = (-a12 * a00 + a02 * a10) * id;
        dest[6] = b21 * id;
        dest[7] = (-a21 * a00 + a01 * a20) * id;
        dest[8] = (a11 * a00 - a01 * a10) * id;
        return dest;
    };
    
    /**
     * Performs a matrix multiplication
     *
     * @param {mat3} mat First operand
     * @param {mat3} mat2 Second operand
     * @param {mat3} [dest] mat3 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat3} dest if specified, mat otherwise
     */
    mat3.multiply = function (mat, mat2, dest) {
        if (!dest) { dest = mat; }
        

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[3], a11 = mat[4], a12 = mat[5],
            a20 = mat[6], a21 = mat[7], a22 = mat[8],

            b00 = mat2[0], b01 = mat2[1], b02 = mat2[2],
            b10 = mat2[3], b11 = mat2[4], b12 = mat2[5],
            b20 = mat2[6], b21 = mat2[7], b22 = mat2[8];

        dest[0] = b00 * a00 + b01 * a10 + b02 * a20;
        dest[1] = b00 * a01 + b01 * a11 + b02 * a21;
        dest[2] = b00 * a02 + b01 * a12 + b02 * a22;

        dest[3] = b10 * a00 + b11 * a10 + b12 * a20;
        dest[4] = b10 * a01 + b11 * a11 + b12 * a21;
        dest[5] = b10 * a02 + b11 * a12 + b12 * a22;

        dest[6] = b20 * a00 + b21 * a10 + b22 * a20;
        dest[7] = b20 * a01 + b21 * a11 + b22 * a21;
        dest[8] = b20 * a02 + b21 * a12 + b22 * a22;

        return dest;
    };

    /**
     * Transforms the vec2 according to the given mat3.
     *
     * @param {mat3} matrix mat3 to multiply against
     * @param {vec2} vec    the vector to multiply
     * @param {vec2} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec2} The multiplication result
     **/
    mat3.multiplyVec2 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1];
      dest[0] = x * matrix[0] + y * matrix[3] + matrix[6];
      dest[1] = x * matrix[1] + y * matrix[4] + matrix[7];
      return dest;
    };

    /**
     * Transforms the vec3 according to the given mat3
     *
     * @param {mat3} matrix mat3 to multiply against
     * @param {vec3} vec    the vector to multiply
     * @param {vec3} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec3} The multiplication result
     **/
    mat3.multiplyVec3 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1], z = vec[2];
      dest[0] = x * matrix[0] + y * matrix[3] + z * matrix[6];
      dest[1] = x * matrix[1] + y * matrix[4] + z * matrix[7];
      dest[2] = x * matrix[2] + y * matrix[5] + z * matrix[8];
      
      return dest;
    };

    /**
     * Copies the values of one mat3 to another
     *
     * @param {mat3} mat mat3 containing values to copy
     * @param {mat3} dest mat3 receiving copied values
     *
     * @returns {mat3} dest
     */
    mat3.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat3} a First matrix
     * @param {mat3} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat3.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
            Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
            Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
            Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
            Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
            Math.abs(a[8] - b[8]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat3 to an identity matrix
     *
     * @param {mat3} dest mat3 to set
     *
     * @returns dest if specified, otherwise a new mat3
     */
    mat3.identity = function (dest) {
        if (!dest) { dest = mat3.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 1;
        dest[5] = 0;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 1;
        return dest;
    };

    /**
     * Transposes a mat3 (flips the values over the diagonal)
     *
     * Params:
     * @param {mat3} mat mat3 to transpose
     * @param {mat3} [dest] mat3 receiving transposed values. If not specified result is written to mat
     *
     * @returns {mat3} dest is specified, mat otherwise
     */
    mat3.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a01 = mat[1], a02 = mat[2],
                a12 = mat[5];

            mat[1] = mat[3];
            mat[2] = mat[6];
            mat[3] = a01;
            mat[5] = mat[7];
            mat[6] = a02;
            mat[7] = a12;
            return mat;
        }

        dest[0] = mat[0];
        dest[1] = mat[3];
        dest[2] = mat[6];
        dest[3] = mat[1];
        dest[4] = mat[4];
        dest[5] = mat[7];
        dest[6] = mat[2];
        dest[7] = mat[5];
        dest[8] = mat[8];
        return dest;
    };

    /**
     * Copies the elements of a mat3 into the upper 3x3 elements of a mat4
     *
     * @param {mat3} mat mat3 containing values to copy
     * @param {mat4} [dest] mat4 receiving copied values
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat3.toMat4 = function (mat, dest) {
        if (!dest) { dest = mat4.create(); }

        dest[15] = 1;
        dest[14] = 0;
        dest[13] = 0;
        dest[12] = 0;

        dest[11] = 0;
        dest[10] = mat[8];
        dest[9] = mat[7];
        dest[8] = mat[6];

        dest[7] = 0;
        dest[6] = mat[5];
        dest[5] = mat[4];
        dest[4] = mat[3];

        dest[3] = 0;
        dest[2] = mat[2];
        dest[1] = mat[1];
        dest[0] = mat[0];

        return dest;
    };

    /**
     * Returns a string representation of a mat3
     *
     * @param {mat3} mat mat3 to represent as a string
     *
     * @param {string} String representation of mat
     */
    mat3.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] +
            ', ' + mat[3] + ', ' + mat[4] + ', ' + mat[5] +
            ', ' + mat[6] + ', ' + mat[7] + ', ' + mat[8] + ']';
    };

    /**
     * @class 4x4 Matrix
     * @name mat4
     */
    var mat4 = {};

    /**
     * Creates a new instance of a mat4 using the default array type
     * Any javascript array-like object containing at least 16 numeric elements can serve as a mat4
     *
     * @param {mat4} [mat] mat4 containing values to initialize with
     *
     * @returns {mat4} New mat4
     */
    mat4.create = function (mat) {
        var dest = new MatrixArray(16);

        if (mat) {
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];
            dest[8] = mat[8];
            dest[9] = mat[9];
            dest[10] = mat[10];
            dest[11] = mat[11];
            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        return dest;
    };

    /**
     * Creates a new instance of a mat4, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m02
     * @param {number} m03
     * @param {number} m10
     * @param {number} m11
     * @param {number} m12
     * @param {number} m13
     * @param {number} m20
     * @param {number} m21
     * @param {number} m22
     * @param {number} m23
     * @param {number} m30
     * @param {number} m31
     * @param {number} m32
     * @param {number} m33

     * @returns {mat4} New mat4
     */
    mat4.createFrom = function (m00, m01, m02, m03, m10, m11, m12, m13, m20, m21, m22, m23, m30, m31, m32, m33) {
        var dest = new MatrixArray(16);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m02;
        dest[3] = m03;
        dest[4] = m10;
        dest[5] = m11;
        dest[6] = m12;
        dest[7] = m13;
        dest[8] = m20;
        dest[9] = m21;
        dest[10] = m22;
        dest[11] = m23;
        dest[12] = m30;
        dest[13] = m31;
        dest[14] = m32;
        dest[15] = m33;

        return dest;
    };

    /**
     * Copies the values of one mat4 to another
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat4} dest mat4 receiving copied values
     *
     * @returns {mat4} dest
     */
    mat4.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        dest[9] = mat[9];
        dest[10] = mat[10];
        dest[11] = mat[11];
        dest[12] = mat[12];
        dest[13] = mat[13];
        dest[14] = mat[14];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat4} a First matrix
     * @param {mat4} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON &&
            Math.abs(a[4] - b[4]) < FLOAT_EPSILON &&
            Math.abs(a[5] - b[5]) < FLOAT_EPSILON &&
            Math.abs(a[6] - b[6]) < FLOAT_EPSILON &&
            Math.abs(a[7] - b[7]) < FLOAT_EPSILON &&
            Math.abs(a[8] - b[8]) < FLOAT_EPSILON &&
            Math.abs(a[9] - b[9]) < FLOAT_EPSILON &&
            Math.abs(a[10] - b[10]) < FLOAT_EPSILON &&
            Math.abs(a[11] - b[11]) < FLOAT_EPSILON &&
            Math.abs(a[12] - b[12]) < FLOAT_EPSILON &&
            Math.abs(a[13] - b[13]) < FLOAT_EPSILON &&
            Math.abs(a[14] - b[14]) < FLOAT_EPSILON &&
            Math.abs(a[15] - b[15]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat4 to an identity matrix
     *
     * @param {mat4} dest mat4 to set
     *
     * @returns {mat4} dest
     */
    mat4.identity = function (dest) {
        if (!dest) { dest = mat4.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = 1;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = 1;
        dest[11] = 0;
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;
        return dest;
    };

    /**
     * Transposes a mat4 (flips the values over the diagonal)
     *
     * @param {mat4} mat mat4 to transpose
     * @param {mat4} [dest] mat4 receiving transposed values. If not specified result is written to mat
     *
     * @param {mat4} dest is specified, mat otherwise
     */
    mat4.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a01 = mat[1], a02 = mat[2], a03 = mat[3],
                a12 = mat[6], a13 = mat[7],
                a23 = mat[11];

            mat[1] = mat[4];
            mat[2] = mat[8];
            mat[3] = mat[12];
            mat[4] = a01;
            mat[6] = mat[9];
            mat[7] = mat[13];
            mat[8] = a02;
            mat[9] = a12;
            mat[11] = mat[14];
            mat[12] = a03;
            mat[13] = a13;
            mat[14] = a23;
            return mat;
        }

        dest[0] = mat[0];
        dest[1] = mat[4];
        dest[2] = mat[8];
        dest[3] = mat[12];
        dest[4] = mat[1];
        dest[5] = mat[5];
        dest[6] = mat[9];
        dest[7] = mat[13];
        dest[8] = mat[2];
        dest[9] = mat[6];
        dest[10] = mat[10];
        dest[11] = mat[14];
        dest[12] = mat[3];
        dest[13] = mat[7];
        dest[14] = mat[11];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Calculates the determinant of a mat4
     *
     * @param {mat4} mat mat4 to calculate determinant of
     *
     * @returns {number} determinant of mat
     */
    mat4.determinant = function (mat) {
        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
            a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
            a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
            a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

        return (a30 * a21 * a12 * a03 - a20 * a31 * a12 * a03 - a30 * a11 * a22 * a03 + a10 * a31 * a22 * a03 +
                a20 * a11 * a32 * a03 - a10 * a21 * a32 * a03 - a30 * a21 * a02 * a13 + a20 * a31 * a02 * a13 +
                a30 * a01 * a22 * a13 - a00 * a31 * a22 * a13 - a20 * a01 * a32 * a13 + a00 * a21 * a32 * a13 +
                a30 * a11 * a02 * a23 - a10 * a31 * a02 * a23 - a30 * a01 * a12 * a23 + a00 * a31 * a12 * a23 +
                a10 * a01 * a32 * a23 - a00 * a11 * a32 * a23 - a20 * a11 * a02 * a33 + a10 * a21 * a02 * a33 +
                a20 * a01 * a12 * a33 - a00 * a21 * a12 * a33 - a10 * a01 * a22 * a33 + a00 * a11 * a22 * a33);
    };

    /**
     * Calculates the inverse matrix of a mat4
     *
     * @param {mat4} mat mat4 to calculate inverse of
     * @param {mat4} [dest] mat4 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat4} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat4.inverse = function (mat, dest) {
        if (!dest) { dest = mat; }

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2], a03 = mat[3],
            a10 = mat[4], a11 = mat[5], a12 = mat[6], a13 = mat[7],
            a20 = mat[8], a21 = mat[9], a22 = mat[10], a23 = mat[11],
            a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15],

            b00 = a00 * a11 - a01 * a10,
            b01 = a00 * a12 - a02 * a10,
            b02 = a00 * a13 - a03 * a10,
            b03 = a01 * a12 - a02 * a11,
            b04 = a01 * a13 - a03 * a11,
            b05 = a02 * a13 - a03 * a12,
            b06 = a20 * a31 - a21 * a30,
            b07 = a20 * a32 - a22 * a30,
            b08 = a20 * a33 - a23 * a30,
            b09 = a21 * a32 - a22 * a31,
            b10 = a21 * a33 - a23 * a31,
            b11 = a22 * a33 - a23 * a32,

            d = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06),
            invDet;

            // Calculate the determinant
            if (!d) { return null; }
            invDet = 1 / d;

        dest[0] = (a11 * b11 - a12 * b10 + a13 * b09) * invDet;
        dest[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * invDet;
        dest[2] = (a31 * b05 - a32 * b04 + a33 * b03) * invDet;
        dest[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * invDet;
        dest[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * invDet;
        dest[5] = (a00 * b11 - a02 * b08 + a03 * b07) * invDet;
        dest[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * invDet;
        dest[7] = (a20 * b05 - a22 * b02 + a23 * b01) * invDet;
        dest[8] = (a10 * b10 - a11 * b08 + a13 * b06) * invDet;
        dest[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * invDet;
        dest[10] = (a30 * b04 - a31 * b02 + a33 * b00) * invDet;
        dest[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * invDet;
        dest[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * invDet;
        dest[13] = (a00 * b09 - a01 * b07 + a02 * b06) * invDet;
        dest[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * invDet;
        dest[15] = (a20 * b03 - a21 * b01 + a22 * b00) * invDet;

        return dest;
    };

    /**
     * Copies the upper 3x3 elements of a mat4 into another mat4
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat4} [dest] mat4 receiving copied values
     *
     * @returns {mat4} dest is specified, a new mat4 otherwise
     */
    mat4.toRotationMat = function (mat, dest) {
        if (!dest) { dest = mat4.create(); }

        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        dest[4] = mat[4];
        dest[5] = mat[5];
        dest[6] = mat[6];
        dest[7] = mat[7];
        dest[8] = mat[8];
        dest[9] = mat[9];
        dest[10] = mat[10];
        dest[11] = mat[11];
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;

        return dest;
    };

    /**
     * Copies the upper 3x3 elements of a mat4 into a mat3
     *
     * @param {mat4} mat mat4 containing values to copy
     * @param {mat3} [dest] mat3 receiving copied values
     *
     * @returns {mat3} dest is specified, a new mat3 otherwise
     */
    mat4.toMat3 = function (mat, dest) {
        if (!dest) { dest = mat3.create(); }

        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[4];
        dest[4] = mat[5];
        dest[5] = mat[6];
        dest[6] = mat[8];
        dest[7] = mat[9];
        dest[8] = mat[10];

        return dest;
    };

    /**
     * Calculates the inverse of the upper 3x3 elements of a mat4 and copies the result into a mat3
     * The resulting matrix is useful for calculating transformed normals
     *
     * Params:
     * @param {mat4} mat mat4 containing values to invert and copy
     * @param {mat3} [dest] mat3 receiving values
     *
     * @returns {mat3} dest is specified, a new mat3 otherwise, null if the matrix cannot be inverted
     */
    mat4.toInverseMat3 = function (mat, dest) {
        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[0], a01 = mat[1], a02 = mat[2],
            a10 = mat[4], a11 = mat[5], a12 = mat[6],
            a20 = mat[8], a21 = mat[9], a22 = mat[10],

            b01 = a22 * a11 - a12 * a21,
            b11 = -a22 * a10 + a12 * a20,
            b21 = a21 * a10 - a11 * a20,

            d = a00 * b01 + a01 * b11 + a02 * b21,
            id;

        if (!d) { return null; }
        id = 1 / d;

        if (!dest) { dest = mat3.create(); }

        dest[0] = b01 * id;
        dest[1] = (-a22 * a01 + a02 * a21) * id;
        dest[2] = (a12 * a01 - a02 * a11) * id;
        dest[3] = b11 * id;
        dest[4] = (a22 * a00 - a02 * a20) * id;
        dest[5] = (-a12 * a00 + a02 * a10) * id;
        dest[6] = b21 * id;
        dest[7] = (-a21 * a00 + a01 * a20) * id;
        dest[8] = (a11 * a00 - a01 * a10) * id;

        return dest;
    };

    /**
     * Performs a matrix multiplication
     *
     * @param {mat4} mat First operand
     * @param {mat4} mat2 Second operand
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.multiply = function (mat, mat2, dest) {
        if (!dest) { dest = mat; }

        // Cache the matrix values (makes for huge speed increases!)
        var a00 = mat[ 0], a01 = mat[ 1], a02 = mat[ 2], a03 = mat[3];
        var a10 = mat[ 4], a11 = mat[ 5], a12 = mat[ 6], a13 = mat[7];
        var a20 = mat[ 8], a21 = mat[ 9], a22 = mat[10], a23 = mat[11];
        var a30 = mat[12], a31 = mat[13], a32 = mat[14], a33 = mat[15];

        // Cache only the current line of the second matrix
        var b0  = mat2[0], b1 = mat2[1], b2 = mat2[2], b3 = mat2[3];  
        dest[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[4];
        b1 = mat2[5];
        b2 = mat2[6];
        b3 = mat2[7];
        dest[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[8];
        b1 = mat2[9];
        b2 = mat2[10];
        b3 = mat2[11];
        dest[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        b0 = mat2[12];
        b1 = mat2[13];
        b2 = mat2[14];
        b3 = mat2[15];
        dest[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
        dest[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
        dest[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
        dest[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

        return dest;
    };

    /**
     * Transforms a vec3 with the given matrix
     * 4th vector component is implicitly '1'
     *
     * @param {mat4} mat mat4 to transform the vector with
     * @param {vec3} vec vec3 to transform
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec3} dest if specified, vec otherwise
     */
    mat4.multiplyVec3 = function (mat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2];

        dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
        dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
        dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];

        return dest;
    };

    /**
     * Transforms a vec4 with the given matrix
     *
     * @param {mat4} mat mat4 to transform the vector with
     * @param {vec4} vec vec4 to transform
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec4} dest if specified, vec otherwise
     */
    mat4.multiplyVec4 = function (mat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2], w = vec[3];

        dest[0] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12] * w;
        dest[1] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13] * w;
        dest[2] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14] * w;
        dest[3] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15] * w;

        return dest;
    };

    /**
     * Translates a matrix by the given vector
     *
     * @param {mat4} mat mat4 to translate
     * @param {vec3} vec vec3 specifying the translation
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.translate = function (mat, vec, dest) {
        var x = vec[0], y = vec[1], z = vec[2],
            a00, a01, a02, a03,
            a10, a11, a12, a13,
            a20, a21, a22, a23;

        if (!dest || mat === dest) {
            mat[12] = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
            mat[13] = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
            mat[14] = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];
            mat[15] = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
            return mat;
        }

        a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
        a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
        a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];

        dest[0] = a00; dest[1] = a01; dest[2] = a02; dest[3] = a03;
        dest[4] = a10; dest[5] = a11; dest[6] = a12; dest[7] = a13;
        dest[8] = a20; dest[9] = a21; dest[10] = a22; dest[11] = a23;

        dest[12] = a00 * x + a10 * y + a20 * z + mat[12];
        dest[13] = a01 * x + a11 * y + a21 * z + mat[13];
        dest[14] = a02 * x + a12 * y + a22 * z + mat[14];
        dest[15] = a03 * x + a13 * y + a23 * z + mat[15];
        return dest;
    };

    /**
     * Scales a matrix by the given vector
     *
     * @param {mat4} mat mat4 to scale
     * @param {vec3} vec vec3 specifying the scale for each axis
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @param {mat4} dest if specified, mat otherwise
     */
    mat4.scale = function (mat, vec, dest) {
        var x = vec[0], y = vec[1], z = vec[2];

        if (!dest || mat === dest) {
            mat[0] *= x;
            mat[1] *= x;
            mat[2] *= x;
            mat[3] *= x;
            mat[4] *= y;
            mat[5] *= y;
            mat[6] *= y;
            mat[7] *= y;
            mat[8] *= z;
            mat[9] *= z;
            mat[10] *= z;
            mat[11] *= z;
            return mat;
        }

        dest[0] = mat[0] * x;
        dest[1] = mat[1] * x;
        dest[2] = mat[2] * x;
        dest[3] = mat[3] * x;
        dest[4] = mat[4] * y;
        dest[5] = mat[5] * y;
        dest[6] = mat[6] * y;
        dest[7] = mat[7] * y;
        dest[8] = mat[8] * z;
        dest[9] = mat[9] * z;
        dest[10] = mat[10] * z;
        dest[11] = mat[11] * z;
        dest[12] = mat[12];
        dest[13] = mat[13];
        dest[14] = mat[14];
        dest[15] = mat[15];
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the specified axis
     * If rotating around a primary axis (X,Y,Z) one of the specialized rotation functions should be used instead for performance
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {vec3} axis vec3 representing the axis to rotate around
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotate = function (mat, angle, axis, dest) {
        var x = axis[0], y = axis[1], z = axis[2],
            len = Math.sqrt(x * x + y * y + z * z),
            s, c, t,
            a00, a01, a02, a03,
            a10, a11, a12, a13,
            a20, a21, a22, a23,
            b00, b01, b02,
            b10, b11, b12,
            b20, b21, b22;

        if (!len) { return null; }
        if (len !== 1) {
            len = 1 / len;
            x *= len;
            y *= len;
            z *= len;
        }

        s = Math.sin(angle);
        c = Math.cos(angle);
        t = 1 - c;

        a00 = mat[0]; a01 = mat[1]; a02 = mat[2]; a03 = mat[3];
        a10 = mat[4]; a11 = mat[5]; a12 = mat[6]; a13 = mat[7];
        a20 = mat[8]; a21 = mat[9]; a22 = mat[10]; a23 = mat[11];

        // Construct the elements of the rotation matrix
        b00 = x * x * t + c; b01 = y * x * t + z * s; b02 = z * x * t - y * s;
        b10 = x * y * t - z * s; b11 = y * y * t + c; b12 = z * y * t + x * s;
        b20 = x * z * t + y * s; b21 = y * z * t - x * s; b22 = z * z * t + c;

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform rotation-specific matrix multiplication
        dest[0] = a00 * b00 + a10 * b01 + a20 * b02;
        dest[1] = a01 * b00 + a11 * b01 + a21 * b02;
        dest[2] = a02 * b00 + a12 * b01 + a22 * b02;
        dest[3] = a03 * b00 + a13 * b01 + a23 * b02;

        dest[4] = a00 * b10 + a10 * b11 + a20 * b12;
        dest[5] = a01 * b10 + a11 * b11 + a21 * b12;
        dest[6] = a02 * b10 + a12 * b11 + a22 * b12;
        dest[7] = a03 * b10 + a13 * b11 + a23 * b12;

        dest[8] = a00 * b20 + a10 * b21 + a20 * b22;
        dest[9] = a01 * b20 + a11 * b21 + a21 * b22;
        dest[10] = a02 * b20 + a12 * b21 + a22 * b22;
        dest[11] = a03 * b20 + a13 * b21 + a23 * b22;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the X axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateX = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a10 = mat[4],
            a11 = mat[5],
            a12 = mat[6],
            a13 = mat[7],
            a20 = mat[8],
            a21 = mat[9],
            a22 = mat[10],
            a23 = mat[11];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
            dest[0] = mat[0];
            dest[1] = mat[1];
            dest[2] = mat[2];
            dest[3] = mat[3];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[4] = a10 * c + a20 * s;
        dest[5] = a11 * c + a21 * s;
        dest[6] = a12 * c + a22 * s;
        dest[7] = a13 * c + a23 * s;

        dest[8] = a10 * -s + a20 * c;
        dest[9] = a11 * -s + a21 * c;
        dest[10] = a12 * -s + a22 * c;
        dest[11] = a13 * -s + a23 * c;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the Y axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateY = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a00 = mat[0],
            a01 = mat[1],
            a02 = mat[2],
            a03 = mat[3],
            a20 = mat[8],
            a21 = mat[9],
            a22 = mat[10],
            a23 = mat[11];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged rows
            dest[4] = mat[4];
            dest[5] = mat[5];
            dest[6] = mat[6];
            dest[7] = mat[7];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[0] = a00 * c + a20 * -s;
        dest[1] = a01 * c + a21 * -s;
        dest[2] = a02 * c + a22 * -s;
        dest[3] = a03 * c + a23 * -s;

        dest[8] = a00 * s + a20 * c;
        dest[9] = a01 * s + a21 * c;
        dest[10] = a02 * s + a22 * c;
        dest[11] = a03 * s + a23 * c;
        return dest;
    };

    /**
     * Rotates a matrix by the given angle around the Z axis
     *
     * @param {mat4} mat mat4 to rotate
     * @param {number} angle Angle (in radians) to rotate
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to mat
     *
     * @returns {mat4} dest if specified, mat otherwise
     */
    mat4.rotateZ = function (mat, angle, dest) {
        var s = Math.sin(angle),
            c = Math.cos(angle),
            a00 = mat[0],
            a01 = mat[1],
            a02 = mat[2],
            a03 = mat[3],
            a10 = mat[4],
            a11 = mat[5],
            a12 = mat[6],
            a13 = mat[7];

        if (!dest) {
            dest = mat;
        } else if (mat !== dest) { // If the source and destination differ, copy the unchanged last row
            dest[8] = mat[8];
            dest[9] = mat[9];
            dest[10] = mat[10];
            dest[11] = mat[11];

            dest[12] = mat[12];
            dest[13] = mat[13];
            dest[14] = mat[14];
            dest[15] = mat[15];
        }

        // Perform axis-specific matrix multiplication
        dest[0] = a00 * c + a10 * s;
        dest[1] = a01 * c + a11 * s;
        dest[2] = a02 * c + a12 * s;
        dest[3] = a03 * c + a13 * s;

        dest[4] = a00 * -s + a10 * c;
        dest[5] = a01 * -s + a11 * c;
        dest[6] = a02 * -s + a12 * c;
        dest[7] = a03 * -s + a13 * c;

        return dest;
    };

    /**
     * Generates a frustum matrix with the given bounds
     *
     * @param {number} left Left bound of the frustum
     * @param {number} right Right bound of the frustum
     * @param {number} bottom Bottom bound of the frustum
     * @param {number} top Top bound of the frustum
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.frustum = function (left, right, bottom, top, near, far, dest) {
        if (!dest) { dest = mat4.create(); }
        var rl = (right - left),
            tb = (top - bottom),
            fn = (far - near);
        dest[0] = (near * 2) / rl;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = (near * 2) / tb;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = (right + left) / rl;
        dest[9] = (top + bottom) / tb;
        dest[10] = -(far + near) / fn;
        dest[11] = -1;
        dest[12] = 0;
        dest[13] = 0;
        dest[14] = -(far * near * 2) / fn;
        dest[15] = 0;
        return dest;
    };

    /**
     * Generates a perspective projection matrix with the given bounds
     *
     * @param {number} fovy Vertical field of view
     * @param {number} aspect Aspect ratio. typically viewport width/height
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.perspective = function (fovy, aspect, near, far, dest) {
        var top = near * Math.tan(fovy * Math.PI / 360.0),
            right = top * aspect;
        return mat4.frustum(-right, right, -top, top, near, far, dest);
    };

    /**
     * Generates a orthogonal projection matrix with the given bounds
     *
     * @param {number} left Left bound of the frustum
     * @param {number} right Right bound of the frustum
     * @param {number} bottom Bottom bound of the frustum
     * @param {number} top Top bound of the frustum
     * @param {number} near Near bound of the frustum
     * @param {number} far Far bound of the frustum
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.ortho = function (left, right, bottom, top, near, far, dest) {
        if (!dest) { dest = mat4.create(); }
        var rl = (right - left),
            tb = (top - bottom),
            fn = (far - near);
        dest[0] = 2 / rl;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 0;
        dest[4] = 0;
        dest[5] = 2 / tb;
        dest[6] = 0;
        dest[7] = 0;
        dest[8] = 0;
        dest[9] = 0;
        dest[10] = -2 / fn;
        dest[11] = 0;
        dest[12] = -(left + right) / rl;
        dest[13] = -(top + bottom) / tb;
        dest[14] = -(far + near) / fn;
        dest[15] = 1;
        return dest;
    };

    /**
     * Generates a look-at matrix with the given eye position, focal point, and up axis
     *
     * @param {vec3} eye Position of the viewer
     * @param {vec3} center Point the viewer is looking at
     * @param {vec3} up vec3 pointing "up"
     * @param {mat4} [dest] mat4 frustum matrix will be written into
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.lookAt = function (eye, center, up, dest) {
        if (!dest) { dest = mat4.create(); }

        var x0, x1, x2, y0, y1, y2, z0, z1, z2, len,
            eyex = eye[0],
            eyey = eye[1],
            eyez = eye[2],
            upx = up[0],
            upy = up[1],
            upz = up[2],
            centerx = center[0],
            centery = center[1],
            centerz = center[2];

        if (eyex === centerx && eyey === centery && eyez === centerz) {
            return mat4.identity(dest);
        }

        //vec3.direction(eye, center, z);
        z0 = eyex - centerx;
        z1 = eyey - centery;
        z2 = eyez - centerz;

        // normalize (no check needed for 0 because of early return)
        len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
        z0 *= len;
        z1 *= len;
        z2 *= len;

        //vec3.normalize(vec3.cross(up, z, x));
        x0 = upy * z2 - upz * z1;
        x1 = upz * z0 - upx * z2;
        x2 = upx * z1 - upy * z0;
        len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
        if (!len) {
            x0 = 0;
            x1 = 0;
            x2 = 0;
        } else {
            len = 1 / len;
            x0 *= len;
            x1 *= len;
            x2 *= len;
        }

        //vec3.normalize(vec3.cross(z, x, y));
        y0 = z1 * x2 - z2 * x1;
        y1 = z2 * x0 - z0 * x2;
        y2 = z0 * x1 - z1 * x0;

        len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
        if (!len) {
            y0 = 0;
            y1 = 0;
            y2 = 0;
        } else {
            len = 1 / len;
            y0 *= len;
            y1 *= len;
            y2 *= len;
        }

        dest[0] = x0;
        dest[1] = y0;
        dest[2] = z0;
        dest[3] = 0;
        dest[4] = x1;
        dest[5] = y1;
        dest[6] = z1;
        dest[7] = 0;
        dest[8] = x2;
        dest[9] = y2;
        dest[10] = z2;
        dest[11] = 0;
        dest[12] = -(x0 * eyex + x1 * eyey + x2 * eyez);
        dest[13] = -(y0 * eyex + y1 * eyey + y2 * eyez);
        dest[14] = -(z0 * eyex + z1 * eyey + z2 * eyez);
        dest[15] = 1;

        return dest;
    };

    /**
     * Creates a matrix from a quaternion rotation and vector translation
     * This is equivalent to (but much faster than):
     *
     *     mat4.identity(dest);
     *     mat4.translate(dest, vec);
     *     var quatMat = mat4.create();
     *     quat4.toMat4(quat, quatMat);
     *     mat4.multiply(dest, quatMat);
     *
     * @param {quat4} quat Rotation quaternion
     * @param {vec3} vec Translation vector
     * @param {mat4} [dest] mat4 receiving operation result. If not specified result is written to a new mat4
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    mat4.fromRotationTranslation = function (quat, vec, dest) {
        if (!dest) { dest = mat4.create(); }

        // Quaternion math
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;
        dest[3] = 0;
        dest[4] = xy - wz;
        dest[5] = 1 - (xx + zz);
        dest[6] = yz + wx;
        dest[7] = 0;
        dest[8] = xz + wy;
        dest[9] = yz - wx;
        dest[10] = 1 - (xx + yy);
        dest[11] = 0;
        dest[12] = vec[0];
        dest[13] = vec[1];
        dest[14] = vec[2];
        dest[15] = 1;
        
        return dest;
    };

    /**
     * Returns a string representation of a mat4
     *
     * @param {mat4} mat mat4 to represent as a string
     *
     * @returns {string} String representation of mat
     */
    mat4.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] +
            ', ' + mat[4] + ', ' + mat[5] + ', ' + mat[6] + ', ' + mat[7] +
            ', ' + mat[8] + ', ' + mat[9] + ', ' + mat[10] + ', ' + mat[11] +
            ', ' + mat[12] + ', ' + mat[13] + ', ' + mat[14] + ', ' + mat[15] + ']';
    };

    /**
     * @class Quaternion
     * @name quat4
     */
    var quat4 = {};

    /**
     * Creates a new instance of a quat4 using the default array type
     * Any javascript array containing at least 4 numeric elements can serve as a quat4
     *
     * @param {quat4} [quat] quat4 containing values to initialize with
     *
     * @returns {quat4} New quat4
     */
    quat4.create = function (quat) {
        var dest = new MatrixArray(4);

        if (quat) {
            dest[0] = quat[0];
            dest[1] = quat[1];
            dest[2] = quat[2];
            dest[3] = quat[3];
        } else {
            dest[0] = dest[1] = dest[2] = dest[3] = 0;
        }

        return dest;
    };

    /**
     * Creates a new instance of a quat4, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value
     * @param {number} w W value

     * @returns {quat4} New quat4
     */
    quat4.createFrom = function (x, y, z, w) {
        var dest = new MatrixArray(4);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = w;

        return dest;
    };

    /**
     * Copies the values of one quat4 to another
     *
     * @param {quat4} quat quat4 containing values to copy
     * @param {quat4} dest quat4 receiving copied values
     *
     * @returns {quat4} dest
     */
    quat4.set = function (quat, dest) {
        dest[0] = quat[0];
        dest[1] = quat[1];
        dest[2] = quat[2];
        dest[3] = quat[3];

        return dest;
    };

    /**
     * Compares two quaternions for equality within a certain margin of error
     *
     * @param {quat4} a First vector
     * @param {quat4} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    quat4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Creates a new identity Quat4
     *
     * @param {quat4} [dest] quat4 receiving copied values
     *
     * @returns {quat4} dest is specified, new quat4 otherwise
     */
    quat4.identity = function (dest) {
        if (!dest) { dest = quat4.create(); }
        dest[0] = 0;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    var identityQuat4 = quat4.identity();

    /**
     * Calculates the W component of a quat4 from the X, Y, and Z components.
     * Assumes that quaternion is 1 unit in length.
     * Any existing W component will be ignored.
     *
     * @param {quat4} quat quat4 to calculate W component of
     * @param {quat4} [dest] quat4 receiving calculated values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.calculateW = function (quat, dest) {
        var x = quat[0], y = quat[1], z = quat[2];

        if (!dest || quat === dest) {
            quat[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
            return quat;
        }
        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = -Math.sqrt(Math.abs(1.0 - x * x - y * y - z * z));
        return dest;
    };

    /**
     * Calculates the dot product of two quaternions
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     *
     * @return {number} Dot product of quat and quat2
     */
    quat4.dot = function(quat, quat2){
        return quat[0]*quat2[0] + quat[1]*quat2[1] + quat[2]*quat2[2] + quat[3]*quat2[3];
    };

    /**
     * Calculates the inverse of a quat4
     *
     * @param {quat4} quat quat4 to calculate inverse of
     * @param {quat4} [dest] quat4 receiving inverse values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.inverse = function(quat, dest) {
        var q0 = quat[0], q1 = quat[1], q2 = quat[2], q3 = quat[3],
            dot = q0*q0 + q1*q1 + q2*q2 + q3*q3,
            invDot = dot ? 1.0/dot : 0;
        
        // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0
        
        if(!dest || quat === dest) {
            quat[0] *= -invDot;
            quat[1] *= -invDot;
            quat[2] *= -invDot;
            quat[3] *= invDot;
            return quat;
        }
        dest[0] = -quat[0]*invDot;
        dest[1] = -quat[1]*invDot;
        dest[2] = -quat[2]*invDot;
        dest[3] = quat[3]*invDot;
        return dest;
    };


    /**
     * Calculates the conjugate of a quat4
     * If the quaternion is normalized, this function is faster than quat4.inverse and produces the same result.
     *
     * @param {quat4} quat quat4 to calculate conjugate of
     * @param {quat4} [dest] quat4 receiving conjugate values. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.conjugate = function (quat, dest) {
        if (!dest || quat === dest) {
            quat[0] *= -1;
            quat[1] *= -1;
            quat[2] *= -1;
            return quat;
        }
        dest[0] = -quat[0];
        dest[1] = -quat[1];
        dest[2] = -quat[2];
        dest[3] = quat[3];
        return dest;
    };

    /**
     * Calculates the length of a quat4
     *
     * Params:
     * @param {quat4} quat quat4 to calculate length of
     *
     * @returns Length of quat
     */
    quat4.length = function (quat) {
        var x = quat[0], y = quat[1], z = quat[2], w = quat[3];
        return Math.sqrt(x * x + y * y + z * z + w * w);
    };

    /**
     * Generates a unit quaternion of the same direction as the provided quat4
     * If quaternion length is 0, returns [0, 0, 0, 0]
     *
     * @param {quat4} quat quat4 to normalize
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.normalize = function (quat, dest) {
        if (!dest) { dest = quat; }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            len = Math.sqrt(x * x + y * y + z * z + w * w);
        if (len === 0) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
            return dest;
        }
        len = 1 / len;
        dest[0] = x * len;
        dest[1] = y * len;
        dest[2] = z * len;
        dest[3] = w * len;

        return dest;
    };

    /**
     * Performs quaternion addition
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.add = function (quat, quat2, dest) {
        if(!dest || quat === dest) {
            quat[0] += quat2[0];
            quat[1] += quat2[1];
            quat[2] += quat2[2];
            quat[3] += quat2[3];
            return quat;
        }
        dest[0] = quat[0]+quat2[0];
        dest[1] = quat[1]+quat2[1];
        dest[2] = quat[2]+quat2[2];
        dest[3] = quat[3]+quat2[3];
        return dest;
    };

    /**
     * Performs a quaternion multiplication
     *
     * @param {quat4} quat First operand
     * @param {quat4} quat2 Second operand
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.multiply = function (quat, quat2, dest) {
        if (!dest) { dest = quat; }

        var qax = quat[0], qay = quat[1], qaz = quat[2], qaw = quat[3],
            qbx = quat2[0], qby = quat2[1], qbz = quat2[2], qbw = quat2[3];

        dest[0] = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
        dest[1] = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
        dest[2] = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
        dest[3] = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

        return dest;
    };

    /**
     * Transforms a vec3 with the given quaternion
     *
     * @param {quat4} quat quat4 to transform the vector with
     * @param {vec3} vec vec3 to transform
     * @param {vec3} [dest] vec3 receiving operation result. If not specified result is written to vec
     *
     * @returns dest if specified, vec otherwise
     */
    quat4.multiplyVec3 = function (quat, vec, dest) {
        if (!dest) { dest = vec; }

        var x = vec[0], y = vec[1], z = vec[2],
            qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3],

            // calculate quat * vec
            ix = qw * x + qy * z - qz * y,
            iy = qw * y + qz * x - qx * z,
            iz = qw * z + qx * y - qy * x,
            iw = -qx * x - qy * y - qz * z;

        // calculate result * inverse quat
        dest[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
        dest[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
        dest[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

        return dest;
    };

    /**
     * Multiplies the components of a quaternion by a scalar value
     *
     * @param {quat4} quat to scale
     * @param {number} val Value to scale by
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.scale = function (quat, val, dest) {
        if(!dest || quat === dest) {
            quat[0] *= val;
            quat[1] *= val;
            quat[2] *= val;
            quat[3] *= val;
            return quat;
        }
        dest[0] = quat[0]*val;
        dest[1] = quat[1]*val;
        dest[2] = quat[2]*val;
        dest[3] = quat[3]*val;
        return dest;
    };

    /**
     * Calculates a 3x3 matrix from the given quat4
     *
     * @param {quat4} quat quat4 to create matrix from
     * @param {mat3} [dest] mat3 receiving operation result
     *
     * @returns {mat3} dest if specified, a new mat3 otherwise
     */
    quat4.toMat3 = function (quat, dest) {
        if (!dest) { dest = mat3.create(); }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;

        dest[3] = xy - wz;
        dest[4] = 1 - (xx + zz);
        dest[5] = yz + wx;

        dest[6] = xz + wy;
        dest[7] = yz - wx;
        dest[8] = 1 - (xx + yy);

        return dest;
    };

    /**
     * Calculates a 4x4 matrix from the given quat4
     *
     * @param {quat4} quat quat4 to create matrix from
     * @param {mat4} [dest] mat4 receiving operation result
     *
     * @returns {mat4} dest if specified, a new mat4 otherwise
     */
    quat4.toMat4 = function (quat, dest) {
        if (!dest) { dest = mat4.create(); }

        var x = quat[0], y = quat[1], z = quat[2], w = quat[3],
            x2 = x + x,
            y2 = y + y,
            z2 = z + z,

            xx = x * x2,
            xy = x * y2,
            xz = x * z2,
            yy = y * y2,
            yz = y * z2,
            zz = z * z2,
            wx = w * x2,
            wy = w * y2,
            wz = w * z2;

        dest[0] = 1 - (yy + zz);
        dest[1] = xy + wz;
        dest[2] = xz - wy;
        dest[3] = 0;

        dest[4] = xy - wz;
        dest[5] = 1 - (xx + zz);
        dest[6] = yz + wx;
        dest[7] = 0;

        dest[8] = xz + wy;
        dest[9] = yz - wx;
        dest[10] = 1 - (xx + yy);
        dest[11] = 0;

        dest[12] = 0;
        dest[13] = 0;
        dest[14] = 0;
        dest[15] = 1;

        return dest;
    };

    /**
     * Performs a spherical linear interpolation between two quat4
     *
     * @param {quat4} quat First quaternion
     * @param {quat4} quat2 Second quaternion
     * @param {number} slerp Interpolation amount between the two inputs
     * @param {quat4} [dest] quat4 receiving operation result. If not specified result is written to quat
     *
     * @returns {quat4} dest if specified, quat otherwise
     */
    quat4.slerp = function (quat, quat2, slerp, dest) {
        if (!dest) { dest = quat; }

        var cosHalfTheta = quat[0] * quat2[0] + quat[1] * quat2[1] + quat[2] * quat2[2] + quat[3] * quat2[3],
            halfTheta,
            sinHalfTheta,
            ratioA,
            ratioB;

        if (Math.abs(cosHalfTheta) >= 1.0) {
            if (dest !== quat) {
                dest[0] = quat[0];
                dest[1] = quat[1];
                dest[2] = quat[2];
                dest[3] = quat[3];
            }
            return dest;
        }

        halfTheta = Math.acos(cosHalfTheta);
        sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);

        if (Math.abs(sinHalfTheta) < 0.001) {
            dest[0] = (quat[0] * 0.5 + quat2[0] * 0.5);
            dest[1] = (quat[1] * 0.5 + quat2[1] * 0.5);
            dest[2] = (quat[2] * 0.5 + quat2[2] * 0.5);
            dest[3] = (quat[3] * 0.5 + quat2[3] * 0.5);
            return dest;
        }

        ratioA = Math.sin((1 - slerp) * halfTheta) / sinHalfTheta;
        ratioB = Math.sin(slerp * halfTheta) / sinHalfTheta;

        dest[0] = (quat[0] * ratioA + quat2[0] * ratioB);
        dest[1] = (quat[1] * ratioA + quat2[1] * ratioB);
        dest[2] = (quat[2] * ratioA + quat2[2] * ratioB);
        dest[3] = (quat[3] * ratioA + quat2[3] * ratioB);

        return dest;
    };

    /**
     * Creates a quaternion from the given 3x3 rotation matrix.
     * If dest is omitted, a new quaternion will be created.
     *
     * @param {mat3}  mat    the rotation matrix
     * @param {quat4} [dest] an optional receiving quaternion
     *
     * @returns {quat4} the quaternion constructed from the rotation matrix
     *
     */
    quat4.fromRotationMatrix = function(mat, dest) {
        if (!dest) dest = quat4.create();
        
        // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
        // article "Quaternion Calculus and Fast Animation".

        var fTrace = mat[0] + mat[4] + mat[8];
        var fRoot;

        if ( fTrace > 0.0 ) {
            // |w| > 1/2, may as well choose w > 1/2
            fRoot = Math.sqrt(fTrace + 1.0);  // 2w
            dest[3] = 0.5 * fRoot;
            fRoot = 0.5/fRoot;  // 1/(4w)
            dest[0] = (mat[7]-mat[5])*fRoot;
            dest[1] = (mat[2]-mat[6])*fRoot;
            dest[2] = (mat[3]-mat[1])*fRoot;
        } else {
            // |w| <= 1/2
            var s_iNext = quat4.fromRotationMatrix.s_iNext = quat4.fromRotationMatrix.s_iNext || [1,2,0];
            var i = 0;
            if ( mat[4] > mat[0] )
              i = 1;
            if ( mat[8] > mat[i*3+i] )
              i = 2;
            var j = s_iNext[i];
            var k = s_iNext[j];
            
            fRoot = Math.sqrt(mat[i*3+i]-mat[j*3+j]-mat[k*3+k] + 1.0);
            dest[i] = 0.5 * fRoot;
            fRoot = 0.5 / fRoot;
            dest[3] = (mat[k*3+j] - mat[j*3+k]) * fRoot;
            dest[j] = (mat[j*3+i] + mat[i*3+j]) * fRoot;
            dest[k] = (mat[k*3+i] + mat[i*3+k]) * fRoot;
        }
        
        return dest;
    };

    /**
     * Alias. See the description for quat4.fromRotationMatrix().
     */
    mat3.toQuat4 = quat4.fromRotationMatrix;

    (function() {
        var mat = mat3.create();
        
        /**
         * Creates a quaternion from the 3 given vectors. They must be perpendicular
         * to one another and represent the X, Y and Z axes.
         *
         * If dest is omitted, a new quat4 will be created.
         *
         * Example: The default OpenGL orientation has a view vector [0, 0, -1],
         * right vector [1, 0, 0], and up vector [0, 1, 0]. A quaternion representing
         * this orientation could be constructed with:
         *
         *   quat = quat4.fromAxes([0, 0, -1], [1, 0, 0], [0, 1, 0], quat4.create());
         *
         * @param {vec3}  view   the view vector, or direction the object is pointing in
         * @param {vec3}  right  the right vector, or direction to the "right" of the object
         * @param {vec3}  up     the up vector, or direction towards the object's "up"
         * @param {quat4} [dest] an optional receiving quat4
         *
         * @returns {quat4} dest
         **/
        quat4.fromAxes = function(view, right, up, dest) {
            mat[0] = right[0];
            mat[3] = right[1];
            mat[6] = right[2];

            mat[1] = up[0];
            mat[4] = up[1];
            mat[7] = up[2];

            mat[2] = view[0];
            mat[5] = view[1];
            mat[8] = view[2];

            return quat4.fromRotationMatrix(mat, dest);
        };
    })();

    /**
     * Sets a quat4 to the Identity and returns it.
     *
     * @param {quat4} [dest] quat4 to set. If omitted, a
     * new quat4 will be created.
     *
     * @returns {quat4} dest
     */
    quat4.identity = function(dest) {
        if (!dest) dest = quat4.create();
        dest[0] = 0;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    /**
     * Sets a quat4 from the given angle and rotation axis,
     * then returns it. If dest is not given, a new quat4 is created.
     *
     * @param {Number} angle  the angle in radians
     * @param {vec3}   axis   the axis around which to rotate
     * @param {quat4}  [dest] the optional quat4 to store the result
     *
     * @returns {quat4} dest
     **/
    quat4.fromAngleAxis = function(angle, axis, dest) {
        // The quaternion representing the rotation is
        //   q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)
        if (!dest) dest = quat4.create();
        
        var half = angle * 0.5;
        var s = Math.sin(half);
        dest[3] = Math.cos(half);
        dest[0] = s * axis[0];
        dest[1] = s * axis[1];
        dest[2] = s * axis[2];
        
        return dest;
    };

    /**
     * Stores the angle and axis in a vec4, where the XYZ components represent
     * the axis and the W (4th) component is the angle in radians.
     *
     * If dest is not given, src will be modified in place and returned, after
     * which it should not be considered not a quaternion (just an axis and angle).
     *
     * @param {quat4} quat   the quaternion whose angle and axis to store
     * @param {vec4}  [dest] the optional vec4 to receive the data
     *
     * @returns {vec4} dest
     */
    quat4.toAngleAxis = function(src, dest) {
        if (!dest) dest = src;
        // The quaternion representing the rotation is
        //   q = cos(A/2)+sin(A/2)*(x*i+y*j+z*k)

        var sqrlen = src[0]*src[0]+src[1]*src[1]+src[2]*src[2];
        if (sqrlen > 0)
        {
            dest[3] = 2 * Math.acos(src[3]);
            var invlen = glMath.invsqrt(sqrlen);
            dest[0] = src[0]*invlen;
            dest[1] = src[1]*invlen;
            dest[2] = src[2]*invlen;
        } else {
            // angle is 0 (mod 2*pi), so any axis will do
            dest[3] = 0;
            dest[0] = 1;
            dest[1] = 0;
            dest[2] = 0;
        }
        
        return dest;
    };

    /**
     * Returns a string representation of a quaternion
     *
     * @param {quat4} quat quat4 to represent as a string
     *
     * @returns {string} String representation of quat
     */
    quat4.str = function (quat) {
        return '[' + quat[0] + ', ' + quat[1] + ', ' + quat[2] + ', ' + quat[3] + ']';
    };
    
    /**
     * @class 2 Dimensional Vector
     * @name vec2
     */
    var vec2 = {};
     
    /**
     * Creates a new vec2, initializing it from vec if vec
     * is given.
     *
     * @param {vec2} [vec] the vector's initial contents
     * @returns {vec2} a new 2D vector
     */
    vec2.create = function(vec) {
        var dest = new MatrixArray(2);

        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
        } else {
            dest[0] = 0;
            dest[1] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a vec2, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value

     * @returns {vec2} New vec2
     */
    vec2.createFrom = function (x, y) {
        var dest = new MatrixArray(2);

        dest[0] = x;
        dest[1] = y;

        return dest;
    };
    
    /**
     * Adds the vec2's together. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.add = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] + vecB[0];
        dest[1] = vecA[1] + vecB[1];
        return dest;
    };
    
    /**
     * Subtracts vecB from vecA. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.subtract = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] - vecB[0];
        dest[1] = vecA[1] - vecB[1];
        return dest;
    };
    
    /**
     * Multiplies vecA with vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.multiply = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] * vecB[0];
        dest[1] = vecA[1] * vecB[1];
        return dest;
    };
    
    /**
     * Divides vecA by vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec2} vecA the first operand
     * @param {vec2} vecB the second operand
     * @param {vec2} [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.divide = function(vecA, vecB, dest) {
        if (!dest) dest = vecB;
        dest[0] = vecA[0] / vecB[0];
        dest[1] = vecA[1] / vecB[1];
        return dest;
    };
    
    /**
     * Scales vecA by some scalar number. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecA.
     *
     * This is the same as multiplying each component of vecA
     * by the given scalar.
     *
     * @param {vec2}   vecA the vector to be scaled
     * @param {Number} scalar the amount to scale the vector by
     * @param {vec2}   [dest] the optional receiving vector
     * @returns {vec2} dest
     */
    vec2.scale = function(vecA, scalar, dest) {
        if (!dest) dest = vecA;
        dest[0] = vecA[0] * scalar;
        dest[1] = vecA[1] * scalar;
        return dest;
    };

    /**
     * Calculates the euclidian distance between two vec2
     *
     * Params:
     * @param {vec2} vecA First vector
     * @param {vec2} vecB Second vector
     *
     * @returns {number} Distance between vecA and vecB
     */
    vec2.dist = function (vecA, vecB) {
        var x = vecB[0] - vecA[0],
            y = vecB[1] - vecA[1];
        return Math.sqrt(x*x + y*y);
    };

    /**
     * Copies the values of one vec2 to another
     *
     * @param {vec2} vec vec2 containing values to copy
     * @param {vec2} dest vec2 receiving copied values
     *
     * @returns {vec2} dest
     */
    vec2.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec2} a First vector
     * @param {vec2} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec2.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON
        );
    };

    /**
     * Negates the components of a vec2
     *
     * @param {vec2} vec vec2 to negate
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec2} dest if specified, vec otherwise
     */
    vec2.negate = function (vec, dest) {
        if (!dest) { dest = vec; }
        dest[0] = -vec[0];
        dest[1] = -vec[1];
        return dest;
    };

    /**
     * Normlize a vec2
     *
     * @param {vec2} vec vec2 to normalize
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec2} dest if specified, vec otherwise
     */
    vec2.normalize = function (vec, dest) {
        if (!dest) { dest = vec; }
        var mag = vec[0] * vec[0] + vec[1] * vec[1];
        if (mag > 0) {
            mag = Math.sqrt(mag);
            dest[0] = vec[0] / mag;
            dest[1] = vec[1] / mag;
        } else {
            dest[0] = dest[1] = 0;
        }
        return dest;
    };

    /**
     * Computes the cross product of two vec2's. Note that the cross product must by definition
     * produce a 3D vector. If a dest vector is given, it will contain the resultant 3D vector.
     * Otherwise, a scalar number will be returned, representing the vector's Z coordinate, since
     * its X and Y must always equal 0.
     *
     * Examples:
     *    var crossResult = vec3.create();
     *    vec2.cross([1, 2], [3, 4], crossResult);
     *    //=> [0, 0, -2]
     *
     *    vec2.cross([1, 2], [3, 4]);
     *    //=> -2
     *
     * See http://stackoverflow.com/questions/243945/calculating-a-2d-vectors-cross-product
     * for some interesting facts.
     *
     * @param {vec2} vecA left operand
     * @param {vec2} vecB right operand
     * @param {vec2} [dest] optional vec2 receiving result. If not specified a scalar is returned
     *
     */
    vec2.cross = function (vecA, vecB, dest) {
        var z = vecA[0] * vecB[1] - vecA[1] * vecB[0];
        if (!dest) return z;
        dest[0] = dest[1] = 0;
        dest[2] = z;
        return dest;
    };
    
    /**
     * Caclulates the length of a vec2
     *
     * @param {vec2} vec vec2 to calculate length of
     *
     * @returns {Number} Length of vec
     */
    vec2.length = function (vec) {
      var x = vec[0], y = vec[1];
      return Math.sqrt(x * x + y * y);
    };

    /**
     * Caclulates the squared length of a vec2
     *
     * @param {vec2} vec vec2 to calculate squared length of
     *
     * @returns {Number} Squared Length of vec
     */
    vec2.squaredLength = function (vec) {
      var x = vec[0], y = vec[1];
      return x * x + y * y;
    };

    /**
     * Caclulates the dot product of two vec2s
     *
     * @param {vec2} vecA First operand
     * @param {vec2} vecB Second operand
     *
     * @returns {Number} Dot product of vecA and vecB
     */
    vec2.dot = function (vecA, vecB) {
        return vecA[0] * vecB[0] + vecA[1] * vecB[1];
    };
    
    /**
     * Generates a 2D unit vector pointing from one vector to another
     *
     * @param {vec2} vecA Origin vec2
     * @param {vec2} vecB vec2 to point to
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec2} dest if specified, vecA otherwise
     */
    vec2.direction = function (vecA, vecB, dest) {
        if (!dest) { dest = vecA; }

        var x = vecA[0] - vecB[0],
            y = vecA[1] - vecB[1],
            len = x * x + y * y;

        if (!len) {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            return dest;
        }

        len = 1 / Math.sqrt(len);
        dest[0] = x * len;
        dest[1] = y * len;
        return dest;
    };

    /**
     * Performs a linear interpolation between two vec2
     *
     * @param {vec2} vecA First vector
     * @param {vec2} vecB Second vector
     * @param {Number} lerp Interpolation amount between the two inputs
     * @param {vec2} [dest] vec2 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec2} dest if specified, vecA otherwise
     */
    vec2.lerp = function (vecA, vecB, lerp, dest) {
        if (!dest) { dest = vecA; }
        dest[0] = vecA[0] + lerp * (vecB[0] - vecA[0]);
        dest[1] = vecA[1] + lerp * (vecB[1] - vecA[1]);
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec2} vec Vector to represent as a string
     *
     * @returns {String} String representation of vec
     */
    vec2.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ']';
    };
    
    /**
     * @class 2x2 Matrix
     * @name mat2
     */
    var mat2 = {};
    
    /**
     * Creates a new 2x2 matrix. If src is given, the new matrix
     * is initialized to those values.
     *
     * @param {mat2} [src] the seed values for the new matrix, if any
     * @returns {mat2} a new matrix
     */
    mat2.create = function(src) {
        var dest = new MatrixArray(4);
        
        if (src) {
            dest[0] = src[0];
            dest[1] = src[1];
            dest[2] = src[2];
            dest[3] = src[3];
        } else {
            dest[0] = dest[1] = dest[2] = dest[3] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a mat2, initializing it with the given arguments
     *
     * @param {number} m00
     * @param {number} m01
     * @param {number} m10
     * @param {number} m11

     * @returns {mat2} New mat2
     */
    mat2.createFrom = function (m00, m01, m10, m11) {
        var dest = new MatrixArray(4);

        dest[0] = m00;
        dest[1] = m01;
        dest[2] = m10;
        dest[3] = m11;

        return dest;
    };
    
    /**
     * Copies the values of one mat2 to another
     *
     * @param {mat2} mat mat2 containing values to copy
     * @param {mat2} dest mat2 receiving copied values
     *
     * @returns {mat2} dest
     */
    mat2.set = function (mat, dest) {
        dest[0] = mat[0];
        dest[1] = mat[1];
        dest[2] = mat[2];
        dest[3] = mat[3];
        return dest;
    };

    /**
     * Compares two matrices for equality within a certain margin of error
     *
     * @param {mat2} a First matrix
     * @param {mat2} b Second matrix
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    mat2.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Sets a mat2 to an identity matrix
     *
     * @param {mat2} [dest] mat2 to set. If omitted a new one will be created.
     *
     * @returns {mat2} dest
     */
    mat2.identity = function (dest) {
        if (!dest) { dest = mat2.create(); }
        dest[0] = 1;
        dest[1] = 0;
        dest[2] = 0;
        dest[3] = 1;
        return dest;
    };

    /**
     * Transposes a mat2 (flips the values over the diagonal)
     *
     * @param {mat2} mat mat2 to transpose
     * @param {mat2} [dest] mat2 receiving transposed values. If not specified result is written to mat
     *
     * @param {mat2} dest if specified, mat otherwise
     */
    mat2.transpose = function (mat, dest) {
        // If we are transposing ourselves we can skip a few steps but have to cache some values
        if (!dest || mat === dest) {
            var a00 = mat[1];
            mat[1] = mat[2];
            mat[2] = a00;
            return mat;
        }
        
        dest[0] = mat[0];
        dest[1] = mat[2];
        dest[2] = mat[1];
        dest[3] = mat[3];
        return dest;
    };

    /**
     * Calculates the determinant of a mat2
     *
     * @param {mat2} mat mat2 to calculate determinant of
     *
     * @returns {Number} determinant of mat
     */
    mat2.determinant = function (mat) {
      return mat[0] * mat[3] - mat[2] * mat[1];
    };
    
    /**
     * Calculates the inverse matrix of a mat2
     *
     * @param {mat2} mat mat2 to calculate inverse of
     * @param {mat2} [dest] mat2 receiving inverse matrix. If not specified result is written to mat
     *
     * @param {mat2} dest is specified, mat otherwise, null if matrix cannot be inverted
     */
    mat2.inverse = function (mat, dest) {
        if (!dest) { dest = mat; }
        var a0 = mat[0], a1 = mat[1], a2 = mat[2], a3 = mat[3];
        var det = a0 * a3 - a2 * a1;
        if (!det) return null;
        
        det = 1.0 / det;
        dest[0] =  a3 * det;
        dest[1] = -a1 * det;
        dest[2] = -a2 * det;
        dest[3] =  a0 * det;
        return dest;
    };
    
    /**
     * Performs a matrix multiplication
     *
     * @param {mat2} matA First operand
     * @param {mat2} matB Second operand
     * @param {mat2} [dest] mat2 receiving operation result. If not specified result is written to matA
     *
     * @returns {mat2} dest if specified, matA otherwise
     */
    mat2.multiply = function (matA, matB, dest) {
        if (!dest) { dest = matA; }
        var a11 = matA[0],
            a12 = matA[1],
            a21 = matA[2],
            a22 = matA[3];
        dest[0] = a11 * matB[0] + a12 * matB[2];
        dest[1] = a11 * matB[1] + a12 * matB[3];
        dest[2] = a21 * matB[0] + a22 * matB[2];
        dest[3] = a21 * matB[1] + a22 * matB[3];
        return dest;
    };

    /**
     * Rotates a 2x2 matrix by an angle
     *
     * @param {mat2}   mat   The matrix to rotate
     * @param {Number} angle The angle in radians
     * @param {mat2} [dest]  Optional mat2 receiving the result. If omitted mat will be used.
     *
     * @returns {mat2} dest if specified, mat otherwise
     */
    mat2.rotate = function (mat, angle, dest) {
        if (!dest) { dest = mat; }
        var a11 = mat[0],
            a12 = mat[1],
            a21 = mat[2],
            a22 = mat[3],
            s = Math.sin(angle),
            c = Math.cos(angle);
        dest[0] = a11 *  c + a12 * s;
        dest[1] = a11 * -s + a12 * c;
        dest[2] = a21 *  c + a22 * s;
        dest[3] = a21 * -s + a22 * c;
        return dest;
    };

    /**
     * Multiplies the vec2 by the given 2x2 matrix
     *
     * @param {mat2} matrix the 2x2 matrix to multiply against
     * @param {vec2} vec    the vector to multiply
     * @param {vec2} [dest] an optional receiving vector. If not given, vec is used.
     *
     * @returns {vec2} The multiplication result
     **/
    mat2.multiplyVec2 = function(matrix, vec, dest) {
      if (!dest) dest = vec;
      var x = vec[0], y = vec[1];
      dest[0] = x * matrix[0] + y * matrix[1];
      dest[1] = x * matrix[2] + y * matrix[3];
      return dest;
    };
    
    /**
     * Scales the mat2 by the dimensions in the given vec2
     *
     * @param {mat2} matrix the 2x2 matrix to scale
     * @param {vec2} vec    the vector containing the dimensions to scale by
     * @param {vec2} [dest] an optional receiving mat2. If not given, matrix is used.
     *
     * @returns {mat2} dest if specified, matrix otherwise
     **/
    mat2.scale = function(matrix, vec, dest) {
      if (!dest) { dest = matrix; }
      var a11 = matrix[0],
          a12 = matrix[1],
          a21 = matrix[2],
          a22 = matrix[3],
          b11 = vec[0],
          b22 = vec[1];
      dest[0] = a11 * b11;
      dest[1] = a12 * b22;
      dest[2] = a21 * b11;
      dest[3] = a22 * b22;
      return dest;
    };

    /**
     * Returns a string representation of a mat2
     *
     * @param {mat2} mat mat2 to represent as a string
     *
     * @param {String} String representation of mat
     */
    mat2.str = function (mat) {
        return '[' + mat[0] + ', ' + mat[1] + ', ' + mat[2] + ', ' + mat[3] + ']';
    };
    
    /**
     * @class 4 Dimensional Vector
     * @name vec4
     */
    var vec4 = {};
     
    /**
     * Creates a new vec4, initializing it from vec if vec
     * is given.
     *
     * @param {vec4} [vec] the vector's initial contents
     * @returns {vec4} a new 2D vector
     */
    vec4.create = function(vec) {
        var dest = new MatrixArray(4);
        
        if (vec) {
            dest[0] = vec[0];
            dest[1] = vec[1];
            dest[2] = vec[2];
            dest[3] = vec[3];
        } else {
            dest[0] = 0;
            dest[1] = 0;
            dest[2] = 0;
            dest[3] = 0;
        }
        return dest;
    };

    /**
     * Creates a new instance of a vec4, initializing it with the given arguments
     *
     * @param {number} x X value
     * @param {number} y Y value
     * @param {number} z Z value
     * @param {number} w W value

     * @returns {vec4} New vec4
     */
    vec4.createFrom = function (x, y, z, w) {
        var dest = new MatrixArray(4);

        dest[0] = x;
        dest[1] = y;
        dest[2] = z;
        dest[3] = w;

        return dest;
    };
    
    /**
     * Adds the vec4's together. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.add = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] + vecB[0];
      dest[1] = vecA[1] + vecB[1];
      dest[2] = vecA[2] + vecB[2];
      dest[3] = vecA[3] + vecB[3];
      return dest;
    };
    
    /**
     * Subtracts vecB from vecA. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.subtract = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] - vecB[0];
      dest[1] = vecA[1] - vecB[1];
      dest[2] = vecA[2] - vecB[2];
      dest[3] = vecA[3] - vecB[3];
      return dest;
    };
    
    /**
     * Multiplies vecA with vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.multiply = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] * vecB[0];
      dest[1] = vecA[1] * vecB[1];
      dest[2] = vecA[2] * vecB[2];
      dest[3] = vecA[3] * vecB[3];
      return dest;
    };
    
    /**
     * Divides vecA by vecB. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecB.
     *
     * @param {vec4} vecA the first operand
     * @param {vec4} vecB the second operand
     * @param {vec4} [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.divide = function(vecA, vecB, dest) {
      if (!dest) dest = vecB;
      dest[0] = vecA[0] / vecB[0];
      dest[1] = vecA[1] / vecB[1];
      dest[2] = vecA[2] / vecB[2];
      dest[3] = vecA[3] / vecB[3];
      return dest;
    };
    
    /**
     * Scales vecA by some scalar number. If dest is given, the result
     * is stored there. Otherwise, the result is stored in vecA.
     *
     * This is the same as multiplying each component of vecA
     * by the given scalar.
     *
     * @param {vec4}   vecA the vector to be scaled
     * @param {Number} scalar the amount to scale the vector by
     * @param {vec4}   [dest] the optional receiving vector
     * @returns {vec4} dest
     */
    vec4.scale = function(vecA, scalar, dest) {
      if (!dest) dest = vecA;
      dest[0] = vecA[0] * scalar;
      dest[1] = vecA[1] * scalar;
      dest[2] = vecA[2] * scalar;
      dest[3] = vecA[3] * scalar;
      return dest;
    };

    /**
     * Copies the values of one vec4 to another
     *
     * @param {vec4} vec vec4 containing values to copy
     * @param {vec4} dest vec4 receiving copied values
     *
     * @returns {vec4} dest
     */
    vec4.set = function (vec, dest) {
        dest[0] = vec[0];
        dest[1] = vec[1];
        dest[2] = vec[2];
        dest[3] = vec[3];
        return dest;
    };

    /**
     * Compares two vectors for equality within a certain margin of error
     *
     * @param {vec4} a First vector
     * @param {vec4} b Second vector
     *
     * @returns {Boolean} True if a is equivalent to b
     */
    vec4.equal = function (a, b) {
        return a === b || (
            Math.abs(a[0] - b[0]) < FLOAT_EPSILON &&
            Math.abs(a[1] - b[1]) < FLOAT_EPSILON &&
            Math.abs(a[2] - b[2]) < FLOAT_EPSILON &&
            Math.abs(a[3] - b[3]) < FLOAT_EPSILON
        );
    };

    /**
     * Negates the components of a vec4
     *
     * @param {vec4} vec vec4 to negate
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vec
     *
     * @returns {vec4} dest if specified, vec otherwise
     */
    vec4.negate = function (vec, dest) {
        if (!dest) { dest = vec; }
        dest[0] = -vec[0];
        dest[1] = -vec[1];
        dest[2] = -vec[2];
        dest[3] = -vec[3];
        return dest;
    };

    /**
     * Caclulates the length of a vec2
     *
     * @param {vec2} vec vec2 to calculate length of
     *
     * @returns {Number} Length of vec
     */
    vec4.length = function (vec) {
      var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
      return Math.sqrt(x * x + y * y + z * z + w * w);
    };

    /**
     * Caclulates the squared length of a vec4
     *
     * @param {vec4} vec vec4 to calculate squared length of
     *
     * @returns {Number} Squared Length of vec
     */
    vec4.squaredLength = function (vec) {
      var x = vec[0], y = vec[1], z = vec[2], w = vec[3];
      return x * x + y * y + z * z + w * w;
    };

    /**
     * Performs a linear interpolation between two vec4
     *
     * @param {vec4} vecA First vector
     * @param {vec4} vecB Second vector
     * @param {Number} lerp Interpolation amount between the two inputs
     * @param {vec4} [dest] vec4 receiving operation result. If not specified result is written to vecA
     *
     * @returns {vec4} dest if specified, vecA otherwise
     */
    vec4.lerp = function (vecA, vecB, lerp, dest) {
        if (!dest) { dest = vecA; }
        dest[0] = vecA[0] + lerp * (vecB[0] - vecA[0]);
        dest[1] = vecA[1] + lerp * (vecB[1] - vecA[1]);
        dest[2] = vecA[2] + lerp * (vecB[2] - vecA[2]);
        dest[3] = vecA[3] + lerp * (vecB[3] - vecA[3]);
        return dest;
    };

    /**
     * Returns a string representation of a vector
     *
     * @param {vec4} vec Vector to represent as a string
     *
     * @returns {String} String representation of vec
     */
    vec4.str = function (vec) {
        return '[' + vec[0] + ', ' + vec[1] + ', ' + vec[2] + ', ' + vec[3] + ']';
    };

    /*
     * Exports
     */

    if(root) {
        root.glMatrixArrayType = MatrixArray;
        root.MatrixArray = MatrixArray;
        root.setMatrixArrayType = setMatrixArrayType;
        root.determineMatrixArrayType = determineMatrixArrayType;
        root.glMath = glMath;
        root.vec2 = vec2;
        root.vec3 = vec3;
        root.vec4 = vec4;
        root.mat2 = mat2;
        root.mat3 = mat3;
        root.mat4 = mat4;
        root.quat4 = quat4;
    }

    return {
        glMatrixArrayType: MatrixArray,
        MatrixArray: MatrixArray,
        setMatrixArrayType: setMatrixArrayType,
        determineMatrixArrayType: determineMatrixArrayType,
        glMath: glMath,
        vec2: vec2,
        vec3: vec3,
        vec4: vec4,
        mat2: mat2,
        mat3: mat3,
        mat4: mat4,
        quat4: quat4
    };
}));
function ja(b){throw b}var Ha=void 0,Na=!0,Ab=null,Gb=!1;function Hb(){return(function(){})}function Kb(b){return(function(){return b})}try{this.Module=Module}catch(Sb){this.Module=Module={}}var Tb="object"===typeof process,Vb="object"===typeof window,Wb="function"===typeof importScripts,Xb=!Vb&&!Tb&&!Wb;if(Tb){Module.print=(function(b){process.stdout.write(b+"\n")});Module.printErr=(function(b){process.stderr.write(b+"\n")});var dc=require("fs"),hc=require("path");Module.read=(function(b){var b=hc.normalize(b),d=dc.readFileSync(b).toString();!d&&b!=hc.resolve(b)&&(b=path.join(__dirname,"..","src",b),d=dc.readFileSync(b).toString());return d});Module.load=(function(b){ic(read(b))});Module.arguments||(Module.arguments=process.argv.slice(2))}else{Xb?(Module.print=print,"undefined"!=typeof printErr&&(Module.printErr=printErr),Module.read="undefined"!=typeof read?read:(function(b){snarf(b)}),Module.arguments||("undefined"!=typeof scriptArgs?Module.arguments=scriptArgs:"undefined"!=typeof arguments&&(Module.arguments=arguments))):Vb?(Module.print||(Module.print=(function(b){console.log(b)})),Module.printErr||(Module.printErr=(function(b){console.log(b)})),Module.read=(function(b){var d=new XMLHttpRequest;d.open("GET",b,Gb);d.send(Ab);return d.responseText}),Module.arguments||"undefined"!=typeof arguments&&(Module.arguments=arguments)):Wb?Module.load=importScripts:ja("Unknown runtime environment. Where are we?")}function ic(b){eval.call(Ab,b)}"undefined"==!Module.load&&Module.read&&(Module.load=(function(b){ic(Module.read(b))}));Module.print||(Module.print=Hb());Module.printErr||(Module.printErr=Module.print);Module.arguments||(Module.arguments=[]);Module.print=Module.print;Module.gc=Module.printErr;Module.preRun||(Module.preRun=[]);Module.postRun||(Module.postRun=[]);function mc(b){if(1==nc){return 1}var d={"%i1":1,"%i8":1,"%i16":2,"%i32":4,"%i64":8,"%float":4,"%double":8}["%"+b];d||("*"==b[b.length-1]?d=nc:"i"==b[0]&&(b=parseInt(b.substr(1)),rc(0==b%8),d=b/8));return d}var vc;function Bc(){var b=[],d=0;this.hc=(function(e){e&=255;d&&(b.push(e),d--);if(0==b.length){if(128>e){return String.fromCharCode(e)}b.push(e);d=191<e&&224>e?1:2;return""}if(0<d){return""}var e=b[0],f=b[1],g=b[2],e=191<e&&224>e?String.fromCharCode((e&31)<<6|f&63):String.fromCharCode((e&15)<<12|(f&63)<<6|g&63);b.length=0;return e});this.Oh=(function(b){for(var b=unescape(encodeURIComponent(b)),d=[],g=0;g<b.length;g++){d.push(b.charCodeAt(g))}return d})}function Dc(b){var d=a;a+=b;a=a+3>>2<<2;return d}function Kc(b){var d=Rc;Rc+=b;Rc=Rc+3>>2<<2;if(Rc>=Sc){for(;Sc<=Rc;){Sc=2*Sc+4095>>12<<12}var b=c,e=new ArrayBuffer(Sc);c=new Int8Array(e);i=new Int16Array(e);l=new Int32Array(e);ed=new Uint8Array(e);jd=new Uint16Array(e);o=new Uint32Array(e);q=new Float32Array(e);ud=new Float64Array(e);c.set(b)}return d}var nc=4,vd={},Nd,s;function Od(b){Module.print(b+":\n"+Error().stack);ja("Assertion: "+b)}function rc(b,d){b||Od("Assertion failed: "+d)}var Wd=this;function ke(b,d,e,f){function g(b,d){if("string"==d){if(b===Ab||b===Ha||0===b){return 0}h||(h=a);var e=Dc(b.length+1);le(b,e);return e}return"array"==d?(h||(h=a),e=Dc(b.length),me(b,e),e):b}var h=0;try{var j=eval("_"+b)}catch(k){try{j=Wd.Module["_"+b]}catch(m){}}rc(j,"Cannot call unknown function "+b+" (perhaps LLVM optimizations or closure removed it?)");var n=0,b=f?f.map((function(b){return g(b,e[n++])})):[],d=(function(b,d){if("string"==d){return we(b)}rc("array"!=d);return b})(j.apply(Ab,b),d);h&&(a=h);return d}Module.ccall=ke;Module.cwrap=(function(b,d,e){return(function(){return ke(b,d,e,Array.prototype.slice.call(arguments))})});function xe(b,d,e){e=e||"i8";"*"===e[e.length-1]&&(e="i32");switch(e){case"i1":c[b]=d;break;case"i8":c[b]=d;break;case"i16":i[b>>1]=d;break;case"i32":l[b>>2]=d;break;case"i64":l[b>>2]=d;break;case"float":q[b>>2]=d;break;case"double":Ee[0]=d;l[b>>2]=t[0];l[b+4>>2]=t[1];break;default:Od("invalid type for setValue: "+e)}}Module.setValue=xe;function Fe(b,d){d=d||"i8";"*"===d[d.length-1]&&(d="i32");switch(d){case"i1":return c[b];case"i8":return c[b];case"i16":return i[b>>1];case"i32":return l[b>>2];case"i64":return l[b>>2];case"float":return q[b>>2];case"double":return t[0]=l[b>>2],t[1]=l[b+4>>2],Ee[0];default:Od("invalid type for setValue: "+d)}return Ab}Module.getValue=Fe;var Ge=1,v=2;Module.ALLOC_NORMAL=0;Module.ALLOC_STACK=Ge;Module.ALLOC_STATIC=v;function B(b,d,e){var f,g;"number"===typeof b?(f=Na,g=b):(f=Gb,g=b.length);var h="string"===typeof d?d:Ab,e=[Ne,Dc,Kc][e===Ha?v:e](Math.max(g,h?1:d.length));if(f){return Oe(e,g),e}f=0;for(var j;f<g;){var k=b[f];"function"===typeof k&&(k=vd.ji(k));j=h||d[f];0===j?f++:("i64"==j&&(j="i32"),xe(e+f,k,j),f+=mc(j))}return e}Module.allocate=B;function we(b,d){for(var e=new Bc,f="undefined"==typeof d,g="",h=0,j;;){j=ed[b+h];if(f&&0==j){break}g+=e.hc(j);h+=1;if(!f&&h==d){break}}return g}Module.Pointer_stringify=we;Module.Array_stringify=(function(b){for(var d="",e=0;e<b.length;e++){d+=String.fromCharCode(b[e])}return d});var K,Pe=4096,c,ed,i,jd,l,o,q,ud,a,Qe,Rc,Ze=Module.TOTAL_STACK||5242880,Sc=Module.TOTAL_MEMORY||10485760;rc(!!Int32Array&&!!Float64Array&&!!(new Int32Array(1)).subarray&&!!(new Int32Array(1)).set,"Cannot fallback to non-typed array case: Code is too specialized");var gf=new ArrayBuffer(Sc);c=new Int8Array(gf);i=new Int16Array(gf);l=new Int32Array(gf);ed=new Uint8Array(gf);jd=new Uint16Array(gf);o=new Uint32Array(gf);q=new Float32Array(gf);ud=new Float64Array(gf);l[0]=255;rc(255===ed[0]&&0===ed[3],"Typed arrays 2 must be run on a little-endian system");var rf=hf("(null)");Rc=rf.length;for(var sf=0;sf<rf.length;sf++){c[sf]=rf[sf]}Module.HEAP=Ha;Module.HEAP8=c;Module.HEAP16=i;Module.HEAP32=l;Module.HEAPU8=ed;Module.HEAPU16=jd;Module.HEAPU32=o;Module.HEAPF32=q;Module.HEAPF64=ud;Qe=(a=4*Math.ceil(Rc/4))+Ze;var tf=8*Math.ceil(Qe/8);c.subarray(tf);var t=l.subarray(tf>>2),M=q.subarray(tf>>2),Ee=ud.subarray(tf>>3);Qe=tf+8;Rc=Qe+4095>>12<<12;function uf(b){for(;0<b.length;){var d=b.shift(),e=d.fb;"number"===typeof e&&(e=K[e]);e(d.Jh===Ha?Ab:d.Jh)}}var vf=[],wf=[],Mf=[];function Nf(b){for(var d=0;c[b+d];){d++}return d}Module.String_len=Nf;function hf(b,d,e){b=(new Bc).Oh(b);e&&(b.length=e);d||b.push(0);return b}Module.intArrayFromString=hf;Module.intArrayToString=(function(b){for(var d=[],e=0;e<b.length;e++){var f=b[e];255<f&&(f&=255);d.push(String.fromCharCode(f))}return d.join("")});function le(b,d,e){b=hf(b,e);for(e=0;e<b.length;){c[d+e]=b[e],e+=1}}Module.writeStringToMemory=le;function me(b,d){for(var e=0;e<b.length;e++){c[d+e]=b[e]}}Module.writeArrayToMemory=me;var N=[];function Of(b,d){return 0<=b?b:32>=d?2*Math.abs(1<<d-1)+b:Math.pow(2,d)+b}function Pf(b,d){if(0>=b){return b}var e=32>=d?Math.abs(1<<d-1):Math.pow(2,d-1);if(b>=e&&(32>=d||b>e)){b=-2*e+b}return b}var Qf=0,kg={},lg=Gb;function mg(b){Qf++;Module.monitorRunDependencies&&Module.monitorRunDependencies(Qf);b&&(rc(!kg[b]),kg[b]=1)}Module.addRunDependency=mg;function Dg(b){Qf--;Module.monitorRunDependencies&&Module.monitorRunDependencies(Qf);b&&(rc(kg[b]),delete kg[b]);0==Qf&&!lg&&Eg()}Module.removeRunDependency=Dg;Module.preloadedImages={};Module.preloadedAudios={};function Fg(b){var d,e,f=b>>2;l[f]=-1;e=(b+12|0)>>2;l[e]=16;l[f+2]=0;var g=Ne(576);d=(b+4|0)>>2;l[d]=g;Oe(g,36*l[e]|0);var g=l[e]-1|0,h=0<(g|0);a:do{if(h){for(var j=0;;){var k=j+1|0;l[(l[d]+36*j+20|0)>>2]=k;l[(l[d]+36*j+32|0)>>2]=-1;j=l[e]-1|0;if((k|0)>=(j|0)){var m=j;break a}j=k}}else{m=g}}while(0);l[(l[d]+36*m+20|0)>>2]=-1;l[(l[d]+36*(l[e]-1)+32|0)>>2]=-1;d=(b+16|0)>>2;l[d]=0;l[d+1]=0;l[d+2]=0;l[d+3]=0;l[(b+48|0)>>2]=16;l[f+13]=0;b=Ne(192);l[f+11]=b;l[f+9]=16;l[f+10]=0;b=Ne(64);l[f+8]=b}function gh(b,d,e){var f,g=b|0,h=hh(g);f=(b+4|0)>>2;var j=q[d+4>>2]-.10000000149011612,k=l[f]+36*h|0,m=(M[0]=q[d>>2]-.10000000149011612,t[0]),j=(M[0]=j,t[0])|0;l[(k|0)>>2]=0|m;l[(k+4|0)>>2]=j;m=q[d+12>>2]+.10000000149011612;k=l[f]+36*h+8|0;d=(M[0]=q[d+8>>2]+.10000000149011612,t[0]);m=(M[0]=m,t[0])|0;l[(k|0)>>2]=0|d;l[(k+4|0)>>2]=m;l[(l[f]+36*h+16|0)>>2]=e;l[(l[f]+36*h+32|0)>>2]=0;ih(g,h);e=b+28|0;l[e>>2]=l[e>>2]+1|0;e=(b+40|0)>>2;f=l[e];g=b+36|0;b=(b+32|0)>>2;(f|0)==(l[g>>2]|0)&&(d=l[b],l[g>>2]=f<<1,f=Ne(f<<3),l[b]=f,Ch(f,d,l[e]<<2),Dh(d),f=l[e]);l[((f<<2)+l[b]|0)>>2]=h;l[e]=l[e]+1|0;return h}function Eh(b,d,e,f,g){var h,j=b>>2;h=(b+60|0)>>2;l[h]=0;var k=f+12|0,m=q[g+12>>2],n=q[k>>2],p=q[g+8>>2],u=q[f+16>>2],r=m*n-p*u+q[g>>2]-q[e>>2],g=p*n+m*u+q[g+4>>2]-q[e+4>>2],m=q[e+12>>2],n=q[e+8>>2],e=m*r+n*g,r=r*-n+m*g,m=d+12|0,g=o[m>>2],m=o[m+4>>2],n=(t[0]=g,M[0]),p=(t[0]=m,M[0]),w=d+20|0,u=o[w>>2],w=o[w+4>>2],x=(t[0]=u,M[0]),y=(t[0]=w,M[0]),A=x-n,C=y-p,z=A*(x-e)+C*(y-r),D=e-n,E=r-p,G=A*D+C*E,f=q[d+8>>2]+q[f+8>>2],H=0<G;do{if(H){if(0<z){var F=A*A+C*C;0<F||P(N.Pe|0,127,N.je|0,N.Qe|0);var I=1/F,F=e-(n*z+x*G)*I,I=r-(p*z+y*G)*I;if(F*F+I*I<=f*f){F=-C;0>D*F+A*E?(I=C,F=-A):(I=F,F=A);var J=Fh(I*I+F*F);1.1920928955078125e-7>J?J=F:(J=1/J,I*=J,J*=F);l[h]=1;l[j+14]=1;F=b+40|0;I=(M[0]=I,t[0]);J=(M[0]=J,t[0])|0;l[F>>2]=0|I;l[F+4>>2]=J;F=b+48|0;l[F>>2]=g;l[F+4>>2]=m;F=b+16|0;l[F>>2]=0;I=F;c[F]=0;c[I+1|0]=0;c[I+2|0]=1;c[I+3|0]=0;F=k;I=b;J=l[F+4>>2];l[I>>2]=l[F>>2];l[I+4>>2]=J}}else{if(F=e-x,I=r-y,F*F+I*I<=f*f){if(0!=(c[d+45|0]&1)<<24>>24){var L=d+36|0,J=L|0,L=L+4|0,L=l[L>>2],J=(t[0]=l[J>>2],M[0]),L=(t[0]=L,M[0]);if(0<(J-x)*F+(L-y)*I){break}}l[h]=1;l[j+14]=0;q[j+10]=0;q[j+11]=0;I=b+48|0;F=I|0;l[F>>2]=u;F=I+4|0;l[F>>2]=w;F=b+16|0;l[F>>2]=0;I=F;c[F]=1;c[I+1|0]=0;c[I+2|0]=0;c[I+3|0]=0;I=k;J=b;F=I|0;I=I+4|0;L=l[I>>2];I=J|0;l[I>>2]=l[F>>2];F=J+4|0;l[F>>2]=L}}}else{if(D*D+E*E<=f*f){if(0!=(c[d+44|0]&1)<<24>>24&&(F=d+28|0,J=F|0,L=F+4|0,F=l[L>>2],I=(t[0]=l[J>>2],M[0]),F=(t[0]=F,M[0]),0<(n-I)*(n-e)+(p-F)*(p-r))){break}l[h]=1;l[j+14]=0;q[j+10]=0;q[j+11]=0;I=b+48|0;F=I|0;l[F>>2]=g;F=I+4|0;l[F>>2]=m;F=b+16|0;l[F>>2]=0;I=F;c[F]=0;c[I+1|0]=0;c[I+2|0]=0;c[I+3|0]=0;I=k;J=b;F=I|0;F=l[F>>2];I=I+4|0;L=l[I>>2];I=J|0;l[I>>2]=F;F=J+4|0;l[F>>2]=L}}}while(0)}function Gh(b,d,e,f,g,h){var j,k,m,n,p,u,r,w,x,y,A,C,z,D,E,G,H,F,I,J,L,O,R,T,S,U,W,Q,$,ea,sa,Ba,oa,ga,qa,la,Ca,ia,ya,ta,Ia,na,Z,ba,ca,ma,ka,aa,ra,ha,za,X,ua,da,fa,Aa,Qa=g>>2,pa=b>>2,cb=a;a+=84;var Ra;Aa=cb>>2;var Ta=cb+12,$a=cb+36;fa=$a>>2;var va=cb+60;da=va>>2;var Wa=b+132|0,fb=q[f+12>>2],gb=q[h+8>>2],Xa=q[f+8>>2],Ua=q[h+12>>2],Va=fb*gb-Xa*Ua,pb=fb*Ua+Xa*gb,nb=(M[0]=Va,t[0]),La=(M[0]=pb,t[0]),qb=0|nb,bb=La|0,Fa=q[h>>2]-q[f>>2],Ma=q[h+4>>2]-q[f+4>>2],wa=fb*Fa+Xa*Ma,hb=Fa*-Xa+fb*Ma,Ya=(M[0]=wa,t[0]),Za=(M[0]=hb,t[0])|0,Da=Wa|0;l[Da>>2]=0|Ya;var Oa=Wa+4|0;l[Oa>>2]=Za;var ib=b+140|0;l[ib>>2]=qb;l[ib+4>>2]=bb;ua=(b+144|0)>>2;var ab=q[Qa+3];X=(b+140|0)>>2;var Ga=q[Qa+4];za=(Wa|0)>>2;var jb=pb*ab-Va*Ga+wa;ha=(b+136|0)>>2;var Ea=Va*ab+pb*Ga+hb,Pa=b+148|0,Ja=(M[0]=jb,t[0]),db=(M[0]=Ea,t[0])|0;l[Pa>>2]=0|Ja;l[Pa+4>>2]=db;var xa=e+28|0,Sa=b+156|0,Ka=l[xa>>2],tb=l[xa+4>>2];l[Sa>>2]=Ka;l[Sa+4>>2]=tb;var kb=e+12|0,ub=b+164|0,rb=l[kb>>2],Bb=l[kb+4>>2];l[ub>>2]=rb;l[ub+4>>2]=Bb;var lb=e+20|0,yb=b+172|0,xb=l[lb>>2],Ib=l[lb+4>>2];l[yb>>2]=xb;l[yb+4>>2]=Ib;var wb=e+36|0,vb=b+180|0,zb=l[wb>>2],Eb=l[wb+4>>2];l[vb>>2]=zb;l[vb+4>>2]=Eb;var Cb=c[e+44|0]&1,eb=0!=Cb<<24>>24,sb=c[e+45|0],ob=0!=(sb&1)<<24>>24,Db=(t[0]=xb,M[0]),Jb=(t[0]=rb,M[0]),Rb=Db-Jb,Nb=(t[0]=Ib,M[0]),Ob=b+168|0,Lb=(t[0]=Bb,M[0]),Pb=Nb-Lb,Mb=Fh(Rb*Rb+Pb*Pb),Yb=1.1920928955078125e-7>Mb,Zb=(t[0]=Ka,M[0]),ec=(t[0]=tb,M[0]),Ub=(t[0]=zb,M[0]),jc=(t[0]=Eb,M[0]);if(Yb){var Qb=Rb,mb=Pb}else{var cc=1/Mb,Qb=Rb*cc,mb=Pb*cc}var Fb=b+196|0,gc=-Qb;ra=(Fb|0)>>2;q[ra]=mb;aa=(b+200|0)>>2;q[aa]=gc;var wc=mb*(jb-Jb)+(Ea-Lb)*gc;if(eb){var pc=Jb-Zb,qc=Lb-ec,$c=Fh(pc*pc+qc*qc);if(1.1920928955078125e-7>$c){var Ec=pc,sc=qc}else{var kd=1/$c,Ec=pc*kd,sc=qc*kd}var wd=-Ec;q[pa+47]=sc;q[pa+48]=wd;var Lc=0<=Ec*mb-sc*Qb,$b=sc*(jb-Zb)+(Ea-ec)*wd}else{$b=Lc=0}a:do{if(ob){var ac=Ub-Db,oc=jc-Nb,tc=Fh(ac*ac+oc*oc);if(1.1920928955078125e-7>tc){var Nc=ac,ld=oc}else{var Wc=1/tc,Nc=ac*Wc,ld=oc*Wc}var ad=-Nc;ka=(b+204|0)>>2;q[ka]=ld;ma=(b+208|0)>>2;q[ma]=ad;var Xc=0<Qb*ld-mb*Nc,Cc=ld*(jb-Db)+(Ea-Nb)*ad;if(0==(Cb&sb)<<24>>24){var fd=Cc,md=Xc;Ra=39}else{if(Lc&Xc){var nd=0>$b&0>wc;do{if(nd){var Oc=0<=Cc;c[b+248|0]=Oc&1;var gd=b+212|0;if(Oc){var od=gd;break}var pd=gd,Pd=(M[0]=-mb,t[0]),Xd=(M[0]=Qb,t[0]),qd=0|Pd,Qd=Xd|0,Pc=pd|0;ca=Pc>>2;l[ca]=qd;var Ic=pd+4|0;ba=Ic>>2;l[ba]=Qd;var Jc=b+228|0,fc=Jc|0;Z=fc>>2;l[Z]=qd;var hd=Jc+4|0;na=hd>>2;l[na]=Qd;var xd=b+236|0,bd=xd|0;Ia=bd>>2;l[Ia]=qd;var rd=xd+4|0;ta=rd>>2;l[ta]=Qd;Ra=66;break a}c[b+248|0]=1;od=b+212|0}while(0);var ye=Fb,Yd=od,Tc=ye|0;ya=Tc>>2;var xc=l[ya],bc=ye+4|0;ia=bc>>2;var Ed=l[ia],yc=Yd|0;Ca=yc>>2;l[Ca]=xc;var Ac=Yd+4|0;la=Ac>>2;l[la]=Ed;var Zd=b+188|0,$d=b+228|0,cd=Zd|0;qa=cd>>2;var zc=l[qa],kc=Zd+4|0;ga=kc>>2;var Rd=l[ga],Fc=$d|0;oa=Fc>>2;l[oa]=zc;var Qc=$d+4|0;Ba=Qc>>2;l[Ba]=Rd;var Mc=b+204|0,ne=b+236|0,Sd=Mc|0;sa=Sd>>2;var Td=l[sa],Ud=Mc+4|0;ea=Ud>>2;var xf=l[ea];l[ne>>2]=Td;l[ne+4>>2]=xf}else{if(Lc){var Fd=0>$b;do{if(Fd){if(0>wc){c[b+248|0]=0;var oe=b+212|0}else{var He=0<=Cc;c[b+248|0]=He&1;var ae=b+212|0;if(He){var Gc=ae;break}oe=ae}var dd=oe,be=(M[0]=-mb,t[0]),pe=(M[0]=Qb,t[0])|0,Uc=dd|0;$=Uc>>2;l[$]=0|be;var lc=dd+4|0;Q=lc>>2;l[Q]=pe;var Gd=-q[ma],Hd=b+228|0,Re=(M[0]=-q[ka],t[0]),Id=(M[0]=Gd,t[0])|0,Jd=Hd|0;W=Jd>>2;l[W]=0|Re;var qe=Hd+4|0;U=qe>>2;l[U]=Id;var re=-q[aa],Kd=b+236|0,Se=(M[0]=-q[ra],t[0]),Rf=(M[0]=re,t[0])|0;l[Kd>>2]=0|Se;l[Kd+4>>2]=Rf;Ra=66;break a}c[b+248|0]=1;Gc=b+212|0}while(0);var sd=Fb,Vc=Gc,Tc=sd|0;ya=Tc>>2;var Te=l[ya],bc=sd+4|0;ia=bc>>2;var Ue=l[ia],yc=Vc|0;Ca=yc>>2;l[Ca]=Te;Ac=Vc+4|0;la=Ac>>2;l[la]=Ue;var ce=b+188|0,Yc=b+228|0,cd=ce|0;qa=cd>>2;var yd=l[qa],kc=ce+4|0;ga=kc>>2;var $e=l[ga],Fc=Yc|0;oa=Fc>>2;l[oa]=yd;Qc=Yc+4|0;Ba=Qc>>2;l[Ba]=$e;var ze=b+236|0,Zc=sd|0;S=Zc>>2;var Ld=l[S],Md=sd+4|0;T=Md>>2;var de=l[T],zd=ze|0;R=zd>>2;l[R]=Ld;var ee=ze+4|0;O=ee>>2;l[O]=de}else{if(Xc){var yf=0>Cc;do{if(yf){if(0>$b){c[b+248|0]=0;var af=b+212|0}else{var Ie=0<=wc;c[b+248|0]=Ie&1;var zf=b+212|0;if(Ie){var jf=zf;break}af=zf}var bf=af,Sf=(M[0]=-mb,t[0]),kf=(M[0]=Qb,t[0])|0,Uc=bf|0;$=Uc>>2;l[$]=0|Sf;lc=bf+4|0;Q=lc>>2;l[Q]=kf;var Ae=-q[aa],Ad=b+228|0,Af=(M[0]=-q[ra],t[0]),Tf=(M[0]=Ae,t[0])|0,Jd=Ad|0;W=Jd>>2;l[W]=0|Af;qe=Ad+4|0;U=qe>>2;l[U]=Tf;var Gg=-q[pa+48],Hg=b+236|0,ng=(M[0]=-q[pa+47],t[0]),og=(M[0]=Gg,t[0])|0,pg=Hg|0;l[pg>>2]=0|ng;var Bf=Hg+4|0;l[Bf>>2]=og;Ra=66;break a}c[b+248|0]=1;jf=b+212|0}while(0);var Uf=Fb,Vf=jf,Tc=Uf|0;ya=Tc>>2;var Ig=l[ya],bc=Uf+4|0;ia=bc>>2;var Jh=l[ia],yc=Vf|0;Ca=yc>>2;l[Ca]=Ig;Ac=Vf+4|0;la=Ac>>2;l[la]=Jh;var Jg=b+228|0,Uc=Uf|0;$=Uc>>2;var Fj=l[$],lc=Uf+4|0;Q=lc>>2;var Ji=l[Q];l[Jg>>2]=Fj;l[Jg+4>>2]=Ji;var qg=b+204|0,Kh=b+236|0,Zc=qg|0;S=Zc>>2;var Wf=l[S],Md=qg+4|0;T=Md>>2;var Lh=l[T],zd=Kh|0;R=zd>>2;l[R]=Wf;ee=Kh+4|0;O=ee>>2;l[O]=Lh}else{var lf=0>$b|0>wc;do{if(!lf){var rg=0<=Cc;c[b+248|0]=rg&1;var jh=b+212|0;if(!rg){var Mh=jh;break}var Be=Fb,sg=jh,se=Be|0;L=se>>2;var Kg=o[L],fe=Be+4|0;J=fe>>2;var te=o[J],ue=sg|0;I=ue>>2;l[I]=Kg;var ge=sg+4|0;F=ge>>2;l[F]=te;var mf=b+228|0,Pc=mf|0;ca=Pc>>2;l[ca]=Kg;Ic=mf+4|0;ba=Ic>>2;l[ba]=te;var Ki=b+236|0,fc=Ki|0;Z=fc>>2;l[Z]=Kg;hd=Ki+4|0;na=hd>>2;l[na]=te;Ra=66;break a}c[b+248|0]=0;Mh=b+212|0}while(0);var Lg=Mh,tg=(M[0]=-mb,t[0]),kh=(M[0]=Qb,t[0])|0,Uc=Lg|0;$=Uc>>2;l[$]=0|tg;lc=Lg+4|0;Q=lc>>2;l[Q]=kh;var Nh=-q[ma],ug=b+228|0,Oh=(M[0]=-q[ka],t[0]),Ph=(M[0]=Nh,t[0])|0,Jd=ug|0;W=Jd>>2;l[W]=0|Oh;qe=ug+4|0;U=qe>>2;l[U]=Ph;var Mg=-q[pa+48],Ng=b+236|0,Hc=(M[0]=-q[pa+47],t[0]),uc=(M[0]=Mg,t[0])|0,pg=Ng|0;l[pg>>2]=0|Hc;Bf=Ng+4|0;l[Bf>>2]=uc}}}Ra=66}}else{md=fd=0,Ra=39}}while(0);a:do{if(39==Ra){if(eb){var Li=0<=$b;if(Lc){do{if(!Li){var Qh=0<=wc;c[b+248|0]=Qh&1;var Og=b+212|0;if(Qh){var Pg=Og;break}var Qg=Og,Mi=(M[0]=-mb,t[0]),Rh=(M[0]=Qb,t[0]),Rg=Rh|0,Pc=Qg|0;ca=Pc>>2;l[ca]=0|Mi;Ic=Qg+4|0;ba=Ic>>2;l[ba]=Rg;var Sh=Fb,lh=b+228|0,Fc=Sh|0;oa=Fc>>2;var Th=l[oa],Qc=Sh+4|0;Ba=Qc>>2;var Ni=l[Ba],nf=lh|0;H=nf>>2;l[H]=Th;var he=lh+4|0;G=he>>2;l[G]=Ni;var Bd=b+236|0,cf=-(t[0]=Th,M[0]),vg=Bd,Ce=0|(M[0]=cf,t[0]),Cf=Rh|0;l[vg>>2]=Ce;l[vg+4>>2]=Cf;break a}c[b+248|0]=1;Pg=b+212|0}while(0);var td=Fb,Sg=Pg,Tc=td|0;ya=Tc>>2;var Gj=l[ya],bc=td+4|0;ia=bc>>2;var Uh=l[ia],yc=Sg|0;Ca=yc>>2;l[Ca]=Gj;Ac=Sg+4|0;la=Ac>>2;l[la]=Uh;var Oi=b+188|0,wg=b+228|0,cd=Oi|0;qa=cd>>2;var Vh=l[qa],kc=Oi+4|0;ga=kc>>2;var Wh=l[ga],Fc=wg|0;oa=Fc>>2;l[oa]=Vh;Qc=wg+4|0;Ba=Qc>>2;l[Ba]=Wh;var Xh=-q[aa],Yh=b+236|0,Hj=(M[0]=-q[ra],t[0]),Je=(M[0]=Xh,t[0])|0,Xf=Yh|0;l[Xf>>2]=0|Hj;var Yf=Yh+4|0;l[Yf>>2]=Je}else{do{if(Li){var Zh=0<=wc;c[b+248|0]=Zh&1;var Tg=b+212|0;if(!Zh){var mh=Tg;break}var Df=Fb,$h=Tg,se=Df|0;L=se>>2;var Ug=o[L],fe=Df+4|0;J=fe>>2;var ai=o[J],ue=$h|0;I=ue>>2;l[I]=Ug;ge=$h+4|0;F=ge>>2;l[F]=ai;var xg=b+228|0,Pc=xg|0;ca=Pc>>2;l[ca]=Ug;Ic=xg+4|0;ba=Ic>>2;l[ba]=ai;var Pi=b+236|0,df=-(t[0]=Ug,M[0]),nh=Pi,oh=(M[0]=df,t[0]),ph=(M[0]=Qb,t[0])|0,Zf=nh|0;E=Zf>>2;l[E]=0|oh;var Ve=nh+4|0;D=Ve>>2;l[D]=ph;break a}c[b+248|0]=0;mh=b+212|0}while(0);var of=mh,Vg=(M[0]=-mb,t[0]),bi=(M[0]=Qb,t[0])|0,Uc=of|0;$=Uc>>2;l[$]=0|Vg;lc=of+4|0;Q=lc>>2;l[Q]=bi;var Wg=Fb,Xg=b+228|0,We=Wg|0;z=We>>2;var Qi=l[z],ef=Wg+4|0;C=ef>>2;var Ij=l[C],bd=Xg|0;Ia=bd>>2;l[Ia]=Qi;rd=Xg+4|0;ta=rd>>2;l[ta]=Ij;var $f=-q[pa+48],Ef=b+236|0,qh=(M[0]=-q[pa+47],t[0]),ci=(M[0]=$f,t[0])|0,ff=Ef|0;l[ff>>2]=0|qh;var pf=Ef+4|0;l[pf>>2]=ci}}else{var qf=0<=wc;if(ob){if(md){do{if(!qf){var yg=0<=fd;c[b+248|0]=yg&1;var zg=b+212|0;if(yg){var Ff=zg;break}var Yg=zg,Zg=(M[0]=-mb,t[0]),ie=(M[0]=Qb,t[0]),Gf=0|Zg,Hf=ie|0,Pc=Yg|0;ca=Pc>>2;l[ca]=Gf;Ic=Yg+4|0;ba=Ic>>2;l[ba]=Hf;var rh=b+228|0,fc=rh|0;Z=fc>>2;l[Z]=Gf;hd=rh+4|0;na=hd>>2;l[na]=Hf;var Ri=Fb,Si=b+236|0,Zc=Ri|0;S=Zc>>2;var Jj=l[S],Md=Ri+4|0;T=Md>>2;var di=l[T],zd=Si|0;R=zd>>2;l[R]=Jj;ee=Si+4|0;O=ee>>2;l[O]=di;break a}c[b+248|0]=1;Ff=b+212|0}while(0);var ei=Fb,Qk=Ff,Tc=ei|0;ya=Tc>>2;var xn=l[ya],bc=ei+4|0;ia=bc>>2;var Kj=l[ia],yc=Qk|0;Ca=yc>>2;l[Ca]=xn;Ac=Qk+4|0;la=Ac>>2;l[la]=Kj;var Lj=-q[aa],Ti=b+228|0,Ui=(M[0]=-q[ra],t[0]),Rk=(M[0]=Lj,t[0])|0,Sd=Ti|0;sa=Sd>>2;l[sa]=0|Ui;Ud=Ti+4|0;ea=Ud>>2;l[ea]=Rk;var Ke=b+204|0,Mj=b+236|0,fi=Ke|0,Sk=l[fi>>2],Vi=Ke+4|0,Tk=l[Vi>>2],Xf=Mj|0;l[Xf>>2]=Sk;Yf=Mj+4|0;l[Yf>>2]=Tk}else{do{if(qf){var Wi=0<=fd;c[b+248|0]=Wi&1;var Nj=b+212|0;if(!Wi){var Oj=Nj;break}var Pj=Fb,ag=Nj,se=Pj|0;L=se>>2;var gi=o[L],fe=Pj+4|0;J=fe>>2;var If=o[J],ue=ag|0;I=ue>>2;l[I]=gi;ge=ag+4|0;F=ge>>2;l[F]=If;var Xi=b+228|0,Uk=-(t[0]=gi,M[0]),Qj=Xi,Vk=(M[0]=Uk,t[0]),Wk=(M[0]=Qb,t[0])|0,Yi=Qj|0;l[Yi>>2]=0|Vk;var hi=Qj+4|0;l[hi>>2]=Wk;var Rj=b+236|0,Zf=Rj|0;E=Zf>>2;l[E]=gi;Ve=Rj+4|0;D=Ve>>2;l[D]=If;break a}c[b+248|0]=0;Oj=b+212|0}while(0);var Sj=Oj,Tj=(M[0]=-mb,t[0]),$g=(M[0]=Qb,t[0])|0,Uc=Sj|0;$=Uc>>2;l[$]=0|Tj;lc=Sj+4|0;Q=lc>>2;l[Q]=$g;var Xk=-q[pa+52],Zi=b+228|0,Yk=(M[0]=-q[pa+51],t[0]),Zk=(M[0]=Xk,t[0])|0,fi=Zi|0;l[fi>>2]=0|Yk;Vi=Zi+4|0;l[Vi>>2]=Zk;var $i=Fb,Uj=b+236|0,ii=l[$i>>2],$k=l[$i+4>>2],ff=Uj|0;l[ff>>2]=ii;pf=Uj+4|0;l[pf>>2]=$k}}else{c[b+248|0]=qf&1;var aj=b+212|0;if(qf){var al=Fb,bj=aj,se=al|0;L=se>>2;var ji=o[L],fe=al+4|0;J=fe>>2;var bl=l[J],ue=bj|0;I=ue>>2;l[I]=ji;ge=bj+4|0;F=ge>>2;l[F]=bl;var cj=b+228|0,Vj=-(t[0]=ji,M[0]),Wj=cj,ki=(M[0]=Vj,t[0]),pm=(M[0]=Qb,t[0]),qm=0|ki,cl=pm|0,Yi=Wj|0;l[Yi>>2]=qm;hi=Wj+4|0;l[hi>>2]=cl;var bg=b+236|0,Zf=bg|0;E=Zf>>2;l[E]=qm;Ve=bg+4|0;D=Ve>>2;l[D]=cl}else{var li=aj,dl=(M[0]=-mb,t[0]),rm=(M[0]=Qb,t[0])|0,Pc=li|0;ca=Pc>>2;l[ca]=0|dl;Ic=li+4|0;ba=Ic>>2;l[ba]=rm;var dj=Fb,Xj=b+228|0,Fc=dj|0;oa=Fc>>2;var Le=l[oa],Qc=dj+4|0;Ba=Qc>>2;var el=l[Ba],nf=Xj|0;H=nf>>2;l[H]=Le;he=Xj+4|0;G=he>>2;l[G]=el;var Yj=b+236|0,zd=Yj|0;R=zd>>2;l[R]=Le;ee=Yj+4|0;O=ee>>2;l[O]=el}}}}}while(0);A=(g+148|0)>>2;var fl=l[A];y=(b+128|0)>>2;l[y]=fl;var Zj=0<(l[A]|0);a:do{if(Zj){for(var Jf=0;;){var gl=q[ua],ej=q[((Jf<<3)+20>>2)+Qa],$j=q[X],hl=q[((Jf<<3)+24>>2)+Qa],sm=$j*ej+gl*hl+q[ha],fj=(Jf<<3)+b|0,il=(M[0]=gl*ej-$j*hl+q[za],t[0]),ah=(M[0]=sm,t[0])|0,zd=fj|0;R=zd>>2;l[R]=0|il;ee=fj+4|0;O=ee>>2;l[O]=ah;var jl=q[ua],kl=q[((Jf<<3)+84>>2)+Qa],ak=q[X],bk=q[((Jf<<3)+88>>2)+Qa],ll=ak*kl+jl*bk,ml=(Jf<<3)+b+64|0,nl=(M[0]=jl*kl-ak*bk,t[0]),sh=(M[0]=ll,t[0])|0,Da=ml|0;l[Da>>2]=0|nl;Oa=ml+4|0;l[Oa>>2]=sh;var ol=Jf+1|0;if((ol|0)>=(l[A]|0)){break a}Jf=ol}}}while(0);x=(b+244|0)>>2;q[x]=.019999999552965164;var mi=d+60|0;l[mi>>2]=0;var th=b+248|0,bh=l[y],ck=0<(bh|0);a:do{if(ck){for(var pl=q[pa+41],tm=q[Ob>>2],dk=q[pa+53],gj=q[pa+54],uh=0,cg=3.4028234663852886e+38;;){var ek=dk*(q[(uh<<3>>2)+pa]-pl)+gj*(q[((uh<<3)+4>>2)+pa]-tm),ni=ek<cg?ek:cg,hj=uh+1|0;if((hj|0)==(bh|0)){var ch=ni;break a}uh=hj;cg=ni}}else{ch=3.4028234663852886e+38}}while(0);var fk=ch>q[x];a:do{if(!fk){var ij=cb,Ag=b,gk=Ha,ql=Ha,rl=Ha,vh=Ag>>2,jj=Ha,rl=(ij|0)>>2;l[rl]=0;ql=(ij+4|0)>>2;l[ql]=-1;gk=(ij+8|0)>>2;q[gk]=-3.4028234663852886e+38;for(var um=q[vh+54],vm=q[vh+53],qq=l[vh+32],rq=Ag+164|0,Ct=Ag+168|0,yn=Ag+172|0,sq=Ag+176|0,tq=Ag+244|0,uq=Ag+228|0,Dt=Ag+232|0,Et=Ag+236|0,vq=Ag+240|0,je=0,sl=-3.4028234663852886e+38;(je|0)<(qq|0);){var zn=q[((je<<3)+64>>2)+vh],hk=-zn,kj=-q[((je<<3)+68>>2)+vh],An=q[(je<<3>>2)+vh],Bn=q[((je<<3)+4>>2)+vh],wq=(An-q[rq>>2])*hk+(Bn-q[Ct>>2])*kj,xq=(An-q[yn>>2])*hk+(Bn-q[sq>>2])*kj,tl=wq<xq?wq:xq;if(tl>q[tq>>2]){l[rl]=2;l[ql]=je;q[gk]=tl;break}if(0>zn*um+vm*kj){if(-.03490658849477768<=(hk-q[uq>>2])*vm+(kj-q[Dt>>2])*um&tl>sl){jj=9}else{var Cn=sl,jj=10}}else{-.03490658849477768<=(hk-q[Et>>2])*vm+(kj-q[vq>>2])*um&tl>sl?jj=9:(Cn=sl,jj=10)}9==jj&&(l[rl]=2,l[ql]=je,Cn=q[gk]=tl);je=je+1|0;sl=Cn}var Dn=l[Aa],Ft=0==(Dn|0);do{if(Ft){Ra=75}else{var wm=q[Aa+2];if(wm>q[x]){break a}if(wm>.9800000190734863*ch+.0010000000474974513){var ik=o[Aa+1],jk=d+56|0;if(1==(Dn|0)){var En=jk;Ra=77}else{l[jk>>2]=2;var ul=Ta,se=ub|0;L=se>>2;var vl=l[L],fe=ub+4|0;J=fe>>2;var wl=l[J],ue=ul|0;I=ue>>2;l[I]=vl;ge=ul+4|0;F=ge>>2;l[F]=wl;var Bg=Ta+8|0,lj=Bg;c[Bg]=0;var oi=ik&255;c[lj+1|0]=oi;c[lj+2|0]=0;c[lj+3|0]=1;var mj=Ta+12|0,nf=yb|0;H=nf>>2;var nj=l[H],he=yb+4|0;G=he>>2;var kk=l[G],Sd=mj|0;sa=Sd>>2;l[sa]=nj;Ud=mj+4|0;ea=Ud>>2;l[ea]=kk;var lk=Ta+20|0,oj=lk;c[lk]=0;c[oj+1|0]=oi;c[oj+2|0]=0;c[oj+3|0]=1;var xl=ik+1|0,mk=(xl|0)<(l[y]|0)?xl:0,nk=(ik<<3)+b|0,xm=l[nk>>2],yl=l[nk+4>>2],ok=(mk<<3)+b|0,pk=l[ok>>2],pi=l[ok+4>>2],wh=(ik<<3)+b+64|0,qk=l[wh>>2],rk=l[wh+4>>2],zl=mk&255,Al=(t[0]=vl,M[0]),Bl=(t[0]=wl,M[0]),ym=(t[0]=nj,M[0]),Cl=(t[0]=kk,M[0]),xh=ik,pj=zl,yh=xm,qi=yl,qj=pk,rj=pi,sj=qk,ri=rk,tj=ym,Cg=Al,sk=Cl,zh=Bl,tk=oi,Ah=0;Ra=84}}else{Ra=75}}}while(0);75==Ra&&(En=d+56|0,Ra=77);if(77==Ra){l[En>>2]=1;var uj=l[y],zm=1<(uj|0);b:do{if(zm){for(var uk=q[pa+54],dg=q[pa+53],Dl=0,eg=dg*q[pa+16]+uk*q[pa+17],Xe=1;;){var Am=dg*q[((Xe<<3)+64>>2)+pa]+uk*q[((Xe<<3)+68>>2)+pa],Bm=Am<eg,si=Bm?Xe:Dl,Gt=Bm?Am:eg,Fn=Xe+1|0;if((Fn|0)>=(uj|0)){var El=si;break b}Dl=si;eg=Gt;Xe=Fn}}else{El=0}}while(0);var yq=El+1|0,Fl=(yq|0)<(uj|0)?yq:0,Gn=(El<<3)+b|0,zq=Ta,yc=Gn|0;Ca=yc>>2;var Gl=l[Ca],Ac=Gn+4|0;la=Ac>>2;var Hn=l[la];l[zq>>2]=Gl;l[zq+4>>2]=Hn;var In=Ta+8|0,Hl=In;c[In]=0;var Jn=El&255;c[Hl+1|0]=Jn;c[Hl+2|0]=1;c[Hl+3|0]=0;var Il=(Fl<<3)+b|0,Kn=Ta+12|0,Ln=l[Il>>2],Aq=l[Il+4>>2];l[Kn>>2]=Ln;l[Kn+4>>2]=Aq;var Bq=Ta+20|0,Mn=Bq;c[Bq]=0;c[Mn+1|0]=Fl&255;c[Mn+2|0]=1;c[Mn+3|0]=0;var Ht=0==(c[th]&1)<<24>>24,It=(t[0]=Gl,M[0]),Jt=(t[0]=Hn,M[0]),Kt=(t[0]=Ln,M[0]),Lt=(t[0]=Aq,M[0]);if(Ht){var Nn=yb|0,On=yb+4|0,Mt=l[Nn>>2],Nt=l[On>>2],Pn=ub|0,Qn=ub+4|0,Cq=l[Pn>>2],Dq=l[Qn>>2],Ot=-q[aa],Pt=(M[0]=-q[ra],t[0]),Qt=(M[0]=Ot,t[0]),xh=1,pj=0,yh=Mt,qi=Nt,qj=Cq,rj=Dq,sj=Pt,ri=Qt}else{var Nn=ub|0,On=ub+4|0,Pn=yb|0,Qn=yb+4|0,Eq=Fb,xh=0,pj=1,yh=l[Nn>>2],qi=l[On>>2],qj=l[Pn>>2],rj=l[Qn>>2],sj=l[Eq>>2],ri=l[Eq+4>>2]}tj=Kt;Cg=It;sk=Lt;zh=Jt;tk=Jn;Ah=1}var Jl=(t[0]=yh,M[0]),Kl=(t[0]=qi,M[0]),Rt=(t[0]=rj,M[0]),ti=(t[0]=sj,M[0]),ui=(t[0]=ri,M[0]),Rn=-ti,Fq=ui*Jl+Kl*Rn,St=ti*Rt,Tt=(t[0]=qj,M[0]),Sn=-ui,Me=Tt*Sn+St,Vd=ui*Cg+zh*Rn-Fq,Tn=Ta+12|0,vj=ui*tj+sk*Rn-Fq;if(0<Vd){var Ll=0}else{w=$a>>2,r=Ta>>2,l[w]=l[r],l[w+1]=l[r+1],l[w+2]=l[r+2],Ll=1}if(0<vj){var vk=Ll}else{u=($a+12*Ll|0)>>2,p=Tn>>2,l[u]=l[p],l[u+1]=l[p+1],l[u+2]=l[p+2],vk=Ll+1|0}if(0>Vd*vj){var Cd=Vd/(Vd-vj),ve=zh+(sk-zh)*Cd,Un=$a+12*vk|0,Gq=(M[0]=Cg+(tj-Cg)*Cd,t[0]),Hq=(M[0]=ve,t[0])|0,We=Un|0;z=We>>2;l[z]=0|Gq;ef=Un+4|0;C=ef>>2;l[C]=Hq;var Vn=$a+12*vk+8|0,Cm=Vn;c[Vn]=xh&255;c[Cm+1|0]=tk;c[Cm+2|0]=0;c[Cm+3|0]=1;var Wn=vk+1|0}else{Wn=vk}if(2<=(Wn|0)){var Dm=q[fa],Em=q[fa+1],Ml=Dm*Sn+ti*Em-Me,Fm=$a+12|0,Iq=q[Fm>>2],Jq=q[fa+4],Gm=Iq*Sn+ti*Jq-Me;if(0<Ml){var Hm=0}else{n=va>>2,m=$a>>2,l[n]=l[m],l[n+1]=l[m+1],l[n+2]=l[m+2],Hm=1}if(0<Gm){var Nl=Hm}else{k=(va+12*Hm|0)>>2,j=Fm>>2,l[k]=l[j],l[k+1]=l[j+1],l[k+2]=l[j+2],Nl=Hm+1|0}if(0>Ml*Gm){var Kq=Ml/(Ml-Gm),Ut=Em+(Jq-Em)*Kq,Lq=va+12*Nl|0,Vt=(M[0]=Dm+(Iq-Dm)*Kq,t[0]),Wt=(M[0]=Ut,t[0])|0,We=Lq|0;z=We>>2;l[z]=0|Vt;ef=Lq+4|0;C=ef>>2;l[C]=Wt;var Im=va+12*Nl+8|0,Jm=Im;c[Im]=pj;c[Jm+1|0]=c[$a+9|0];c[Jm+2|0]=0;c[Jm+3|0]=1;var Xn=Nl+1|0}else{Xn=Nl}if(2<=(Xn|0)){var Yn=d+40|0;if(Ah){var Zn=Yn;l[Zn>>2]=0|sj;l[Zn+4>>2]=ri|0;var $n=d+48|0,nf=$n|0;H=nf>>2;l[H]=0|yh;he=$n+4|0;G=he>>2;l[G]=qi|0;var ao=q[da],Km=q[da+1],Lm=q[x];if(ti*(ao-Jl)+ui*(Km-Kl)>Lm){var wk=0,bo=Lm}else{var Ol=ao-q[za],Mm=Km-q[ha],co=q[ua],eo=q[X],Mq=Ol*-eo+co*Mm,Nq=d,Xt=(M[0]=co*Ol+eo*Mm,t[0]),Oq=(M[0]=Mq,t[0])|0,bd=Nq|0;Ia=bd>>2;l[Ia]=0|Xt;rd=Nq+4|0;ta=rd>>2;l[ta]=Oq;l[d+16>>2]=l[da+2];wk=1;bo=q[x]}var fo=q[da+3],vi=q[da+4];if(ti*(fo-Jl)+ui*(vi-Kl)>bo){var dh=wk}else{var Pl=fo-q[za],go=vi-q[ha],Nm=q[ua],Om=q[X],ho=Pl*-Om+Nm*go,io=d+20*wk|0,jo=(M[0]=Nm*Pl+Om*go,t[0]),Pq=(M[0]=ho,t[0])|0,Zc=io|0;S=Zc>>2;l[S]=0|jo;Md=io+4|0;T=Md>>2;l[T]=Pq;l[(d+16>>2)+(5*wk|0)]=l[da+5];dh=wk+1|0}}else{var Qq=(xh<<3)+g+84|0,Ql=Yn,Tc=Qq|0;ya=Tc>>2;var Yt=l[ya],bc=Qq+4|0;ia=bc>>2;var Zt=l[ia],yc=Ql|0;Ca=yc>>2;l[Ca]=Yt;Ac=Ql+4|0;la=Ac>>2;l[la]=Zt;var Pm=(xh<<3)+g+20|0,Qm=d+48|0,cd=Pm|0;qa=cd>>2;var Rq=l[qa],kc=Pm+4|0;ga=kc>>2;var ko=l[ga],Fc=Qm|0;oa=Fc>>2;l[oa]=Rq;Qc=Qm+4|0;Ba=Qc>>2;l[Ba]=ko;var Rl=q[x];if(ti*(q[da]-Jl)+ui*(q[da+1]-Kl)>Rl){var xk=0,Rm=Rl}else{var lo=va,mo=d,se=lo|0;L=se>>2;var Sq=l[L],fe=lo+4|0;J=fe>>2;var $t=l[J],ue=mo|0;I=ue>>2;l[I]=Sq;ge=mo+4|0;F=ge>>2;l[F]=$t;var Tq=va+8|0,Sm=Tq,no=d+16|0,yk=no;c[yk+2|0]=c[Sm+3|0];c[yk+3|0]=c[Sm+2|0];c[no]=c[Sm+1|0];c[yk+1|0]=c[Tq];xk=1;Rm=q[x]}var oo=va+12|0;if(ti*(q[oo>>2]-Jl)+ui*(q[da+4]-Kl)>Rm){dh=xk}else{var Tm=oo,po=d+20*xk|0,Tc=Tm|0;ya=Tc>>2;var qo=l[ya],bc=Tm+4|0;ia=bc>>2;var Uq=l[ia],yc=po|0;Ca=yc>>2;l[Ca]=qo;Ac=po+4|0;la=Ac>>2;l[la]=Uq;var ro=va+20|0,Um=ro,Vq=d+20*xk+16|0,zk=Vq;c[zk+2|0]=c[Um+3|0];c[zk+3|0]=c[Um+2|0];c[Vq]=c[Um+1|0];c[zk+1|0]=c[ro];dh=xk+1|0}}l[mi>>2]=dh}}}}while(0);a=cb}function Hh(b,d,e,f,g){var h=d>>2,j=l[h+37],k=q[g+12>>2],m=q[f+12>>2],n=q[g+8>>2],p=q[f+16>>2],u=q[e+12>>2],r=q[h+3],w=q[e+8>>2],x=q[h+4],y=k*m-n*p+q[g>>2]-(u*r-w*x+q[e>>2]),m=n*m+k*p+q[g+4>>2]-(w*r+u*x+q[e+4>>2]),k=u*y+w*m,u=y*-w+u*m,w=0<(j|0);a:do{if(w){y=0;m=-3.4028234663852886e+38;for(n=0;;){if(p=q[((n<<3)+84>>2)+h]*k+q[((n<<3)+88>>2)+h]*u,y=(r=p>m)?n:y,m=r?p:m,n=n+1|0,(n|0)==(j|0)){var A=y;break a}}}else{A=0}}while(0);h=Ih(d,e,A,f,g);k=(0<(A|0)?A:j)-1|0;u=Ih(d,e,k,f,g);w=A+1|0;w=(w|0)<(j|0)?w:0;y=Ih(d,e,w,f,g);m=u>h&u>y;a:do{if(m){n=u;for(p=k;;){r=(0<(p|0)?p:j)-1|0;x=Ih(d,e,r,f,g);if(x<=n){var C=n,z=p;break a}n=x;p=r}}else{if(y>h){n=y;for(p=w;;){r=p+1|0;r=(r|0)<(j|0)?r:0;x=Ih(d,e,r,f,g);if(x<=n){C=n;z=p;break a}n=x;p=r}}else{C=h,z=A}}}while(0);l[b>>2]=z;return C}function Ih(b,d,e,f,g){var f=f>>2,h=b>>2,j=l[f+37];4==(-1<(e|0)?(l[h+37]|0)>(e|0)?5:4:4)&&P(N.Ib|0,32,N.ke|0,N.Eb|0);var b=q[d+12>>2],k=q[((e<<3)+84>>2)+h],m=q[d+8>>2],n=q[((e<<3)+88>>2)+h],p=b*k-m*n,k=m*k+b*n,n=q[g+12>>2],u=q[g+8>>2],r=n*p+u*k,w=p*-u+n*k,x=0<(j|0);a:do{if(x){for(var y=0,A=3.4028234663852886e+38,C=0;;){var z=q[((C<<3)+20>>2)+f]*r+q[((C<<3)+24>>2)+f]*w,D=z<A,y=D?C:y,A=D?z:A,C=C+1|0;if((C|0)==(j|0)){var E=y;break a}}}else{E=0}}while(0);j=q[((e<<3)+20>>2)+h];e=q[((e<<3)+24>>2)+h];h=q[((E<<3)+20>>2)+f];E=q[((E<<3)+24>>2)+f];return(n*h-u*E+q[g>>2]-(b*j-m*e+q[d>>2]))*p+(u*h+n*E+q[g+4>>2]-(m*j+b*e+q[d+4>>2]))*k}function Gi(b,d,e,f,g,h){var j,k=g>>2,m=e>>2,n=d>>2;j=(d+60|0)>>2;var p=0==(l[j]|0);a:do{if(!p){var u=l[n+14];if(0==(u|0)){var r=b|0;q[r>>2]=1;var w=b+4|0;q[w>>2]=0;var x=q[m+3],y=q[n+12],A=q[m+2],C=q[n+13],z=x*y-A*C+q[m],D=A*y+x*C+q[m+1],E=q[k+3],G=q[n],H=q[k+2],F=q[n+1],I=E*G-H*F+q[k],J=H*G+E*F+q[k+1],L=z-I,O=D-J;if(1.4210854715202004e-14<L*L+O*O){var R=I-z,T=J-D,S=b,U=(M[0]=R,t[0]),W=(M[0]=T,t[0])|0;l[S>>2]=0|U;l[S+4>>2]=W;var Q=Fh(R*R+T*T);if(1.1920928955078125e-7>Q){var $=R,ea=T}else{var sa=1/Q,Ba=R*sa;q[r>>2]=Ba;var oa=T*sa;q[w>>2]=oa;$=Ba;ea=oa}}else{$=1,ea=0}var ga=.5*(D+ea*f+(J-ea*h)),qa=b+8|0,la=(M[0]=.5*(z+$*f+(I-$*h)),t[0]),Ca=(M[0]=ga,t[0])|0;l[qa>>2]=0|la;l[qa+4>>2]=Ca}else{if(1==(u|0)){var ia=e+12|0,ya=q[ia>>2],ta=q[n+10],Ia=e+8|0,na=q[Ia>>2],Z=q[n+11],ba=ya*ta-na*Z,ca=na*ta+ya*Z,ma=b,ka=(M[0]=ba,t[0]),aa=(M[0]=ca,t[0])|0,ra=ma|0;l[ra>>2]=0|ka;var ha=ma+4|0;l[ha>>2]=aa;var za=q[ia>>2],X=q[n+12],ua=q[Ia>>2],da=q[n+13],fa=za*X-ua*da+q[m],Aa=ua*X+za*da+q[m+1];if(0<(l[j]|0)){for(var Qa=g+12|0,pa=g+8|0,cb=g|0,Ra=g+4|0,Ta=b|0,$a=b+4|0,va=0,Wa=ba,fb=ca;;){var gb=q[Qa>>2],Xa=q[n+(5*va|0)],Ua=q[pa>>2],Va=q[n+(5*va|0)+1],pb=gb*Xa-Ua*Va+q[cb>>2],nb=Ua*Xa+gb*Va+q[Ra>>2],La=f-((pb-fa)*Wa+(nb-Aa)*fb),qb=.5*(nb+fb*La+(nb-fb*h)),bb=(va<<3)+b+8|0,Fa=(M[0]=.5*(pb+Wa*La+(pb-Wa*h)),t[0]),Ma=(M[0]=qb,t[0])|0,wa=bb|0;l[wa>>2]=0|Fa;var hb=bb+4|0;l[hb>>2]=Ma;var Ya=va+1|0;if((Ya|0)>=(l[j]|0)){break a}va=Ya;Wa=q[Ta>>2];fb=q[$a>>2]}}}else{if(2==(u|0)){var Za=g+12|0,Da=q[Za>>2],Oa=q[n+10],ib=g+8|0,ab=q[ib>>2],Ga=q[n+11],jb=Da*Oa-ab*Ga,Ea=ab*Oa+Da*Ga,Pa=b,Ja=(M[0]=jb,t[0]),db=(M[0]=Ea,t[0])|0,ra=Pa|0;l[ra>>2]=0|Ja;ha=Pa+4|0;l[ha>>2]=db;var xa=q[Za>>2],Sa=q[n+12],Ka=q[ib>>2],tb=q[n+13],kb=xa*Sa-Ka*tb+q[k],ub=Ka*Sa+xa*tb+q[k+1],rb=0<(l[j]|0);b:do{if(rb){for(var Bb=e+12|0,lb=e+8|0,yb=e|0,xb=e+4|0,Ib=b|0,wb=b+4|0,vb=0,zb=jb,Eb=Ea;;){var Cb=q[Bb>>2],eb=q[n+(5*vb|0)],sb=q[lb>>2],ob=q[n+(5*vb|0)+1],Db=Cb*eb-sb*ob+q[yb>>2],Jb=sb*eb+Cb*ob+q[xb>>2],Rb=h-((Db-kb)*zb+(Jb-ub)*Eb),Nb=.5*(Jb-Eb*f+Jb+Eb*Rb),Ob=(vb<<3)+b+8|0,Lb=(M[0]=.5*(Db-zb*f+Db+zb*Rb),t[0]),Pb=(M[0]=Nb,t[0])|0,wa=Ob|0;l[wa>>2]=0|Lb;hb=Ob+4|0;l[hb>>2]=Pb;var Mb=vb+1|0,Yb=q[Ib>>2],Zb=q[wb>>2];if((Mb|0)>=(l[j]|0)){var ec=Yb,Ub=Zb;break b}vb=Mb;zb=Yb;Eb=Zb}}else{ec=jb,Ub=Ea}}while(0);var jc=(M[0]=-ec,t[0]),Qb=(M[0]=-Ub,t[0])|0;l[Pa>>2]=0|jc;l[Pa+4>>2]=Qb}}}}}while(0)}function Hi(b,d,e){var f=d>>2,g=b>>2,h,j=l[f+1];if(0==(j|0)){l[g+4]=d+12|0,l[g+5]=1,q[g+6]=q[f+2]}else{if(2==(j|0)){l[g+4]=d+20|0,l[g+5]=l[f+37],q[g+6]=q[f+2]}else{if(3==(j|0)){j=d+16|0;h=-1<(e|0)?(l[j>>2]|0)>(e|0)?8:7:7;7==h&&P(N.s|0,53,N.ob|0,N.Gf|0);d=d+12|0;h=(e<<3)+l[d>>2]|0;var k=l[(h+4|0)>>2];l[b>>2]=l[(h|0)>>2];l[b+4>>2]=k;h=e+1|0;e=b+8|0;d=l[d>>2];(h|0)<(l[j>>2]|0)?(d=(h<<3)+d|0,j=l[d>>2],d=l[d+4>>2],l[(e|0)>>2]=j,l[(e+4|0)>>2]=d):(j=l[d+4>>2],l[e>>2]=l[d>>2],l[e+4>>2]=j);l[g+4]=b|0;l[g+5]=2;q[g+6]=q[f+2]}else{1==(j|0)?(l[g+4]=d+12|0,l[g+5]=2,q[g+6]=q[f+2]):P(N.s|0,81,N.ob|0,N.l|0)}}}}function Ii(b,d,e){var f,g,h,j,k,m,n,p,u,r,w,x,y,A,C,z,D,E=a;a+=168;var G,H=E+16,F=E+32,I=E+144,J=E+156;l[Cj>>2]=l[Cj>>2]+1|0;var L=e|0,O=e+28|0;D=E>>2;z=(e+56|0)>>2;l[D]=l[z];l[D+1]=l[z+1];l[D+2]=l[z+2];l[D+3]=l[z+3];C=H>>2;A=(e+72|0)>>2;l[C]=l[A];l[C+1]=l[A+1];l[C+2]=l[A+2];l[C+3]=l[A+3];var R,T,S,U,W=F>>2,Q,$=d+4|0,ea=jd[$>>1];if(4>(ea&65535)){var sa=ea}else{P(N.s|0,102,N.Fe|0,N.gh|0),sa=i[$>>1]}var Ba=sa&65535;U=(F+108|0)>>2;l[U]=Ba;var oa=F|0;S=oa>>2;var ga=0==sa<<16>>16;a:do{if(ga){var qa=Ba}else{for(var la=L+20|0,Ca=L+16|0,ia=O+20|0,ya=O+16|0,ta=E+12|0,Ia=E+8|0,na=E|0,Z=E+4|0,ba=H+12|0,ca=H+8|0,ma=H|0,ka=H+4|0,aa=0;;){var ra=oa+36*aa|0,ha=ed[d+(aa+6)|0]&255;l[S+(9*aa|0)+7]=ha;var za=ed[d+(aa+9)|0]&255,X=oa+36*aa+32|0;l[X>>2]=za;if((l[la>>2]|0)>(ha|0)){var ua=za}else{P(N.i|0,103,N.h|0,N.j|0),ua=l[X>>2]}var da=(ha<<3)+l[Ca>>2]|0,fa=l[da+4>>2],Aa=(t[0]=l[da>>2],M[0]),Qa=(t[0]=fa,M[0]);Q=-1<(ua|0)?(l[ia>>2]|0)>(ua|0)?11:10:10;10==Q&&P(N.i|0,103,N.h|0,N.j|0);var pa=(ua<<3)+l[ya>>2]|0,cb=pa|0;T=cb>>2;var Ra=pa+4|0;R=Ra>>2;var Ta=l[R],$a=(t[0]=l[T],M[0]),va=(t[0]=Ta,M[0]),Wa=q[ta>>2],fb=q[Ia>>2],gb=Wa*Aa-fb*Qa+q[na>>2],Xa=fb*Aa+Wa*Qa+q[Z>>2],Ua=ra,Va=(M[0]=gb,t[0]),pb=(M[0]=Xa,t[0])|0;l[Ua>>2]=0|Va;l[Ua+4>>2]=pb;var nb=q[ba>>2],La=q[ca>>2],qb=nb*$a-La*va+q[ma>>2],bb=La*$a+nb*va+q[ka>>2],Fa=oa+36*aa+8|0,Ma=(M[0]=qb,t[0]),wa=(M[0]=bb,t[0])|0;l[Fa>>2]=0|Ma;l[Fa+4>>2]=wa;var hb=q[S+(9*aa|0)+3]-q[S+(9*aa|0)+1],Ya=oa+36*aa+16|0,Za=(M[0]=qb-gb,t[0]),Da=(M[0]=hb,t[0])|0;l[Ya>>2]=0|Za;l[Ya+4>>2]=Da;q[S+(9*aa|0)+6]=0;var Oa=aa+1|0,ib=l[U];if((Oa|0)>=(ib|0)){qa=ib;break a}aa=Oa}}}while(0);var ab=1<(qa|0);a:do{if(ab){var Ga=q[d>>2];if(2==(qa|0)){var jb=q[W+4]-q[W+13],Ea=q[W+5]-q[W+14],Pa=Fh(jb*jb+Ea*Ea)}else{if(3==(qa|0)){var Ja=q[W+4],db=q[W+5],Pa=(q[W+13]-Ja)*(q[W+23]-db)-(q[W+14]-db)*(q[W+22]-Ja)}else{P(N.s|0,259,N.Ma|0,N.l|0),Pa=0}}var xa=Pa<.5*Ga;do{if(!xa&&!(2*Ga<Pa|1.1920928955078125e-7>Pa)){var Sa=l[U];Q=21;break a}}while(0);l[U]=0;Q=22}else{Sa=qa,Q=21}}while(0);21==Q&&(Q=0==(Sa|0)?22:27);if(22==Q){l[W+7]=0;l[W+8]=0;0<(l[L+20>>2]|0)||P(N.i|0,103,N.h|0,N.j|0);var Ka=l[L+16>>2],cb=Ka|0;T=cb>>2;Ra=Ka+4|0;R=Ra>>2;var tb=l[R],kb=(t[0]=l[T],M[0]),ub=(t[0]=tb,M[0]);0<(l[O+20>>2]|0)||P(N.i|0,103,N.h|0,N.j|0);var rb=l[O+16>>2],cb=rb|0;T=cb>>2;Ra=rb+4|0;R=Ra>>2;var Bb=l[R],lb=(t[0]=l[T],M[0]),yb=(t[0]=Bb,M[0]),xb=q[E+12>>2],Ib=q[E+8>>2],wb=xb*kb-Ib*ub+q[E>>2],vb=Ib*kb+xb*ub+q[E+4>>2],zb=(M[0]=wb,t[0]),Eb=(M[0]=vb,t[0])|0;l[F>>2]=0|zb;l[F+4>>2]=Eb;var Cb=q[H+12>>2],eb=q[H+8>>2],sb=Cb*lb-eb*yb+q[H>>2],ob=eb*lb+Cb*yb+q[H+4>>2],Db=F+8|0,Jb=(M[0]=sb,t[0]),Rb=(M[0]=ob,t[0])|0;l[Db>>2]=0|Jb;l[Db+4>>2]=Rb;var Nb=ob-vb,Ob=F+16|0,Lb=(M[0]=sb-wb,t[0]),Pb=(M[0]=Nb,t[0])|0;l[Ob>>2]=0|Lb;l[Ob+4>>2]=Pb;l[U]=1}var Mb=F|0;y=Mb>>2;x=(F+108|0)>>2;var Yb=l[x];0==(Yb|0)?P(N.s|0,194,N.oa|0,N.l|0):1==(Yb|0)||2==(Yb|0)||3==(Yb|0)||P(N.s|0,207,N.oa|0,N.l|0);var Zb=E+12|0,ec=E+8|0,Ub=e+16|0,jc=e+20|0,Qb=E|0,mb=E+4|0,cc=H+12|0,Fb=H+8|0,gc=e+44|0,wc=e+48|0,pc=H|0,qc=H+4|0;w=(F+16|0)>>2;r=(F+20|0)>>2;u=(F+52|0)>>2;p=(F+56|0)>>2;var $c=F+16|0,Ec=F+52|0,sc=F+24|0,kd=F+60|0,wd=F+36|0,Lc=0;a:for(;;){if(20<=(Lc|0)){var $b=Lc;break}var ac=o[x],oc=0<(ac|0);b:do{if(oc){for(var tc=0;;){l[I+(tc<<2)>>2]=l[y+(9*tc|0)+7];l[J+(tc<<2)>>2]=l[y+(9*tc|0)+8];var Nc=tc+1|0;if((Nc|0)==(ac|0)){break b}tc=Nc}}else{G=9}}while(0);if(1==(ac|0)){G=20}else{if(2==(ac|0)){var ld=l[$c+4>>2],Wc=(t[0]=l[$c>>2],M[0]),ad=(t[0]=ld,M[0]),Xc=l[Ec+4>>2],Cc=(t[0]=l[Ec>>2],M[0]),fd=(t[0]=Xc,M[0]),md=Cc-Wc,nd=fd-ad,Oc=Wc*md+ad*nd,gd=-Oc;if(0>Oc){var od=Cc*md+fd*nd;if(0<od){var pd=1/(od-Oc);q[sc>>2]=od*pd;q[kd>>2]=pd*gd;l[x]=2;var Pd=Cc,Xd=Wc;G=25}else{q[kd>>2]=1;l[x]=1;for(var qd=wd>>2,Qd=F>>2,Pc=qd+9;qd<Pc;qd++,Qd++){l[Qd]=l[qd]}G=17}}else{q[sc>>2]=1;l[x]=1;var Ic=Wc;G=24}}else{if(3==(ac|0)){var Jc=F,fc=Jc>>2,hd=Jc+16|0,xd=l[hd+4>>2],bd=(t[0]=l[hd>>2],M[0]),rd=(t[0]=xd,M[0]),ye=Jc+36|0,Yd=Jc+52|0,Tc=l[Yd+4>>2],xc=(t[0]=l[Yd>>2],M[0]),bc=(t[0]=Tc,M[0]),Ed=Jc+72|0,yc=Jc+88|0,Ac=l[yc+4>>2],Zd=(t[0]=l[yc>>2],M[0]),$d=(t[0]=Ac,M[0]),cd=xc-bd,zc=bc-rd,kc=bd*cd+rd*zc,Rd=xc*cd+bc*zc,Fc=-kc,Qc=Zd-bd,Mc=$d-rd,ne=bd*Qc+rd*Mc,Sd=Zd*Qc+$d*Mc,Td=-ne,Ud=Zd-xc,xf=$d-bc,Fd=xc*Ud+bc*xf,oe=Zd*Ud+$d*xf,He=-Fd,ae=cd*Mc-zc*Qc,Gc=ae*(xc*$d-bc*Zd),dd=ae*(Zd*rd-$d*bd),be=ae*(bd*bc-rd*xc);if(0>kc|0>ne){if(0<=kc|0>=Rd|0<be){if(0<=ne|0>=Sd|0<dd){if(0<Rd|0>Fd){if(0<Sd|0<oe){if(0<=Fd|0>=oe|0<Gc){var pe=1/(Gc+dd+be);q[fc+6]=Gc*pe;q[fc+15]=dd*pe;q[fc+24]=be*pe;l[fc+27]=3}else{var Uc=1/(oe-Fd);q[fc+15]=oe*Uc;q[fc+24]=Uc*He;l[fc+27]=2;for(var lc=Ed>>2,Gd=Jc>>2,Hd=lc+9;lc<Hd;lc++,Gd++){l[Gd]=l[lc]}}}else{q[fc+24]=1;l[fc+27]=1;lc=Ed>>2;Gd=Jc>>2;for(Hd=lc+9;lc<Hd;lc++,Gd++){l[Gd]=l[lc]}}}else{q[fc+15]=1;l[fc+27]=1;lc=ye>>2;Gd=Jc>>2;for(Hd=lc+9;lc<Hd;lc++,Gd++){l[Gd]=l[lc]}}}else{var Re=1/(Sd-ne);q[fc+6]=Sd*Re;q[fc+24]=Re*Td;l[fc+27]=2;lc=Ed>>2;Gd=ye>>2;for(Hd=lc+9;lc<Hd;lc++,Gd++){l[Gd]=l[lc]}}}else{var Id=1/(Rd-kc);q[fc+6]=Rd*Id;q[fc+15]=Id*Fc;l[fc+27]=2}}else{q[fc+6]=1,l[fc+27]=1}}else{P(N.s|0,498,N.he|0,N.l|0)}G=17}}do{if(17==G){var Jd=l[x];if(3==(Jd|0)){$b=Lc;break a}else{if(0==(Jd|0)){P(N.s|0,194,N.oa|0,N.l|0),G=20}else{if(1==(Jd|0)||2==(Jd|0)){var qe=Jd;G=21}else{P(N.s|0,207,N.oa|0,N.l|0),G=20}}}}}while(0);20==G&&(qe=l[x],G=21);if(21==G){if(1==(qe|0)){Ic=q[w],G=24}else{if(2==(qe|0)){Pd=q[u],Xd=q[w],G=25}else{P(N.s|0,184,N.Oe|0,N.l|0);var re=Dj,Kd=l[re+4>>2],Se=(t[0]=l[re>>2],M[0]),Rf=(t[0]=Kd,M[0]),sd=Se,Vc=Rf;G=29}}}if(24==G){sd=-Ic,Vc=-q[r]}else{if(25==G){var Te=Pd-Xd,Ue=q[r],ce=q[p]-Ue;0<Te*-Ue-ce*-Xd?(sd=-1*ce,Vc=Te):(sd=ce,Vc=-1*Te)}}if(1.4210854715202004e-14>sd*sd+Vc*Vc){$b=Lc;break}var Yc=o[x],yd=Mb+36*Yc|0,$e=-Vc,ze=q[Zb>>2],Zc=q[ec>>2],Ld=ze*-sd+Zc*$e,Md=sd*Zc+ze*$e,de=l[Ub>>2];n=de>>2;var zd=l[jc>>2],ee=1<(zd|0);do{if(ee){for(var yf=0,af=q[n]*Ld+q[n+1]*Md,Ie=1;;){var zf=q[(Ie<<3>>2)+n]*Ld+q[((Ie<<3)+4>>2)+n]*Md,jf=zf>af,bf=jf?Ie:yf,Sf=jf?zf:af,kf=Ie+1|0;if((kf|0)==(zd|0)){break}yf=bf;af=Sf;Ie=kf}var Ae=Mb+36*Yc+28|0;l[Ae>>2]=bf;var Ad=yd|0;if(-1<(bf|0)){ng=bf,og=Ae,pg=Ad,G=35}else{var Af=bf,Tf=Ae,Gg=Ad;G=36}}else{var Hg=Mb+36*Yc+28|0,ng=l[Hg>>2]=0,og=Hg,pg=yd|0;G=35}}while(0);if(35==G){if((zd|0)>(ng|0)){var Bf=ng,Uf=og,Vf=pg,Ig=de;G=37}else{Af=ng,Tf=og,Gg=pg,G=36}}36==G&&(P(N.i|0,103,N.h|0,N.j|0),Bf=Af,Uf=Tf,Vf=Gg,Ig=l[Ub>>2]);var Jh=q[Ig+(Bf<<3)>>2],Jg=q[Ig+(Bf<<3)+4>>2],Fj=Zc*Jh+ze*Jg+q[mb>>2],Ji=yd,qg=(M[0]=ze*Jh-Zc*Jg+q[Qb>>2],t[0]),Kh=(M[0]=Fj,t[0])|0,Wf=Ji|0;l[Wf>>2]=0|qg;var Lh=Ji+4|0;l[Lh>>2]=Kh;var lf=q[cc>>2],rg=q[Fb>>2],jh=lf*sd+rg*Vc,Mh=sd*-rg+lf*Vc,Be=l[gc>>2];m=Be>>2;var sg=l[wc>>2],se=1<(sg|0);do{if(se){for(var Kg=0,fe=q[m]*jh+q[m+1]*Mh,te=1;;){var ue=q[(te<<3>>2)+m]*jh+q[((te<<3)+4>>2)+m]*Mh,ge=ue>fe,mf=ge?te:Kg,Ki=ge?ue:fe,Lg=te+1|0;if((Lg|0)==(sg|0)){break}Kg=mf;fe=Ki;te=Lg}var tg=Mb+36*Yc+32|0;l[tg>>2]=mf;var kh=Mb+36*Yc+8|0;if(-1<(mf|0)){Mg=mf,Ng=tg,Hc=kh,G=42}else{var Nh=mf,ug=tg,Oh=kh;G=43}}else{var Ph=Mb+36*Yc+32|0,Mg=l[Ph>>2]=0,Ng=Ph,Hc=Mb+36*Yc+8|0;G=42}}while(0);if(42==G){if((sg|0)>(Mg|0)){var uc=Mg,Li=Ng,Qh=Hc,Og=Be;G=44}else{Nh=Mg,ug=Ng,Oh=Hc,G=43}}43==G&&(P(N.i|0,103,N.h|0,N.j|0),uc=Nh,Li=ug,Qh=Oh,Og=l[gc>>2]);var Pg=q[Og+(uc<<3)>>2],Qg=q[Og+(uc<<3)+4>>2],Mi=lf*Pg-rg*Qg+q[pc>>2],Rh=rg*Pg+lf*Qg+q[qc>>2],Rg=Qh,Sh=(M[0]=Mi,t[0]),lh=(M[0]=Rh,t[0])|0,Wf=Rg|0;l[Wf>>2]=0|Sh;Lh=Rg+4|0;l[Lh>>2]=lh;var Th=Rh-q[Vf+4>>2],Ni=Mb+36*Yc+16|0,nf=(M[0]=Mi-q[Vf>>2],t[0]),he=(M[0]=Th,t[0])|0;l[Ni>>2]=0|nf;l[Ni+4>>2]=he;var Bd=Lc+1|0;l[Ej>>2]=l[Ej>>2]+1|0;for(var cf=0;(cf|0)<(ac|0);){if((l[Uf>>2]|0)==(l[I+(cf<<2)>>2]|0)&&(l[Li>>2]|0)==(l[J+(cf<<2)>>2]|0)){$b=Bd;break a}cf=cf+1|0}l[x]=l[x]+1|0;Lc=Bd}var vg=l[Ak>>2];l[Ak>>2]=(vg|0)>($b|0)?vg:$b;var Ce=b+8|0,Cf=b|0,td=F>>2,Sg=l[td+27];if(0==(Sg|0)){P(N.s|0,217,N.zb|0,N.l|0)}else{if(1==(Sg|0)){var Gj=l[F+4>>2];l[Cf>>2]=l[F>>2];l[Cf+4>>2]=Gj;var Uh=F+8|0,Oi=l[Uh+4>>2];l[Ce>>2]=l[Uh>>2];l[Ce+4>>2]=Oi}else{if(2==(Sg|0)){var wg=F+24|0,Vh=q[wg>>2],Wh=F+60|0,Xh=q[Wh>>2],Yh=q[td+1]*Vh+q[td+10]*Xh,Hj=(M[0]=q[td]*Vh+q[td+9]*Xh,t[0]),Je=(M[0]=Yh,t[0])|0;l[Cf>>2]=0|Hj;l[Cf+4>>2]=Je;var Xf=q[wg>>2],Yf=q[Wh>>2],Zh=q[td+3]*Xf+q[td+12]*Yf,Tg=(M[0]=q[td+2]*Xf+q[td+11]*Yf,t[0]),mh=(M[0]=Zh,t[0])|0;l[Ce>>2]=0|Tg;l[Ce+4>>2]=mh}else{if(3==(Sg|0)){var Df=q[td+6],$h=q[td+15],Ug=q[td+24],ai=q[td+1]*Df+q[td+10]*$h+q[td+19]*Ug,xg=(M[0]=q[td]*Df+q[td+9]*$h+q[td+18]*Ug,t[0]),Pi=(M[0]=ai,t[0]),df=0|xg,nh=Pi|0;l[Cf>>2]=df;l[Cf+4>>2]=nh;l[Ce>>2]=df;l[Ce+4>>2]=nh}else{P(N.s|0,236,N.zb|0,N.l|0)}}}}k=(b|0)>>2;j=(Ce|0)>>2;var oh=q[k]-q[j];h=(b+4|0)>>2;g=(b+12|0)>>2;var ph=q[h]-q[g],Zf=Fh(oh*oh+ph*ph);f=(b+16|0)>>2;q[f]=Zf;l[b+20>>2]=$b;var Ve=l[x];if(0==(Ve|0)){P(N.s|0,246,N.Ma|0,N.l|0);var of=0}else{if(1==(Ve|0)){of=0}else{if(2==(Ve|0)){var Vg=q[w]-q[u],bi=q[r]-q[p],of=Fh(Vg*Vg+bi*bi)}else{if(3==(Ve|0)){var Wg=q[w],Xg=q[r],of=(q[u]-Wg)*(q[F+92>>2]-Xg)-(q[p]-Xg)*(q[F+88>>2]-Wg)}else{P(N.s|0,259,N.Ma|0,N.l|0),of=0}}}}q[d>>2]=of;var We=l[x];i[d+4>>1]=We&65535;var Qi=0<(We|0);a:do{if(Qi){for(var ef=0;;){c[d+(ef+6)|0]=l[y+(9*ef|0)+7]&255;c[d+(ef+9)|0]=l[y+(9*ef|0)+8]&255;var Ij=ef+1|0;if((Ij|0)>=(We|0)){break a}ef=Ij}}}while(0);if(0!=(c[e+88|0]&1)<<24>>24){var $f=q[e+24>>2],Ef=q[e+52>>2],qh=q[f],ci=$f+Ef;if(qh>ci&1.1920928955078125e-7<qh){q[f]=qh-ci;var ff=q[j],pf=q[k],qf=ff-pf,yg=q[g],zg=q[h],Ff=yg-zg,Yg=Fh(qf*qf+Ff*Ff);if(1.1920928955078125e-7>Yg){var Zg=qf,ie=Ff}else{var Gf=1/Yg,Zg=qf*Gf,ie=Ff*Gf}var Hf=ie*$f;q[k]=pf+Zg*$f;q[h]=zg+Hf;var rh=ie*Ef;q[j]=ff-Zg*Ef;q[g]=yg-rh}else{var Ri=.5*(q[h]+q[g]),Si=(M[0]=.5*(q[k]+q[j]),t[0]),Jj=(M[0]=Ri,t[0]),di=0|Si,ei=Jj|0;l[b>>2]=di;l[b+4>>2]=ei;l[Ce>>2]=di;l[Ce+4>>2]=ei;q[f]=0}}a=E}function hh(b){var d,e,f,g;g=(b+16|0)>>2;var h=l[g];if(-1==(h|0)){h=b+8|0;f=h>>2;d=(b+12|0)>>2;e=l[d];if((l[f]|0)==(e|0)){var j=e}else{P(N.c|0,61,N.ne|0,N.cf|0),j=l[d]}b=b+4|0;e=b>>2;var k=l[e];l[d]=j<<1;j=Ne(72*j|0);l[e]=j;Ch(j,k,36*l[f]|0);Dh(k);var j=l[f],k=l[d]-1|0,m=(j|0)<(k|0);a:do{if(m){for(var n=j;;){var p=n+1|0;l[(l[e]+36*n+20|0)>>2]=p;l[(l[e]+36*n+32|0)>>2]=-1;n=l[d]-1|0;if((p|0)>=(n|0)){var u=n;break a}n=p}}else{u=k}}while(0);l[(l[e]+36*u+20|0)>>2]=-1;l[(l[e]+36*(l[d]-1)+32|0)>>2]=-1;u=l[f];l[g]=u;d=b>>2}else{u=h,d=(b+4|0)>>2,h=b+8|0}f=l[d]+36*u+20|0;l[g]=l[f>>2];l[f>>2]=-1;l[(l[d]+36*u+24|0)>>2]=-1;l[(l[d]+36*u+28|0)>>2]=-1;l[(l[d]+36*u+32|0)>>2]=0;l[(l[d]+36*u+16|0)>>2]=0;l[h>>2]=l[h>>2]+1|0;return u}function ih(b,d){var e,f,g,h,j;h=b+24|0;l[h>>2]=l[h>>2]+1|0;j=(b|0)>>2;var k=l[j],m=-1==(k|0);a:do{if(m){l[j]=d,l[(l[b+4>>2]+36*d+20|0)>>2]=-1}else{h=(b+4|0)>>2;g=l[h]>>2;var n=q[g+(9*d|0)];e=q[g+(9*d|0)+1];for(var p=q[g+(9*d|0)+2],u=q[g+(9*d|0)+3],r=k;;){var w=l[g+(9*r|0)+6];if(-1==(w|0)){break}var x=l[g+(9*r|0)+7],y=q[g+(9*r|0)+2],A=q[g+(9*r|0)],C=q[g+(9*r|0)+3],z=q[g+(9*r|0)+1],D=2*((y>p?y:p)-(A<n?A:n)+((C>u?C:u)-(z<e?z:e)));f=2*D;var y=2*(D-2*(y-A+(C-z))),A=q[g+(9*w|0)],C=n<A?n:A,z=q[g+(9*w|0)+1],D=e<z?e:z,E=q[g+(9*w|0)+2],G=p>E?p:E,H=q[g+(9*w|0)+3],F=u>H?u:H,A=(-1==(l[g+(9*w|0)+6]|0)?2*(G-C+(F-D)):2*(G-C+(F-D))-2*(E-A+(H-z)))+y,C=q[g+(9*x|0)],z=n<C?n:C,D=q[g+(9*x|0)+1],E=e<D?e:D,G=q[g+(9*x|0)+2],H=p>G?p:G,F=q[g+(9*x|0)+3],I=u>F?u:F,y=(-1==(l[g+(9*x|0)+6]|0)?2*(H-z+(I-E)):2*(H-z+(I-E))-2*(G-C+(F-D)))+y;if(f<A&f<y){break}r=A<y?w:x}g=l[g+(9*r|0)+5];w=hh(b);l[(l[h]+36*w+20|0)>>2]=g;l[(l[h]+36*w+16|0)>>2]=0;x=l[h];f=x>>2;y=q[f+(9*r|0)];A=q[f+(9*r|0)+1];A=e<A?e:A;e=x+36*w|0;n=(M[0]=n<y?n:y,t[0]);y=(M[0]=A,t[0])|0;l[(e|0)>>2]=0|n;l[(e+4|0)>>2]=y;n=q[f+(9*r|0)+2];e=q[f+(9*r|0)+3];u=u>e?u:e;e=x+36*w+8|0;p=(M[0]=p>n?p:n,t[0]);u=(M[0]=u,t[0])|0;l[(e|0)>>2]=0|p;l[(e+4|0)>>2]=u;p=l[h];l[(p+36*w+32|0)>>2]=l[(p+32>>2)+(9*r|0)]+1|0;p=l[h];-1==(g|0)?(l[(p+36*w+24|0)>>2]=r,l[(l[h]+36*w+28|0)>>2]=d,l[(l[h]+36*r+20|0)>>2]=w,l[(l[h]+36*d+20|0)>>2]=w,l[j]=w):(u=p+36*g+24|0,(l[u>>2]|0)==(r|0)?l[u>>2]=w:l[(p+36*g+28|0)>>2]=w,l[(l[h]+36*w+24|0)>>2]=r,l[(l[h]+36*w+28|0)>>2]=d,l[(l[h]+36*r+20|0)>>2]=w,l[(l[h]+36*d+20|0)>>2]=w);r=l[(l[h]+20>>2)+(9*d|0)];if(-1!=(r|0)){for(;;){if(r=Mk(b,r),u=l[h],p=l[(u+24>>2)+(9*r|0)],u=l[(u+28>>2)+(9*r|0)],-1==(p|0)&&P(N.c|0,307,N.jb|0,N.ph|0),-1==(u|0)&&P(N.c|0,308,N.jb|0,N.uh|0),n=l[h],e=l[(n+32>>2)+(9*p|0)],g=l[(n+32>>2)+(9*u|0)],l[(n+36*r+32|0)>>2]=((e|0)>(g|0)?e:g)+1|0,n=l[h],e=n>>2,g=q[e+(9*p|0)],w=q[e+(9*u|0)],x=q[e+(9*p|0)+1],f=q[e+(9*u|0)+1],f=x<f?x:f,x=n+36*r|0,g=(M[0]=g<w?g:w,t[0]),w=(M[0]=f,t[0])|0,l[(x|0)>>2]=0|g,l[(x+4|0)>>2]=w,g=q[e+(9*p|0)+2],w=q[e+(9*u|0)+2],p=q[e+(9*p|0)+3],u=q[e+(9*u|0)+3],p=p>u?p:u,u=n+36*r+8|0,n=(M[0]=g>w?g:w,t[0]),p=(M[0]=p,t[0])|0,l[(u|0)>>2]=0|n,l[(u+4|0)>>2]=p,r=l[(l[h]+20>>2)+(9*r|0)],-1==(r|0)){break a}}}}}while(0)}function Nk(b,d){var e,f,g=-1<(d|0);e=g?(l[b+12>>2]|0)>(d|0)?5:4:4;4==e&&P(N.c|0,126,N.kb|0,N.o|0);f=(b+4|0)>>2;-1!=(l[(l[f]+24>>2)+(9*d|0)]|0)&&P(N.c|0,127,N.kb|0,N.Tb|0);Ok(b,d);e=g?(l[b+12>>2]|0)>(d|0)?10:9:9;9==e&&P(N.c|0,97,N.G|0,N.Z|0);e=(b+8|0)>>2;0<(l[e]|0)||P(N.c|0,98,N.G|0,N.Ba|0);g=b+16|0;l[(l[f]+36*d+20|0)>>2]=l[g>>2];l[(l[f]+36*d+32|0)>>2]=-1;l[g>>2]=d;l[e]=l[e]-1|0}function Ok(b,d){var e,f,g,h,j,k;k=(b|0)>>2;var m=(l[k]|0)==(d|0);a:do{if(m){l[k]=-1}else{j=(b+4|0)>>2;f=l[j];h=f>>2;var n=l[h+(9*d|0)+5];g=l[h+(9*n|0)+5];e=l[h+(9*n|0)+6];h=(e|0)==(d|0)?l[h+(9*n|0)+7]:e;if(-1==(g|0)){l[k]=h,l[(f+36*h+20|0)>>2]=-1,f=-1<(n|0)?(l[b+12>>2]|0)>(n|0)?20:19:19,19==f&&P(N.c|0,97,N.G|0,N.Z|0),g=(b+8|0)>>2,0<(l[g]|0)||P(N.c|0,98,N.G|0,N.Ba|0),f=b+16|0,l[(l[j]+36*n+20|0)>>2]=l[f>>2],l[(l[j]+36*n+32|0)>>2]=-1,l[f>>2]=n,l[g]=l[g]-1|0}else{e=f+36*g+24|0;(l[e>>2]|0)==(n|0)?l[e>>2]=h:l[(f+36*g+28|0)>>2]=h;l[(l[j]+36*h+20|0)>>2]=g;f=-1<(n|0)?(l[b+12>>2]|0)>(n|0)?13:12:12;12==f&&P(N.c|0,97,N.G|0,N.Z|0);f=(b+8|0)>>2;0<(l[f]|0)||P(N.c|0,98,N.G|0,N.Ba|0);h=b+16|0;l[(l[j]+36*n+20|0)>>2]=l[h>>2];l[(l[j]+36*n+32|0)>>2]=-1;l[h>>2]=n;l[f]=l[f]-1|0;for(n=g;;){n=Mk(b,n);h=l[j];e=h>>2;f=l[e+(9*n|0)+6];g=l[e+(9*n|0)+7];var p=q[e+(9*f|0)],u=q[e+(9*g|0)],r=q[e+(9*f|0)+1],w=q[e+(9*g|0)+1],w=r<w?r:w,r=h+36*n|0,p=(M[0]=p<u?p:u,t[0]),u=(M[0]=w,t[0])|0;l[(r|0)>>2]=0|p;l[(r+4|0)>>2]=u;p=q[e+(9*f|0)+2];u=q[e+(9*g|0)+2];r=q[e+(9*f|0)+3];e=q[e+(9*g|0)+3];e=r>e?r:e;h=h+36*n+8|0;p=(M[0]=p>u?p:u,t[0]);e=(M[0]=e,t[0])|0;l[(h|0)>>2]=0|p;l[(h+4|0)>>2]=e;h=l[j];f=l[(h+32>>2)+(9*f|0)];g=l[(h+32>>2)+(9*g|0)];l[(h+36*n+32|0)>>2]=((f|0)>(g|0)?f:g)+1|0;n=l[(l[j]+20>>2)+(9*n|0)];if(-1==(n|0)){break a}}}}}while(0)}function Pk(b,d,e,f){var g,h;h=-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4;4==h&&P(N.c|0,135,N.lb|0,N.o|0);g=(b+4|0)>>2;var j=l[g];-1!=(l[(j+24>>2)+(9*d|0)]|0)&&(P(N.c|0,137,N.lb|0,N.Tb|0),j=l[g]);h=j>>2;j=e|0;if(q[h+(9*d|0)]>q[j>>2]){var k=e+4|0;h=12}else{var m=e+4|0;if(q[h+(9*d|0)+1]>q[m>>2]){k=m,h=12}else{if(q[e+8>>2]>q[h+(9*d|0)+2]){k=m,h=12}else{if(q[e+12>>2]>q[h+(9*d|0)+3]){k=m,h=12}else{var n=0;h=19}}}}12==h&&(Ok(b,d),n=q[j>>2]-.10000000149011612,k=q[k>>2]-.10000000149011612,j=q[e+8>>2]+.10000000149011612,e=q[e+12>>2]+.10000000149011612,m=2*q[f>>2],h=2*q[f+4>>2],0>m?(f=n+m,n=j):(f=n,n=j+m),0>h?k+=h:e+=h,g=l[g]>>2,q[g+(9*d|0)]=f,q[g+(9*d|0)+1]=k,q[g+(9*d|0)+2]=n,q[g+(9*d|0)+3]=e,ih(b,d),n=1);return n}function Mk(b,d){var e,f,g,h,j,k,m,n,p,u,r,w,x,y,A,C,z,D,E,G,H,F,I,J,L=b>>2,O;-1==(d|0)&&P(N.c|0,382,N.v|0,N.xh|0);J=(b+4|0)>>2;var R=l[J];I=R>>2;var T=R+36*d|0;F=(R+36*d+24|0)>>2;var S=l[F];if(-1==(S|0)){var U=d}else{if(H=(R+36*d+32|0)>>2,2>(l[H]|0)){U=d}else{G=(R+36*d+28|0)>>2;var W=l[G];O=-1<(S|0)?(S|0)<(l[L+3]|0)?9:8:8;8==O&&P(N.c|0,392,N.v|0,N.Dh|0);O=-1<(W|0)?(W|0)<(l[L+3]|0)?12:11:11;11==O&&P(N.c|0,393,N.v|0,N.Re|0);var Q=l[J];E=Q>>2;var $=Q+36*S|0,ea=Q+36*W|0;D=(Q+36*W+32|0)>>2;z=(Q+36*S+32|0)>>2;var sa=l[D]-l[z]|0;if(1<(sa|0)){var Ba=Q+36*W+24|0,oa=l[Ba>>2];C=(Q+36*W+28|0)>>2;var ga=l[C],qa=Q+36*oa|0,la=Q+36*ga|0;O=-1<(oa|0)?(oa|0)<(l[L+3]|0)?16:15:15;15==O&&P(N.c|0,407,N.v|0,N.Xe|0);O=-1<(ga|0)?(ga|0)<(l[L+3]|0)?19:18:18;18==O&&P(N.c|0,408,N.v|0,N.ff|0);l[Ba>>2]=d;var Ca=R+36*d+20|0,ia=l[Ca>>2];A=(Q+36*W+20|0)>>2;l[A]=ia;l[Ca>>2]=W;var ya=l[A];if(-1==(ya|0)){l[L]=W}else{var ta=l[J],Ia=ta+36*ya+24|0;if((l[Ia>>2]|0)==(d|0)){l[Ia>>2]=W}else{if((l[(ta+28>>2)+(9*ya|0)]|0)==(d|0)){var na=ya,Z=ta}else{P(N.c|0,424,N.v|0,N.of|0),na=l[A],Z=l[J]}l[(Z+28>>2)+(9*na|0)]=W}}y=(Q+36*oa+32|0)>>2;x=(Q+36*ga+32|0)>>2;if((l[y]|0)>(l[x]|0)){l[C]=oa;l[G]=ga;l[(Q+36*ga+20|0)>>2]=d;var ba=q[$>>2],ca=q[la>>2],ma=ba<ca?ba:ca,ka=q[E+(9*S|0)+1],aa=q[E+(9*ga|0)+1],ra=ka<aa?ka:aa,ha=(M[0]=ma,t[0]),za=(M[0]=ra,t[0]),X=0|ha,ua=za|0,da=T|0;w=da>>2;l[w]=X;var fa=T+4|0;r=fa>>2;l[r]=ua;var Aa=q[E+(9*S|0)+2],Qa=q[E+(9*ga|0)+2],pa=q[E+(9*S|0)+3],cb=q[E+(9*ga|0)+3],Ra=pa>cb?pa:cb,Ta=R+36*d+8|0,$a=(M[0]=Aa>Qa?Aa:Qa,t[0]),va=(M[0]=Ra,t[0]),Wa=0|$a,fb=va|0,gb=Ta|0;u=gb>>2;l[u]=Wa;var Xa=Ta+4|0;p=Xa>>2;l[p]=fb;var Ua=q[qa>>2],Va=q[I+(9*d|0)+1],pb=q[E+(9*oa|0)+1],nb=Va<pb?Va:pb,La=(M[0]=ma<Ua?ma:Ua,t[0]),qb=(M[0]=nb,t[0]),bb=0|La,Fa=qb|0,Ma=ea|0;n=Ma>>2;l[n]=bb;var wa=ea+4|0;m=wa>>2;l[m]=Fa;var hb=q[I+(9*d|0)+2],Ya=q[E+(9*oa|0)+2],Za=q[I+(9*d|0)+3],Da=q[E+(9*oa|0)+3],Oa=Za>Da?Za:Da,ib=Q+36*W+8|0,ab=(M[0]=hb>Ya?hb:Ya,t[0]),Ga=(M[0]=Oa,t[0]),jb=0|ab,Ea=Ga|0,Pa=ib|0;k=Pa>>2;l[k]=jb;var Ja=ib+4|0;j=Ja>>2;l[j]=Ea;var db=l[z],xa=l[x],Sa=((db|0)>(xa|0)?db:xa)+1|0;l[H]=Sa;var Ka=l[y],tb=(Sa|0)>(Ka|0)?Sa:Ka}else{l[C]=ga;l[G]=oa;l[(Q+36*oa+20|0)>>2]=d;var kb=q[$>>2],ub=q[qa>>2],rb=kb<ub?kb:ub,Bb=q[E+(9*S|0)+1],lb=q[E+(9*oa|0)+1],yb=Bb<lb?Bb:lb,xb=(M[0]=rb,t[0]),Ib=(M[0]=yb,t[0]),wb=0|xb,vb=Ib|0,da=T|0;w=da>>2;l[w]=wb;fa=T+4|0;r=fa>>2;l[r]=vb;var zb=q[E+(9*S|0)+2],Eb=q[E+(9*oa|0)+2],Cb=q[E+(9*S|0)+3],eb=q[E+(9*oa|0)+3],sb=Cb>eb?Cb:eb,ob=R+36*d+8|0,Db=(M[0]=zb>Eb?zb:Eb,t[0]),Jb=(M[0]=sb,t[0]),Rb=0|Db,Nb=Jb|0,gb=ob|0;u=gb>>2;l[u]=Rb;Xa=ob+4|0;p=Xa>>2;l[p]=Nb;var Ob=q[la>>2],Lb=q[I+(9*d|0)+1],Pb=q[E+(9*ga|0)+1],Mb=Lb<Pb?Lb:Pb,Yb=(M[0]=rb<Ob?rb:Ob,t[0]),Zb=(M[0]=Mb,t[0]),ec=0|Yb,Ub=Zb|0,Ma=ea|0;n=Ma>>2;l[n]=ec;wa=ea+4|0;m=wa>>2;l[m]=Ub;var jc=q[I+(9*d|0)+2],Qb=q[E+(9*ga|0)+2],mb=q[I+(9*d|0)+3],cc=q[E+(9*ga|0)+3],Fb=mb>cc?mb:cc,gc=Q+36*W+8|0,wc=(M[0]=jc>Qb?jc:Qb,t[0]),pc=(M[0]=Fb,t[0]),qc=0|wc,$c=pc|0,Pa=gc|0;k=Pa>>2;l[k]=qc;Ja=gc+4|0;j=Ja>>2;l[j]=$c;var Ec=l[z],sc=l[y],kd=((Ec|0)>(sc|0)?Ec:sc)+1|0;l[H]=kd;var wd=l[x],tb=(kd|0)>(wd|0)?kd:wd}l[D]=tb+1|0;U=W}else{if(-1>(sa|0)){var Lc=Q+36*S+24|0,$b=l[Lc>>2];h=(Q+36*S+28|0)>>2;var ac=l[h],oc=Q+36*$b|0,tc=Q+36*ac|0;O=-1<($b|0)?($b|0)<(l[L+3]|0)?34:33:33;33==O&&P(N.c|0,467,N.v|0,N.tf|0);O=-1<(ac|0)?(ac|0)<(l[L+3]|0)?37:36:36;36==O&&P(N.c|0,468,N.v|0,N.wf|0);l[Lc>>2]=d;var Nc=R+36*d+20|0,ld=l[Nc>>2];g=(Q+36*S+20|0)>>2;l[g]=ld;l[Nc>>2]=S;var Wc=l[g];if(-1==(Wc|0)){l[L]=S}else{var ad=l[J],Xc=ad+36*Wc+24|0;if((l[Xc>>2]|0)==(d|0)){l[Xc>>2]=S}else{if((l[(ad+28>>2)+(9*Wc|0)]|0)==(d|0)){var Cc=Wc,fd=ad}else{P(N.c|0,484,N.v|0,N.Cf|0),Cc=l[g],fd=l[J]}l[(fd+28>>2)+(9*Cc|0)]=S}}f=(Q+36*$b+32|0)>>2;e=(Q+36*ac+32|0)>>2;if((l[f]|0)>(l[e]|0)){l[h]=$b;l[F]=ac;l[(Q+36*ac+20|0)>>2]=d;var md=q[ea>>2],nd=q[tc>>2],Oc=md<nd?md:nd,gd=q[E+(9*W|0)+1],od=q[E+(9*ac|0)+1],pd=gd<od?gd:od,Pd=(M[0]=Oc,t[0]),Xd=(M[0]=pd,t[0]),qd=0|Pd,Qd=Xd|0,da=T|0;w=da>>2;l[w]=qd;fa=T+4|0;r=fa>>2;l[r]=Qd;var Pc=q[E+(9*W|0)+2],Ic=q[E+(9*ac|0)+2],Jc=q[E+(9*W|0)+3],fc=q[E+(9*ac|0)+3],hd=Jc>fc?Jc:fc,xd=R+36*d+8|0,bd=(M[0]=Pc>Ic?Pc:Ic,t[0]),rd=(M[0]=hd,t[0]),ye=0|bd,Yd=rd|0,gb=xd|0;u=gb>>2;l[u]=ye;Xa=xd+4|0;p=Xa>>2;l[p]=Yd;var Tc=q[oc>>2],xc=q[I+(9*d|0)+1],bc=q[E+(9*$b|0)+1],Ed=xc<bc?xc:bc,yc=(M[0]=Oc<Tc?Oc:Tc,t[0]),Ac=(M[0]=Ed,t[0]),Zd=0|yc,$d=Ac|0,Ma=$|0;n=Ma>>2;l[n]=Zd;wa=$+4|0;m=wa>>2;l[m]=$d;var cd=q[I+(9*d|0)+2],zc=q[E+(9*$b|0)+2],kc=q[I+(9*d|0)+3],Rd=q[E+(9*$b|0)+3],Fc=kc>Rd?kc:Rd,Qc=Q+36*S+8|0,Mc=(M[0]=cd>zc?cd:zc,t[0]),ne=(M[0]=Fc,t[0]),Sd=0|Mc,Td=ne|0,Pa=Qc|0;k=Pa>>2;l[k]=Sd;Ja=Qc+4|0;j=Ja>>2;l[j]=Td;var Ud=l[D],xf=l[e],Fd=((Ud|0)>(xf|0)?Ud:xf)+1|0;l[H]=Fd;var oe=l[f],He=(Fd|0)>(oe|0)?Fd:oe}else{l[h]=ac;l[F]=$b;l[(Q+36*$b+20|0)>>2]=d;var ae=q[ea>>2],Gc=q[oc>>2],dd=ae<Gc?ae:Gc,be=q[E+(9*W|0)+1],pe=q[E+(9*$b|0)+1],Uc=be<pe?be:pe,lc=(M[0]=dd,t[0]),Gd=(M[0]=Uc,t[0]),Hd=0|lc,Re=Gd|0,da=T|0;w=da>>2;l[w]=Hd;fa=T+4|0;r=fa>>2;l[r]=Re;var Id=q[E+(9*W|0)+2],Jd=q[E+(9*$b|0)+2],qe=q[E+(9*W|0)+3],re=q[E+(9*$b|0)+3],Kd=qe>re?qe:re,Se=R+36*d+8|0,Rf=(M[0]=Id>Jd?Id:Jd,t[0]),sd=(M[0]=Kd,t[0]),Vc=0|Rf,Te=sd|0,gb=Se|0;u=gb>>2;l[u]=Vc;Xa=Se+4|0;p=Xa>>2;l[p]=Te;var Ue=q[tc>>2],ce=q[I+(9*d|0)+1],Yc=q[E+(9*ac|0)+1],yd=ce<Yc?ce:Yc,$e=(M[0]=dd<Ue?dd:Ue,t[0]),ze=(M[0]=yd,t[0]),Zc=0|$e,Ld=ze|0,Ma=$|0;n=Ma>>2;l[n]=Zc;wa=$+4|0;m=wa>>2;l[m]=Ld;var Md=q[I+(9*d|0)+2],de=q[E+(9*ac|0)+2],zd=q[I+(9*d|0)+3],ee=q[E+(9*ac|0)+3],yf=zd>ee?zd:ee,af=Q+36*S+8|0,Ie=(M[0]=Md>de?Md:de,t[0]),zf=(M[0]=yf,t[0]),jf=0|Ie,bf=zf|0,Pa=af|0;k=Pa>>2;l[k]=jf;Ja=af+4|0;j=Ja>>2;l[j]=bf;var Sf=l[D],kf=l[f],Ae=((Sf|0)>(kf|0)?Sf:kf)+1|0;l[H]=Ae;var Ad=l[e],He=(Ae|0)>(Ad|0)?Ae:Ad}l[z]=He+1|0;U=S}else{U=d}}}}return U}function Sl(b,d){4==(-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4)&&P(N.c|0,563,N.Je|0,N.Z|0);var e=l[b+4>>2],f=l[(e+24>>2)+(9*d|0)];if(-1==(f|0)){return 0}f=Sl(b,f);e=Sl(b,l[(e+28>>2)+(9*d|0)]);return((f|0)>(e|0)?f:e)+1|0}function hm(b,d){var e,f,g=b|0;f=(b+4|0)>>2;for(var h=b+12|0,j=d;-1!=(j|0);){(l[g>>2]|0)==(j|0)&&-1!=(l[(l[f]+20>>2)+(9*j|0)]|0)&&P(N.c|0,591,N.N|0,N.Jf|0);e=l[f]>>2;var k=l[e+(9*j|0)+6],m=l[e+(9*j|0)+7];if(-1==(k|0)){-1!=(m|0)&&P(N.c|0,602,N.N|0,N.Hb|0);if(0==(l[e+(9*j|0)+8]|0)){break}P(N.c|0,603,N.N|0,N.Jb|0);break}e=-1<(k|0)?(k|0)<(l[h>>2]|0)?15:14:14;14==e&&P(N.c|0,607,N.N|0,N.Kb|0);e=-1<(m|0)?(m|0)<(l[h>>2]|0)?18:17:17;17==e&&P(N.c|0,608,N.N|0,N.Lb|0);e=l[f];(l[(e+20>>2)+(9*k|0)]|0)!=(j|0)&&(P(N.c|0,610,N.N|0,N.ag|0),e=l[f]);(l[(e+20>>2)+(9*m|0)]|0)!=(j|0)&&P(N.c|0,611,N.N|0,N.hg|0);hm(b,k);j=m}}function im(b,d){var e,f,g,h;g=(b+4|0)>>2;for(var j=b+12|0,k=d;-1!=(k|0);){f=l[g]>>2;var m=l[f+(9*k|0)+6],n=l[f+(9*k|0)+7];if(-1==(m|0)){-1!=(n|0)&&P(N.c|0,632,N.M|0,N.Hb|0);if(0==(l[f+(9*k|0)+8]|0)){break}P(N.c|0,633,N.M|0,N.Jb|0);break}h=-1<(m|0)?(m|0)<(l[j>>2]|0)?12:11:11;11==h&&P(N.c|0,637,N.M|0,N.Kb|0);h=-1<(n|0)?(n|0)<(l[j>>2]|0)?15:14:14;14==h&&P(N.c|0,638,N.M|0,N.Lb|0);h=l[g];var p=l[(h+32>>2)+(9*m|0)],u=l[(h+32>>2)+(9*n|0)];if((l[f+(9*k|0)+8]|0)!=(((p|0)>(u|0)?p:u)+1|0)){P(N.c|0,644,N.M|0,N.kg|0),h=l[g]}e=h>>2;h=q[e+(9*m|0)];var p=q[e+(9*n|0)],u=q[e+(9*m|0)+1],r=q[e+(9*n|0)+1],w=q[e+(9*m|0)+2],x=q[e+(9*n|0)+2],w=w>x?w:x,x=q[e+(9*m|0)+3];e=q[e+(9*n|0)+3];e=x>e?x:e;h=(h<p?h:p)==q[f+(9*k|0)]?(u<r?u:r)==q[f+(9*k|0)+1]?20:19:19;19==h&&P(N.c|0,649,N.M|0,N.og|0);h=w==q[f+(9*k|0)+2]?e==q[f+(9*k|0)+3]?23:22:22;22==h&&P(N.c|0,650,N.M|0,N.sg|0);im(b,m);k=n}}function jm(b){var d,e;d=(b|0)>>2;hm(b,l[d]);im(b,l[d]);var f=l[b+16>>2],g=-1==(f|0);a:do{if(g){var h=0}else{for(var j=b+12|0,k=b+4|0,m=0,n=f;;){if(e=-1<(n|0)?(n|0)<(l[j>>2]|0)?7:6:6,6==e&&P(N.c|0,665,N.La|0,N.zg|0),m=m+1|0,n=l[(l[k>>2]+20>>2)+(9*n|0)],-1==(n|0)){h=m;break a}}}}while(0);f=l[d];d=-1==(f|0)?0:l[(l[b+4>>2]+32>>2)+(9*f|0)];f=Sl(b,f);(d|0)!=(f|0)&&P(N.c|0,670,N.La|0,N.Ag|0);(l[b+8>>2]+h|0)!=(l[b+12>>2]|0)&&P(N.c|0,672,N.La|0,N.Cg|0)}function km(b){var d,e,f,g;g=(b+8|0)>>2;var h=Ne(l[g]<<2);f=h>>2;var j=b+12|0,k=l[j>>2],m=0<(k|0);a:do{if(m){e=(b+4|0)>>2;var n=b+16|0,p=0;d=0;for(var u=k;;){var r=l[e];0>(l[(r+32>>2)+(9*p|0)]|0)?r=d:-1==(l[(r+24>>2)+(9*p|0)]|0)?(l[(r+36*p+20|0)>>2]=-1,l[((d<<2)+h|0)>>2]=p,r=d+1|0):((u|0)>(p|0)||P(N.c|0,97,N.G|0,N.Z|0),0<(l[g]|0)||P(N.c|0,98,N.G|0,N.Ba|0),l[(l[e]+36*p+20|0)>>2]=l[n>>2],l[(l[e]+36*p+32|0)>>2]=-1,l[n>>2]=p,l[g]=l[g]-1|0,r=d);p=p+1|0;u=l[j>>2];if((p|0)>=(u|0)){break}d=r}if(1<(r|0)){for(n=r;;){p=l[e];d=p>>2;for(var w=u=-1,x=3.4028234663852886e+38,y=0;;){var A=l[(y<<2>>2)+f],C=q[d+(9*A|0)],z=q[d+(9*A|0)+1],D=q[d+(9*A|0)+2],A=q[d+(9*A|0)+3],E=y+1|0,G=(E|0)<(n|0);b:do{if(G){for(var H=u,F=w,I=x,J=E;;){var L=l[(J<<2>>2)+f],O=q[d+(9*L|0)],R=q[d+(9*L|0)+1],T=q[d+(9*L|0)+2],L=q[d+(9*L|0)+3],O=2*((D>T?D:T)-(C<O?C:O)+((A>L?A:L)-(z<R?z:R))),H=(R=O<I)?J:H,F=R?y:F,I=R?O:I,J=J+1|0;if((J|0)==(n|0)){var S=H,U=F,W=I;break b}}}else{S=u,U=w,W=x}}while(0);if((E|0)==(n|0)){break}u=S;w=U;x=W;y=E}u=(U<<2)+h|0;y=l[u>>2];w=(S<<2)+h|0;C=l[w>>2];x=hh(b);z=l[e];l[(z+36*x+24|0)>>2]=y;l[(z+36*x+28|0)>>2]=C;D=l[d+(9*y|0)+8];A=l[d+(9*C|0)+8];l[(z+36*x+32|0)>>2]=((D|0)>(A|0)?D:A)+1|0;D=q[d+(9*y|0)];A=q[d+(9*C|0)];E=q[d+(9*y|0)+1];G=q[d+(9*C|0)+1];G=E<G?E:G;E=z+36*x|0;D=(M[0]=D<A?D:A,t[0]);A=(M[0]=G,t[0])|0;l[(E|0)>>2]=0|D;l[(E+4|0)>>2]=A;D=q[d+(9*y|0)+2];A=q[d+(9*C|0)+2];E=q[d+(9*y|0)+3];d=q[d+(9*C|0)+3];E=E>d?E:d;d=z+36*x+8|0;D=(M[0]=D>A?D:A,t[0]);A=(M[0]=E,t[0])|0;l[(d|0)>>2]=0|D;l[(d+4|0)>>2]=A;l[(z+36*x+20|0)>>2]=-1;l[(p+36*y+20|0)>>2]=x;l[(p+36*C+20|0)>>2]=x;n=n-1|0;l[w>>2]=l[(n<<2>>2)+f];l[u>>2]=x;if(1>=(n|0)){break a}}}}}while(0);l[b>>2]=l[f];Dh(h);jm(b)}function lm(b,d,e,f){var g=b>>2,h=1-f,j=q[g+4]*h+q[g+6]*f,k=q[g+5]*h+q[g+7]*f,m=h*q[g+8]+q[g+9]*f,n=mm(m),m=nm(m),p=q[g+2],u=q[g+3],j=j-(m*p-n*u),k=k-(n*p+m*u),p=q[g+13]*h+q[g+15]*f,u=q[g+14]*h+q[g+16]*f,h=h*q[g+17]+q[g+18]*f,f=mm(h),h=nm(h),r=q[g+11],w=q[g+12],p=p-(h*r-f*w),u=u-(f*r+h*w),r=l[g+20];if(0==(r|0)){var r=b+92|0,w=b+96|0,x=l[g],b=-1<(d|0)?(l[x+20>>2]|0)>(d|0)?6:5:5;5==b&&P(N.i|0,103,N.h|0,N.j|0);var b=(d<<3)+l[x+16>>2]|0,d=(b|0)>>2,b=(b+4|0)>>2,b=l[b],x=(t[0]=l[d],M[0]),y=(t[0]=b,M[0]),g=l[g+1],b=-1<(e|0)?(l[g+20>>2]|0)>(e|0)?9:8:8;8==b&&P(N.i|0,103,N.h|0,N.j|0);g=(e<<3)+l[g+16>>2]|0;d=(g|0)>>2;b=(g+4|0)>>2;g=l[b];e=(t[0]=l[d],M[0]);g=(t[0]=g,M[0]);n=(h*e-f*g+p-(m*x-n*y+j))*q[r>>2]+(f*e+h*g+u-(n*x+m*y+k))*q[w>>2]}else{1==(r|0)?(d=q[g+23],b=q[g+24],r=m*d-n*b,w=n*d+m*b,d=q[g+21],b=q[g+22],j=m*d-n*b+j,n=n*d+m*b+k,m=l[g+1],b=-1<(e|0)?(l[m+20>>2]|0)>(e|0)?13:12:12,12==b&&P(N.i|0,103,N.h|0,N.j|0),m=(e<<3)+l[m+16>>2]|0,d=(m|0)>>2,b=(m+4|0)>>2,m=l[b],k=(t[0]=l[d],M[0]),m=(t[0]=m,M[0]),n=(h*k-f*m+p-j)*r+(f*k+h*m+u-n)*w):2==(r|0)?(b=q[g+23],r=q[g+24],e=h*b-f*r,r=f*b+h*r,b=q[g+21],w=q[g+22],p=h*b-f*w+p,f=f*b+h*w+u,h=l[g],b=-1<(d|0)?(l[h+20>>2]|0)>(d|0)?17:16:16,16==b&&P(N.i|0,103,N.h|0,N.j|0),h=(d<<3)+l[h+16>>2]|0,d=(h|0)>>2,b=(h+4|0)>>2,h=l[b],g=(t[0]=l[d],M[0]),h=(t[0]=h,M[0]),n=(m*g-n*h+j-p)*e+(n*g+m*h+k-f)*r):(P(N.Ca|0,242,N.Ne|0,N.l|0),n=0)}return n}function om(b,d,e){var f;4==(-1<(e|0)?(l[b+16>>2]-1|0)>(e|0)?5:4:4)&&P(N.F|0,89,N.He|0,N.ah|0);l[d+4>>2]=1;q[d+8>>2]=q[b+8>>2];f=(b+12|0)>>2;var g=(e<<3)+l[f]|0,h=d+12|0,j=l[g+4>>2];l[h>>2]=l[g>>2];l[h+4>>2]=j;g=(e+1<<3)+l[f]|0;h=d+20|0;j=l[g+4>>2];l[h>>2]=l[g>>2];l[h+4>>2]=j;g=d+28|0;0<(e|0)?(h=(e-1<<3)+l[f]|0,j=l[(h+4|0)>>2],l[(g|0)>>2]=l[(h|0)>>2],l[(g+4|0)>>2]=j,c[d+44|0]=1):(h=b+20|0,j=l[(h+4|0)>>2],l[(g|0)>>2]=l[(h|0)>>2],l[(g+4|0)>>2]=j,c[d+44|0]=c[b+36|0]&1);g=d+36|0;(l[b+16>>2]-2|0)>(e|0)?(e=(e+2<<3)+l[f]|0,b=l[(e|0)>>2],e=l[(e+4|0)>>2],l[(g|0)>>2]=b,l[(g+4|0)>>2]=e,c[d+45|0]=1):(f=b+28|0,e=l[(f|0)>>2],f=l[(f+4|0)>>2],l[(g|0)>>2]=e,l[(g+4|0)>>2]=f,c[d+45|0]=c[b+37|0]&1)}function Vm(b,d,e,f){var e=e>>2,g=q[f>>2],h=q[e]-g,j=q[f+4>>2],k=q[e+1]-j,m=q[f+12>>2],n=q[f+8>>2],f=m*h+n*k,p=-n,h=h*p+m*k,g=q[e+2]-g,k=q[e+3]-j,j=m*g+n*k-f,m=g*p+m*k-h,p=b+12|0,n=l[p+4>>2],p=(t[0]=l[p>>2],M[0]),n=(t[0]=n,M[0]),g=b+20|0,b=l[g+4>>2],g=(t[0]=l[g>>2],M[0]),k=(t[0]=b,M[0]),b=g-p,g=k-n,u=-b,k=g*g+b*b,r=Fh(k);if(1.1920928955078125e-7>r){r=g}else{var w=1/r,r=g*w,u=w*u}var w=r*(p-f)+u*(n-h),x=r*j+u*m;0==x?d=0:(x=w/x,0>x?d=0:q[e+4]<x|0==k?d=0:(e=((f+j*x-p)*b+(h+m*x-n)*g)/k,0>e|1<e?d=0:(q[d+8>>2]=x,0<w?(e=(M[0]=-r,t[0]),f=(M[0]=-u,t[0])|0):(e=(M[0]=r,t[0]),f=(M[0]=u,t[0])|0),l[d>>2]=0|e,l[d+4>>2]=f,d=1)));return d}function Wm(b,d,e,f,g){var h=b>>2,j=b+148|0;l[j>>2]=4;var k=-d,m=-e;q[h+5]=k;q[h+6]=m;q[h+7]=d;q[h+8]=m;q[h+9]=d;q[h+10]=e;q[h+11]=k;q[h+12]=e;q[h+21]=0;q[h+22]=-1;q[h+23]=1;q[h+24]=0;q[h+25]=0;q[h+26]=1;q[h+27]=-1;q[h+28]=0;d=f>>2;e=b+12|0;f=l[d+1];l[e>>2]=l[d];l[e+4>>2]=f;for(var e=l[d+1],d=(t[0]=l[d],M[0]),e=(t[0]=e,M[0]),f=mm(g),g=nm(g),k=0,n=m,m=-1;;){var p=(k<<3)+b+20|0,u=q[p>>2],r=f*u+g*n+e,n=(M[0]=g*u-f*n+d,t[0]),r=(M[0]=r,t[0])|0;l[p>>2]=0|n;l[p+4>>2]=r;r=(k<<3)+b+84|0;p=q[r>>2];n=f*p+g*m;m=(M[0]=g*p-f*m,t[0]);n=(M[0]=n,t[0])|0;l[r>>2]=0|m;l[r+4>>2]=n;k=k+1|0;if((k|0)>=(l[j>>2]|0)){break}n=q[((k<<3)+24>>2)+h];m=q[((k<<3)+88>>2)+h]}}function Xm(b,d,e){if(6>(e-3|0)>>>0){var f=b+148|0;l[f>>2]=e;e=5}else{P(N.O|0,122,N.mb|0,N.zf|0);var g=b+148|0;l[g>>2]=e;if(0<(e|0)){f=g,e=5}else{var h=e,e=13}}do{if(5==e){for(e=0;;){var j=(e<<3)+d|0,g=(e<<3)+b+20|0,k=l[j+4>>2];l[g>>2]=l[j>>2];l[g+4>>2]=k;e=e+1|0;j=o[f>>2];if((e|0)>=(j|0)){break}}if(0<(j|0)){g=j;for(k=0;;){var e=k+1|0,m=(e|0)<(g|0)?e:0,n=q[b+(m<<3)+20>>2]-q[b+(k<<3)+20>>2],m=q[b+(m<<3)+24>>2]-q[b+(k<<3)+24>>2],p=m*m;1.4210854715202004e-14<n*n+p||P(N.O|0,137,N.mb|0,N.ng|0);var g=(k<<3)+b+84|0,u=-1*n,n=g,r=(M[0]=m,t[0]),u=(M[0]=u,t[0])|0;l[n>>2]=0|r;l[n+4>>2]=u;k=(k<<3)+b+88|0;n=q[k>>2];p=Fh(p+n*n);1.1920928955078125e-7>p||(p=1/p,q[g>>2]=m*p,q[k>>2]=n*p);m=o[f>>2];if((e|0)>=(m|0)){break}g=m;k=e}e=b+12|0;g=b+20|0;if(2<(m|0)){var w=m,x=e,y=g,e=16}else{var A=m,C=e,z=g,e=15}}else{h=j,e=13}}}while(0);13==e&&(A=h,C=b+12|0,z=b+20|0,e=15);if(15==e){if(P(N.O|0,76,N.gb|0,N.Xb|0),0<(A|0)){w=A,x=C,y=z,e=16}else{var D=0,E=0,G=0,H=C,e=21}}do{if(16==e){for(h=d=C=A=0;;){var F=(C<<3)+b+20|0,I=l[F+4>>2],F=(t[0]=l[F>>2],M[0]),J=(t[0]=I,M[0]),C=C+1|0,z=(C|0)<(w|0)?(C<<3)+b+20|0:y,I=l[z+4>>2],z=(t[0]=l[z>>2],M[0]),f=(t[0]=I,M[0]),j=.5*(F*f-J*z),I=A+j,A=.3333333432674408*j,F=d+(F+z)*A,J=h+(J+f)*A;if((C|0)==(w|0)){break}A=I;d=F;h=J}if(1.1920928955078125e-7<I){var L=J,O=F,R=I,T=x,e=22}else{D=J,E=F,G=I,H=x,e=21}}}while(0);21==e&&(P(N.O|0,115,N.gb|0,N.Vb|0),L=D,O=E,R=G,T=H);b=1/R;O=(M[0]=O*b,t[0]);L=(M[0]=L*b,t[0])|0;l[T>>2]=0|O;l[T+4>>2]=L}function pn(b,d,e){var f=d>>2,d=q[f+4],g=q[f+8],h=q[f+5],j=q[f+7],k=d*g-h*j,m=q[f+6],n=q[f+3],p=h*m-n*g,u=n*j-d*m,r=q[f],w=q[f+1],f=q[f+2],x=r*k+w*p+f*u,x=0!=x?1/x:x,y=q[e>>2],A=q[e+4>>2],e=q[e+8>>2];q[b>>2]=x*(y*k+A*p+e*u);q[b+4>>2]=x*(r*(A*g-e*j)+w*(e*m-y*g)+f*(y*j-A*m));q[b+8>>2]=x*(r*(d*e-h*A)+w*(h*y-n*e)+f*(n*A-d*y))}function qn(b,d){var e,f,g,h=0==(d|0);a:do{if(h){g=0}else{g=0<(d|0);do{if(g){if(640>=(d|0)){break}g=Ne(d);break a}P(N.e|0,104,N.Fa|0,N.Va|0)}while(0);g=ed[rn+d|0];var j=g&255;14>(g&255)||P(N.e|0,112,N.Fa|0,N.g|0);g=((j<<2)+b+12|0)>>2;f=o[g];if(0==(f|0)){f=(b+4|0)>>2;var k=o[f],m=b+8|0;e=(b|0)>>2;if((k|0)==(l[m>>2]|0)){var n=l[e],k=k+128|0;l[m>>2]=k;m=Ne(k<<3);l[e]=m;Ch(m,n,l[f]<<3);m=((l[f]<<3)+l[e]|0)>>2;for(k=m+256;m<k;m++){l[m]=0}Dh(n);n=l[f]}else{n=k}k=l[e];m=Ne(16384);e=((n<<3)+k+4|0)>>2;l[e]=m;j=l[sn+(j<<2)>>2];l[((n<<3)+k|0)>>2]=j;n=16384/(j|0)&-1;16385>(n*j|0)?k=m:(P(N.e|0,140,N.Fa|0,N.dh|0),k=l[e]);n=n-1|0;m=0<(n|0);b:do{if(m){for(var p=0,u=k;;){var r=p+1|0;l[(u+p*j|0)>>2]=u+r*j|0;u=l[e];if((r|0)==(n|0)){var w=u;break b}p=r}}else{w=k}}while(0);l[(w+n*j|0)>>2]=0;l[g]=l[l[e]>>2];l[f]=l[f]+1|0;g=l[e]}else{l[g]=l[f>>2],g=f}}}while(0);return g}function V(b){function d(b){var d;"double"===b?d=(t[0]=l[g+j>>2],t[1]=l[g+(j+4)>>2],Ee[0]):"i64"==b?d=[l[g+j>>2],l[g+(j+4)>>2]]:(b="i32",d=l[g+j>>2]);j+=Math.max(mc(b),nc);return d}var e=a;a+=4;l[e>>2]=arguments[V.length];for(var f=l[tn>>2],g=l[e>>2],h=b,j=0,k=[],m,n;;){var p=h;m=c[h];if(0===m){break}n=c[h+1];if(37==m){var u=Gb,r=Gb,w=Gb,x=Gb;a:for(;;){switch(n){case 43:u=Na;break;case 45:r=Na;break;case 35:w=Na;break;case 48:if(x){break a}else{x=Na;break};default:break a}h++;n=c[h+1]}var y=0;if(42==n){y=d("i32"),h++,n=c[h+1]}else{for(;48<=n&&57>=n;){y=10*y+(n-48),h++,n=c[h+1]}}var A=Gb;if(46==n){var C=0,A=Na;h++;n=c[h+1];if(42==n){C=d("i32"),h++}else{for(;;){n=c[h+1];if(48>n||57<n){break}C=10*C+(n-48);h++}}n=c[h+1]}else{C=6}var z;switch(String.fromCharCode(n)){case"h":n=c[h+2];104==n?(h++,z=1):z=2;break;case"l":n=c[h+2];108==n?(h++,z=8):z=4;break;case"L":case"q":case"j":z=8;break;case"z":case"t":case"I":z=4;break;default:z=Ab}z&&h++;n=c[h+1];if(-1!="diuoxXp".split("").indexOf(String.fromCharCode(n))){p=100==n||105==n;z=z||4;var D=m=d("i"+8*z),E;8==z&&(m=117==n?(m[0]>>>0)+4294967296*(m[1]>>>0):(m[0]>>>0)+4294967296*(m[1]|0));4>=z&&(m=(p?Pf:Of)(m&Math.pow(256,z)-1,8*z));var G=Math.abs(m),p="";if(100==n||105==n){E=8==z&&un?un.stringify(D[0],D[1]):Pf(m,8*z).toString(10)}else{if(117==n){E=8==z&&un?un.stringify(D[0],D[1],Na):Of(m,8*z).toString(10),m=Math.abs(m)}else{if(111==n){E=(w?"0":"")+G.toString(8)}else{if(120==n||88==n){p=w?"0x":"";if(0>m){m=-m;E=(G-1).toString(16);D=[];for(w=0;w<E.length;w++){D.push((15-parseInt(E[w],16)).toString(16))}for(E=D.join("");E.length<2*z;){E="f"+E}}else{E=G.toString(16)}88==n&&(p=p.toUpperCase(),E=E.toUpperCase())}else{112==n&&(0===G?E="(nil)":(p="0x",E=G.toString(16)))}}}}if(A){for(;E.length<C;){E="0"+E}}for(u&&(p=0>m?"-"+p:"+"+p);p.length+E.length<y;){r?E+=" ":x?E="0"+E:p=" "+p}E=p+E;E.split("").forEach((function(b){k.push(b.charCodeAt(0))}))}else{if(-1!="fFeEgG".split("").indexOf(String.fromCharCode(n))){m=d("double");if(isNaN(m)){E="nan",x=Gb}else{if(isFinite(m)){A=Gb;z=Math.min(C,20);if(103==n||71==n){A=Na,C=C||1,z=parseInt(m.toExponential(z).split("e")[1],10),C>z&&-4<=z?(n=(103==n?"f":"F").charCodeAt(0),C-=z+1):(n=(103==n?"e":"E").charCodeAt(0),C--),z=Math.min(C,20)}if(101==n||69==n){E=m.toExponential(z),/[eE][-+]\d$/.test(E)&&(E=E.slice(0,-1)+"0"+E.slice(-1))}else{if(102==n||70==n){E=m.toFixed(z)}}p=E.split("e");if(A&&!w){for(;1<p[0].length&&-1!=p[0].indexOf(".")&&("0"==p[0].slice(-1)||"."==p[0].slice(-1));){p[0]=p[0].slice(0,-1)}}else{for(w&&-1==E.indexOf(".")&&(p[0]+=".");C>z++;){p[0]+="0"}}E=p[0]+(1<p.length?"e"+p[1]:"");69==n&&(E=E.toUpperCase());u&&0<=m&&(E="+"+E)}else{E=(0>m?"-":"")+"inf",x=Gb}}for(;E.length<y;){E=r?E+" ":x&&("-"==E[0]||"+"==E[0])?E[0]+"0"+E.slice(1):(x?"0":" ")+E}97>n&&(E=E.toUpperCase());E.split("").forEach((function(b){k.push(b.charCodeAt(0))}))}else{if(115==n){u=d("i8*")||0;x=Nf(u);A&&(x=Math.min(Nf(u),C));if(!r){for(;x<y--;){k.push(32)}}for(w=0;w<x;w++){k.push(ed[u++])}if(r){for(;x<y--;){k.push(32)}}}else{if(99==n){for(r&&k.push(d("i8"));0<--y;){k.push(32)}r||k.push(d("i8"))}else{if(110==n){r=d("i32*"),l[r>>2]=k.length}else{if(37==n){k.push(m)}else{for(w=p;w<h+2;w++){k.push(c[w])}}}}}}}h+=2}else{k.push(m),h+=1}}h=a;E=B(k,"i8",Ge);r=1*k.length;0!=r&&-1==vn(f,E,r)&&wn[f]&&(wn[f].error=Na);a=h;a=e}function so(b,d){var e;e=(b+102796|0)>>2;var f=l[e];0<(f|0)||(P(N.n|0,63,N.pb|0,N.eh|0),f=l[e]);f=f-1|0;(l[(b+102412>>2)+(3*f|0)]|0)!=(d|0)&&P(N.n|0,65,N.pb|0,N.lh|0);if(0==(c[b+12*f+102420|0]&1)<<24>>24){var f=b+12*f+102416|0,g=b+102400|0;l[g>>2]=l[g>>2]-l[f>>2]|0}else{Dh(d),f=b+12*f+102416|0}g=b+102404|0;l[g>>2]=l[g>>2]-l[f>>2]|0;l[e]=l[e]-1|0}function to(b,d,e){var f,g,h=d>>2,j=b>>2,k=b+12|0,m=b+64|0,n=d+4|0,p=q[n>>2];(!isNaN(p)&&!isNaN(0))&-Infinity<p&Infinity>p?(p=q[h+2],g=(!isNaN(p)&&!isNaN(0))&-Infinity<p&Infinity>p?5:4):g=4;4==g&&P(N.k|0,27,N.R|0,N.Kf|0);p=d+16|0;g=q[p>>2];(!isNaN(g)&&!isNaN(0))&-Infinity<g&Infinity>g?(g=q[h+5],g=(!isNaN(g)&&!isNaN(0))&-Infinity<g&Infinity>g?8:7):g=7;7==g&&P(N.k|0,28,N.R|0,N.vg|0);g=(d+12|0)>>2;var u=q[g];(!isNaN(u)&&!isNaN(0))&-Infinity<u&Infinity>u||P(N.k|0,29,N.R|0,N.Sg|0);var u=d+24|0,r=q[u>>2];(!isNaN(r)&&!isNaN(0))&-Infinity<r&Infinity>r||P(N.k|0,30,N.R|0,N.fh|0);var r=d+32|0,w=q[r>>2];0>w|(!isNaN(w)&&!isNaN(0))&-Infinity<w&Infinity>w^1&&P(N.k|0,31,N.R|0,N.mh|0);w=d+28|0;f=q[w>>2];0>f|(!isNaN(f)&&!isNaN(0))&-Infinity<f&Infinity>f^1&&P(N.k|0,32,N.R|0,N.th|0);f=(b+4|0)>>1;i[f]=0;var x=0==(c[d+39|0]&1)<<24>>24?0:i[f]=8;0!=(c[d+38|0]&1)<<24>>24&&(x|=16,i[f]=x);0!=(c[d+36|0]&1)<<24>>24&&(x|=4,i[f]=x);0!=(c[d+37|0]&1)<<24>>24&&(x|=2,i[f]=x);0!=(c[d+40|0]&1)<<24>>24&&(i[f]=x|32);l[j+22]=e;d=l[n>>2];n=l[n+4>>2];l[k>>2]=d;l[k+4>>2]=n;k=q[g];e=mm(k);q[j+5]=e;k=nm(k);q[j+6]=k;q[j+7]=0;q[j+8]=0;k=b+36|0;l[k>>2]=d;l[k+4>>2]=n;k=b+44|0;l[k>>2]=d;l[k+4>>2]=n;q[j+13]=q[g];q[j+14]=q[g];q[j+15]=0;l[j+27]=0;l[j+28]=0;l[j+23]=0;l[j+24]=0;g=l[p+4>>2];l[m>>2]=l[p>>2];l[m+4>>2]=g;q[j+18]=q[u>>2];q[j+33]=q[w>>2];q[j+34]=q[r>>2];q[j+35]=q[h+12];q[j+19]=0;q[j+20]=0;q[j+21]=0;q[j+36]=0;m=l[h];l[j]=m;b=b+116|0;2==(m|0)?(q[b>>2]=1,q[j+30]=1):(q[b>>2]=0,q[j+30]=0);q[j+31]=0;q[j+32]=0;l[j+37]=l[h+11];l[j+25]=0;l[j+26]=0}function uo(b,d){var e,f,g=b>>2,h=a;a+=16;f=(b+88|0)>>2;var j=l[l[f]+102868>>2];0!=(j&2|0)&&(P(N.k|0,115,N.we|0,N.V|0),j=l[l[f]+102868>>2]);j=0==(j&2|0);a:do{if(j&&(e=(b|0)>>2,(l[e]|0)!=(d|0))){l[e]=d;vo(b);e=0==(l[e]|0);b:do{if(e){q[g+16]=0;q[g+17]=0;q[g+18]=0;var k=q[g+14];q[g+13]=k;var m=b+44|0,n=b+36|0,p=l[m>>2],m=l[m+4>>2];l[n>>2]=p;l[n+4>>2]=m;n=mm(k);q[h+8>>2]=n;var u=nm(k);q[h+12>>2]=u;var r=q[g+7],w=q[g+8],k=u*r-n*w,n=n*r+u*w,p=(t[0]=p,M[0])-k,n=(t[0]=m,M[0])-n,m=h,p=(M[0]=p,t[0]),n=(M[0]=n,t[0])|0;l[m>>2]=0|p;l[m+4>>2]=n;p=l[f]+102872|0;n=l[g+25];if(0!=(n|0)){for(m=b+12|0;;){if(wo(n,p,h,m),n=l[n+4>>2],0==(n|0)){break b}}}}}while(0);e=b+4|0;p=i[e>>1];0==(p&2)<<16>>16&&(i[e>>1]=p|2,q[g+36]=0);q[g+19]=0;q[g+20]=0;q[g+21]=0;e=l[g+25];if(0!=(e|0)){for(;;){if(xo(e),e=l[e+4>>2],0==(e|0)){break a}}}}}while(0);a=h}function vo(b){var d,e,f,g,h=a;a+=16;e=b+116|0;g=e>>2;var j=b+120|0;f=(b+124|0)>>2;var k=b+128|0,m=b+28|0;q[m>>2]=0;q[b+32>>2]=0;e>>=2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;e=l[(b|0)>>2];if(0==(e|0)||1==(e|0)){var n=b+12|0,p=b+36|0;e=l[(n|0)>>2];n=l[(n+4|0)>>2];l[p>>2]=e;l[p+4>>2]=n;p=b+44|0;l[p>>2]=e;l[p+4>>2]=n;q[b+52>>2]=q[b+56>>2];e=20}else{2!=(e|0)&&P(N.k|0,284,N.rb|0,N.ef|0),e=5}if(5==e){e=Dj;p=l[e+4>>2];e=(t[0]=l[e>>2],M[0]);var p=(t[0]=p,M[0]),n=l[b+100>>2],u=0==(n|0);a:do{if(u){var r=p,w=e}else{var x=h|0,y=h+4|0,A=h+8|0,C=h+12|0,z=p,D=e;d=n;for(d>>=2;;){var E=q[d];if(0!=E){var G=l[d+3];K[l[l[G>>2]+28>>2]](G,h,E);E=q[x>>2];q[g]+=E;D+=q[y>>2]*E;z+=q[A>>2]*E;q[f]+=q[C>>2]}d=l[d+1];if(0==(d|0)){r=z;w=D;break a}d>>=2}}}while(0);e=q[g];0<e?(g=1/e,q[j>>2]=g,j=w*g,r*=g,w=e):(q[g]=1,q[j>>2]=1,j=w,w=1);g=q[f];if(0<g){if(0!=(i[b+4>>1]&16)<<16>>16){e=18}else{var H=g-w*(j*j+r*r);q[f]=H;0<H||(P(N.k|0,319,N.rb|0,N.Db|0),H=q[f]);H=1/H;e=19}}else{e=18}18==e&&(H=q[f]=0);q[k>>2]=H;H=b+44|0;k=l[(H+4|0)>>2];f=(t[0]=l[(H|0)>>2],M[0]);k=(t[0]=k,M[0]);w=(M[0]=j,t[0]);g=(M[0]=r,t[0])|0;l[m>>2]=0|w;l[m+4>>2]=g;w=b+36|0;g=q[b+24>>2];e=q[b+20>>2];m=g*j-e*r+q[b+12>>2];r=e*j+g*r+q[b+16>>2];g=(M[0]=m,t[0]);j=(M[0]=r,t[0]);g|=0;j|=0;l[H>>2]=g;l[H+4>>2]=j;l[w>>2]=g;l[w+4>>2]=j;H=q[b+72>>2];j=b+64|0;q[j>>2]+=(r-k)*-H;b=b+68|0;q[b>>2]+=(m-f)*H}a=h}function yo(b,d){var e,f,g,h,j,k,m=d>>2;k=(b+88|0)>>2;var n=l[k];j=l[n+102868>>2];0!=(j&2|0)&&(P(N.k|0,153,N.ve|0,N.V|0),n=j=l[k],j=l[j+102868>>2]);if(0==(j&2|0)){f=n|0;n=qn(f,44);0==(n|0)?n=0:(i[n+32>>1]=1,i[n+34>>1]=-1,i[n+36>>1]=0,l[n+40>>2]=0,l[n+24>>2]=0,l[n+28>>2]=0,l[n>>2]=0,l[n+4>>2]=0,l[n+8>>2]=0,l[n+12>>2]=0);j=n>>2;l[j+10]=l[m+1];q[j+4]=q[m+2];q[j+5]=q[m+3];j=n+8|0;l[j>>2]=b;var p=n+4|0;l[p>>2]=0;h=(n+32|0)>>1;g=(d+22|0)>>1;i[h]=i[g];i[h+1]=i[g+1];i[h+2]=i[g+2];c[n+38|0]=c[d+20|0]&1;g=l[m];h=K[l[l[g>>2]+8>>2]](g,f);g=(n+12|0)>>2;l[g]=h;h=K[l[l[h>>2]+12>>2]](h);e=qn(f,28*h|0);f=(n+24|0)>>2;l[f]=e;var u=0<(h|0);a:do{if(u&&(l[(e+16|0)>>2]=0,l[(l[f]+24|0)>>2]=-1,1!=(h|0))){for(var r=1;;){if(l[(l[f]+28*r+16|0)>>2]=0,l[(l[f]+28*r+24|0)>>2]=-1,r=r+1|0,(r|0)==(h|0)){break a}}}}while(0);e=(n+28|0)>>2;l[e]=0;h=n|0;q[h>>2]=q[m+4];m=0==(i[b+4>>1]&32)<<16>>16;a:do{if(!m){var u=l[k]+102872|0,r=b+12|0,w=l[g],w=K[l[l[w>>2]+12>>2]](w);l[e]=w;if(0<(w|0)){for(w=0;;){var x=l[f],y=x+28*w|0,A=l[g],C=y|0;K[l[l[A>>2]+24>>2]](A,C,r,w);y=gh(u,C,y);l[(x+28*w+24|0)>>2]=y;l[(x+28*w+16|0)>>2]=n;l[(x+28*w+20|0)>>2]=w;w=w+1|0;if((w|0)>=(l[e]|0)){break a}}}}}while(0);g=b+100|0;l[p>>2]=l[g>>2];l[g>>2]=n;p=b+104|0;l[p>>2]=l[p>>2]+1|0;l[j>>2]=b;0<q[h>>2]&&vo(b);k=l[k]+102868|0;l[k>>2]|=1;k=n}else{k=0}return k}function dp(b,d){var e,f,g;g=(b+88|0)>>2;f=l[l[g]+102868>>2];0!=(f&2|0)&&(P(N.k|0,201,N.ma|0,N.V|0),f=l[l[g]+102868>>2]);if(0==(f&2|0)){var h=d+8|0;(l[h>>2]|0)!=(b|0)&&P(N.k|0,207,N.ma|0,N.Ch|0);f=(b+104|0)>>2;0<(l[f]|0)||P(N.k|0,210,N.ma|0,N.Ih|0);for(e=b+100|0;;){var j=l[e>>2];if(0==(j|0)){P(N.k|0,226,N.ma|0,N.We|0);break}if((j|0)!=(d|0)){e=j+4|0}else{l[e>>2]=l[d+4>>2];break}}e=l[b+112>>2];j=0==(e|0);a:do{if(!j){for(var k=e;;){var m=l[k+4>>2],k=l[k+12>>2];(l[m+48>>2]|0)==(d|0)|(l[m+52>>2]|0)==(d|0)&&fp(l[g]+102872|0,m);if(0==(k|0)){break a}}}}while(0);g=o[g];j=g|0;if(0!=(i[b+4>>1]&32)<<16>>16){e=(d+28|0)>>2;m=0<(l[e]|0);a:do{if(m){for(var k=d+24|0,n=g+102912|0,p=g+102904|0,u=g+102900|0,r=g+102872|0,w=0;;){for(var x=l[k>>2]+28*w+24|0,y=l[x>>2],A=l[n>>2],C=0;(C|0)<(A|0);){var z=(C<<2)+l[p>>2]|0;if((l[z>>2]|0)!=(y|0)){C=C+1|0}else{l[z>>2]=-1;break}}l[u>>2]=l[u>>2]-1|0;Nk(r,y);l[x>>2]=-1;w=w+1|0;if((w|0)>=(l[e]|0)){break a}}}}while(0);l[e]=0}gp(d,j);l[h>>2]=0;l[d+4>>2]=0;h=ed[rn+44|0];e=h&255;14>(h&255)||P(N.e|0,173,N.f|0,N.g|0);h=(e<<2)+g+12|0;l[d>>2]=l[h>>2];l[h>>2]=d;l[f]=l[f]-1|0;vo(b)}}function hp(b,d){var e,f,g=b+88|0;f=l[l[g>>2]+102868>>2];0==(f&2|0)?g=f:(P(N.k|0,340,N.qb|0,N.V|0),g=l[l[g>>2]+102868>>2]);if(0==(g&2|0)&&2==(l[b>>2]|0)){var h=b+120|0;q[h>>2]=0;f=(b+124|0)>>2;q[f]=0;g=b+128|0;q[g>>2]=0;e=q[d>>2];e=0<e?e:1;q[b+116>>2]=e;q[h>>2]=1/e;h=q[d+12>>2];if(0<h&&0==(i[b+4>>1]&16)<<16>>16){var j=q[d+4>>2],k=q[d+8>>2];e=h-e*(j*j+k*k);q[f]=e;0<e?f=e:(P(N.k|0,366,N.qb|0,N.Db|0),f=q[f]);q[g>>2]=1/f}j=b+28|0;e=(b+44|0)>>2;f=l[e+1];g=(t[0]=l[e],M[0]);f=(t[0]=f,M[0]);var h=d+4|0,m=l[h>>2],h=l[h+4>>2];l[j>>2]=m;l[j+4>>2]=h;var j=b+36|0,k=q[b+24>>2],m=(t[0]=m,M[0]),n=q[b+20>>2],p=(t[0]=h,M[0]),h=k*m-n*p+q[b+12>>2],k=n*m+k*p+q[b+16>>2],n=(M[0]=h,t[0]),m=(M[0]=k,t[0]),n=0|n,m=m|0;l[e]=n;l[e+1]=m;l[j>>2]=n;l[j+4>>2]=m;e=q[b+72>>2];j=b+64|0;q[j>>2]+=(k-f)*-e;f=b+68|0;q[f>>2]+=(h-g)*e}}function ip(b,d,e){var f,g=b>>2;f=(b+88|0)>>2;var h=l[f],j=l[h+102868>>2];0!=(j&2|0)&&(P(N.k|0,404,N.ue|0,N.V|0),h=j=l[f],j=l[j+102868>>2]);if(0==(j&2|0)){var j=b+12|0,k=mm(e);q[g+5]=k;var m=nm(e);q[g+6]=m;var n=l[d>>2],p=l[d+4>>2];l[j>>2]=n;l[j+4>>2]=p;var d=b+44|0,u=q[g+7],r=q[g+8],n=(t[0]=n,M[0]),n=m*u-k*r+n,p=(t[0]=p,M[0]),k=k*u+m*r+p,m=(M[0]=n,t[0]),u=(M[0]=k,t[0]),k=0|m,m=u|0;l[d>>2]=k;l[d+4>>2]=m;q[g+14]=e;b=b+36|0;l[b>>2]=k;l[b+4>>2]=m;q[g+13]=e;e=h+102872|0;g=l[g+25];if(0==(g|0)){f=h}else{for(;!(wo(g,e,j,j),g=l[g+4>>2],0==(g|0));){}f=l[f]}f=f+102872|0;jp(f|0,f)}}function kp(b,d){var e,f,g,h;h=(b+88|0)>>2;0!=(l[l[h]+102868>>2]&2|0)&&P(N.k|0,443,N.xe|0,N.V|0);g=(b+4|0)>>1;var j=i[g],k=0!=(j&32)<<16>>16^d;a:do{if(k){if(d){i[g]=j|32;var m=l[h]+102872|0;f=l[b+100>>2];if(0!=(f|0)){for(var n=b+12|0,p=f;;){f=(p+28|0)>>2;0!=(l[f]|0)&&P(N.Pa|0,124,N.Ee|0,N.Ab|0);var u=p+12|0,r=l[u>>2],r=K[l[l[r>>2]+12>>2]](r);l[f]=r;r=0<(r|0);b:do{if(r){var w=p+24|0;for(e=0;;){var x=l[w>>2],y=x+28*e|0,A=l[u>>2],C=y|0;K[l[l[A>>2]+24>>2]](A,C,n,e);y=gh(m,C,y);l[(x+28*e+24|0)>>2]=y;l[(x+28*e+16|0)>>2]=p;l[(x+28*e+20|0)>>2]=e;e=e+1|0;if((e|0)>=(l[f]|0)){break b}}}}while(0);f=l[p+4>>2];if(0==(f|0)){break a}p=f}}}else{i[g]=j&-33;m=l[h];n=l[b+100>>2];f=0==(n|0);b:do{if(!f){p=m+102912|0;u=m+102904|0;r=m+102900|0;w=m+102872|0;for(x=n;;){e=(x+28|0)>>2;y=0<(l[e]|0);c:do{if(y){A=x+24|0;for(C=0;;){for(var z=l[A>>2]+28*C+24|0,D=l[z>>2],E=l[p>>2],G=0;(G|0)<(E|0);){var H=(G<<2)+l[u>>2]|0;if((l[H>>2]|0)!=(D|0)){G=G+1|0}else{l[H>>2]=-1;break}}l[r>>2]=l[r>>2]-1|0;Nk(w,D);l[z>>2]=-1;C=C+1|0;if((C|0)>=(l[e]|0)){break c}}}}while(0);l[e]=0;e=l[x+4>>2];if(0==(e|0)){break b}x=e}}}while(0);m=b+112|0;n=l[m>>2];f=0==(n|0);b:do{if(!f){for(p=n;;){u=l[p+12>>2];fp(l[h]+102872|0,l[p+4>>2]);if(0==(u|0)){break b}p=u}}}while(0);l[m>>2]=0}}}while(0)}function lp(b){var d=b>>2,e=a,f=b+8|0,g=l[f>>2];V(N.Qa|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.vf|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));var h=l[d];V(N.Bf|0,(s=a,a+=4,l[s>>2]=h,s));var h=q[d+3],j=q[d+4];V(N.Ff|0,(s=a,a+=16,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=j,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));h=q[d+14];V(N.Lf|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s));h=q[d+16];j=q[d+17];V(N.Of|0,(s=a,a+=16,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=j,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));h=q[d+18];V(N.Qf|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s));h=q[d+33];V(N.Tf|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s));h=q[d+34];V(N.Xf|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=(b+4|0)>>1;h=jd[b]&4;V(N.Yf|0,(s=a,a+=4,l[s>>2]=h,s));h=jd[b]&2;V(N.cg|0,(s=a,a+=4,l[s>>2]=h,s));h=jd[b]&16;V(N.ig|0,(s=a,a+=4,l[s>>2]=h,s));h=jd[b]&8;V(N.lg|0,(s=a,a+=4,l[s>>2]=h,s));b=jd[b]&32;V(N.pg|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+35];V(N.tg|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=l[f>>2];V(N.xg|0,(s=a,a+=4,l[s>>2]=f,s));V(N.Za|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));d=l[d+25];f=0==(d|0);a:do{if(!f){for(b=d;;){if(V(N.Dg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),mp(b,g),V(N.Fg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),b=l[b+4>>2],0==(b|0)){break a}}}}while(0);V(N.Ra|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));a=e}function fp(b,d){var e,f;e=l[l[d+48>>2]+8>>2];var g=l[l[d+52>>2]+8>>2];f=l[b+72>>2];if(0!=(f|0)&&0!=(l[d+4>>2]&2|0)){K[l[l[f>>2]+12>>2]](f,d)}var h=d+8|0,j=l[h>>2];f=(d+12|0)>>2;0!=(j|0)&&(l[(j+12|0)>>2]=l[f]);j=l[f];0!=(j|0)&&(l[(j+8|0)>>2]=l[h>>2]);h=b+60|0;(l[h>>2]|0)==(d|0)&&(l[h>>2]=l[f]);h=d+24|0;j=l[h>>2];f=(d+28|0)>>2;0!=(j|0)&&(l[(j+12|0)>>2]=l[f]);j=l[f];0!=(j|0)&&(l[(j+8|0)>>2]=l[h>>2]);e=e+112|0;(d+16|0)==(l[e>>2]|0)&&(l[e>>2]=l[f]);f=d+40|0;h=l[f>>2];e=(d+44|0)>>2;0!=(h|0)&&(l[(h+12|0)>>2]=l[e]);h=l[e];0!=(h|0)&&(l[(h+8|0)>>2]=l[f>>2]);g=g+112|0;(d+32|0)==(l[g>>2]|0)&&(l[g>>2]=l[e]);g=l[b+76>>2];0==(c[np]&1)<<24>>24&&P(N.$|0,103,N.Ja|0,N.Jg|0);e=d+48|0;if(0<(l[d+124>>2]|0)){f=l[l[e>>2]+8>>2];h=f+4|0;j=i[h>>1];0==(j&2)<<16>>16&&(i[h>>1]=j|2,q[f+144>>2]=0);f=d+52|0;var h=l[l[f>>2]+8>>2],j=h+4|0,k=i[j>>1];0==(k&2)<<16>>16&&(i[j>>1]=k|2,q[h+144>>2]=0)}else{f=d+52|0}e=l[l[l[e>>2]+12>>2]+4>>2];f=l[l[l[f>>2]+12>>2]+4>>2];-1<(e|0)&4>(f|0)||(P(N.$|0,114,N.Ja|0,N.Rb|0),P(N.$|0,115,N.Ja|0,N.Rb|0));K[l[(op+4>>2)+(12*e|0)+(3*f|0)]](d,g);g=b+64|0;l[g>>2]=l[g>>2]-1|0}function pp(b){var d,e,f,g,h,j=l[b+60>>2],k=0==(j|0);a:do{if(!k){var m=b+12|0,n=b+4|0,p=b+72|0,u=b+68|0,r=j;for(g=r>>2;;){var w=l[g+12];e=l[g+13];var x=l[g+14],y=l[g+15],A=l[w+8>>2],C=l[e+8>>2];f=(r+4|0)>>2;var z=l[f],D=0==(z&8|0);b:do{if(D){h=19}else{h=2==(l[C>>2]|0)?7:2==(l[A>>2]|0)?7:12;c:do{if(7==h){for(h=C+108|0;;){h=l[h>>2];if(0==(h|0)){break}if((l[h>>2]|0)==(A|0)&&0==(c[l[h+4>>2]+61|0]&1)<<24>>24){break c}h=h+12|0}h=l[u>>2];if(0!=(h|0)){if(!K[l[l[h>>2]+8>>2]](h,w,e)){f=l[g+3];fp(b,r);var E=f;h=13;break b}z=l[f]}l[f]=z&-9;h=19;break b}}while(0);E=l[g+3];fp(b,r);h=13}}while(0);19==h&&((0==(i[A+4>>1]&2)<<16>>16?0:0!=(l[A>>2]|0))|(0==(i[C+4>>1]&2)<<16>>16?0:0!=(l[C>>2]|0))?(w=l[(l[w+24>>2]+24>>2)+(7*x|0)],y=l[(l[e+24>>2]+24>>2)+(7*y|0)],h=-1<(w|0)?(l[m>>2]|0)>(w|0)?28:27:27,27==h&&P(N.q|0,159,N.H|0,N.o|0),x=l[n>>2],e=x>>2,-1<(y|0)?(l[m>>2]|0)>(y|0)?(d=x,d>>=2,h=31):h=30:h=30,30==h&&(P(N.q|0,159,N.H|0,N.o|0),d=l[n>>2],d>>=2),0<q[d+(9*y|0)]-q[e+(9*w|0)+2]|0<q[d+(9*y|0)+1]-q[e+(9*w|0)+3]|0<q[e+(9*w|0)]-q[d+(9*y|0)+2]|0<q[e+(9*w|0)+1]-q[d+(9*y|0)+3])?(g=l[g+3],fp(b,r),E=g):(qp(r,l[p>>2]),E=l[g+3]):E=l[g+3]);if(0==(E|0)){break a}r=E;g=r>>2}}}while(0)}function jp(b,d){var e,f,g=a;a+=4;var h;f=(b+52|0)>>2;l[f]=0;e=(b+40|0)>>2;h=l[e];if(0<(h|0)){for(var j=b+32|0,k=b+56|0,m=b|0,n=b+12|0,p=b+4|0,u=0;;){var r=l[l[j>>2]+(u<<2)>>2];l[k>>2]=r;if(-1!=(r|0)){h=-1<(r|0)?(l[n>>2]|0)>(r|0)?8:7:7;7==h&&P(N.q|0,159,N.H|0,N.o|0);var w=m,x=b,y=l[p>>2]+36*r|0,A=Ha,C=r=h=Ha,z=Ha,D=Ha,E=Ha,G=a;a+=1036;var H=G+4|0,E=(G|0)>>2;l[E]=H;D=(G+1028|0)>>2;z=(G+1032|0)>>2;l[z]=256;l[H>>2]=l[w>>2];l[D]=1;var w=w+4|0,F=y|0,I=y+4|0,J=y+8|0,y=y+12|0,C=(x+56|0)>>2,r=(x+52|0)>>2,L=x+48|0;h=(x+44|0)>>2;A=1;for(x=H;;){var O=A-1|0;l[D]=O;var R=l[x+(O<<2)>>2];if(-1==(R|0)){x=O}else{var T=l[w>>2],A=T>>2;if(0<q[F>>2]-q[A+(9*R|0)+2]|0<q[I>>2]-q[A+(9*R|0)+3]|0<q[A+(9*R|0)]-q[J>>2]|0<q[A+(9*R|0)+1]-q[y>>2]){x=O}else{if(A=T+36*R+24|0,-1==(l[A>>2]|0)){A=l[C],(A|0)==(R|0)?x=O:(x=l[r],(x|0)==(l[L>>2]|0)&&(A=l[h],l[L>>2]=x<<1,x=Ne(24*x|0),l[h]=x,Ch(x,A,12*l[r]|0),Dh(A),A=l[C],x=l[r]),l[(l[h]+12*x|0)>>2]=(A|0)>(R|0)?R:A,x=l[C],l[(l[h]+12*l[r]+4|0)>>2]=(x|0)<(R|0)?R:x,l[r]=l[r]+1|0,x=l[D])}else{if((O|0)==(l[z]|0)){l[z]=O<<1;O=Ne(O<<3);l[E]=O;var S=x;Ch(O,S,l[D]<<2);(x|0)!=(H|0)&&Dh(S)}l[((l[D]<<2)+l[E]|0)>>2]=l[A>>2];x=l[D]+1|0;l[D]=x;R=T+36*R+28|0;(x|0)==(l[z]|0)&&(A=l[E],l[z]=x<<1,x=Ne(x<<3),l[E]=x,T=A,Ch(x,T,l[D]<<2),(A|0)!=(H|0)&&Dh(T));l[((l[D]<<2)+l[E]|0)>>2]=l[R>>2];R=l[D]+1|0;x=l[D]=R}}}R=l[E];if(0>=(x|0)){break}A=x;x=R}(R|0)!=(H|0)&&(Dh(R),l[E]=0);a=G;h=l[e]}u=u+1|0;if((u|0)>=(h|0)){break}}j=l[f]}else{j=0}l[e]=0;e=(b+44|0)>>2;k=l[e];l[g>>2]=2;rp(k,k+12*j|0,g);j=0<(l[f]|0);a:do{if(j){k=b+12|0;m=b+4|0;u=l[e];n=0;p=u;u=l[u>>2];b:for(;;){r=p+12*n|0;h=-1<(u|0)?(l[k>>2]|0)>(u|0)?16:15:15;15==h&&P(N.q|0,153,N.S|0,N.o|0);h=l[m>>2];z=l[(h+16>>2)+(9*u|0)];C=p+12*n+4|0;D=l[C>>2];if(-1<(D|0)){if((l[k>>2]|0)>(D|0)){var U=h;h=19}else{h=18}}else{h=18}18==h&&(P(N.q|0,153,N.S|0,N.o|0),U=l[m>>2]);sp(d,z,l[(U+16>>2)+(9*D|0)]);h=l[f];for(z=n;;){z=z+1|0;if((z|0)>=(h|0)){break a}D=l[e];E=l[(D>>2)+(3*z|0)];if((E|0)!=(l[r>>2]|0)){n=z;p=D;u=E;continue b}if((l[(D+4>>2)+(3*z|0)]|0)!=(l[C>>2]|0)){n=z;p=D;u=E;continue b}}}}}while(0);a=g}function sp(b,d,e){var f,g,h=l[d+16>>2],j=l[e+16>>2],d=l[d+20>>2],e=l[e+20>>2],k=l[h+8>>2],m=l[j+8>>2],n=(k|0)==(m|0);a:do{if(!n){for(var p=m+112|0;;){p=l[p>>2];if(0==(p|0)){break}if((l[p>>2]|0)==(k|0)){g=l[p+4>>2]>>2;var u=l[g+12],r=l[g+13];f=l[g+14];g=l[g+15];if((u|0)==(h|0)&(r|0)==(j|0)&(f|0)==(d|0)&(g|0)==(e|0)){break a}if((u|0)==(j|0)&(r|0)==(h|0)&(f|0)==(e|0)&(g|0)==(d|0)){break a}}p=p+12|0}if(!(2!=(l[m>>2]|0)&&2!=(l[k>>2]|0))){for(p=m+108|0;;){p=l[p>>2];if(0==(p|0)){break}if((l[p>>2]|0)==(k|0)&&0==(c[l[p+4>>2]+61|0]&1)<<24>>24){break a}p=p+12|0}p=l[b+68>>2];if(0==(p|0)||K[l[l[p>>2]+8>>2]](p,h,j)){p=h;u=d;r=j;f=e;g=l[b+76>>2];0==(c[np]&1)<<24>>24&&(l[op>>2]=4,l[op+4>>2]=6,c[op+8|0]=1,l[op+96>>2]=8,l[op+100>>2]=10,c[op+104|0]=1,l[op+24>>2]=8,l[op+28>>2]=10,c[op+32|0]=0,l[op+120>>2]=12,l[op+124>>2]=14,c[op+128|0]=1,l[op+48>>2]=16,l[op+52>>2]=18,c[op+56|0]=1,l[op+12>>2]=16,l[op+16>>2]=18,c[op+20|0]=0,l[op+72>>2]=20,l[op+76>>2]=22,c[op+80|0]=1,l[op+108>>2]=20,l[op+112>>2]=22,c[op+116|0]=0,l[op+144>>2]=24,l[op+148>>2]=26,c[op+152|0]=1,l[op+36>>2]=24,l[op+40>>2]=26,c[op+44|0]=0,l[op+168>>2]=28,l[op+172>>2]=30,c[op+176|0]=1,l[op+132>>2]=28,l[op+136>>2]=30,c[op+140|0]=0,c[np]=1);var w=o[l[p+12>>2]+4>>2],x=o[l[r+12>>2]+4>>2];4>w>>>0||P(N.$|0,80,N.wb|0,N.gf|0);4>x>>>0||P(N.$|0,81,N.wb|0,N.Zf|0);var y=o[(op>>2)+(12*w|0)+(3*x|0)],r=0==(y|0)?0:0==(c[op+48*w+12*x+8|0]&1)<<24>>24?K[y](r,f,p,u,g):K[y](p,u,r,f,g);0!=(r|0)&&(u=l[l[r+48>>2]+8>>2],p=l[l[r+52>>2]+8>>2],l[(r+8|0)>>2]=0,f=(b+60|0)>>2,l[(r+12|0)>>2]=l[f],g=l[f],0!=(g|0)&&(l[(g+8|0)>>2]=r),l[f]=r,g=r+16|0,l[(r+20|0)>>2]=r,l[(g|0)>>2]=p,l[(r+24|0)>>2]=0,f=(u+112|0)>>2,l[(r+28|0)>>2]=l[f],w=l[f],0!=(w|0)&&(l[(w+8|0)>>2]=g),l[f]=g,g=r+32|0,l[(r+36|0)>>2]=r,l[(g|0)>>2]=u,l[(r+40|0)>>2]=0,f=(p+112|0)>>2,l[(r+44|0)>>2]=l[f],r=l[f],0!=(r|0)&&(l[(r+8|0)>>2]=g),l[f]=g,r=u+4|0,f=i[r>>1],0==(f&2)<<16>>16&&(i[r>>1]=f|2,q[u+144>>2]=0),u=p+4|0,r=i[u>>1],0==(r&2)<<16>>16&&(i[u>>1]=r|2,q[p+144>>2]=0),p=b+64|0,l[p>>2]=l[p>>2]+1|0)}}}}while(0)}function rp(b,d,e){var f,g,h,j,k,m,n,p,u,r,w,x,y,A,C,z,D,E,G,H,F,I,J,L,O,R,T,S,U,W,Q,$,ea,sa,Ba,oa,ga,qa,la,Ca,ia,ya,ta,Ia,na,Z,ba,ca,ma,ka,aa=e>>2,ra=a;a+=12;var ha,za=d,X=b;ka=X>>2;a:for(;;){var ua=X;ma=(X|0)>>2;ca=(X+4|0)>>2;ba=(X+8|0)>>2;Z=X>>2;var da=X+12|0,fa=za;b:for(;;){var Aa=fa,Qa=Aa-ua|0,pa=(Qa|0)/12&-1;if(0==(pa|0)||1==(pa|0)){ha=81;break a}else{if(2==(pa|0)){var cb=fa-12|0;if(!K[l[aa]](cb,X)){ha=81;break a}var Ra=l[ma],Ta=l[ca],$a=l[ba];na=cb>>2;l[Z]=l[na];l[Z+1]=l[na+1];l[Z+2]=l[na+2];l[cb>>2]=Ra;l[fa-12+4>>2]=Ta;l[fa-12+8>>2]=$a;ha=81;break a}else{if(3==(pa|0)){var va=fa-12|0;Ia=va>>2;var Wa=K[l[aa]](da,X),fb=K[l[aa]](va,da);if(!Wa){if(!fb){ha=81;break a}var gb=da|0,Xa=l[gb>>2],Ua=X+16|0,Va=l[Ua>>2],pb=X+20|0,nb=l[pb>>2];ta=da>>2;ya=va>>2;l[ta]=l[ya];l[ta+1]=l[ya+1];l[ta+2]=l[ya+2];l[Ia]=Xa;l[fa-12+4>>2]=Va;l[fa-12+8>>2]=nb;if(!K[l[aa]](da,X)){ha=81;break a}var La=l[ma],qb=l[ca],bb=l[ba];l[Z]=l[ta];l[Z+1]=l[ta+1];l[Z+2]=l[ta+2];l[gb>>2]=La;l[Ua>>2]=qb;l[pb>>2]=bb;ha=81;break a}var Fa=l[ma],Ma=l[ca],wa=l[ba];if(fb){ia=va>>2;l[Z]=l[ia];l[Z+1]=l[ia+1];l[Z+2]=l[ia+2];l[Ia]=Fa;l[fa-12+4>>2]=Ma;l[fa-12+8>>2]=wa;ha=81;break a}Ca=da>>2;l[Z]=l[Ca];l[Z+1]=l[Ca+1];l[Z+2]=l[Ca+2];var hb=da|0;l[hb>>2]=Fa;var Ya=X+16|0;l[Ya>>2]=Ma;var Za=X+20|0;l[Za>>2]=wa;if(!K[l[aa]](va,da)){ha=81;break a}var Da=l[hb>>2],Oa=l[Ya>>2],ib=l[Za>>2];la=va>>2;l[Ca]=l[la];l[Ca+1]=l[la+1];l[Ca+2]=l[la+2];l[Ia]=Da;l[fa-12+4>>2]=Oa;l[fa-12+8>>2]=ib;ha=81;break a}else{if(4==(pa|0)){tp(X,da,X+24|0,fa-12|0,e);ha=81;break a}else{if(5==(pa|0)){var ab=X+24|0,Ga=X+36|0,jb=fa-12|0;tp(X,da,ab,Ga,e);if(!K[l[aa]](jb,Ga)){ha=81;break a}var Ea=Ga|0,Pa=l[Ea>>2],Ja=X+40|0,db=l[Ja>>2],xa=X+44|0,Sa=l[xa>>2];qa=Ga>>2;ga=jb>>2;l[qa]=l[ga];l[qa+1]=l[ga+1];l[qa+2]=l[ga+2];l[jb>>2]=Pa;l[fa-12+4>>2]=db;l[fa-12+8>>2]=Sa;if(!K[l[aa]](Ga,ab)){ha=81;break a}var Ka=ab|0,tb=l[Ka>>2],kb=X+28|0,ub=l[kb>>2],rb=X+32|0,Bb=l[rb>>2];oa=ab>>2;l[oa]=l[qa];l[oa+1]=l[qa+1];l[oa+2]=l[qa+2];l[Ea>>2]=tb;l[Ja>>2]=ub;l[xa>>2]=Bb;if(!K[l[aa]](ab,da)){ha=81;break a}var lb=da|0,yb=l[lb>>2],xb=X+16|0,Ib=l[xb>>2],wb=X+20|0,vb=l[wb>>2];Ba=da>>2;l[Ba]=l[oa];l[Ba+1]=l[oa+1];l[Ba+2]=l[oa+2];l[Ka>>2]=yb;l[kb>>2]=Ib;l[rb>>2]=vb;if(!K[l[aa]](da,X)){ha=81;break a}var zb=l[ma],Eb=l[ca],Cb=l[ba];l[Z]=l[Ba];l[Z+1]=l[Ba+1];l[Z+2]=l[Ba+2];l[lb>>2]=zb;l[xb>>2]=Eb;l[wb>>2]=Cb;ha=81;break a}else{if(372>(Qa|0)){ha=22;break a}var eb=fa-12|0;sa=eb>>2;var sb=(Qa|0)/24&-1,ob=X+12*sb|0;if(11988<(Qa|0)){var Db=(Qa|0)/48&-1,Jb=X+12*Db|0,Rb=Db+sb|0,Nb=X+12*Rb|0,Ob=tp(X,Jb,ob,Nb,e);if(K[l[aa]](eb,Nb)){var Lb=Nb|0,Pb=l[Lb>>2],Mb=X+12*Rb+4|0,Yb=l[Mb>>2],Zb=X+12*Rb+8|0,ec=l[Zb>>2];ea=Nb>>2;$=eb>>2;l[ea]=l[$];l[ea+1]=l[$+1];l[ea+2]=l[$+2];l[sa]=Pb;l[fa-12+4>>2]=Yb;l[fa-12+8>>2]=ec;var Ub=Ob+1|0;if(K[l[aa]](Nb,ob)){var jc=ob|0,Qb=l[jc>>2],mb=X+12*sb+4|0,cc=l[mb>>2],Fb=X+12*sb+8|0,gc=l[Fb>>2];Q=ob>>2;l[Q]=l[ea];l[Q+1]=l[ea+1];l[Q+2]=l[ea+2];l[Lb>>2]=Qb;l[Mb>>2]=cc;l[Zb>>2]=gc;var wc=Ob+2|0;if(K[l[aa]](ob,Jb)){var pc=Jb|0,qc=l[pc>>2],$c=X+12*Db+4|0,Ec=l[$c>>2],sc=X+12*Db+8|0,kd=l[sc>>2];W=Jb>>2;l[W]=l[Q];l[W+1]=l[Q+1];l[W+2]=l[Q+2];l[jc>>2]=qc;l[mb>>2]=Ec;l[Fb>>2]=kd;var wd=Ob+3|0;if(K[l[aa]](Jb,X)){var Lc=l[ma],$b=l[ca],ac=l[ba];l[Z]=l[W];l[Z+1]=l[W+1];l[Z+2]=l[W+2];l[pc>>2]=Lc;l[$c>>2]=$b;l[sc>>2]=ac;oc=Ob+4|0}else{oc=wd}}else{oc=wc}}else{oc=Ub}}else{var oc=Ob}}else{var tc=K[l[aa]](ob,X),Nc=K[l[aa]](eb,ob);if(tc){var ld=l[ma],Wc=l[ca],ad=l[ba];if(Nc){U=eb>>2,l[Z]=l[U],l[Z+1]=l[U+1],l[Z+2]=l[U+2],l[sa]=ld,l[fa-12+4>>2]=Wc,l[fa-12+8>>2]=ad,oc=1}else{S=ob>>2;l[Z]=l[S];l[Z+1]=l[S+1];l[Z+2]=l[S+2];var Xc=ob|0;l[Xc>>2]=ld;var Cc=X+12*sb+4|0;l[Cc>>2]=Wc;var fd=X+12*sb+8|0;l[fd>>2]=ad;if(K[l[aa]](eb,ob)){var md=l[Xc>>2],nd=l[Cc>>2],Oc=l[fd>>2];T=eb>>2;l[S]=l[T];l[S+1]=l[T+1];l[S+2]=l[T+2];l[sa]=md;l[fa-12+4>>2]=nd;l[fa-12+8>>2]=Oc;oc=2}else{oc=1}}}else{if(Nc){var gd=ob|0,od=l[gd>>2],pd=X+12*sb+4|0,Pd=l[pd>>2],Xd=X+12*sb+8|0,qd=l[Xd>>2];R=ob>>2;O=eb>>2;l[R]=l[O];l[R+1]=l[O+1];l[R+2]=l[O+2];l[sa]=od;l[fa-12+4>>2]=Pd;l[fa-12+8>>2]=qd;if(K[l[aa]](ob,X)){var Qd=l[ma],Pc=l[ca],Ic=l[ba];l[Z]=l[R];l[Z+1]=l[R+1];l[Z+2]=l[R+2];l[gd>>2]=Qd;l[pd>>2]=Pc;l[Xd>>2]=Ic;oc=2}else{oc=1}}else{oc=0}}}if(K[l[aa]](X,ob)){var Jc=eb,fc=oc}else{for(var hd=eb;;){var xd=hd-12|0,bd=o[aa];if((X|0)==(xd|0)){break b}if(K[bd](xd,ob)){break}hd=xd}var rd=l[ma],ye=l[ca],Yd=l[ba];L=xd>>2;l[Z]=l[L];l[Z+1]=l[L+1];l[Z+2]=l[L+2];l[xd>>2]=rd;l[hd-12+4>>2]=ye;l[hd-12+8>>2]=Yd;Jc=xd;fc=oc+1|0}var Tc=da>>>0<Jc>>>0;c:do{if(Tc){for(var xc=Jc,bc=da,Ed=fc,yc=ob;;){var Ac=bc;for(J=Ac>>2;;){var Zd=K[l[aa]](Ac,yc),$d=Ac+12|0;if(!Zd){var cd=xc;break}Ac=$d;J=Ac>>2}for(;;){var zc=cd-12|0;if(K[l[aa]](zc,yc)){break}cd=zc}if(Ac>>>0>zc>>>0){var kc=Ac;I=kc>>2;var Rd=Ed,Fc=yc;F=Fc>>2;break c}var Qc=l[J],Mc=l[J+1],ne=l[J+2];H=Ac>>2;G=zc>>2;l[H]=l[G];l[H+1]=l[G+1];l[H+2]=l[G+2];l[zc>>2]=Qc;l[cd-12+4>>2]=Mc;l[cd-12+8>>2]=ne;var Sd=(yc|0)==(Ac|0)?zc:yc,xc=zc,bc=$d,Ed=Ed+1|0,yc=Sd}}else{kc=da,I=kc>>2,Rd=fc,Fc=ob,F=Fc>>2}}while(0);if((kc|0)==(Fc|0)){var Td=Rd}else{if(K[l[aa]](Fc,kc)){var Ud=l[I],xf=l[I+1],Fd=l[I+2];E=kc>>2;D=Fc>>2;l[E]=l[D];l[E+1]=l[D+1];l[E+2]=l[D+2];l[F]=Ud;l[F+1]=xf;l[F+2]=Fd;Td=Rd+1|0}else{Td=Rd}}if(0==(Td|0)){var oe=up(X,kc,e),He=kc+12|0;if(up(He,fa,e)){if(oe){ha=81;break a}fa=kc;continue}else{if(oe){za=fa;X=He;ka=X>>2;continue a}}}var ae=kc;if((ae-ua|0)<(Aa-ae|0)){rp(X,kc,e);za=fa;X=kc+12|0;ka=X>>2;continue a}rp(kc+12|0,fa,e);fa=kc}}}}}}if(K[bd](X,eb)){var Gc=da}else{var dd=da;for(z=dd>>2;;){if((dd|0)==(eb|0)){ha=81;break a}var be=K[l[aa]](X,dd),pe=dd+12|0;if(be){break}dd=pe;z=dd>>2}var Uc=l[z],lc=l[z+1],Gd=l[z+2];C=dd>>2;A=eb>>2;l[C]=l[A];l[C+1]=l[A+1];l[C+2]=l[A+2];l[sa]=Uc;l[fa-12+4>>2]=lc;l[fa-12+8>>2]=Gd;Gc=pe}if((Gc|0)==(eb|0)){ha=81;break}for(var Hd=eb,Re=Gc;;){var Id=Re;for(y=Id>>2;;){var Jd=K[l[aa]](X,Id),qe=Id+12|0;if(Jd){var re=Hd;break}Id=qe;y=Id>>2}for(;;){var Kd=re-12|0;if(!K[l[aa]](X,Kd)){break}re=Kd}if(Id>>>0>=Kd>>>0){za=fa;X=Id;ka=X>>2;continue a}var Se=l[y],Rf=l[y+1],sd=l[y+2];x=Id>>2;w=Kd>>2;l[x]=l[w];l[x+1]=l[w+1];l[x+2]=l[w+2];l[Kd>>2]=Se;l[re-12+4>>2]=Rf;l[re-12+8>>2]=sd;Hd=Kd;Re=qe}}a:do{if(22==ha){r=ra>>2;var Vc=X+24|0;u=Vc>>2;var Te=K[l[aa]](da,X),Ue=K[l[aa]](Vc,da);if(Te){var ce=l[ma],Yc=l[ca],yd=l[ba];if(Ue){p=Vc>>2,l[Z]=l[p],l[Z+1]=l[p+1],l[Z+2]=l[p+2],l[u]=ce,l[ka+7]=Yc,l[ka+8]=yd}else{n=da>>2;l[Z]=l[n];l[Z+1]=l[n+1];l[Z+2]=l[n+2];var $e=da|0;l[$e>>2]=ce;var ze=X+16|0;l[ze>>2]=Yc;var Zc=X+20|0;l[Zc>>2]=yd;if(K[l[aa]](Vc,da)){var Ld=l[$e>>2],Md=l[ze>>2],de=l[Zc>>2];m=Vc>>2;l[n]=l[m];l[n+1]=l[m+1];l[n+2]=l[m+2];l[u]=Ld;l[ka+7]=Md;l[ka+8]=de}}}else{if(Ue){var zd=da|0,ee=l[zd>>2],yf=X+16|0,af=l[yf>>2],Ie=X+20|0,zf=l[Ie>>2];k=da>>2;j=Vc>>2;l[k]=l[j];l[k+1]=l[j+1];l[k+2]=l[j+2];l[u]=ee;l[ka+7]=af;l[ka+8]=zf;if(K[l[aa]](da,X)){var jf=l[ma],bf=l[ca],Sf=l[ba];l[Z]=l[k];l[Z+1]=l[k+1];l[Z+2]=l[k+2];l[zd>>2]=jf;l[yf>>2]=bf;l[Ie>>2]=Sf}}}var kf=X+36|0;if((kf|0)!=(fa|0)){for(var Ae=Vc,Ad=kf;;){if(K[l[aa]](Ad,Ae)){h=Ad>>2;l[r]=l[h];l[r+1]=l[h+1];l[r+2]=l[h+2];for(var Af=Ae,Tf=Ad;;){g=Tf>>2;f=Af>>2;l[g]=l[f];l[g+1]=l[f+1];l[g+2]=l[f+2];if((Af|0)==(X|0)){break}var Gg=Af-12|0;if(!K[l[aa]](ra,Gg)){break}Tf=Af;Af=Gg}l[f]=l[r];l[f+1]=l[r+1];l[f+2]=l[r+2]}var Hg=Ad+12|0;if((Hg|0)==(fa|0)){break a}Ae=Ad;Ad=Hg}}}}while(0);a=ra}function tp(b,d,e,f,g){var h,j,k,m,n=g>>2;k=e>>2;var g=b>>2,p=K[l[n]](d,b);j=K[l[n]](e,d);if(p){var u=l[g];m=l[g+1];p=l[g+2];h=b>>2;j?(j=e>>2,l[h]=l[j],l[h+1]=l[j+1],l[h+2]=l[j+2],l[k]=u,l[k+1]=m,l[k+2]=p,k=1):(j=d>>2,l[h]=l[j],l[h+1]=l[j+1],l[h+2]=l[j+2],h=d|0,l[h>>2]=u,u=d+4|0,l[u>>2]=m,m=d+8|0,l[m>>2]=p,K[l[n]](e,d)?(p=l[h>>2],u=l[u>>2],h=l[m>>2],m=e>>2,l[j]=l[m],l[j+1]=l[m+1],l[j+2]=l[m+2],l[k]=p,l[k+1]=u,l[k+2]=h,k=2):k=1)}else{if(j){var p=d|0,r=l[p>>2];m=d+4|0;var w=l[m>>2],u=d+8|0,x=l[u>>2];j=d>>2;h=e>>2;l[j]=l[h];l[j+1]=l[h+1];l[j+2]=l[h+2];l[k]=r;l[k+1]=w;l[k+2]=x;K[l[n]](d,b)?(h=l[g],r=l[g+1],w=l[g+2],k=b>>2,l[k]=l[j],l[k+1]=l[j+1],l[k+2]=l[j+2],l[p>>2]=h,l[m>>2]=r,l[u>>2]=w,k=2):k=1}else{k=0}}if(K[l[n]](f,e)){if(p=e|0,r=l[p>>2],m=e+4|0,w=l[m>>2],u=e+8|0,x=l[u>>2],j=e>>2,h=f>>2,l[j]=l[h],l[j+1]=l[h+1],l[j+2]=l[h+2],l[f>>2]=r,l[f+4>>2]=w,l[f+8>>2]=x,f=k+1|0,K[l[n]](e,d)){f=d|0;w=l[f>>2];h=d+4|0;var x=l[h>>2],r=d+8|0,y=l[r>>2],e=d>>2;l[e]=l[j];l[e+1]=l[j+1];l[e+2]=l[j+2];l[p>>2]=w;l[m>>2]=x;l[u>>2]=y;j=k+2|0;K[l[n]](d,b)?(d=l[g],n=l[g+1],g=l[g+2],b>>=2,l[b]=l[e],l[b+1]=l[e+1],l[b+2]=l[e+2],l[f>>2]=d,l[h>>2]=n,l[r>>2]=g,b=k+3|0):b=j}else{b=f}}else{b=k}return b}function up(b,d,e){var f,g,h,j,k,m,n,p,u,r,w,x,y,A,C,z,D,E,G,H,F,I,J,L,O,R,T,S=e>>2,U=b>>2,W=a;a+=12;var Q=(d-b|0)/12&-1;a:do{if(0==(Q|0)||1==(Q|0)){var $=1}else{if(2==(Q|0)){var ea=d-12|0;if(K[l[S]](ea,b)){var sa=l[U],Ba=l[U+1],oa=l[U+2];T=b>>2;R=ea>>2;l[T]=l[R];l[T+1]=l[R+1];l[T+2]=l[R+2];l[ea>>2]=sa;l[d-12+4>>2]=Ba;l[d-12+8>>2]=oa}$=1}else{if(3==(Q|0)){var ga=b+12|0,qa=d-12|0;O=qa>>2;var la=K[l[S]](ga,b),Ca=K[l[S]](qa,ga);if(la){var ia=l[U],ya=l[U+1],ta=l[U+2];L=b>>2;if(Ca){J=qa>>2,l[L]=l[J],l[L+1]=l[J+1],l[L+2]=l[J+2],l[O]=ia,l[d-12+4>>2]=ya,l[d-12+8>>2]=ta}else{I=ga>>2;l[L]=l[I];l[L+1]=l[I+1];l[L+2]=l[I+2];var Ia=ga|0;l[Ia>>2]=ia;var na=b+16|0;l[na>>2]=ya;var Z=b+20|0;l[Z>>2]=ta;if(K[l[S]](qa,ga)){var ba=l[Ia>>2],ca=l[na>>2],ma=l[Z>>2];F=qa>>2;l[I]=l[F];l[I+1]=l[F+1];l[I+2]=l[F+2];l[O]=ba;l[d-12+4>>2]=ca;l[d-12+8>>2]=ma}}}else{if(Ca){var ka=ga|0,aa=l[ka>>2],ra=b+16|0,ha=l[ra>>2],za=b+20|0,X=l[za>>2];H=ga>>2;G=qa>>2;l[H]=l[G];l[H+1]=l[G+1];l[H+2]=l[G+2];l[O]=aa;l[d-12+4>>2]=ha;l[d-12+8>>2]=X;if(K[l[S]](ga,b)){var ua=l[U],da=l[U+1],fa=l[U+2];E=b>>2;l[E]=l[H];l[E+1]=l[H+1];l[E+2]=l[H+2];l[ka>>2]=ua;l[ra>>2]=da;l[za>>2]=fa}}}$=1}else{if(4==(Q|0)){tp(b,b+12|0,b+24|0,d-12|0,e),$=1}else{if(5==(Q|0)){var Aa=b+12|0,Qa=b+24|0,pa=b+36|0,cb=d-12|0;tp(b,Aa,Qa,pa,e);if(K[l[S]](cb,pa)){var Ra=pa|0,Ta=l[Ra>>2],$a=b+40|0,va=l[$a>>2],Wa=b+44|0,fb=l[Wa>>2];D=pa>>2;z=cb>>2;l[D]=l[z];l[D+1]=l[z+1];l[D+2]=l[z+2];l[cb>>2]=Ta;l[d-12+4>>2]=va;l[d-12+8>>2]=fb;if(K[l[S]](pa,Qa)){var gb=Qa|0,Xa=l[gb>>2],Ua=b+28|0,Va=l[Ua>>2],pb=b+32|0,nb=l[pb>>2];C=Qa>>2;l[C]=l[D];l[C+1]=l[D+1];l[C+2]=l[D+2];l[Ra>>2]=Xa;l[$a>>2]=Va;l[Wa>>2]=nb;if(K[l[S]](Qa,Aa)){var La=Aa|0,qb=l[La>>2],bb=b+16|0,Fa=l[bb>>2],Ma=b+20|0,wa=l[Ma>>2];A=Aa>>2;l[A]=l[C];l[A+1]=l[C+1];l[A+2]=l[C+2];l[gb>>2]=qb;l[Ua>>2]=Fa;l[pb>>2]=wa;if(K[l[S]](Aa,b)){var hb=l[U],Ya=l[U+1],Za=l[U+2];y=b>>2;l[y]=l[A];l[y+1]=l[A+1];l[y+2]=l[A+2];l[La>>2]=hb;l[bb>>2]=Ya;l[Ma>>2]=Za}}}}$=1}else{var Da=b+24|0;x=Da>>2;var Oa=b+12|0,ib=K[l[S]](Oa,b),ab=K[l[S]](Da,Oa);if(ib){var Ga=l[U],jb=l[U+1],Ea=l[U+2];w=b>>2;if(ab){r=Da>>2,l[w]=l[r],l[w+1]=l[r+1],l[w+2]=l[r+2],l[x]=Ga,l[U+7]=jb,l[U+8]=Ea}else{u=Oa>>2;l[w]=l[u];l[w+1]=l[u+1];l[w+2]=l[u+2];var Pa=Oa|0;l[Pa>>2]=Ga;var Ja=b+16|0;l[Ja>>2]=jb;var db=b+20|0;l[db>>2]=Ea;if(K[l[S]](Da,Oa)){var xa=l[Pa>>2],Sa=l[Ja>>2],Ka=l[db>>2];p=Da>>2;l[u]=l[p];l[u+1]=l[p+1];l[u+2]=l[p+2];l[x]=xa;l[U+7]=Sa;l[U+8]=Ka}}}else{if(ab){var tb=Oa|0,kb=l[tb>>2],ub=b+16|0,rb=l[ub>>2],Bb=b+20|0,lb=l[Bb>>2];n=Oa>>2;m=Da>>2;l[n]=l[m];l[n+1]=l[m+1];l[n+2]=l[m+2];l[x]=kb;l[U+7]=rb;l[U+8]=lb;if(K[l[S]](Oa,b)){var yb=l[U],xb=l[U+1],Ib=l[U+2];k=b>>2;l[k]=l[n];l[k+1]=l[n+1];l[k+2]=l[n+2];l[tb>>2]=yb;l[ub>>2]=xb;l[Bb>>2]=Ib}}}j=W>>2;for(var wb=b+36|0,vb=0,zb=Da;;){if((wb|0)==(d|0)){$=1;break a}if(K[l[S]](wb,zb)){h=wb>>2;l[j]=l[h];l[j+1]=l[h+1];l[j+2]=l[h+2];for(var Eb=zb,Cb=wb;;){g=Cb>>2;f=Eb>>2;l[g]=l[f];l[g+1]=l[f+1];l[g+2]=l[f+2];if((Eb|0)==(b|0)){break}var eb=Eb-12|0;if(!K[l[S]](W,eb)){break}Cb=Eb;Eb=eb}l[f]=l[j];l[f+1]=l[j+1];l[f+2]=l[j+2];var sb=vb+1|0;if(8==(sb|0)){break}var ob=sb}else{ob=vb}zb=wb;wb=wb+12|0;vb=ob}$=(wb+12|0)==(d|0)}}}}}}while(0);a=W;return $}function gp(b,d){var e,f;0!=(l[b+28>>2]|0)&&P(N.Pa|0,72,N.xb|0,N.Ab|0);f=(b+12|0)>>2;e=l[f];var g=K[l[l[e>>2]+12>>2]](e);e=b+24|0;var h=o[e>>2],g=28*g|0,j=0==(g|0);a:do{if(!j){var k=0<(g|0);do{if(k){if(640>=(g|0)){break}Dh(h);break a}P(N.e|0,164,N.f|0,N.Va|0)}while(0);var m=ed[rn+g|0],k=m&255;14>(m&255)||P(N.e|0,173,N.f|0,N.g|0);m=h;k=(k<<2)+d+12|0;l[h>>2]=l[k>>2];l[k>>2]=m}}while(0);l[e>>2]=0;h=o[f];e=h>>2;g=l[e+1];0==(g|0)?(K[l[l[e]>>2]](h),g=ed[rn+20|0],j=g&255,14>(g&255)||P(N.e|0,173,N.f|0,N.g|0),g=(j<<2)+d+12|0,l[e]=l[g>>2],l[g>>2]=h):1==(g|0)?(K[l[l[e]>>2]](h),g=ed[rn+48|0],j=g&255,14>(g&255)||P(N.e|0,173,N.f|0,N.g|0),g=(j<<2)+d+12|0,l[e]=l[g>>2],l[g>>2]=h):2==(g|0)?(K[l[l[e]>>2]](h),g=ed[rn+152|0],j=g&255,14>(g&255)||P(N.e|0,173,N.f|0,N.g|0),g=(j<<2)+d+12|0,l[e]=l[g>>2],l[g>>2]=h):3==(g|0)?(K[l[l[e]>>2]](h),g=ed[rn+40|0],j=g&255,14>(g&255)||P(N.e|0,173,N.f|0,N.g|0),g=(j<<2)+d+12|0,l[e]=l[g>>2],l[g>>2]=h):P(N.Pa|0,115,N.xb|0,N.l|0);l[f]=0}function wo(b,d,e,f){var g,h,j=a;a+=40;var k=j+16,m=j+32,n=b+28|0,p=0<(l[n>>2]|0);a:do{if(p){var u=b+24|0,r=b+12|0,w=j|0,x=k|0,y=j+4|0,A=k+4|0,C=j+8|0,z=k+8|0,D=j+12|0,E=k+12|0,G=f|0,H=e|0,F=f+4|0,I=e+4|0,J=m|0,L=m+4|0,O=d|0;h=(d+40|0)>>2;var R=d+36|0;g=(d+32|0)>>2;for(var T=0;;){var S=l[u>>2],U=l[r>>2],W=S+28*T+20|0;K[l[l[U>>2]+24>>2]](U,j,e,l[W>>2]);U=l[r>>2];K[l[l[U>>2]+24>>2]](U,k,f,l[W>>2]);var W=S+28*T|0,U=q[w>>2],Q=q[x>>2],$=q[y>>2],ea=q[A>>2],ea=$<ea?$:ea,$=W,U=(M[0]=U<Q?U:Q,t[0]),Q=(M[0]=ea,t[0])|0;l[($|0)>>2]=0|U;l[($+4|0)>>2]=Q;U=q[C>>2];Q=q[z>>2];$=q[D>>2];ea=q[E>>2];ea=$>ea?$:ea;$=S+28*T+8|0;U=(M[0]=U>Q?U:Q,t[0]);Q=(M[0]=ea,t[0])|0;l[($|0)>>2]=0|U;l[($+4|0)>>2]=Q;U=q[F>>2]-q[I>>2];q[J>>2]=q[G>>2]-q[H>>2];q[L>>2]=U;S=l[(S+24>>2)+(7*T|0)];Pk(O,S,W,m)&&(U=l[h],(U|0)==(l[R>>2]|0)?(W=l[g],l[R>>2]=U<<1,U=Ne(U<<3),l[g]=U,Ch(U,W,l[h]<<2),Dh(W),W=l[h]):W=U,l[((W<<2)+l[g]|0)>>2]=S,l[h]=l[h]+1|0);T=T+1|0;if((T|0)>=(l[n>>2]|0)){break a}}}}while(0);a=j}function xo(b){var d,e,f=b+8|0,g=l[f>>2],h=0==(g|0);a:do{if(!h){e=l[g+112>>2];if(0==(e|0)){e=g}else{for(;;){var j=l[e+4>>2];(l[j+48>>2]|0)==(b|0)|(l[j+52>>2]|0)==(b|0)&&(j=j+4|0,l[j>>2]|=8);e=l[e+12>>2];if(0==(e|0)){break}}e=l[f>>2]}d=l[e+88>>2];if(0!=(d|0)&&(j=b+28|0,0<(l[j>>2]|0))){var k=b+24|0;e=(d+102912|0)>>2;var m=d+102908|0;d=(d+102904|0)>>2;for(var n=0,p=l[e];;){var u=l[(l[k>>2]+24>>2)+(7*n|0)];if((p|0)==(l[m>>2]|0)){var r=l[d];l[m>>2]=p<<1;p=Ne(p<<3);l[d]=p;Ch(p,r,l[e]<<2);Dh(r);r=l[e]}else{r=p}l[((r<<2)+l[d]|0)>>2]=u;u=l[e]+1|0;l[e]=u;n=n+1|0;if((n|0)>=(l[j>>2]|0)){break a}p=u}}}}while(0)}function mp(b,d){var e,f,g=a,h;V(N.Gg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));f=q[b+16>>2];V(N.Vg|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=q[b+20>>2];V(N.hh|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=q[b>>2];V(N.nh|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=c[b+38|0]&1;V(N.vh|0,(s=a,a+=4,l[s>>2]=f,s));f=jd[b+32>>1]&65535;V(N.yh|0,(s=a,a+=4,l[s>>2]=f,s));f=jd[b+34>>1]&65535;V(N.Eh|0,(s=a,a+=4,l[s>>2]=f,s));f=i[b+36>>1]<<16>>16;V(N.Se|0,(s=a,a+=4,l[s>>2]=f,s));var j=o[b+12>>2];f=j>>2;var k=l[f+1];do{if(0==(k|0)){V(N.Ye|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),h=q[f+2],V(N.Bb|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s)),h=q[f+3],e=q[f+4],V(N.nf|0,(s=a,a+=16,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=e,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s)),h=13}else{if(1==(k|0)){h=j;V(N.sf|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));e=q[f+2];V(N.Bb|0,(s=a,a+=8,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],s));var m=j+28|0;e=q[m>>2];m=q[m+4>>2];V(N.xf|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));e=q[f+3];m=q[f+4];V(N.Df|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));m=j+20|0;e=q[m>>2];m=q[m+4>>2];V(N.Hf|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));e=q[f+9];m=q[f+10];V(N.Mf|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));e=c[j+44|0]&1;V(N.Pf|0,(s=a,a+=4,l[s>>2]=e,s));h=c[h+45|0]&1;V(N.Rf|0,(s=a,a+=4,l[s>>2]=h,s));h=13}else{if(2==(k|0)){V(N.Uf|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.Mb|0,(s=a,a+=4,l[s>>2]=8,s));h=j+148|0;e=o[h>>2];m=0<(e|0);a:do{if(m){for(var n=j+20|0,p=0;;){var u=q[n+(p<<3)>>2],r=q[n+(p<<3)+4>>2];V(N.Nb|0,(s=a,a+=20,l[s>>2]=p,Ee[0]=u,l[s+4>>2]=t[0],l[s+8>>2]=t[1],Ee[0]=r,l[s+12>>2]=t[0],l[s+16>>2]=t[1],s));p=p+1|0;u=l[h>>2];if((p|0)>=(u|0)){var w=u;break a}}}else{w=e}}while(0);V(N.jg|0,(s=a,a+=4,l[s>>2]=w,s));h=13}else{if(3==(k|0)){h=j;V(N.mg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));e=(j+16|0)>>2;m=l[e];V(N.Mb|0,(s=a,a+=4,l[s>>2]=m,s));m=l[e];n=0<(m|0);a:do{if(n){p=j+12|0;for(u=0;;){var x=l[p>>2],r=q[x+(u<<3)>>2],x=q[x+(u<<3)+4>>2];V(N.Nb|0,(s=a,a+=20,l[s>>2]=u,Ee[0]=r,l[s+4>>2]=t[0],l[s+8>>2]=t[1],Ee[0]=x,l[s+12>>2]=t[0],l[s+16>>2]=t[1],s));u=u+1|0;r=l[e];if((u|0)>=(r|0)){var y=r;break a}}}else{y=m}}while(0);V(N.qg|0,(s=a,a+=4,l[s>>2]=y,s));m=j+20|0;e=q[m>>2];m=q[m+4>>2];V(N.ug|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));m=j+28|0;e=q[m>>2];m=q[m+4>>2];V(N.yg|0,(s=a,a+=16,Ee[0]=e,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=m,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));e=c[j+36|0]&1;V(N.Bg|0,(s=a,a+=4,l[s>>2]=e,s));h=c[h+37|0]&1;V(N.Eg|0,(s=a,a+=4,l[s>>2]=h,s));h=13}else{h=14}}}}}while(0);13==h&&(V(N.Za|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),V(N.Ig|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),V(N.Za|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),V(N.Mg|0,(s=a,a+=4,l[s>>2]=d,s)));a=g}function vp(b,d,e,f,g,h){var j,k,m,n,p=b>>2;j=(b+40|0)>>2;l[j]=d;l[p+11]=e;l[p+12]=f;l[p+7]=0;l[p+9]=0;l[p+8]=0;b=(b|0)>>2;l[b]=g;l[p+1]=h;k=d<<2;d=(g+102796|0)>>2;h=l[d];32>(h|0)?m=h:(P(N.n|0,38,N.w|0,N.D|0),m=l[d]);h=(g+12*m+102412|0)>>2;l[(g+102416>>2)+(3*m|0)]=k;n=(g+102400|0)>>2;var u=l[n];102400<(u+k|0)?(n=Ne(k),l[h]=n,c[g+12*m+102420|0]=1):(l[h]=g+u|0,c[g+12*m+102420|0]=0,l[n]=l[n]+k|0);m=g+102404|0;k=l[m>>2]+k|0;l[m>>2]=k;g=g+102408|0;m=l[g>>2];l[g>>2]=(m|0)>(k|0)?m:k;l[d]=l[d]+1|0;l[p+2]=l[h];g=l[b];h=e<<2;e=(g+102796|0)>>2;d=l[e];32>(d|0)?k=d:(P(N.n|0,38,N.w|0,N.D|0),k=l[e]);d=g+12*k+102412|0;l[(g+12*k+102416|0)>>2]=h;m=(g+102400|0)>>2;n=l[m];102400<(n+h|0)?(m=Ne(h),l[(d|0)>>2]=m,c[g+12*k+102420|0]=1):(l[(d|0)>>2]=g+n|0,c[g+12*k+102420|0]=0,l[m]=l[m]+h|0);k=g+102404|0;h=l[k>>2]+h|0;l[k>>2]=h;g=g+102408|0;k=l[g>>2];l[g>>2]=(k|0)>(h|0)?k:h;l[e]=l[e]+1|0;l[p+3]=l[d>>2];e=l[b];d=f<<2;f=(e+102796|0)>>2;g=l[f];32>(g|0)?h=g:(P(N.n|0,38,N.w|0,N.D|0),h=l[f]);g=e+12*h+102412|0;l[(e+12*h+102416|0)>>2]=d;k=(e+102400|0)>>2;m=l[k];102400<(m+d|0)?(k=Ne(d),l[(g|0)>>2]=k,c[e+12*h+102420|0]=1):(l[(g|0)>>2]=e+m|0,c[e+12*h+102420|0]=0,l[k]=l[k]+d|0);h=e+102404|0;d=l[h>>2]+d|0;l[h>>2]=d;e=e+102408|0;h=l[e>>2];l[e>>2]=(h|0)>(d|0)?h:d;l[f]=l[f]+1|0;l[p+4]=l[g>>2];g=l[b];d=12*l[j]|0;f=(g+102796|0)>>2;e=l[f];32>(e|0)?h=e:(P(N.n|0,38,N.w|0,N.D|0),h=l[f]);e=g+12*h+102412|0;l[(g+12*h+102416|0)>>2]=d;k=(g+102400|0)>>2;m=l[k];102400<(m+d|0)?(k=Ne(d),l[(e|0)>>2]=k,c[g+12*h+102420|0]=1):(l[(e|0)>>2]=g+m|0,c[g+12*h+102420|0]=0,l[k]=l[k]+d|0);h=g+102404|0;d=l[h>>2]+d|0;l[h>>2]=d;g=g+102408|0;h=l[g>>2];l[g>>2]=(h|0)>(d|0)?h:d;l[f]=l[f]+1|0;l[p+6]=l[e>>2];b=l[b];e=12*l[j]|0;j=(b+102796|0)>>2;f=l[j];32>(f|0)?g=f:(P(N.n|0,38,N.w|0,N.D|0),g=l[j]);f=b+12*g+102412|0;l[(b+12*g+102416|0)>>2]=e;d=(b+102400|0)>>2;h=l[d];102400<(h+e|0)?(d=Ne(e),l[(f|0)>>2]=d,c[b+12*g+102420|0]=1):(l[(f|0)>>2]=b+h|0,c[b+12*g+102420|0]=0,l[d]=l[d]+e|0);g=b+102404|0;e=l[g>>2]+e|0;l[g>>2]=e;b=b+102408|0;g=l[b>>2];l[b>>2]=(g|0)>(e|0)?g:e;l[j]=l[j]+1|0;l[p+5]=l[f>>2]}function wp(b,d){var e,f;e=b>>2;var g=b|0,h=b+8|0;l[h>>2]=128;l[e+1]=0;var j=Ne(1024);l[e]=j;Oe(j,l[h>>2]<<3);h=(b+12|0)>>2;for(j=h+14;h<j;h++){l[h]=0}if(0==(c[xp]&1)<<24>>24){j=0;for(h=1;!(14>(j|0)||P(N.e|0,73,N.Ga|0,N.Ta|0),(h|0)>(l[sn+(j<<2)>>2]|0)&&(j=j+1|0),c[rn+h|0]=j&255,h=h+1|0,641==(h|0));){}c[xp]=1}l[e+25617]=0;l[e+25618]=0;l[e+25619]=0;l[e+25716]=0;Fg(b+102872|0);l[e+25733]=0;l[e+25734]=0;l[e+25735]=yp;l[e+25736]=zp;h=b+102948|0;j=b+102968|0;l[e+25745]=0;l[e+25746]=0;f=h>>2;l[f]=0;l[f+1]=0;l[f+2]=0;l[f+3]=0;l[f+4]=0;c[b+102992|0]=1;c[b+102993|0]=1;c[b+102994|0]=0;c[b+102995|0]=1;c[b+102976|0]=1;f=l[d+4>>2];l[j>>2]=l[d>>2];l[j+4>>2]=f;l[e+25717]=4;q[e+25747]=0;l[h>>2]=g;e=(b+102996|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0}function Ap(b){var d=b>>2,e=b|0,f=l[d+25738];a:for(;0!=(f|0);){for(var g=l[f+96>>2],h=l[f+100>>2];;){if(0==(h|0)){f=g;continue a}var j=l[h+4>>2];l[h+28>>2]=0;gp(h,e);h=j}}Dh(l[d+25726]);Dh(l[d+25729]);Dh(l[d+25719]);0!=(l[d+25617]|0)&&P(N.n|0,32,N.Q|0,N.Ua|0);0!=(l[d+25716]|0)&&P(N.n|0,33,N.Q|0,N.Xa|0);d=b+4|0;e=0<(l[d>>2]|0);b|=0;f=l[b>>2];a:do{if(e){g=0;for(h=f;;){if(Dh(l[h+(g<<3)+4>>2]),g=g+1|0,h=l[b>>2],(g|0)>=(l[d>>2]|0)){var k=h;break a}}}else{k=f}}while(0);Dh(k)}function Bp(b,d){var e,f,g,h;h=(b+102960|0)>>2;0<(l[h]|0)||P(N.t|0,133,N.sb|0,N.Wf|0);g=b+102868|0;var j=l[g>>2];0==(j&2|0)?g=j:(P(N.t|0,134,N.sb|0,N.pa|0),g=l[g>>2]);if(0==(g&2|0)){g=(d+108|0)>>2;var j=l[g],k=0==(j|0);a:do{if(!k){for(var m=b+102980|0,n=j;;){var p=l[n+12>>2],u=l[m>>2];0==(u|0)?u=n+4|0:(n=n+4|0,K[l[l[u>>2]+8>>2]](u,l[n>>2]),u=n);Cp(b,l[u>>2]);l[g]=p;if(0==(p|0)){break a}n=p}}}while(0);l[g]=0;g=d+112|0;j=l[g>>2];k=0==(j|0);a:do{if(!k){m=b+102872|0;for(p=j;;){u=l[p+12>>2];fp(m,l[p+4>>2]);if(0==(u|0)){break a}p=u}}}while(0);l[g>>2]=0;g=(d+100|0)>>2;j=l[g];k=0==(j|0);a:do{if(k){e=d+104|0}else{for(var m=b+102980|0,p=b+102912|0,u=b+102904|0,n=b+102900|0,r=b+102872|0,w=b|0,x=d+104|0,y=j;;){var A=o[y+4>>2];f=l[m>>2];if(0!=(f|0)){K[l[l[f>>2]+12>>2]](f,y)}f=(y+28|0)>>2;var C=0<(l[f]|0);b:do{if(C){for(var z=y+24|0,D=0;;){for(var E=l[z>>2]+28*D+24|0,G=l[E>>2],H=l[p>>2],F=0;(F|0)<(H|0);){var I=(F<<2)+l[u>>2]|0;if((l[I>>2]|0)!=(G|0)){F=F+1|0}else{l[I>>2]=-1;break}}l[n>>2]=l[n>>2]-1|0;Nk(r,G);l[E>>2]=-1;D=D+1|0;if((D|0)>=(l[f]|0)){break b}}}}while(0);l[f]=0;gp(y,w);f=ed[rn+44|0];C=f&255;14>(f&255)||P(N.e|0,173,N.f|0,N.g|0);f=(C<<2)+b+12|0;l[y>>2]=l[f>>2];l[f>>2]=y;l[g]=A;l[x>>2]=l[x>>2]-1|0;if(0==(A|0)){e=x;break a}y=A}}}while(0);l[g]=0;l[e>>2]=0;g=d+92|0;j=l[g>>2];e=(d+96|0)>>2;0!=(j|0)&&(l[(j+96|0)>>2]=l[e]);j=l[e];0!=(j|0)&&(l[(j+92|0)>>2]=l[g>>2]);g=b+102952|0;(l[g>>2]|0)==(d|0)&&(l[g>>2]=l[e]);l[h]=l[h]-1|0;h=ed[rn+152|0];e=h&255;14>(h&255)||P(N.e|0,173,N.f|0,N.g|0);h=(e<<2)+b+12|0;l[d>>2]=l[h>>2];l[h>>2]=d}}function Cp(b,d){var e,f,g,h,j=b+102868|0;e=l[j>>2];0==(e&2|0)?j=e:(P(N.t|0,274,N.tb|0,N.pa|0),j=l[j>>2]);j=0==(j&2|0);a:do{if(j){e=c[d+61|0]&1;var k=d+8|0;f=l[k>>2];h=(d+12|0)>>2;0!=(f|0)&&(l[(f+12|0)>>2]=l[h]);f=l[h];0!=(f|0)&&(l[(f+8|0)>>2]=l[k>>2]);k=b+102956|0;(l[k>>2]|0)==(d|0)&&(l[k>>2]=l[h]);h=l[d+48>>2];k=l[d+52>>2];f=h+4|0;g=i[f>>1];0==(g&2)<<16>>16&&(i[f>>1]=g|2,q[h+144>>2]=0);f=k+4|0;g=i[f>>1];0==(g&2)<<16>>16&&(i[f>>1]=g|2,q[k+144>>2]=0);var m=d+16|0;g=(d+24|0)>>2;var n=l[g];f=(d+28|0)>>2;0!=(n|0)&&(l[(n+12|0)>>2]=l[f]);n=l[f];0!=(n|0)&&(l[(n+8|0)>>2]=l[g]);n=h+108|0;(m|0)==(l[n>>2]|0)&&(l[n>>2]=l[f]);l[g]=0;l[f]=0;m=d+32|0;g=(d+40|0)>>2;n=l[g];f=(d+44|0)>>2;0!=(n|0)&&(l[(n+12|0)>>2]=l[f]);n=l[f];0!=(n|0)&&(l[(n+8|0)>>2]=l[g]);n=k+108|0;(m|0)==(l[n>>2]|0)&&(l[n>>2]=l[f]);l[g]=0;l[f]=0;f=d;m=b|0;g=f>>2;K[l[l[g]+20>>2]](f);n=l[g+1];if(3==(n|0)){var n=ed[rn+176|0],p=n&255;14>(n&255)||P(N.e|0,173,N.f|0,N.g|0);m=(p<<2)+m+12|0;l[g]=l[m>>2];l[m>>2]=f}else{5==(n|0)?(n=ed[rn+168|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):2==(n|0)?(n=ed[rn+256|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):1==(n|0)?(n=ed[rn+228|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):4==(n|0)?(n=ed[rn+196|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):6==(n|0)?(n=ed[rn+276|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):7==(n|0)?(n=ed[rn+224|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):8==(n|0)?(n=ed[rn+208|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):9==(n|0)?(n=ed[rn+180|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):10==(n|0)?(n=ed[rn+168|0],p=n&255,14>(n&255)||P(N.e|0,173,N.f|0,N.g|0),m=(p<<2)+m+12|0,l[g]=l[m>>2],l[m>>2]=f):P(N.m|0,166,N.ze|0,N.l|0)}f=(b+102964|0)>>2;g=l[f];0<(g|0)||(P(N.t|0,346,N.tb|0,N.Hg|0),g=l[f]);l[f]=g-1|0;if(0==e<<24>>24&&(e=l[k+112>>2],0!=(e|0))){for(e>>=2;;){(l[e]|0)==(h|0)&&(k=l[e+1]+4|0,l[k>>2]|=8);e=l[e+3];if(0==(e|0)){break a}e>>=2}}}}while(0)}function Dp(b,d){var e,f,g,h,j,k=b+102868|0,m=l[k>>2];if(0==(m&2|0)){var n=m}else{P(N.t|0,214,N.Be|0,N.pa|0),n=l[k>>2]}var p=0==(n&2|0);a:do{if(p){var u,r=d,w=b|0,x=Ha,y=Ha,A=Ha,C=Ha,z=Ha,D=Ha,E=Ha,G=Ha,H=Ha,F=Ha,I=Ha,J=Ha,L=Ha,O=Ha,R=Ha,T=Ha,S=Ha,U=Ha,W=Ha,Q=Ha,$=r>>2,Q=(r|0)>>2,ea=l[Q];if(3==(ea|0)){var sa=qn(w,176),W=sa>>2;if(0==(sa|0)){var Ba=0}else{l[sa>>2]=Ep+8|0;var oa=r+8|0,ga=r+12|0;(l[oa>>2]|0)==(l[ga>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[W+1]=l[Q];l[W+2]=0;l[W+3]=0;l[W+12]=l[oa>>2];l[W+13]=l[ga>>2];l[W+14]=0;c[sa+61|0]=c[r+16|0]&1;c[sa+60|0]=0;l[W+16]=l[$+1];U=(sa+16|0)>>2;l[U]=0;l[U+1]=0;l[U+2]=0;l[U+3]=0;l[U+4]=0;l[U+5]=0;l[U+6]=0;l[U+7]=0;l[sa>>2]=Fp+8|0;var qa=sa+88|0,la=r+20|0,Ca=sa+80|0,ia=la|0,S=ia>>2,ya=l[S],ta=la+4|0,T=ta>>2,Ia=l[T],na=Ca|0,R=na>>2;l[R]=ya;var Z=Ca+4|0,O=Z>>2;l[O]=Ia;var ba=r+28|0,ca=ba|0,L=ca>>2,ma=l[L],ka=ba+4|0,J=ka>>2,aa=l[J],ra=qa|0,I=ra>>2;l[I]=ma;var ha=qa+4|0,F=ha>>2;l[F]=aa;q[W+26]=q[$+9];q[W+17]=q[$+10];q[W+18]=q[$+11];q[W+25]=0;q[W+24]=0;q[W+19]=0;Ba=sa}var za=Ba|0}else{if(5==(ea|0)){var X=qn(w,168);if(0==(X|0)){var ua=0}else{Gp(X,r),ua=X}za=ua|0}else{if(2==(ea|0)){var da=qn(w,256);if(0==(da|0)){var fa=0}else{Hp(da,r),fa=da}za=fa|0}else{if(1==(ea|0)){var Aa=qn(w,228),H=Aa>>2;if(0==(Aa|0)){var Qa=0}else{l[Aa>>2]=Ep+8|0;var pa=r+8|0,cb=r+12|0;(l[pa>>2]|0)==(l[cb>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[H+1]=l[Q];l[H+2]=0;l[H+3]=0;l[H+12]=l[pa>>2];l[H+13]=l[cb>>2];l[H+14]=0;c[Aa+61|0]=c[r+16|0]&1;c[Aa+60|0]=0;l[H+16]=l[$+1];G=(Aa+16|0)>>2;l[G]=0;l[G+1]=0;l[G+2]=0;l[G+3]=0;l[G+4]=0;l[G+5]=0;l[G+6]=0;l[G+7]=0;l[Aa>>2]=Ip+8|0;var Ra=Aa+76|0,Ta=r+20|0,$a=Aa+68|0,ia=Ta|0,S=ia>>2,va=l[S],ta=Ta+4|0,T=ta>>2,Wa=l[T],na=$a|0,R=na>>2;l[R]=va;Z=$a+4|0;O=Z>>2;l[O]=Wa;var fb=r+28|0,ca=fb|0,L=ca>>2,gb=l[L],ka=fb+4|0,J=ka>>2,Xa=l[J],ra=Ra|0,I=ra>>2;l[I]=gb;ha=Ra+4|0;F=ha>>2;l[F]=Xa;q[H+29]=q[$+9];var E=(Aa+84|0)>>2,Ua=r+44|0;l[E]=0;l[E+1]=0;l[E+2]=0;l[E+3]=0;q[H+30]=q[Ua>>2];q[H+31]=q[$+12];q[H+26]=q[$+15];q[H+27]=q[$+14];c[Aa+112|0]=c[r+40|0]&1;c[Aa+100|0]=c[r+52|0]&1;l[H+56]=0;Qa=Aa}za=Qa|0}else{if(4==(ea|0)){var Va=qn(w,196);if(0==(Va|0)){var pb=0}else{Jp(Va,r),pb=Va}za=pb|0}else{if(6==(ea|0)){var nb=qn(w,276);if(0==(nb|0)){var La=0}else{Kp(nb,r),La=nb}za=La|0}else{if(7==(ea|0)){var qb=qn(w,224);if(0==(qb|0)){var bb=0}else{Lp(qb,r),bb=qb}za=bb|0}else{if(8==(ea|0)){var Fa=qn(w,208),D=Fa>>2;if(0==(Fa|0)){var Ma=0}else{l[Fa>>2]=Ep+8|0;var wa=r+8|0,hb=r+12|0;(l[wa>>2]|0)==(l[hb>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[D+1]=l[Q];l[D+2]=0;l[D+3]=0;l[D+12]=l[wa>>2];l[D+13]=l[hb>>2];l[D+14]=0;c[Fa+61|0]=c[r+16|0]&1;c[Fa+60|0]=0;l[D+16]=l[$+1];z=(Fa+16|0)>>2;l[z]=0;l[z+1]=0;l[z+2]=0;l[z+3]=0;l[z+4]=0;l[z+5]=0;l[z+6]=0;l[z+7]=0;l[Fa>>2]=Mp+8|0;var Ya=Fa+88|0,Za=r+20|0,Da=Fa+80|0,ia=Za|0,S=ia>>2,Oa=l[S],ta=Za+4|0,T=ta>>2,ib=l[T],na=Da|0,R=na>>2;l[R]=Oa;Z=Da+4|0;O=Z>>2;l[O]=ib;var ab=r+28|0,ca=ab|0,L=ca>>2,Ga=l[L],ka=ab+4|0,J=ka>>2,jb=l[J],ra=Ya|0,I=ra>>2;l[I]=Ga;ha=Ya+4|0;F=ha>>2;l[F]=jb;q[D+24]=q[$+9];q[D+17]=q[$+10];q[D+18]=q[$+11];q[D+26]=0;q[D+27]=0;q[D+28]=0;Ma=Fa}za=Ma|0}else{if(9==(ea|0)){var Ea=qn(w,180),C=Ea>>2;if(0==(Ea|0)){var Pa=0}else{l[Ea>>2]=Ep+8|0;var Ja=r+8|0,db=r+12|0;(l[Ja>>2]|0)==(l[db>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[C+1]=l[Q];l[C+2]=0;l[C+3]=0;l[C+12]=l[Ja>>2];l[C+13]=l[db>>2];l[C+14]=0;c[Ea+61|0]=c[r+16|0]&1;c[Ea+60|0]=0;l[C+16]=l[$+1];A=(Ea+16|0)>>2;l[A]=0;l[A+1]=0;l[A+2]=0;l[A+3]=0;l[A+4]=0;l[A+5]=0;l[A+6]=0;l[A+7]=0;l[Ea>>2]=Np+8|0;var xa=Ea+76|0,Sa=r+20|0,Ka=Ea+68|0,ia=Sa|0,S=ia>>2,tb=l[S],ta=Sa+4|0,T=ta>>2,kb=l[T],na=Ka|0,R=na>>2;l[R]=tb;Z=Ka+4|0;O=Z>>2;l[O]=kb;var ub=r+28|0,ca=ub|0,L=ca>>2,rb=l[L],ka=ub+4|0,J=ka>>2,Bb=l[J],ra=xa|0,I=ra>>2;l[I]=rb;ha=xa+4|0;F=ha>>2;l[F]=Bb;q[C+21]=0;q[C+22]=0;q[C+23]=0;q[C+24]=q[$+9];q[C+25]=q[$+10];Pa=Ea}za=Pa|0}else{if(10==(ea|0)){var lb=qn(w,168),y=lb>>2;if(0==(lb|0)){var yb=0}else{l[lb>>2]=Ep+8|0;var xb=r+8|0,Ib=r+12|0;(l[xb>>2]|0)==(l[Ib>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[y+1]=l[Q];l[y+2]=0;l[y+3]=0;l[y+12]=l[xb>>2];l[y+13]=l[Ib>>2];l[y+14]=0;c[lb+61|0]=c[r+16|0]&1;c[lb+60|0]=0;l[y+16]=l[$+1];x=(lb+16|0)>>2;l[x]=0;l[x+1]=0;l[x+2]=0;l[x+3]=0;l[x+4]=0;l[x+5]=0;l[x+6]=0;l[x+7]=0;l[lb>>2]=Op+8|0;var wb=lb+76|0,vb=r+20|0,zb=lb+68|0,ia=vb|0,S=ia>>2,Eb=l[S],ta=vb+4|0,T=ta>>2,Cb=l[T],na=zb|0,R=na>>2;l[R]=Eb;Z=zb+4|0;O=Z>>2;l[O]=Cb;var eb=r+28|0,ca=eb|0,L=ca>>2,sb=l[L],ka=eb+4|0,J=ka>>2,ob=l[J],ra=wb|0,I=ra>>2;l[I]=sb;ha=wb+4|0;F=ha>>2;l[F]=ob;q[y+21]=q[$+9];q[y+40]=0;q[y+23]=0;l[y+41]=0;q[y+22]=0;yb=lb}za=yb|0}else{P(N.m|0,113,N.ye|0,N.l|0),za=0}}}}}}}}}}u=za;j=u>>2;l[j+2]=0;h=(b+102956|0)>>2;l[j+3]=l[h];var Db=l[h];0!=(Db|0)&&(l[(Db+8|0)>>2]=u);l[h]=u;var Jb=b+102964|0;l[Jb>>2]=l[Jb>>2]+1|0;var Rb=u+16|0;l[j+5]=u;g=(u+52|0)>>2;l[Rb>>2]=l[g];l[j+6]=0;f=(u+48|0)>>2;var Nb=l[f],Ob=Nb+108|0;l[j+7]=l[Ob>>2];var Lb=l[Ob>>2];if(0==(Lb|0)){var Pb=Nb}else{l[(Lb+8|0)>>2]=Rb,Pb=l[f]}l[Pb+108>>2]=Rb;var Mb=u+32|0;l[j+9]=u;l[Mb>>2]=l[f];l[j+10]=0;var Yb=l[g],Zb=Yb+108|0;l[j+11]=l[Zb>>2];var ec=l[Zb>>2];if(0==(ec|0)){var Ub=Yb}else{l[(ec+8|0)>>2]=Mb,Ub=l[g]}l[Ub+108>>2]=Mb;var jc=l[d+8>>2];if(0!=(c[d+16|0]&1)<<24>>24){var Qb=u}else{var mb=l[l[d+12>>2]+112>>2];if(0==(mb|0)){Qb=u}else{var cc=mb;for(e=cc>>2;;){if((l[e]|0)==(jc|0)){var Fb=l[e+1]+4|0;l[Fb>>2]|=8}var gc=l[e+3];if(0==(gc|0)){Qb=u;break a}cc=gc;e=cc>>2}}}}else{Qb=0}}while(0);return Qb}function Pp(b,d,e,f){var g,h,j,k,m=b>>2,n=a;a+=24;var p;k=n>>2;j=(b+102868|0)>>2;var u=l[j];if(0==(u&1|0)){var r=u}else{var w=b+102872|0;jp(w|0,w);var x=l[j]&-2,r=l[j]=x}l[j]=r|2;h=(n|0)>>2;q[h]=d;l[k+3]=e;l[k+4]=f;var y=0<d;q[k+1]=y?1/d:0;var A=b+102988|0;q[k+2]=q[A>>2]*d;c[n+20|0]=c[b+102992|0]&1;pp(b+102872|0);q[m+25750]=0;if(!(0==(c[b+102995|0]&1)<<24>>24|y^1)){var C,z,D,E,G,H,F,I,J,L,O,R,T,S,U=b>>2,W=a;a+=100;var Q=W+16;S=Q>>2;var $=W+68;T=(b+103008|0)>>2;q[T]=0;R=(b+103012|0)>>2;q[R]=0;O=(b+103016|0)>>2;q[O]=0;var ea=b+102960|0,sa=b+102872|0,Ba=b+68|0;vp(Q,l[ea>>2],l[U+25734],l[U+25741],Ba,l[U+25736]);var oa=b+102952|0,ga=l[oa>>2],qa=0==(ga|0);a:do{if(!qa){for(var la=ga;;){var Ca=la+4|0;i[Ca>>1]&=-2;var ia=l[la+96>>2];if(0==(ia|0)){break a}la=ia}}}while(0);var ya=l[U+25733],ta=0==(ya|0);a:do{if(!ta){for(var Ia=ya;;){var na=Ia+4|0;l[na>>2]&=-2;var Z=l[Ia+12>>2];if(0==(Z|0)){break a}Ia=Z}}}while(0);var ba=l[U+25739],ca=0==(ba|0);a:do{if(!ca){for(var ma=ba;;){c[ma+60|0]=0;var ka=l[ma+12>>2];if(0==(ka|0)){break a}ma=ka}}}while(0);var aa=l[ea>>2],ra=aa<<2;L=(b+102864|0)>>2;var ha=l[L];if(32>(ha|0)){var za=ha}else{P(N.n|0,38,N.w|0,N.D|0),za=l[L]}J=(b+12*za+102480|0)>>2;l[U+(3*za|0)+25621]=ra;I=(b+102468|0)>>2;var X=l[I];if(102400<(X+ra|0)){var ua=Ne(ra);l[J]=ua;c[b+12*za+102488|0]=1}else{l[J]=b+(X+68)|0,c[b+12*za+102488|0]=0,l[I]=l[I]+ra|0}var da=b+102472|0,fa=l[da>>2]+ra|0;l[da>>2]=fa;var Aa=b+102476|0,Qa=l[Aa>>2];l[Aa>>2]=(Qa|0)>(fa|0)?Qa:fa;l[L]=l[L]+1|0;var pa=l[J];F=(Q+28|0)>>2;var cb=Q+36|0,Ra=Q+32|0,Ta=Q+40|0;H=(Q+8|0)>>2;for(var $a=Q+44|0,va=Q+12|0,Wa=Q+48|0,fb=Q+16|0,gb=b+102968|0,Xa=b+102976|0,Ua=$+12|0,Va=$+16|0,pb=$+20|0,nb=oa;;){var La=l[nb>>2];if(0==(La|0)){break}G=(La+4|0)>>1;var qb=34==(i[G]&35)<<16>>16;a:do{if(qb&&0!=(l[La>>2]|0)){l[F]=0;l[cb>>2]=0;l[Ra>>2]=0;l[pa>>2]=La;i[G]|=1;var bb=l[Ta>>2],Fa=l[H],Ma=l[$a>>2],wa=l[va>>2],hb=l[Wa>>2],Ya=l[fb>>2],Za=1,Da=0,Oa=0,ib=0;b:for(;;){for(var ab=Za,Ga=Da;;){if(0>=(ab|0)){break b}var jb=ab-1|0,Ea=l[pa+(jb<<2)>>2];E=(Ea+4|0)>>1;0==(i[E]&32)<<16>>16&&P(N.t|0,445,N.Ha|0,N.Xg|0);(Ga|0)<(bb|0)||P(N.J|0,54,N.na|0,N.Aa|0);l[(Ea+8|0)>>2]=Ga;l[((Ga<<2)+Fa|0)>>2]=Ea;var Pa=Ga+1|0;l[F]=Pa;var Ja=i[E];0==(Ja&2)<<16>>16&&(i[E]=Ja|2,q[Ea+144>>2]=0);if(0!=(l[Ea>>2]|0)){break}ab=jb;Ga=Pa}for(var db=Ea+112|0,xa=jb,Sa=ib;;){var Ka=l[db>>2];if(0==(Ka|0)){break}var tb=l[Ka+4>>2];D=(tb+4|0)>>2;if(6==(l[D]&7|0)){if(0!=(c[l[tb+48>>2]+38|0]&1)<<24>>24){var kb=xa,ub=Sa}else{if(0!=(c[l[tb+52>>2]+38|0]&1)<<24>>24){kb=xa,ub=Sa}else{(Sa|0)<(Ma|0)||P(N.J|0,62,N.Ia|0,N.Wa|0);var rb=Sa+1|0;l[cb>>2]=rb;l[((Sa<<2)+wa|0)>>2]=tb;l[D]|=1;var Bb=l[Ka>>2];z=(Bb+4|0)>>1;0!=(i[z]&1)<<16>>16?kb=xa:((xa|0)<(aa|0)||P(N.t|0,495,N.Ha|0,N.Sb|0),l[((xa<<2)+pa|0)>>2]=Bb,i[z]|=1,kb=xa+1|0);ub=rb}}}else{kb=xa,ub=Sa}db=Ka+12|0;xa=kb;Sa=ub}for(var lb=Ea+108|0,yb=xa,xb=Oa;;){var Ib=l[lb>>2];if(0==(Ib|0)){Za=yb;Da=Pa;Oa=xb;ib=Sa;continue b}var wb=Ib+4|0,vb=l[wb>>2];if(0==(c[vb+60|0]&1)<<24>>24){var zb=l[Ib>>2];C=(zb+4|0)>>1;if(0==(i[C]&32)<<16>>16){var Eb=yb,Cb=xb}else{(xb|0)<(hb|0)||P(N.J|0,68,N.De|0,N.rg|0);var eb=xb+1|0;l[Ra>>2]=eb;l[((xb<<2)+Ya|0)>>2]=vb;c[l[wb>>2]+60|0]=1;0!=(i[C]&1)<<16>>16?Eb=yb:((yb|0)<(aa|0)||P(N.t|0,524,N.Ha|0,N.Sb|0),l[((yb<<2)+pa|0)>>2]=zb,i[C]|=1,Eb=yb+1|0);Cb=eb}}else{Eb=yb,Cb=xb}lb=Ib+12|0;yb=Eb;xb=Cb}}var sb=Q,ob=$,Db=n,Jb=gb,Rb=0!=(c[Xa]&1)<<24>>24,Nb=Ha,Ob=Ha,Lb=Ha,Pb=Ha,Mb=Ha,Yb=Ha,Zb=Ha,ec=Ha,Ub=Ha,jc=Ha,Qb=Ha,mb=Ha,cc=Ha,Fb=Ha,gc=Ha,wc=Ha,pc=a;a+=148;var qc=pc+20,$c=pc+52,wc=$c>>2,Ec=pc+96,gc=Ec>>2,sc=q[Db>>2],Fb=(sb+28|0)>>2,kd=0<(l[Fb]|0);b:do{if(kd){for(var wd=sb+8|0,Lc=Jb|0,$b=Jb+4|0,ac=sb+20|0,oc=sb+24|0,tc=0;;){var Nc=l[l[wd>>2]+(tc<<2)>>2],cc=Nc>>2,ld=Nc+44|0,Wc=q[ld>>2],ad=q[cc+12],Xc=q[cc+14],Cc=Nc+64|0,fd=Cc|0,md=Cc+4|0,nd=l[md>>2],Oc=(t[0]=l[fd>>2],M[0]),gd=(t[0]=nd,M[0]),od=q[cc+18],pd=ld,Pd=Nc+36|0,Xd=l[pd+4>>2];l[(Pd|0)>>2]=l[pd>>2];l[(Pd+4|0)>>2]=Xd;q[cc+13]=Xc;if(2==(l[cc]|0)){var qd=q[cc+35],Qd=q[cc+30],Pc=1-sc*q[cc+33],Ic=1>Pc?Pc:1,Jc=0>Ic?0:Ic,fc=1-sc*q[cc+34],hd=1>fc?fc:1,xd=(od+sc*q[cc+32]*q[cc+21])*(0>hd?0:hd),bd=(Oc+(q[Lc>>2]*qd+q[cc+19]*Qd)*sc)*Jc,rd=(gd+(q[$b>>2]*qd+q[cc+20]*Qd)*sc)*Jc}else{xd=od,bd=Oc,rd=gd}var ye=l[ac>>2];q[(ye>>2)+(3*tc|0)]=Wc;q[(ye+4>>2)+(3*tc|0)]=ad;q[(l[ac>>2]+8>>2)+(3*tc|0)]=Xc;var Yd=l[oc>>2]+12*tc|0,Tc=(M[0]=bd,t[0]),xc=(M[0]=rd,t[0])|0;l[(Yd|0)>>2]=0|Tc;l[(Yd+4|0)>>2]=xc;q[(l[oc>>2]+8>>2)+(3*tc|0)]=xd;var bc=tc+1|0;if((bc|0)>=(l[Fb]|0)){var Ed=ac,mb=Ed>>2,yc=oc,Qb=yc>>2;break b}tc=bc}}else{Ed=sb+20|0,mb=Ed>>2,yc=sb+24|0,Qb=yc>>2}}while(0);jc=qc>>2;Ub=Db>>2;l[jc]=l[Ub];l[jc+1]=l[Ub+1];l[jc+2]=l[Ub+2];l[jc+3]=l[Ub+3];l[jc+4]=l[Ub+4];l[jc+5]=l[Ub+5];var Ac=l[mb];l[qc+24>>2]=Ac;var Zd=l[Qb];l[qc+28>>2]=Zd;ec=$c>>2;l[ec]=l[Ub];l[ec+1]=l[Ub+1];l[ec+2]=l[Ub+2];l[ec+3]=l[Ub+3];l[ec+4]=l[Ub+4];l[ec+5]=l[Ub+5];var $d=sb+12|0;l[wc+6]=l[$d>>2];Zb=(sb+36|0)>>2;l[wc+7]=l[Zb];l[wc+8]=Ac;l[wc+9]=Zd;l[wc+10]=l[sb>>2];Qp(Ec,$c);Rp(Ec);if(0!=(c[Db+20|0]&1)<<24>>24){var cd=Ec,zc=Ha,kc=Ha,Rd=cd+48|0,Fc=0<(l[Rd>>2]|0);b:do{if(Fc){for(var Qc=cd+40|0,kc=(cd+28|0)>>2,Mc=0;;){var ne=l[Qc>>2],zc=ne>>2,Sd=l[zc+(38*Mc|0)+28],Td=l[zc+(38*Mc|0)+29],Ud=q[zc+(38*Mc|0)+30],xf=q[zc+(38*Mc|0)+32],Fd=q[zc+(38*Mc|0)+31],oe=q[zc+(38*Mc|0)+33],He=l[zc+(38*Mc|0)+36],ae=l[kc],Gc=ae+12*Sd|0,dd=l[Gc+4>>2],be=(t[0]=l[Gc>>2],M[0]),pe=(t[0]=dd,M[0]),Uc=q[(ae+8>>2)+(3*Sd|0)],lc=ae+12*Td|0,Gd=l[lc+4>>2],Hd=(t[0]=l[lc>>2],M[0]),Re=(t[0]=Gd,M[0]),Id=q[(ae+8>>2)+(3*Td|0)],Jd=ne+152*Mc+72|0,qe=l[Jd+4>>2],re=(t[0]=l[Jd>>2],M[0]),Kd=(t[0]=qe,M[0]),Se=-1*re,Rf=0<(He|0);c:do{if(Rf){for(var sd=Re,Vc=Hd,Te=pe,Ue=be,ce=Uc,Yc=Id,yd=0;;){var $e=q[zc+(38*Mc|0)+(9*yd|0)+4],ze=q[zc+(38*Mc|0)+(9*yd|0)+5],Zc=re*$e+Kd*ze,Ld=Kd*$e+Se*ze,Md=ce-xf*(q[zc+(38*Mc|0)+(9*yd|0)]*Ld-q[zc+(38*Mc|0)+(9*yd|0)+1]*Zc),de=Ue-Zc*Ud,zd=Te-Ld*Ud,ee=Yc+oe*(q[zc+(38*Mc|0)+(9*yd|0)+2]*Ld-q[zc+(38*Mc|0)+(9*yd|0)+3]*Zc),yf=Vc+Zc*Fd,af=sd+Ld*Fd,Ie=yd+1|0;if((Ie|0)==(He|0)){var zf=af,jf=yf,bf=zd,Sf=de,kf=Md,Ae=ee;break c}sd=af;Vc=yf;Te=zd;Ue=de;ce=Md;Yc=ee;yd=Ie}}else{zf=Re,jf=Hd,bf=pe,Sf=be,kf=Uc,Ae=Id}}while(0);var Ad=(M[0]=Sf,t[0]),Af=(M[0]=bf,t[0])|0;l[(Gc|0)>>2]=0|Ad;l[(Gc+4|0)>>2]=Af;q[(l[kc]+8>>2)+(3*Sd|0)]=kf;var Tf=l[kc]+12*Td|0,Gg=(M[0]=jf,t[0]),Hg=(M[0]=zf,t[0])|0;l[(Tf|0)>>2]=0|Gg;l[(Tf+4|0)>>2]=Hg;q[(l[kc]+8>>2)+(3*Td|0)]=Ae;var ng=Mc+1|0;if((ng|0)>=(l[Rd>>2]|0)){break b}Mc=ng}}}while(0)}for(var Yb=(sb+32|0)>>2,Mb=(sb+16|0)>>2,og=0;(og|0)<(l[Yb]|0);){var pg=l[l[Mb]+(og<<2)>>2];K[l[l[pg>>2]+28>>2]](pg,qc);og=og+1|0}q[ob+12>>2]=0;for(var Bf=Db+12|0,Uf=0;(Uf|0)<(l[Bf>>2]|0);){for(var Vf=0;(Vf|0)<(l[Yb]|0);){var Ig=l[l[Mb]+(Vf<<2)>>2];K[l[l[Ig>>2]+32>>2]](Ig,qc);Vf=Vf+1|0}Sp(Ec);Uf=Uf+1|0}var Jh=l[gc+12],Jg=0<(Jh|0);b:do{if(Jg){for(var Fj=l[gc+10],Pb=Fj>>2,Ji=l[gc+11],qg=0;;){var Kh=l[Ji+(l[Pb+(38*qg|0)+37]<<2)>>2],Wf=Fj+152*qg+144|0,Lh=0<(l[Wf>>2]|0);c:do{if(Lh){for(var lf=0;;){q[(Kh+72>>2)+(5*lf|0)]=q[Pb+(38*qg|0)+(9*lf|0)+4];q[(Kh+76>>2)+(5*lf|0)]=q[Pb+(38*qg|0)+(9*lf|0)+5];var rg=lf+1|0;if((rg|0)>=(l[Wf>>2]|0)){break c}lf=rg}}}while(0);var jh=qg+1|0;if((jh|0)>=(Jh|0)){break b}qg=jh}}}while(0);q[ob+16>>2]=0;var Mh=0<(l[Fb]|0);b:do{if(Mh){for(var Be=0;;){var sg=l[mb],se=sg+12*Be|0,Kg=l[se+4>>2],fe=(t[0]=l[se>>2],M[0]),te=(t[0]=Kg,M[0]),ue=q[(sg+8>>2)+(3*Be|0)],ge=l[Qb],mf=ge+12*Be|0,Ki=l[mf+4>>2],Lg=(t[0]=l[mf>>2],M[0]),tg=(t[0]=Ki,M[0]),kh=q[(ge+8>>2)+(3*Be|0)],Nh=Lg*sc,ug=tg*sc,Oh=Nh*Nh+ug*ug;if(4<Oh){var Ph=2/Fh(Oh),Mg=Lg*Ph,Ng=tg*Ph}else{Mg=Lg,Ng=tg}var Hc=sc*kh,uc=2.4674012660980225<Hc*Hc?kh*(1.5707963705062866/(0<Hc?Hc:-Hc)):kh,Li=te+Ng*sc,Qh=ue+sc*uc,Og=(M[0]=fe+Mg*sc,t[0]),Pg=(M[0]=Li,t[0])|0;l[(se|0)>>2]=0|Og;l[(se+4|0)>>2]=Pg;q[(l[mb]+8>>2)+(3*Be|0)]=Qh;var Qg=l[Qb]+12*Be|0,Mi=(M[0]=Mg,t[0]),Rh=(M[0]=Ng,t[0])|0;l[(Qg|0)>>2]=0|Mi;l[(Qg+4|0)>>2]=Rh;q[(l[Qb]+8>>2)+(3*Be|0)]=uc;var Rg=Be+1|0;if((Rg|0)>=(l[Fb]|0)){break b}Be=Rg}}}while(0);for(var Sh=Db+16|0,lh=0;;){if((lh|0)>=(l[Sh>>2]|0)){var Th=1;break}var Ni,nf=Ec,he=Ha,Bd=Ha,cf=a;a+=52;var vg=cf+16,Ce=cf+32,Cf=nf+48|0,td=0<(l[Cf>>2]|0);b:do{if(td){for(var Sg=nf+36|0,Bd=(nf+24|0)>>2,Gj=cf+8|0,Uh=cf+12|0,Oi=vg+8|0,wg=vg+12|0,Vh=cf,Wh=vg,Xh=Ce,Yh=Ce+8|0,Hj=Ce+16|0,Je=0,Xf=0;;){var Yf=l[Sg>>2],he=Yf>>2,Zh=Yf+88*Je|0,Tg=l[he+(22*Je|0)+8],mh=l[he+(22*Je|0)+9],Df=Yf+88*Je+48|0,$h=l[Df+4>>2],Ug=(t[0]=l[Df>>2],M[0]),ai=(t[0]=$h,M[0]),xg=q[he+(22*Je|0)+10],Pi=q[he+(22*Je|0)+16],df=Yf+88*Je+56|0,nh=l[df+4>>2],oh=(t[0]=l[df>>2],M[0]),ph=(t[0]=nh,M[0]),Zf=q[he+(22*Je|0)+11],Ve=q[he+(22*Je|0)+17],of=l[he+(22*Je|0)+21],Vg=l[Bd],bi=Vg+12*Tg|0,Wg=l[bi+4>>2],Xg=(t[0]=l[bi>>2],M[0]),We=(t[0]=Wg,M[0]),Qi=q[(Vg+8>>2)+(3*Tg|0)],ef=Vg+12*mh|0,Ij=l[ef+4>>2],$f=(t[0]=l[ef>>2],M[0]),Ef=(t[0]=Ij,M[0]),qh=q[(Vg+8>>2)+(3*mh|0)];if(0<(of|0)){for(var ci=xg+Zf,ff=Ef,pf=$f,qf=We,yg=Xg,zg=Qi,Ff=qh,Yg=Xf,Zg=0;;){var ie=mm(zg);q[Gj>>2]=ie;var Gf=nm(zg);q[Uh>>2]=Gf;var Hf=mm(Ff);q[Oi>>2]=Hf;var rh=nm(Ff);q[wg>>2]=rh;var Ri=qf-(ie*Ug+Gf*ai),Si=(M[0]=yg-(Gf*Ug-ie*ai),t[0]),Jj=(M[0]=Ri,t[0])|0;l[Vh>>2]=0|Si;l[Vh+4>>2]=Jj;var di=ff-(Hf*oh+rh*ph),ei=(M[0]=pf-(rh*oh-Hf*ph),t[0]),Qk=(M[0]=di,t[0])|0;l[Wh>>2]=0|ei;l[Wh+4>>2]=Qk;Tp(Ce,Zh,cf,vg,Zg);var xn=l[Xh+4>>2],Kj=(t[0]=l[Xh>>2],M[0]),Lj=(t[0]=xn,M[0]),Ti=l[Yh+4>>2],Ui=(t[0]=l[Yh>>2],M[0]),Rk=(t[0]=Ti,M[0]),Ke=q[Hj>>2],Mj=Ui-yg,fi=Rk-qf,Sk=Ui-pf,Vi=Rk-ff,Tk=Yg<Ke?Yg:Ke,Wi=.20000000298023224*(Ke+.004999999888241291),Nj=0>Wi?Wi:0,Oj=Mj*Lj-fi*Kj,Pj=Sk*Lj-Vi*Kj,ag=ci+Pi*Oj*Oj+Ve*Pj*Pj,gi=0<ag?-(-.20000000298023224>Nj?-.20000000298023224:Nj)/ag:0,If=Kj*gi,Xi=Lj*gi,Uk=yg-If*xg,Qj=qf-Xi*xg,Vk=zg-Pi*(Mj*Xi-fi*If),Wk=pf+If*Zf,Yi=ff+Xi*Zf,hi=Ff+Ve*(Sk*Xi-Vi*If),Rj=Zg+1|0;if((Rj|0)==(of|0)){break}ff=Yi;pf=Wk;qf=Qj;yg=Uk;zg=Vk;Ff=hi;Yg=Tk;Zg=Rj}var Sj=Yi,Tj=Wk,$g=Qj,Xk=Uk,Zi=Vk,Yk=hi,Zk=Tk,$i=l[Bd]}else{Sj=Ef,Tj=$f,$g=We,Xk=Xg,Zi=Qi,Yk=qh,Zk=Xf,$i=Vg}var Uj=$i+12*Tg|0,ii=(M[0]=Xk,t[0]),$k=(M[0]=$g,t[0])|0;l[(Uj|0)>>2]=0|ii;l[(Uj+4|0)>>2]=$k;q[(l[Bd]+8>>2)+(3*Tg|0)]=Zi;var aj=l[Bd]+12*mh|0,al=(M[0]=Tj,t[0]),bj=(M[0]=Sj,t[0])|0;l[(aj|0)>>2]=0|al;l[(aj+4|0)>>2]=bj;q[(l[Bd]+8>>2)+(3*mh|0)]=Yk;var ji=Je+1|0;if((ji|0)>=(l[Cf>>2]|0)){var bl=Zk;break b}Je=ji;Xf=Zk}}else{bl=0}}while(0);a=cf;Ni=-.014999999664723873<=bl;for(var cj=0,Vj=1;(cj|0)<(l[Yb]|0);){var Wj=l[l[Mb]+(cj<<2)>>2],ki=K[l[l[Wj>>2]+36>>2]](Wj,qc),pm=Vj&ki,cj=cj+1|0,Vj=pm}if(Ni&Vj){Th=0;break}lh=lh+1|0}var qm=0<(l[Fb]|0);b:do{if(qm){for(var cl=sb+8|0,bg=0;;){var li=l[l[cl>>2]+(bg<<2)>>2],Lb=li>>2,dl=l[mb]+12*bg|0,rm=li+44|0,dj=l[dl>>2],Xj=l[dl+4>>2],fd=rm|0;l[fd>>2]=dj;md=rm+4|0;l[md>>2]=Xj;var Le=q[(l[mb]+8>>2)+(3*bg|0)];q[Lb+14]=Le;var el=l[Qb]+12*bg|0,Yj=li+64|0,fl=l[el+4>>2];l[(Yj|0)>>2]=l[el>>2];l[(Yj+4|0)>>2]=fl;q[Lb+18]=q[(l[Qb]+8>>2)+(3*bg|0)];var Zj=mm(Le);q[Lb+5]=Zj;var Jf=nm(Le);q[Lb+6]=Jf;var gl=li+12|0,ej=q[Lb+7],$j=q[Lb+8],hl=Jf*ej-Zj*$j,sm=Zj*ej+Jf*$j,fj=(t[0]=dj,M[0])-hl,il=(t[0]=Xj,M[0])-sm,ah=gl,jl=(M[0]=fj,t[0]),kl=(M[0]=il,t[0])|0;l[(ah|0)>>2]=0|jl;l[(ah+4|0)>>2]=kl;var ak=bg+1|0;if((ak|0)>=(l[Fb]|0)){break b}bg=ak}}}while(0);q[ob+20>>2]=0;var bk=o[gc+10],Ob=bk>>2,ll=sb+4|0,ml=0==(l[ll>>2]|0);b:do{if(!ml&&0<(l[Zb]|0)){for(var nl=pc+16|0,sh=0;;){var ol=l[l[$d>>2]+(sh<<2)>>2],mi=l[Ob+(38*sh|0)+36];l[nl>>2]=mi;var th=0<(mi|0);c:do{if(th){for(var bh=0;;){q[pc+(bh<<2)>>2]=q[Ob+(38*sh|0)+(9*bh|0)+4];q[pc+(bh<<2)+8>>2]=q[Ob+(38*sh|0)+(9*bh|0)+5];var ck=bh+1|0;if((ck|0)==(mi|0)){break c}bh=ck}}}while(0);var pl=l[ll>>2];K[l[l[pl>>2]+20>>2]](pl,ol,pc);var tm=sh+1|0;if((tm|0)>=(l[Zb]|0)){break b}sh=tm}}}while(0);b:do{if(Rb&&0<(l[Fb]|0)){for(var dk=sb+8|0,gj=3.4028234663852886e+38,uh=0;;){var cg=l[l[dk>>2]+(uh<<2)>>2],ek=0==(l[cg>>2]|0);c:do{if(ek){var ni=gj}else{var hj=0==(i[cg+4>>1]&4)<<16>>16;do{if(!hj){var ch=q[cg+72>>2];if(.001218469929881394>=ch*ch){var fk=q[cg+64>>2],ij=q[cg+68>>2];if(9999999747378752e-20>=fk*fk+ij*ij){var Ag=cg+144|0,gk=q[Ag>>2]+sc;q[Ag>>2]=gk;ni=gj<gk?gj:gk;break c}}}}while(0);ni=q[cg+144>>2]=0}}while(0);var ql=uh+1|0,rl=o[Fb];if((ql|0)>=(rl|0)){break}gj=ni;uh=ql}if(0<(rl|0)&((.5>ni|Th)^1)){for(var vh=0;;){var jj=l[l[dk>>2]+(vh<<2)>>2],um=jj+4|0;i[um>>1]&=-3;q[jj+144>>2]=0;Nb=(jj+64|0)>>2;l[Nb]=0;l[Nb+1]=0;l[Nb+2]=0;l[Nb+3]=0;l[Nb+4]=0;l[Nb+5]=0;var vm=vh+1|0;if((vm|0)>=(l[Fb]|0)){break b}vh=vm}}}}while(0);var qq=l[gc+8];so(qq,bk);so(qq,l[gc+9]);a=pc;q[T]+=q[Ua>>2];q[R]+=q[Va>>2];q[O]+=q[pb>>2];var rq=l[F];if(0<(rq|0)){for(var Ct=l[H],yn=0;;){var sq=l[Ct+(yn<<2)>>2];if(0==(l[sq>>2]|0)){var tq=sq+4|0;i[tq>>1]&=-2}var uq=yn+1|0;if((uq|0)>=(rq|0)){break a}yn=uq}}}}while(0);nb=La+96|0}so(Ba,pa);for(var Dt=W+8|0,Et=W+12|0,vq=oa;;){var je=l[vq>>2];if(0==(je|0)){break}var sl=0==(i[je+4>>1]&1)<<16>>16;a:do{if(!sl&&0!=(l[je>>2]|0)){var zn=q[je+52>>2],hk=mm(zn);q[Dt>>2]=hk;var kj=nm(zn);q[Et>>2]=kj;var An=q[je+28>>2],Bn=q[je+32>>2],wq=q[je+40>>2]-(hk*An+kj*Bn),xq=(M[0]=q[je+36>>2]-(kj*An-hk*Bn),t[0]),tl=(M[0]=wq,t[0])|0;l[W>>2]=0|xq;l[W+4>>2]=tl;var Cn=l[je+88>>2]+102872|0,Dn=l[je+100>>2];if(0!=(Dn|0)){for(var Ft=je+12|0,wm=Dn;;){wo(wm,Cn,W,Ft);var ik=l[wm+4>>2];if(0==(ik|0)){break a}wm=ik}}}}while(0);vq=je+96|0}jp(sa|0,sa);q[U+25755]=0;var jk=l[S];so(jk,l[S+5]);so(jk,l[S+6]);so(jk,l[fb>>2]);so(jk,l[va>>2]);so(jk,l[H]);a=W;q[m+25751]=0}if(0==(c[b+102993|0]&1)<<24>>24){p=12}else{var En=q[h];if(0<En){var ul,vl,wl,Bg,lj,oi,mj,nj,kk,lk,oj,xl,mk,nk,xm,yl,ok,pk,pi,wh,qk,rk,zl,Al,Bl,ym,Cl,xh,pj,yh,qi,qj,rj,sj,ri,tj,Cg,sk,zh,tk,Ah,uj,zm,uk,dg=a;a+=240;var Dl,eg=dg+16;uk=eg>>2;var Xe=dg+68,Am=dg+200,Bm=dg+208,si=dg+216,Gt=b+68|0,Fn=b+102872|0;zm=(b+102944|0)>>2;vp(eg,64,32,0,Gt,l[zm]);var El=b+102995|0,yq=0==(c[El]&1)<<24>>24;a:do{if(yq){var Fl=b+102932|0}else{var Gn=l[b+102952>>2],zq=0==(Gn|0);b:do{if(!zq){for(var Gl=Gn;;){var Hn=Gl+4|0;i[Hn>>1]&=-2;q[Gl+60>>2]=0;var In=l[Gl+96>>2];if(0==(In|0)){break b}Gl=In}}}while(0);var Hl=b+102932|0,Jn=l[Hl>>2];if(0==(Jn|0)){Fl=Hl}else{var Il=Jn;for(uj=Il>>2;;){var Kn=Il+4|0;l[Kn>>2]&=-34;l[uj+32]=0;q[uj+33]=1;var Ln=l[uj+3];if(0==(Ln|0)){Fl=Hl;break a}Il=Ln;uj=Il>>2}}}}while(0);var Aq=Xe+16|0,Bq=Xe+20|0,Mn=Xe+24|0,Ht=Xe+44|0,It=Xe+48|0,Jt=Xe+52|0,Kt=Xe|0,Lt=Xe+28|0,Nn=Xe+56|0,On=Xe+92|0,Mt=Xe+128|0,Nt=Am|0,Pn=Am+4|0;Ah=(eg+28|0)>>2;tk=(eg+36|0)>>2;var Qn=eg+32|0,Cq=eg+40|0;zh=(eg+8|0)>>2;var Dq=eg+44|0;sk=(eg+12|0)>>2;for(var Ot=Bm|0,Pt=Bm+4|0,Qt=n|0,Eq=si|0,Jl=si+4|0,Kl=si+8|0,Rt=si+16|0,ti=n+12|0,ui=si+12|0,Rn=si+20|0,Fq=dg+8|0,St=dg+12|0,Tt=Fn|0,Sn=b+102994|0,Me=0,Vd=1,Tn=Fl;;){var vj=l[Tn>>2];Cg=vj>>2;if(0==(vj|0)){if(0==(Me|0)|.9999988079071045<Vd){var Ll=1,vk=l[zh];break}var Cd=l[l[Me+48>>2]+8>>2],ve=l[l[Me+52>>2]+8>>2];tj=(Cd+28|0)>>2;var Un=q[tj];ri=(Cd+32|0)>>2;var Gq=q[ri],Hq=Cd+36|0,Vn=q[Hq>>2];sj=(Cd+40|0)>>2;var Cm=q[sj];rj=(Cd+44|0)>>2;var Wn=q[rj];qj=(Cd+48|0)>>2;var Dm=q[qj];qi=(Cd+52|0)>>2;var Em=q[qi];yh=(Cd+56|0)>>2;var Ml=q[yh];pj=(Cd+60|0)>>2;var Fm=q[pj];xh=(ve+28|0)>>2;var Iq=q[xh];Cl=(ve+32|0)>>2;var Jq=q[Cl],Gm=ve+36|0,Hm=q[Gm>>2];ym=(ve+40|0)>>2;var Nl=q[ym];Bl=(ve+44|0)>>2;var Kq=q[Bl];Al=(ve+48|0)>>2;var Ut=q[Al];zl=(ve+52|0)>>2;var Lq=q[zl];rk=(ve+56|0)>>2;var Vt=q[rk];qk=(ve+60|0)>>2;var Wt=q[qk];if(1>Fm){var Im=Fm,Jm=Vn,Xn=Cm,Yn=Wn,Zn=Dm,$n=Em,ao=Ml,Km=Un,Lm=Gq,wk=Cd+36|0}else{P(N.ba|0,723,N.Y|0,N.U|0);var bo=Cd+36|0,Im=q[pj],Jm=q[bo>>2],Xn=q[sj],Yn=q[rj],Zn=q[qj],$n=q[qi],ao=q[yh],Km=q[tj],Lm=q[ri],wk=bo}var Ol=(Vd-Im)/(1-Im),Mm=1-Ol,co=Jm*Mm+Yn*Ol,eo=Xn*Mm+Zn*Ol,Mq=wk,Nq=(M[0]=co,t[0]),Xt=(M[0]=eo,t[0]),Oq=0|Nq,fo=Xt|0,vi=Mq|0;wh=vi>>2;l[wh]=Oq;var dh=Mq+4|0;pi=dh>>2;l[pi]=fo;var Pl=Mm*$n+Ol*ao;q[qi]=Pl;q[pj]=Vd;var go=Cd+44|0,Nm=go|0;l[Nm>>2]=Oq;var Om=go+4|0;l[Om>>2]=fo;q[yh]=Pl;var ho=mm(Pl),io=Cd+20|0;q[io>>2]=ho;var jo=nm(Pl),Pq=Cd+24|0;q[Pq>>2]=jo;var Qq=eo-(ho*Km+jo*Lm),Ql=Cd+12|0,Yt=(M[0]=co-(jo*Km-ho*Lm),t[0]),Zt=(M[0]=Qq,t[0])|0,Pm=Ql|0;l[Pm>>2]=0|Yt;var Qm=Ql+4|0;l[Qm>>2]=Zt;var Rq=q[qk];if(1>Rq){var ko=Rq}else{P(N.ba|0,723,N.Y|0,N.U|0),ko=q[qk]}var Rl=(Vd-ko)/(1-ko),xk=ve+36|0,Rm=1-Rl,lo=q[xk>>2]*Rm+q[Bl]*Rl,mo=q[ym]*Rm+q[Al]*Rl,Sq=xk,$t=(M[0]=lo,t[0]),Tq=(M[0]=mo,t[0]),Sm=0|$t,no=Tq|0;l[(Sq|0)>>2]=Sm;l[(Sq+4|0)>>2]=no;var yk=Rm*q[zl]+Rl*q[rk];q[zl]=yk;q[qk]=Vd;var oo=ve+44|0;l[(oo|0)>>2]=Sm;l[(oo+4|0)>>2]=no;q[rk]=yk;var Tm=mm(yk),po=ve+20|0;q[po>>2]=Tm;var qo=nm(yk),Uq=ve+24|0;q[Uq>>2]=qo;var ro=q[xh],Um=q[Cl],Vq=mo-(Tm*ro+qo*Um),zk=ve+12|0,yP=(M[0]=lo-(qo*ro-Tm*Um),t[0]),zP=(M[0]=Vq,t[0])|0;l[(zk|0)>>2]=0|yP;l[(zk+4|0)>>2]=zP;qp(Me,l[zm]);pk=(Me+4|0)>>2;var ru=l[pk];l[pk]=ru&-33;var Jy=Me+128|0;l[Jy>>2]=l[Jy>>2]+1|0;if(6==(ru&6|0)){ok=(Cd+4|0)>>1;var Ky=i[ok];0==(Ky&2)<<16>>16&&(i[ok]=Ky|2,q[Cd+144>>2]=0);yl=(ve+4|0)>>1;var Ly=i[yl];0==(Ly&2)<<16>>16&&(i[yl]=Ly|2,q[ve+144>>2]=0);l[Ah]=0;l[tk]=0;l[Qn>>2]=0;var My=l[Cq>>2];if(0<(My|0)){var su=Cd+8|0;l[su>>2]=0;var tu=l[zh];l[tu>>2]=Cd;l[Ah]=1;if(1<(My|0)){var Ny=su,Oy=tu;Dl=71}else{Py=su,Qy=tu,Dl=70}}else{P(N.J|0,54,N.na|0,N.Aa|0);var Ry=Cd+8|0;l[Ry>>2]=0;var Sy=l[zh];l[Sy>>2]=Cd;l[Ah]=1;var Py=Ry,Qy=Sy;Dl=70}70==Dl&&(P(N.J|0,54,N.na|0,N.Aa|0),Ny=Py,Oy=Qy);var Ty=ve+8|0;l[Ty>>2]=1;l[Oy+4>>2]=ve;l[Ah]=2;0<(l[Dq>>2]|0)||P(N.J|0,62,N.Ia|0,N.Wa|0);l[tk]=1;l[l[sk]>>2]=Me;i[ok]|=1;i[yl]|=1;l[pk]|=1;l[Ot>>2]=Cd;l[Pt>>2]=ve;for(var Uy=l[Cq>>2],Vy=l[Dq>>2],AP=l[sk],BP=l[zh],gr=0;2>(gr|0);){var uu=l[Bm+(gr<<2)>>2],CP=2==(l[uu>>2]|0);a:do{if(CP){for(var DP=uu+4|0,Wy=uu+112|0;;){var hr=l[Wy>>2];if(0==(hr|0)){break a}var zo=l[Ah];if((zo|0)==(Uy|0)){break a}var ir=l[tk];if((ir|0)==(Vy|0)){break a}var Ao=l[hr+4>>2];xm=(Ao+4|0)>>2;var EP=0==(l[xm]&1|0);b:do{if(EP){var id=l[hr>>2],Xy=id|0,FP=2==(l[Xy>>2]|0);do{if(FP&&0==(i[DP>>1]&8)<<16>>16&&0==(i[id+4>>1]&8)<<16>>16){break b}}while(0);if(0==(c[l[Ao+48>>2]+38|0]&1)<<24>>24&&0==(c[l[Ao+52>>2]+38|0]&1)<<24>>24){nk=(id+28|0)>>2;var Tl=q[nk];mk=(id+32|0)>>2;var Ul=q[mk];xl=(id+36|0)>>2;var vu=q[xl];oj=(id+40|0)>>2;var wu=q[oj];lk=(id+44|0)>>2;var Bo=q[lk];kk=(id+48|0)>>2;var Co=q[kk];nj=(id+52|0)>>2;var xu=q[nj];mj=(id+56|0)>>2;var Vl=q[mj];oi=(id+60|0)>>2;var jr=q[oi];lj=(id+4|0)>>1;if(0==(i[lj]&1)<<16>>16){if(1>jr){var yu=jr,Yy=vu,Zy=wu,$y=Bo,az=Co,bz=xu,cz=Vl,zu=Tl,Au=Ul,dz=id+36|0}else{P(N.ba|0,723,N.Y|0,N.U|0);var ez=id+36|0,yu=q[oi],Yy=q[ez>>2],Zy=q[oj],$y=q[lk],az=q[kk],bz=q[nj],cz=q[mj],zu=q[nk],Au=q[mk],dz=ez}var kr=(Vd-yu)/(1-yu),Bu=1-kr,fz=Yy*Bu+$y*kr,gz=Zy*Bu+az*kr,hz=dz,GP=(M[0]=fz,t[0]),HP=(M[0]=gz,t[0]),iz=0|GP,jz=HP|0,vi=hz|0;wh=vi>>2;l[wh]=iz;dh=hz+4|0;pi=dh>>2;l[pi]=jz;var lr=Bu*bz+kr*cz;q[nj]=lr;q[oi]=Vd;var kz=id+44|0,Nm=kz|0;l[Nm>>2]=iz;Om=kz+4|0;l[Om>>2]=jz;q[mj]=lr;var Cu=mm(lr);q[id+20>>2]=Cu;var Du=nm(lr);q[id+24>>2]=Du;var IP=gz-(Cu*zu+Du*Au),lz=id+12|0,JP=(M[0]=fz-(Du*zu-Cu*Au),t[0]),KP=(M[0]=IP,t[0])|0,Pm=lz|0;l[Pm>>2]=0|JP;Qm=lz+4|0;l[Qm>>2]=KP}qp(Ao,l[zm]);var Eu=l[xm];if(0==(Eu&4|0)){q[nk]=Tl;q[mk]=Ul;q[xl]=vu;q[oj]=wu;q[lk]=Bo;q[kk]=Co;q[nj]=xu;q[mj]=Vl;q[oi]=jr;var Fu=mm(Vl);q[id+20>>2]=Fu;var Gu=nm(Vl);q[id+24>>2]=Gu;var LP=Co-(Fu*Tl+Gu*Ul),mz=id+12|0,MP=(M[0]=Bo-(Gu*Tl-Fu*Ul),t[0]),NP=(M[0]=LP,t[0])|0,Hu=mz|0;l[Hu>>2]=0|MP;var Iu=mz+4|0;l[Iu>>2]=NP}else{if(0==(Eu&2|0)){q[nk]=Tl;q[mk]=Ul;q[xl]=vu;q[oj]=wu;q[lk]=Bo;q[kk]=Co;q[nj]=xu;q[mj]=Vl;q[oi]=jr;var Ju=mm(Vl);q[id+20>>2]=Ju;var Ku=nm(Vl);q[id+24>>2]=Ku;var OP=Co-(Ju*Tl+Ku*Ul),nz=id+12|0,PP=(M[0]=Bo-(Ku*Tl-Ju*Ul),t[0]),QP=(M[0]=OP,t[0])|0,Hu=nz|0;l[Hu>>2]=0|PP;Iu=nz+4|0;l[Iu>>2]=QP}else{l[xm]=Eu|1;(ir|0)<(Vy|0)||P(N.J|0,62,N.Ia|0,N.Wa|0);l[tk]=ir+1|0;l[((ir<<2)+AP|0)>>2]=Ao;var mr=i[lj];0==(mr&1)<<16>>16&&(i[lj]=mr|1,0!=(l[Xy>>2]|0)&&0==(mr&2)<<16>>16&&(i[lj]=mr|3,q[id+144>>2]=0),(zo|0)<(Uy|0)||P(N.J|0,54,N.na|0,N.Aa|0),l[(id+8|0)>>2]=zo,l[((zo<<2)+BP|0)>>2]=id,l[Ah]=zo+1|0)}}}}}while(0);Wy=hr+12|0}}}while(0);gr=gr+1|0}var oz=(1-Vd)*q[Qt>>2];q[Eq>>2]=oz;q[Jl>>2]=1/oz;q[Kl>>2]=1;l[Rt>>2]=20;l[ui>>2]=l[ti>>2];c[Rn]=0;var Bh=eg,nr=si,Ym=l[Ny>>2],Zm=l[Ty>>2],or=Ha,Wl=Ha,$m=Ha,Xl=Ha,Yl=Ha,pr=Ha,an=Ha,wj=Ha,Zl=Ha,qr=Ha,bn=Ha,$l=a;a+=116;var Lu=$l+20,bn=Lu>>2,Do=$l+64,qr=Do>>2,Zl=(Bh+28|0)>>2,pz=l[Zl];if((pz|0)>(Ym|0)){var Mu=pz}else{P(N.Gb|0,386,N.vb|0,N.df|0),Mu=l[Zl]}if((Mu|0)>(Zm|0)){var qz=Mu}else{P(N.Gb|0,387,N.vb|0,N.Vf|0),qz=l[Zl]}var RP=0<(qz|0);a:do{if(RP){for(var SP=Bh+8|0,Nu=Bh+20|0,Ou=Bh+24|0,am=0;;){var rr=l[l[SP>>2]+(am<<2)>>2],rz=rr+44|0,sz=l[Nu>>2]+12*am|0,Pu=rz|0,Qu=rz+4|0,TP=l[Qu>>2],Ru=sz|0;l[Ru>>2]=l[Pu>>2];var Su=sz+4|0;l[Su>>2]=TP;q[(l[Nu>>2]+8>>2)+(3*am|0)]=q[rr+56>>2];var tz=rr+64|0,uz=l[Ou>>2]+12*am|0,UP=l[tz+4>>2];l[(uz|0)>>2]=l[tz>>2];l[(uz+4|0)>>2]=UP;q[(l[Ou>>2]+8>>2)+(3*am|0)]=q[rr+72>>2];var vz=am+1|0;if((vz|0)>=(l[Zl]|0)){var Tu=Nu,wj=Tu>>2,Uu=Ou,an=Uu>>2;break a}am=vz}}else{Tu=Bh+20|0,wj=Tu>>2,Uu=Bh+24|0,an=Uu>>2}}while(0);var wz=Bh+12|0;l[bn+6]=l[wz>>2];pr=(Bh+36|0)>>2;l[bn+7]=l[pr];l[bn+10]=l[Bh>>2];Yl=Lu>>2;Xl=nr>>2;l[Yl]=l[Xl];l[Yl+1]=l[Xl+1];l[Yl+2]=l[Xl+2];l[Yl+3]=l[Xl+3];l[Yl+4]=l[Xl+4];l[Yl+5]=l[Xl+5];l[bn+8]=l[wj];l[bn+9]=l[an];Qp(Do,Lu);for(var VP=nr+16|0,Vu=0;(Vu|0)<(l[VP>>2]|0);){var Wu=Do,WP=Ym,XP=Zm,Bk=Ha,cn=Ha,bm=a;a+=52;var sr=bm+16,tr=bm+32,xz=Wu+48|0,YP=0<(l[xz>>2]|0);a:do{if(YP){for(var ZP=Wu+36|0,cn=(Wu+24|0)>>2,$P=bm+8|0,aQ=bm+12|0,bQ=sr+8|0,cQ=sr+12|0,yz=bm,zz=sr,Az=tr,Bz=tr+8|0,dQ=tr+16|0,eh=0,Xu=0;;){var ur=l[ZP>>2],Bk=ur>>2,eQ=ur+88*eh|0,dn=l[Bk+(22*eh|0)+8],vr=l[Bk+(22*eh|0)+9],Cz=ur+88*eh+48|0,fQ=l[Cz+4>>2],Dz=(t[0]=l[Cz>>2],M[0]),Ez=(t[0]=fQ,M[0]),Fz=ur+88*eh+56|0,gQ=l[Fz+4>>2],Gz=(t[0]=l[Fz>>2],M[0]),Hz=(t[0]=gQ,M[0]),Iz=l[Bk+(22*eh|0)+21];if((dn|0)==(WP|0)|(dn|0)==(XP|0)){var Yu=q[Bk+(22*eh|0)+16],wr=q[Bk+(22*eh|0)+10]}else{wr=Yu=0}var Jz=q[Bk+(22*eh|0)+17],Zu=q[Bk+(22*eh|0)+11],Eo=l[cn],Kz=Eo+12*dn|0,hQ=l[Kz+4>>2],Lz=(t[0]=l[Kz>>2],M[0]),Mz=(t[0]=hQ,M[0]),Nz=q[(Eo+8>>2)+(3*dn|0)],Oz=Eo+12*vr|0,iQ=l[Oz+4>>2],Pz=(t[0]=l[Oz>>2],M[0]),Qz=(t[0]=iQ,M[0]),Rz=q[(Eo+8>>2)+(3*vr|0)];if(0<(Iz|0)){for(var jQ=wr+Zu,xr=Qz,yr=Pz,zr=Mz,Ar=Lz,$u=Xu,Br=Nz,Cr=Rz,av=0;;){var bv=mm(Br);q[$P>>2]=bv;var cv=nm(Br);q[aQ>>2]=cv;var dv=mm(Cr);q[bQ>>2]=dv;var ev=nm(Cr);q[cQ>>2]=ev;var kQ=zr-(bv*Dz+cv*Ez),lQ=(M[0]=Ar-(cv*Dz-bv*Ez),t[0]),mQ=(M[0]=kQ,t[0])|0;l[yz>>2]=0|lQ;l[yz+4>>2]=mQ;var nQ=xr-(dv*Gz+ev*Hz),oQ=(M[0]=yr-(ev*Gz-dv*Hz),t[0]),pQ=(M[0]=nQ,t[0])|0;l[zz>>2]=0|oQ;l[zz+4>>2]=pQ;Tp(tr,eQ,bm,sr,av);var qQ=l[Az+4>>2],fv=(t[0]=l[Az>>2],M[0]),gv=(t[0]=qQ,M[0]),rQ=l[Bz+4>>2],Sz=(t[0]=l[Bz>>2],M[0]),Tz=(t[0]=rQ,M[0]),hv=q[dQ>>2],Uz=Sz-Ar,Vz=Tz-zr,Wz=Sz-yr,Xz=Tz-xr,Yz=$u<hv?$u:hv,Zz=.75*(hv+.004999999888241291),$z=0>Zz?Zz:0,aA=Uz*gv-Vz*fv,bA=Wz*gv-Xz*fv,cA=jQ+Yu*aA*aA+Jz*bA*bA,dA=0<cA?-(-.20000000298023224>$z?-.20000000298023224:$z)/cA:0,Dr=fv*dA,Er=gv*dA,eA=Ar-Dr*wr,fA=zr-Er*wr,gA=Br-Yu*(Uz*Er-Vz*Dr),hA=yr+Dr*Zu,iA=xr+Er*Zu,jA=Cr+Jz*(Wz*Er-Xz*Dr),kA=av+1|0;if((kA|0)==(Iz|0)){break}xr=iA;yr=hA;zr=fA;Ar=eA;$u=Yz;Br=gA;Cr=jA;av=kA}var lA=iA,mA=hA,nA=fA,oA=eA,iv=Yz,pA=gA,qA=jA,rA=l[cn]}else{lA=Qz,mA=Pz,nA=Mz,oA=Lz,iv=Xu,pA=Nz,qA=Rz,rA=Eo}var sA=rA+12*dn|0,sQ=(M[0]=oA,t[0]),tQ=(M[0]=nA,t[0])|0;l[(sA|0)>>2]=0|sQ;l[(sA+4|0)>>2]=tQ;q[(l[cn]+8>>2)+(3*dn|0)]=pA;var tA=l[cn]+12*vr|0,uQ=(M[0]=mA,t[0]),vQ=(M[0]=lA,t[0])|0;l[(tA|0)>>2]=0|uQ;l[(tA+4|0)>>2]=vQ;q[(l[cn]+8>>2)+(3*vr|0)]=qA;var uA=eh+1|0;if((uA|0)>=(l[xz>>2]|0)){var vA=iv;break a}eh=uA;Xu=iv}}else{vA=0}}while(0);a=bm;if(-.007499999832361937<=vA){break}Vu=Vu+1|0}var $m=(Bh+8|0)>>2,wA=l[wj]+12*Ym|0,xA=l[l[$m]+(Ym<<2)>>2]+36|0,Pu=wA|0,wQ=l[Pu>>2],Qu=wA+4|0,xQ=l[Qu>>2],Ru=xA|0;l[Ru>>2]=wQ;Su=xA+4|0;l[Su>>2]=xQ;q[l[l[$m]+(Ym<<2)>>2]+52>>2]=q[(l[wj]+8>>2)+(3*Ym|0)];var yA=l[wj]+12*Zm|0,zA=l[l[$m]+(Zm<<2)>>2]+36|0,yQ=l[yA+4>>2],jv=zA|0;l[jv>>2]=l[yA>>2];var kv=zA+4|0;l[kv>>2]=yQ;q[l[l[$m]+(Zm<<2)>>2]+52>>2]=q[(l[wj]+8>>2)+(3*Zm|0)];Rp(Do);for(var zQ=nr+12|0,lv=0;(lv|0)<(l[zQ>>2]|0);){Sp(Do),lv=lv+1|0}var en=q[nr>>2],AQ=0<(l[Zl]|0);a:do{if(AQ){for(var wi=0;;){var AA=l[wj],Fr=AA+12*wi|0,BQ=l[Fr+4>>2],CQ=(t[0]=l[Fr>>2],M[0]),DQ=(t[0]=BQ,M[0]),EQ=q[(AA+8>>2)+(3*wi|0)],BA=l[an],CA=BA+12*wi|0,FQ=l[CA+4>>2],mv=(t[0]=l[CA>>2],M[0]),nv=(t[0]=FQ,M[0]),ov=q[(BA+8>>2)+(3*wi|0)],DA=mv*en,EA=nv*en,FA=DA*DA+EA*EA;if(4<FA){var GA=2/Fh(FA),pv=mv*GA,qv=nv*GA}else{pv=mv,qv=nv}var Fo=en*ov,rv=2.4674012660980225<Fo*Fo?ov*(1.5707963705062866/(0<Fo?Fo:-Fo)):ov,HA=CQ+pv*en,IA=DQ+qv*en,Gr=EQ+en*rv,GQ=(M[0]=HA,t[0]),HQ=(M[0]=IA,t[0]),JA=0|GQ,KA=HQ|0;l[(Fr|0)>>2]=JA;l[(Fr+4|0)>>2]=KA;q[(l[wj]+8>>2)+(3*wi|0)]=Gr;var LA=l[an]+12*wi|0,IQ=(M[0]=pv,t[0]),JQ=(M[0]=qv,t[0]),MA=0|IQ,NA=JQ|0,jv=LA|0;l[jv>>2]=MA;kv=LA+4|0;l[kv>>2]=NA;q[(l[an]+8>>2)+(3*wi|0)]=rv;var Hr=l[l[$m]+(wi<<2)>>2],Wl=Hr>>2,OA=Hr+44|0;l[(OA|0)>>2]=JA;l[(OA+4|0)>>2]=KA;q[Wl+14]=Gr;var PA=Hr+64|0;l[(PA|0)>>2]=MA;l[(PA+4|0)>>2]=NA;q[Wl+18]=rv;var sv=mm(Gr);q[Wl+5]=sv;var tv=nm(Gr);q[Wl+6]=tv;var QA=q[Wl+7],RA=q[Wl+8],KQ=IA-(sv*QA+tv*RA),SA=Hr+12|0,LQ=(M[0]=HA-(tv*QA-sv*RA),t[0]),MQ=(M[0]=KQ,t[0])|0;l[(SA|0)>>2]=0|LQ;l[(SA+4|0)>>2]=MQ;var TA=wi+1|0;if((TA|0)>=(l[Zl]|0)){break a}wi=TA}}}while(0);var UA=l[qr+10],or=UA>>2,VA=Bh+4|0,NQ=0==(l[VA>>2]|0);a:do{if(!NQ&&0<(l[pr]|0)){for(var OQ=$l+16|0,fn=0;;){var PQ=l[l[wz>>2]+(fn<<2)>>2],uv=l[or+(38*fn|0)+36];l[OQ>>2]=uv;var QQ=0<(uv|0);b:do{if(QQ){for(var gn=0;;){q[$l+(gn<<2)>>2]=q[or+(38*fn|0)+(9*gn|0)+4];q[$l+(gn<<2)+8>>2]=q[or+(38*fn|0)+(9*gn|0)+5];var WA=gn+1|0;if((WA|0)==(uv|0)){break b}gn=WA}}}while(0);var XA=l[VA>>2];K[l[l[XA>>2]+20>>2]](XA,PQ,$l);var YA=fn+1|0;if((YA|0)>=(l[pr]|0)){break a}fn=YA}}}while(0);var ZA=l[qr+8];so(ZA,UA);so(ZA,l[qr+9]);a=$l;for(var RQ=l[Ah],$A=l[zh],Ir=0;(Ir|0)<(RQ|0);){var vv=l[$A+(Ir<<2)>>2];Bg=vv>>2;var aB=vv+4|0;i[aB>>1]&=-2;var SQ=2==(l[Bg]|0);a:do{if(SQ){var bB=q[Bg+13],wv=mm(bB);q[Fq>>2]=wv;var xv=nm(bB);q[St>>2]=xv;var cB=q[Bg+7],dB=q[Bg+8],TQ=q[Bg+10]-(wv*cB+xv*dB),UQ=(M[0]=q[Bg+9]-(xv*cB-wv*dB),t[0]),VQ=(M[0]=TQ,t[0])|0;l[dg>>2]=0|UQ;l[dg+4>>2]=VQ;var WQ=l[Bg+22]+102872|0,eB=l[Bg+25],XQ=0==(eB|0);b:do{if(!XQ){for(var YQ=vv+12|0,yv=eB;;){wo(yv,WQ,dg,YQ);var fB=l[yv+4>>2];if(0==(fB|0)){break b}yv=fB}}}while(0);var gB=l[Bg+28];if(0!=(gB|0)){for(var zv=gB;;){var hB=l[zv+4>>2]+4|0;l[hB>>2]&=-34;var iB=l[zv+12>>2];if(0==(iB|0)){break a}zv=iB}}}}while(0);Ir=Ir+1|0}jp(Tt,Fn);if(0!=(c[Sn]&1)<<24>>24){Ll=0;vk=$A;break}}else{l[pk]=ru&-37;q[tj]=Un;q[ri]=Gq;q[Hq>>2]=Vn;q[sj]=Cm;q[rj]=Wn;q[qj]=Dm;q[qi]=Em;q[yh]=Ml;q[pj]=Fm;q[xh]=Iq;q[Cl]=Jq;q[Gm>>2]=Hm;q[ym]=Nl;q[Bl]=Kq;q[Al]=Ut;q[zl]=Lq;q[rk]=Vt;q[qk]=Wt;var jB=q[yh],Av=mm(jB);q[io>>2]=Av;var Bv=nm(jB);q[Pq>>2]=Bv;var kB=q[tj],lB=q[ri],ZQ=q[qj]-(Av*kB+Bv*lB),$Q=(M[0]=q[rj]-(Bv*kB-Av*lB),t[0]),aR=(M[0]=ZQ,t[0])|0;l[(Ql|0)>>2]=0|$Q;l[(Ql+4|0)>>2]=aR;var mB=q[rk],Cv=mm(mB);q[po>>2]=Cv;var Dv=nm(mB);q[Uq>>2]=Dv;var nB=q[xh],oB=q[Cl],bR=q[Al]-(Cv*nB+Dv*oB),cR=(M[0]=q[Bl]-(Dv*nB-Cv*oB),t[0]),dR=(M[0]=bR,t[0])|0;l[(zk|0)>>2]=0|cR;l[(zk+4|0)>>2]=dR}Me=0;Vd=1;Tn=Fl}else{wl=(vj+4|0)>>2;var pB=l[wl],eR=0==(pB&4|0);do{if(eR){var Ck=Me,Dk=Vd}else{if(8<(l[Cg+32]|0)){Ck=Me,Dk=Vd}else{if(0==(pB&32|0)){var Ev=l[Cg+12],Fv=l[Cg+13];if(0!=(c[Ev+38|0]&1)<<24>>24){Ck=Me;Dk=Vd;break}if(0!=(c[Fv+38|0]&1)<<24>>24){Ck=Me;Dk=Vd;break}var xi=l[Ev+8>>2],yi=l[Fv+8>>2],Gv=l[xi>>2],Hv=l[yi>>2];2==(Gv|0)|2==(Hv|0)||P(N.t|0,641,N.ub|0,N.oh|0);var qB=i[xi+4>>1],rB=i[yi+4>>1];if(!(0!=(qB&2)<<16>>16&0!=(Gv|0)|0!=(rB&2)<<16>>16&0!=(Hv|0))){Ck=Me;Dk=Vd;break}if(!(0!=(qB&8)<<16>>16|2!=(Gv|0)|0!=(rB&8)<<16>>16|2!=(Hv|0))){Ck=Me;Dk=Vd;break}var fR=xi+28|0;vl=(xi+60|0)>>2;var cm=q[vl],gR=yi+28|0;ul=(yi+60|0)>>2;var hn=q[ul];if(cm<hn){if(1>cm){var Iv=cm}else{P(N.ba|0,723,N.Y|0,N.U|0),Iv=q[vl]}var Jr=(hn-Iv)/(1-Iv),sB=xi+36|0,Jv=1-Jr,hR=q[xi+40>>2]*Jv+q[xi+48>>2]*Jr,tB=sB,iR=(M[0]=q[sB>>2]*Jv+q[xi+44>>2]*Jr,t[0]),jR=(M[0]=hR,t[0]),kR=0|iR,lR=jR|0,vi=tB|0;wh=vi>>2;l[wh]=kR;dh=tB+4|0;pi=dh>>2;l[pi]=lR;var uB=xi+52|0;q[uB>>2]=Jv*q[uB>>2]+Jr*q[xi+56>>2];var Kr=q[vl]=hn}else{if(hn<cm){if(1>hn){var Kv=hn}else{P(N.ba|0,723,N.Y|0,N.U|0),Kv=q[ul]}var Lr=(cm-Kv)/(1-Kv),vB=yi+36|0,Lv=1-Lr,mR=q[yi+40>>2]*Lv+q[yi+48>>2]*Lr,wB=vB,nR=(M[0]=q[vB>>2]*Lv+q[yi+44>>2]*Lr,t[0]),oR=(M[0]=mR,t[0]),pR=0|nR,qR=oR|0,vi=wB|0;wh=vi>>2;l[wh]=pR;dh=wB+4|0;pi=dh>>2;l[pi]=qR;var xB=yi+52|0;q[xB>>2]=Lv*q[xB>>2]+Lr*q[yi+56>>2];q[ul]=cm}Kr=cm}1>Kr||P(N.t|0,676,N.ub|0,N.U|0);var rR=l[Cg+14],sR=l[Cg+15];l[Aq>>2]=0;l[Bq>>2]=0;q[Mn>>2]=0;l[Ht>>2]=0;l[It>>2]=0;q[Jt>>2]=0;Hi(Kt,l[Ev+12>>2],rR);Hi(Lt,l[Fv+12>>2],sR);for(var xj=fR>>2,Go=Nn>>2,Mv=xj+9;xj<Mv;xj++,Go++){l[Go]=l[xj]}xj=gR>>2;Go=On>>2;for(Mv=xj+9;xj<Mv;xj++,Go++){l[Go]=l[xj]}q[Mt>>2]=1;var yB=Am,Ek=Xe,Fk=Ha,Gk=Ha,Hk=Ha,Ik=Ha,Mr=Ha,Nr=Ha,Or=Ha,Pr=Ha,Jk=Ha,Kk=Ha,Ye=a;a+=308;var dm=Ha,zi=Ye+36,Nv=Ye+72,fh=Ye+84,zB=Ye+176,Qr=Ye+200,AB=Ye+300,BB=Ye+304;l[Up>>2]=l[Up>>2]+1|0;Kk=(yB|0)>>2;l[Kk]=0;var CB=Ek+128|0,tR=q[CB>>2],Jk=(yB+4|0)>>2;q[Jk]=tR;for(var uR=Ek|0,DB=Ek+28|0,yj=(Ek+56|0)>>2,Ho=Ye>>2,Pv=yj+9;yj<Pv;yj++,Ho++){l[Ho]=l[yj]}yj=(Ek+92|0)>>2;Ho=zi>>2;for(Pv=yj+9;yj<Pv;yj++,Ho++){l[Ho]=l[yj]}var Pr=(Ye+24|0)>>2,EB=q[Pr],GB=6.2831854820251465*Vp(EB/6.2831854820251465),HB=EB-GB;q[Pr]=HB;var Or=(Ye+28|0)>>2,IB=q[Or]-GB;q[Or]=IB;var Nr=(zi+24|0)>>2,JB=q[Nr],KB=6.2831854820251465*Vp(JB/6.2831854820251465),LB=JB-KB;q[Nr]=LB;var Mr=(zi+28|0)>>2,MB=q[Mr]-KB;q[Mr]=MB;var NB=q[CB>>2],OB=q[Ek+24>>2]+q[Ek+52>>2]-.014999999664723873,jn=.004999999888241291>OB?.004999999888241291:OB;.0012499999720603228<jn||P(N.Ca|0,280,N.ie|0,N.rf|0);i[Nv+4>>1]=0;Ik=fh>>2;Hk=Ek>>2;l[Ik]=l[Hk];l[Ik+1]=l[Hk+1];l[Ik+2]=l[Hk+2];l[Ik+3]=l[Hk+3];l[Ik+4]=l[Hk+4];l[Ik+5]=l[Hk+5];l[Ik+6]=l[Hk+6];Gk=(fh+28|0)>>2;Fk=DB>>2;l[Gk]=l[Fk];l[Gk+1]=l[Fk+1];l[Gk+2]=l[Fk+2];l[Gk+3]=l[Fk+3];l[Gk+4]=l[Fk+4];l[Gk+5]=l[Fk+5];l[Gk+6]=l[Fk+6];c[fh+88|0]=0;var vR=Ye+8|0,wR=Ye+12|0,xR=Ye+16|0,yR=Ye+20|0,zR=Ye|0,AR=Ye+4|0,BR=zi+8|0,CR=zi+12|0,DR=zi+16|0,ER=zi+20|0,FR=zi|0,GR=zi+4|0,HR=fh+56|0,IR=fh+60|0,JR=fh+64|0,KR=fh+68|0,LR=fh+72|0,MR=fh+76|0,NR=fh+80|0,OR=fh+84|0,PR=zB+16|0,Qv=jn+.0012499999720603228,PB=jn-.0012499999720603228,Kf=0,Io=0,QB=HB,RB=IB,SB=LB,TB=MB;a:for(;;){var kn=1-Kf,QR=q[vR>>2]*kn+q[xR>>2]*Kf,RR=q[wR>>2]*kn+q[yR>>2]*Kf,UB=kn*QB+RB*Kf,Rv=mm(UB),Sv=nm(UB),VB=q[zR>>2],WB=q[AR>>2],SR=QR-(Sv*VB-Rv*WB),TR=RR-(Rv*VB+Sv*WB),UR=q[BR>>2]*kn+q[DR>>2]*Kf,VR=q[CR>>2]*kn+q[ER>>2]*Kf,XB=kn*SB+TB*Kf,Tv=mm(XB),Uv=nm(XB),YB=q[FR>>2],ZB=q[GR>>2],WR=UR-(Uv*YB-Tv*ZB),XR=VR-(Tv*YB+Uv*ZB);q[HR>>2]=SR;q[IR>>2]=TR;q[JR>>2]=Rv;q[KR>>2]=Sv;q[LR>>2]=WR;q[MR>>2]=XR;q[NR>>2]=Tv;q[OR>>2]=Uv;Ii(zB,Nv,fh);var $B=q[PR>>2];if(0>=$B){l[Kk]=2;q[Jk]=0;var Jo=Io,dm=29;break}if($B<Qv){l[Kk]=3;q[Jk]=Kf;Jo=Io;dm=29;break}var fg=Qr,Lk=Nv,Vv=uR,YR=Ye,Wv=DB,ZR=zi,em=Kf,Ai=Ha,Bi=Ha,Rr=Ha,Ko=Ha,Lf=fg>>2,Ko=(fg|0)>>2;l[Ko]=Vv;Rr=(fg+4|0)>>2;l[Rr]=Wv;var Xv=jd[Lk+4>>1];0!=Xv<<16>>16&3>(Xv&65535)||P(N.Ca|0,50,N.se|0,N.kh|0);for(var aC=fg+8|0,zj=YR>>2,Lo=aC>>2,Yv=zj+9;zj<Yv;zj++,Lo++){l[Lo]=l[zj]}for(var bC=fg+44|0,zj=ZR>>2,Lo=bC>>2,Yv=zj+9;zj<Yv;zj++,Lo++){l[Lo]=l[zj]}var ln=1-em,$R=q[Lf+4]*ln+q[Lf+6]*em,aS=q[Lf+5]*ln+q[Lf+7]*em,cC=ln*q[Lf+8]+q[Lf+9]*em,Ci=mm(cC),Di=nm(cC),dC=q[aC>>2],eC=q[Lf+3],Zv=$R-(Di*dC-Ci*eC),$v=aS-(Ci*dC+Di*eC),bS=q[Lf+13]*ln+q[Lf+15]*em,cS=q[Lf+14]*ln+q[Lf+16]*em,fC=ln*q[Lf+17]+q[Lf+18]*em,Ei=mm(fC),Fi=nm(fC),gC=q[bC>>2],hC=q[Lf+12],aw=bS-(Fi*gC-Ei*hC),bw=cS-(Ei*gC+Fi*hC);if(1==Xv<<16>>16){l[Lf+20]=0;var iC=l[Ko],jC=ed[Lk+6|0]&255;(l[iC+20>>2]|0)>(jC|0)||P(N.i|0,103,N.h|0,N.j|0);var kC=(jC<<3)+l[iC+16>>2]|0,Aj=kC|0,Bi=Aj>>2,Bj=kC+4|0,Ai=Bj>>2,dS=l[Ai],lC=(t[0]=l[Bi],M[0]),mC=(t[0]=dS,M[0]),nC=l[Rr],oC=ed[Lk+9|0]&255;(l[nC+20>>2]|0)>(oC|0)||P(N.i|0,103,N.h|0,N.j|0);var pC=(oC<<3)+l[nC+16>>2]|0,Aj=pC|0,Bi=Aj>>2,Bj=pC+4|0,Ai=Bj>>2,eS=l[Ai],qC=(t[0]=l[Bi],M[0]),rC=(t[0]=eS,M[0]),cw=fg+92|0,Sr=Fi*qC-Ei*rC+aw-(Di*lC-Ci*mC+Zv),Tr=Ei*qC+Fi*rC+bw-(Ci*lC+Di*mC+$v),fS=(M[0]=Sr,t[0]),gS=(M[0]=Tr,t[0])|0;l[cw>>2]=0|fS;l[cw+4>>2]=gS;var sC=Fh(Sr*Sr+Tr*Tr);if(1.1920928955078125e-7<=sC){var hS=fg+96|0,tC=1/sC;q[cw>>2]=Sr*tC;q[hS>>2]=Tr*tC}}else{var dw=Lk+6|0,uC=Lk+7|0,vC=fg+80|0;if(c[dw]<<24>>24==c[uC]<<24>>24){l[vC>>2]=2;var wC=ed[Lk+9|0]&255,xC=Wv+20|0,yC=o[xC>>2];if((yC|0)>(wC|0)){var zC=yC}else{P(N.i|0,103,N.h|0,N.j|0),zC=l[xC>>2]}var AC=Wv+16|0,BC=o[AC>>2],CC=(wC<<3)+BC|0,iS=l[CC+4>>2],DC=(t[0]=l[CC>>2],M[0]),EC=(t[0]=iS,M[0]),FC=ed[Lk+10|0]&255;if((zC|0)>(FC|0)){var GC=BC}else{P(N.i|0,103,N.h|0,N.j|0),GC=l[AC>>2]}var HC=(FC<<3)+GC|0,jS=l[HC+4>>2],IC=(t[0]=l[HC>>2],M[0]),JC=(t[0]=jS,M[0]),Mo=fg+92|0,No=JC-EC,Oo=-1*(IC-DC),kS=(M[0]=No,t[0]),lS=(M[0]=Oo,t[0])|0;l[Mo>>2]=0|kS;l[Mo+4>>2]=lS;var KC=Mo|0,LC=fg+96|0,MC=Fh(No*No+Oo*Oo);if(1.1920928955078125e-7>MC){var ew=No,fw=Oo}else{var NC=1/MC,OC=No*NC;q[KC>>2]=OC;var PC=Oo*NC;q[LC>>2]=PC;ew=OC;fw=PC}var mS=Fi*ew-Ei*fw,nS=Ei*ew+Fi*fw,gw=.5*(DC+IC),hw=.5*(EC+JC),QC=fg+84|0,oS=(M[0]=gw,t[0]),pS=(M[0]=hw,t[0])|0,iw=QC|0;l[iw>>2]=0|oS;var jw=QC+4|0;l[jw>>2]=pS;var qS=Fi*gw-Ei*hw+aw,rS=Ei*gw+Fi*hw+bw,RC=ed[dw]&255;(l[Vv+20>>2]|0)>(RC|0)||P(N.i|0,103,N.h|0,N.j|0);var SC=(RC<<3)+l[Vv+16>>2]|0,Aj=SC|0,Bi=Aj>>2,Bj=SC+4|0,Ai=Bj>>2,sS=l[Ai],TC=(t[0]=l[Bi],M[0]),UC=(t[0]=sS,M[0]);if(0>(Di*TC-Ci*UC+Zv-qS)*mS+(Ci*TC+Di*UC+$v-rS)*nS){var tS=-q[LC>>2],uS=(M[0]=-q[KC>>2],t[0]),vS=(M[0]=tS,t[0])|0,kw=Mo|0;l[kw>>2]=0|uS;var lw=Mo+4|0;l[lw>>2]=vS}}else{l[vC>>2]=1;var mw=l[Ko],VC=ed[dw]&255,WC=o[mw+20>>2];if((WC|0)>(VC|0)){var XC=mw,YC=WC}else{P(N.i|0,103,N.h|0,N.j|0);var ZC=l[Ko],XC=ZC,YC=l[ZC+20>>2]}var $C=(VC<<3)+l[mw+16>>2]|0,wS=l[$C+4>>2],aD=(t[0]=l[$C>>2],M[0]),bD=(t[0]=wS,M[0]),cD=ed[uC]&255;(YC|0)>(cD|0)||P(N.i|0,103,N.h|0,N.j|0);var dD=(cD<<3)+l[XC+16>>2]|0,Aj=dD|0,Bi=Aj>>2,Bj=dD+4|0,Ai=Bj>>2,xS=l[Ai],eD=(t[0]=l[Bi],M[0]),fD=(t[0]=xS,M[0]),Po=fg+92|0,Qo=fD-bD,Ro=-1*(eD-aD),yS=(M[0]=Qo,t[0]),zS=(M[0]=Ro,t[0])|0;l[Po>>2]=0|yS;l[Po+4>>2]=zS;var gD=Po|0,hD=fg+96|0,iD=Fh(Qo*Qo+Ro*Ro);if(1.1920928955078125e-7>iD){var nw=Qo,ow=Ro}else{var jD=1/iD,kD=Qo*jD;q[gD>>2]=kD;var lD=Ro*jD;q[hD>>2]=lD;nw=kD;ow=lD}var AS=Di*nw-Ci*ow,BS=Ci*nw+Di*ow,pw=.5*(aD+eD),qw=.5*(bD+fD),mD=fg+84|0,CS=(M[0]=pw,t[0]),DS=(M[0]=qw,t[0]),ES=0|CS,FS=DS|0,iw=mD|0;l[iw>>2]=ES;jw=mD+4|0;l[jw>>2]=FS;var GS=Di*pw-Ci*qw+Zv,HS=Ci*pw+Di*qw+$v,nD=l[Rr],oD=ed[Lk+9|0]&255;(l[nD+20>>2]|0)>(oD|0)||P(N.i|0,103,N.h|0,N.j|0);var pD=(oD<<3)+l[nD+16>>2]|0,Aj=pD|0,Bi=Aj>>2,Bj=pD+4|0,Ai=Bj>>2,IS=l[Ai],qD=(t[0]=l[Bi],M[0]),rD=(t[0]=IS,M[0]);if(0>(Fi*qD-Ei*rD+aw-GS)*AS+(Ei*qD+Fi*rD+bw-HS)*BS){var JS=-q[hD>>2],KS=(M[0]=-q[gD>>2],t[0]),LS=(M[0]=JS,t[0])|0,kw=Po|0;l[kw>>2]=0|KS;lw=Po+4|0;l[lw>>2]=LS}}}for(var sD=0,So=NB;;){var Ur,fm=Qr,gm=So,To=Ha,Vr=Ha,Uo=Ha,Wr=Ha,Vo=Ha,Wo=Ha,mn=BB>>2,nn=AB>>2,Dd=fm>>2,De=Ha,on=1-gm,MS=q[Dd+4]*on+q[Dd+6]*gm,NS=q[Dd+5]*on+q[Dd+7]*gm,tD=on*q[Dd+8]+q[Dd+9]*gm,gg=mm(tD),hg=nm(tD),uD=q[Dd+2],vD=q[Dd+3],rw=MS-(hg*uD-gg*vD),sw=NS-(gg*uD+hg*vD),OS=q[Dd+13]*on+q[Dd+15]*gm,PS=q[Dd+14]*on+q[Dd+16]*gm,wD=on*q[Dd+17]+q[Dd+18]*gm,ig=mm(wD),jg=nm(wD),xD=q[Dd+11],yD=q[Dd+12],tw=OS-(jg*xD-ig*yD),uw=PS-(ig*xD+jg*yD),vw=l[Dd+20];if(0==(vw|0)){var zD=fm+92|0,Xr=q[zD>>2],AD=fm+96|0,ww=q[AD>>2],BD=hg*Xr+gg*ww,CD=Xr*-gg+hg*ww,DD=-ww,ED=jg*-Xr+ig*DD,FD=Xr*ig+jg*DD,GD=fm|0,HD=l[GD>>2],Wo=l[HD+16>>2]>>2,ID=l[HD+20>>2],QS=1<(ID|0);b:do{if(QS){for(var JD=0,xw=q[Wo]*BD+q[Wo+1]*CD,Xo=1;;){var KD=q[(Xo<<3>>2)+Wo]*BD+q[((Xo<<3)+4>>2)+Wo]*CD,LD=KD>xw,MD=LD?Xo:JD,RS=LD?KD:xw,ND=Xo+1|0;if((ND|0)==(ID|0)){var OD=MD;break b}JD=MD;xw=RS;Xo=ND}}else{OD=0}}while(0);l[nn]=OD;var PD=fm+4|0,QD=l[PD>>2],Vo=l[QD+16>>2]>>2,RD=l[QD+20>>2],SS=1<(RD|0);b:do{if(SS){for(var SD=0,yw=q[Vo]*ED+q[Vo+1]*FD,Yo=1;;){var TD=q[(Yo<<3>>2)+Vo]*ED+q[((Yo<<3)+4>>2)+Vo]*FD,UD=TD>yw,VD=UD?Yo:SD,TS=UD?TD:yw,WD=Yo+1|0;if((WD|0)==(RD|0)){var zw=VD;break b}SD=VD;yw=TS;Yo=WD}}else{zw=0}}while(0);l[mn]=zw;var XD=l[GD>>2],Aw=l[nn];if(-1<(Aw|0)){if((l[XD+20>>2]|0)>(Aw|0)){var Yr=zw,De=12}else{De=11}}else{De=11}11==De&&(P(N.i|0,103,N.h|0,N.j|0),Yr=l[mn]);var YD=(Aw<<3)+l[XD+16>>2]|0,US=l[YD+4>>2],ZD=(t[0]=l[YD>>2],M[0]),$D=(t[0]=US,M[0]),aE=l[PD>>2],De=-1<(Yr|0)?(l[aE+20>>2]|0)>(Yr|0)?15:14:14;14==De&&P(N.i|0,103,N.h|0,N.j|0);var bE=(Yr<<3)+l[aE+16>>2]|0,VS=l[bE+4>>2],cE=(t[0]=l[bE>>2],M[0]),dE=(t[0]=VS,M[0]),Zr=(jg*cE-ig*dE+tw-(hg*ZD-gg*$D+rw))*q[zD>>2]+(ig*cE+jg*dE+uw-(gg*ZD+hg*$D+sw))*q[AD>>2]}else{if(1==(vw|0)){var eE=q[Dd+23],fE=q[Dd+24],Bw=hg*eE-gg*fE,gE=gg*eE+hg*fE,hE=q[Dd+21],iE=q[Dd+22],WS=hg*hE-gg*iE+rw,XS=gg*hE+hg*iE+sw,jE=-gE,kE=jg*-Bw+ig*jE,lE=Bw*ig+jg*jE;l[nn]=-1;var Wr=(fm+4|0)>>2,mE=l[Wr],Uo=l[mE+16>>2]>>2,nE=l[mE+20>>2],YS=1<(nE|0);do{if(YS){for(var oE=0,Cw=q[Uo]*kE+q[Uo+1]*lE,Zo=1;;){var pE=q[(Zo<<3>>2)+Uo]*kE+q[((Zo<<3)+4>>2)+Uo]*lE,qE=pE>Cw,$o=qE?Zo:oE,ZS=qE?pE:Cw,rE=Zo+1|0;if((rE|0)==(nE|0)){break}oE=$o;Cw=ZS;Zo=rE}l[mn]=$o;var sE=l[Wr];if(-1<($o|0)){$r=$o,as=sE,De=21}else{var tE=$o,uE=sE,De=22}}else{var $r=l[mn]=0,as=l[Wr],De=21}}while(0);if(21==De){if((l[as+20>>2]|0)>($r|0)){var vE=$r,wE=as,De=23}else{tE=$r,uE=as,De=22}}22==De&&(P(N.i|0,103,N.h|0,N.j|0),vE=tE,wE=uE);var xE=(vE<<3)+l[wE+16>>2]|0,Dw=xE|0,Ew=xE+4|0,$S=l[Ew>>2],yE=(t[0]=l[Dw>>2],M[0]),zE=(t[0]=$S,M[0]),Zr=(jg*yE-ig*zE+tw-WS)*Bw+(ig*yE+jg*zE+uw-XS)*gE}else{if(2==(vw|0)){var AE=q[Dd+23],BE=q[Dd+24],Fw=jg*AE-ig*BE,CE=ig*AE+jg*BE,DE=q[Dd+21],EE=q[Dd+22],aT=jg*DE-ig*EE+tw,bT=ig*DE+jg*EE+uw,FE=-CE,GE=hg*-Fw+gg*FE,HE=Fw*gg+hg*FE;l[mn]=-1;var Vr=(fm|0)>>2,IE=l[Vr],To=l[IE+16>>2]>>2,JE=l[IE+20>>2],cT=1<(JE|0);do{if(cT){for(var KE=0,Gw=q[To]*GE+q[To+1]*HE,ap=1;;){var LE=q[(ap<<3>>2)+To]*GE+q[((ap<<3)+4>>2)+To]*HE,ME=LE>Gw,bp=ME?ap:KE,dT=ME?LE:Gw,NE=ap+1|0;if((NE|0)==(JE|0)){break}KE=bp;Gw=dT;ap=NE}l[nn]=bp;var OE=l[Vr];if(-1<(bp|0)){bs=bp,cs=OE,De=29}else{var PE=bp,QE=OE,De=30}}else{var bs=l[nn]=0,cs=l[Vr],De=29}}while(0);if(29==De){if((l[cs+20>>2]|0)>(bs|0)){var RE=bs,SE=cs,De=31}else{PE=bs,QE=cs,De=30}}30==De&&(P(N.i|0,103,N.h|0,N.j|0),RE=PE,SE=QE);var TE=(RE<<3)+l[SE+16>>2]|0,Dw=TE|0,Ew=TE+4|0,eT=l[Ew>>2],UE=(t[0]=l[Dw>>2],M[0]),VE=(t[0]=eT,M[0]),Zr=(hg*UE-gg*VE+rw-aT)*Fw+(gg*UE+hg*VE+sw-bT)*CE}else{P(N.Ca|0,183,N.Me|0,N.l|0),l[nn]=-1,l[mn]=-1,Zr=0}}}Ur=Zr;if(Ur>Qv){l[Kk]=4;q[Jk]=NB;dm=25;break a}if(Ur>PB){var Hw=So}else{var WE=o[AB>>2],XE=o[BB>>2],Iw=lm(Qr,WE,XE,Kf);if(Iw<PB){l[Kk]=1;q[Jk]=Kf;dm=25;break a}if(Iw<=Qv){l[Kk]=3;q[Jk]=Kf;dm=25;break a}for(var ds=So,cp=Kf,es=0,fs=Iw,Jw=Ur;;){var gs=0==(es&1|0)?.5*(cp+ds):cp+(jn-fs)*(ds-cp)/(Jw-fs),hs=lm(Qr,WE,XE,gs),Kw=hs-jn;if(.0012499999720603228>(0<Kw?Kw:-Kw)){var Lw=es,YE=gs;break}var is=hs>jn,fT=is?Jw:hs,gT=is?hs:fs,hT=is?gs:cp,iT=is?ds:gs,ZE=es+1|0;l[Wp>>2]=l[Wp>>2]+1|0;if(50==(ZE|0)){Lw=50;YE=So;break}ds=iT;cp=hT;es=ZE;fs=gT;Jw=fT}var $E=l[Xp>>2];l[Xp>>2]=($E|0)>(Lw|0)?$E:Lw;var aF=sD+1|0;if(8!=(aF|0)){sD=aF;So=YE;continue}Hw=Kf}var bF=Io+1|0;l[Yp>>2]=l[Yp>>2]+1|0;if(20==(bF|0)){l[Kk]=1;q[Jk]=Hw;Jo=20;dm=29;break a}Kf=Hw;Io=bF;QB=q[Pr];RB=q[Or];SB=q[Nr];TB=q[Mr];continue a}}25==dm&&(l[Yp>>2]=l[Yp>>2]+1|0,Jo=Io+1|0);var cF=l[Zp>>2];l[Zp>>2]=(cF|0)>(Jo|0)?cF:Jo;a=Ye;if(3==(l[Nt>>2]|0)){var dF=Kr+(1-Kr)*q[Pn>>2],Pw=1>dF?dF:1}else{Pw=1}q[Cg+33]=Pw;l[wl]|=32;var Qw=Pw}else{Qw=q[Cg+33]}Qw<Vd?(Ck=vj,Dk=Qw):(Ck=Me,Dk=Vd)}}}while(0);Me=Ck;Vd=Dk;Tn=vj+12|0}}c[El]=Ll;var ep=l[uk];so(ep,l[uk+5]);so(ep,l[uk+6]);so(ep,l[uk+4]);so(ep,l[sk]);so(ep,vk);a=dg;q[m+25756]=0;p=12}else{var eF=En;p=13}}12==p&&(eF=q[h]);0<eF&&(q[A>>2]=q[k+1]);var Rw=l[j],jT=0==(Rw&4|0);do{if(jT){var Sw=Rw}else{var fF=l[m+25738];if(0==(fF|0)){Sw=Rw}else{var Tw=fF;for(g=Tw>>2;;){q[g+19]=0;q[g+20]=0;q[g+21]=0;var gF=l[g+24];if(0==(gF|0)){break}Tw=gF;g=Tw>>2}Sw=l[j]}}}while(0);l[j]=Sw&-3;q[m+25749]=0;a=n}function $p(b,d,e,f){var g,h=e>>2,j=a;a+=112;var k,m=j+8,n=j+16,p=j+24,u=j+32,r=j+40,w=j+48,x=l[d+12>>2],d=x>>2,y=l[d+1];a:do{if(0==(y|0)){g=q[h+3];var A=q[d+3];k=q[h+2];var C=q[d+4],z=k*A+g*C+q[h+1];q[j>>2]=g*A-k*C+q[h];q[j+4>>2]=z;A=q[d+2];q[m>>2]=g-0;q[m+4>>2]=k;g=l[b+102984>>2];K[l[l[g>>2]+20>>2]](g,j,A,m,f)}else{if(1==(y|0)){g=q[h+3];z=q[d+3];k=q[h+2];var D=q[d+4],A=q[h],C=q[h+1],E=k*z+g*D+C;q[n>>2]=g*z-k*D+A;q[n+4>>2]=E;D=x+20|0;z=q[D>>2];D=q[D+4>>2];C=k*z+g*D+C;q[p>>2]=g*z-k*D+A;q[p+4>>2]=C;g=l[b+102984>>2];K[l[l[g>>2]+24>>2]](g,n,p,f)}else{if(3==(y|0)){k=l[d+4];g=l[d+3]>>2;var A=e+12|0,G=q[A>>2],E=q[g],C=e+8|0,H=q[C>>2],F=q[g+1],z=e|0,I=q[z>>2],D=e+4|0,J=q[D>>2],L=H*E+G*F+J;q[u>>2]=G*E-H*F+I;q[u+4>>2]=L;if(1<(k|0)){for(var E=r|0,F=r+4|0,L=b+102984|0,O=r,R=u,T=1,S=J;;){var J=q[(T<<3>>2)+g],U=q[((T<<3)+4>>2)+g],S=H*J+G*U+S;q[E>>2]=G*J-H*U+I;q[F>>2]=S;J=l[L>>2];K[l[l[J>>2]+24>>2]](J,u,r,f);J=l[L>>2];K[l[l[J>>2]+16>>2]](J,u,.05000000074505806,f);J=l[O+4>>2];l[R>>2]=l[O>>2];l[R+4>>2]=J;T=T+1|0;if((T|0)==(k|0)){break a}G=q[A>>2];H=q[C>>2];I=q[z>>2];S=q[D>>2]}}}else{if(2==(y|0)){g=l[d+37];if(9>(g|0)){if(k=w|0,0<(g|0)){Q=k,k=12}else{var W=k;k=14}}else{P(N.t|0,1077,N.Ce|0,N.zh|0);var Q=w|0;k=12}b:do{if(12==k){A=x+20|0;C=q[h+3];z=q[h+2];D=q[h];E=q[h+1];for(F=0;;){if(R=q[A+(F<<3)>>2],T=q[A+(F<<3)+4>>2],O=z*R+C*T+E,L=(F<<3)+w|0,R=(M[0]=C*R-z*T+D,t[0]),O=(M[0]=O,t[0])|0,l[L>>2]=0|R,l[L+4>>2]=O,F=F+1|0,(F|0)==(g|0)){W=Q;break b}}}}while(0);k=l[b+102984>>2];K[l[l[k>>2]+12>>2]](k,W,g,f)}}}}}while(0);a=j}function aq(b){var d,e,f,g,h,j=a;a+=120;var k,m=j+12,n=j+24,p=j+36,u=j+48,r=j+60;h=r>>2;var w=j+72,x=j+104;g=(b+102984|0)>>2;var y=l[g],A=0==(y|0);a:do{if(!A){var C=l[y+4>>2],z=0==(C&1|0);b:do{if(!z){var D=l[b+102952>>2];if(0!=(D|0)){for(var E=j|0,G=j+4|0,H=j+8|0,F=p|0,I=p+4|0,J=p+8|0,L=u|0,O=u+4|0,R=u+8|0,T=m|0,S=m+4|0,U=m+8|0,W=n|0,Q=n+4|0,$=n+8|0,ea=D;;){var sa=ea+12|0,Ba=l[ea+100>>2],oa=0==(Ba|0);c:do{if(!oa){for(var ga=ea+4|0,qa=ea|0,la=Ba;;){var Ca=i[ga>>1];if(0==(Ca&32)<<16>>16){q[E>>2]=.5,q[G>>2]=.5,q[H>>2]=.30000001192092896,$p(b,la,sa,j)}else{var ia=l[qa>>2];0==(ia|0)?(q[T>>2]=.5,q[S>>2]=.8999999761581421,q[U>>2]=.5,$p(b,la,sa,m)):1==(ia|0)?(q[W>>2]=.5,q[Q>>2]=.5,q[$>>2]=.8999999761581421,$p(b,la,sa,n)):0==(Ca&2)<<16>>16?(q[F>>2]=.6000000238418579,q[I>>2]=.6000000238418579,q[J>>2]=.6000000238418579,$p(b,la,sa,p)):(q[L>>2]=.8999999761581421,q[O>>2]=.699999988079071,q[R>>2]=.699999988079071,$p(b,la,sa,u))}var ya=l[la+4>>2];if(0==(ya|0)){break c}la=ya}}}while(0);var ta=l[ea+96>>2];if(0==(ta|0)){break b}ea=ta}}}}while(0);var Ia=0==(C&2|0);b:do{if(!Ia){var na=l[b+102956>>2];if(0!=(na|0)){for(var Z=na;;){var ba=b,ca=Z,ma=Ha,ka=Ha,aa=Ha,ra=a;a+=60;var ha=ra+8,za=ra+16,X=ra+24,ua=ra+32,aa=ua>>2,da=ra+44,fa=ra+52,Aa=l[ca+52>>2]+12|0,Qa=l[ca+48>>2]+12|0,pa=l[Qa+4>>2];l[ra>>2]=l[Qa>>2];l[ra+4>>2]=pa;var cb=l[Aa+4>>2];l[ha>>2]=l[Aa>>2];l[ha+4>>2]=cb;K[l[l[ca>>2]>>2]](za,ca);K[l[l[ca>>2]+4>>2]](X,ca);q[aa]=.5;q[aa+1]=.800000011920929;q[aa+2]=.800000011920929;var Ra=l[ca+4>>2];if(3==(Ra|0)){var Ta=l[ba+102984>>2];K[l[l[Ta>>2]+24>>2]](Ta,za,X,ua)}else{if(4==(Ra|0)){var $a=ca+68|0,va=l[$a+4>>2];l[da>>2]=l[$a>>2];l[da+4>>2]=va;var Wa=ca+76|0,fb=l[Wa+4>>2];l[fa>>2]=l[Wa>>2];l[fa+4>>2]=fb;var ka=(ba+102984|0)>>2,gb=l[ka];K[l[l[gb>>2]+24>>2]](gb,da,za,ua);var Xa=l[ka];K[l[l[Xa>>2]+24>>2]](Xa,fa,X,ua);var Ua=l[ka];K[l[l[Ua>>2]+24>>2]](Ua,da,fa,ua)}else{if(5!=(Ra|0)){var ma=(ba+102984|0)>>2,Va=l[ma];K[l[l[Va>>2]+24>>2]](Va,ra,za,ua);var pb=l[ma];K[l[l[pb>>2]+24>>2]](pb,za,X,ua);var nb=l[ma];K[l[l[nb>>2]+24>>2]](nb,ha,X,ua)}}}a=ra;var La=l[Z+12>>2];if(0==(La|0)){break b}Z=La}}}}while(0);var qb=0==(C&8|0);b:do{if(!qb){for(var bb=b+102932|0;;){var Fa=l[bb>>2];if(0==(Fa|0)){break b}bb=Fa+12|0}}}while(0);var Ma=0==(C&4|0);b:do{if(!Ma){q[h]=.8999999761581421;q[h+1]=.30000001192092896;q[h+2]=.8999999761581421;var wa=l[b+102952>>2];if(0!=(wa|0)){for(var hb=b+102884|0,Ya=b+102876|0,Za=w|0,Da=w|0,Oa=w+4|0,ib=w+8|0,ab=w+12|0,Ga=w+16|0,jb=w+20|0,Ea=w+24|0,Pa=w+28|0,Ja=wa;;){var db=0==(i[Ja+4>>1]&32)<<16>>16;c:do{if(!db){var xa=l[Ja+100>>2];if(0!=(xa|0)){for(var Sa=xa;;){var Ka=Sa+28|0,tb=0<(l[Ka>>2]|0);d:do{if(tb){for(var kb=Sa+24|0,ub=0;;){var rb=l[(l[kb>>2]+24>>2)+(7*ub|0)];k=-1<(rb|0)?(l[hb>>2]|0)>(rb|0)?34:33:33;33==k&&P(N.q|0,159,N.H|0,N.o|0);f=l[Ya>>2]>>2;var Bb=q[f+(9*rb|0)],lb=q[f+(9*rb|0)+1],yb=q[f+(9*rb|0)+2],xb=q[f+(9*rb|0)+3];q[Da>>2]=Bb;q[Oa>>2]=lb;q[ib>>2]=yb;q[ab>>2]=lb;q[Ga>>2]=yb;q[jb>>2]=xb;q[Ea>>2]=Bb;q[Pa>>2]=xb;var Ib=l[g];K[l[l[Ib>>2]+8>>2]](Ib,Za,4,r);var wb=ub+1|0;if((wb|0)>=(l[Ka>>2]|0)){break d}ub=wb}}}while(0);var vb=l[Sa+4>>2];if(0==(vb|0)){break c}Sa=vb}}}}while(0);var zb=l[Ja+96>>2];if(0==(zb|0)){break b}Ja=zb}}}}while(0);if(0!=(C&16|0)){var Eb=l[b+102952>>2];if(0!=(Eb|0)){e=x>>2;for(var Cb=x,eb=Eb;;){d=(eb+12|0)>>2;l[e]=l[d];l[e+1]=l[d+1];l[e+2]=l[d+2];l[e+3]=l[d+3];var sb=eb+44|0,ob=l[sb+4>>2];l[Cb>>2]=l[sb>>2];l[Cb+4>>2]=ob;var Db=l[g];K[l[l[Db>>2]+28>>2]](Db,x);var Jb=l[eb+96>>2];if(0==(Jb|0)){break a}eb=Jb}}}}}while(0);a=j}function bq(b){var d,e=b>>2,f=a;if(0==(l[e+25717]&2|0)){var g=q[e+25742];d=q[e+25743];V(N.Fh|0,(s=a,a+=16,Ee[0]=g,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=d,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));V(N.Te|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));g=l[e+25740];V(N.Ze|0,(s=a,a+=4,l[s>>2]=g,s));g=l[e+25741];V(N.hf|0,(s=a,a+=4,l[s>>2]=g,s));e=l[e+25738];g=0==(e|0);a:do{if(!g){d=0;for(var h=e;;){l[h+8>>2]=d;lp(h);h=l[h+96>>2];if(0==(h|0)){break a}d=d+1|0}}}while(0);b=(b+102956|0)>>2;e=l[b];g=0==(e|0);a:do{if(!g){d=0;for(h=e;;){l[h+56>>2]=d;h=l[h+12>>2];if(0==(h|0)){break}d=d+1|0}d=l[b];if(0!=(d|0)){h=d;for(d=h>>2;;){6!=(l[d+1]|0)&&(V(N.Qa|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),K[l[l[d]+16>>2]](h),V(N.Ra|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)));d=l[d+3];if(0==(d|0)){break}h=d;d=h>>2}d=l[b];if(0!=(d|0)){h=d;for(d=h>>2;;){6==(l[d+1]|0)&&(V(N.Qa|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)),K[l[l[d]+16>>2]](h),V(N.Ra|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s)));d=l[d+3];if(0==(d|0)){break a}h=d;d=h>>2}}}}}while(0);V(N.yf|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.Ef|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.If|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.Nf|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s))}a=f}function qp(b,d){var e,f,g,h,j,k=b>>2,m=a;a+=192;j=m>>2;var n=m+92,p=m+104,u=m+128;h=u>>2;var r=b+64|0,w=r>>2;g=u>>2;for(var x=w+16;w<x;w++,g++){l[g]=l[w]}g=(b+4|0)>>2;w=o[g];l[g]=w|4;var x=w>>>1,y=o[k+12],A=o[k+13],w=0!=((c[A+38|0]|c[y+38|0])&1)<<24>>24,C=o[y+8>>2],z=o[A+8>>2],D=C+12|0,E=z+12|0;do{if(w){e=l[y+12>>2];f=l[A+12>>2];var G=l[k+14],H=l[k+15];l[j+4]=0;l[j+5]=0;q[j+6]=0;l[j+11]=0;l[j+12]=0;q[j+13]=0;Hi(m|0,e,G);Hi(m+28|0,f,H);f=(m+56|0)>>2;e=D>>2;l[f]=l[e];l[f+1]=l[e+1];l[f+2]=l[e+2];l[f+3]=l[e+3];f=(m+72|0)>>2;e=E>>2;l[f]=l[e];l[f+1]=l[e+1];l[f+2]=l[e+2];l[f+3]=l[e+3];c[m+88|0]=1;i[n+4>>1]=0;Ii(p,n,m);e=11920928955078125e-22>q[p+16>>2]&1;l[k+31]=0;f=e;e=x&1}else{K[l[l[k]>>2]](b,r,D,E);G=b+124|0;f=0<(l[G>>2]|0);e=f&1;a:do{if(f){for(var H=l[h+15],F=0;;){var I=b+20*F+72|0;q[I>>2]=0;var J=b+20*F+76|0;q[J>>2]=0;for(var L=l[k+(5*F|0)+20],O=0;(O|0)<(H|0);){if((l[h+(5*O|0)+4]|0)!=(L|0)){O=O+1|0}else{q[I>>2]=q[h+(5*O|0)+2];q[J>>2]=q[h+(5*O|0)+3];break}}F=F+1|0;if((F|0)>=(l[G>>2]|0)){break a}}}}while(0);G=x&1;if((f&1|0)!=(G|0)&&(f=C+4|0,H=i[f>>1],0==(H&2)<<16>>16&&(i[f>>1]=H|2,q[C+144>>2]=0),f=z+4|0,H=i[f>>1],0==(H&2)<<16>>16)){i[f>>1]=H|2,q[z+144>>2]=0}f=e;e=G}}while(0);h=0!=f<<24>>24;j=l[g];l[g]=h?j|2:j&-3;j=h^1;k=0==(d|0);if(!(0!=(e|0)|j|k)){K[l[l[d>>2]+8>>2]](d,b)}if(!(h|0==(e|0)|k)){K[l[l[d>>2]+12>>2]](d,b)}if(!(w|j|k)){K[l[l[d>>2]+16>>2]](d,b,u)}a=m}function Qp(b,d){var e,f,g,h,j,k,m,n,p,u=d>>2;n=b>>2;p=d>>2;l[n]=l[p];l[n+1]=l[p+1];l[n+2]=l[p+2];l[n+3]=l[p+3];l[n+4]=l[p+4];l[n+5]=l[p+5];var r=l[u+10];m=b+32|0;l[m>>2]=r;n=l[u+7];p=(b+48|0)>>2;l[p]=n;var w=88*n|0;n=(r+102796|0)>>2;var x=l[n];if(32>(x|0)){var y=x}else{P(N.n|0,38,N.w|0,N.D|0),y=l[n]}x=r+12*y+102412|0;l[(r+12*y+102416|0)>>2]=w;k=(r+102400|0)>>2;j=l[k];102400<(j+w|0)?(k=Ne(w),l[(x|0)>>2]=k,c[r+12*y+102420|0]=1):(l[(x|0)>>2]=r+j|0,c[r+12*y+102420|0]=0,l[k]=l[k]+w|0);y=r+102404|0;w=l[y>>2]+w|0;l[y>>2]=w;r=r+102408|0;y=l[r>>2];l[r>>2]=(y|0)>(w|0)?y:w;l[n]=l[n]+1|0;n=b+36|0;l[n>>2]=l[x>>2];r=l[m>>2];w=152*l[p]|0;m=(r+102796|0)>>2;x=l[m];32>(x|0)?y=x:(P(N.n|0,38,N.w|0,N.D|0),y=l[m]);x=r+12*y+102412|0;l[(r+12*y+102416|0)>>2]=w;k=(r+102400|0)>>2;j=l[k];102400<(j+w|0)?(k=Ne(w),l[(x|0)>>2]=k,c[r+12*y+102420|0]=1):(l[(x|0)>>2]=r+j|0,c[r+12*y+102420|0]=0,l[k]=l[k]+w|0);y=r+102404|0;w=l[y>>2]+w|0;l[y>>2]=w;r=r+102408|0;y=l[r>>2];l[r>>2]=(y|0)>(w|0)?y:w;l[m]=l[m]+1|0;m=b+40|0;l[m>>2]=l[x>>2];l[b+24>>2]=l[u+8];l[b+28>>2]=l[u+9];u=l[u+6];x=b+44|0;l[x>>2]=u;r=0<(l[p]|0);a:do{if(r){w=b+20|0;y=b+8|0;k=0;for(j=u;;){var A=l[j+(k<<2)>>2];j=A>>2;var C=l[j+12];h=l[j+13];var z=q[l[C+12>>2]+8>>2],D=q[l[h+12>>2]+8>>2],E=l[C+8>>2],G=l[h+8>>2],C=l[j+31],H=0<(C|0);H||P(N.aa|0,71,N.qe|0,N.jf|0);var F=l[m>>2];h=F>>2;q[h+(38*k|0)+34]=q[j+34];q[h+(38*k|0)+35]=q[j+35];var I=E+8|0;l[(F+152*k+112|0)>>2]=l[I>>2];var J=G+8|0;l[(F+152*k+116|0)>>2]=l[J>>2];var L=E+120|0;q[h+(38*k|0)+30]=q[L>>2];var O=G+120|0;q[h+(38*k|0)+31]=q[O>>2];e=E+128|0;q[h+(38*k|0)+32]=q[e>>2];var R=G+128|0;q[h+(38*k|0)+33]=q[R>>2];l[(F+152*k+148|0)>>2]=k;l[(F+152*k+144|0)>>2]=C;g=(F+152*k+80|0)>>2;l[g]=0;l[g+1]=0;l[g+2]=0;l[g+3]=0;l[g+4]=0;l[g+5]=0;l[g+6]=0;l[g+7]=0;g=l[n>>2];f=g>>2;l[(g+88*k+32|0)>>2]=l[I>>2];l[(g+88*k+36|0)>>2]=l[J>>2];q[f+(22*k|0)+10]=q[L>>2];q[f+(22*k|0)+11]=q[O>>2];E=E+28|0;I=g+88*k+48|0;J=l[E+4>>2];l[(I|0)>>2]=l[E>>2];l[(I+4|0)>>2]=J;G=G+28|0;E=g+88*k+56|0;I=l[G+4>>2];l[(E|0)>>2]=l[G>>2];l[(E+4|0)>>2]=I;q[f+(22*k|0)+16]=q[e>>2];q[f+(22*k|0)+17]=q[R>>2];e=A+104|0;R=g+88*k+16|0;G=l[e+4>>2];l[(R|0)>>2]=l[e>>2];l[(R+4|0)>>2]=G;e=A+112|0;R=g+88*k+24|0;G=l[e+4>>2];l[(R|0)>>2]=l[e>>2];l[(R+4|0)>>2]=G;l[(g+88*k+84|0)>>2]=C;q[f+(22*k|0)+19]=z;q[f+(22*k|0)+20]=D;l[(g+88*k+72|0)>>2]=l[j+30];b:do{if(H){for(z=0;;){if(D=A+20*z+64|0,0==(c[w]&1)<<24>>24?(q[h+(38*k|0)+(9*z|0)+4]=0,q[h+(38*k|0)+(9*z|0)+5]=0):(q[h+(38*k|0)+(9*z|0)+4]=q[y>>2]*q[j+(5*z|0)+18],q[h+(38*k|0)+(9*z|0)+5]=q[y>>2]*q[j+(5*z|0)+19]),e=F+152*k+36*z|0,q[h+(38*k|0)+(9*z|0)+6]=0,q[h+(38*k|0)+(9*z|0)+7]=0,q[h+(38*k|0)+(9*z|0)+8]=0,f=(z<<3)+g+88*k|0,e>>=2,l[e]=0,l[e+1]=0,l[e+2]=0,l[e+3]=0,e=l[D+4>>2],l[(f|0)>>2]=l[D>>2],l[(f+4|0)>>2]=e,z=z+1|0,(z|0)==(C|0)){break b}}}}while(0);k=k+1|0;if((k|0)>=(l[p]|0)){break a}j=l[x>>2]}}}while(0)}function Rp(b){var d,e,f,g,h=a;a+=56;var j=h+16,k=h+32,m=b+48|0,n=0<(l[m>>2]|0);a:do{if(n){for(var p=b+40|0,u=b+36|0,r=b+44|0,w=b+24|0,x=b+28|0,y=h+8|0,A=h+12|0,C=j+8|0,z=j+12|0,D=h,E=j,G=k,H=0;;){var F=o[p>>2];g=F>>2;var I=l[u>>2],J=q[(I+76>>2)+(22*H|0)],L=q[(I+80>>2)+(22*H|0)],O=l[l[r>>2]+(l[g+(38*H|0)+37]<<2)>>2],R=O+64|0,T=l[g+(38*H|0)+28],S=l[g+(38*H|0)+29],U=q[g+(38*H|0)+30],W=q[g+(38*H|0)+31],Q=q[g+(38*H|0)+32],$=q[g+(38*H|0)+33],ea=I+88*H+48|0,sa=l[ea+4>>2],Ba=(t[0]=l[ea>>2],M[0]),oa=(t[0]=sa,M[0]),ga=I+88*H+56|0,qa=l[ga+4>>2],la=(t[0]=l[ga>>2],M[0]),Ca=(t[0]=qa,M[0]),ia=l[w>>2],ya=ia+12*T|0,ta=l[ya+4>>2],Ia=(t[0]=l[ya>>2],M[0]),na=(t[0]=ta,M[0]),Z=q[(ia+8>>2)+(3*T|0)],ba=l[x>>2],ca=ba+12*T|0,ma=l[ca+4>>2],ka=(t[0]=l[ca>>2],M[0]),aa=(t[0]=ma,M[0]),ra=q[(ba+8>>2)+(3*T|0)],ha=ia+12*S|0,za=l[ha+4>>2],X=(t[0]=l[ha>>2],M[0]),ua=(t[0]=za,M[0]),da=q[(ia+8>>2)+(3*S|0)],fa=ba+12*S|0,Aa=l[fa+4>>2],Qa=(t[0]=l[fa>>2],M[0]),pa=(t[0]=Aa,M[0]),cb=q[(ba+8>>2)+(3*S|0)];0<(l[O+124>>2]|0)||P(N.aa|0,168,N.pe|0,N.$f|0);var Ra=mm(Z);q[y>>2]=Ra;var Ta=nm(Z);q[A>>2]=Ta;var $a=mm(da);q[C>>2]=$a;var va=nm(da);q[z>>2]=va;var Wa=na-(Ra*Ba+Ta*oa),fb=(M[0]=Ia-(Ta*Ba-Ra*oa),t[0]),gb=(M[0]=Wa,t[0])|0;l[D>>2]=0|fb;l[D+4>>2]=gb;var Xa=ua-($a*la+va*Ca),Ua=(M[0]=X-(va*la-$a*Ca),t[0]),Va=(M[0]=Xa,t[0])|0;l[E>>2]=0|Ua;l[E+4>>2]=Va;Gi(k,R,h,J,j,L);var pb=F+152*H+72|0,nb=pb,La=l[G+4>>2];l[nb>>2]=l[G>>2];l[nb+4>>2]=La;f=(F+152*H+144|0)>>2;var qb=l[f],bb=0<(qb|0);do{if(bb){e=(F+152*H+76|0)>>2;d=(pb|0)>>2;for(var Fa=U+W,Ma=-cb,wa=-ra,hb=F+152*H+140|0,Ya=0;;){var Za=q[k+(Ya<<3)+8>>2],Da=Za-Ia,Oa=q[k+(Ya<<3)+12>>2],ib=Oa-na,ab=F+152*H+36*Ya|0,Ga=(M[0]=Da,t[0]),jb=(M[0]=ib,t[0])|0;l[ab>>2]=0|Ga;l[ab+4>>2]=jb;var Ea=Za-X,Pa=Oa-ua,Ja=F+152*H+36*Ya+8|0,db=(M[0]=Ea,t[0]),xa=(M[0]=Pa,t[0])|0;l[Ja>>2]=0|db;l[Ja+4>>2]=xa;var Sa=q[e],Ka=q[g+(38*H|0)+(9*Ya|0)+1],tb=q[d],kb=Da*Sa-Ka*tb,ub=q[g+(38*H|0)+(9*Ya|0)+3],rb=Ea*Sa-ub*tb,Bb=Fa+Q*kb*kb+$*rb*rb;q[g+(38*H|0)+(9*Ya|0)+6]=0<Bb?1/Bb:0;var lb=q[e],yb=-1*q[d],xb=Da*yb-Ka*lb,Ib=Ea*yb-ub*lb,wb=Fa+Q*xb*xb+$*Ib*Ib;q[g+(38*H|0)+(9*Ya|0)+7]=0<wb?1/wb:0;var vb=F+152*H+36*Ya+32|0;q[vb>>2]=0;var zb=q[d]*(Qa+ub*Ma-ka-Ka*wa)+q[e]*(pa+Ea*cb-aa-Da*ra);-1>zb&&(q[vb>>2]=zb*-q[hb>>2]);var Eb=Ya+1|0;if((Eb|0)==(qb|0)){break}Ya=Eb}if(2==(l[f]|0)){var Cb=q[e],eb=q[d],sb=q[g+(38*H|0)]*Cb-q[g+(38*H|0)+1]*eb,ob=q[g+(38*H|0)+2]*Cb-q[g+(38*H|0)+3]*eb,Db=q[g+(38*H|0)+9]*Cb-q[g+(38*H|0)+10]*eb,Jb=q[g+(38*H|0)+11]*Cb-q[g+(38*H|0)+12]*eb,Rb=Q*sb,Nb=$*ob,Ob=Fa+Rb*sb+Nb*ob,Lb=Fa+Q*Db*Db+$*Jb*Jb,Pb=Fa+Rb*Db+Nb*Jb,Mb=Ob*Lb-Pb*Pb;if(Ob*Ob<1e3*Mb){q[g+(38*H|0)+24]=Ob;q[g+(38*H|0)+25]=Pb;q[g+(38*H|0)+26]=Pb;q[g+(38*H|0)+27]=Lb;var Yb=0!=Mb?1/Mb:Mb,Zb=Pb*-Yb,ec=Yb*Ob;q[g+(38*H|0)+20]=Yb*Lb;q[g+(38*H|0)+21]=Zb;q[g+(38*H|0)+22]=Zb;q[g+(38*H|0)+23]=ec}else{l[f]=1}}}}while(0);var Ub=H+1|0;if((Ub|0)>=(l[m>>2]|0)){break a}H=Ub}}}while(0);a=h}function Sp(b){var d,e,f,g,h,j=b+48|0,k=0<(l[j>>2]|0);a:do{if(k){var m=b+40|0;g=(b+28|0)>>2;for(var n=0;;){var p=o[m>>2];f=p>>2;var u=p+152*n|0,r=o[f+(38*n|0)+28],w=o[f+(38*n|0)+29],x=q[f+(38*n|0)+30],y=q[f+(38*n|0)+32],A=q[f+(38*n|0)+31],C=q[f+(38*n|0)+33],z=p+152*n+144|0,D=o[z>>2],E=l[g],G=E+12*r|0,H=l[G+4>>2],F=(t[0]=l[G>>2],M[0]),I=(t[0]=H,M[0]),J=q[(E+8>>2)+(3*r|0)],L=E+12*w|0,O=l[L+4>>2],R=(t[0]=l[L>>2],M[0]),T=(t[0]=O,M[0]),S=q[(E+8>>2)+(3*w|0)],U=p+152*n+72|0,W=l[U+4>>2],Q=(t[0]=l[U>>2],M[0]),$=(t[0]=W,M[0]),ea=-1*Q,sa=q[f+(38*n|0)+34];if(2>(D-1|0)>>>0){var Ba=T,oa=R,ga=I,qa=F,la=J,Ca=S,ia=0;h=6}else{if(P(N.aa|0,311,N.nb|0,N.Kg|0),0<(D|0)){Ba=T,oa=R,ga=I,qa=F,la=J,Ca=S,ia=0,h=6}else{var ya=T,ta=R,Ia=I,na=F,Z=J,ba=S;h=7}}b:do{if(6==h){for(;;){var ca=q[f+(38*n|0)+(9*ia|0)+3],ma=q[f+(38*n|0)+(9*ia|0)+2],ka=q[f+(38*n|0)+(9*ia|0)+1],aa=q[f+(38*n|0)+(9*ia|0)],ra=sa*q[f+(38*n|0)+(9*ia|0)+4],ha=p+152*n+36*ia+20|0,za=q[ha>>2],X=za+q[f+(38*n|0)+(9*ia|0)+7]*-((oa+ca*-Ca-qa-ka*-la)*$+(Ba+ma*Ca-ga-aa*la)*ea),ua=-ra,da=X<ra?X:ra,fa=da<ua?ua:da,Aa=fa-za;q[ha>>2]=fa;var Qa=$*Aa,pa=ea*Aa,cb=qa-Qa*x,Ra=ga-pa*x,Ta=la-y*(aa*pa-ka*Qa),$a=oa+Qa*A,va=Ba+pa*A,Wa=Ca+C*(ma*pa-ca*Qa),fb=ia+1|0;if((fb|0)==(D|0)){ya=va;ta=$a;Ia=Ra;na=cb;Z=Ta;ba=Wa;break b}Ba=va;oa=$a;ga=Ra;qa=cb;la=Ta;Ca=Wa;ia=fb}}}while(0);var gb=1==(l[z>>2]|0);b:do{if(gb){var Xa=q[f+(38*n|0)+3],Ua=q[f+(38*n|0)+2],Va=q[f+(38*n|0)+1],pb=q[u>>2],nb=p+152*n+16|0,La=q[nb>>2],qb=La+((ta+Xa*-ba-na-Va*-Z)*Q+(ya+Ua*ba-Ia-pb*Z)*$-q[f+(38*n|0)+8])*-q[f+(38*n|0)+6],bb=0<qb?qb:0,Fa=bb-La;q[nb>>2]=bb;var Ma=Q*Fa,wa=$*Fa,hb=ba+C*(Ua*wa-Xa*Ma),Ya=Z-y*(pb*wa-Va*Ma),Za=na-Ma*x,Da=Ia-wa*x,Oa=ta+Ma*A,ib=ya+wa*A}else{e=(p+152*n+16|0)>>2;var ab=q[e];d=(p+152*n+52|0)>>2;var Ga=q[d];0>ab|0>Ga&&P(N.aa|0,406,N.nb|0,N.Yg|0);var jb=-ba,Ea=q[f+(38*n|0)+3],Pa=q[f+(38*n|0)+2],Ja=-Z,db=q[f+(38*n|0)+1],xa=q[u>>2],Sa=q[f+(38*n|0)+12],Ka=q[f+(38*n|0)+11],tb=q[f+(38*n|0)+10],kb=q[f+(38*n|0)+9],ub=q[f+(38*n|0)+26],rb=q[f+(38*n|0)+25],Bb=(ta+Ea*jb-na-db*Ja)*Q+(ya+Pa*ba-Ia-xa*Z)*$-q[f+(38*n|0)+8]-(q[f+(38*n|0)+24]*ab+ub*Ga),lb=(ta+Sa*jb-na-tb*Ja)*Q+(ya+Ka*ba-Ia-kb*Z)*$-q[f+(38*n|0)+17]-(rb*ab+q[f+(38*n|0)+27]*Ga),yb=q[f+(38*n|0)+20]*Bb+q[f+(38*n|0)+22]*lb,xb=q[f+(38*n|0)+21]*Bb+q[f+(38*n|0)+23]*lb,Ib=-yb,wb=-xb;if(0<yb|0<xb){var vb=Bb*-q[f+(38*n|0)+6],zb=0>vb;do{if(!zb&&0<=rb*vb+lb){var Eb=vb-ab,Cb=-Ga,eb=Q*Eb,sb=$*Eb,ob=Q*Cb,Db=$*Cb,Jb=eb+ob,Rb=sb+Db,Nb=na-Jb*x,Ob=Ia-Rb*x,Lb=Z-y*(xa*sb-db*eb+(kb*Db-tb*ob)),Pb=ta+Jb*A,Mb=ya+Rb*A,Yb=ba+C*(Pa*sb-Ea*eb+(Ka*Db-Sa*ob));q[e]=vb;q[d]=0;hb=Yb;Ya=Lb;Za=Nb;Da=Ob;Oa=Pb;ib=Mb;break b}}while(0);var Zb=lb*-q[f+(38*n|0)+15],ec=0>Zb;do{if(!ec&&0<=ub*Zb+Bb){var Ub=-ab,jc=Zb-Ga,Qb=Q*Ub,mb=$*Ub,cc=Q*jc,Fb=$*jc,gc=Qb+cc,wc=mb+Fb,pc=na-gc*x,qc=Ia-wc*x,$c=Z-y*(xa*mb-db*Qb+(kb*Fb-tb*cc)),Ec=ta+gc*A,sc=ya+wc*A,kd=ba+C*(Pa*mb-Ea*Qb+(Ka*Fb-Sa*cc));q[e]=0;q[d]=Zb;hb=kd;Ya=$c;Za=pc;Da=qc;Oa=Ec;ib=sc;break b}}while(0);if(0>Bb|0>lb){hb=ba,Ya=Z,Za=na,Da=Ia,Oa=ta,ib=ya}else{var wd=-ab,Lc=-Ga,$b=Q*wd,ac=$*wd,oc=Q*Lc,tc=$*Lc,Nc=$b+oc,ld=ac+tc,Wc=na-Nc*x,ad=Ia-ld*x,Xc=Z-y*(xa*ac-db*$b+(kb*tc-tb*oc)),Cc=ta+Nc*A,fd=ya+ld*A,md=ba+C*(Pa*ac-Ea*$b+(Ka*tc-Sa*oc));q[e]=0;q[d]=0;hb=md;Ya=Xc;Za=Wc;Da=ad;Oa=Cc;ib=fd}}else{var nd=Ib-ab,Oc=wb-Ga,gd=Q*nd,od=$*nd,pd=Q*Oc,Pd=$*Oc,Xd=gd+pd,qd=od+Pd,Qd=na-Xd*x,Pc=Ia-qd*x,Ic=Z-y*(xa*od-db*gd+(kb*Pd-tb*pd)),Jc=ta+Xd*A,fc=ya+qd*A,hd=ba+C*(Pa*od-Ea*gd+(Ka*Pd-Sa*pd));q[e]=Ib;q[d]=wb;hb=hd;Ya=Ic;Za=Qd;Da=Pc;Oa=Jc;ib=fc}}}while(0);var xd=l[g]+12*r|0,bd=(M[0]=Za,t[0]),rd=(M[0]=Da,t[0])|0;l[(xd|0)>>2]=0|bd;l[(xd+4|0)>>2]=rd;q[(l[g]+8>>2)+(3*r|0)]=Ya;var ye=l[g]+12*w|0,Yd=(M[0]=Oa,t[0]),Tc=(M[0]=ib,t[0])|0;l[(ye|0)>>2]=0|Yd;l[(ye+4|0)>>2]=Tc;q[(l[g]+8>>2)+(3*w|0)]=hb;var xc=n+1|0;if((xc|0)>=(l[j>>2]|0)){break a}n=xc}}}while(0)}function Tp(b,d,e,f,g){var h=f>>2,j=e>>2,d=d>>2;0<(l[d+21]|0)||P(N.aa|0,617,N.te|0,N.ih|0);var k=l[d+18];if(0==(k|0)){var e=q[j+3],k=q[d+6],m=q[j+2],n=q[d+7],g=e*k-m*n+q[j],j=m*k+e*n+q[j+1],k=q[h+3],m=q[d],n=q[h+2],f=q[d+1],e=k*m-n*f+q[h],m=n*m+k*f+q[h+1],h=e-g,k=m-j,n=(M[0]=h,t[0]),f=(M[0]=k,t[0])|0;l[b>>2]=0|n;l[b+4>>2]=f;n=Fh(h*h+k*k);1.1920928955078125e-7>n?(n=h,f=k):(f=1/n,n=h*f,q[b>>2]=n,f*=k,q[(b+4|0)>>2]=f);var p=b+8|0,g=(M[0]=.5*(g+e),t[0]),j=(M[0]=.5*(j+m),t[0])|0;l[p>>2]=0|g;l[p+4>>2]=j;q[b+16>>2]=h*n+k*f-q[d+19]-q[d+20]}else{if(1==(k|0)){var m=e+12|0,k=q[m>>2],n=q[d+4],f=e+8|0,p=q[f>>2],u=q[d+5],e=k*n-p*u,k=p*n+k*u,n=(M[0]=e,t[0]),p=(M[0]=k,t[0])|0;l[(b|0)>>2]=0|n;l[(b+4|0)>>2]=p;var m=q[m>>2],n=q[d+6],f=q[f>>2],p=q[d+7],u=q[h+3],r=q[(g<<3>>2)+d],w=q[h+2],x=q[((g<<3)+4>>2)+d],g=u*r-w*x+q[h],h=w*r+u*x+q[h+1];q[b+16>>2]=(g-(m*n-f*p+q[j]))*e+(h-(f*n+m*p+q[j+1]))*k-q[d+19]-q[d+20];b=b+8|0;d=(M[0]=g,t[0]);h=(M[0]=h,t[0])|0;l[(b|0)>>2]=0|d;l[(b+4|0)>>2]=h}else{2==(k|0)&&(m=f+12|0,k=q[m>>2],n=q[d+4],f=f+8|0,p=q[f>>2],u=q[d+5],e=k*n-p*u,k=p*n+k*u,n=(M[0]=e,t[0]),p=(M[0]=k,t[0])|0,l[(b|0)>>2]=0|n,l[(b+4|0)>>2]=p,m=q[m>>2],n=q[d+6],f=q[f>>2],p=q[d+7],u=q[j+3],r=q[(g<<3>>2)+d],w=q[j+2],x=q[((g<<3)+4>>2)+d],g=u*r-w*x+q[j],j=w*r+u*x+q[j+1],q[b+16>>2]=(g-(m*n-f*p+q[h]))*e+(j-(f*n+m*p+q[h+1]))*k-q[d+19]-q[d+20],d=b+8|0,h=(M[0]=g,t[0]),j=(M[0]=j,t[0])|0,l[(d|0)>>2]=0|h,l[(d+4|0)>>2]=j,d=(M[0]=-e,t[0]),h=(M[0]=-k,t[0])|0,l[b>>2]=0|d,l[b+4>>2]=h)}}}function Kp(b,d){var e,f,g,h,j,k,m,n,p,u,r=b>>2,w=b|0;l[w>>2]=Ep+8|0;var x=d+8|0,y=d+12|0;(l[x>>2]|0)==(l[y>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[r+1]=l[d>>2];l[r+2]=0;l[r+3]=0;var A=b+48|0;l[A>>2]=l[x>>2];var C=b+52|0;l[C>>2]=l[y>>2];l[r+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[r+16]=l[d+4>>2];u=(b+16|0)>>2;l[u]=0;l[u+1]=0;l[u+2]=0;l[u+3]=0;l[u+4]=0;l[u+5]=0;l[u+6]=0;l[u+7]=0;l[w>>2]=cq+8|0;var z=b+92|0,D=b+100|0,E=b+108|0,G=b+116|0,H=b+124|0,F=b+132|0,I=d+20|0,J=l[I>>2],L=b+68|0;l[L>>2]=J;var O=d+24|0,R=l[O>>2],T=b+72|0;l[T>>2]=R;var S=l[J+4>>2],U=b+76|0;l[U>>2]=S;var W=o[R+4>>2];p=(b+80|0)>>2;l[p]=W;if(2>(S-1|0)>>>0){var Q=W}else{P(N.Ob|0,53,N.hb|0,N.mf|0),Q=l[p]}2>(Q-1|0)>>>0||P(N.Ob|0,54,N.hb|0,N.bg|0);var $=o[L>>2],ea=o[$+48>>2];n=ea>>2;l[r+21]=ea;var sa=o[$+52>>2];m=sa>>2;l[A>>2]=sa;var Ba=q[m+5],oa=q[m+6],ga=q[n+5],qa=q[n+6],la=o[I>>2];if(1==(l[U>>2]|0)){var Ca=q[m+14],ia=q[n+14],ya=la+68|0,ta=ya|0,Ia=l[ta>>2],na=ya+4|0,Z=l[na>>2],ba=E|0;k=ba>>2;l[k]=Ia;var ca=E+4|0;j=ca>>2;l[j]=Z;var ma=la+76|0,ka=ma|0,aa=l[ka>>2],ra=ma+4|0,ha=l[ra>>2],za=z|0;h=za>>2;l[h]=aa;var X=z+4|0;g=X>>2;l[g]=ha;var ua=q[la+116>>2];q[r+35]=ua;q[H>>2]=0;q[r+32]=0;var da=Ca-ia-ua}else{var fa=q[n+4],Aa=q[n+3],Qa=q[m+4],pa=q[m+3],cb=la+68|0,ba=cb|0;k=ba>>2;var Ra=l[k],ca=cb+4|0;j=ca>>2;var Ta=l[j],$a=E|0;l[$a>>2]=Ra;var va=E+4|0;l[va>>2]=Ta;var Wa=la+76|0,za=Wa|0;h=za>>2;var fb=l[h],X=Wa+4|0;g=X>>2;var gb=l[g],Xa=z|0;l[Xa>>2]=fb;var Ua=z+4|0;l[Ua>>2]=gb;q[r+35]=q[la+100>>2];var Va=la+84|0,pb=Va|0,nb=l[pb>>2],La=Va+4|0,qb=l[La>>2],bb=H|0;l[bb>>2]=nb;var Fa=H+4|0;l[Fa>>2]=qb;var Ma=(t[0]=Ra,M[0]),wa=(t[0]=Ta,M[0]),hb=(t[0]=fb,M[0]),Ya=oa*hb,Za=(t[0]=gb,M[0]),Da=Ya-Ba*Za+(pa-Aa),Oa=Ba*hb+oa*Za+(Qa-fa),ib=qa*Da+ga*Oa-Ma,ab=Da*-ga+qa*Oa-wa,Ga=(t[0]=nb,M[0]),jb=ib*Ga,Ea=(t[0]=qb,M[0]),da=jb+ab*Ea}var Pa=l[T>>2],Ja=l[Pa+48>>2];f=Ja>>2;l[r+22]=Ja;var db=l[Pa+52>>2];e=db>>2;l[C>>2]=db;var xa=q[e+5],Sa=q[e+6],Ka=q[f+5],tb=q[f+6],kb=l[O>>2];if(1==(l[p]|0)){var ub=q[e+14],rb=q[f+14],Bb=kb+68|0,ta=Bb|0,lb=l[ta>>2],na=Bb+4|0,yb=l[na>>2],ba=G|0;k=ba>>2;l[k]=lb;ca=G+4|0;j=ca>>2;l[j]=yb;var xb=kb+76|0,ka=xb|0,Ib=l[ka>>2],ra=xb+4|0,wb=l[ra>>2],za=D|0;h=za>>2;l[h]=Ib;X=D+4|0;g=X>>2;l[g]=wb;var vb=q[kb+116>>2];q[r+36]=vb;q[F>>2]=0;q[r+34]=0;var zb=ub-rb-vb}else{var Eb=q[f+4],Cb=q[f+3],eb=q[e+4],sb=q[e+3],ob=kb+68|0,ba=ob|0;k=ba>>2;var Db=l[k],ca=ob+4|0;j=ca>>2;var Jb=l[j],$a=G|0;l[$a>>2]=Db;va=G+4|0;l[va>>2]=Jb;var Rb=kb+76|0,za=Rb|0;h=za>>2;var Nb=l[h],X=Rb+4|0;g=X>>2;var Ob=l[g],Xa=D|0;l[Xa>>2]=Nb;Ua=D+4|0;l[Ua>>2]=Ob;q[r+36]=q[kb+100>>2];var Lb=kb+84|0,pb=Lb|0,Pb=l[pb>>2],La=Lb+4|0,Mb=l[La>>2],bb=F|0;l[bb>>2]=Pb;Fa=F+4|0;l[Fa>>2]=Mb;var Yb=(t[0]=Db,M[0]),Zb=(t[0]=Jb,M[0]),ec=(t[0]=Nb,M[0]),Ub=Sa*ec,jc=(t[0]=Ob,M[0]),Qb=Ub-xa*jc+(sb-Cb),mb=xa*ec+Sa*jc+(eb-Eb),cc=tb*Qb+Ka*mb-Yb,Fb=Qb*-Ka+tb*mb-Zb,gc=(t[0]=Pb,M[0]),wc=cc*gc,pc=(t[0]=Mb,M[0]),zb=wc+Fb*pc}var qc=q[d+28>>2];q[r+38]=qc;q[r+37]=da+qc*zb;q[r+39]=0}function Gp(b,d){var e,f,g=b>>2,h=b|0;l[h>>2]=Ep+8|0;var j=d+8|0;f=d+12|0;(l[j>>2]|0)==(l[f>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[g+1]=l[d>>2];l[g+2]=0;l[g+3]=0;l[g+12]=l[j>>2];j=b+52|0;l[j>>2]=l[f>>2];l[g+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[g+16]=l[d+4>>2];f=(b+16|0)>>2;l[f]=0;l[f+1]=0;l[f+2]=0;l[f+3]=0;l[f+4]=0;l[f+5]=0;l[f+6]=0;l[f+7]=0;l[h>>2]=dq+8|0;h=b+68|0;e=b+76|0;var k=d+20|0;f=q[k>>2];(!isNaN(f)&&!isNaN(0))&-Infinity<f&Infinity>f?(f=q[d+24>>2],f=(!isNaN(f)&&!isNaN(0))&-Infinity<f&Infinity>f?7:6):f=6;6==f&&P(N.ca|0,34,N.ea|0,N.pf|0);f=d+28|0;var m=q[f>>2];0>m|(!isNaN(m)&&!isNaN(0))&-Infinity<m&Infinity>m^1&&P(N.ca|0,35,N.ea|0,N.dg|0);var m=d+32|0,n=q[m>>2];0>n|(!isNaN(n)&&!isNaN(0))&-Infinity<n&Infinity>n^1&&P(N.ca|0,36,N.ea|0,N.Og|0);var n=d+36|0,p=q[n>>2];0>p|(!isNaN(p)&&!isNaN(0))&-Infinity<p&Infinity>p^1&&P(N.ca|0,37,N.ea|0,N.$g|0);p=o[k>>2];k=o[k+4>>2];l[e>>2]=p;l[e+4>>2]=k;e=o[j>>2]>>2;var j=(t[0]=p,M[0])-q[e+3],k=(t[0]=k,M[0])-q[e+4],p=q[e+6],u=q[e+5];e=(M[0]=p*j+u*k,t[0]);j=(M[0]=j*-u+p*k,t[0])|0;l[h>>2]=0|e;l[h+4>>2]=j;q[g+26]=q[f>>2];q[g+24]=0;q[g+25]=0;q[g+21]=q[m>>2];q[g+22]=q[n>>2];q[g+23]=0;q[g+27]=0}function Hp(b,d){var e,f,g;e=d>>2;var h=b>>2;f=b|0;l[f>>2]=Ep+8|0;g=d+8|0;var j=d+12|0;(l[g>>2]|0)==(l[j>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[h+1]=l[e];l[h+2]=0;l[h+3]=0;l[h+12]=l[g>>2];l[h+13]=l[j>>2];l[h+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[h+16]=l[e+1];g=(b+16|0)>>2;l[g]=0;l[g+1]=0;l[g+2]=0;l[g+3]=0;l[g+4]=0;l[g+5]=0;l[g+6]=0;l[g+7]=0;l[f>>2]=eq+8|0;j=b+76|0;g=b+84|0;f=b+92|0;var k=d+20|0,m=b+68|0,n=l[k+4>>2];l[m>>2]=l[k>>2];l[m+4>>2]=n;k=d+28|0;m=l[k+4>>2];l[j>>2]=l[k>>2];l[j+4>>2]=m;k=d+36|0;j=l[k>>2];k=l[k+4>>2];l[g>>2]=j;l[g+4>>2]=k;j=(t[0]=j,M[0]);k=(t[0]=k,M[0]);m=Fh(j*j+k*k);1.1920928955078125e-7>m?g=k:(m=1/m,j*=m,q[g>>2]=j,g=k*m,q[(b+88|0)>>2]=g);g=(M[0]=-1*g,t[0]);j=(M[0]=j,t[0])|0;l[f>>2]=0|g;l[f+4>>2]=j;q[h+25]=q[e+11];q[h+63]=0;f=(b+104|0)>>2;l[f]=0;l[f+1]=0;l[f+2]=0;l[f+3]=0;q[h+30]=q[(d+52|0)>>2];q[h+31]=q[e+14];q[h+32]=q[e+16];q[h+33]=q[e+17];c[b+136|0]=c[d+48|0]&1;c[b+137|0]=c[d+60|0]&1;l[h+35]=0;e=(b+184|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0}function fq(b,d,e,f,g,h,j,k){var m=b>>2;l[m+2]=d;l[m+3]=e;var n=b+20|0,p=l[f+4>>2];l[n>>2]=l[f>>2];l[n+4>>2]=p;n=b+28|0;p=l[g+4>>2];l[n>>2]=l[g>>2];l[n+4>>2]=p;var n=h|0,p=q[n>>2]-q[d+12>>2],h=h+4|0,u=q[h>>2]-q[d+16>>2],r=q[d+24>>2],w=q[d+20>>2],d=b+36|0,x=(M[0]=r*p+w*u,t[0]),p=(M[0]=p*-w+r*u,t[0])|0;l[d>>2]=0|x;l[d+4>>2]=p;d=j|0;p=q[d>>2]-q[e+12>>2];j=j+4|0;u=q[j>>2]-q[e+16>>2];r=q[e+24>>2];e=q[e+20>>2];b=b+44|0;x=(M[0]=r*p+e*u,t[0]);e=(M[0]=p*-e+r*u,t[0])|0;l[b>>2]=0|x;l[b+4>>2]=e;b=q[n>>2]-q[f>>2];f=q[h>>2]-q[f+4>>2];f=Fh(b*b+f*f);q[m+13]=f;f=q[d>>2]-q[g>>2];g=q[j>>2]-q[g+4>>2];g=Fh(f*f+g*g);q[m+14]=g;q[m+15]=k;1.1920928955078125e-7<k||P(N.Qb|0,51,N.re|0,N.qf|0)}function Jp(b,d){var e,f=b>>2,g=b|0;l[g>>2]=Ep+8|0;e=d+8|0;var h=d+12|0;(l[e>>2]|0)==(l[h>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[f+1]=l[d>>2];l[f+2]=0;l[f+3]=0;l[f+12]=l[e>>2];l[f+13]=l[h>>2];l[f+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[f+16]=l[d+4>>2];e=(b+16|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0;l[g>>2]=gq+8|0;h=b+76|0;e=b+92|0;var g=b+100|0,j=d+20|0,k=b+68|0,m=l[j+4>>2];l[k>>2]=l[j>>2];l[k+4>>2]=m;j=d+28|0;k=l[j+4>>2];l[h>>2]=l[j>>2];l[h+4>>2]=k;h=d+36|0;j=l[h+4>>2];l[e>>2]=l[h>>2];l[e+4>>2]=j;e=d+44|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;g=d+52|0;q[f+21]=q[g>>2];e=d+56|0;q[f+22]=q[e>>2];h=d+60|0;j=q[h>>2];0!=j?h=j:(P(N.Qb|0,65,N.oe|0,N.fg|0),h=q[h>>2]);q[f+28]=h;q[f+27]=q[g>>2]+h*q[e>>2];q[f+29]=0}function Lp(b,d){var e,f;e=d>>2;var g=b>>2,h=b|0;l[h>>2]=Ep+8|0;f=d+8|0;var j=d+12|0;(l[f>>2]|0)==(l[j>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[g+1]=l[e];l[g+2]=0;l[g+3]=0;l[g+12]=l[f>>2];l[g+13]=l[j>>2];l[g+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[g+16]=l[e+1];f=(b+16|0)>>2;l[f]=0;l[f+1]=0;l[f+2]=0;l[f+3]=0;l[f+4]=0;l[f+5]=0;l[f+6]=0;l[f+7]=0;l[h>>2]=hq+8|0;j=b+84|0;f=b+92|0;var h=b+100|0,k=d+20|0,m=b+76|0,n=l[k+4>>2];l[m>>2]=l[k>>2];l[m+4>>2]=n;k=d+28|0;m=l[k+4>>2];l[j>>2]=l[k>>2];l[j+4>>2]=m;k=d+36|0;j=l[k>>2];k=l[k+4>>2];l[f>>2]=j;l[f+4>>2]=k;f=-1*(t[0]=k,M[0]);f=0|(M[0]=f,t[0]);l[h>>2]=f;l[h+4>>2]=j|0;q[g+51]=0;q[g+27]=0;q[g+52]=0;q[g+28]=0;q[g+53]=0;q[g+29]=0;q[g+30]=q[e+12];q[g+31]=q[e+13];c[b+128|0]=c[d+44|0]&1;q[g+17]=q[e+14];q[g+18]=q[e+15];q[g+54]=0;q[g+55]=0;e=(b+172|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0}function iq(b){return l[b+68>>2]}function jq(b){return l[b+64>>2]}function kq(b,d){l[b+68>>2]=d}function lq(b,d){l[b+76>>2]=d}function mq(b,d){l[b+64>>2]=d}function nq(b,d){l[b+60>>2]=d}function oq(b){return l[b+72>>2]}function pq(){var b,d=Wq(80);b=d>>2;Fg(d);l[b+15]=0;l[b+16]=0;l[b+17]=yp;l[b+18]=zp;l[b+19]=0;return d}function Xq(b){jp(b|0,b)}function Yq(b,d){l[b+72>>2]=d}function Zq(b){return l[b+60>>2]}function $q(b){return l[b+76>>2]}function ar(b){return q[b+20>>2]}function br(b,d){q[b+16>>2]=d}function cr(b){return l[b+12>>2]}function dr(b,d){q[b+20>>2]=d}function er(b){return l[b+8>>2]}function fr(b){return l[b+4>>2]}function js(b){return q[b+16>>2]}function ks(b){return l[b+40>>2]}function ls(b,d){q[b>>2]=d}function ms(b,d){var e=b+38|0;if((d&1|0)!=(c[e]&1|0)){var f=o[b+8>>2],g=f+4|0,h=i[g>>1];0==(h&2)<<16>>16&&(i[g>>1]=h|2,q[f+144>>2]=0);c[e]=d&1}}function ns(b,d){return l[b+24>>2]+28*d|0}function os(b,d){l[b+40>>2]=d}function ps(b){return 0!=(c[b+38|0]&1)<<24>>24}function qs(b){return l[l[b+12>>2]+4>>2]}function rs(b){return q[b>>2]}function ss(b){var d,e=l[b>>2];if(-1==(e|0)){d=0}else{d=l[b+4>>2]>>2;var e=2*(q[d+(9*e|0)+2]-q[d+(9*e|0)]+(q[d+(9*e|0)+3]-q[d+(9*e|0)+1])),b=l[b+12>>2],f=0<(b|0);a:do{if(f){for(var g=0,h=0;;){if(g=0>(l[d+(9*h|0)+8]|0)?g:g+2*(q[d+(9*h|0)+2]-q[d+(9*h|0)]+(q[d+(9*h|0)+3]-q[d+(9*h|0)+1])),h=h+1|0,(h|0)==(b|0)){var j=g;break a}}}else{j=0}}while(0);d=j/e}return d}function ts(b){var d=l[b>>2];return-1==(d|0)?0:l[(l[b+4>>2]+32>>2)+(9*d|0)]}function us(b){return l[b+28>>2]}function vs(b,d){c[b+102994|0]=d&1}function ws(b){var d,e=l[b+102872>>2];if(-1==(e|0)){d=0}else{d=l[b+102876>>2]>>2;var e=2*(q[d+(9*e|0)+2]-q[d+(9*e|0)]+(q[d+(9*e|0)+3]-q[d+(9*e|0)+1])),b=l[b+102884>>2],f=0<(b|0);a:do{if(f){for(var g=0,h=0;;){if(g=0>(l[d+(9*h|0)+8]|0)?g:g+2*(q[d+(9*h|0)+2]-q[d+(9*h|0)]+(q[d+(9*h|0)+3]-q[d+(9*h|0)+1])),h=h+1|0,(h|0)==(b|0)){var j=g;break a}}}else{j=0}}while(0);d=j/e}return d}function xs(b){var d=l[b+102872>>2];return-1==(d|0)?0:l[(l[b+102876>>2]+32>>2)+(9*d|0)]}function ys(b){return 0!=(c[b+102994|0]&1)<<24>>24}function zs(b,d){l[b+102944>>2]=d}function As(b,d){c[b+102993|0]=d&1}function Bs(b,d){var e=b+102968|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function Cs(b){return l[b+102960>>2]}function Ds(b){return 0!=(l[b+102868>>2]&4|0)}function Es(b){return 0!=(c[b+102993|0]&1)<<24>>24}function Fs(b){return l[b+102956>>2]}function Gs(b){return l[b+102952>>2]}function Hs(b,d){l[b+102980>>2]=d}function Is(b){return l[b+102964>>2]}function Js(b){var d,b=l[b+102952>>2],e=0==(b|0);a:do{if(!e){d=b;for(d>>=2;;){q[d+19]=0;q[d+20]=0;q[d+21]=0;d=l[d+24];if(0==(d|0)){break a}d>>=2}}}while(0)}function Ks(b){0!=(b|0)&&(Dh(l[b+32>>2]),Dh(l[b+44>>2]),Dh(l[b+4>>2]),Ls(b))}function Ms(b,d){for(var e=d>>2,f=b>>2,g=e+15;e<g;e++,f++){l[f]=l[e]}}function Ns(b,d){var e,f;f=(b+32|0)>>1;e=d>>1;i[f]=i[e];i[f+1]=i[e+1];i[f+2]=i[e+2];xo(b)}function Os(){var b=Wq(44);i[b+32>>1]=1;i[b+34>>1]=-1;i[b+36>>1]=0;l[b+40>>2]=0;l[b+24>>2]=0;l[b+28>>2]=0;l[b>>2]=0;l[b+4>>2]=0;l[b+8>>2]=0;l[b+12>>2]=0;return b}function Ps(b,d){var e=l[b+12>>2];K[l[l[e>>2]+28>>2]](e,d,q[b>>2])}function Qs(b,d){var e=l[b+12>>2];return K[l[l[e>>2]+16>>2]](e,l[b+8>>2]+12|0,d)}function Rs(b){0!=(b|0)&&Ls(b)}function Ss(b,d,e,f){var g=l[b+12>>2];return K[l[l[g>>2]+20>>2]](g,d,e,l[b+8>>2]+12|0,f)}function Ts(b,d){4==(-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4)&&P(N.q|0,159,N.H|0,N.o|0);return l[b+4>>2]+36*d|0}function Us(b,d){4==(-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4)&&P(N.q|0,153,N.S|0,N.o|0);return l[(l[b+4>>2]+16>>2)+(9*d|0)]}function Vs(b){0!=(b|0)&&(Dh(l[b+32>>2]),Dh(l[b+44>>2]),Dh(l[b+4>>2]),Ls(b))}function Ws(){var b=Wq(60);Fg(b);return b}function Xs(b){var d=b+12|0,e=l[d>>2],f=0<(e|0);a:do{if(f){for(var g=b+4|0,h=0,j=0,k=l[g>>2],m=e;;){if(2<=(l[(k+32>>2)+(9*j|0)]|0)){var n=k+36*j+24|0,p=l[n>>2];-1==(p|0)?(P(N.c|0,686,N.Ka|0,N.Ya|0),p=l[n>>2],n=l[g>>2],m=l[d>>2]):n=k;k=l[(n+32>>2)+(9*l[(k+28>>2)+(9*j|0)]|0)]-l[(n+32>>2)+(9*p|0)]|0;k=0<(k|0)?k:-k|0;h=(h|0)>(k|0)?h:k;k=n}j=j+1|0;if((j|0)>=(m|0)){var u=h;break a}}}else{u=0}}while(0);return u}function Ys(b,d,e){var f,g,h;h=-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4;4==h&&P(N.q|0,159,N.H|0,N.o|0);var j=b+4|0;h=l[j>>2];g=h>>2;-1<(e|0)?(l[b+12>>2]|0)>(e|0)?(f=h>>2,h=8):h=7:h=7;7==h&&(P(N.q|0,159,N.H|0,N.o|0),b=l[j>>2],f=b>>2);return(0<q[f+(9*e|0)]-q[g+(9*d|0)+2]|0<q[f+(9*e|0)+1]-q[g+(9*d|0)+3]|0<q[g+(9*d|0)]-q[f+(9*e|0)+2]|0<q[g+(9*d|0)+1]-q[f+(9*e|0)+3])^1}function Zs(b,d){var e,f;f=(b+40|0)>>2;var g=l[f],h=b+36|0;e=(b+32|0)>>2;if((g|0)==(l[h>>2]|0)){var j=l[e];l[h>>2]=g<<1;g=Ne(g<<3);l[e]=g;Ch(g,j,l[f]<<2);Dh(j);j=l[f]}else{j=g}l[((j<<2)+l[e]|0)>>2]=d;l[f]=l[f]+1|0}function $s(b,d,e,f){if(Pk(b|0,d,e,f)){var e=(b+40|0)>>2,f=l[e],g=b+36|0,b=(b+32|0)>>2;if((f|0)==(l[g>>2]|0)){var h=l[b];l[g>>2]=f<<1;f=Ne(f<<3);l[b]=f;Ch(f,h,l[e]<<2);Dh(h);f=l[e]}l[((f<<2)+l[b]|0)>>2]=d;l[e]=l[e]+1|0}}function at(b,d){for(var e=l[b+40>>2],f=b+32|0,g=0;(g|0)<(e|0);){var h=(g<<2)+l[f>>2]|0;if((l[h>>2]|0)!=(d|0)){g=g+1|0}else{l[h>>2]=-1;break}}e=b+28|0;l[e>>2]=l[e>>2]-1|0;Nk(b|0,d)}function bt(b,d,e){var f=a;a+=8;b=b+102872|0;l[f>>2]=b;l[f+4>>2]=d;var g=b|0,h,j,k,b=a;a+=1036;var m,n=b+4|0,d=(b|0)>>2;l[d]=n;k=(b+1028|0)>>2;j=(b+1032|0)>>2;l[j]=256;l[n>>2]=l[g>>2];l[k]=1;for(var g=g+4|0,p=e|0,u=e+4|0,r=e+8|0,e=e+12|0,w=f|0,x=f+4|0,y=1;0<(y|0);){var A=y-1|0;l[k]=A;m=l[d];y=l[m+(A<<2)>>2];if(-1==(y|0)){y=A}else{var C=l[g>>2];h=C>>2;if(0<q[p>>2]-q[h+(9*y|0)+2]|0<q[u>>2]-q[h+(9*y|0)+3]|0<q[h+(9*y|0)]-q[r>>2]|0<q[h+(9*y|0)+1]-q[e>>2]){y=A}else{if(h=C+36*y+24|0,-1==(l[h>>2]|0)){C=l[w>>2];m=-1<(y|0)?(l[C+12>>2]|0)>(y|0)?12:11:11;11==m&&P(N.q|0,153,N.S|0,N.o|0);m=l[x>>2];if(!K[l[l[m>>2]+8>>2]](m,l[l[(l[C+4>>2]+16>>2)+(9*y|0)]+16>>2])){break}y=l[k]}else{if((A|0)==(l[j]|0)){l[j]=A<<1;A=Ne(A<<3);l[d]=A;var z=m;Ch(A,z,l[k]<<2);(m|0)!=(n|0)&&Dh(z)}l[((l[k]<<2)+l[d]|0)>>2]=l[h>>2];m=l[k]+1|0;l[k]=m;y=C+36*y+28|0;(m|0)==(l[j]|0)&&(C=l[d],l[j]=m<<1,m=Ne(m<<3),l[d]=m,h=C,Ch(m,h,l[k]<<2),(C|0)!=(n|0)&&Dh(h));l[((l[k]<<2)+l[d]|0)>>2]=l[y>>2];y=l[k]+1|0;l[k]=y}}}}j=l[d];(j|0)!=(n|0)&&(Dh(j),l[d]=0);a=b;a=f}function ct(b){var d=b+102884|0,e=l[d>>2],f=0<(e|0);a:do{if(f){for(var g=b+102876|0,h=0,j=0,k=l[g>>2],m=e;;){if(2<=(l[(k+32>>2)+(9*j|0)]|0)){var n=k+36*j+24|0,p=l[n>>2];-1==(p|0)?(P(N.c|0,686,N.Ka|0,N.Ya|0),p=l[n>>2],n=l[g>>2],m=l[d>>2]):n=k;k=l[(n+32>>2)+(9*l[(k+28>>2)+(9*j|0)]|0)]-l[(n+32>>2)+(9*p|0)]|0;k=0<(k|0)?k:-k|0;h=(h|0)>(k|0)?h:k;k=n}j=j+1|0;if((j|0)>=(m|0)){var u=h;break a}}}else{u=0}}while(0);return u}function dt(b,d){var e,f=b+102868|0;e=l[f>>2];0==(e&2|0)?f=e:(P(N.t|0,109,N.Ae|0,N.pa|0),f=l[f>>2]);if(0==(f&2|0)){f=qn(b|0,152);0==(f|0)?f=0:to(f,d,b);l[f+92>>2]=0;e=(b+102952|0)>>2;l[f+96>>2]=l[e];var g=l[e];0!=(g|0)&&(l[(g+92|0)>>2]=f);l[e]=f;e=b+102960|0;l[e>>2]=l[e>>2]+1|0}else{f=0}return f}function et(b){var d=Wq(103028);wp(d,b);return d}function ft(b){return 0!=(c[b+102992|0]&1)<<24>>24}function gt(b,d){var e=b+102976|0,f=(d&1|0)==(c[e]&1|0);a:do{if(!f&&(c[e]=d&1,!d)){var g=l[b+102952>>2];if(0!=(g|0)){for(;;){var h=g+4|0,j=i[h>>1];0==(j&2)<<16>>16&&(i[h>>1]=j|2,q[g+144>>2]=0);g=l[g+96>>2];if(0==(g|0)){break a}}}}}while(0)}function ht(b){return 0!=(c[b+102976|0]&1)<<24>>24}function it(b){return l[b+102900>>2]}function jt(b){return 0!=(l[b+102868>>2]&2|0)}function kt(b){return l[b+102932>>2]}function lt(b,d){l[b+102984>>2]=d}function mt(b,d){var e=b+102868|0,f=l[e>>2];l[e>>2]=d?f|4:f&-5}function nt(b){return l[b+102936>>2]}function ot(b,d){c[b+102992|0]=d&1}function pt(b,d){l[b+102940>>2]=d}function qt(b){return l[b+4>>2]}function rt(b,d){q[b+8>>2]=d}function st(b){return q[b+8>>2]}function tt(b,d){var e=b+12|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function ut(b,d){var e=b+4|0;l[e>>2]|=d}function vt(b,d){var e=b+4|0;l[e>>2]&=d^-1}function wt(b,d){l[b+4>>2]=d}function xt(b){return l[b+4>>2]}function yt(b){return l[b+12>>2]}function zt(b){return l[b+48>>2]}function At(b){return l[b+52>>2]}function Bt(b){return l[b+64>>2]}function au(b){return l[b+4>>2]}function bu(b,d){l[b+64>>2]=d}function cu(b){return 0!=(c[b+61|0]&1)<<24>>24}function du(b){return 0==(i[l[b+48>>2]+4>>1]&32)<<16>>16?0:0!=(i[l[b+52>>2]+4>>1]&32)<<16>>16}function eu(b){var d=l[b>>2];return-1==(d|0)?0:l[(l[b+4>>2]+32>>2)+(9*d|0)]}function fu(b){var d,e=l[b>>2];if(-1==(e|0)){d=0}else{d=l[b+4>>2]>>2;var e=2*(q[d+(9*e|0)+2]-q[d+(9*e|0)]+(q[d+(9*e|0)+3]-q[d+(9*e|0)+1])),b=l[b+12>>2],f=0<(b|0);a:do{if(f){for(var g=0,h=0;;){if(g=0>(l[d+(9*h|0)+8]|0)?g:g+2*(q[d+(9*h|0)+2]-q[d+(9*h|0)]+(q[d+(9*h|0)+3]-q[d+(9*h|0)+1])),h=h+1|0,(h|0)==(b|0)){var j=g;break a}}}else{j=0}}while(0);d=j/e}return d}function gu(b){return l[b+4>>2]}function hu(b,d){q[b+8>>2]=d}function iu(b){return q[b+8>>2]}function ju(b){return l[b+12>>2]}function ku(b,d,e,f){var g=a;a+=28;var h=g+8,j=b+102872|0;l[g>>2]=j;l[g+4>>2]=d;q[h+16>>2]=1;var k=l[e+4>>2];l[h>>2]=l[e>>2];l[h+4>>2]=k;var m=h+8|0,n=l[f+4>>2];l[m>>2]=l[f>>2];l[m+4>>2]=n;var p=j|0,u,r,w,x,y,A,C=a;a+=1056;var z=C+1036;A=h>>2;var D=l[A+1],E=(t[0]=l[A],M[0]),G=(t[0]=D,M[0]);y=(h+8|0)>>2;var H=l[y+1],F=(t[0]=l[y],M[0]),I=(t[0]=H,M[0]),J=F-E,L=I-G,O=J*J+L*L;0<O||P(N.q|0,204,N.Ke|0,N.Sf|0);var R=Fh(O);if(1.1920928955078125e-7>R){var T=J,S=L}else{var U=1/R,T=J*U,S=L*U}var W=-1*S,Q=0<W?W:-W,$=0<T?T:-T,ea=q[h+16>>2],sa=E+J*ea,Ba=G+L*ea,oa=E<sa?E:sa,ga=G<Ba?G:Ba,qa=E>sa?E:sa,la=G>Ba?G:Ba,Ca=C+4|0;x=(C|0)>>2;l[x]=Ca;w=(C+1028|0)>>2;r=(C+1032|0)>>2;l[r]=256;l[Ca>>2]=l[p>>2];l[w]=1;var ia=p+4|0,ya=z+8|0,ta=z+16|0,Ia=ea,na=oa,Z=ga,ba=qa,ca=la,ma=1;a:for(;;){for(var ka=ma;;){if(0>=(ka|0)){break a}var aa=ka-1|0;l[w]=aa;var ra=l[x],ha=l[ra+(aa<<2)>>2];if(-1==(ha|0)){var za=Ia,X=na,ua=Z,da=ba,fa=ca;break}var Aa=l[ia>>2];u=Aa>>2;var Qa=q[u+(9*ha|0)+2],pa=q[u+(9*ha|0)+3],cb=q[u+(9*ha|0)],Ra=q[u+(9*ha|0)+1];if(0<na-Qa|0<Z-pa|0<cb-ba|0<Ra-ca){za=Ia;X=na;ua=Z;da=ba;fa=ca;break}var Ta=W*(E-.5*(cb+Qa))+T*(G-.5*(Ra+pa));if(0<(0<Ta?Ta:-Ta)-(.5*Q*(Qa-cb)+.5*$*(pa-Ra))){za=Ia;X=na;ua=Z;da=ba;fa=ca;break}var $a=Aa+36*ha+24|0;if(-1==(l[$a>>2]|0)){var va=l[A+1];l[z>>2]=l[A];l[z+4>>2]=va;var Wa=l[y+1];l[ya>>2]=l[y];l[ya+4>>2]=Wa;q[ta>>2]=Ia;var fb,gb=g,Xa=z,Ua=ha,Va=Xa>>2,pb=a;a+=20;var nb=pb+12,La=l[gb>>2];4==(-1<(Ua|0)?(l[La+12>>2]|0)>(Ua|0)?5:4:4)&&P(N.q|0,153,N.S|0,N.o|0);var qb=l[(l[La+4>>2]+16>>2)+(9*Ua|0)],bb=l[qb+16>>2],Fa=l[bb+12>>2];if(K[l[l[Fa>>2]+20>>2]](Fa,pb,Xa,l[bb+8>>2]+12|0,l[qb+20>>2])){var Ma=q[pb+8>>2],wa=1-Ma,hb=q[Va+1]*wa+q[Va+3]*Ma;q[nb>>2]=q[Va]*wa+q[Va+2]*Ma;q[nb+4>>2]=hb;var Ya=l[gb+4>>2],Za=K[l[l[Ya>>2]+8>>2]](Ya,bb,nb,pb|0,Ma)}else{Za=q[Va+4]}a=pb;fb=Za;if(0==fb){break a}if(0>=fb){za=Ia;X=na;ua=Z;da=ba;fa=ca;break}var Da=E+J*fb,Oa=G+L*fb,ib=E<Da?E:Da,ab=G<Oa?G:Oa,Ga=E>Da?E:Da,jb=G>Oa?G:Oa,za=fb,X=ib,ua=ab,da=Ga,fa=jb;break}if((aa|0)==(l[r]|0)){l[r]=aa<<1;var Ea=Ne(aa<<3);l[x]=Ea;var Pa=ra;Ch(Ea,Pa,l[w]<<2);(ra|0)!=(Ca|0)&&Dh(Pa)}l[((l[w]<<2)+l[x]|0)>>2]=l[$a>>2];var Ja=l[w]+1|0;l[w]=Ja;var db=Aa+36*ha+28|0;if((Ja|0)==(l[r]|0)){var xa=l[x];l[r]=Ja<<1;var Sa=Ne(Ja<<3);l[x]=Sa;var Ka=xa;Ch(Sa,Ka,l[w]<<2);(xa|0)!=(Ca|0)&&Dh(Ka)}l[((l[w]<<2)+l[x]|0)>>2]=l[db>>2];var tb=l[w]+1|0,ka=l[w]=tb}Ia=za;na=X;Z=ua;ba=da;ca=fa;ma=l[w]}var kb=l[x];(kb|0)!=(Ca|0)&&(Dh(kb),l[x]=0);a=C;a=g}function lu(b){0!=(b|0)&&(Ap(b),Ls(b))}function mu(b){0==c[nu]<<24>>24&&ou(nu);var b=b+102968|0,d=l[b+4>>2],e=pu;l[e>>2]=l[b>>2];l[e+4>>2]=d;return pu}function qu(b){if(0!=(b|0)){K[l[l[b>>2]+4>>2]](b)}}function Ov(b,d,e){K[l[l[b>>2]+28>>2]](b,d,e)}function Mw(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function Nw(b,d,e,f,g){return K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function Ow(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function Uw(b){return K[l[l[b>>2]+12>>2]](b)}function Vw(b,d,e){return K[l[l[b>>2]+16>>2]](b,d,e)}function Ww(){var b,d=Wq(20);l[d>>2]=Xw+8|0;b=(d+4|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;return d}function Yw(b,d){K[l[l[b>>2]+28>>2]](b,d)}function Zw(b,d,e,f){K[l[l[b>>2]+8>>2]](b,d,e,f)}function $w(b,d,e,f,g){K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function ax(b,d,e,f){K[l[l[b>>2]+12>>2]](b,d,e,f)}function bx(b,d,e,f){K[l[l[b>>2]+16>>2]](b,d,e,f)}function cx(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function dx(b,d){return K[l[l[b>>2]+12>>2]](b,d)}function ex(b){var d=a;a+=8;0==c[fx]<<24>>24&&ou(fx);K[l[l[b>>2]>>2]](d,b);var b=l[d+4>>2],e=gx;l[e>>2]=l[d>>2];l[e+4>>2]=b;a=d;return gx}function hx(b){K[l[l[b>>2]+16>>2]](b)}function ix(b){var d=a;a+=8;0==c[jx]<<24>>24&&ou(jx);K[l[l[b>>2]+4>>2]](d,b);var b=l[d+4>>2],e=kx;l[e>>2]=l[d>>2];l[e+4>>2]=b;a=d;return kx}function lx(b,d){var e=a;a+=8;0==c[mx]<<24>>24&&ou(mx);K[l[l[b>>2]+8>>2]](e,b,d);var f=l[e+4>>2],g=nx;l[g>>2]=l[e>>2];l[g+4>>2]=f;a=e;return nx}function ox(b,d,e,f,g){return K[l[l[b>>2]+8>>2]](b,d,e,f,g)}function px(b){0!=(b|0)&&(Dh(l[b+4>>2]),Ls(b))}function qx(){var b,d,e=Wq(28);d=e>>2;l[d]=-1;l[d+3]=16;l[d+2]=0;var f=Ne(576);b=f>>2;l[d+1]=f;for(var g=b,h=g+144;g<h;g++){l[g]=0}for(g=0;;){h=g+1|0;l[(f+20>>2)+(9*g|0)]=h;l[(f+32>>2)+(9*g|0)]=-1;if(15<=(h|0)){break}g=h}l[b+140]=-1;l[b+143]=-1;l[d+4]=0;l[d+5]=0;l[d+6]=0;return e}function rx(b,d){4==(-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4)&&P(N.q|0,159,N.H|0,N.o|0);return l[b+4>>2]+36*d|0}function sx(b,d){4==(-1<(d|0)?(l[b+12>>2]|0)>(d|0)?5:4:4)&&P(N.q|0,153,N.S|0,N.o|0);return l[(l[b+4>>2]+16>>2)+(9*d|0)]}function tx(b){var d=b+12|0,e=l[d>>2],f=0<(e|0);a:do{if(f){for(var g=b+4|0,h=0,j=0,k=l[g>>2],m=e;;){if(2<=(l[(k+32>>2)+(9*j|0)]|0)){var n=k+36*j+24|0,p=l[n>>2];-1==(p|0)?(P(N.c|0,686,N.Ka|0,N.Ya|0),p=l[n>>2],n=l[g>>2],m=l[d>>2]):n=k;k=l[(n+32>>2)+(9*l[(k+28>>2)+(9*j|0)]|0)]-l[(n+32>>2)+(9*p|0)]|0;k=0<(k|0)?k:-k|0;h=(h|0)>(k|0)?h:k;k=n}j=j+1|0;if((j|0)>=(m|0)){var u=h;break a}}}else{u=0}}while(0);return u}function ux(b,d,e){var f,g=hh(b);f=(b+4|0)>>2;var h=q[d+4>>2]-.10000000149011612,j=l[f]+36*g|0,k=(M[0]=q[d>>2]-.10000000149011612,t[0]),h=(M[0]=h,t[0])|0;l[(j|0)>>2]=0|k;l[(j+4|0)>>2]=h;k=q[d+12>>2]+.10000000149011612;j=l[f]+36*g+8|0;d=(M[0]=q[d+8>>2]+.10000000149011612,t[0]);k=(M[0]=k,t[0])|0;l[(j|0)>>2]=0|d;l[(j+4|0)>>2]=k;l[(l[f]+36*g+16|0)>>2]=e;l[(l[f]+36*g+32|0)>>2]=0;ih(b,g);return g}function vx(){return Wq(1)}function wx(b){0!=(b|0)&&Ls(b|0)}function xx(b){if(0!=(b|0)){K[l[l[b>>2]+4>>2]](b)}}function yx(){var b=Wq(4);l[b>>2]=zx+8|0;return b}function Ax(b,d){K[l[l[b>>2]+12>>2]](b,d)}function Bx(b,d){K[l[l[b>>2]+8>>2]](b,d)}function Cx(b,d,e){K[l[l[b>>2]+16>>2]](b,d,e)}function Dx(b,d,e){K[l[l[b>>2]+20>>2]](b,d,e)}function Ex(b){if(0!=(b|0)){K[l[l[b>>2]+4>>2]](b)}}function Fx(b,d,e){var f=b+12|0;4==(0==(l[f>>2]|0)?0==(l[b+16>>2]|0)?5:4:4)&&P(N.F|0,48,N.da|0,N.Sa|0);1<(e|0)||P(N.F|0,49,N.da|0,N.Pb|0);var g=b+16|0;l[g>>2]=e;e=Ne(e<<3);l[f>>2]=e;Ch(e,d,l[g>>2]<<3);c[b+36|0]=0;c[b+37|0]=0}function Gx(b){return l[b+16>>2]}function Hx(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f;c[b+36|0]=1}function Ix(b,d){l[b+12>>2]=d}function Jx(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f;c[b+37|0]=1}function Kx(b,d){l[b+16>>2]=d}function Lx(b,d){q[b+8>>2]=d}function Mx(b){return q[b+8>>2]}function Nx(b,d){return(d<<3)+b+20|0}function Ox(b,d,e){b>>=2;l[b+37]=4;var f=-d,g=-e;q[b+5]=f;q[b+6]=g;q[b+7]=d;q[b+8]=g;q[b+9]=d;q[b+10]=e;q[b+11]=f;q[b+12]=e;q[b+21]=0;q[b+22]=-1;q[b+23]=1;q[b+24]=0;q[b+25]=0;q[b+26]=1;q[b+27]=-1;q[b+28]=0;q[b+3]=0;q[b+4]=0}function Px(b,d){var e=b+12|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function Qx(b,d){l[b+148>>2]=d}function Rx(b){return l[b+148>>2]}function Sx(b){return l[b+4>>2]}function Tx(b){return l[b+148>>2]}function Ux(b,d,e){var f=b+12|0,g=l[d+4>>2];l[f>>2]=l[d>>2];l[f+4>>2]=g;d=b+20|0;f=l[e+4>>2];l[d>>2]=l[e>>2];l[d+4>>2]=f;c[b+44|0]=0;c[b+45|0]=0}function Vx(b,d){q[b+8>>2]=d}function Wx(b){return q[b+8>>2]}function Xx(b){return l[b+4>>2]}function Yx(b){return l[b+12>>2]}function Zx(b,d){var e=b+4|0,f=l[e>>2];l[e>>2]=d?f|4:f&-5}function $x(b){return q[b+140>>2]}function ay(b){return q[b+136>>2]}function by(b){return 0!=(l[b+4>>2]&2|0)}function cy(b){return 0!=(l[b+4>>2]&4|0)}function dy(b){return l[b+52>>2]}function ey(b,d){q[b+136>>2]=d}function fy(b){return l[b+48>>2]}function gy(b){return l[b+56>>2]}function hy(b){return l[b+60>>2]}function iy(b,d){q[b+140>>2]=d}function jy(b){var d=q[l[b+48>>2]+20>>2],e=q[l[b+52>>2]+20>>2];q[b+140>>2]=d>e?d:e}function ky(b){return q[b+8>>2]}function ly(b,d){q[b+8>>2]=d}function my(b){return l[b+4>>2]}function ny(b){return q[b+56>>2]}function oy(b){return l[b+148>>2]}function py(b){return 0!=(i[b+4>>1]&4)<<16>>16}function qy(b,d){q[b+136>>2]=d}function ry(b,d){q[b+140>>2]=d}function sy(b,d){l[b+148>>2]=d}function ty(b){return q[b+72>>2]}function uy(b){return l[b+100>>2]}function vy(b,d,e){if(2==(l[b>>2]|0)){var f=b+4|0,g=i[f>>1];0==(g&2)<<16>>16&&(i[f>>1]=g|2,q[b+144>>2]=0);f=d|0;g=b+76|0;q[g>>2]+=q[f>>2];d=d+4|0;g=b+80|0;q[g>>2]+=q[d>>2];g=b+84|0;q[g>>2]+=(q[e>>2]-q[b+44>>2])*q[d>>2]-(q[e+4>>2]-q[b+48>>2])*q[f>>2]}}function wy(b,d,e){K[l[l[b>>2]+28>>2]](b,d,e)}function xy(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function yy(){var b,d=Wq(40);b=d>>2;l[b]=zy+8|0;l[b+1]=3;q[b+2]=.009999999776482582;l[b+3]=0;l[b+4]=0;c[d+36|0]=0;c[d+37|0]=0;return d}function Ay(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function By(b,d,e,f,g){return K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function Cy(b){return K[l[l[b>>2]+12>>2]](b)}function Dy(b,d,e){return K[l[l[b>>2]+16>>2]](b,d,e)}function Ey(b,d,e){var f;f=(b+12|0)>>2;4==(0==(l[f]|0)?0==(l[b+16>>2]|0)?5:4:4)&&P(N.F|0,34,N.ib|0,N.Sa|0);2<(e|0)||P(N.F|0,35,N.ib|0,N.Xb|0);var g=e+1|0,h=b+16|0;l[h>>2]=g;g=Ne(g<<3);l[f]=g;Ch(g,d,e<<3);d=l[f];e=(e<<3)+d|0;g=l[d+4>>2];l[(e|0)>>2]=l[d>>2];l[(e+4|0)>>2]=g;f=l[f];h=(l[h>>2]-2<<3)+f|0;e=b+20|0;d=l[h+4>>2];l[e>>2]=l[h>>2];l[e+4>>2]=d;h=f+8|0;f=b+28|0;e=l[h+4>>2];l[f>>2]=l[h>>2];l[f+4>>2]=e;c[b+36|0]=1;c[b+37|0]=1}function Fy(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function Gy(b){if(0!=(b|0)){var d=b+4|0,e=0<(l[d>>2]|0),f=b|0,g=l[f>>2];a:do{if(e){for(var h=0,j=g;;){if(Dh(l[j+(h<<3)+4>>2]),h=h+1|0,j=l[f>>2],(h|0)>=(l[d>>2]|0)){var k=j;break a}}}else{k=g}}while(0);Dh(k);Ls(b)}}function Hy(b){var d;d=(b+4|0)>>2;var e=0<(l[d]|0),f=b|0;a:do{if(e){for(var g=0;;){if(Dh(l[l[f>>2]+(g<<3)+4>>2]),g=g+1|0,(g|0)>=(l[d]|0)){break a}}}}while(0);l[d]=0;Oe(l[f>>2],l[b+8>>2]<<3);b=(b+12|0)>>2;for(d=b+14;b<d;b++){l[b]=0}}function Iy(b,d,e){var f=0==(e|0);a:do{if(!f){var g=0<(e|0);do{if(g){if(640>=(e|0)){break}Dh(d);break a}P(N.e|0,164,N.f|0,N.Va|0)}while(0);var h=ed[rn+e|0],g=h&255;14>(h&255)||P(N.e|0,173,N.f|0,N.g|0);h=d;g=(g<<2)+b+12|0;l[d>>2]=l[g>>2];l[g>>2]=h}}while(0)}function FB(){var b,d=Wq(68);b=d>>2;l[b+2]=128;l[b+1]=0;var e=Ne(1024);l[b]=e;b=e>>2;for(e=b+256;b<e;b++){l[b]=0}b=(d+12|0)>>2;for(e=b+14;b<e;b++){l[b]=0}if(0==(c[xp]&1)<<24>>24){e=0;for(b=1;!(14>(e|0)||P(N.e|0,73,N.Ga|0,N.Ta|0),(b|0)>(l[sn+(e<<2)>>2]|0)&&(e=e+1|0),c[rn+b|0]=e&255,b=b+1|0,641==(b|0));){}c[xp]=1}return d}function hF(b){if(0!=(b|0)){K[l[l[b>>2]+4>>2]](b)}}function iF(b,d,e){K[l[l[b>>2]+28>>2]](b,d,e)}function jF(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function kF(b,d,e,f,g){return K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function lF(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function mF(b){return K[l[l[b>>2]+12>>2]](b)}function nF(b,d,e){return K[l[l[b>>2]+16>>2]](b,d,e)}function oF(){var b,d=Wq(152);b=d>>2;l[b]=pF+8|0;l[b+1]=2;q[b+2]=.009999999776482582;l[b+37]=0;q[b+3]=0;q[b+4]=0;return d}function qF(b){if(0!=(b|0)){K[l[l[b>>2]+4>>2]](b)}}function rF(b,d,e){K[l[l[b>>2]+28>>2]](b,d,e)}function sF(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function tF(b,d,e,f,g){return K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function uF(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function vF(b){return K[l[l[b>>2]+12>>2]](b)}function wF(b,d,e){return K[l[l[b>>2]+16>>2]](b,d,e)}function xF(){var b,d=Wq(48);b=d>>2;l[b]=yF+8|0;l[b+1]=1;q[b+2]=.009999999776482582;b=d+28|0;l[b>>2]=0;l[b+4>>2]=0;l[b+8>>2]=0;l[b+12>>2]=0;i[b+16>>1]=0;return d}function zF(b,d){var e=l[b+48>>2],f=l[b+52>>2];Gi(d,b+64|0,l[e+8>>2]+12|0,q[l[e+12>>2]+8>>2],l[f+8>>2]+12|0,q[l[f+12>>2]+8>>2])}function AF(b){var d=Fh(q[l[b+48>>2]+16>>2]*q[l[b+52>>2]+16>>2]);q[b+136>>2]=d}function BF(b,d,e,f){K[l[l[b>>2]>>2]](b,d,e,f)}function CF(b,d,e){K[l[l[b>>2]+28>>2]](b,d,e)}function DF(b,d){return K[l[l[b>>2]+8>>2]](b,d)}function EF(b,d,e,f,g){return K[l[l[b>>2]+20>>2]](b,d,e,f,g)}function FF(b,d,e,f){K[l[l[b>>2]+24>>2]](b,d,e,f)}function GF(b){return K[l[l[b>>2]+12>>2]](b)}function HF(b,d,e){return K[l[l[b>>2]+16>>2]](b,d,e)}function IF(b,d){0==c[JF]<<24>>24&&ou(JF);var e=q[d>>2]-q[b+12>>2],f=q[d+4>>2]-q[b+16>>2],g=q[b+24>>2],h=q[b+20>>2],j=(M[0]=g*e+h*f,t[0]),e=(M[0]=e*-h+g*f,t[0])|0,f=KF;l[f>>2]=0|j;l[f+4>>2]=e;return KF}function LF(b,d){if(0!=(l[b>>2]|0)){var e=q[d>>2],f=q[d+4>>2];0<e*e+f*f&&(e=b+4|0,f=i[e>>1],0==(f&2)<<16>>16&&(i[e>>1]=f|2,q[b+144>>2]=0));e=b+64|0;f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}}function MF(b){return l[b+108>>2]}function NF(b){return l[b+96>>2]}function OF(b,d){var e;e=(b+4|0)>>1;var f=i[e];if(d){i[e]=f|4}else{var g=f&-5;i[e]=g;0==(f&2)<<16>>16&&(i[e]=g|2,q[b+144>>2]=0)}}function PF(b){return q[b+116>>2]}function QF(b,d){if(0!=(l[b>>2]|0)){if(0<d*d){var e=b+4|0,f=i[e>>1];0==(f&2)<<16>>16&&(i[e>>1]=f|2,q[b+144>>2]=0)}q[b+72>>2]=d}}function RF(b,d){var e=b+116|0;q[d>>2]=q[e>>2];var f=b+28|0,g=q[f>>2],h=q[b+32>>2];q[d+12>>2]=q[b+124>>2]+q[e>>2]*(g*g+h*h);e=d+4|0;g=l[f+4>>2];l[e>>2]=l[f>>2];l[e+4>>2]=g}function SF(b,d){if(2==(l[b>>2]|0)){var e=b+4|0,f=i[e>>1];0==(f&2)<<16>>16&&(i[e>>1]=f|2,q[b+144>>2]=0);e=b+76|0;q[e>>2]+=q[d>>2];e=b+80|0;q[e>>2]+=q[d+4>>2]}}function TF(b,d){if(2==(l[b>>2]|0)){var e=b+4|0,f=i[e>>1];0==(f&2)<<16>>16&&(i[e>>1]=f|2,q[b+144>>2]=0);e=b+84|0;q[e>>2]+=d}}function UF(b){return 0!=(i[b+4>>1]&2)<<16>>16}function VF(b){return q[b+136>>2]}function WF(b,d,e){var f=b>>2;if(2==(l[f]|0)){var g=b+4|0,h=i[g>>1];0==(h&2)<<16>>16&&(i[g>>1]=h|2,q[f+36]=0);var h=q[f+30],g=d|0,d=d+4|0,j=q[d>>2]*h,k=b+64|0;q[k>>2]+=q[g>>2]*h;h=b+68|0;q[h>>2]+=j;b=b+72|0;q[b>>2]+=q[f+32]*((q[e>>2]-q[f+11])*q[d>>2]-(q[e+4>>2]-q[f+12])*q[g>>2])}}function XF(b){return 0!=(i[b+4>>1]&16)<<16>>16}function YF(b){return l[b+112>>2]}function ZF(b){return q[b+132>>2]}function $F(b){return 0!=(i[b+4>>1]&8)<<16>>16}function aG(b){return l[b+88>>2]}function bG(b,d){q[b+132>>2]=d}function cG(b,d){var e=b+4|0,f=i[e>>1];i[e>>1]=d?f|8:f&-9}function dG(b){return l[b>>2]}function eG(b){return q[b+140>>2]}function fG(b){var d=q[b+28>>2],e=q[b+32>>2];return q[b+124>>2]+q[b+116>>2]*(d*d+e*e)}function gG(b){return 0!=(i[b+4>>1]&32)<<16>>16}function hG(b,d){if(2==(l[b>>2]|0)){var e=b+4|0,f=i[e>>1];0==(f&2)<<16>>16&&(i[e>>1]=f|2,q[b+144>>2]=0);e=b+72|0;q[e>>2]+=q[b+128>>2]*d}}function iG(b){return l[b+102408>>2]}function jG(b,d){i[b+2>>1]=d}function kG(b,d){i[b>>1]=d}function lG(b){return i[b+4>>1]}function mG(b,d){i[b+4>>1]=d}function nG(b){return i[b+2>>1]}function oG(b){return i[b>>1]}function pG(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function qG(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function rG(b){return q[b+36>>2]}function sG(b,d){q[b+36>>2]=d}function tG(b){0==c[uG]<<24>>24&&ou(uG);var b=b+64|0,d=l[b+4>>2],e=vG;l[e>>2]=l[b>>2];l[e+4>>2]=d;return vG}function wG(b,d){var e=b>>2;0==c[xG]<<24>>24&&ou(xG);var f=q[e+18],g=q[e+17]+(q[d>>2]-q[e+11])*f,e=(M[0]=q[e+16]+(q[d+4>>2]-q[e+12])*-f,t[0]),g=(M[0]=g,t[0])|0,f=yG;l[f>>2]=0|e;l[f+4>>2]=g;return yG}function zG(b,d,e){var f=a;a+=28;i[f+22>>1]=1;i[f+24>>1]=-1;i[f+26>>1]=0;l[f+4>>2]=0;q[f+8>>2]=.20000000298023224;q[f+12>>2]=0;c[f+20|0]=0;l[(f|0)>>2]=d;q[(f+16|0)>>2]=e;b=yo(b,f);a=f;return b}function AG(b,d){0==c[BG]<<24>>24&&ou(BG);var e=q[b+24>>2],f=q[d>>2],g=q[b+20>>2],h=q[d+4>>2],j=(M[0]=e*f-g*h,t[0]),e=(M[0]=g*f+e*h,t[0])|0,f=CG;l[f>>2]=0|j;l[f+4>>2]=e;return CG}function DG(b,d){var e=b>>2;0==c[EG]<<24>>24&&ou(EG);var f=q[e+6],g=q[d>>2],h=q[e+5],j=q[d+4>>2],k=q[e+18],m=q[e+17]+(f*g-h*j+q[e+3]-q[e+11])*k,e=(M[0]=q[e+16]+(h*g+f*j+q[e+4]-q[e+12])*-k,t[0]),m=(M[0]=m,t[0])|0,f=FG;l[f>>2]=0|e;l[f+4>>2]=m;return FG}function GG(b,d){0==c[HG]<<24>>24&&ou(HG);var e=q[b+24>>2],f=q[d>>2],g=q[b+20>>2],h=q[d+4>>2],j=g*f+e*h+q[b+16>>2],e=(M[0]=e*f-g*h+q[b+12>>2],t[0]),j=(M[0]=j,t[0])|0,f=IG;l[f>>2]=0|e;l[f+4>>2]=j;return IG}function JG(b,d){var e;e=(b+4|0)>>1;var f=i[e];d?0==(f&2)<<16>>16&&(i[e]=f|2,q[b+144>>2]=0):(i[e]=f&-3,q[b+144>>2]=0,e=(b+64|0)>>2,l[e]=0,l[e+1]=0,l[e+2]=0,l[e+3]=0,l[e+4]=0,l[e+5]=0)}function KG(b,d){0==c[LG]<<24>>24&&ou(LG);var e=q[b+24>>2],f=q[d>>2],g=q[b+20>>2],h=q[d+4>>2],j=(M[0]=e*f+g*h,t[0]),e=(M[0]=f*-g+e*h,t[0])|0,f=MG;l[f>>2]=0|j;l[f+4>>2]=e;return MG}function NG(b,d){var e=b+4|0,f=i[e>>1];i[e>>1]=d?f|16:f&-17;vo(b)}function OG(b){0!=(b|0)&&(0!=(l[b+102400>>2]|0)&&P(N.n|0,32,N.Q|0,N.Ua|0),0!=(l[b+102796>>2]|0)&&P(N.n|0,33,N.Q|0,N.Xa|0),Ls(b|0))}function PG(){var b,d=Wq(102800);b=d>>2;l[b+25600]=0;l[b+25601]=0;l[b+25602]=0;l[b+25699]=0;return d}function QG(b,d){var e,f,g;g=(b+102796|0)>>2;f=l[g];if(32>(f|0)){var h=f}else{P(N.n|0,38,N.w|0,N.D|0),h=l[g]}f=(b+12*h+102412|0)>>2;l[(b+102416>>2)+(3*h|0)]=d;e=(b+102400|0)>>2;var j=l[e];102400<(j+d|0)?(e=Ne(d),l[f]=e,c[b+12*h+102420|0]=1):(l[f]=b+j|0,c[b+12*h+102420|0]=0,l[e]=l[e]+d|0);e=b+102404|0;h=l[e>>2]+d|0;l[e>>2]=h;e=b+102408|0;j=l[e>>2];l[e>>2]=(j|0)>(h|0)?j:h;l[g]=l[g]+1|0;return l[f]}function RG(b,d){K[l[l[b>>2]+8>>2]](b,d)}function SG(b){0!=(b|0)&&Ls(b)}function TG(){var b,d=Wq(6);b=d>>1;i[b]=1;i[b+1]=-1;i[b+2]=0;return d}function UG(b){0!=(b|0)&&Ls(b)}function VG(){var b,d=Wq(44);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;l[b]=9;b=(d+20|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;l[b+4]=0;l[b+5]=0;return d}function WG(b,d){q[b+40>>2]=d}function XG(b){return q[b+40>>2]}function YG(b,d,e,f){l[b+8>>2]=d;l[b+12>>2]=e;var g=f|0,h=q[g>>2]-q[d+12>>2],f=f+4|0,j=q[f>>2]-q[d+16>>2],k=q[d+24>>2],m=q[d+20>>2],d=b+20|0,n=(M[0]=k*h+m*j,t[0]),h=(M[0]=h*-m+k*j,t[0])|0;l[d>>2]=0|n;l[d+4>>2]=h;g=q[g>>2]-q[e+12>>2];f=q[f>>2]-q[e+16>>2];h=q[e+24>>2];e=q[e+20>>2];b=b+28|0;j=(M[0]=h*g+e*f,t[0]);e=(M[0]=g*-e+h*f,t[0])|0;l[b>>2]=0|j;l[b+4>>2]=e}function ZG(b){return q[b+28>>2]}function $G(b){return 0!=(c[b+37|0]&1)<<24>>24}function aH(b){return l[b>>2]}function bH(b){return 0!=(c[b+36|0]&1)<<24>>24}function cH(b,d){var e=b+4|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function dH(b,d){var e=b+16|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function eH(b){return 0!=(c[b+39|0]&1)<<24>>24}function fH(b){return l[b+44>>2]}function gH(b,d){q[b+32>>2]=d}function hH(b,d){c[b+38|0]=d&1}function iH(b,d){c[b+36|0]=d&1}function jH(b){return q[b+48>>2]}function kH(b,d){q[b+24>>2]=d}function lH(b,d){l[b+44>>2]=d}function mH(b,d){l[b>>2]=d}function nH(b,d){q[b+48>>2]=d}function oH(b){return q[b+32>>2]}function pH(b,d){c[b+39|0]=d&1}function qH(b,d){c[b+40|0]=d&1}function rH(b,d){q[b+12>>2]=d}function sH(b){return q[b+12>>2]}function tH(b){return q[b+24>>2]}function uH(b){return 0!=(c[b+40|0]&1)<<24>>24}function vH(b,d){q[b+28>>2]=d}function wH(b){return 0!=(c[b+38|0]&1)<<24>>24}function xH(b,d){c[b+37|0]=d&1}function yH(b,d){q[b>>2]=d}function zH(b,d,e){q[b>>2]=d;q[b+4>>2]=e}function AH(b){return q[b>>2]}function BH(b){return q[b+4>>2]}function CH(b,d){q[b+4>>2]=d}function DH(b){var d=q[b>>2];(!isNaN(d)&&!isNaN(0))&-Infinity<d&Infinity>d?(b=q[b+4>>2],b=(!isNaN(b)&&!isNaN(0))&-Infinity<b?Infinity>b:0):b=0;return b}function EH(b){var d=q[b>>2],b=q[b+4>>2];return d*d+b*b}function FH(b,d){var e=b|0;q[e>>2]+=q[d>>2];e=b+4|0;q[e>>2]+=q[d+4>>2]}function GH(b){q[b>>2]=0;q[b+4>>2]=0}function HH(b,d){var e=b|0;q[e>>2]*=d;e=b+4|0;q[e>>2]*=d}function IH(b,d){q[b+8>>2]=d}function JH(b,d,e,f){q[b>>2]=d;q[b+4>>2]=e;q[b+8>>2]=f}function KH(b){return q[b+8>>2]}function LH(b,d){var e=b|0;q[e>>2]+=q[d>>2];e=b+4|0;q[e>>2]+=q[d+4>>2];e=b+8|0;q[e>>2]+=q[d+8>>2]}function MH(b){q[b>>2]=0;q[b+4>>2]=0;q[b+8>>2]=0}function NH(b,d){var e=b|0;q[e>>2]*=d;e=b+4|0;q[e>>2]*=d;e=b+8|0;q[e>>2]*=d}function OH(b){return q[b+24>>2]}function PH(b,d){q[b+24>>2]=d}function QH(b){return l[b+16>>2]}function RH(b,d){var e,f=l[b+16>>2];e=f>>2;var g=l[b+20>>2],h=1<(g|0);a:do{if(h){for(var j=q[d+4>>2],k=q[d>>2],m=0,n=q[e]*k+q[e+1]*j,p=1;;){var u=q[(p<<3>>2)+e]*k+q[((p<<3)+4>>2)+e]*j,r=u>n,m=r?p:m,n=r?u:n,p=p+1|0;if((p|0)==(g|0)){var w=m;break a}}}else{w=0}}while(0);return(w<<3)+f|0}function SH(b){return l[b+20>>2]}function TH(b){return l[b+20>>2]}function UH(b,d){var e;e=l[b+16>>2]>>2;var f=l[b+20>>2],g=1<(f|0);a:do{if(g){for(var h=q[d+4>>2],j=q[d>>2],k=0,m=q[e]*j+q[e+1]*h,n=1;;){var p=q[(n<<3>>2)+e]*j+q[((n<<3)+4>>2)+e]*h,u=p>m,k=u?n:k,m=u?p:m,n=n+1|0;if((n|0)==(f|0)){var r=k;break a}}}else{r=0}}while(0);return r}function VH(b,d){l[b+16>>2]=d}function WH(b,d){l[b+20>>2]=d}function XH(b){return 0!=(c[b+20|0]&1)<<24>>24}function YH(b,d){l[b+4>>2]=d}function ZH(b,d){l[b>>2]=d}function $H(b){return q[b+16>>2]}function aI(b){return l[b>>2]}function bI(b,d){q[b+16>>2]=d}function cI(b,d){q[b+12>>2]=d}function dI(b){return q[b+12>>2]}function eI(b,d){c[b+20|0]=d&1}function fI(b){return q[b+8>>2]}function gI(b,d){q[b+8>>2]=d}function hI(b){return l[b+4>>2]}function iI(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function jI(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function kI(b){return q[b+68>>2]}function lI(b){return 0!=(c[b+60|0]&1)<<24>>24}function mI(b){return q[b+44>>2]}function nI(b,d){c[b+48|0]=d&1}function oI(b,d){q[b+68>>2]=d}function pI(b,d){q[b+56>>2]=d}function qI(){var b,d,e=Wq(52);d=e>>2;l[d+11]=0;b=(e+4|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;l[b+4]=0;l[b+5]=0;l[b+6]=0;l[b+7]=0;c[e+36|0]=1;c[e+37|0]=1;c[e+38|0]=0;c[e+39|0]=0;l[d]=0;c[e+40|0]=1;q[d+12]=1;return e}function rI(b){0!=(b|0)&&Ls(b)}function sI(b){var d=b|0,e=q[d>>2],b=b+4|0,f=q[b>>2],g=Fh(e*e+f*f);if(1.1920928955078125e-7>g){d=0}else{var h=1/g;q[d>>2]=e*h;q[b>>2]=f*h;d=g}return d}function tI(){return Wq(8)}function uI(b,d){var e=Wq(8);q[e>>2]=b;q[e+4>>2]=d;return e}function vI(b){0==c[wI]<<24>>24&&ou(wI);var d=q[b>>2],b=(M[0]=-q[b+4>>2],t[0]),d=(M[0]=d,t[0])|0,e=xI;l[e>>2]=0|b;l[e+4>>2]=d;return xI}function yI(b){var d=q[b>>2],b=q[b+4>>2];return Fh(d*d+b*b)}function zI(b){0!=(b|0)&&Ls(b)}function AI(b){0==c[BI]<<24>>24&&ou(BI);var d=-q[b+4>>2],b=(M[0]=-q[b>>2],t[0]),d=(M[0]=d,t[0])|0,e=CI;l[e>>2]=0|b;l[e+4>>2]=d;return CI}function DI(b){0!=(b|0)&&Ls(b)}function EI(){return Wq(12)}function FI(b,d,e){var f,g=Wq(12);f=g>>2;q[f]=b;q[f+1]=d;q[f+2]=e;return g}function GI(b){0==c[HI]<<24>>24&&ou(HI);var d=-q[b+4>>2],e=-q[b+8>>2];q[II>>2]=-q[b>>2];q[II+4>>2]=d;q[II+8>>2]=e;return II}function JI(){var b,d=Wq(28);b=d>>2;l[b+4]=0;l[b+5]=0;q[b+6]=0;return d}function KI(b){0!=(b|0)&&Ls(b)}function LI(b,d){4==(-1<(d|0)?(l[b+20>>2]|0)>(d|0)?5:4:4)&&P(N.i|0,103,N.h|0,N.j|0);return(d<<3)+l[b+16>>2]|0}function MI(b){0!=(b|0)&&Ls(b)}function NI(){var b=Wq(28);i[b+22>>1]=1;i[b+24>>1]=-1;i[b+26>>1]=0;l[b>>2]=0;l[b+4>>2]=0;q[b+8>>2]=.20000000298023224;q[b+12>>2]=0;q[b+16>>2]=0;c[b+20|0]=0;return b}function OI(b,d){var e,f;f=(b+22|0)>>1;e=d>>1;i[f]=i[e];i[f+1]=i[e+1];i[f+2]=i[e+2]}function PI(){var b,d,e=Wq(72);d=e>>2;l[d]=0;l[d+1]=0;l[d+2]=0;l[d+3]=0;c[e+16]=0;l[d]=2;b=(e+20|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;q[(e+36|0)>>2]=1;q[d+10]=0;q[d+11]=0;c[e+48|0]=0;q[d+13]=0;q[d+14]=0;c[e+60|0]=0;q[d+16]=0;q[d+17]=0;return e}function QI(b,d,e,f,g){var h=e>>2;l[b+8>>2]=d;l[b+12>>2]=e;var j=f|0,k=q[j>>2]-q[d+12>>2],m=f+4|0,n=q[m>>2]-q[d+16>>2],e=d+24|0,p=q[e>>2],f=d+20|0,u=q[f>>2],r=b+20|0,w=(M[0]=p*k+u*n,t[0]),k=(M[0]=k*-u+p*n,t[0])|0;l[r>>2]=0|w;l[r+4>>2]=k;j=q[j>>2]-q[h+3];r=q[m>>2]-q[h+4];w=q[h+6];n=q[h+5];m=b+28|0;k=(M[0]=w*j+n*r,t[0]);j=(M[0]=j*-n+w*r,t[0])|0;l[m>>2]=0|k;l[m+4>>2]=j;e=q[e>>2];j=q[g>>2];f=q[f>>2];k=q[g+4>>2];g=b+36|0;m=(M[0]=e*j+f*k,t[0]);f=(M[0]=j*-f+e*k,t[0])|0;l[g>>2]=0|m;l[g+4>>2]=f;q[b+44>>2]=q[h+14]-q[d+56>>2]}function RI(b,d){q[b+52>>2]=d}function SI(b){return q[b+56>>2]}function TI(b){return 0!=(c[b+48|0]&1)<<24>>24}function UI(b,d){q[b+44>>2]=d}function VI(b){return q[b+64>>2]}function WI(b,d){q[b+64>>2]=d}function XI(b,d){c[b+60|0]=d&1}function YI(b){return q[b+52>>2]}function ZI(b,d){var e=b+36|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function $I(b,d){q[b+4>>2]=d}function aJ(b){q[b>>2]=0;q[b+4>>2]=1}function bJ(b){return q[b+4>>2]}function cJ(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function dJ(b,d){q[b+52>>2]=d}function eJ(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function fJ(b){return q[b+56>>2]}function gJ(b,d){q[b+48>>2]=d}function hJ(b){return 0!=(c[b+44|0]&1)<<24>>24}function iJ(b){return q[b+48>>2]}function jJ(b){return q[b+60>>2]}function kJ(b,d){c[b+44|0]=d&1}function lJ(b,d){q[b+56>>2]=d}function mJ(b,d,e,f,g){l[b+8>>2]=d;l[b+12>>2]=e;var h=f|0,j=q[h>>2]-q[d+12>>2],k=f+4|0,m=q[k>>2]-q[d+16>>2],f=d+24|0,n=q[f>>2],d=d+20|0,p=q[d>>2],u=b+20|0,r=(M[0]=n*j+p*m,t[0]),j=(M[0]=j*-p+n*m,t[0])|0;l[u>>2]=0|r;l[u+4>>2]=j;h=q[h>>2]-q[e+12>>2];k=q[k>>2]-q[e+16>>2];j=q[e+24>>2];n=q[e+20>>2];e=b+28|0;m=(M[0]=j*h+n*k,t[0]);h=(M[0]=h*-n+j*k,t[0])|0;l[e>>2]=0|m;l[e+4>>2]=h;f=q[f>>2];e=q[g>>2];d=q[d>>2];g=q[g+4>>2];b=b+36|0;h=(M[0]=f*e+d*g,t[0]);g=(M[0]=e*-d+f*g,t[0])|0;l[b>>2]=0|h;l[b+4>>2]=g}function nJ(b,d){q[b+60>>2]=d}function oJ(b,d){var e=b+36|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function pJ(b){return q[b+52>>2]}function qJ(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function rJ(b){return q[b+44>>2]}function sJ(b,d){q[b+48>>2]=d}function tJ(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function uJ(b){return 0!=(c[b+40|0]&1)<<24>>24}function vJ(b,d){q[b+44>>2]=d}function wJ(b){return 0!=(c[b+52|0]&1)<<24>>24}function xJ(b,d){q[b+56>>2]=d}function yJ(b){return q[b+48>>2]}function zJ(b,d){q[b+36>>2]=d}function AJ(b,d){q[b+60>>2]=d}function BJ(b){return q[b+36>>2]}function CJ(b,d){c[b+40|0]=d&1}function DJ(b,d){c[b+52|0]=d&1}function EJ(b,d,e,f){var g=e>>2,h=d>>2;l[b+8>>2]=d;l[b+12>>2]=e;var d=f|0,e=q[d>>2]-q[h+3],f=f+4|0,j=q[f>>2]-q[h+4],k=q[h+6],m=q[h+5],n=b+20|0,p=(M[0]=k*e+m*j,t[0]),e=(M[0]=e*-m+k*j,t[0])|0;l[n>>2]=0|p;l[n+4>>2]=e;d=q[d>>2]-q[g+3];n=q[f>>2]-q[g+4];p=q[g+6];j=q[g+5];f=b+28|0;e=(M[0]=p*d+j*n,t[0]);d=(M[0]=d*-j+p*n,t[0])|0;l[f>>2]=0|e;l[f+4>>2]=d;q[b+36>>2]=q[g+14]-q[h+14]}function FJ(b){return q[b+60>>2]}function GJ(b){return q[b+56>>2]}function HJ(b,d){var e=b+36|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function IJ(b,d){var e=b+44|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function JJ(b){return q[b+60>>2]}function KJ(b){return q[b+56>>2]}function LJ(b){return q[b+52>>2]}function MJ(b,d){q[b+60>>2]=d}function NJ(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function OJ(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function PJ(b,d){q[b+56>>2]=d}function QJ(b,d){q[b+52>>2]=d}function RJ(b){return l[b+8>>2]}function SJ(b,d){l[b+4>>2]=d}function TJ(b,d){l[b+8>>2]=d}function UJ(b,d){l[b+12>>2]=d}function VJ(b){return l[b+12>>2]}function WJ(b,d){l[b>>2]=d}function XJ(b){return 0!=(c[b+16|0]&1)<<24>>24}function YJ(b){return l[b>>2]}function ZJ(b,d){c[b+16|0]=d&1}function $J(b){return l[b+4>>2]}function aK(b,d){var e=l[d+4>>2];l[b>>2]=l[d>>2];l[b+4>>2]=e}function bK(b,d){var e=b+8|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function cK(b){q[b>>2]=0;q[b+4>>2]=0;q[b+8>>2]=0;q[b+12>>2]=1}function dK(b){0!=(b|0)&&Ls(b)}function eK(b){0!=(b|0)&&Ls(b)}function fK(b,d){var e=mm(d);q[b>>2]=e;e=nm(d);q[b+4>>2]=e}function gK(b){return hK(q[b>>2],q[b+4>>2])}function iK(b){0==c[jK]<<24>>24&&ou(jK);var d=q[b+4>>2],b=(M[0]=-q[b>>2],t[0]),d=(M[0]=d,t[0])|0,e=kK;l[e>>2]=0|b;l[e+4>>2]=d;return kK}function lK(b){0==c[mK]<<24>>24&&ou(mK);var d=q[b>>2],b=(M[0]=q[b+4>>2],t[0]),d=(M[0]=d,t[0])|0,e=nK;l[e>>2]=0|b;l[e+4>>2]=d;return nK}function oK(){return Wq(8)}function pK(b){var d=Wq(8),e=mm(b);q[d>>2]=e;b=nm(b);q[d+4>>2]=b;return d}function qK(b){0!=(b|0)&&Ls(b)}function rK(){var b,d,e=Wq(64);d=e>>2;l[d]=0;l[d+1]=0;l[d+2]=0;l[d+3]=0;c[e+16]=0;l[d]=7;b=(e+20|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;q[(e+36|0)>>2]=1;q[d+10]=0;c[e+44|0]=0;q[d+12]=0;q[d+13]=0;q[d+14]=2;q[d+15]=.699999988079071;return e}function sK(b){0!=(b|0)&&Ls(b)}function tK(){var b,d,e=Wq(64);d=e>>2;l[d]=0;l[d+1]=0;l[d+2]=0;l[d+3]=0;c[e+16]=0;l[d]=1;var f=e+20|0;b=f>>2;q[d+11]=0;q[d+12]=0;q[d+15]=0;q[d+14]=0;c[e+52|0]=0;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;l[b+4]=0;c[f+20]=0;return e}function uK(b){0!=(b|0)&&Ls(b)}function vK(){var b,d=Wq(64);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;l[b]=4;q[b+5]=-1;q[b+6]=1;q[b+7]=1;q[b+8]=1;q[b+9]=-1;q[b+10]=0;q[b+11]=1;q[b+12]=0;q[b+13]=0;q[b+14]=0;q[b+15]=1;c[d+16|0]=1;return d}function wK(b){0!=(b|0)&&Ls(b)}function xK(){var b,d=Wq(20);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;return d}function yK(b){0!=(b|0)&&Ls(b)}function zK(b,d,e){var f=l[d+4>>2];l[b>>2]=l[d>>2];l[b+4>>2]=f;d=mm(e);q[b+8>>2]=d;e=nm(e);q[b+12>>2]=e}function AK(){return Wq(16)}function BK(b,d){var e=Wq(16),f=l[b+4>>2];l[e>>2]=l[b>>2];l[e+4>>2]=f;var f=e+8|0,g=l[d+4>>2];l[f>>2]=l[d>>2];l[f+4>>2]=g;return e}function CK(b,d){q[b+8>>2]=d}function DK(b,d,e,f){q[b>>2]=d;q[b+4>>2]=e;q[b+8>>2]=f}function EK(b){return q[b+8>>2]}function FK(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function GK(b){return q[b+40>>2]}function HK(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function IK(b,d){q[b+44>>2]=d}function JK(b,d){q[b+36>>2]=d}function KK(b){return q[b+36>>2]}function LK(b){return q[b+44>>2]}function MK(b,d){q[b+40>>2]=d}function NK(b,d,e,f){var g=e>>2,h=d>>2;l[b+8>>2]=d;l[b+12>>2]=e;var d=f|0,e=q[d>>2]-q[h+3],f=f+4|0,j=q[f>>2]-q[h+4],k=q[h+6],m=q[h+5],n=b+20|0,p=(M[0]=k*e+m*j,t[0]),e=(M[0]=e*-m+k*j,t[0])|0;l[n>>2]=0|p;l[n+4>>2]=e;d=q[d>>2]-q[g+3];n=q[f>>2]-q[g+4];p=q[g+6];j=q[g+5];f=b+28|0;e=(M[0]=p*d+j*n,t[0]);d=(M[0]=d*-j+p*n,t[0])|0;l[f>>2]=0|e;l[f+4>>2]=d;q[b+36>>2]=q[g+14]-q[h+14]}function OK(b){return q[b+32>>2]}function PK(b,d){q[b+36>>2]=d}function QK(b){return q[b+28>>2]}function RK(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function SK(b,d){q[b+28>>2]=d}function TK(b,d){q[b+32>>2]=d}function UK(b){return q[b+36>>2]}function VK(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function WK(b){return q[b+36>>2]}function XK(b){return q[b+40>>2]}function YK(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function ZK(b,d){q[b+44>>2]=d}function $K(b){return q[b+44>>2]}function aL(b,d){q[b+36>>2]=d}function bL(b,d){q[b+40>>2]=d}function cL(b,d){l[b+20>>2]=d}function dL(b,d){l[b+24>>2]=d}function eL(b,d){q[b+28>>2]=d}function fL(b){return l[b+20>>2]}function gL(b){return l[b+24>>2]}function hL(b){return q[b+28>>2]}function iL(b,d){l[b+4>>2]=d}function jL(b){return l[b+8>>2]}function kL(b){return l[b>>2]}function lL(b,d){l[b+8>>2]=d}function mL(b){return l[b+12>>2]}function nL(b,d){l[b>>2]=d}function oL(b,d){l[b+12>>2]=d}function pL(b){return l[b+4>>2]}function qL(b,d){var e=b+20|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function rL(b){return q[b+36>>2]}function sL(b,d){var e=b+28|0,f=l[d+4>>2];l[e>>2]=l[d>>2];l[e+4>>2]=f}function tL(b,d){q[b+36>>2]=d}function uL(b){0!=(b|0)&&Ls(b)}function vL(){return Wq(12)}function wL(b,d,e){var f,g=Wq(12);f=g>>2;q[f]=b;q[f+1]=d;q[f+2]=e;return g}function xL(b){0!=(b|0)&&Ls(b)}function yL(){var b,d=Wq(48);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;l[b]=8;b=(d+20|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;l[b+4]=0;l[b+5]=0;l[b+6]=0;return d}function zL(b){0!=(b|0)&&Ls(b)}function AL(){var b,d=Wq(40);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;l[b]=5;q[b+5]=0;q[b+6]=0;q[b+7]=0;q[b+8]=5;q[b+9]=.699999988079071;return d}function BL(b){0!=(b|0)&&Ls(b)}function CL(){var b,d,e=Wq(48);d=e>>2;l[d]=0;l[d+1]=0;l[d+2]=0;l[d+3]=0;c[e+16]=0;l[d]=3;b=(e+20|0)>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;q[(e+36|0)>>2]=1;q[d+10]=0;q[d+11]=0;return e}function DL(b,d,e,f,g){l[b+8>>2]=d;l[b+12>>2]=e;var h=f|0,j=q[h>>2]-q[d+12>>2],f=f+4|0,k=q[f>>2]-q[d+16>>2],m=q[d+24>>2],n=q[d+20>>2],d=b+20|0,p=(M[0]=m*j+n*k,t[0]),j=(M[0]=j*-n+m*k,t[0])|0;l[d>>2]=0|p;l[d+4>>2]=j;j=g|0;k=q[j>>2]-q[e+12>>2];g=g+4|0;m=q[g>>2]-q[e+16>>2];d=q[e+24>>2];n=q[e+20>>2];e=b+28|0;p=(M[0]=d*k+n*m,t[0]);k=(M[0]=k*-n+d*m,t[0])|0;l[e>>2]=0|p;l[e+4>>2]=k;h=q[j>>2]-q[h>>2];f=q[g>>2]-q[f>>2];h=Fh(h*h+f*f);q[b+36>>2]=h}function EL(b){0!=(b|0)&&Ls(b)}function FL(){var b,d=Wq(32);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;l[b]=6;l[b+5]=0;l[b+6]=0;q[b+7]=1;return d}function GL(b){0!=(b|0)&&Ls(b)}function HL(){return Wq(16)}function IL(b){0!=(b|0)&&Ls(b)}function JL(){var b,d=Wq(40);b=d>>2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0;c[d+16]=0;l[b]=10;q[b+5]=-1;q[b+6]=0;q[b+7]=1;q[b+8]=0;q[b+9]=0;return d}function Ne(b){var d,e,f,g,h,j,k,m,n,p,u,r,w,x,y,A,C,z,D,E=245>b>>>0;a:do{if(E){var G=11>b>>>0?16:b+11&-8,H=G>>>3,F=o[Y>>2],I=F>>>(H>>>0);if(0!=(I&3|0)){var J=(I&1^1)+H|0,L=J<<1,O=(L<<2)+Y+40|0,R=(L+2<<2)+Y+40|0,T=o[R>>2],S=T+8|0,U=o[S>>2];(O|0)==(U|0)?l[Y>>2]=F&(1<<J^-1):(U>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[R>>2]=U,l[U+12>>2]=O);var W=J<<3;l[T+4>>2]=W|3;var Q=T+(W|4)|0;l[Q>>2]|=1;var $=S;D=331}else{if(G>>>0>o[Y+8>>2]>>>0){if(0!=(I|0)){var ea=2<<H,sa=I<<H&(ea|-ea),Ba=(sa&-sa)-1|0,oa=Ba>>>12&16,ga=Ba>>>(oa>>>0),qa=ga>>>5&8,la=ga>>>(qa>>>0),Ca=la>>>2&4,ia=la>>>(Ca>>>0),ya=ia>>>1&2,ta=ia>>>(ya>>>0),Ia=ta>>>1&1,na=(qa|oa|Ca|ya|Ia)+(ta>>>(Ia>>>0))|0,Z=na<<1,ba=(Z<<2)+Y+40|0,ca=(Z+2<<2)+Y+40|0,ma=o[ca>>2],ka=ma+8|0,aa=o[ka>>2];(ba|0)==(aa|0)?l[Y>>2]=F&(1<<na^-1):(aa>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[ca>>2]=aa,l[aa+12>>2]=ba);var ra=na<<3,ha=ra-G|0;l[ma+4>>2]=G|3;var za=ma,X=za+G|0;l[za+(G|4)>>2]=ha|1;l[za+ra>>2]=ha;var ua=o[Y+8>>2];if(0!=(ua|0)){var da=l[Y+20>>2],fa=ua>>>2&1073741822,Aa=(fa<<2)+Y+40|0,Qa=o[Y>>2],pa=1<<(ua>>>3);if(0==(Qa&pa|0)){l[Y>>2]=Qa|pa;var cb=Aa,Ra=(fa+2<<2)+Y+40|0}else{var Ta=(fa+2<<2)+Y+40|0,$a=o[Ta>>2];$a>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));cb=$a;Ra=Ta}l[Ra>>2]=da;l[cb+12>>2]=da;l[(da+8|0)>>2]=cb;l[(da+12|0)>>2]=Aa}l[Y+8>>2]=ha;l[Y+20>>2]=X;$=ka;D=331}else{var va=l[Y+4>>2];if(0==(va|0)){mb=G,z=mb>>2,D=155}else{var Wa=(va&-va)-1|0,fb=Wa>>>12&16,gb=Wa>>>(fb>>>0),Xa=gb>>>5&8,Ua=gb>>>(Xa>>>0),Va=Ua>>>2&4,pb=Ua>>>(Va>>>0),nb=pb>>>1&2,La=pb>>>(nb>>>0),qb=La>>>1&1,bb=o[Y+((Xa|fb|Va|nb|qb)+(La>>>(qb>>>0))<<2)+304>>2],Fa=bb,Ma=bb;C=Ma>>2;for(var wa=(l[bb+4>>2]&-8)-G|0;;){var hb=l[Fa+16>>2];if(0==(hb|0)){var Ya=l[Fa+20>>2];if(0==(Ya|0)){break}var Za=Ya}else{Za=hb}var Da=(l[Za+4>>2]&-8)-G|0,Oa=Da>>>0<wa>>>0,ib=Oa?Da:wa,ab=Oa?Za:Ma,Fa=Za,Ma=ab;C=Ma>>2;wa=ib}var Ga=Ma,jb=o[Y+16>>2],Ea=Ga>>>0<jb>>>0;do{if(!Ea){var Pa=Ga+G|0,Ja=Pa;if(Ga>>>0<Pa>>>0){var db=o[C+6],xa=o[C+3],Sa=(xa|0)==(Ma|0);do{if(Sa){var Ka=Ma+20|0,tb=l[Ka>>2];if(0==(tb|0)){var kb=Ma+16|0,ub=l[kb>>2];if(0==(ub|0)){var rb=0;A=rb>>2;break}var Bb=kb,lb=ub}else{Bb=Ka,lb=tb,D=39}for(;;){var yb=lb+20|0,xb=l[yb>>2];if(0!=(xb|0)){Bb=yb,lb=xb}else{var Ib=lb+16|0,wb=o[Ib>>2];if(0==(wb|0)){break}Bb=Ib;lb=wb}}Bb>>>0<jb>>>0&&(KL(),ja("Reached an unreachable!"));l[Bb>>2]=0;rb=lb}else{var vb=o[C+2];vb>>>0<jb>>>0&&(KL(),ja("Reached an unreachable!"));l[vb+12>>2]=xa;l[xa+8>>2]=vb;rb=xa}A=rb>>2}while(0);var zb=0==(db|0);b:do{if(!zb){var Eb=Ma+28|0,Cb=(l[Eb>>2]<<2)+Y+304|0,eb=(Ma|0)==(l[Cb>>2]|0);do{if(eb){l[Cb>>2]=rb;if(0!=(rb|0)){break}l[Y+4>>2]&=1<<l[Eb>>2]^-1;break b}db>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));var sb=db+16|0;(l[sb>>2]|0)==(Ma|0)?l[sb>>2]=rb:l[db+20>>2]=rb;if(0==(rb|0)){break b}}while(0);rb>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));l[A+6]=db;var ob=o[C+4];0!=(ob|0)&&(ob>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[A+4]=ob,l[ob+24>>2]=rb);var Db=o[C+5];0!=(Db|0)&&(Db>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[A+5]=Db,l[Db+24>>2]=rb)}}while(0);if(16>wa>>>0){var Jb=wa+G|0;l[C+1]=Jb|3;var Rb=Jb+(Ga+4)|0;l[Rb>>2]|=1}else{l[C+1]=G|3;l[Ga+(G|4)>>2]=wa|1;l[Ga+wa+G>>2]=wa;var Nb=o[Y+8>>2];if(0!=(Nb|0)){var Ob=o[Y+20>>2],Lb=Nb>>>2&1073741822,Pb=(Lb<<2)+Y+40|0,Mb=o[Y>>2],Yb=1<<(Nb>>>3);if(0==(Mb&Yb|0)){l[Y>>2]=Mb|Yb;var Zb=Pb,ec=(Lb+2<<2)+Y+40|0}else{var Ub=(Lb+2<<2)+Y+40|0,jc=o[Ub>>2];jc>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));Zb=jc;ec=Ub}l[ec>>2]=Ob;l[Zb+12>>2]=Ob;l[Ob+8>>2]=Zb;l[Ob+12>>2]=Pb}l[Y+8>>2]=wa;l[Y+20>>2]=Ja}var Qb=Ma+8|0;if(0==(Qb|0)){mb=G;z=mb>>2;D=155;break a}$=Qb;D=331;break a}}}while(0);KL();ja("Reached an unreachable!")}}}else{var mb=G;z=mb>>2;D=155}}}else{if(4294967231<b>>>0){mb=-1}else{var cc=b+11|0,Fb=cc&-8;y=Fb>>2;var gc=o[Y+4>>2];if(0!=(gc|0)){var wc=-Fb|0,pc=cc>>>8;if(0==(pc|0)){var qc=0}else{if(16777215<Fb>>>0){qc=31}else{var $c=(pc+1048320|0)>>>16&8,Ec=pc<<$c,sc=(Ec+520192|0)>>>16&4,kd=Ec<<sc,wd=(kd+245760|0)>>>16&2,Lc=14-(sc|$c|wd)+(kd<<wd>>>15)|0,qc=Fb>>>((Lc+7|0)>>>0)&1|Lc<<1}}var $b=o[Y+(qc<<2)+304>>2],ac=0==($b|0);b:do{if(ac){var oc=0,tc=wc,Nc=0}else{var ld=31==(qc|0)?0:25-(qc>>>1)|0,Wc=0,ad=wc,Xc=$b;x=Xc>>2;for(var Cc=Fb<<ld,fd=0;;){var md=l[x+1]&-8,nd=md-Fb|0;if(nd>>>0<ad>>>0){if((md|0)==(Fb|0)){oc=Xc;tc=nd;Nc=Xc;break b}var Oc=Xc,gd=nd}else{Oc=Wc,gd=ad}var od=o[x+5],pd=o[((Cc>>>31<<2)+16>>2)+x],Pd=0==(od|0)|(od|0)==(pd|0)?fd:od;if(0==(pd|0)){oc=Oc;tc=gd;Nc=Pd;break b}Wc=Oc;ad=gd;Xc=pd;x=Xc>>2;Cc<<=1;fd=Pd}}}while(0);if(0==(Nc|0)&0==(oc|0)){var Xd=2<<qc,qd=gc&(Xd|-Xd);if(0==(qd|0)){mb=Fb;z=mb>>2;D=155;break}var Qd=(qd&-qd)-1|0,Pc=Qd>>>12&16,Ic=Qd>>>(Pc>>>0),Jc=Ic>>>5&8,fc=Ic>>>(Jc>>>0),hd=fc>>>2&4,xd=fc>>>(hd>>>0),bd=xd>>>1&2,rd=xd>>>(bd>>>0),ye=rd>>>1&1,Yd=l[Y+((Jc|Pc|hd|bd|ye)+(rd>>>(ye>>>0))<<2)+304>>2]}else{Yd=Nc}var Tc=0==(Yd|0);b:do{if(Tc){var xc=tc,bc=oc;w=bc>>2}else{var Ed=Yd;r=Ed>>2;for(var yc=tc,Ac=oc;;){var Zd=(l[r+1]&-8)-Fb|0,$d=Zd>>>0<yc>>>0,cd=$d?Zd:yc,zc=$d?Ed:Ac,kc=o[r+4];if(0!=(kc|0)){Ed=kc}else{var Rd=o[r+5];if(0==(Rd|0)){xc=cd;bc=zc;w=bc>>2;break b}Ed=Rd}r=Ed>>2;yc=cd;Ac=zc}}}while(0);if(0!=(bc|0)&&xc>>>0<(l[Y+8>>2]-Fb|0)>>>0){var Fc=bc;u=Fc>>2;var Qc=o[Y+16>>2],Mc=Fc>>>0<Qc>>>0;do{if(!Mc){var ne=Fc+Fb|0,Sd=ne;if(Fc>>>0<ne>>>0){var Td=o[w+6],Ud=o[w+3],xf=(Ud|0)==(bc|0);do{if(xf){var Fd=bc+20|0,oe=l[Fd>>2];if(0==(oe|0)){var He=bc+16|0,ae=l[He>>2];if(0==(ae|0)){var Gc=0;p=Gc>>2;break}var dd=He,be=ae}else{dd=Fd,be=oe,D=103}for(;;){var pe=be+20|0,Uc=l[pe>>2];if(0!=(Uc|0)){dd=pe,be=Uc}else{var lc=be+16|0,Gd=o[lc>>2];if(0==(Gd|0)){break}dd=lc;be=Gd}}dd>>>0<Qc>>>0&&(KL(),ja("Reached an unreachable!"));l[dd>>2]=0;Gc=be}else{var Hd=o[w+2];Hd>>>0<Qc>>>0&&(KL(),ja("Reached an unreachable!"));l[Hd+12>>2]=Ud;l[Ud+8>>2]=Hd;Gc=Ud}p=Gc>>2}while(0);var Re=0==(Td|0);b:do{if(!Re){var Id=bc+28|0,Jd=(l[Id>>2]<<2)+Y+304|0,qe=(bc|0)==(l[Jd>>2]|0);do{if(qe){l[Jd>>2]=Gc;if(0!=(Gc|0)){break}l[Y+4>>2]&=1<<l[Id>>2]^-1;break b}Td>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));var re=Td+16|0;(l[re>>2]|0)==(bc|0)?l[re>>2]=Gc:l[Td+20>>2]=Gc;if(0==(Gc|0)){break b}}while(0);Gc>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));l[p+6]=Td;var Kd=o[w+4];0!=(Kd|0)&&(Kd>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[p+4]=Kd,l[Kd+24>>2]=Gc);var Se=o[w+5];0!=(Se|0)&&(Se>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[p+5]=Se,l[Se+24>>2]=Gc)}}while(0);var Rf=16>xc>>>0;b:do{if(Rf){var sd=xc+Fb|0;l[w+1]=sd|3;var Vc=sd+(Fc+4)|0;l[Vc>>2]|=1}else{if(l[w+1]=Fb|3,l[((Fb|4)>>2)+u]=xc|1,l[(xc>>2)+u+y]=xc,256>xc>>>0){var Te=xc>>>2&1073741822,Ue=(Te<<2)+Y+40|0,ce=o[Y>>2],Yc=1<<(xc>>>3);if(0==(ce&Yc|0)){l[Y>>2]=ce|Yc;var yd=Ue,$e=(Te+2<<2)+Y+40|0}else{var ze=(Te+2<<2)+Y+40|0,Zc=o[ze>>2];Zc>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));yd=Zc;$e=ze}l[$e>>2]=Sd;l[yd+12>>2]=Sd;l[y+(u+2)]=yd;l[y+(u+3)]=Ue}else{var Ld=ne,Md=xc>>>8;if(0==(Md|0)){var de=0}else{if(16777215<xc>>>0){de=31}else{var zd=(Md+1048320|0)>>>16&8,ee=Md<<zd,yf=(ee+520192|0)>>>16&4,af=ee<<yf,Ie=(af+245760|0)>>>16&2,zf=14-(yf|zd|Ie)+(af<<Ie>>>15)|0,de=xc>>>((zf+7|0)>>>0)&1|zf<<1}}var jf=(de<<2)+Y+304|0;l[y+(u+7)]=de;var bf=Fb+(Fc+16)|0;l[y+(u+5)]=0;l[bf>>2]=0;var Sf=l[Y+4>>2],kf=1<<de;if(0==(Sf&kf|0)){l[Y+4>>2]=Sf|kf,l[jf>>2]=Ld,l[y+(u+6)]=jf,l[y+(u+3)]=Ld,l[y+(u+2)]=Ld}else{for(var Ae=xc<<(31==(de|0)?0:25-(de>>>1)|0),Ad=l[jf>>2];;){if((l[Ad+4>>2]&-8|0)==(xc|0)){var Af=Ad+8|0,Tf=o[Af>>2],Gg=o[Y+16>>2],Hg=Ad>>>0<Gg>>>0;do{if(!Hg&&Tf>>>0>=Gg>>>0){l[Tf+12>>2]=Ld;l[Af>>2]=Ld;l[y+(u+2)]=Tf;l[y+(u+3)]=Ad;l[y+(u+6)]=0;break b}}while(0);KL();ja("Reached an unreachable!")}var ng=(Ae>>>31<<2)+Ad+16|0,og=o[ng>>2];if(0!=(og|0)){Ae<<=1,Ad=og}else{if(ng>>>0>=o[Y+16>>2]>>>0){l[ng>>2]=Ld;l[y+(u+6)]=Ad;l[y+(u+3)]=Ld;l[y+(u+2)]=Ld;break b}KL();ja("Reached an unreachable!")}}}}}}while(0);var pg=bc+8|0;if(0==(pg|0)){mb=Fb;z=mb>>2;D=155;break a}$=pg;D=331;break a}}}while(0);KL();ja("Reached an unreachable!")}}mb=Fb}z=mb>>2;D=155}}while(0);a:do{if(155==D){var Bf=o[Y+8>>2];if(mb>>>0>Bf>>>0){var Uf=o[Y+12>>2];if(mb>>>0<Uf>>>0){var Vf=Uf-mb|0;l[Y+12>>2]=Vf;var Ig=o[Y+24>>2],Jh=Ig;l[Y+24>>2]=Jh+mb|0;l[(Jh+4>>2)+z]=Vf|1;l[Ig+4>>2]=mb|3;$=Ig+8|0}else{if(0==(l[LL>>2]|0)&&0==(l[LL>>2]|0)){var Jg=ML();0==(Jg-1&Jg|0)?(l[LL+8>>2]=Jg,l[LL+4>>2]=Jg,l[LL+12>>2]=-1,l[LL+16>>2]=2097152,l[LL+20>>2]=0,l[Y+440>>2]=0,l[LL>>2]=Math.floor(Date.now()/1e3)&-16^1431655768):(KL(),ja("Reached an unreachable!"))}var Fj=0==(l[Y+440>>2]&4|0);b:do{if(Fj){var Ji=l[Y+24>>2],qg=0==(Ji|0);c:do{if(qg){D=174}else{for(var Kh=Ji,Wf=Y+444|0;;){var Lh=Wf|0,lf=o[Lh>>2];if(lf>>>0<=Kh>>>0){var rg=Wf+4|0;if((lf+l[rg>>2]|0)>>>0>Kh>>>0){break}}var jh=o[Wf+8>>2];if(0==(jh|0)){D=174;break c}Wf=jh}if(0==(Wf|0)){D=174}else{var Mh=l[LL+8>>2],Be=mb+47-l[Y+12>>2]+Mh&-Mh;if(2147483647>Be>>>0){var sg=NL(Be),se=(sg|0)==(l[Lh>>2]+l[rg>>2]|0),Kg=se?sg:-1,fe=se?Be:0,te=Be,ue=sg;D=181}else{var ge=0;D=189}}}}while(0);if(174==D){var mf=NL(0);if(-1==(mf|0)){ge=0,D=189}else{var Ki=l[LL+8>>2],Lg=Ki+(mb+47)&-Ki,tg=mf,kh=l[LL+4>>2],Nh=kh-1|0,ug=0==(Nh&tg|0)?Lg:Lg-tg+(Nh+tg&-kh)|0;if(2147483647>ug>>>0){var Oh=NL(ug),Ph=(Oh|0)==(mf|0),Mg=Ph?ug:0,Kg=Ph?mf:-1,fe=Mg,te=ug,ue=Oh;D=181}else{ge=0,D=189}}}c:do{if(181==D){var Ng=-te|0;if(-1!=(Kg|0)){var Hc=fe;n=Hc>>2;var uc=Kg;m=uc>>2;D=194;break b}var Li=-1!=(ue|0)&2147483647>te>>>0;do{if(Li){if(te>>>0<(mb+48|0)>>>0){var Qh=l[LL+8>>2],Og=mb+47-te+Qh&-Qh;if(2147483647>Og>>>0){if(-1==(NL(Og)|0)){NL(Ng);ge=fe;break c}Pg=Og+te|0}else{Pg=te}}else{var Pg=te}}else{Pg=te}}while(0);if(-1!=(ue|0)){Hc=Pg;n=Hc>>2;uc=ue;m=uc>>2;D=194;break b}l[Y+440>>2]|=4;var Qg=fe;D=191;break b}}while(0);l[Y+440>>2]|=4;Qg=ge}else{Qg=0}D=191}while(0);if(191==D){var Mi=l[LL+8>>2],Rh=Mi+(mb+47)&-Mi;if(2147483647>Rh>>>0){var Rg=NL(Rh),Sh=NL(0);if(-1!=(Sh|0)&-1!=(Rg|0)&Rg>>>0<Sh>>>0){var lh=Sh-Rg|0,Th=lh>>>0>(mb+40|0)>>>0,Ni=Th?lh:Qg,nf=Th?Rg:-1;-1==(nf|0)?D=330:(Hc=Ni,n=Hc>>2,uc=nf,m=uc>>2,D=194)}else{D=330}}else{D=330}}do{if(194==D){var he=l[Y+432>>2]+Hc|0;l[Y+432>>2]=he;he>>>0>o[Y+436>>2]>>>0&&(l[Y+436>>2]=he);var Bd=o[Y+24>>2];k=Bd>>2;var cf=0==(Bd|0);b:do{if(cf){var vg=o[Y+16>>2];0==(vg|0)|uc>>>0<vg>>>0&&(l[Y+16>>2]=uc);l[Y+444>>2]=uc;l[Y+448>>2]=Hc;l[Y+456>>2]=0;l[Y+36>>2]=l[LL>>2];l[Y+32>>2]=-1;for(var Ce=0;;){var Cf=Ce<<1,td=(Cf<<2)+Y+40|0;l[Y+(Cf+3<<2)+40>>2]=td;l[Y+(Cf+2<<2)+40>>2]=td;var Sg=Ce+1|0;if(32==(Sg|0)){break}Ce=Sg}var Gj=uc+8|0,Uh=0==(Gj&7|0)?0:-Gj&7,Oi=Hc-40-Uh|0;l[Y+24>>2]=uc+Uh|0;l[Y+12>>2]=Oi;l[(Uh+4>>2)+m]=Oi|1;l[(Hc-36>>2)+m]=40;l[Y+28>>2]=l[LL+16>>2]}else{var wg=Y+444|0;for(j=wg>>2;0!=(wg|0);){var Vh=o[j],Wh=wg+4|0,Xh=o[Wh>>2];if((uc|0)==(Vh+Xh|0)){if(0!=(l[j+3]&8|0)){break}var Yh=Bd;if(!(Yh>>>0>=Vh>>>0&Yh>>>0<uc>>>0)){break}l[Wh>>2]=Xh+Hc|0;var Hj=l[Y+24>>2],Je=l[Y+12>>2]+Hc|0,Xf=Hj,Yf=Hj+8|0,Zh=0==(Yf&7|0)?0:-Yf&7,Tg=Je-Zh|0;l[Y+24>>2]=Xf+Zh|0;l[Y+12>>2]=Tg;l[(Zh+(Xf+4)|0)>>2]=Tg|1;l[(Je+(Xf+4)|0)>>2]=40;l[Y+28>>2]=l[LL+16>>2];break b}wg=l[j+2];j=wg>>2}uc>>>0<o[Y+16>>2]>>>0&&(l[Y+16>>2]=uc);for(var mh=uc+Hc|0,Df=Y+444|0;;){if(0==(Df|0)){D=293;break}var $h=Df|0;if((l[$h>>2]|0)==(mh|0)){D=218;break}Df=l[Df+8>>2]}do{if(218==D&&0==(l[Df+12>>2]&8|0)){l[$h>>2]=uc;var Ug=Df+4|0;l[Ug>>2]=l[Ug>>2]+Hc|0;var ai=uc+8|0,xg=0==(ai&7|0)?0:-ai&7,Pi=Hc+(uc+8)|0,df=0==(Pi&7|0)?0:-Pi&7;h=df>>2;var nh=uc+df+Hc|0,oh=nh,ph=xg+mb|0;g=ph>>2;var Zf=uc+ph|0,Ve=Zf,of=nh-(uc+xg)-mb|0;l[(xg+4>>2)+m]=mb|3;var Vg=(oh|0)==(l[Y+24>>2]|0);c:do{if(Vg){var bi=l[Y+12>>2]+of|0;l[Y+12>>2]=bi;l[Y+24>>2]=Ve;l[g+(m+1)]=bi|1}else{if((oh|0)==(l[Y+20>>2]|0)){var Wg=l[Y+8>>2]+of|0;l[Y+8>>2]=Wg;l[Y+20>>2]=Ve;l[g+(m+1)]=Wg|1;l[(uc+Wg+ph|0)>>2]=Wg}else{var Xg=Hc+4|0,We=o[(Xg>>2)+m+h];if(1==(We&3|0)){var Qi=We&-8,ef=We>>>3,Ij=256>We>>>0;d:do{if(Ij){var $f=o[((df|8)>>2)+m+n],Ef=o[h+(n+(m+3))];if(($f|0)==(Ef|0)){l[Y>>2]&=1<<ef^-1}else{var qh=((We>>>2&1073741822)<<2)+Y+40|0;D=($f|0)==(qh|0)?233:$f>>>0<o[Y+16>>2]>>>0?236:233;do{if(233==D&&!((Ef|0)!=(qh|0)&&Ef>>>0<o[Y+16>>2]>>>0)){l[$f+12>>2]=Ef;l[Ef+8>>2]=$f;break d}}while(0);KL();ja("Reached an unreachable!")}}else{var ci=nh,ff=o[((df|24)>>2)+m+n],pf=o[h+(n+(m+3))],qf=(pf|0)==(ci|0);do{if(qf){var yg=df|16,zg=uc+Xg+yg|0,Ff=l[zg>>2];if(0==(Ff|0)){var Yg=uc+yg+Hc|0,Zg=l[Yg>>2];if(0==(Zg|0)){var ie=0;f=ie>>2;break}var Gf=Yg,Hf=Zg}else{Gf=zg,Hf=Ff,D=243}for(;;){var rh=Hf+20|0,Ri=l[rh>>2];if(0!=(Ri|0)){Gf=rh,Hf=Ri}else{var Si=Hf+16|0,Jj=o[Si>>2];if(0==(Jj|0)){break}Gf=Si;Hf=Jj}}Gf>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));l[Gf>>2]=0;ie=Hf}else{var di=o[((df|8)>>2)+m+n];di>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));l[di+12>>2]=pf;l[pf+8>>2]=di;ie=pf}f=ie>>2}while(0);if(0!=(ff|0)){var ei=df+(Hc+(uc+28))|0,Qk=(l[ei>>2]<<2)+Y+304|0,xn=(ci|0)==(l[Qk>>2]|0);do{if(xn){l[Qk>>2]=ie;if(0!=(ie|0)){break}l[Y+4>>2]&=1<<l[ei>>2]^-1;break d}ff>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));var Kj=ff+16|0;(l[Kj>>2]|0)==(ci|0)?l[Kj>>2]=ie:l[ff+20>>2]=ie;if(0==(ie|0)){break d}}while(0);ie>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));l[f+6]=ff;var Lj=df|16,Ti=o[(Lj>>2)+m+n];0!=(Ti|0)&&(Ti>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[f+4]=Ti,l[Ti+24>>2]=ie);var Ui=o[(Xg+Lj>>2)+m];0!=(Ui|0)&&(Ui>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[f+5]=Ui,l[Ui+24>>2]=ie)}}}while(0);var Rk=uc+(Qi|df)+Hc|0,Ke=Qi+of|0}else{Rk=oh,Ke=of}var Mj=Rk+4|0;l[Mj>>2]&=-2;l[g+(m+1)]=Ke|1;l[(Ke>>2)+m+g]=Ke;if(256>Ke>>>0){var fi=Ke>>>2&1073741822,Sk=(fi<<2)+Y+40|0,Vi=o[Y>>2],Tk=1<<(Ke>>>3);if(0==(Vi&Tk|0)){l[Y>>2]=Vi|Tk;var Wi=Sk,Nj=(fi+2<<2)+Y+40|0}else{var Oj=(fi+2<<2)+Y+40|0,Pj=o[Oj>>2];Pj>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));Wi=Pj;Nj=Oj}l[Nj>>2]=Ve;l[Wi+12>>2]=Ve;l[g+(m+2)]=Wi;l[g+(m+3)]=Sk}else{var ag=Zf,gi=Ke>>>8;if(0==(gi|0)){var If=0}else{if(16777215<Ke>>>0){If=31}else{var Xi=(gi+1048320|0)>>>16&8,Uk=gi<<Xi,Qj=(Uk+520192|0)>>>16&4,Vk=Uk<<Qj,Wk=(Vk+245760|0)>>>16&2,Yi=14-(Qj|Xi|Wk)+(Vk<<Wk>>>15)|0,If=Ke>>>((Yi+7|0)>>>0)&1|Yi<<1}}var hi=(If<<2)+Y+304|0;l[g+(m+7)]=If;l[g+(m+5)]=0;l[g+(m+4)]=0;var Rj=l[Y+4>>2],Sj=1<<If;if(0==(Rj&Sj|0)){l[Y+4>>2]=Rj|Sj,l[hi>>2]=ag,l[g+(m+6)]=hi,l[g+(m+3)]=ag,l[g+(m+2)]=ag}else{for(var Tj=Ke<<(31==(If|0)?0:25-(If>>>1)|0),$g=l[hi>>2];;){if((l[$g+4>>2]&-8|0)==(Ke|0)){var Xk=$g+8|0,Zi=o[Xk>>2],Yk=o[Y+16>>2],Zk=$g>>>0<Yk>>>0;do{if(!Zk&&Zi>>>0>=Yk>>>0){l[Zi+12>>2]=ag;l[Xk>>2]=ag;l[g+(m+2)]=Zi;l[g+(m+3)]=$g;l[g+(m+6)]=0;break c}}while(0);KL();ja("Reached an unreachable!")}var $i=(Tj>>>31<<2)+$g+16|0,Uj=o[$i>>2];if(0!=(Uj|0)){Tj<<=1,$g=Uj}else{if($i>>>0>=o[Y+16>>2]>>>0){l[$i>>2]=ag;l[g+(m+6)]=$g;l[g+(m+3)]=ag;l[g+(m+2)]=ag;break c}KL();ja("Reached an unreachable!")}}}}}}}while(0);$=uc+(xg|8)|0;break a}}while(0);var ii=Bd,$k=Y+444|0;for(e=$k>>2;;){var aj=o[e];if(aj>>>0<=ii>>>0){var al=o[e+1];if((aj+al|0)>>>0>ii>>>0){var bj=aj,ji=al;break}}var bl=o[e+2];if(0!=(bl|0)){$k=bl,e=$k>>2}else{bj=0;ji=4;break}}var cj=bj+ji|0,Vj=bj+(ji-39)|0,Wj=bj+(ji-47)+(0==(Vj&7|0)?0:-Vj&7)|0,ki=Wj>>>0<(Bd+16|0)>>>0?ii:Wj,pm=ki+8|0;d=pm>>2;var qm=pm,cl=uc+8|0,bg=0==(cl&7|0)?0:-cl&7,li=Hc-40-bg|0;l[Y+24>>2]=uc+bg|0;l[Y+12>>2]=li;l[(bg+4>>2)+m]=li|1;l[(Hc-36>>2)+m]=40;l[Y+28>>2]=l[LL+16>>2];l[ki+4>>2]=27;l[d]=l[Y+444>>2];l[d+1]=l[Y+448>>2];l[d+2]=l[Y+452>>2];l[d+3]=l[Y+456>>2];l[Y+444>>2]=uc;l[Y+448>>2]=Hc;l[Y+456>>2]=0;l[Y+452>>2]=qm;var dl=ki+28|0;l[dl>>2]=7;var rm=(ki+32|0)>>>0<cj>>>0;c:do{if(rm){for(var dj=dl;;){var Xj=dj+4|0;l[Xj>>2]=7;if((dj+8|0)>>>0>=cj>>>0){break c}dj=Xj}}}while(0);if((ki|0)!=(ii|0)){var Le=ki-Bd|0,el=ii+Le|0,Yj=Le+(ii+4)|0;l[Yj>>2]&=-2;l[k+1]=Le|1;l[el>>2]=Le;if(256>Le>>>0){var fl=Le>>>2&1073741822,Zj=(fl<<2)+Y+40|0,Jf=o[Y>>2],gl=1<<(Le>>>3);if(0==(Jf&gl|0)){l[Y>>2]=Jf|gl;var ej=Zj,$j=(fl+2<<2)+Y+40|0}else{var hl=(fl+2<<2)+Y+40|0,sm=o[hl>>2];sm>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));ej=sm;$j=hl}l[$j>>2]=Bd;l[ej+12>>2]=Bd;l[k+2]=ej;l[k+3]=Zj}else{var fj=Bd,il=Le>>>8;if(0==(il|0)){var ah=0}else{if(16777215<Le>>>0){ah=31}else{var jl=(il+1048320|0)>>>16&8,kl=il<<jl,ak=(kl+520192|0)>>>16&4,bk=kl<<ak,ll=(bk+245760|0)>>>16&2,ml=14-(ak|jl|ll)+(bk<<ll>>>15)|0,ah=Le>>>((ml+7|0)>>>0)&1|ml<<1}}var nl=(ah<<2)+Y+304|0;l[k+7]=ah;l[k+5]=0;l[k+4]=0;var sh=l[Y+4>>2],ol=1<<ah;if(0==(sh&ol|0)){l[Y+4>>2]=sh|ol,l[nl>>2]=fj,l[k+6]=nl,l[k+3]=Bd,l[k+2]=Bd}else{for(var mi=Le<<(31==(ah|0)?0:25-(ah>>>1)|0),th=l[nl>>2];;){if((l[th+4>>2]&-8|0)==(Le|0)){var bh=th+8|0,ck=o[bh>>2],pl=o[Y+16>>2],tm=th>>>0<pl>>>0;do{if(!tm&&ck>>>0>=pl>>>0){l[ck+12>>2]=fj;l[bh>>2]=fj;l[k+2]=ck;l[k+3]=th;l[k+6]=0;break b}}while(0);KL();ja("Reached an unreachable!")}var dk=(mi>>>31<<2)+th+16|0,gj=o[dk>>2];if(0!=(gj|0)){mi<<=1,th=gj}else{if(dk>>>0>=o[Y+16>>2]>>>0){l[dk>>2]=fj;l[k+6]=th;l[k+3]=Bd;l[k+2]=Bd;break b}KL();ja("Reached an unreachable!")}}}}}}}while(0);var uh=o[Y+12>>2];if(uh>>>0>mb>>>0){var cg=uh-mb|0;l[Y+12>>2]=cg;var ek=o[Y+24>>2],ni=ek;l[Y+24>>2]=ni+mb|0;l[(ni+4>>2)+z]=cg|1;l[ek+4>>2]=mb|3;$=ek+8|0;break a}}}while(0);l[OL>>2]=12;$=0}}else{var hj=Bf-mb|0,ch=o[Y+20>>2];if(15<hj>>>0){var fk=ch;l[Y+20>>2]=fk+mb|0;l[Y+8>>2]=hj;l[(fk+4>>2)+z]=hj|1;l[fk+Bf>>2]=hj;l[ch+4>>2]=mb|3}else{l[Y+8>>2]=0;l[Y+20>>2]=0;l[ch+4>>2]=Bf|3;var ij=Bf+(ch+4)|0;l[ij>>2]|=1}$=ch+8|0}}}while(0);return $}Module._malloc=Ne;function Dh(b){var d,e,f,g,h,j,k=b>>2,m,n=0==(b|0);a:do{if(!n){var p=b-8|0,u=p,r=o[Y+16>>2],w=p>>>0<r>>>0;b:do{if(!w){var x=o[b-4>>2],y=x&3;if(1!=(y|0)){var A=x&-8;j=A>>2;var C=b+(A-8)|0,z=C,D=0==(x&1|0);c:do{if(D){var E=o[p>>2];if(0==(y|0)){break a}var G=-8-E|0;h=G>>2;var H=b+G|0,F=H,I=E+A|0;if(H>>>0<r>>>0){break b}if((F|0)==(l[Y+20>>2]|0)){g=(b+(A-4)|0)>>2;if(3!=(l[g]&3|0)){var J=F;f=J>>2;var L=I;break}l[Y+8>>2]=I;l[g]&=-2;l[h+(k+1)]=I|1;l[C>>2]=I;break a}if(256>E>>>0){var O=o[h+(k+2)],R=o[h+(k+3)];if((O|0)==(R|0)){l[Y>>2]&=1<<(E>>>3)^-1,J=F,f=J>>2,L=I}else{var T=((E>>>2&1073741822)<<2)+Y+40|0,S=(O|0)!=(T|0)&O>>>0<r>>>0;do{if(!S&&(R|0)==(T|0)|R>>>0>=r>>>0){l[O+12>>2]=R;l[R+8>>2]=O;J=F;f=J>>2;L=I;break c}}while(0);KL();ja("Reached an unreachable!")}}else{var U=H,W=o[h+(k+6)],Q=o[h+(k+3)],$=(Q|0)==(U|0);do{if($){var ea=G+(b+20)|0,sa=l[ea>>2];if(0==(sa|0)){var Ba=G+(b+16)|0,oa=l[Ba>>2];if(0==(oa|0)){var ga=0;e=ga>>2;break}var qa=Ba,la=oa}else{qa=ea,la=sa,m=22}for(;;){var Ca=la+20|0,ia=l[Ca>>2];if(0!=(ia|0)){qa=Ca,la=ia}else{var ya=la+16|0,ta=o[ya>>2];if(0==(ta|0)){break}qa=ya;la=ta}}qa>>>0<r>>>0&&(KL(),ja("Reached an unreachable!"));l[qa>>2]=0;ga=la}else{var Ia=o[h+(k+2)];Ia>>>0<r>>>0&&(KL(),ja("Reached an unreachable!"));l[Ia+12>>2]=Q;l[Q+8>>2]=Ia;ga=Q}e=ga>>2}while(0);if(0!=(W|0)){var na=G+(b+28)|0,Z=(l[na>>2]<<2)+Y+304|0,ba=(U|0)==(l[Z>>2]|0);do{if(ba){l[Z>>2]=ga;if(0!=(ga|0)){break}l[Y+4>>2]&=1<<l[na>>2]^-1;J=F;f=J>>2;L=I;break c}W>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));var ca=W+16|0;(l[ca>>2]|0)==(U|0)?l[ca>>2]=ga:l[W+20>>2]=ga;if(0==(ga|0)){J=F;f=J>>2;L=I;break c}}while(0);ga>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));l[e+6]=W;var ma=o[h+(k+4)];0!=(ma|0)&&(ma>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[e+4]=ma,l[ma+24>>2]=ga);var ka=o[h+(k+5)];0!=(ka|0)&&(ka>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[e+5]=ka,l[ka+24>>2]=ga)}J=F;f=J>>2;L=I}}else{J=u,f=J>>2,L=A}}while(0);var aa=J;if(aa>>>0<C>>>0){var ra=b+(A-4)|0,ha=o[ra>>2];if(0!=(ha&1|0)){var za=0==(ha&2|0);do{if(za){if((z|0)==(l[Y+24>>2]|0)){var X=l[Y+12>>2]+L|0;l[Y+12>>2]=X;l[Y+24>>2]=J;l[f+1]=X|1;(J|0)==(l[Y+20>>2]|0)&&(l[Y+20>>2]=0,l[Y+8>>2]=0);if(X>>>0<=o[Y+28>>2]>>>0){break a}var ua=Ha,da=Ha;if(0==(l[LL>>2]|0)&&0==(l[LL>>2]|0)){var fa=ML();0==(fa-1&fa|0)?(l[LL+8>>2]=fa,l[LL+4>>2]=fa,l[LL+12>>2]=-1,l[LL+16>>2]=2097152,l[LL+20>>2]=0,l[Y+440>>2]=0,l[LL>>2]=Math.floor(Date.now()/1e3)&-16^1431655768):(KL(),ja("Reached an unreachable!"))}c:do{var Aa=o[Y+24>>2];if(0!=(Aa|0)){var Qa=o[Y+12>>2],pa=40<Qa>>>0;do{if(pa){for(var cb=o[LL+8>>2],Ra=(Math.floor(((-41+Qa+cb|0)>>>0)/(cb>>>0))-1)*cb|0,Ta=Aa,$a=Y+444|0,da=$a>>2;;){var va=o[da];if(va>>>0<=Ta>>>0&&(va+l[da+1]|0)>>>0>Ta>>>0){var Wa=$a;break}var fb=o[da+2];if(0==(fb|0)){Wa=0;break}$a=fb;da=$a>>2}if(0==(l[Wa+12>>2]&8|0)){var gb=NL(0),ua=(Wa+4|0)>>2;if((gb|0)==(l[Wa>>2]+l[ua]|0)){var Xa=NL(-(2147483646<Ra>>>0?-2147483648-cb|0:Ra)|0),Ua=NL(0);if(-1!=(Xa|0)&Ua>>>0<gb>>>0){var Va=gb-Ua|0;if((gb|0)!=(Ua|0)){l[ua]=l[ua]-Va|0;l[Y+432>>2]=l[Y+432>>2]-Va|0;var pb=l[Y+24>>2],nb=l[Y+12>>2]-Va|0,La=pb,qb=pb+8|0,bb=0==(qb&7|0)?0:-qb&7,Fa=nb-bb|0;l[Y+24>>2]=La+bb|0;l[Y+12>>2]=Fa;l[(bb+(La+4)|0)>>2]=Fa|1;l[(nb+(La+4)|0)>>2]=40;l[Y+28>>2]=l[LL+16>>2];break c}}}}}}while(0);o[Y+12>>2]>>>0>o[Y+28>>2]>>>0&&(l[Y+28>>2]=-1)}}while(0);break a}if((z|0)==(l[Y+20>>2]|0)){var Ma=l[Y+8>>2]+L|0;l[Y+8>>2]=Ma;l[Y+20>>2]=J;l[f+1]=Ma|1;l[(aa+Ma|0)>>2]=Ma;break a}var wa=(ha&-8)+L|0,hb=ha>>>3,Ya=256>ha>>>0;c:do{if(Ya){var Za=o[k+j],Da=o[((A|4)>>2)+k];if((Za|0)==(Da|0)){l[Y>>2]&=1<<hb^-1}else{var Oa=((ha>>>2&1073741822)<<2)+Y+40|0;m=(Za|0)==(Oa|0)?64:Za>>>0<o[Y+16>>2]>>>0?67:64;do{if(64==m&&!((Da|0)!=(Oa|0)&&Da>>>0<o[Y+16>>2]>>>0)){l[Za+12>>2]=Da;l[Da+8>>2]=Za;break c}}while(0);KL();ja("Reached an unreachable!")}}else{var ib=C,ab=o[j+(k+4)],Ga=o[((A|4)>>2)+k],jb=(Ga|0)==(ib|0);do{if(jb){var Ea=A+(b+12)|0,Pa=l[Ea>>2];if(0==(Pa|0)){var Ja=A+(b+8)|0,db=l[Ja>>2];if(0==(db|0)){var xa=0;d=xa>>2;break}var Sa=Ja,Ka=db}else{Sa=Ea,Ka=Pa,m=74}for(;;){var tb=Ka+20|0,kb=l[tb>>2];if(0!=(kb|0)){Sa=tb,Ka=kb}else{var ub=Ka+16|0,rb=o[ub>>2];if(0==(rb|0)){break}Sa=ub;Ka=rb}}Sa>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));l[Sa>>2]=0;xa=Ka}else{var Bb=o[k+j];Bb>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));l[Bb+12>>2]=Ga;l[Ga+8>>2]=Bb;xa=Ga}d=xa>>2}while(0);if(0!=(ab|0)){var lb=A+(b+20)|0,yb=(l[lb>>2]<<2)+Y+304|0,xb=(ib|0)==(l[yb>>2]|0);do{if(xb){l[yb>>2]=xa;if(0!=(xa|0)){break}l[Y+4>>2]&=1<<l[lb>>2]^-1;break c}ab>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));var Ib=ab+16|0;(l[Ib>>2]|0)==(ib|0)?l[Ib>>2]=xa:l[ab+20>>2]=xa;if(0==(xa|0)){break c}}while(0);xa>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));l[d+6]=ab;var wb=o[j+(k+2)];0!=(wb|0)&&(wb>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[d+4]=wb,l[wb+24>>2]=xa);var vb=o[j+(k+3)];0!=(vb|0)&&(vb>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!")),l[d+5]=vb,l[vb+24>>2]=xa)}}}while(0);l[f+1]=wa|1;l[aa+wa>>2]=wa;if((J|0)!=(l[Y+20>>2]|0)){var zb=wa}else{l[Y+8>>2]=wa;break a}}else{l[ra>>2]=ha&-2,l[f+1]=L|1,zb=l[aa+L>>2]=L}}while(0);if(256>zb>>>0){var Eb=zb>>>2&1073741822,Cb=(Eb<<2)+Y+40|0,eb=o[Y>>2],sb=1<<(zb>>>3);if(0==(eb&sb|0)){l[Y>>2]=eb|sb;var ob=Cb,Db=(Eb+2<<2)+Y+40|0}else{var Jb=(Eb+2<<2)+Y+40|0,Rb=o[Jb>>2];Rb>>>0<o[Y+16>>2]>>>0&&(KL(),ja("Reached an unreachable!"));ob=Rb;Db=Jb}l[Db>>2]=J;l[ob+12>>2]=J;l[f+2]=ob;l[f+3]=Cb;break a}var Nb=J,Ob=zb>>>8;if(0==(Ob|0)){var Lb=0}else{if(16777215<zb>>>0){Lb=31}else{var Pb=(Ob+1048320|0)>>>16&8,Mb=Ob<<Pb,Yb=(Mb+520192|0)>>>16&4,Zb=Mb<<Yb,ec=(Zb+245760|0)>>>16&2,Ub=14-(Yb|Pb|ec)+(Zb<<ec>>>15)|0,Lb=zb>>>((Ub+7|0)>>>0)&1|Ub<<1}}var jc=(Lb<<2)+Y+304|0;l[f+7]=Lb;l[f+5]=0;l[f+4]=0;var Qb=l[Y+4>>2],mb=1<<Lb,cc=0==(Qb&mb|0);c:do{if(cc){l[Y+4>>2]=Qb|mb,l[jc>>2]=Nb,l[f+6]=jc,l[f+3]=J,l[f+2]=J}else{for(var Fb=zb<<(31==(Lb|0)?0:25-(Lb>>>1)|0),gc=l[jc>>2];;){if((l[gc+4>>2]&-8|0)==(zb|0)){var wc=gc+8|0,pc=o[wc>>2],qc=o[Y+16>>2],$c=gc>>>0<qc>>>0;do{if(!$c&&pc>>>0>=qc>>>0){l[pc+12>>2]=Nb;l[wc>>2]=Nb;l[f+2]=pc;l[f+3]=gc;l[f+6]=0;break c}}while(0);KL();ja("Reached an unreachable!")}var Ec=(Fb>>>31<<2)+gc+16|0,sc=o[Ec>>2];if(0!=(sc|0)){Fb<<=1,gc=sc}else{if(Ec>>>0>=o[Y+16>>2]>>>0){l[Ec>>2]=Nb;l[f+6]=gc;l[f+3]=J;l[f+2]=J;break c}KL();ja("Reached an unreachable!")}}}}while(0);var kd=l[Y+32>>2]-1|0;l[Y+32>>2]=kd;if(0!=(kd|0)){break a}for(var wd=Y+452|0;;){var Lc=l[wd>>2];if(0==(Lc|0)){break}wd=Lc+8|0}l[Y+32>>2]=-1;break a}}}}}while(0);KL();ja("Reached an unreachable!")}}while(0)}Module._free=Dh;function Ls(b){0!=(b|0)&&Dh(b)}function Wq(b){for(b=0==(b|0)?1:b;;){var d=Ne(b);if(0==(d|0)){d=(Nd=l[PL>>2],l[PL>>2]=Nd,Nd);if(0==(d|0)){var e;e=Ne(4);l[e>>2]=QL+8|0;var f=RL;if(!SL){try{l[TL>>2]=0}catch(g){}try{l[UL>>2]=1}catch(h){}try{l[VL>>2]=2}catch(j){}SL=Na}Module.gc("Compiled code throwing an exception, "+[e,f,32]+", at "+Error().stack);l[WL>>2]=e;l[WL+4>>2]=f;l[WL+8>>2]=32;"uncaught_exception"in XL?XL.jc++:XL.jc=1;ja(e);ja("Reached an unreachable!")}K[d]()}else{return d}}return Ab}var un=Ab;function Ch(b,d,e){if(20<=e&&d%2==b%2){if(d%4==b%4){for(e=d+e;d%4;){c[b++]=c[d++]}for(var d=d>>2,b=b>>2,f=e>>2;d<f;){l[b++]=l[d++]}d<<=2;for(b<<=2;d<e;){c[b++]=c[d++]}}else{e=d+e;d%2&&(c[b++]=c[d++]);d>>=1;b>>=1;for(f=e>>1;d<f;){i[b++]=i[d++]}d<<=1;b<<=1;d<e&&(c[b++]=c[d++])}}else{for(;e--;){c[b++]=c[d++]}}}var Fh=Math.sqrt;function P(b,d,e,f){ja("Assertion failed: "+we(f)+", at: "+[we(b),d,we(e)])}function Oe(b,d){var e=0;if(20<=d){for(var f=b+d;b%4;){c[b++]=e}0>e&&(e+=256);for(var g=b>>2,h=f>>2,j=e|e<<8|e<<16|e<<24;g<h;){l[g++]=j}for(b=g<<2;b<f;){c[b++]=e}}else{for(;d--;){c[b++]=e}}}var mm=Math.sin,nm=Math.cos,Vp=Math.floor,YL=13,ZL=9,$L=22,aM=5,bM=21,cM=6;function dM(b){OL||(OL=B([0],"i32",v));l[OL>>2]=b}var OL,eM=0,tn=0,fM=0,gM=2,wn=[Ab],hM=Na;function iM(b,d){if("string"!==typeof b){return Ab}d===Ha&&(d="/");b&&"/"==b[0]&&(d="");for(var e=(d+"/"+b).split("/").reverse(),f=[""];e.length;){var g=e.pop();""==g||"."==g||(".."==g?1<f.length&&f.pop():f.push(g))}return 1==f.length?"/":f.join("/")}function jM(b,d,e){var f={Mh:Gb,eb:Gb,error:0,name:Ab,path:Ab,object:Ab,dc:Gb,fc:Ab,ec:Ab},b=iM(b);if("/"==b){f.Mh=Na,f.eb=f.dc=Na,f.name="/",f.path=f.fc="/",f.object=f.ec=kM}else{if(b!==Ab){for(var e=e||0,b=b.slice(1).split("/"),g=kM,h=[""];b.length;){1==b.length&&g.W&&(f.dc=Na,f.fc=1==h.length?"/":h.join("/"),f.ec=g,f.name=b[0]);var j=b.shift();if(g.W){if(g.ic){if(!g.u.hasOwnProperty(j)){f.error=2;break}}else{f.error=YL;break}}else{f.error=20;break}g=g.u[j];if(g.link&&!(d&&0==b.length)){if(40<e){f.error=40;break}f=iM(g.link,h.join("/"));f=jM([f].concat(b).join("/"),d,e+1);break}h.push(j);0==b.length&&(f.eb=Na,f.path=h.join("/"),f.object=g)}}}return f}function lM(b){mM();b=jM(b,Ha);if(b.eb){return b.object}dM(b.error);return Ab}function nM(b,d,e,f,g){b||(b="/");"string"===typeof b&&(b=lM(b));b||(dM(YL),ja(Error("Parent path must exist.")));b.W||(dM(20),ja(Error("Parent must be a folder.")));!b.write&&!hM&&(dM(YL),ja(Error("Parent folder must be writeable.")));if(!d||"."==d||".."==d){dM(2),ja(Error("Name must not be empty."))}b.u.hasOwnProperty(d)&&(dM(17),ja(Error("Can't overwrite object.")));b.u[d]={ic:f===Ha?Na:f,write:g===Ha?Gb:g,timestamp:Date.now(),Lh:gM++};for(var h in e){e.hasOwnProperty(h)&&(b.u[d][h]=e[h])}return b.u[d]}function oM(b,d,e,f){return nM(b,d,{W:Na,P:Gb,u:{}},e,f)}function pM(b,d,e,f){b=lM(b);b===Ab&&ja(Error("Invalid parent."));for(d=d.split("/").reverse();d.length;){var g=d.pop();g&&(b.u.hasOwnProperty(g)||oM(b,g,e,f),b=b.u[g])}return b}function qM(b,d,e,f,g){e.W=Gb;return nM(b,d,e,f,g)}function rM(b,d,e,f,g){if("string"===typeof e){for(var h=Array(e.length),j=0,k=e.length;j<k;++j){h[j]=e.charCodeAt(j)}e=h}e={P:Gb,u:e.subarray?e.subarray(0):e};return qM(b,d,e,f,g)}function sM(b,d,e,f){!e&&!f&&ja(Error("A device must have at least one callback defined."));return qM(b,d,{P:Na,input:e,X:f},Boolean(e),Boolean(f))}function mM(){kM||(kM={ic:Na,write:Na,W:Na,P:Gb,timestamp:Date.now(),Lh:1,u:{}})}var tM,kM;function vn(b,d,e){var f=wn[b];if(f){if(f.Da){if(0>e){return dM($L),-1}if(f.object.P){if(f.object.X){for(var g=0;g<e;g++){try{f.object.X(c[d+g])}catch(h){return dM(aM),-1}}f.object.timestamp=Date.now();return g}dM(cM);return-1}g=f.position;b=wn[b];if(!b||b.object.P){dM(ZL),d=-1}else{if(b.Da){if(b.object.W){dM(bM),d=-1}else{if(0>e||0>g){dM($L),d=-1}else{for(var j=b.object.u;j.length<g;){j.push(0)}for(var k=0;k<e;k++){j[g+k]=ed[d+k]}b.object.timestamp=Date.now();d=k}}}else{dM(YL),d=-1}}-1!=d&&(f.position+=d);return d}dM(YL);return-1}dM(ZL);return-1}var hK=Math.atan2;function ou(b){c[b]||(c[b]=1)}function KL(){ja("abort() at "+Error().stack)}function ML(){switch(8){case 8:return Pe;case 54:case 56:case 21:case 61:case 63:case 22:case 67:case 23:case 24:case 25:case 26:case 27:case 69:case 28:case 101:case 70:case 71:case 29:case 30:case 199:case 75:case 76:case 32:case 43:case 44:case 80:case 46:case 47:case 45:case 48:case 49:case 42:case 82:case 33:case 7:case 108:case 109:case 107:case 112:case 119:case 121:return 200809;case 13:case 104:case 94:case 95:case 34:case 35:case 77:case 81:case 83:case 84:case 85:case 86:case 87:case 88:case 89:case 90:case 91:case 94:case 95:case 110:case 111:case 113:case 114:case 115:case 116:case 117:case 118:case 120:case 40:case 16:case 79:case 19:return-1;case 92:case 93:case 5:case 72:case 6:case 74:case 92:case 93:case 96:case 97:case 98:case 99:case 102:case 103:case 105:return 1;case 38:case 66:case 50:case 51:case 4:return 1024;case 15:case 64:case 41:return 32;case 55:case 37:case 17:return 2147483647;case 18:case 1:return 47839;case 59:case 57:return 99;case 68:case 58:return 2048;case 0:return 2097152;case 3:return 65536;case 14:return 32768;case 73:return 32767;case 39:return 16384;case 60:return 1e3;case 106:return 700;case 52:return 256;case 62:return 255;case 2:return 100;case 65:return 64;case 36:return 20;case 100:return 16;case 20:return 6;case 53:return 4}dM($L);return-1}function NL(b){uM||(Rc=Rc+4095>>12<<12,uM=Na);var d=Rc;0!=b&&Kc(b);return d}var uM;function XL(){return!!XL.jc}var SL,vM=Gb,wM,xM,yM,zM;vf.unshift({fb:(function(){if(!Module.noFSInit&&!tM){var b,d,e,f=(function(b){b===Ab||10===b?(d.Ea(d.buffer.join("")),d.buffer=[]):d.buffer.push(k.hc(b))});rc(!tM,"FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");tM=Na;mM();b=b||Module.stdin;d=d||Module.stdout;e=e||Module.stderr;var g=Na,h=Na,j=Na;b||(g=Gb,b=(function(){if(!b.cb||!b.cb.length){var d;"undefined"!=typeof window&&"function"==typeof window.prompt?(d=window.prompt("Input: "),d===Ab&&(d=String.fromCharCode(0))):"function"==typeof readline&&(d=readline());d||(d="");b.cb=hf(d+"\n",Na)}return b.cb.shift()}));var k=new Bc;d||(h=Gb,d=f);d.Ea||(d.Ea=Module.print);d.buffer||(d.buffer=[]);e||(j=Gb,e=f);e.Ea||(e.Ea=Module.print);e.buffer||(e.buffer=[]);try{oM("/","tmp",Na,Na)}catch(m){}var f=oM("/","dev",Na,Na),n=sM(f,"stdin",b),p=sM(f,"stdout",Ab,d);e=sM(f,"stderr",Ab,e);sM(f,"tty",b,d);wn[1]={path:"/dev/stdin",object:n,position:0,bc:Na,Da:Gb,ac:Gb,cc:!g,error:Gb,$b:Gb,kc:[]};wn[2]={path:"/dev/stdout",object:p,position:0,bc:Gb,Da:Na,ac:Gb,cc:!h,error:Gb,$b:Gb,kc:[]};wn[3]={path:"/dev/stderr",object:e,position:0,bc:Gb,Da:Na,ac:Gb,cc:!j,error:Gb,$b:Gb,kc:[]};eM=B([1],"void*",Ge);tn=B([2],"void*",Ge);fM=B([3],"void*",Ge);pM("/","dev/shm/tmp",Na,Na);for(g=wn.length;g<Math.max(eM,tn,fM)+4;g++){wn[g]=Ab}wn[eM]=wn[1];wn[tn]=wn[2];wn[fM]=wn[3];B([B([0,0,0,0,eM,0,0,0,tn,0,0,0,fM,0,0,0],"void*",v)],"void*",v)}})});wf.push({fb:(function(){hM=Gb})});Mf.push({fb:(function(){tM&&(wn[2]&&0<wn[2].object.X.buffer.length&&wn[2].object.X(10),wn[3]&&0<wn[3].object.X.buffer.length&&wn[3].object.X(10))})});Module.FS_createFolder=oM;Module.FS_createPath=pM;Module.FS_createDataFile=rM;Module.FS_createPreloadedFile=(function(b,d,e,f,g,h,j){function k(b){return{jpg:"image/jpeg",png:"image/png",bmp:"image/bmp",ogg:"audio/ogg",wav:"audio/wav",mp3:"audio/mpeg"}[b.substr(-3)]}function m(e){function k(e){rM(b,d,e,f,g);h&&h();Dg("cp "+p)}var m=Gb;Module.preloadPlugins.forEach((function(b){!m&&b.canHandle(p)&&(b.handle(e,p,k,(function(){j&&j();Dg("cp "+p)})),m=Na)}));m||k(e)}if(!wM){wM=Na;try{new Blob,xM=Na}catch(n){xM=Gb,console.log("warning: no blob constructor, cannot create blobs with mimetypes")}yM="undefined"!=typeof MozBlobBuilder?MozBlobBuilder:"undefined"!=typeof WebKitBlobBuilder?WebKitBlobBuilder:!xM?console.log("warning: no BlobBuilder"):Ab;zM="undefined"!=typeof window?window.URL?window.URL:window.webkitURL:console.log("warning: cannot create object URLs");Module.preloadPlugins||(Module.preloadPlugins=[]);Module.preloadPlugins.push({canHandle:(function(b){return b.substr(-4)in{".jpg":1,".png":1,".bmp":1}}),handle:(function(b,d,e,f){var g=Ab;if(xM){try{g=new Blob([b],{type:k(d)})}catch(h){var j="Blob constructor present but fails: "+h+"; falling back to blob builder";vc||(vc={});vc[j]||(vc[j]=1,Module.gc(j))}}g||(g=new yM,g.append((new Uint8Array(b)).buffer),g=g.getBlob());var m=zM.createObjectURL(g),n=new Image;n.onload=(function(){rc(n.complete,"Image "+d+" could not be decoded");var f=document.createElement("canvas");f.width=n.width;f.height=n.height;f.getContext("2d").drawImage(n,0,0);Module.preloadedImages[d]=f;zM.revokeObjectURL(m);e&&e(b)});n.onerror=(function(){console.log("Image "+m+" could not be decoded");f&&f()});n.src=m})});Module.preloadPlugins.push({canHandle:(function(b){return b.substr(-4)in{".ogg":1,".wav":1,".mp3":1}}),handle:(function(b,d,e,f){function g(f){h||(h=Na,Module.preloadedAudios[d]=f,e&&e(b))}var h=Gb;if(xM){var f=new Blob([b],{type:k(d)}),f=zM.createObjectURL(f),j=new Audio;j.addEventListener("canplaythrough",(function(){g(j)}),Gb);j.onerror=(function(){if(!h){console.log("warning: browser could not fully decode audio "+d+", trying slower base64 approach");for(var e="",f=0,k=0,m=0;m<b.length;m++){f=f<<8|b[m];for(k+=8;6<=k;){var n=f>>k-6&63,k=k-6,e=e+"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[n]}}2==k?(e+="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(f&3)<<4],e+="=="):4==k&&(e+="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[(f&15)<<2],e+="=");j.src="data:audio/x-"+d.substr(-3)+";base64,"+e;g(j)}});j.src=f}else{Module.preloadedAudios[d]=new Audio,f&&f()}})})}for(var p,u=[b,d],r=u[0],w=1;w<u.length;w++){"/"!=r[r.length-1]&&(r+="/"),r+=u[w]}"/"==r[0]&&(r=r.substr(1));p=r;mg("cp "+p);if("string"==typeof e){var x=j,y=(function(){x?x():ja('Loading data file "'+e+'" failed.')}),A=new XMLHttpRequest;A.open("GET",e,Na);A.responseType="arraybuffer";A.onload=(function(){if(200==A.status){var b=A.response;rc(b,'Loading data file "'+e+'" failed (no arrayBuffer).');b=new Uint8Array(b);m(b);Dg("al "+e)}else{y()}});A.onerror=y;A.send(Ab);mg("al "+e)}else{m(e)}});Module.FS_createLazyFile=(function(b,d,e,f,g){return qM(b,d,{P:Gb,url:e},f,g)});Module.FS_createLink=(function(b,d,e,f,g){return qM(b,d,{P:Gb,link:e},f,g)});Module.FS_createDevice=sM;dM(0);var WL=B(12,"void*",v);Module.requestFullScreen=(function(){function b(){}function d(){var b=Gb;if((document.webkitFullScreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.mozFullscreenElement||document.fullScreenElement||document.fullscreenElement)===e){e.Qh=e.requestPointerLock||e.mozRequestPointerLock||e.webkitRequestPointerLock,e.Qh(),b=Na}if(Module.onFullScreen){Module.onFullScreen(b)}}var e=Module.canvas;document.addEventListener("fullscreenchange",d,Gb);document.addEventListener("mozfullscreenchange",d,Gb);document.addEventListener("webkitfullscreenchange",d,Gb);document.addEventListener("pointerlockchange",b,Gb);document.addEventListener("mozpointerlockchange",b,Gb);document.addEventListener("webkitpointerlockchange",b,Gb);e.Ph=e.requestFullScreen||e.mozRequestFullScreen||(e.webkitRequestFullScreen?(function(){e.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT)}):Ab);e.Ph()});Module.requestAnimationFrame=(function(b){window.requestAnimationFrame||(window.requestAnimationFrame=window.requestAnimationFrame||window.mozRequestAnimationFrame||window.webkitRequestAnimationFrame||window.msRequestAnimationFrame||window.oRequestAnimationFrame||window.setTimeout);window.requestAnimationFrame(b)});Module.pauseMainLoop=Hb();Module.resumeMainLoop=(function(){vM&&(vM=Gb,Ab())});Module.Kh=(function(b){function d(){for(var b=0;3>b;b++){f.push(0)}}var e=b.length+1,f=[B(hf("/bin/this.program"),"i8",v)];d();for(var g=0;g<e-1;g+=1){f.push(B(hf(b[g]),"i8",v)),d()}f.push(0);f=B(f,"i32",v);return _main(e,f,0)});var Cj,Ej,Ak,Up,Yp,Zp,Wp,Xp,zy,AM,BM,Xw,CM,yF,DM,pF,EM,sn,rn,xp,FM,GM,Dj,vf=vf.concat([]),yp,zp,zx,HM,IM,JM,KM,LM,MM,NM,OM,PM,QM,op,np,RM,SM,TM,UM,VM,WM,XM,YM,ZM,Fp,$M,aN,Np,bN,cq,cN,Ep,dq,dN,eq,eN,gq,fN,Ip,gN,Op,hN,Mp,iN,hq,jN,pu,nu,gx,fx,kx,jx,nx,mx,KF,JF,vG,uG,yG,xG,CG,BG,FG,EG,IG,HG,MG,LG,xI,wI,CI,BI,II,HI,kK,jK,nK,mK,kN,lN,mN,nN,oN,pN,UL,qN,rN,sN,tN,uN,vN,wN,xN,yN,zN,AN,BN,CN,DN,EN,FN,GN,HN,IN,JN,KN,LN,MN,NN,ON,PN,QN,RN,SN,TN,UN,VN,WN,XN,YN,ZN,$N,aO,bO,cO,dO,eO,fO,gO,hO,iO,jO,kO,lO,mO,nO,oO,pO,qO,rO,sO,tO,uO,vO,wO,xO,yO,zO,AO,BO,CO,DO,EO,FO,VL,GO,HO,IO,TL,JO,KO,Y,LL,PL,QL,LO,RL,MO;N.Pe=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,67,111,108,108,105,100,101,69,100,103,101,46,99,112,112,0],"i8",v);N.je=B([118,111,105,100,32,98,50,67,111,108,108,105,100,101,69,100,103,101,65,110,100,67,105,114,99,108,101,40,98,50,77,97,110,105,102,111,108,100,32,42,44,32,99,111,110,115,116,32,98,50,69,100,103,101,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,99,111,110,115,116,32,98,50,67,105,114,99,108,101,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,41,0],"i8",v);N.Qe=B([100,101,110,32,62,32,48,46,48,102,0],"i8",v);N.Ib=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,67,111,108,108,105,100,101,80,111,108,121,103,111,110,46,99,112,112,0],"i8",v);N.le=B([118,111,105,100,32,98,50,70,105,110,100,73,110,99,105,100,101,110,116,69,100,103,101,40,98,50,67,108,105,112,86,101,114,116,101,120,32,42,44,32,99,111,110,115,116,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,44,32,99,111,110,115,116,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,41,0],"i8",v);N.Eb=B([48,32,60,61,32,101,100,103,101,49,32,38,38,32,101,100,103,101,49,32,60,32,112,111,108,121,49,45,62,109,95,118,101,114,116,101,120,67,111,117,110,116,0],"i8",v);N.ke=B([102,108,111,97,116,51,50,32,98,50,69,100,103,101,83,101,112,97,114,97,116,105,111,110,40,99,111,110,115,116,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,44,32,99,111,110,115,116,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,41,0],"i8",v);Cj=B(4,"i32",v);Ej=B(4,"i32",v);Ak=B(4,"i32",v);N.s=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,68,105,115,116,97,110,99,101,46,99,112,112,0],"i8",v);N.ob=B([118,111,105,100,32,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,58,58,83,101,116,40,99,111,110,115,116,32,98,50,83,104,97,112,101,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.Gf=B([48,32,60,61,32,105,110,100,101,120,32,38,38,32,105,110,100,101,120,32,60,32,99,104,97,105,110,45,62,109,95,99,111,117,110,116,0],"i8",v);N.he=B([118,111,105,100,32,98,50,68,105,115,116,97,110,99,101,40,98,50,68,105,115,116,97,110,99,101,79,117,116,112,117,116,32,42,44,32,98,50,83,105,109,112,108,101,120,67,97,99,104,101,32,42,44,32,99,111,110,115,116,32,98,50,68,105,115,116,97,110,99,101,73,110,112,117,116,32,42,41,0],"i8",v);N.Ma=B([102,108,111,97,116,51,50,32,98,50,83,105,109,112,108,101,120,58,58,71,101,116,77,101,116,114,105,99,40,41,32,99,111,110,115,116,0],"i8",v);N.zb=B([118,111,105,100,32,98,50,83,105,109,112,108,101,120,58,58,71,101,116,87,105,116,110,101,115,115,80,111,105,110,116,115,40,98,50,86,101,99,50,32,42,44,32,98,50,86,101,99,50,32,42,41,32,99,111,110,115,116,0],"i8",v);N.i=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,68,105,115,116,97,110,99,101,46,104,0],"i8",v);N.h=B([99,111,110,115,116,32,98,50,86,101,99,50,32,38,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,58,58,71,101,116,86,101,114,116,101,120,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.j=B([48,32,60,61,32,105,110,100,101,120,32,38,38,32,105,110,100,101,120,32,60,32,109,95,99,111,117,110,116,0],"i8",v);N.Oe=B([98,50,86,101,99,50,32,98,50,83,105,109,112,108,101,120,58,58,71,101,116,83,101,97,114,99,104,68,105,114,101,99,116,105,111,110,40,41,32,99,111,110,115,116,0],"i8",v);N.oa=B([98,50,86,101,99,50,32,98,50,83,105,109,112,108,101,120,58,58,71,101,116,67,108,111,115,101,115,116,80,111,105,110,116,40,41,32,99,111,110,115,116,0],"i8",v);N.Fe=B([118,111,105,100,32,98,50,83,105,109,112,108,101,120,58,58,82,101,97,100,67,97,99,104,101,40,99,111,110,115,116,32,98,50,83,105,109,112,108,101,120,67,97,99,104,101,32,42,44,32,99,111,110,115,116,32,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,99,111,110,115,116,32,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,41,0],"i8",v);N.gh=B([99,97,99,104,101,45,62,99,111,117,110,116,32,60,61,32,51,0],"i8",v);N.c=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,68,121,110,97,109,105,99,84,114,101,101,46,99,112,112,0],"i8",v);N.ne=B([105,110,116,51,50,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,65,108,108,111,99,97,116,101,78,111,100,101,40,41,0],"i8",v);N.cf=B([109,95,110,111,100,101,67,111,117,110,116,32,61,61,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.G=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,70,114,101,101,78,111,100,101,40,105,110,116,51,50,41,0],"i8",v);N.Z=B([48,32,60,61,32,110,111,100,101,73,100,32,38,38,32,110,111,100,101,73,100,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Ba=B([48,32,60,32,109,95,110,111,100,101,67,111,117,110,116,0],"i8",v);N.kb=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,68,101,115,116,114,111,121,80,114,111,120,121,40,105,110,116,51,50,41,0],"i8",v);N.Tb=B([109,95,110,111,100,101,115,91,112,114,111,120,121,73,100,93,46,73,115,76,101,97,102,40,41,0],"i8",v);N.lb=B([98,111,111,108,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,77,111,118,101,80,114,111,120,121,40,105,110,116,51,50,44,32,99,111,110,115,116,32,98,50,65,65,66,66,32,38,44,32,99,111,110,115,116,32,98,50,86,101,99,50,32,38,41,0],"i8",v);N.jb=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,73,110,115,101,114,116,76,101,97,102,40,105,110,116,51,50,41,0],"i8",v);N.ph=B([99,104,105,108,100,49,32,33,61,32,40,45,49,41,0],"i8",v);N.uh=B([99,104,105,108,100,50,32,33,61,32,40,45,49,41,0],"i8",v);N.v=B([105,110,116,51,50,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,66,97,108,97,110,99,101,40,105,110,116,51,50,41,0],"i8",v);N.xh=B([105,65,32,33,61,32,40,45,49,41,0],"i8",v);N.Dh=B([48,32,60,61,32,105,66,32,38,38,32,105,66,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Re=B([48,32,60,61,32,105,67,32,38,38,32,105,67,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Xe=B([48,32,60,61,32,105,70,32,38,38,32,105,70,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.ff=B([48,32,60,61,32,105,71,32,38,38,32,105,71,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.of=B([109,95,110,111,100,101,115,91,67,45,62,112,97,114,101,110,116,93,46,99,104,105,108,100,50,32,61,61,32,105,65,0],"i8",v);N.tf=B([48,32,60,61,32,105,68,32,38,38,32,105,68,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.wf=B([48,32,60,61,32,105,69,32,38,38,32,105,69,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Cf=B([109,95,110,111,100,101,115,91,66,45,62,112,97,114,101,110,116,93,46,99,104,105,108,100,50,32,61,61,32,105,65,0],"i8",v);N.Je=B([105,110,116,51,50,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,67,111,109,112,117,116,101,72,101,105,103,104,116,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.N=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,86,97,108,105,100,97,116,101,83,116,114,117,99,116,117,114,101,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.Jf=B([109,95,110,111,100,101,115,91,105,110,100,101,120,93,46,112,97,114,101,110,116,32,61,61,32,40,45,49,41,0],"i8",v);N.Hb=B([99,104,105,108,100,50,32,61,61,32,40,45,49,41,0],"i8",v);N.Jb=B([110,111,100,101,45,62,104,101,105,103,104,116,32,61,61,32,48,0],"i8",v);N.Kb=B([48,32,60,61,32,99,104,105,108,100,49,32,38,38,32,99,104,105,108,100,49,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Lb=B([48,32,60,61,32,99,104,105,108,100,50,32,38,38,32,99,104,105,108,100,50,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.ag=B([109,95,110,111,100,101,115,91,99,104,105,108,100,49,93,46,112,97,114,101,110,116,32,61,61,32,105,110,100,101,120,0],"i8",v);N.hg=B([109,95,110,111,100,101,115,91,99,104,105,108,100,50,93,46,112,97,114,101,110,116,32,61,61,32,105,110,100,101,120,0],"i8",v);N.M=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,86,97,108,105,100,97,116,101,77,101,116,114,105,99,115,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.kg=B([110,111,100,101,45,62,104,101,105,103,104,116,32,61,61,32,104,101,105,103,104,116,0],"i8",v);N.og=B([97,97,98,98,46,108,111,119,101,114,66,111,117,110,100,32,61,61,32,110,111,100,101,45,62,97,97,98,98,46,108,111,119,101,114,66,111,117,110,100,0],"i8",v);N.sg=B([97,97,98,98,46,117,112,112,101,114,66,111,117,110,100,32,61,61,32,110,111,100,101,45,62,97,97,98,98,46,117,112,112,101,114,66,111,117,110,100,0],"i8",v);N.La=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,86,97,108,105,100,97,116,101,40,41,32,99,111,110,115,116,0],"i8",v);N.zg=B([48,32,60,61,32,102,114,101,101,73,110,100,101,120,32,38,38,32,102,114,101,101,73,110,100,101,120,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Ag=B([71,101,116,72,101,105,103,104,116,40,41,32,61,61,32,67,111,109,112,117,116,101,72,101,105,103,104,116,40,41,0],"i8",v);N.Cg=B([109,95,110,111,100,101,67,111,117,110,116,32,43,32,102,114,101,101,67,111,117,110,116,32,61,61,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.Ka=B([105,110,116,51,50,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,71,101,116,77,97,120,66,97,108,97,110,99,101,40,41,32,99,111,110,115,116,0],"i8",v);N.Ya=B([110,111,100,101,45,62,73,115,76,101,97,102,40,41,32,61,61,32,102,97,108,115,101,0],"i8",v);Up=B(4,"i32",v);Yp=B(4,"i32",v);Zp=B(4,"i32",v);Wp=B(4,"i32",v);Xp=B(4,"i32",v);N.Ca=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,84,105,109,101,79,102,73,109,112,97,99,116,46,99,112,112,0],"i8",v);N.ie=B([118,111,105,100,32,98,50,84,105,109,101,79,102,73,109,112,97,99,116,40,98,50,84,79,73,79,117,116,112,117,116,32,42,44,32,99,111,110,115,116,32,98,50,84,79,73,73,110,112,117,116,32,42,41,0],"i8",v);N.rf=B([116,97,114,103,101,116,32,62,32,116,111,108,101,114,97,110,99,101,0],"i8",v);N.Ne=B([102,108,111,97,116,51,50,32,98,50,83,101,112,97,114,97,116,105,111,110,70,117,110,99,116,105,111,110,58,58,69,118,97,108,117,97,116,101,40,105,110,116,51,50,44,32,105,110,116,51,50,44,32,102,108,111,97,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.Me=B([102,108,111,97,116,51,50,32,98,50,83,101,112,97,114,97,116,105,111,110,70,117,110,99,116,105,111,110,58,58,70,105,110,100,77,105,110,83,101,112,97,114,97,116,105,111,110,40,105,110,116,51,50,32,42,44,32,105,110,116,51,50,32,42,44,32,102,108,111,97,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.se=B([102,108,111,97,116,51,50,32,98,50,83,101,112,97,114,97,116,105,111,110,70,117,110,99,116,105,111,110,58,58,73,110,105,116,105,97,108,105,122,101,40,99,111,110,115,116,32,98,50,83,105,109,112,108,101,120,67,97,99,104,101,32,42,44,32,99,111,110,115,116,32,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,32,42,44,32,99,111,110,115,116,32,98,50,83,119,101,101,112,32,38,44,32,99,111,110,115,116,32,98,50,68,105,115,116,97,110,99,101,80,114,111,120,121,32,42,44,32,99,111,110,115,116,32,98,50,83,119,101,101,112,32,38,44,32,102,108,111,97,116,51,50,41,0],"i8",v);N.kh=B([48,32,60,32,99,111,117,110,116,32,38,38,32,99,111,117,110,116,32,60,32,51,0],"i8",v);zy=B([0,0,0,0,0,0,0,0,34,0,0,0,36,0,0,0,38,0,0,0,40,0,0,0,42,0,0,0,44,0,0,0,46,0,0,0,48,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.F=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,83,104,97,112,101,115,47,98,50,67,104,97,105,110,83,104,97,112,101,46,99,112,112,0],"i8",v);N.ib=B([118,111,105,100,32,98,50,67,104,97,105,110,83,104,97,112,101,58,58,67,114,101,97,116,101,76,111,111,112,40,99,111,110,115,116,32,98,50,86,101,99,50,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.Sa=B([109,95,118,101,114,116,105,99,101,115,32,61,61,32,95,95,110,117,108,108,32,38,38,32,109,95,99,111,117,110,116,32,61,61,32,48,0],"i8",v);N.da=B([118,111,105,100,32,98,50,67,104,97,105,110,83,104,97,112,101,58,58,67,114,101,97,116,101,67,104,97,105,110,40,99,111,110,115,116,32,98,50,86,101,99,50,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.Pb=B([99,111,117,110,116,32,62,61,32,50,0],"i8",v);N.He=B([118,111,105,100,32,98,50,67,104,97,105,110,83,104,97,112,101,58,58,71,101,116,67,104,105,108,100,69,100,103,101,40,98,50,69,100,103,101,83,104,97,112,101,32,42,44,32,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.ah=B([48,32,60,61,32,105,110,100,101,120,32,38,38,32,105,110,100,101,120,32,60,32,109,95,99,111,117,110,116,32,45,32,49,0],"i8",v);N.Ie=B([118,105,114,116,117,97,108,32,98,111,111,108,32,98,50,67,104,97,105,110,83,104,97,112,101,58,58,82,97,121,67,97,115,116,40,98,50,82,97,121,67,97,115,116,79,117,116,112,117,116,32,42,44,32,99,111,110,115,116,32,98,50,82,97,121,67,97,115,116,73,110,112,117,116,32,38,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.Ub=B([99,104,105,108,100,73,110,100,101,120,32,60,32,109,95,99,111,117,110,116,0],"i8",v);N.Ge=B([118,105,114,116,117,97,108,32,118,111,105,100,32,98,50,67,104,97,105,110,83,104,97,112,101,58,58,67,111,109,112,117,116,101,65,65,66,66,40,98,50,65,65,66,66,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.pc=B([49,50,98,50,67,104,97,105,110,83,104,97,112,101,0],"i8",v);N.Kc=B([55,98,50,83,104,97,112,101,0],"i8",v);AM=B(8,"*",v);BM=B(12,"*",v);Xw=B([0,0,0,0,0,0,0,0,50,0,0,0,52,0,0,0,54,0,0,0,56,0,0,0,58,0,0,0,60,0,0,0,62,0,0,0,64,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.sc=B([49,51,98,50,67,105,114,99,108,101,83,104,97,112,101,0],"i8",v);CM=B(12,"*",v);yF=B([0,0,0,0,0,0,0,0,66,0,0,0,68,0,0,0,70,0,0,0,72,0,0,0,74,0,0,0,76,0,0,0,78,0,0,0,80,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.lc=B([49,49,98,50,69,100,103,101,83,104,97,112,101,0],"i8",v);DM=B(12,"*",v);N.O=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,83,104,97,112,101,115,47,98,50,80,111,108,121,103,111,110,83,104,97,112,101,46,99,112,112,0],"i8",v);N.mb=B([118,111,105,100,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,58,58,83,101,116,40,99,111,110,115,116,32,98,50,86,101,99,50,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.zf=B([51,32,60,61,32,99,111,117,110,116,32,38,38,32,99,111,117,110,116,32,60,61,32,56,0],"i8",v);N.ng=B([101,100,103,101,46,76,101,110,103,116,104,83,113,117,97,114,101,100,40,41,32,62,32,49,46,49,57,50,48,57,50,57,48,69,45,48,55,70,32,42,32,49,46,49,57,50,48,57,50,57,48,69,45,48,55,70,0],"i8",v);N.Le=B([118,105,114,116,117,97,108,32,98,111,111,108,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,58,58,82,97,121,67,97,115,116,40,98,50,82,97,121,67,97,115,116,79,117,116,112,117,116,32,42,44,32,99,111,110,115,116,32,98,50,82,97,121,67,97,115,116,73,110,112,117,116,32,38,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.Rg=B([48,46,48,102,32,60,61,32,108,111,119,101,114,32,38,38,32,108,111,119,101,114,32,60,61,32,105,110,112,117,116,46,109,97,120,70,114,97,99,116,105,111,110,0],"i8",v);N.yb=B([118,105,114,116,117,97,108,32,118,111,105,100,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,58,58,67,111,109,112,117,116,101,77,97,115,115,40,98,50,77,97,115,115,68,97,116,97,32,42,44,32,102,108,111,97,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.bh=B([109,95,118,101,114,116,101,120,67,111,117,110,116,32,62,61,32,51,0],"i8",v);N.Vb=B([97,114,101,97,32,62,32,49,46,49,57,50,48,57,50,57,48,69,45,48,55,70,0],"i8",v);pF=B([0,0,0,0,0,0,0,0,82,0,0,0,84,0,0,0,86,0,0,0,88,0,0,0,90,0,0,0,92,0,0,0,94,0,0,0,96,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.uc=B([49,52,98,50,80,111,108,121,103,111,110,83,104,97,112,101,0],"i8",v);EM=B(12,"*",v);N.gb=B([98,50,86,101,99,50,32,67,111,109,112,117,116,101,67,101,110,116,114,111,105,100,40,99,111,110,115,116,32,98,50,86,101,99,50,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.Xb=B([99,111,117,110,116,32,62,61,32,51,0],"i8",v);sn=B([16,0,0,0,32,0,0,0,64,0,0,0,96,0,0,0,128,0,0,0,160,0,0,0,192,0,0,0,224,0,0,0,256,0,0,0,320,0,0,0,384,0,0,0,448,0,0,0,512,0,0,0,640,0,0,0],["i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0],v);rn=B(641,"i8",v);xp=B(4,"i8",v);N.e=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,109,109,111,110,47,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,46,99,112,112,0],"i8",v);N.Ga=B([98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,58,58,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,40,41,0],"i8",v);N.Ta=B([106,32,60,32,98,50,95,98,108,111,99,107,83,105,122,101,115,0],"i8",v);N.Fa=B([118,111,105,100,32,42,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,58,58,65,108,108,111,99,97,116,101,40,105,110,116,51,50,41,0],"i8",v);N.Va=B([48,32,60,32,115,105,122,101,0],"i8",v);N.g=B([48,32,60,61,32,105,110,100,101,120,32,38,38,32,105,110,100,101,120,32,60,32,98,50,95,98,108,111,99,107,83,105,122,101,115,0],"i8",v);N.dh=B([98,108,111,99,107,67,111,117,110,116,32,42,32,98,108,111,99,107,83,105,122,101,32,60,61,32,98,50,95,99,104,117,110,107,83,105,122,101,0],"i8",v);N.f=B([118,111,105,100,32,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,58,58,70,114,101,101,40,118,111,105,100,32,42,44,32,105,110,116,51,50,41,0],"i8",v);FM=B([0,0,0,0,0,0,0,0,98,0,0,0,100,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Ic=B([54,98,50,68,114,97,119,0],"i8",v);GM=B(8,"*",v);Dj=B(8,"float",v);B([2,0,0,0,2,0,0,0,1,0,0,0],["i32",0,0,0,"i32",0,0,0,"i32",0,0,0],v);N.n=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,109,109,111,110,47,98,50,83,116,97,99,107,65,108,108,111,99,97,116,111,114,46,99,112,112,0],"i8",v);N.Q=B([98,50,83,116,97,99,107,65,108,108,111,99,97,116,111,114,58,58,126,98,50,83,116,97,99,107,65,108,108,111,99,97,116,111,114,40,41,0],"i8",v);N.Ua=B([109,95,105,110,100,101,120,32,61,61,32,48,0],"i8",v);N.Xa=B([109,95,101,110,116,114,121,67,111,117,110,116,32,61,61,32,48,0],"i8",v);N.w=B([118,111,105,100,32,42,98,50,83,116,97,99,107,65,108,108,111,99,97,116,111,114,58,58,65,108,108,111,99,97,116,101,40,105,110,116,51,50,41,0],"i8",v);N.D=B([109,95,101,110,116,114,121,67,111,117,110,116,32,60,32,98,50,95,109,97,120,83,116,97,99,107,69,110,116,114,105,101,115,0],"i8",v);N.pb=B([118,111,105,100,32,98,50,83,116,97,99,107,65,108,108,111,99,97,116,111,114,58,58,70,114,101,101,40,118,111,105,100,32,42,41,0],"i8",v);N.eh=B([109,95,101,110,116,114,121,67,111,117,110,116,32,62,32,48,0],"i8",v);N.lh=B([112,32,61,61,32,101,110,116,114,121,45,62,100,97,116,97,0],"i8",v);N.k=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,98,50,66,111,100,121,46,99,112,112,0],"i8",v);N.R=B([98,50,66,111,100,121,58,58,98,50,66,111,100,121,40,99,111,110,115,116,32,98,50,66,111,100,121,68,101,102,32,42,44,32,98,50,87,111,114,108,100,32,42,41,0],"i8",v);N.Kf=B([98,100,45,62,112,111,115,105,116,105,111,110,46,73,115,86,97,108,105,100,40,41,0],"i8",v);N.vg=B([98,100,45,62,108,105,110,101,97,114,86,101,108,111,99,105,116,121,46,73,115,86,97,108,105,100,40,41,0],"i8",v);N.Sg=B([98,50,73,115,86,97,108,105,100,40,98,100,45,62,97,110,103,108,101,41,0],"i8",v);N.fh=B([98,50,73,115,86,97,108,105,100,40,98,100,45,62,97,110,103,117,108,97,114,86,101,108,111,99,105,116,121,41,0],"i8",v);N.mh=B([98,50,73,115,86,97,108,105,100,40,98,100,45,62,97,110,103,117,108,97,114,68,97,109,112,105,110,103,41,32,38,38,32,98,100,45,62,97,110,103,117,108,97,114,68,97,109,112,105,110,103,32,62,61,32,48,46,48,102,0],"i8",v);N.th=B([98,50,73,115,86,97,108,105,100,40,98,100,45,62,108,105,110,101,97,114,68,97,109,112,105,110,103,41,32,38,38,32,98,100,45,62,108,105,110,101,97,114,68,97,109,112,105,110,103,32,62,61,32,48,46,48,102,0],"i8",v);N.we=B([118,111,105,100,32,98,50,66,111,100,121,58,58,83,101,116,84,121,112,101,40,98,50,66,111,100,121,84,121,112,101,41,0],"i8",v);N.V=B([109,95,119,111,114,108,100,45,62,73,115,76,111,99,107,101,100,40,41,32,61,61,32,102,97,108,115,101,0],"i8",v);N.ve=B([98,50,70,105,120,116,117,114,101,32,42,98,50,66,111,100,121,58,58,67,114,101,97,116,101,70,105,120,116,117,114,101,40,99,111,110,115,116,32,98,50,70,105,120,116,117,114,101,68,101,102,32,42,41,0],"i8",v);N.ma=B([118,111,105,100,32,98,50,66,111,100,121,58,58,68,101,115,116,114,111,121,70,105,120,116,117,114,101,40,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.Ch=B([102,105,120,116,117,114,101,45,62,109,95,98,111,100,121,32,61,61,32,116,104,105,115,0],"i8",v);N.Ih=B([109,95,102,105,120,116,117,114,101,67,111,117,110,116,32,62,32,48,0],"i8",v);N.We=B([102,111,117,110,100,0],"i8",v);N.rb=B([118,111,105,100,32,98,50,66,111,100,121,58,58,82,101,115,101,116,77,97,115,115,68,97,116,97,40,41,0],"i8",v);N.ef=B([109,95,116,121,112,101,32,61,61,32,98,50,95,100,121,110,97,109,105,99,66,111,100,121,0],"i8",v);N.Db=B([109,95,73,32,62,32,48,46,48,102,0],"i8",v);N.qb=B([118,111,105,100,32,98,50,66,111,100,121,58,58,83,101,116,77,97,115,115,68,97,116,97,40,99,111,110,115,116,32,98,50,77,97,115,115,68,97,116,97,32,42,41,0],"i8",v);N.ue=B([118,111,105,100,32,98,50,66,111,100,121,58,58,83,101,116,84,114,97,110,115,102,111,114,109,40,99,111,110,115,116,32,98,50,86,101,99,50,32,38,44,32,102,108,111,97,116,51,50,41,0],"i8",v);N.xe=B([118,111,105,100,32,98,50,66,111,100,121,58,58,83,101,116,65,99,116,105,118,101,40,98,111,111,108,41,0],"i8",v);N.vf=B([32,32,98,50,66,111,100,121,68,101,102,32,98,100,59,10,0],"i8",v);N.Bf=B([32,32,98,100,46,116,121,112,101,32,61,32,98,50,66,111,100,121,84,121,112,101,40,37,100,41,59,10,0],"i8",v);N.Ff=B([32,32,98,100,46,112,111,115,105,116,105,111,110,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Lf=B([32,32,98,100,46,97,110,103,108,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Of=B([32,32,98,100,46,108,105,110,101,97,114,86,101,108,111,99,105,116,121,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Qf=B([32,32,98,100,46,97,110,103,117,108,97,114,86,101,108,111,99,105,116,121,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Tf=B([32,32,98,100,46,108,105,110,101,97,114,68,97,109,112,105,110,103,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Xf=B([32,32,98,100,46,97,110,103,117,108,97,114,68,97,109,112,105,110,103,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Yf=B([32,32,98,100,46,97,108,108,111,119,83,108,101,101,112,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.cg=B([32,32,98,100,46,97,119,97,107,101,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.ig=B([32,32,98,100,46,102,105,120,101,100,82,111,116,97,116,105,111,110,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.lg=B([32,32,98,100,46,98,117,108,108,101,116,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.pg=B([32,32,98,100,46,97,99,116,105,118,101,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.tg=B([32,32,98,100,46,103,114,97,118,105,116,121,83,99,97,108,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.xg=B([32,32,98,111,100,105,101,115,91,37,100,93,32,61,32,109,95,119,111,114,108,100,45,62,67,114,101,97,116,101,66,111,100,121,40,38,98,100,41,59,10,0],"i8",v);N.Dg=B([32,32,123,10,0],"i8",v);N.Fg=B([32,32,125,10,0],"i8",v);yp=B(4,"*",v);zp=B(4,"*",v);N.S=B([118,111,105,100,32,42,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,71,101,116,85,115,101,114,68,97,116,97,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);N.o=B([48,32,60,61,32,112,114,111,120,121,73,100,32,38,38,32,112,114,111,120,121,73,100,32,60,32,109,95,110,111,100,101,67,97,112,97,99,105,116,121,0],"i8",v);N.H=B([99,111,110,115,116,32,98,50,65,65,66,66,32,38,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,71,101,116,70,97,116,65,65,66,66,40,105,110,116,51,50,41,32,99,111,110,115,116,0],"i8",v);zx=B([0,0,0,0,0,0,0,0,104,0,0,0,106,0,0,0,108,0,0,0,110,0,0,0,112,0,0,0,114,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Cc=B([49,55,98,50,67,111,110,116,97,99,116,76,105,115,116,101,110,101,114,0],"i8",v);HM=B(8,"*",v);N.Pa=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,98,50,70,105,120,116,117,114,101,46,99,112,112,0],"i8",v);N.xb=B([118,111,105,100,32,98,50,70,105,120,116,117,114,101,58,58,68,101,115,116,114,111,121,40,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,32,42,41,0],"i8",v);N.Ab=B([109,95,112,114,111,120,121,67,111,117,110,116,32,61,61,32,48,0],"i8",v);N.Ee=B([118,111,105,100,32,98,50,70,105,120,116,117,114,101,58,58,67,114,101,97,116,101,80,114,111,120,105,101,115,40,98,50,66,114,111,97,100,80,104,97,115,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,41,0],"i8",v);N.Gg=B([32,32,32,32,98,50,70,105,120,116,117,114,101,68,101,102,32,102,100,59,10,0],"i8",v);N.Vg=B([32,32,32,32,102,100,46,102,114,105,99,116,105,111,110,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.hh=B([32,32,32,32,102,100,46,114,101,115,116,105,116,117,116,105,111,110,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.nh=B([32,32,32,32,102,100,46,100,101,110,115,105,116,121,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.vh=B([32,32,32,32,102,100,46,105,115,83,101,110,115,111,114,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.yh=B([32,32,32,32,102,100,46,102,105,108,116,101,114,46,99,97,116,101,103,111,114,121,66,105,116,115,32,61,32,117,105,110,116,49,54,40,37,100,41,59,10,0],"i8",v);N.Eh=B([32,32,32,32,102,100,46,102,105,108,116,101,114,46,109,97,115,107,66,105,116,115,32,61,32,117,105,110,116,49,54,40,37,100,41,59,10,0],"i8",v);N.Se=B([32,32,32,32,102,100,46,102,105,108,116,101,114,46,103,114,111,117,112,73,110,100,101,120,32,61,32,105,110,116,49,54,40,37,100,41,59,10,0],"i8",v);N.Ye=B([32,32,32,32,98,50,67,105,114,99,108,101,83,104,97,112,101,32,115,104,97,112,101,59,10,0],"i8",v);N.Bb=B([32,32,32,32,115,104,97,112,101,46,109,95,114,97,100,105,117,115,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.nf=B([32,32,32,32,115,104,97,112,101,46,109,95,112,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.sf=B([32,32,32,32,98,50,69,100,103,101,83,104,97,112,101,32,115,104,97,112,101,59,10,0],"i8",v);N.xf=B([32,32,32,32,115,104,97,112,101,46,109,95,118,101,114,116,101,120,48,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Df=B([32,32,32,32,115,104,97,112,101,46,109,95,118,101,114,116,101,120,49,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Hf=B([32,32,32,32,115,104,97,112,101,46,109,95,118,101,114,116,101,120,50,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Mf=B([32,32,32,32,115,104,97,112,101,46,109,95,118,101,114,116,101,120,51,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Pf=B([32,32,32,32,115,104,97,112,101,46,109,95,104,97,115,86,101,114,116,101,120,48,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.Rf=B([32,32,32,32,115,104,97,112,101,46,109,95,104,97,115,86,101,114,116,101,120,51,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.Uf=B([32,32,32,32,98,50,80,111,108,121,103,111,110,83,104,97,112,101,32,115,104,97,112,101,59,10,0],"i8",v);N.Mb=B([32,32,32,32,98,50,86,101,99,50,32,118,115,91,37,100,93,59,10,0],"i8",v);N.Nb=B([32,32,32,32,118,115,91,37,100,93,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.jg=B([32,32,32,32,115,104,97,112,101,46,83,101,116,40,118,115,44,32,37,100,41,59,10,0],"i8",v);N.mg=B([32,32,32,32,98,50,67,104,97,105,110,83,104,97,112,101,32,115,104,97,112,101,59,10,0],"i8",v);N.qg=B([32,32,32,32,115,104,97,112,101,46,67,114,101,97,116,101,67,104,97,105,110,40,118,115,44,32,37,100,41,59,10,0],"i8",v);N.ug=B([32,32,32,32,115,104,97,112,101,46,109,95,112,114,101,118,86,101,114,116,101,120,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.yg=B([32,32,32,32,115,104,97,112,101,46,109,95,110,101,120,116,86,101,114,116,101,120,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Bg=B([32,32,32,32,115,104,97,112,101,46,109,95,104,97,115,80,114,101,118,86,101,114,116,101,120,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.Eg=B([32,32,32,32,115,104,97,112,101,46,109,95,104,97,115,78,101,120,116,86,101,114,116,101,120,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.Za=B([10,0],"i8",v);N.Ig=B([32,32,32,32,102,100,46,115,104,97,112,101,32,61,32,38,115,104,97,112,101,59,10,0],"i8",v);N.Mg=B([32,32,32,32,98,111,100,105,101,115,91,37,100,93,45,62,67,114,101,97,116,101,70,105,120,116,117,114,101,40,38,102,100,41,59,10,0],"i8",v);N.Gb=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,98,50,73,115,108,97,110,100,46,99,112,112,0],"i8",v);N.vb=B([118,111,105,100,32,98,50,73,115,108,97,110,100,58,58,83,111,108,118,101,84,79,73,40,99,111,110,115,116,32,98,50,84,105,109,101,83,116,101,112,32,38,44,32,105,110,116,51,50,44,32,105,110,116,51,50,41,0],"i8",v);N.df=B([116,111,105,73,110,100,101,120,65,32,60,32,109,95,98,111,100,121,67,111,117,110,116,0],"i8",v);N.Vf=B([116,111,105,73,110,100,101,120,66,32,60,32,109,95,98,111,100,121,67,111,117,110,116,0],"i8",v);N.t=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,98,50,87,111,114,108,100,46,99,112,112,0],"i8",v);N.Ae=B([98,50,66,111,100,121,32,42,98,50,87,111,114,108,100,58,58,67,114,101,97,116,101,66,111,100,121,40,99,111,110,115,116,32,98,50,66,111,100,121,68,101,102,32,42,41,0],"i8",v);N.pa=B([73,115,76,111,99,107,101,100,40,41,32,61,61,32,102,97,108,115,101,0],"i8",v);N.sb=B([118,111,105,100,32,98,50,87,111,114,108,100,58,58,68,101,115,116,114,111,121,66,111,100,121,40,98,50,66,111,100,121,32,42,41,0],"i8",v);N.Wf=B([109,95,98,111,100,121,67,111,117,110,116,32,62,32,48,0],"i8",v);N.Be=B([98,50,74,111,105,110,116,32,42,98,50,87,111,114,108,100,58,58,67,114,101,97,116,101,74,111,105,110,116,40,99,111,110,115,116,32,98,50,74,111,105,110,116,68,101,102,32,42,41,0],"i8",v);N.tb=B([118,111,105,100,32,98,50,87,111,114,108,100,58,58,68,101,115,116,114,111,121,74,111,105,110,116,40,98,50,74,111,105,110,116,32,42,41,0],"i8",v);N.Hg=B([109,95,106,111,105,110,116,67,111,117,110,116,32,62,32,48,0],"i8",v);N.Ha=B([118,111,105,100,32,98,50,87,111,114,108,100,58,58,83,111,108,118,101,40,99,111,110,115,116,32,98,50,84,105,109,101,83,116,101,112,32,38,41,0],"i8",v);N.Xg=B([98,45,62,73,115,65,99,116,105,118,101,40,41,32,61,61,32,116,114,117,101,0],"i8",v);N.Sb=B([115,116,97,99,107,67,111,117,110,116,32,60,32,115,116,97,99,107,83,105,122,101,0],"i8",v);N.ub=B([118,111,105,100,32,98,50,87,111,114,108,100,58,58,83,111,108,118,101,84,79,73,40,99,111,110,115,116,32,98,50,84,105,109,101,83,116,101,112,32,38,41,0],"i8",v);N.oh=B([116,121,112,101,65,32,61,61,32,98,50,95,100,121,110,97,109,105,99,66,111,100,121,32,124,124,32,116,121,112,101,66,32,61,61,32,98,50,95,100,121,110,97,109,105,99,66,111,100,121,0],"i8",v);N.U=B([97,108,112,104,97,48,32,60,32,49,46,48,102,0],"i8",v);N.Ce=B([118,111,105,100,32,98,50,87,111,114,108,100,58,58,68,114,97,119,83,104,97,112,101,40,98,50,70,105,120,116,117,114,101,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,99,111,110,115,116,32,98,50,67,111,108,111,114,32,38,41,0],"i8",v);N.zh=B([118,101,114,116,101,120,67,111,117,110,116,32,60,61,32,56,0],"i8",v);N.Fh=B([98,50,86,101,99,50,32,103,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Te=B([109,95,119,111,114,108,100,45,62,83,101,116,71,114,97,118,105,116,121,40,103,41,59,10,0],"i8",v);N.Ze=B([98,50,66,111,100,121,42,42,32,98,111,100,105,101,115,32,61,32,40,98,50,66,111,100,121,42,42,41,98,50,65,108,108,111,99,40,37,100,32,42,32,115,105,122,101,111,102,40,98,50,66,111,100,121,42,41,41,59,10,0],"i8",v);N.hf=B([98,50,74,111,105,110,116,42,42,32,106,111,105,110,116,115,32,61,32,40,98,50,74,111,105,110,116,42,42,41,98,50,65,108,108,111,99,40,37,100,32,42,32,115,105,122,101,111,102,40,98,50,74,111,105,110,116,42,41,41,59,10,0],"i8",v);N.Qa=B([123,10,0],"i8",v);N.Ra=B([125,10,0],"i8",v);N.yf=B([98,50,70,114,101,101,40,106,111,105,110,116,115,41,59,10,0],"i8",v);N.Ef=B([98,50,70,114,101,101,40,98,111,100,105,101,115,41,59,10,0],"i8",v);N.If=B([106,111,105,110,116,115,32,61,32,78,85,76,76,59,10,0],"i8",v);N.Nf=B([98,111,100,105,101,115,32,61,32,78,85,76,76,59,10,0],"i8",v);N.q=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,108,108,105,115,105,111,110,47,98,50,68,121,110,97,109,105,99,84,114,101,101,46,104,0],"i8",v);N.Ke=B([118,111,105,100,32,98,50,68,121,110,97,109,105,99,84,114,101,101,58,58,82,97,121,67,97,115,116,40,84,32,42,44,32,99,111,110,115,116,32,98,50,82,97,121,67,97,115,116,73,110,112,117,116,32,38,41,32,99,111,110,115,116,32,91,84,32,61,32,98,50,87,111,114,108,100,82,97,121,67,97,115,116,87,114,97,112,112,101,114,93,0],"i8",v);N.Sf=B([114,46,76,101,110,103,116,104,83,113,117,97,114,101,100,40,41,32,62,32,48,46,48,102,0],"i8",v);N.ba=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,67,111,109,109,111,110,47,98,50,77,97,116,104,46,104,0],"i8",v);N.Y=B([118,111,105,100,32,98,50,83,119,101,101,112,58,58,65,100,118,97,110,99,101,40,102,108,111,97,116,51,50,41,0],"i8",v);N.J=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,98,50,73,115,108,97,110,100,46,104,0],"i8",v);N.De=B([118,111,105,100,32,98,50,73,115,108,97,110,100,58,58,65,100,100,40,98,50,74,111,105,110,116,32,42,41,0],"i8",v);N.rg=B([109,95,106,111,105,110,116,67,111,117,110,116,32,60,32,109,95,106,111,105,110,116,67,97,112,97,99,105,116,121,0],"i8",v);N.Ia=B([118,111,105,100,32,98,50,73,115,108,97,110,100,58,58,65,100,100,40,98,50,67,111,110,116,97,99,116,32,42,41,0],"i8",v);N.Wa=B([109,95,99,111,110,116,97,99,116,67,111,117,110,116,32,60,32,109,95,99,111,110,116,97,99,116,67,97,112,97,99,105,116,121,0],"i8",v);N.na=B([118,111,105,100,32,98,50,73,115,108,97,110,100,58,58,65,100,100,40,98,50,66,111,100,121,32,42,41,0],"i8",v);N.Aa=B([109,95,98,111,100,121,67,111,117,110,116,32,60,32,109,95,98,111,100,121,67,97,112,97,99,105,116,121,0],"i8",v);IM=B([0,0,0,0,0,0,0,0,116,0,0,0,118,0,0,0,120,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.wc=B([49,53,98,50,67,111,110,116,97,99,116,70,105,108,116,101,114,0],"i8",v);JM=B(8,"*",v);KM=B([0,0,0,0,0,0,0,0,122,0,0,0,124,0,0,0,126,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.ta=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,67,104,97,105,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.ia=B([98,50,67,104,97,105,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,58,58,98,50,67,104,97,105,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,44,32,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.Ec=B([50,51,98,50,67,104,97,105,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,0],"i8",v);N.Lc=B([57,98,50,67,111,110,116,97,99,116,0],"i8",v);LM=B(8,"*",v);MM=B(12,"*",v);NM=B([0,0,0,0,0,0,0,0,128,0,0,0,130,0,0,0,132,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.ua=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,67,104,97,105,110,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.ka=B([98,50,67,104,97,105,110,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,58,58,98,50,67,104,97,105,110,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,44,32,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,41,0],"i8",v);N.qa=B([109,95,102,105,120,116,117,114,101,65,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,99,104,97,105,110,0],"i8",v);N.Gc=B([50,52,98,50,67,104,97,105,110,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,0],"i8",v);OM=B(12,"*",v);PM=B([0,0,0,0,0,0,0,0,134,0,0,0,136,0,0,0,138,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.va=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,67,105,114,99,108,101,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.fa=B([98,50,67,105,114,99,108,101,67,111,110,116,97,99,116,58,58,98,50,67,105,114,99,108,101,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.Cb=B([109,95,102,105,120,116,117,114,101,65,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,99,105,114,99,108,101,0],"i8",v);N.vc=B([49,53,98,50,67,105,114,99,108,101,67,111,110,116,97,99,116,0],"i8",v);QM=B(12,"*",v);op=B(192,["*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0,"*",0,0,0,"*",0,0,0,"i8",0,0,0],v);np=B(4,"i8",v);N.$=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.Xh=B([115,116,97,116,105,99,32,118,111,105,100,32,98,50,67,111,110,116,97,99,116,58,58,65,100,100,84,121,112,101,40,98,50,67,111,110,116,97,99,116,67,114,101,97,116,101,70,99,110,32,42,44,32,98,50,67,111,110,116,97,99,116,68,101,115,116,114,111,121,70,99,110,32,42,44,32,98,50,83,104,97,112,101,58,58,84,121,112,101,44,32,98,50,83,104,97,112,101,58,58,84,121,112,101,41,0],"i8",v);N.gf=B([48,32,60,61,32,116,121,112,101,49,32,38,38,32,116,121,112,101,49,32,60,32,98,50,83,104,97,112,101,58,58,101,95,116,121,112,101,67,111,117,110,116,0],"i8",v);N.Zf=B([48,32,60,61,32,116,121,112,101,50,32,38,38,32,116,121,112,101,50,32,60,32,98,50,83,104,97,112,101,58,58,101,95,116,121,112,101,67,111,117,110,116,0],"i8",v);N.wb=B([115,116,97,116,105,99,32,98,50,67,111,110,116,97,99,116,32,42,98,50,67,111,110,116,97,99,116,58,58,67,114,101,97,116,101,40,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,44,32,98,50,70,105,120,116,117,114,101,32,42,44,32,105,110,116,51,50,44,32,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,32,42,41,0],"i8",v);N.Ja=B([115,116,97,116,105,99,32,118,111,105,100,32,98,50,67,111,110,116,97,99,116,58,58,68,101,115,116,114,111,121,40,98,50,67,111,110,116,97,99,116,32,42,44,32,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,32,42,41,0],"i8",v);N.Jg=B([115,95,105,110,105,116,105,97,108,105,122,101,100,32,61,61,32,116,114,117,101,0],"i8",v);N.Rb=B([48,32,60,61,32,116,121,112,101,65,32,38,38,32,116,121,112,101,66,32,60,32,98,50,83,104,97,112,101,58,58,101,95,116,121,112,101,67,111,117,110,116,0],"i8",v);RM=B([0,0,0,0,0,0,0,0,102,0,0,0,140,0,0,0,142,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.aa=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,46,99,112,112,0],"i8",v);N.qe=B([98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,58,58,98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,40,98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,68,101,102,32,42,41,0],"i8",v);N.jf=B([112,111,105,110,116,67,111,117,110,116,32,62,32,48,0],"i8",v);N.pe=B([118,111,105,100,32,98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,58,58,73,110,105,116,105,97,108,105,122,101,86,101,108,111,99,105,116,121,67,111,110,115,116,114,97,105,110,116,115,40,41,0],"i8",v);N.$f=B([109,97,110,105,102,111,108,100,45,62,112,111,105,110,116,67,111,117,110,116,32,62,32,48,0],"i8",v);N.nb=B([118,111,105,100,32,98,50,67,111,110,116,97,99,116,83,111,108,118,101,114,58,58,83,111,108,118,101,86,101,108,111,99,105,116,121,67,111,110,115,116,114,97,105,110,116,115,40,41,0],"i8",v);N.Kg=B([112,111,105,110,116,67,111,117,110,116,32,61,61,32,49,32,124,124,32,112,111,105,110,116,67,111,117,110,116,32,61,61,32,50,0],"i8",v);N.Yg=B([97,46,120,32,62,61,32,48,46,48,102,32,38,38,32,97,46,121,32,62,61,32,48,46,48,102,0],"i8",v);N.te=B([118,111,105,100,32,98,50,80,111,115,105,116,105,111,110,83,111,108,118,101,114,77,97,110,105,102,111,108,100,58,58,73,110,105,116,105,97,108,105,122,101,40,98,50,67,111,110,116,97,99,116,80,111,115,105,116,105,111,110,67,111,110,115,116,114,97,105,110,116,32,42,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,99,111,110,115,116,32,98,50,84,114,97,110,115,102,111,114,109,32,38,44,32,105,110,116,51,50,41,0],"i8",v);N.ih=B([112,99,45,62,112,111,105,110,116,67,111,117,110,116,32,62,32,48,0],"i8",v);SM=B([0,0,0,0,0,0,0,0,144,0,0,0,146,0,0,0,148,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.wa=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,69,100,103,101,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.ha=B([98,50,69,100,103,101,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,58,58,98,50,69,100,103,101,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.Dc=B([50,50,98,50,69,100,103,101,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,0],"i8",v);TM=B(12,"*",v);UM=B([0,0,0,0,0,0,0,0,150,0,0,0,152,0,0,0,154,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.xa=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,69,100,103,101,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.ja=B([98,50,69,100,103,101,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,58,58,98,50,69,100,103,101,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.ra=B([109,95,102,105,120,116,117,114,101,65,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,101,100,103,101,0],"i8",v);N.Fc=B([50,51,98,50,69,100,103,101,65,110,100,80,111,108,121,103,111,110,67,111,110,116,97,99,116,0],"i8",v);VM=B(12,"*",v);WM=B([0,0,0,0,0,0,0,0,156,0,0,0,158,0,0,0,160,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.ya=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,80,111,108,121,103,111,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.la=B([98,50,80,111,108,121,103,111,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,58,58,98,50,80,111,108,121,103,111,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.I=B([109,95,102,105,120,116,117,114,101,66,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,99,105,114,99,108,101,0],"i8",v);N.Hc=B([50,53,98,50,80,111,108,121,103,111,110,65,110,100,67,105,114,99,108,101,67,111,110,116,97,99,116,0],"i8",v);XM=B(12,"*",v);YM=B([0,0,0,0,0,0,0,0,162,0,0,0,164,0,0,0,166,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.za=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,67,111,110,116,97,99,116,115,47,98,50,80,111,108,121,103,111,110,67,111,110,116,97,99,116,46,99,112,112,0],"i8",v);N.ga=B([98,50,80,111,108,121,103,111,110,67,111,110,116,97,99,116,58,58,98,50,80,111,108,121,103,111,110,67,111,110,116,97,99,116,40,98,50,70,105,120,116,117,114,101,32,42,44,32,98,50,70,105,120,116,117,114,101,32,42,41,0],"i8",v);N.sa=B([109,95,102,105,120,116,117,114,101,65,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,112,111,108,121,103,111,110,0],"i8",v);N.T=B([109,95,102,105,120,116,117,114,101,66,45,62,71,101,116,84,121,112,101,40,41,32,61,61,32,98,50,83,104,97,112,101,58,58,101,95,112,111,108,121,103,111,110,0],"i8",v);N.Ac=B([49,54,98,50,80,111,108,121,103,111,110,67,111,110,116,97,99,116,0],"i8",v);ZM=B(12,"*",v);Fp=B([0,0,0,0,0,0,0,0,168,0,0,0,170,0,0,0,172,0,0,0,174,0,0,0,176,0,0,0,178,0,0,0,180,0,0,0,182,0,0,0,184,0,0,0,186,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.wg=B([32,32,98,50,68,105,115,116,97,110,99,101,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.qh=B([32,32,106,100,46,108,101,110,103,116,104,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.xc=B([49,53,98,50,68,105,115,116,97,110,99,101,74,111,105,110,116,0],"i8",v);N.Jc=B([55,98,50,74,111,105,110,116,0],"i8",v);$M=B(8,"*",v);aN=B(12,"*",v);Np=B([0,0,0,0,0,0,0,0,188,0,0,0,190,0,0,0,192,0,0,0,194,0,0,0,196,0,0,0,198,0,0,0,200,0,0,0,202,0,0,0,204,0,0,0,206,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.di=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,70,114,105,99,116,105,111,110,74,111,105,110,116,46,99,112,112,0],"i8",v);N.Sh=B([118,111,105,100,32,98,50,70,114,105,99,116,105,111,110,74,111,105,110,116,58,58,83,101,116,77,97,120,70,111,114,99,101,40,102,108,111,97,116,51,50,41,0],"i8",v);N.Yh=B([98,50,73,115,86,97,108,105,100,40,102,111,114,99,101,41,32,38,38,32,102,111,114,99,101,32,62,61,32,48,46,48,102,0],"i8",v);N.Th=B([118,111,105,100,32,98,50,70,114,105,99,116,105,111,110,74,111,105,110,116,58,58,83,101,116,77,97,120,84,111,114,113,117,101,40,102,108,111,97,116,51,50,41,0],"i8",v);N.bi=B([98,50,73,115,86,97,108,105,100,40,116,111,114,113,117,101,41,32,38,38,32,116,111,114,113,117,101,32,62,61,32,48,46,48,102,0],"i8",v);N.Lg=B([32,32,98,50,70,114,105,99,116,105,111,110,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.Gh=B([32,32,106,100,46,109,97,120,70,111,114,99,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Ue=B([32,32,106,100,46,109,97,120,84,111,114,113,117,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.yc=B([49,53,98,50,70,114,105,99,116,105,111,110,74,111,105,110,116,0],"i8",v);bN=B(12,"*",v);cq=B([0,0,0,0,0,0,0,0,208,0,0,0,210,0,0,0,212,0,0,0,214,0,0,0,216,0,0,0,218,0,0,0,220,0,0,0,222,0,0,0,224,0,0,0,226,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Ob=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,71,101,97,114,74,111,105,110,116,46,99,112,112,0],"i8",v);N.hb=B([98,50,71,101,97,114,74,111,105,110,116,58,58,98,50,71,101,97,114,74,111,105,110,116,40,99,111,110,115,116,32,98,50,71,101,97,114,74,111,105,110,116,68,101,102,32,42,41,0],"i8",v);N.mf=B([109,95,116,121,112,101,65,32,61,61,32,101,95,114,101,118,111,108,117,116,101,74,111,105,110,116,32,124,124,32,109,95,116,121,112,101,65,32,61,61,32,101,95,112,114,105,115,109,97,116,105,99,74,111,105,110,116,0],"i8",v);N.bg=B([109,95,116,121,112,101,66,32,61,61,32,101,95,114,101,118,111,108,117,116,101,74,111,105,110,116,32,124,124,32,109,95,116,121,112,101,66,32,61,61,32,101,95,112,114,105,115,109,97,116,105,99,74,111,105,110,116,0],"i8",v);N.Rh=B([118,111,105,100,32,98,50,71,101,97,114,74,111,105,110,116,58,58,83,101,116,82,97,116,105,111,40,102,108,111,97,116,51,50,41,0],"i8",v);N.ei=B([98,50,73,115,86,97,108,105,100,40,114,97,116,105,111,41,0],"i8",v);N.Zg=B([32,32,98,50,71,101,97,114,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.Ah=B([32,32,106,100,46,106,111,105,110,116,49,32,61,32,106,111,105,110,116,115,91,37,100,93,59,10,0],"i8",v);N.Hh=B([32,32,106,100,46,106,111,105,110,116,50,32,61,32,106,111,105,110,116,115,91,37,100,93,59,10,0],"i8",v);N.mc=B([49,49,98,50,71,101,97,114,74,111,105,110,116,0],"i8",v);cN=B(12,"*",v);N.m=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,74,111,105,110,116,46,99,112,112,0],"i8",v);N.ye=B([115,116,97,116,105,99,32,98,50,74,111,105,110,116,32,42,98,50,74,111,105,110,116,58,58,67,114,101,97,116,101,40,99,111,110,115,116,32,98,50,74,111,105,110,116,68,101,102,32,42,44,32,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,32,42,41,0],"i8",v);N.l=B([102,97,108,115,101,0],"i8",v);N.ze=B([115,116,97,116,105,99,32,118,111,105,100,32,98,50,74,111,105,110,116,58,58,68,101,115,116,114,111,121,40,98,50,74,111,105,110,116,32,42,44,32,98,50,66,108,111,99,107,65,108,108,111,99,97,116,111,114,32,42,41,0],"i8",v);Ep=B([0,0,0,0,0,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0,228,0,0,0,230,0,0,0,232,0,0,0,102,0,0,0,102,0,0,0,102,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.p=B([98,50,74,111,105,110,116,58,58,98,50,74,111,105,110,116,40,99,111,110,115,116,32,98,50,74,111,105,110,116,68,101,102,32,42,41,0],"i8",v);N.r=B([100,101,102,45,62,98,111,100,121,65,32,33,61,32,100,101,102,45,62,98,111,100,121,66,0],"i8",v);N.Ng=B([47,47,32,68,117,109,112,32,105,115,32,110,111,116,32,115,117,112,112,111,114,116,101,100,32,102,111,114,32,116,104,105,115,32,106,111,105,110,116,32,116,121,112,101,46,10,0],"i8",v);dq=B([0,0,0,0,0,0,0,0,234,0,0,0,236,0,0,0,238,0,0,0,240,0,0,0,242,0,0,0,244,0,0,0,246,0,0,0,248,0,0,0,250,0,0,0,252,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.ca=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,77,111,117,115,101,74,111,105,110,116,46,99,112,112,0],"i8",v);N.ea=B([98,50,77,111,117,115,101,74,111,105,110,116,58,58,98,50,77,111,117,115,101,74,111,105,110,116,40,99,111,110,115,116,32,98,50,77,111,117,115,101,74,111,105,110,116,68,101,102,32,42,41,0],"i8",v);N.pf=B([100,101,102,45,62,116,97,114,103,101,116,46,73,115,86,97,108,105,100,40,41,0],"i8",v);N.dg=B([98,50,73,115,86,97,108,105,100,40,100,101,102,45,62,109,97,120,70,111,114,99,101,41,32,38,38,32,100,101,102,45,62,109,97,120,70,111,114,99,101,32,62,61,32,48,46,48,102,0],"i8",v);N.Og=B([98,50,73,115,86,97,108,105,100,40,100,101,102,45,62,102,114,101,113,117,101,110,99,121,72,122,41,32,38,38,32,100,101,102,45,62,102,114,101,113,117,101,110,99,121,72,122,32,62,61,32,48,46,48,102,0],"i8",v);N.$g=B([98,50,73,115,86,97,108,105,100,40,100,101,102,45,62,100,97,109,112,105,110,103,82,97,116,105,111,41,32,38,38,32,100,101,102,45,62,100,97,109,112,105,110,103,82,97,116,105,111,32,62,61,32,48,46,48,102,0],"i8",v);N.me=B([118,105,114,116,117,97,108,32,118,111,105,100,32,98,50,77,111,117,115,101,74,111,105,110,116,58,58,73,110,105,116,86,101,108,111,99,105,116,121,67,111,110,115,116,114,97,105,110,116,115,40,99,111,110,115,116,32,98,50,83,111,108,118,101,114,68,97,116,97,32,38,41,0],"i8",v);N.jh=B([100,32,43,32,104,32,42,32,107,32,62,32,49,46,49,57,50,48,57,50,57,48,69,45,48,55,70,0],"i8",v);N.qc=B([49,50,98,50,77,111,117,115,101,74,111,105,110,116,0],"i8",v);dN=B(12,"*",v);N.rh=B([77,111,117,115,101,32,106,111,105,110,116,32,100,117,109,112,105,110,103,32,105,115,32,110,111,116,32,115,117,112,112,111,114,116,101,100,46,10,0],"i8",v);eq=B([0,0,0,0,0,0,0,0,254,0,0,0,256,0,0,0,258,0,0,0,260,0,0,0,262,0,0,0,264,0,0,0,266,0,0,0,268,0,0,0,270,0,0,0,272,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.fi=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,80,114,105,115,109,97,116,105,99,74,111,105,110,116,46,99,112,112,0],"i8",v);N.Vh=B([118,111,105,100,32,98,50,80,114,105,115,109,97,116,105,99,74,111,105,110,116,58,58,83,101,116,76,105,109,105,116,115,40,102,108,111,97,116,51,50,44,32,102,108,111,97,116,51,50,41,0],"i8",v);N.eg=B([32,32,98,50,80,114,105,115,109,97,116,105,99,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.$e=B([32,32,106,100,46,108,111,119,101,114,84,114,97,110,115,108,97,116,105,111,110,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.kf=B([32,32,106,100,46,117,112,112,101,114,84,114,97,110,115,108,97,116,105,111,110,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Af=B([32,32,106,100,46,109,97,120,77,111,116,111,114,70,111,114,99,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Bc=B([49,54,98,50,80,114,105,115,109,97,116,105,99,74,111,105,110,116,0],"i8",v);eN=B(12,"*",v);N.Qb=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,80,117,108,108,101,121,74,111,105,110,116,46,99,112,112,0],"i8",v);N.re=B([118,111,105,100,32,98,50,80,117,108,108,101,121,74,111,105,110,116,68,101,102,58,58,73,110,105,116,105,97,108,105,122,101,40,98,50,66,111,100,121,32,42,44,32,98,50,66,111,100,121,32,42,44,32,99,111,110,115,116,32,98,50,86,101,99,50,32,38,44,32,99,111,110,115,116,32,98,50,86,101,99,50,32,38,44,32,99,111,110,115,116,32,98,50,86,101,99,50,32,38,44,32,99,111,110,115,116,32,98,50,86,101,99,50,32,38,44,32,102,108,111,97,116,51,50,41,0],"i8",v);N.qf=B([114,97,116,105,111,32,62,32,49,46,49,57,50,48,57,50,57,48,69,45,48,55,70,0],"i8",v);gq=B([0,0,0,0,0,0,0,0,274,0,0,0,276,0,0,0,278,0,0,0,280,0,0,0,282,0,0,0,284,0,0,0,286,0,0,0,288,0,0,0,290,0,0,0,292,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.oe=B([98,50,80,117,108,108,101,121,74,111,105,110,116,58,58,98,50,80,117,108,108,101,121,74,111,105,110,116,40,99,111,110,115,116,32,98,50,80,117,108,108,101,121,74,111,105,110,116,68,101,102,32,42,41,0],"i8",v);N.fg=B([100,101,102,45,62,114,97,116,105,111,32,33,61,32,48,46,48,102,0],"i8",v);N.Pg=B([32,32,98,50,80,117,108,108,101,121,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.wh=B([32,32,106,100,46,103,114,111,117,110,100,65,110,99,104,111,114,65,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Bh=B([32,32,106,100,46,103,114,111,117,110,100,65,110,99,104,111,114,66,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.af=B([32,32,106,100,46,108,101,110,103,116,104,65,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.lf=B([32,32,106,100,46,108,101,110,103,116,104,66,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Fb=B([32,32,106,100,46,114,97,116,105,111,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.tc=B([49,51,98,50,80,117,108,108,101,121,74,111,105,110,116,0],"i8",v);fN=B(12,"*",v);Ip=B([0,0,0,0,0,0,0,0,294,0,0,0,296,0,0,0,298,0,0,0,300,0,0,0,302,0,0,0,304,0,0,0,306,0,0,0,308,0,0,0,310,0,0,0,312,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.hi=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,68,121,110,97,109,105,99,115,47,74,111,105,110,116,115,47,98,50,82,101,118,111,108,117,116,101,74,111,105,110,116,46,99,112,112,0],"i8",v);N.Uh=B([118,111,105,100,32,98,50,82,101,118,111,108,117,116,101,74,111,105,110,116,58,58,83,101,116,76,105,109,105,116,115,40,102,108,111,97,116,51,50,44,32,102,108,111,97,116,51,50,41,0],"i8",v);N.$h=B([108,111,119,101,114,32,60,61,32,117,112,112,101,114,0],"i8",v);N.gg=B([32,32,98,50,82,101,118,111,108,117,116,101,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.Yb=B([32,32,106,100,46,101,110,97,98,108,101,76,105,109,105,116,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.Ve=B([32,32,106,100,46,108,111,119,101,114,65,110,103,108,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.bf=B([32,32,106,100,46,117,112,112,101,114,65,110,103,108,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.zc=B([49,53,98,50,82,101,118,111,108,117,116,101,74,111,105,110,116,0],"i8",v);gN=B(12,"*",v);Op=B([0,0,0,0,0,0,0,0,314,0,0,0,316,0,0,0,318,0,0,0,320,0,0,0,322,0,0,0,324,0,0,0,326,0,0,0,328,0,0,0,330,0,0,0,332,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Tg=B([32,32,98,50,82,111,112,101,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.sh=B([32,32,106,100,46,109,97,120,76,101,110,103,116,104,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.nc=B([49,49,98,50,82,111,112,101,74,111,105,110,116,0],"i8",v);hN=B(12,"*",v);Mp=B([0,0,0,0,0,0,0,0,334,0,0,0,336,0,0,0,338,0,0,0,340,0,0,0,342,0,0,0,344,0,0,0,346,0,0,0,348,0,0,0,350,0,0,0,352,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Ug=B([32,32,98,50,87,101,108,100,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.$a=B([32,32,106,100,46,114,101,102,101,114,101,110,99,101,65,110,103,108,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.oc=B([49,49,98,50,87,101,108,100,74,111,105,110,116,0],"i8",v);iN=B(12,"*",v);hq=B([0,0,0,0,0,0,0,0,354,0,0,0,356,0,0,0,358,0,0,0,360,0,0,0,362,0,0,0,364,0,0,0,366,0,0,0,368,0,0,0,370,0,0,0,372,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Wg=B([32,32,98,50,87,104,101,101,108,74,111,105,110,116,68,101,102,32,106,100,59,10,0],"i8",v);N.A=B([32,32,106,100,46,98,111,100,121,65,32,61,32,98,111,100,105,101,115,91,37,100,93,59,10,0],"i8",v);N.B=B([32,32,106,100,46,98,111,100,121,66,32,61,32,98,111,100,105,101,115,91,37,100,93,59,10,0],"i8",v);N.C=B([32,32,106,100,46,99,111,108,108,105,100,101,67,111,110,110,101,99,116,101,100,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.K=B([32,32,106,100,46,108,111,99,97,108,65,110,99,104,111,114,65,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.L=B([32,32,106,100,46,108,111,99,97,108,65,110,99,104,111,114,66,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.Wb=B([32,32,106,100,46,108,111,99,97,108,65,120,105,115,65,46,83,101,116,40,37,46,49,53,108,101,102,44,32,37,46,49,53,108,101,102,41,59,10,0],"i8",v);N.ab=B([32,32,106,100,46,101,110,97,98,108,101,77,111,116,111,114,32,61,32,98,111,111,108,40,37,100,41,59,10,0],"i8",v);N.bb=B([32,32,106,100,46,109,111,116,111,114,83,112,101,101,100,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Zb=B([32,32,106,100,46,109,97,120,77,111,116,111,114,84,111,114,113,117,101,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Na=B([32,32,106,100,46,102,114,101,113,117,101,110,99,121,72,122,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.Oa=B([32,32,106,100,46,100,97,109,112,105,110,103,82,97,116,105,111,32,61,32,37,46,49,53,108,101,102,59,10,0],"i8",v);N.z=B([32,32,106,111,105,110,116,115,91,37,100,93,32,61,32,109,95,119,111,114,108,100,45,62,67,114,101,97,116,101,74,111,105,110,116,40,38,106,100,41,59,10,0],"i8",v);N.rc=B([49,50,98,50,87,104,101,101,108,74,111,105,110,116,0],"i8",v);jN=B(12,"*",v);N.ii=B([66,111,120,50,68,95,118,50,46,50,46,49,47,66,111,120,50,68,47,82,111,112,101,47,98,50,82,111,112,101,46,99,112,112,0],"i8",v);N.Wh=B([118,111,105,100,32,98,50,82,111,112,101,58,58,73,110,105,116,105,97,108,105,122,101,40,99,111,110,115,116,32,98,50,82,111,112,101,68,101,102,32,42,41,0],"i8",v);N.ai=B([100,101,102,45,62,99,111,117,110,116,32,62,61,32,51,0],"i8",v);pu=B(8,"float",v);nu=B(8,["i64",0,0,0,"i32",0,0,0],v);gx=B(8,"float",v);fx=B(8,["i64",0,0,0,"i32",0,0,0],v);kx=B(8,"float",v);jx=B(8,["i64",0,0,0,"i32",0,0,0],v);nx=B(8,"float",v);mx=B(8,["i64",0,0,0,"i32",0,0,0],v);KF=B(8,"float",v);JF=B(8,["i64",0,0,0,"i32",0,0,0],v);vG=B(8,"float",v);uG=B(8,["i64",0,0,0,"i32",0,0,0],v);yG=B(8,"float",v);xG=B(8,["i64",0,0,0,"i32",0,0,0],v);CG=B(8,"float",v);BG=B(8,["i64",0,0,0,"i32",0,0,0],v);FG=B(8,"float",v);EG=B(8,["i64",0,0,0,"i32",0,0,0],v);IG=B(8,"float",v);HG=B(8,["i64",0,0,0,"i32",0,0,0],v);MG=B(8,"float",v);LG=B(8,["i64",0,0,0,"i32",0,0,0],v);xI=B(8,"float",v);wI=B(8,["i64",0,0,0,"i32",0,0,0],v);CI=B(8,"float",v);BI=B(8,["i64",0,0,0,"i32",0,0,0],v);II=B(12,"float",v);HI=B(8,["i64",0,0,0,"i32",0,0,0],v);kK=B(8,"float",v);jK=B(8,["i64",0,0,0,"i32",0,0,0],v);nK=B(8,"float",v);mK=B(8,["i64",0,0,0,"i32",0,0,0],v);B([374,0,0,0,376,0,0,0,378,0,0,0,380,0,0,0,382,0,0,0,384,0,0,0,386,0,0,0,388,0,0,0,390,0,0,0,392,0,0,0,394,0,0,0,396,0,0,0,398,0,0,0,400,0,0,0,402,0,0,0,404,0,0,0,406,0,0,0,408,0,0,0,410,0,0,0,412,0,0,0,414,0,0,0,416,0,0,0,418,0,0,0,420,0,0,0,422,0,0,0,424,0,0,0,426,0,0,0,428,0,0,0,430,0,0,0,432,0,0,0,434,0,0,0,436,0,0,0,438,0,0,0,440,0,0,0,442,0,0,0,444,0,0,0,446,0,0,0,448,0,0,0,450,0,0,0,452,0,0,0,454,0,0,0,456,0,0,0,458,0,0,0,460,0,0,0,462,0,0,0,464,0,0,0,466,0,0,0,468,0,0,0,470,0,0,0,472,0,0,0,474,0,0,0,476,0,0,0,478,0,0,0,480,0,0,0,482,0,0,0,484,0,0,0,486,0,0,0,488,0,0,0,490,0,0,0,492,0,0,0,494,0,0,0,496,0,0,0,498,0,0,0,500,0,0,0,502,0,0,0,504,0,0,0,506,0,0,0,508,0,0,0,510,0,0,0,512,0,0,0,514,0,0,0,516,0,0,0,518,0,0,0,520,0,0,0,522,0,0,0,524,0,0,0,526,0,0,0,528,0,0,0,530,0,0,0,532,0,0,0,534,0,0,0,536,0,0,0,538,0,0,0,540,0,0,0,542,0,0,0,544,0,0,0,546,0,0,0,548,0,0,0,550,0,0,0,552,0,0,0,554,0,0,0,556,0,0,0,558,0,0,0,560,0,0,0,562,0,0,0,564,0,0,0,566,0,0,0,568,0,0,0,570,0,0,0,572,0,0,0,574,0,0,0,576,0,0,0,578,0,0,0,580,0,0,0,582,0,0,0,584,0,0,0,586,0,0,0,588,0,0,0,590,0,0,0,592,0,0,0,594,0,0,0,596,0,0,0,598,0,0,0,600,0,0,0,602,0,0,0,604,0,0,0,606,0,0,0,608,0,0,0,610,0,0,0,612,0,0,0,614,0,0,0,616,0,0,0,618,0,0,0,620,0,0,0,622,0,0,0,624,0,0,0,626,0,0,0,628,0,0,0,630,0,0,0,632,0,0,0,634,0,0,0,636,0,0,0,638,0,0,0,640,0,0,0,642,0,0,0,644,0,0,0,646,0,0,0,648,0,0,0,650,0,0,0,652,0,0,0,654,0,0,0,656,0,0,0,658,0,0,0,660,0,0,0,662,0,0,0,664,0,0,0,666,0,0,0,668,0,0,0,670,0,0,0,672,0,0,0,674,0,0,0,676,0,0,0,678,0,0,0,680,0,0,0,682,0,0,0,684,0,0,0,686,0,0,0,688,0,0,0,690,0,0,0,692,0,0,0,694,0,0,0,696,0,0,0,698,0,0,0,700,0,0,0,702,0,0,0,704,0,0,0,706,0,0,0,708,0,0,0,710,0,0,0,712,0,0,0,714,0,0,0,716,0,0,0,718,0,0,0,720,0,0,0,722,0,0,0,724,0,0,0,726,0,0,0,728,0,0,0,730,0,0,0,732,0,0,0,734,0,0,0,736,0,0,0,738,0,0,0,740,0,0,0,742,0,0,0,744,0,0,0,746,0,0,0,748,0,0,0,750,0,0,0,752,0,0,0,754,0,0,0,756,0,0,0,758,0,0,0,760,0,0,0,762,0,0,0,764,0,0,0,766,0,0,0,768,0,0,0,770,0,0,0,772,0,0,0,774,0,0,0,776,0,0,0,778,0,0,0,780,0,0,0,782,0,0,0,784,0,0,0,786,0,0,0,788,0,0,0,790,0,0,0,792,0,0,0,794,0,0,0,796,0,0,0,798,0,0,0,800,0,0,0,802,0,0,0,804,0,0,0,806,0,0,0,808,0,0,0,810,0,0,0,812,0,0,0,814,0,0,0,816,0,0,0,818,0,0,0,820,0,0,0,822,0,0,0,824,0,0,0,826,0,0,0,828,0,0,0,830,0,0,0,832,0,0,0,834,0,0,0,836,0,0,0,838,0,0,0,840,0,0,0,842,0,0,0,844,0,0,0,846,0,0,0,848,0,0,0,850,0,0,0,852,0,0,0,854,0,0,0,856,0,0,0,858,0,0,0,860,0,0,0,862,0,0,0,864,0,0,0,866,0,0,0,868,0,0,0,870,0,0,0,872,0,0,0,874,0,0,0,876,0,0,0,878,0,0,0,880,0,0,0,882,0,0,0,884,0,0,0,886,0,0,0,888,0,0,0,890,0,0,0,892,0,0,0,894,0,0,0,896,0,0,0,898,0,0,0,900,0,0,0,902,0,0,0,904,0,0,0,906,0,0,0,908,0,0,0,910,0,0,0,912,0,0,0,914,0,0,0,916,0,0,0,918,0,0,0,920,0,0,0,922,0,0,0,924,0,0,0,926,0,0,0,928,0,0,0,930,0,0,0,932,0,0,0,934,0,0,0,936,0,0,0,938,0,0,0,940,0,0,0,942,0,0,0,944,0,0,0,946,0,0,0,948,0,0,0,950,0,0,0,952,0,0,0,954,0,0,0,956,0,0,0,958,0,0,0,960,0,0,0,962,0,0,0,964,0,0,0,966,0,0,0,968,0,0,0,970,0,0,0,972,0,0,0,974,0,0,0,976,0,0,0,978,0,0,0,980,0,0,0,982,0,0,0,984,0,0,0,986,0,0,0,988,0,0,0,990,0,0,0,992,0,0,0,994,0,0,0,996,0,0,0,998,0,0,0,1e3,0,0,0,1002,0,0,0,1004,0,0,0,1006,0,0,0,1008,0,0,0,1010,0,0,0,1012,0,0,0,1014,0,0,0,1016,0,0,0,1018,0,0,0,1020,0,0,0,1022,0,0,0,1024,0,0,0,1026,0,0,0,1028,0,0,0,1030,0,0,0,1032,0,0,0,1034,0,0,0,1036,0,0,0,1038,0,0,0,1040,0,0,0,1042,0,0,0,1044,0,0,0,1046,0,0,0,1048,0,0,0,1050,0,0,0,1052,0,0,0,1054,0,0,0,1056,0,0,0,1058,0,0,0,1060,0,0,0,1062,0,0,0,1064,0,0,0,1066,0,0,0,1068,0,0,0,1070,0,0,0,1072,0,0,0,1074,0,0,0,1076,0,0,0,1078,0,0,0,1080,0,0,0,1082,0,0,0,1084,0,0,0,1086,0,0,0,1088,0,0,0,1090,0,0,0,1092,0,0,0,1094,0,0,0,1096,0,0,0,1098,0,0,0,1100,0,0,0,1102,0,0,0,1104,0,0,0,1106,0,0,0,1108,0,0,0,1110,0,0,0,1112,0,0,0,1114,0,0,0,1116,0,0,0,1118,0,0,0,1120,0,0,0,1122,0,0,0,1124,0,0,0,1126,0,0,0,1128,0,0,0,1130,0,0,0,1132,0,0,0,1134,0,0,0,1136,0,0,0,1138,0,0,0,1140,0,0,0,1142,0,0,0,1144,0,0,0,1146,0,0,0,1148,0,0,0,1150,0,0,0,1152,0,0,0,1154,0,0,0,1156,0,0,0,1158,0,0,0,1160,0,0,0,1162,0,0,0,1164,0,0,0,1166,0,0,0,1168,0,0,0,1170,0,0,0,1172,0,0,0,1174,0,0,0,1176,0,0,0,1178,0,0,0,1180,0,0,0,1182,0,0,0,1184,0,0,0,1186,0,0,0,1188,0,0,0,1190,0,0,0,1192,0,0,0,1194,0,0,0,1196,0,0,0,1198,0,0,0,1200,0,0,0,1202,0,0,0,1204,0,0,0,1206,0,0,0,1208,0,0,0,1210,0,0,0,1212,0,0,0,1214,0,0,0,1216,0,0,0,1218,0,0,0,1220,0,0,0,1222,0,0,0,1224,0,0,0,1226,0,0,0,1228,0,0,0,1230,0,0,0,1232,0,0,0,1234,0,0,0,1236,0,0,0,1238,0,0,0,1240,0,0,0,1242,0,0,0,1244,0,0,0,1246,0,0,0,1248,0,0,0,1250,0,0,0,1252,0,0,0,1254,0,0,0,1256,0,0,0,1258,0,0,0,1260,0,0,0,1262,0,0,0,1264,0,0,0,1266,0,0,0,1268,0,0,0,1270,0,0,0,1272,0,0,0,1274,0,0,0,1276,0,0,0,1278,0,0,0,1280,0,0,0,1282,0,0,0,1284,0,0,0,1286,0,0,0,1288,0,0,0,1290,0,0,0,1292,0,0,0,1294,0,0,0,1296,0,0,0,1298,0,0,0,1300,0,0,0,1302,0,0,0,1304,0,0,0,1306,0,0,0,1308,0,0,0,1310,0,0,0,1312,0,0,0,1314,0,0,0,1316,0,0,0,1318,0,0,0,1320,0,0,0,1322,0,0,0,1324,0,0,0,1326,0,0,0,1328,0,0,0,1330,0,0,0,1332,0,0,0,1334,0,0,0,1336,0,0,0,1338,0,0,0,1340,0,0,0,1342,0,0,0,1344,0,0,0,1346,0,0,0,1348,0,0,0,1350,0,0,0,1352,0,0,0,1354,0,0,0,1356,0,0,0,1358,0,0,0,1360,0,0,0,1362,0,0,0,1364,0,0,0,1366,0,0,0,1368,0,0,0,1370,0,0,0,1372,0,0,0,1374,0,0,0,1376,0,0,0,1378,0,0,0,1380,0,0,0,1382,0,0,0,1384,0,0,0,1386,0,0,0,1388,0,0,0,1390,0,0,0,1392,0,0,0,1394,0,0,0,1396,0,0,0,1398,0,0,0,1400,0,0,0,1402,0,0,0,1404,0,0,0,1406,0,0,0,1408,0,0,0,1410,0,0,0,1412,0,0,0,1414,0,0,0,1416,0,0,0,1418,0,0,0,1420,0,0,0,1422,0,0,0,1424,0,0,0,1426,0,0,0,1428,0,0,0,1430,0,0,0,1432,0,0,0,1434,0,0,0,1436,0,0,0,1438,0,0,0,1440,0,0,0,1442,0,0,0,1444,0,0,0,1446,0,0,0,1448,0,0,0,1450,0,0,0,1452,0,0,0,1454,0,0,0,1456,0,0,0,1458,0,0,0,1460,0,0,0,1462,0,0,0,1464,0,0,0,1466,0,0,0,1468,0,0,0,1470,0,0,0,1472,0,0,0,1474,0,0,0,1476,0,0,0,1478,0,0,0,1480,0,0,0,1482,0,0,0,1484,0,0,0,1486,0,0,0,1488,0,0,0,1490,0,0,0,1492,0,0,0,1494,0,0,0,1496,0,0,0,1498,0,0,0,1500,0,0,0,1502,0,0,0,1504,0,0,0,1506,0,0,0,1508,0,0,0,1510,0,0,0,1512,0,0,0,1514,0,0,0,1516,0,0,0,1518,0,0,0,1520,0,0,0,1522,0,0,0,1524,0,0,0,1526,0,0,0,1528,0,0,0,1530,0,0,0,1532,0,0,0,1534,0,0,0,1536,0,0,0,1538,0,0,0,1540,0,0,0,1542,0,0,0,1544,0,0,0,1546,0,0,0,1548,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);N.Qc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,115,104,105,109,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);kN=B(12,"*",v);N.Sc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);lN=B(12,"*",v);N.$c=B([78,83,116,51,95,95,49,57,110,117,108,108,112,116,114,95,116,69,0],"i8",v);mN=B(8,"*",v);N.Uc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,57,95,95,112,111,105,110,116,101,114,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);N.Tc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,112,98,97,115,101,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);nN=B(12,"*",v);oN=B(12,"*",v);pN=B([0,0,0,0,0,0,0,0,1550,0,0,0,1552,0,0,0,102,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);UL=B([0,0,0,0,0,0,0,0,1550,0,0,0,1554,0,0,0,1556,0,0,0,1558,0,0,0,1560,0,0,0,1562,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);qN=B([0,0,0,0,0,0,0,0,1550,0,0,0,1564,0,0,0,1566,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);rN=B([0,0,0,0,0,0,0,0,1550,0,0,0,1568,0,0,0,1570,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Yc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,50,51,95,95,102,117,110,100,97,109,101,110,116,97,108,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);sN=B(12,"*",v);N.de=B([118,0],"i8",v);tN=B(8,"*",v);N.Ld=B([80,118,0],"i8",v);uN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ud=B([80,75,118,0],"i8",v);vN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Nc=B([68,110,0],"i8",v);wN=B(8,"*",v);N.bd=B([80,68,110,0],"i8",v);xN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ed=B([80,75,68,110,0],"i8",v);yN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Sd=B([98,0],"i8",v);zN=B(8,"*",v);N.zd=B([80,98,0],"i8",v);AN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.hd=B([80,75,98,0],"i8",v);BN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ee=B([119,0],"i8",v);CN=B(8,"*",v);N.Md=B([80,119,0],"i8",v);DN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.vd=B([80,75,119,0],"i8",v);EN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Td=B([99,0],"i8",v);FN=B(8,"*",v);N.Ad=B([80,99,0],"i8",v);GN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.jd=B([80,75,99,0],"i8",v);HN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Xd=B([104,0],"i8",v);IN=B(8,"*",v);N.Ed=B([80,104,0],"i8",v);JN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.nd=B([80,75,104,0],"i8",v);KN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Rd=B([97,0],"i8",v);LN=B(8,"*",v);N.yd=B([80,97,0],"i8",v);MN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.gd=B([80,75,97,0],"i8",v);NN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.be=B([115,0],"i8",v);ON=B(8,"*",v);N.Jd=B([80,115,0],"i8",v);PN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.sd=B([80,75,115,0],"i8",v);QN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ce=B([116,0],"i8",v);RN=B(8,"*",v);N.Kd=B([80,116,0],"i8",v);SN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.td=B([80,75,116,0],"i8",v);TN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Yd=B([105,0],"i8",v);UN=B(8,"*",v);N.Fd=B([80,105,0],"i8",v);VN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.od=B([80,75,105,0],"i8",v);WN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Zd=B([106,0],"i8",v);XN=B(8,"*",v);N.Gd=B([80,106,0],"i8",v);YN=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.pd=B([80,75,106,0],"i8",v);ZN=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.$d=B([108,0],"i8",v);$N=B(8,"*",v);N.Hd=B([80,108,0],"i8",v);aO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.qd=B([80,75,108,0],"i8",v);bO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ae=B([109,0],"i8",v);cO=B(8,"*",v);N.Id=B([80,109,0],"i8",v);dO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.rd=B([80,75,109,0],"i8",v);eO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.fe=B([120,0],"i8",v);fO=B(8,"*",v);N.Nd=B([80,120,0],"i8",v);gO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.wd=B([80,75,120,0],"i8",v);hO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ge=B([121,0],"i8",v);iO=B(8,"*",v);N.Od=B([80,121,0],"i8",v);jO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.xd=B([80,75,121,0],"i8",v);kO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Wd=B([102,0],"i8",v);lO=B(8,"*",v);N.Dd=B([80,102,0],"i8",v);mO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.md=B([80,75,102,0],"i8",v);nO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Ud=B([100,0],"i8",v);oO=B(8,"*",v);N.Bd=B([80,100,0],"i8",v);pO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.kd=B([80,75,100,0],"i8",v);qO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Vd=B([101,0],"i8",v);rO=B(8,"*",v);N.Cd=B([80,101,0],"i8",v);sO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.ld=B([80,75,101,0],"i8",v);tO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Oc=B([68,115,0],"i8",v);uO=B(8,"*",v);N.cd=B([80,68,115,0],"i8",v);vO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.fd=B([80,75,68,115,0],"i8",v);wO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.Mc=B([68,105,0],"i8",v);xO=B(8,"*",v);N.ad=B([80,68,105,0],"i8",v);yO=B(16,["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);N.dd=B([80,75,68,105,0],"i8",v);zO=B([0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0],["*",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0],v);AO=B([0,0,0,0,0,0,0,0,1550,0,0,0,1572,0,0,0,1574,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Rc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,55,95,95,97,114,114,97,121,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);BO=B(12,"*",v);CO=B([0,0,0,0,0,0,0,0,1550,0,0,0,1576,0,0,0,1578,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Vc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,102,117,110,99,116,105,111,110,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);DO=B(12,"*",v);EO=B([0,0,0,0,0,0,0,0,1550,0,0,0,1580,0,0,0,1582,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Pc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,49,54,95,95,101,110,117,109,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);FO=B(12,"*",v);VL=B([0,0,0,0,0,0,0,0,1550,0,0,0,1584,0,0,0,1556,0,0,0,1586,0,0,0,1588,0,0,0,1590,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Wc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,50,48,95,95,115,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);GO=B(12,"*",v);HO=B([0,0,0,0,0,0,0,0,1550,0,0,0,1592,0,0,0,1556,0,0,0,1594,0,0,0,1596,0,0,0,1598,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Xc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,50,49,95,95,118,109,105,95,99,108,97,115,115,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);IO=B(12,"*",v);TL=B([0,0,0,0,0,0,0,0,1550,0,0,0,1600,0,0,0,1602,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);JO=B([0,0,0,0,0,0,0,0,1550,0,0,0,1604,0,0,0,1566,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Zc=B([78,49,48,95,95,99,120,120,97,98,105,118,49,50,57,95,95,112,111,105,110,116,101,114,95,116,111,95,109,101,109,98,101,114,95,116,121,112,101,95,105,110,102,111,69,0],"i8",v);KO=B(12,"*",v);Y=B(468,["i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"i32",0,0,0,"i32",0,0,0,"i32",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0,"i32",0,0,0,"*",0,0,0,"i32",0,0,0],v);LL=B(24,"i32",v);N.gi=B([109,97,120,32,115,121,115,116,101,109,32,98,121,116,101,115,32,61,32,37,49,48,108,117,10,0],"i8",v);N.Zh=B([115,121,115,116,101,109,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0],"i8",v);N.ci=B([105,110,32,117,115,101,32,98,121,116,101,115,32,32,32,32,32,61,32,37,49,48,108,117,10,0],"i8",v);B(1,"i8",v);PL=B(4,"void ()*",v);QL=B([0,0,0,0,0,0,0,0,32,0,0,0,1606,0,0,0,1608,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.Qg=B([115,116,100,58,58,98,97,100,95,97,108,108,111,99,0],"i8",v);LO=B([0,0,0,0,0,0,0,0,32,0,0,0,1610,0,0,0,1612,0,0,0],["*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0,"*",0,0,0],v);B(1,"void*",v);N.uf=B([98,97,100,95,97,114,114,97,121,95,110,101,119,95,108,101,110,103,116,104,0],"i8",v);N.Qd=B([83,116,57,98,97,100,95,97,108,108,111,99,0],"i8",v);RL=B(12,"*",v);N.Pd=B([83,116,50,48,98,97,100,95,97,114,114,97,121,95,110,101,119,95,108,101,110,103,116,104,0],"i8",v);MO=B(12,"*",v);l[zy+4>>2]=BM;l[AM>>2]=UL+8|0;l[AM+4>>2]=N.Kc|0;l[BM>>2]=VL+8|0;l[BM+4>>2]=N.pc|0;l[BM+8>>2]=AM;l[Xw+4>>2]=CM;l[CM>>2]=VL+8|0;l[CM+4>>2]=N.sc|0;l[CM+8>>2]=AM;l[yF+4>>2]=DM;l[DM>>2]=VL+8|0;l[DM+4>>2]=N.lc|0;l[DM+8>>2]=AM;l[pF+4>>2]=EM;l[EM>>2]=VL+8|0;l[EM+4>>2]=N.uc|0;l[EM+8>>2]=AM;l[FM+4>>2]=GM;l[GM>>2]=UL+8|0;l[GM+4>>2]=N.Ic|0;l[yp>>2]=IM+8|0;l[zp>>2]=zx+8|0;l[zx+4>>2]=HM;l[HM>>2]=UL+8|0;l[HM+4>>2]=N.Cc|0;l[IM+4>>2]=JM;l[JM>>2]=UL+8|0;l[JM+4>>2]=N.wc|0;l[KM+4>>2]=MM;l[LM>>2]=UL+8|0;l[LM+4>>2]=N.Lc|0;l[MM>>2]=VL+8|0;l[MM+4>>2]=N.Ec|0;l[MM+8>>2]=LM;l[NM+4>>2]=OM;l[OM>>2]=VL+8|0;l[OM+4>>2]=N.Gc|0;l[OM+8>>2]=LM;l[PM+4>>2]=QM;l[QM>>2]=VL+8|0;l[QM+4>>2]=N.vc|0;l[QM+8>>2]=LM;l[RM+4>>2]=LM;l[SM+4>>2]=TM;l[TM>>2]=VL+8|0;l[TM+4>>2]=N.Dc|0;l[TM+8>>2]=LM;l[UM+4>>2]=VM;l[VM>>2]=VL+8|0;l[VM+4>>2]=N.Fc|0;l[VM+8>>2]=LM;l[WM+4>>2]=XM;l[XM>>2]=VL+8|0;l[XM+4>>2]=N.Hc|0;l[XM+8>>2]=LM;l[YM+4>>2]=ZM;l[ZM>>2]=VL+8|0;l[ZM+4>>2]=N.Ac|0;l[ZM+8>>2]=LM;l[Fp+4>>2]=aN;l[$M>>2]=UL+8|0;l[$M+4>>2]=N.Jc|0;l[aN>>2]=VL+8|0;l[aN+4>>2]=N.xc|0;l[aN+8>>2]=$M;l[Np+4>>2]=bN;l[bN>>2]=VL+8|0;l[bN+4>>2]=N.yc|0;l[bN+8>>2]=$M;l[cq+4>>2]=cN;l[cN>>2]=VL+8|0;l[cN+4>>2]=N.mc|0;l[cN+8>>2]=$M;l[Ep+4>>2]=$M;l[dq+4>>2]=dN;l[dN>>2]=VL+8|0;l[dN+4>>2]=N.qc|0;l[dN+8>>2]=$M;l[eq+4>>2]=eN;l[eN>>2]=VL+8|0;l[eN+4>>2]=N.Bc|0;l[eN+8>>2]=$M;l[gq+4>>2]=fN;l[fN>>2]=VL+8|0;l[fN+4>>2]=N.tc|0;l[fN+8>>2]=$M;l[Ip+4>>2]=gN;l[gN>>2]=VL+8|0;l[gN+4>>2]=N.zc|0;l[gN+8>>2]=$M;l[Op+4>>2]=hN;l[hN>>2]=VL+8|0;l[hN+4>>2]=N.nc|0;l[hN+8>>2]=$M;l[Mp+4>>2]=iN;l[iN>>2]=VL+8|0;l[iN+4>>2]=N.oc|0;l[iN+8>>2]=$M;l[hq+4>>2]=jN;l[jN>>2]=VL+8|0;l[jN+4>>2]=N.rc|0;l[jN+8>>2]=$M;l[kN>>2]=VL+8|0;l[kN+4>>2]=N.Qc|0;l[kN+8>>2]=Ha;l[lN>>2]=VL+8|0;l[lN+4>>2]=N.Sc|0;l[lN+8>>2]=kN;l[mN>>2]=UL+8|0;l[mN+4>>2]=N.$c|0;l[nN>>2]=VL+8|0;l[nN+4>>2]=N.Tc|0;l[nN+8>>2]=kN;l[oN>>2]=VL+8|0;l[oN+4>>2]=N.Uc|0;l[oN+8>>2]=nN;l[pN+4>>2]=kN;l[UL+4>>2]=lN;l[qN+4>>2]=nN;l[rN+4>>2]=sN;l[sN>>2]=VL+8|0;l[sN+4>>2]=N.Yc|0;l[sN+8>>2]=kN;l[tN>>2]=rN+8|0;l[tN+4>>2]=N.de|0;l[uN>>2]=TL+8|0;l[uN+4>>2]=N.Ld|0;l[uN+12>>2]=tN;l[vN>>2]=TL+8|0;l[vN+4>>2]=N.ud|0;l[vN+12>>2]=tN;l[wN>>2]=rN+8|0;l[wN+4>>2]=N.Nc|0;l[xN>>2]=TL+8|0;l[xN+4>>2]=N.bd|0;l[xN+12>>2]=wN;l[yN>>2]=TL+8|0;l[yN+4>>2]=N.ed|0;l[yN+12>>2]=wN;l[zN>>2]=rN+8|0;l[zN+4>>2]=N.Sd|0;l[AN>>2]=TL+8|0;l[AN+4>>2]=N.zd|0;l[AN+12>>2]=zN;l[BN>>2]=TL+8|0;l[BN+4>>2]=N.hd|0;l[BN+12>>2]=zN;l[CN>>2]=rN+8|0;l[CN+4>>2]=N.ee|0;l[DN>>2]=TL+8|0;l[DN+4>>2]=N.Md|0;l[DN+12>>2]=CN;l[EN>>2]=TL+8|0;l[EN+4>>2]=N.vd|0;l[EN+12>>2]=CN;l[FN>>2]=rN+8|0;l[FN+4>>2]=N.Td|0;l[GN>>2]=TL+8|0;l[GN+4>>2]=N.Ad|0;l[GN+12>>2]=FN;l[HN>>2]=TL+8|0;l[HN+4>>2]=N.jd|0;l[HN+12>>2]=FN;l[IN>>2]=rN+8|0;l[IN+4>>2]=N.Xd|0;l[JN>>2]=TL+8|0;l[JN+4>>2]=N.Ed|0;l[JN+12>>2]=IN;l[KN>>2]=TL+8|0;l[KN+4>>2]=N.nd|0;l[KN+12>>2]=IN;l[LN>>2]=rN+8|0;l[LN+4>>2]=N.Rd|0;l[MN>>2]=TL+8|0;l[MN+4>>2]=N.yd|0;l[MN+12>>2]=LN;l[NN>>2]=TL+8|0;l[NN+4>>2]=N.gd|0;l[NN+12>>2]=LN;l[ON>>2]=rN+8|0;l[ON+4>>2]=N.be|0;l[PN>>2]=TL+8|0;l[PN+4>>2]=N.Jd|0;l[PN+12>>2]=ON;l[QN>>2]=TL+8|0;l[QN+4>>2]=N.sd|0;l[QN+12>>2]=ON;l[RN>>2]=rN+8|0;l[RN+4>>2]=N.ce|0;l[SN>>2]=TL+8|0;l[SN+4>>2]=N.Kd|0;l[SN+12>>2]=RN;l[TN>>2]=TL+8|0;l[TN+4>>2]=N.td|0;l[TN+12>>2]=RN;l[UN>>2]=rN+8|0;l[UN+4>>2]=N.Yd|0;l[VN>>2]=TL+8|0;l[VN+4>>2]=N.Fd|0;l[VN+12>>2]=UN;l[WN>>2]=TL+8|0;l[WN+4>>2]=N.od|0;l[WN+12>>2]=UN;l[XN>>2]=rN+8|0;l[XN+4>>2]=N.Zd|0;l[YN>>2]=TL+8|0;l[YN+4>>2]=N.Gd|0;l[YN+12>>2]=XN;l[ZN>>2]=TL+8|0;l[ZN+4>>2]=N.pd|0;l[ZN+12>>2]=XN;l[$N>>2]=rN+8|0;l[$N+4>>2]=N.$d|0;l[aO>>2]=TL+8|0;l[aO+4>>2]=N.Hd|0;l[aO+12>>2]=$N;l[bO>>2]=TL+8|0;l[bO+4>>2]=N.qd|0;l[bO+12>>2]=$N;l[cO>>2]=rN+8|0;l[cO+4>>2]=N.ae|0;l[dO>>2]=TL+8|0;l[dO+4>>2]=N.Id|0;l[dO+12>>2]=cO;l[eO>>2]=TL+8|0;l[eO+4>>2]=N.rd|0;l[eO+12>>2]=cO;l[fO>>2]=rN+8|0;l[fO+4>>2]=N.fe|0;l[gO>>2]=TL+8|0;l[gO+4>>2]=N.Nd|0;l[gO+12>>2]=fO;l[hO>>2]=TL+8|0;l[hO+4>>2]=N.wd|0;l[hO+12>>2]=fO;l[iO>>2]=rN+8|0;l[iO+4>>2]=N.ge|0;l[jO>>2]=TL+8|0;l[jO+4>>2]=N.Od|0;l[jO+12>>2]=iO;l[kO>>2]=TL+8|0;l[kO+4>>2]=N.xd|0;l[kO+12>>2]=iO;l[lO>>2]=rN+8|0;l[lO+4>>2]=N.Wd|0;l[mO>>2]=TL+8|0;l[mO+4>>2]=N.Dd|0;l[mO+12>>2]=lO;l[nO>>2]=TL+8|0;l[nO+4>>2]=N.md|0;l[nO+12>>2]=lO;l[oO>>2]=rN+8|0;l[oO+4>>2]=N.Ud|0;l[pO>>2]=TL+8|0;l[pO+4>>2]=N.Bd|0;l[pO+12>>2]=oO;l[qO>>2]=TL+8|0;l[qO+4>>2]=N.kd|0;l[qO+12>>2]=oO;l[rO>>2]=rN+8|0;l[rO+4>>2]=N.Vd|0;l[sO>>2]=TL+8|0;l[sO+4>>2]=N.Cd|0;l[sO+12>>2]=rO;l[tO>>2]=TL+8|0;l[tO+4>>2]=N.ld|0;l[tO+12>>2]=rO;l[uO>>2]=rN+8|0;l[uO+4>>2]=N.Oc|0;l[vO>>2]=TL+8|0;l[vO+4>>2]=N.cd|0;l[vO+12>>2]=uO;l[wO>>2]=TL+8|0;l[wO+4>>2]=N.fd|0;l[wO+12>>2]=uO;l[xO>>2]=rN+8|0;l[xO+4>>2]=N.Mc|0;l[yO>>2]=TL+8|0;l[yO+4>>2]=N.ad|0;l[yO+12>>2]=xO;l[zO>>2]=TL+8|0;l[zO+4>>2]=N.dd|0;l[zO+12>>2]=xO;l[AO+4>>2]=BO;l[BO>>2]=VL+8|0;l[BO+4>>2]=N.Rc|0;l[BO+8>>2]=kN;l[CO+4>>2]=DO;l[DO>>2]=VL+8|0;l[DO+4>>2]=N.Vc|0;l[DO+8>>2]=kN;l[EO+4>>2]=FO;l[FO>>2]=VL+8|0;l[FO+4>>2]=N.Pc|0;l[FO+8>>2]=kN;l[VL+4>>2]=GO;l[GO>>2]=VL+8|0;l[GO+4>>2]=N.Wc|0;l[GO+8>>2]=lN;l[HO+4>>2]=IO;l[IO>>2]=VL+8|0;l[IO+4>>2]=N.Xc|0;l[IO+8>>2]=lN;l[TL+4>>2]=oN;l[JO+4>>2]=KO;l[KO>>2]=VL+8|0;l[KO+4>>2]=N.Zc|0;l[KO+8>>2]=nN;l[QL+4>>2]=RL;l[LO+4>>2]=MO;l[RL>>2]=VL+8|0;l[RL+4>>2]=N.Qd|0;l[RL+8>>2]=Ha;l[MO>>2]=VL+8|0;l[MO+4>>2]=N.Pd|0;l[MO+8>>2]=RL;K=[0,0,(function(b,d){var e=l[b>>2],f=l[d>>2];return(e|0)<(f|0)?1:(e|0)!=(f|0)?0:(l[b+4>>2]|0)<(l[d+4>>2]|0)}),0,(function(b,d,e,f,g){d=qn(g,144);f=d>>2;if(0!=(d|0)){l[d>>2]=RM+8|0;l[f+1]=4;l[f+12]=b;var h=d+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var g=(d+8|0)>>2,j=g+10;g<j;g++){l[g]=0}g=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[f+34]=g;g=q[b+20>>2];j=q[e+20>>2];q[f+35]=g>j?g:j;l[d>>2]=PM+8|0;0==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.va|0,44,N.fa|0,N.Cb|0),b=l[h>>2]);0!=(l[l[b+12>>2]+4>>2]|0)&&P(N.va|0,45,N.fa|0,N.I|0);h=d}return h|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){d=qn(g,144);f=d>>2;if(0!=(d|0)){l[d>>2]=RM+8|0;l[f+1]=4;l[f+12]=b;var h=d+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var g=(d+8|0)>>2,j=g+10;g<j;g++){l[g]=0}g=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[f+34]=g;g=q[b+20>>2];j=q[e+20>>2];q[f+35]=g>j?g:j;l[d>>2]=WM+8|0;2==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.ya|0,41,N.la|0,N.sa|0),b=l[h>>2]);0!=(l[l[b+12>>2]+4>>2]|0)&&P(N.ya|0,42,N.la|0,N.I|0);h=d}return h|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){d=qn(g,144);f=d>>2;if(0!=(d|0)){l[d>>2]=RM+8|0;l[f+1]=4;l[f+12]=b;var h=d+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var g=(d+8|0)>>2,j=g+10;g<j;g++){l[g]=0}g=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[f+34]=g;g=q[b+20>>2];j=q[e+20>>2];q[f+35]=g>j?g:j;l[d>>2]=YM+8|0;2==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.za|0,44,N.ga|0,N.sa|0),b=l[h>>2]);2!=(l[l[b+12>>2]+4>>2]|0)&&P(N.za|0,45,N.ga|0,N.T|0);h=d}return h|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){d=qn(g,144);f=d>>2;if(0!=(d|0)){l[d>>2]=RM+8|0;l[f+1]=4;l[f+12]=b;var h=d+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var g=(d+8|0)>>2,j=g+10;g<j;g++){l[g]=0}g=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[f+34]=g;g=q[b+20>>2];j=q[e+20>>2];q[f+35]=g>j?g:j;l[d>>2]=SM+8|0;1==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.wa|0,41,N.ha|0,N.ra|0),b=l[h>>2]);0!=(l[l[b+12>>2]+4>>2]|0)&&P(N.wa|0,42,N.ha|0,N.I|0);h=d}return h|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){d=qn(g,144);f=d>>2;if(0!=(d|0)){l[d>>2]=RM+8|0;l[f+1]=4;l[f+12]=b;var h=d+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var g=(d+8|0)>>2,j=g+10;g<j;g++){l[g]=0}g=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[f+34]=g;g=q[b+20>>2];j=q[e+20>>2];q[f+35]=g>j?g:j;l[d>>2]=UM+8|0;1==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.xa|0,41,N.ja|0,N.ra|0),b=l[h>>2]);2!=(l[l[b+12>>2]+4>>2]|0)&&P(N.xa|0,42,N.ja|0,N.T|0);h=d}return h|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){var h,g=qn(g,144);h=g>>2;if(0==(g|0)){b=0}else{l[g>>2]=RM+8|0;l[h+1]=4;l[h+12]=b;var j=g+52|0;l[j>>2]=e;l[h+14]=d;l[h+15]=f;l[h+31]=0;l[h+32]=0;d=(g+8|0)>>2;for(f=d+10;d<f;d++){l[d]=0}d=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[h+34]=d;d=q[b+20>>2];f=q[e+20>>2];q[h+35]=d>f?d:f;l[g>>2]=KM+8|0;3==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.ta|0,43,N.ia|0,N.qa|0),b=l[j>>2]);0!=(l[l[b+12>>2]+4>>2]|0)&&P(N.ta|0,44,N.ia|0,N.I|0);b=g}return b|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b,d,e,f,g){var h,g=qn(g,144);h=g>>2;if(0==(g|0)){b=0}else{l[g>>2]=RM+8|0;l[h+1]=4;l[h+12]=b;var j=g+52|0;l[j>>2]=e;l[h+14]=d;l[h+15]=f;l[h+31]=0;l[h+32]=0;d=(g+8|0)>>2;for(f=d+10;d<f;d++){l[d]=0}d=Fh(q[(b+16|0)>>2]*q[e+16>>2]);q[h+34]=d;d=q[b+20>>2];f=q[e+20>>2];q[h+35]=d>f?d:f;l[g>>2]=NM+8|0;3==(l[l[b+12>>2]+4>>2]|0)?b=e:(P(N.ua|0,43,N.ka|0,N.qa|0),b=l[j>>2]);2!=(l[l[b+12>>2]+4>>2]|0)&&P(N.ua|0,44,N.ka|0,N.T|0);b=g}return b|0}),0,(function(b,d){K[l[l[b>>2]+4>>2]](b);var e=ed[rn+144|0],f=e&255;14>(e&255)||P(N.e|0,173,N.f|0,N.g|0);e=(f<<2)+d+12|0;l[b>>2]=l[e>>2];l[e>>2]=b}),0,(function(b){Ha(b|0)}),0,(function(b){l[b>>2]=zy+8|0;var d=b+12|0;Dh(l[d>>2]);l[d>>2]=0;l[b+16>>2]=0}),0,(function(b){l[b>>2]=zy+8|0;var d=b+12|0;Dh(l[d>>2]);l[d>>2]=0;l[b+16>>2]=0;Ls(b)}),0,(function(b,d){var e,f=qn(d,40);e=f>>2;0==(f|0)?e=0:(l[e]=zy+8|0,l[e+1]=3,q[e+2]=.009999999776482582,l[e+3]=0,l[e+4]=0,c[f+36|0]=0,c[f+37|0]=0,e=f);var f=l[b+12>>2],g=l[b+16>>2],h=e+12|0;6==(0==(l[h>>2]|0)?0==(l[e+16>>2]|0)?7:6:6)&&P(N.F|0,48,N.da|0,N.Sa|0);1<(g|0)||P(N.F|0,49,N.da|0,N.Pb|0);var j=e+16|0;l[j>>2]=g;g=Ne(g<<3);l[h>>2]=g;Ch(g,f,l[j>>2]<<3);f=e+36|0;c[f]=0;h=e+37|0;c[h]=0;var j=b+20|0,g=e+20|0,k=l[j+4>>2];l[g>>2]=l[j>>2];l[g+4>>2]=k;j=b+28|0;g=e+28|0;k=l[j+4>>2];l[g>>2]=l[j>>2];l[g+4>>2]=k;c[f]=c[b+36|0]&1;c[h]=c[b+37|0]&1;return e|0}),0,(function(b){return l[b+16>>2]-1|0}),0,Kb(0),0,(function(b,d,e,f,g){var h,j=a;a+=48;h=j>>2;var k=b+16|0,m=l[k>>2];(m|0)>(g|0)?k=m:(P(N.F|0,129,N.Ie|0,N.Ub|0),k=l[k>>2]);l[h]=yF+8|0;l[h+1]=1;q[h+2]=.009999999776482582;h=j+28|0;l[h>>2]=0;l[h+4>>2]=0;l[h+8>>2]=0;l[h+12>>2]=0;i[h+16>>1]=0;h=g+1|0;var b=l[b+12>>2],g=(g<<3)+b|0,m=j+12|0,n=l[g+4>>2];l[m>>2]=l[g>>2];l[m+4>>2]=n;k=(((h|0)==(k|0)?0:h)<<3)+b|0;g=j+20|0;b=l[k+4>>2];l[g>>2]=l[k>>2];l[g+4>>2]=b;d=Vm(j,d,e,f);a=j;return d}),0,(function(b,d,e,f){var g,h=b+16|0,j=l[h>>2];(j|0)>(f|0)?h=j:(P(N.F|0,148,N.Ge|0,N.Ub|0),h=l[h>>2]);j=f+1|0;j=(j|0)==(h|0)?0:j;g=l[b+12>>2]>>2;var b=q[e+12>>2],k=q[(f<<3>>2)+g],h=q[e+8>>2],m=q[((f<<3)+4>>2)+g],n=q[e>>2],f=b*k-h*m+n,p=q[e+4>>2],e=h*k+b*m+p,k=q[(j<<3>>2)+g];g=q[((j<<3)+4>>2)+g];j=b*k-h*g+n;b=h*k+b*g+p;h=(M[0]=f<j?f:j,t[0]);g=(M[0]=e<b?e:b,t[0])|0;l[d>>2]=0|h;l[d+4>>2]=g;d=d+8|0;f=(M[0]=f>j?f:j,t[0]);e=(M[0]=e>b?e:b,t[0])|0;l[d>>2]=0|f;l[d+4>>2]=e}),0,(function(b,d){var e;e=d>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f=qn(d,20);0==(f|0)?e=0:(l[f>>2]=Xw+8|0,e=(f+4|0)>>2,l[e]=0,l[e+1]=0,l[e+2]=0,l[e+3]=0,e=f);l[e+4>>2]=l[b+4>>2];q[e+8>>2]=q[b+8>>2];var f=b+12|0,g=e+12|0,h=l[f+4>>2];l[g>>2]=l[f>>2];l[g+4>>2]=h;return e|0}),0,Kb(1),0,(function(b,d,e){var f=q[d+12>>2],g=q[b+12>>2],h=q[d+8>>2],j=q[b+16>>2],k=q[e>>2]-(q[d>>2]+(f*g-h*j)),d=q[e+4>>2]-(q[d+4>>2]+h*g+f*j),b=q[b+8>>2];return k*k+d*d<=b*b}),0,(function(b,d,e,f){var g=e>>2,h=q[f+12>>2],j=q[b+12>>2],k=q[f+8>>2],m=q[b+16>>2],n=q[g],e=n-(q[f>>2]+(h*j-k*m)),p=q[g+1],f=p-(q[f+4>>2]+k*j+h*m),h=q[b+8>>2],b=q[g+2]-n,p=q[g+3]-p,j=e*b+f*p,n=b*b+p*p,h=j*j-n*(e*e+f*f-h*h);0>h|1.1920928955078125e-7>n?d=0:(h=Fh(h),h=j+h,j=-h,0<h?d=0:q[g+4]*n<j?d=0:(g=j/n,q[d+8>>2]=g,e+=b*g,g=f+p*g,f=(M[0]=e,t[0]),b=(M[0]=g,t[0])|0,l[d>>2]=0|f,l[d+4>>2]=b,f=Fh(e*e+g*g),1.1920928955078125e-7>f||(f=1/f,q[d>>2]=e*f,q[(d+4|0)>>2]=g*f),d=1));return d}),0,(function(b,d,e){var f=q[e+12>>2],g=q[b+12>>2],h=q[e+8>>2],j=q[b+16>>2],k=q[e>>2]+(f*g-h*j),e=q[e+4>>2]+h*g+f*j,b=b+8|0,f=q[b>>2];q[d>>2]=k-f;q[d+4>>2]=e-f;b=q[b>>2];q[d+8>>2]=k+b;q[d+12>>2]=e+b}),0,(function(b,d,e){var f=b+8|0,g=q[f>>2],e=3.1415927410125732*e*g*g;q[d>>2]=e;var g=b+12|0,h=d+4|0,j=l[g+4>>2];l[h>>2]=l[g>>2];l[h+4>>2]=j;f=q[f>>2];g=q[g>>2];b=q[b+16>>2];q[d+12>>2]=e*(.5*f*f+g*g+b*b)}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f=qn(d,48);e=f>>2;0==(f|0)?f=0:(l[e]=yF+8|0,l[e+1]=1,q[e+2]=.009999999776482582,e=f+28|0,l[e>>2]=0,l[e+4>>2]=0,l[e+8>>2]=0,l[e+12>>2]=0,i[e+16>>1]=0);l[f+4>>2]=l[b+4>>2];q[f+8>>2]=q[b+8>>2];e=b+12|0;var g=f+12|0,h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;e=b+20|0;g=f+20|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;e=b+28|0;g=f+28|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;e=b+36|0;g=f+36|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;c[f+44|0]=c[b+44|0]&1;c[f+45|0]=c[b+45|0]&1;return f|0}),0,Kb(1),0,Kb(0),0,Vm,0,(function(b,d,e){var f=b>>2,g=q[e+12>>2],h=q[f+3],j=q[e+8>>2],k=q[f+4],m=q[e>>2],b=g*h-j*k+m,n=q[e+4>>2],e=j*h+g*k+n,h=q[f+5],k=q[f+6],m=g*h-j*k+m,g=j*h+g*k+n,f=q[f+2],j=(M[0]=(b<m?b:m)-f,t[0]),n=(M[0]=(e<g?e:g)-f,t[0])|0;l[d>>2]=0|j;l[d+4>>2]=n;e=(e>g?e:g)+f;d=d+8|0;b=(M[0]=(b>m?b:m)+f,t[0]);m=(M[0]=e,t[0])|0;l[d>>2]=0|b;l[d+4>>2]=m}),0,(function(b,d){q[d>>2]=0;var e=.5*(q[b+16>>2]+q[b+24>>2]),f=d+4|0,g=(M[0]=.5*(q[b+12>>2]+q[b+20>>2]),t[0]),e=(M[0]=e,t[0])|0;l[f>>2]=0|g;l[f+4>>2]=e;q[d+12>>2]=0}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f=qn(d,152);e=f>>2;0==(f|0)?f=0:(l[e]=pF+8|0,l[e+1]=2,q[e+2]=.009999999776482582,l[e+37]=0,q[e+3]=0,q[e+4]=0);e=f>>2;l[e+1]=l[b+4>>2];q[e+2]=q[b+8>>2];var g=b+12|0,h=f+12|0,j=l[g+4>>2];l[h>>2]=l[g>>2];l[h+4>>2]=j;g=(b+20|0)>>2;h=(f+20|0)>>2;for(j=g+16;g<j;g++,h++){l[h]=l[g]}g=(b+84|0)>>2;h=(f+84|0)>>2;for(j=g+16;g<j;g++,h++){l[h]=l[g]}l[e+37]=l[b+148>>2];return f|0}),0,Kb(1),0,(function(b,d,e){for(var b=b>>2,f=q[e>>2]-q[d>>2],e=q[e+4>>2]-q[d+4>>2],g=q[d+12>>2],h=q[d+8>>2],d=g*f+h*e,f=f*-h+g*e,e=l[b+37],g=0;;){if((g|0)>=(e|0)){var j=1;break}if(0<q[((g<<3)+84>>2)+b]*(d-q[((g<<3)+20>>2)+b])+q[((g<<3)+88>>2)+b]*(f-q[((g<<3)+24>>2)+b])){j=0;break}g=g+1|0}return j}),0,(function(b,d,e,f){var g=e>>2,b=b>>2,h=q[f>>2],j=q[g]-h,k=q[f+4>>2],m=q[g+1]-k,e=f+12|0,n=q[e>>2],f=f+8|0,p=q[f>>2],u=n*j+p*m,r=-p,j=j*r+n*m,h=q[g+2]-h,m=q[g+3]-k,k=n*h+p*m-u,n=h*r+n*m-j,r=q[g+4],p=l[b+37],h=0,g=-1,m=r,w=0;a:for(;;){if((h|0)>=(p|0)){0>w|w>r&&P(N.O|0,249,N.Le|0,N.Rg|0);if(-1>=(g|0)){var x=0;break}q[d+8>>2]=w;x=q[e>>2];e=q[((g<<3)+84>>2)+b];f=q[f>>2];u=q[((g<<3)+88>>2)+b];b=f*e+x*u;x=(M[0]=x*e-f*u,t[0]);b=(M[0]=b,t[0])|0;l[d>>2]=0|x;l[d+4>>2]=b;x=1;break}var y=q[((h<<3)+84>>2)+b],A=q[((h<<3)+88>>2)+b],C=y*(q[((h<<3)+20>>2)+b]-u)+A*(q[((h<<3)+24>>2)+b]-j),y=y*k+A*n,A=0==y;b:do{if(A){if(0>C){x=0;break a}var z=g,D=m,E=w}else{z=0>y;do{if(z&&C<w*y){z=h;D=m;E=C/y;break b}}while(0);0<y?C<m*y?(z=g,D=C/y):(z=g,D=m):(z=g,D=m);E=w}}while(0);if(D<E){x=0;break}h=h+1|0;g=z;m=D;w=E}return x}),0,(function(b,d,e){var b=b>>2,f=q[e+12>>2],g=q[b+5],h=q[e+8>>2],j=q[b+6],k=q[e>>2],m=f*g-h*j+k,e=q[e+4>>2],g=h*g+f*j+e,j=l[b+37],n=1<(j|0);a:do{if(n){for(var p=g,u=m,r=g,w=m,x=1;;){var y=q[((x<<3)+20>>2)+b],A=q[((x<<3)+24>>2)+b],C=f*y-h*A+k,y=h*y+f*A+e,w=w<C?w:C,r=r<y?r:y,u=u>C?u:C,p=p>y?p:y,x=x+1|0;if((x|0)>=(j|0)){var z=p,D=u,E=r,G=w;break a}}}else{z=g,D=m,E=g,G=m}}while(0);b=q[b+2];G=(M[0]=G-b,t[0]);E=(M[0]=E-b,t[0])|0;l[d>>2]=0|G;l[d+4>>2]=E;d=d+8|0;D=(M[0]=D+b,t[0]);z=(M[0]=z+b,t[0])|0;l[d>>2]=0|D;l[d+4>>2]=z}),0,(function(b,d,e){var f;f=b+148|0;var g=l[f>>2];if(2<(g|0)){h=g,f=5}else{if(P(N.O|0,306,N.yb|0,N.bh|0),f=l[f>>2],0<(f|0)){var h=f;f=5}else{var j=d|0,k=q[j>>2]=0,m=0,n=0,p=0,u=0,r=0;f=12}}do{if(5==f){for(var w=g=f=0;;){var x=g+q[b+(w<<3)+20>>2],y=f+q[b+(w<<3)+24>>2],w=w+1|0;if((w|0)>=(h|0)){break}f=y;g=x}g=1/(h|0);f=x*g;for(var g=y*g,w=b+20|0,A=b+24|0,C=0,z=0,D=0,E=0,G=0;;){var H=q[b+(G<<3)+20>>2]-f,F=q[b+(G<<3)+24>>2]-g,G=G+1|0,I=(G|0)<(h|0);if(I){var J=(G<<3)+b+20|0,L=(G<<3)+b+24|0}else{J=w,L=A}var O=q[J>>2]-f,R=q[L>>2]-g,T=H*R-F*O,J=.5*T,L=D+J,S=.3333333432674408*J,J=z+(H+O)*S,S=C+(F+R)*S,H=E+.0833333358168602*T*(H*H+O*H+O*O+F*F+R*F+R*R);if(!I){break}C=S;z=J;D=L;E=H}w=L*e;A=d|0;q[A>>2]=w;if(1.1920928955078125e-7<L){var U=w,W=g,Q=f,$=H,ea=L,sa=J,Ba=S;f=13}else{k=g,m=f,n=H,p=L,u=J,r=S,j=A,f=12}}}while(0);12==f&&(P(N.O|0,352,N.yb|0,N.Vb|0),U=q[j>>2],W=k,Q=m,$=n,ea=p,sa=u,Ba=r);b=1/ea;sa*=b;Ba*=b;Q=sa+Q;W=Ba+W;b=d+4|0;h=(M[0]=Q,t[0]);k=(M[0]=W,t[0])|0;l[b>>2]=0|h;l[b+4>>2]=k;q[d+12>>2]=$*e+U*(Q*Q+W*W-(sa*sa+Ba*Ba))}),0,Hb(),0,(function(b){Ls(b)}),0,(function(){ja("Pure virtual function called!")}),0,Hb(),0,(function(b){Ls(b)}),0,Hb(),0,Hb(),0,Hb(),0,Hb(),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e){b=i[d+36>>1];return b<<16>>16!=i[e+36>>1]<<16>>16|0==b<<16>>16?0==(i[e+32>>1]&i[d+34>>1])<<16>>16?0:0!=(i[e+34>>1]&i[d+32>>1])<<16>>16:0<b<<16>>16}),0,(function(b,d,e,f){var g,h=a;a+=48;g=h>>2;var j=l[l[b+48>>2]+12>>2];l[g]=yF+8|0;l[g+1]=1;q[g+2]=.009999999776482582;g=h+28|0;l[g>>2]=0;l[g+4>>2]=0;l[g+8>>2]=0;l[g+12>>2]=0;i[g+16>>1]=0;om(j,h,l[b+56>>2]);Eh(d,h,e,l[l[b+52>>2]+12>>2],f);a=h}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){var g,h=a;a+=300;var j=h+252;g=j>>2;var k=l[l[b+48>>2]+12>>2];l[g]=yF+8|0;l[g+1]=1;q[g+2]=.009999999776482582;g=j+28|0;l[g>>2]=0;l[g+4>>2]=0;l[g+8>>2]=0;l[g+12>>2]=0;i[g+16>>1]=0;om(k,j,l[b+56>>2]);Gh(h,d,j,e,l[l[b+52>>2]+12>>2],f);a=h}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){var g=l[l[b+48>>2]+12>>2],h=l[l[b+52>>2]+12>>2],j=d+60|0;l[j>>2]=0;var k=g+12|0,m=q[e+12>>2],n=q[k>>2],p=q[e+8>>2],u=q[g+16>>2],b=h+12|0,r=q[f+12>>2],w=q[b>>2],x=q[f+8>>2],y=q[h+16>>2],A=r*w-x*y+q[f>>2]-(m*n-p*u+q[e>>2]),e=x*w+r*y+q[f+4>>2]-(p*n+m*u+q[e+4>>2]),g=q[g+8>>2]+q[h+8>>2];A*A+e*e>g*g||(l[d+56>>2]=0,g=d+48|0,A=l[k+4>>2],l[g>>2]=l[k>>2],l[g+4>>2]=A,q[d+40>>2]=0,q[d+44>>2]=0,l[j>>2]=1,j=l[b+4>>2],l[d>>2]=l[b>>2],l[d+4>>2]=j,l[d+16>>2]=0)}),0,Hb(),0,(function(b){Ls(b)}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){Eh(d,l[l[b+48>>2]+12>>2],e,l[l[b+52>>2]+12>>2],f)}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){var g=a;a+=252;Gh(g,d,l[l[b+48>>2]+12>>2],e,l[l[b+52>>2]+12>>2],f);a=g}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){var g=l[l[b+48>>2]+12>>2],h=l[l[b+52>>2]+12>>2],j,k=g>>2,m=d>>2;j=(d+60|0)>>2;l[j]=0;for(var n=h+12|0,p=q[f+12>>2],u=q[n>>2],r=q[f+8>>2],w=q[h+16>>2],x=p*u-r*w+q[f>>2]-q[e>>2],y=r*u+p*w+q[f+4>>2]-q[e+4>>2],A=q[e+12>>2],C=q[e+8>>2],z=A*x+C*y,D=x*-C+A*y,E=q[k+2]+q[h+8>>2],G=l[k+37],H=0,F=-3.4028234663852886e+38,I=0;;){if((H|0)<(G|0)){var J=q[((H<<3)+84>>2)+k]*(z-q[((H<<3)+20>>2)+k])+q[((H<<3)+88>>2)+k]*(D-q[((H<<3)+24>>2)+k]);if(J>E){break}var L=J>F,O=L?H:I,R=L?J:F,H=H+1|0,F=R,I=O}else{var T=I+1|0,S=(T|0)<(G|0)?T:0,U=(I<<3)+g+20|0,W=o[U>>2],Q=o[U+4>>2],$=(t[0]=W,M[0]),ea=(t[0]=Q,M[0]),sa=(S<<3)+g+20|0,Ba=o[sa>>2],oa=o[sa+4>>2],ga=(t[0]=Ba,M[0]),qa=(t[0]=oa,M[0]);if(1.1920928955078125e-7>F){l[j]=1;l[m+14]=1;var la=(I<<3)+g+84|0,Ca=d+40|0,ia=l[la+4>>2];l[Ca>>2]=l[la>>2];l[Ca+4>>2]=ia;var ya=.5*(ea+qa),ta=d+48|0,Ia=(M[0]=.5*($+ga),t[0]),na=(M[0]=ya,t[0])|0;l[ta>>2]=0|Ia;l[ta+4>>2]=na;var Z=n,ba=d,ca=l[Z+4>>2];l[ba>>2]=l[Z>>2];l[ba+4>>2]=ca;l[m+4]=0;break}var ma=z-$,ka=D-ea,aa=z-ga,ra=D-qa;if(0>=ma*(ga-$)+ka*(qa-ea)){var ha=ma*ma+ka*ka;if(ha>E*E){break}l[j]=1;l[m+14]=1;var za=d+40|0,X=za,ua=(M[0]=ma,t[0]),da=(M[0]=ka,t[0])|0,fa=X|0;l[fa>>2]=0|ua;var Aa=X+4|0;l[Aa>>2]=da;var Qa=Fh(ha);if(1.1920928955078125e-7<=Qa){var pa=d+44|0,cb=1/Qa;q[za>>2]=ma*cb;q[pa>>2]=ka*cb}var Ra=d+48|0,Ta=Ra|0;l[Ta>>2]=W;var $a=Ra+4|0;l[$a>>2]=Q;var va=n,Wa=d,fb=va|0,gb=va+4|0,Xa=l[gb>>2],Ua=Wa|0;l[Ua>>2]=l[fb>>2];var Va=Wa+4|0;l[Va>>2]=Xa;l[m+4]=0;break}if(0<aa*($-ga)+ra*(ea-qa)){var pb=.5*($+ga),nb=.5*(ea+qa),La=(I<<3)+g+84|0;if((z-pb)*q[La>>2]+(D-nb)*q[((I<<3)+88>>2)+k]>E){break}l[j]=1;l[m+14]=1;var qb=La,bb=d+40|0,Fa=l[qb+4>>2];l[bb>>2]=l[qb>>2];l[bb+4>>2]=Fa;var Ma=d+48|0,wa=(M[0]=pb,t[0]),hb=(M[0]=nb,t[0])|0;l[Ma>>2]=0|wa;l[Ma+4>>2]=hb;var Ya=n,Za=d,Da=l[Ya+4>>2];l[Za>>2]=l[Ya>>2];l[Za+4>>2]=Da;l[m+4]=0;break}var Oa=aa*aa+ra*ra;if(Oa>E*E){break}l[j]=1;l[m+14]=1;var ib=d+40|0,ab=ib,Ga=(M[0]=aa,t[0]),jb=(M[0]=ra,t[0]),Ea=0|Ga,Pa=jb|0,fa=ab|0;l[fa>>2]=Ea;Aa=ab+4|0;l[Aa>>2]=Pa;var Ja=Fh(Oa);if(1.1920928955078125e-7<=Ja){var db=d+44|0,xa=1/Ja;q[ib>>2]=aa*xa;q[db>>2]=ra*xa}var Sa=d+48|0,Ta=Sa|0;l[Ta>>2]=Ba;$a=Sa+4|0;l[$a>>2]=oa;var Ka=n,tb=d,fb=Ka|0,kb=l[fb>>2],gb=Ka+4|0,ub=l[gb>>2],Ua=tb|0;l[Ua>>2]=kb;Va=tb+4|0;l[Va>>2]=ub;l[m+4]=0;break}}}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d,e,f){var g=l[l[b+48>>2]+12>>2],h=l[l[b+52>>2]+12>>2],j,k,m,n,p,u,r,w,x,y,A,C,z,D,E=f>>2,G=e>>2,H=a;a+=80;var F,I=H+4,J=H+8,L=H+32;D=L>>2;var O=H+56;z=O>>2;var R=d+60|0;l[R>>2]=0;var T=q[g+8>>2]+q[h+8>>2];l[H>>2]=0;var S=Hh(H,g,e,h,f),U=S>T;do{if(!U){l[I>>2]=0;var W=Hh(I,h,f,g,e);if(W<=T){if(W>.9800000190734863*S+.0010000000474974513){var Q=q[E],$=q[E+1],ea=q[E+2],sa=q[E+3],Ba=q[G],oa=q[G+1],ga=q[G+2],qa=q[G+3],la=l[I>>2];l[d+56>>2]=2;var Ca=1,ia=la,ya=g;C=ya>>2;var ta=h;A=ta>>2;var Ia=Q,na=$,Z=ea,ba=sa,ca=Ba,ma=oa,ka=ga,aa=qa}else{var ra=q[G],ha=q[G+1],za=q[G+2],X=q[G+3],ua=q[E],da=q[E+1],fa=q[E+2],Aa=q[E+3],Qa=l[H>>2];l[d+56>>2]=1;Ca=0;ia=Qa;ya=h;C=ya>>2;ta=g;A=ta>>2;Ia=ra;na=ha;Z=za;ba=X;ca=ua;ma=da;ka=fa;aa=Aa}var pa=l[C+37];F=-1<(ia|0)?(l[A+37]|0)>(ia|0)?10:9:9;9==F&&P(N.Ib|0,151,N.le|0,N.Eb|0);var cb=q[((ia<<3)+84>>2)+A],Ra=q[((ia<<3)+88>>2)+A],Ta=ba*cb-Z*Ra,$a=Z*cb+ba*Ra,va=aa*Ta+ka*$a,Wa=-ka,fb=Ta*Wa+aa*$a,gb=0<(pa|0);a:do{if(gb){for(var Xa=0,Ua=3.4028234663852886e+38,Va=0;;){var pb=va*q[((Va<<3)+84>>2)+C]+fb*q[((Va<<3)+88>>2)+C],nb=pb<Ua,La=nb?Va:Xa,qb=nb?pb:Ua,bb=Va+1|0;if((bb|0)==(pa|0)){var Fa=La;break a}Xa=La;Ua=qb;Va=bb}}else{Fa=0}}while(0);var Ma=Fa+1|0,wa=(Ma|0)<(pa|0)?Ma:0,hb=q[((Fa<<3)+20>>2)+C],Ya=q[((Fa<<3)+24>>2)+C],Za=aa*hb-ka*Ya+ca,Da=ka*hb+aa*Ya+ma,Oa=J,ib=(M[0]=Za,t[0]),ab=(M[0]=Da,t[0])|0;l[Oa>>2]=0|ib;l[Oa+4>>2]=ab;var Ga=ia&255,jb=J+8|0,Ea=jb;c[jb]=Ga;var Pa=Fa&255;c[Ea+1|0]=Pa;c[Ea+2|0]=1;c[Ea+3|0]=0;var Ja=J+12|0,db=q[((wa<<3)+20>>2)+C],xa=q[((wa<<3)+24>>2)+C],Sa=aa*db-ka*xa+ca,Ka=ka*db+aa*xa+ma,tb=Ja,kb=(M[0]=Sa,t[0]),ub=(M[0]=Ka,t[0])|0;l[tb>>2]=0|kb;l[tb+4>>2]=ub;var rb=J+20|0,Bb=rb;c[rb]=Ga;c[Bb+1|0]=wa&255;c[Bb+2|0]=1;c[Bb+3|0]=0;var lb=ia+1|0,yb=(lb|0)<(l[A+37]|0)?lb:0,xb=(ia<<3)+ta+20|0,Ib=l[xb+4>>2],wb=(t[0]=l[xb>>2],M[0]),vb=(t[0]=Ib,M[0]),zb=(yb<<3)+ta+20|0,Eb=l[zb+4>>2],Cb=(t[0]=l[zb>>2],M[0]),eb=(t[0]=Eb,M[0]),sb=Cb-wb,ob=eb-vb,Db=Fh(sb*sb+ob*ob);if(1.1920928955078125e-7>Db){var Jb=sb,Rb=ob}else{var Nb=1/Db,Jb=sb*Nb,Rb=ob*Nb}var Ob=.5*(wb+Cb),Lb=ba*Jb-Z*Rb,Pb=Z*Jb+ba*Rb,Mb=-1*Lb,Yb=ba*wb-Z*vb+Ia,Zb=Z*wb+ba*vb+na,ec=.5*(vb+eb),Ub=Pb*Yb+Mb*Zb,jc=T-(Lb*Yb+Pb*Zb),Qb=Lb*(ba*Cb-Z*eb+Ia)+Pb*(Z*Cb+ba*eb+na)+T,mb=-Lb,cc=-Pb,Fb=Za*mb+Da*cc-jc,gc=Sa*mb+Ka*cc-jc;if(0<Fb){var wc=0}else{y=L>>2,x=J>>2,l[y]=l[x],l[y+1]=l[x+1],l[y+2]=l[x+2],wc=1}if(0<gc){var pc=wc}else{w=(L+12*wc|0)>>2,r=Ja>>2,l[w]=l[r],l[w+1]=l[r+1],l[w+2]=l[r+2],pc=wc+1|0}if(0>Fb*gc){var qc=Fb/(Fb-gc),$c=Da+(Ka-Da)*qc,Ec=L+12*pc|0,sc=(M[0]=Za+(Sa-Za)*qc,t[0]),kd=(M[0]=$c,t[0]),wd=0|sc,Lc=kd|0,$b=Ec|0;u=$b>>2;l[u]=wd;var ac=Ec+4|0;p=ac>>2;l[p]=Lc;var oc=L+12*pc+8|0,tc=oc;c[oc]=Ga;c[tc+1|0]=Pa;c[tc+2|0]=0;c[tc+3|0]=1;var Nc=pc+1|0}else{Nc=pc}if(2<=(Nc|0)){var ld=q[D],Wc=q[D+1],ad=Lb*ld+Pb*Wc-Qb,Xc=L+12|0,Cc=q[Xc>>2],fd=q[D+4],md=Lb*Cc+Pb*fd-Qb;if(0<ad){var nd=0}else{n=O>>2,m=L>>2,l[n]=l[m],l[n+1]=l[m+1],l[n+2]=l[m+2],nd=1}if(0<md){var Oc=nd}else{k=(O+12*nd|0)>>2,j=Xc>>2,l[k]=l[j],l[k+1]=l[j+1],l[k+2]=l[j+2],Oc=nd+1|0}if(0>ad*md){var gd=ad/(ad-md),od=Wc+(fd-Wc)*gd,pd=O+12*Oc|0,Pd=(M[0]=ld+(Cc-ld)*gd,t[0]),Xd=(M[0]=od,t[0]),qd=0|Pd,Qd=Xd|0,$b=pd|0;u=$b>>2;l[u]=qd;ac=pd+4|0;p=ac>>2;l[p]=Qd;var Pc=O+12*Oc+8|0,Ic=Pc;c[Pc]=yb&255;c[Ic+1|0]=c[L+9|0];c[Ic+2|0]=0;c[Ic+3|0]=1;var Jc=Oc+1|0}else{Jc=Oc}if(2<=(Jc|0)){var fc=d+40|0,hd=(M[0]=Rb,t[0]),xd=(M[0]=-1*Jb,t[0])|0;l[fc>>2]=0|hd;l[fc+4>>2]=xd;var bd=d+48|0,rd=(M[0]=Ob,t[0]),ye=(M[0]=ec,t[0])|0;l[bd>>2]=0|rd;l[bd+4>>2]=ye;var Yd=q[z],Tc=q[z+1],xc=Pb*Yd+Mb*Tc-Ub>T;if(0==Ca<<24>>24){if(xc){var bc=0}else{var Ed=Yd-ca,yc=Tc-ma,Ac=Ed*Wa+aa*yc,Zd=d,$d=(M[0]=aa*Ed+ka*yc,t[0]),cd=(M[0]=Ac,t[0])|0,zc=Zd|0;l[zc>>2]=0|$d;var kc=Zd+4|0;l[kc>>2]=cd;l[d+16>>2]=l[z+2];bc=1}var Rd=q[z+3],Fc=q[z+4];if(Pb*Rd+Mb*Fc-Ub>T){var Qc=bc}else{var Mc=Rd-ca,ne=Fc-ma,Sd=Mc*Wa+aa*ne,Td=d+20*bc|0,Ud=(M[0]=aa*Mc+ka*ne,t[0]),xf=(M[0]=Sd,t[0])|0,$b=Td|0;u=$b>>2;l[u]=0|Ud;ac=Td+4|0;p=ac>>2;l[p]=xf;l[(d+16>>2)+(5*bc|0)]=l[z+5];Qc=bc+1|0}}else{if(xc){var Fd=0}else{var oe=Yd-ca,He=Tc-ma,ae=oe*Wa+aa*He,Gc=d,dd=(M[0]=aa*oe+ka*He,t[0]),be=(M[0]=ae,t[0])|0,zc=Gc|0;l[zc>>2]=0|dd;kc=Gc+4|0;l[kc>>2]=be;var pe=d+16|0,Uc=o[z+2];l[pe>>2]=Uc;var lc=Uc>>>24&255,Gd=Uc>>>16&255,Hd=Uc&255,Re=pe,Id=Re+1|0,Jd=Re+2|0,qe=Re+3|0;c[pe]=Uc>>>8&255;c[Id]=Hd;c[Jd]=lc;c[qe]=Gd;Fd=1}var re=q[z+3],Kd=q[z+4];if(Pb*re+Mb*Kd-Ub>T){Qc=Fd}else{var Se=re-ca,Rf=Kd-ma,sd=Se*Wa+aa*Rf,Vc=d+20*Fd|0,Te=(M[0]=aa*Se+ka*Rf,t[0]),Ue=(M[0]=sd,t[0])|0,$b=Vc|0;u=$b>>2;l[u]=0|Te;ac=Vc+4|0;p=ac>>2;l[p]=Ue;var ce=d+20*Fd+16|0,Yc=o[z+5];l[ce>>2]=Yc;var yd=Yc>>>24&255,$e=Yc>>>16&255,ze=Yc&255,Zc=ce,Ld=Zc+1|0,Md=Zc+2|0,de=Zc+3|0;c[ce]=Yc>>>8&255;c[Ld]=ze;c[Md]=yd;c[de]=$e;Qc=Fd+1|0}}l[R>>2]=Qc}}}}}while(0);a=H}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+80>>2],h=q[e+5],j=q[d+84>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+88>>2],h=q[e+5],j=q[d+92>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var e=q[d+100>>2]*e,f=q[d+120>>2]*e;q[b>>2]=q[d+116>>2]*e;q[b+4>>2]=f}),0,Kb(0),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.wg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+20];f=q[d+21];V(N.K|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+22];f=q[d+23];V(N.L|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+26];V(N.qh|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+17];V(N.Na|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+18];V(N.Oa|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j=b>>2,k=l[j+12];h=k>>2;var m=o[h+2],n=b+108|0;l[n>>2]=m;var p=l[j+13];g=p>>2;var u=l[g+2];f=(b+112|0)>>2;l[f]=u;var r=k+28|0,w=b+140|0,x=l[r>>2],y=l[r+4>>2];l[w>>2]=x;l[w+4>>2]=y;var A=p+28|0,C=b+148|0,z=l[A>>2],D=l[A+4>>2];l[C>>2]=z;l[C+4>>2]=D;var E=q[h+30];q[j+39]=E;var G=q[g+30];q[j+40]=G;var H=q[h+32];q[j+41]=H;var F=q[g+32];q[j+42]=F;var I=l[d+24>>2],J=I+12*m|0,L=l[J+4>>2],O=(t[0]=l[J>>2],M[0]),R=(t[0]=L,M[0]),T=q[(I+8>>2)+(3*m|0)];e=(d+28|0)>>2;var S=l[e],U=S+12*m|0,W=l[U+4>>2],Q=(t[0]=l[U>>2],M[0]),$=(t[0]=W,M[0]),ea=q[(S+8>>2)+(3*m|0)],sa=I+12*u|0,Ba=l[sa+4>>2],oa=(t[0]=l[sa>>2],M[0]),ga=(t[0]=Ba,M[0]),qa=q[(I+8>>2)+(3*u|0)],la=S+12*u|0,Ca=l[la+4>>2],ia=(t[0]=l[la>>2],M[0]),ya=(t[0]=Ca,M[0]),ta=q[(S+8>>2)+(3*u|0)],Ia=mm(T),na=nm(T),Z=mm(qa),ba=nm(qa),ca=b+124|0,ma=q[j+20],ka=(t[0]=x,M[0]),aa=ma-ka,ra=q[j+21],ha=(t[0]=y,M[0]),za=ra-ha,X=na*aa-Ia*za,ua=Ia*aa+na*za,da=(M[0]=X,t[0]),fa=(M[0]=ua,t[0])|0;l[ca>>2]=0|da;l[ca+4>>2]=fa;var Aa=b+132|0,Qa=q[j+22],pa=(t[0]=z,M[0]),cb=Qa-pa,Ra=q[j+23],Ta=(t[0]=D,M[0]),$a=Ra-Ta,va=ba*cb-Z*$a,Wa=Z*cb+ba*$a,fb=(M[0]=va,t[0]),gb=(M[0]=Wa,t[0])|0;l[Aa>>2]=0|fb;l[Aa+4>>2]=gb;var Xa=b+116|0,Ua=oa+va-O-X,Va=ga+Wa-R-ua,pb=(M[0]=Ua,t[0]),nb=(M[0]=Va,t[0])|0;l[Xa>>2]=0|pb;l[Xa+4>>2]=nb;var La=Xa|0,qb=b+120|0,bb=Fh(Ua*Ua+Va*Va);if(.004999999888241291<bb){var Fa=1/bb,Ma=Ua*Fa;q[La>>2]=Ma;var wa=Va*Fa,hb=Ma}else{hb=wa=q[La>>2]=0}q[qb>>2]=wa;var Ya=X*wa-ua*hb,Za=va*wa-Wa*hb,Da=E+H*Ya*Ya+G+F*Za*Za,Oa=0!=Da?1/Da:0,ib=b+172|0;q[ib>>2]=Oa;var ab=q[j+17];if(0<ab){var Ga=bb-q[j+26],jb=6.2831854820251465*ab,Ea=Oa*jb*jb,Pa=q[d>>2],Ja=Pa*(2*Oa*q[j+18]*jb+Pa*Ea),db=b+96|0;q[db>>2]=Ja;var xa=0!=Ja?1/Ja:0;q[db>>2]=xa;q[j+19]=Ga*Pa*Ea*xa;var Sa=Da+xa;q[ib>>2]=0!=Sa?1/Sa:0}else{q[j+24]=0,q[j+19]=0}if(0==(c[d+20|0]&1)<<24>>24){q[j+25]=0;var Ka=ta,tb=ea,kb=Q,ub=$,rb=ia,Bb=ya}else{var lb=b+100|0,yb=q[lb>>2]*q[d+8>>2];q[lb>>2]=yb;var xb=hb*yb,Ib=wa*yb,Ka=ta+F*(va*Ib-Wa*xb),tb=ea-H*(X*Ib-ua*xb),kb=Q-xb*E,ub=$-Ib*E,rb=ia+xb*G,Bb=ya+Ib*G}var wb=l[e]+12*m|0,vb=(M[0]=kb,t[0]),zb=(M[0]=ub,t[0])|0;l[(wb|0)>>2]=0|vb;l[(wb+4|0)>>2]=zb;q[(l[e]+8>>2)+(3*l[n>>2]|0)]=tb;var Eb=l[e]+12*l[f]|0,Cb=(M[0]=rb,t[0]),eb=(M[0]=Bb,t[0])|0;l[(Eb|0)>>2]=0|Cb;l[(Eb+4|0)>>2]=eb;q[(l[e]+8>>2)+(3*l[f]|0)]=Ka}),0,(function(b,d){var e,f,g=b>>2,h=b+108|0,j=l[h>>2];f=(d+28|0)>>2;var k=l[f],m=k+12*j|0;e=l[m+4>>2];var n=(t[0]=l[m>>2],M[0]),p=(t[0]=e,M[0]),u=q[(k+8>>2)+(3*j|0)];e=(b+112|0)>>2;var r=l[e],m=k+12*r|0,w=l[m+4>>2],m=(t[0]=l[m>>2],M[0]),w=(t[0]=w,M[0]),x=q[(k+8>>2)+(3*r|0)],y=q[g+32],A=q[g+31],C=q[g+34],z=q[g+33],k=q[g+29],r=q[g+30],D=b+100|0,E=q[D>>2],G=(k*(m+C*-x-(n+y*-u))+r*(w+z*x-(p+A*u))+q[g+19]+q[g+24]*E)*-q[g+43];q[D>>2]=E+G;k*=G;r*=G;G=q[g+39];y=u-q[g+41]*(A*r-y*k);u=q[g+40];g=x+q[g+42]*(z*r-C*k);j=l[f]+12*j|0;n=(M[0]=n-k*G,t[0]);p=(M[0]=p-r*G,t[0])|0;l[(j|0)>>2]=0|n;l[(j+4|0)>>2]=p;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=y;h=l[f]+12*l[e]|0;m=(M[0]=m+k*u,t[0]);w=(M[0]=w+r*u,t[0])|0;l[(h|0)>>2]=0|m;l[(h+4|0)>>2]=w;q[(l[f]+8>>2)+(3*l[e]|0)]=g}),0,(function(b,d){var e,f,g=b>>2;if(0<q[g+17]){f=1}else{var h=b+108|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+112|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),j=q[(j+8>>2)+(3*u|0)],x=mm(p),y=nm(p),A=mm(j),C=nm(j),z=q[g+20]-q[g+35],D=q[g+21]-q[g+36],u=y*z-x*D,y=x*z+y*D,z=q[g+22]-q[g+37],D=q[g+23]-q[g+38],x=C*z-A*D,A=A*z+C*D,z=r+x-n-u,C=w+A-m-y,E=Fh(z*z+C*C);1.1920928955078125e-7>E?(E=0,D=C):(D=1/E,z*=D,D*=C);C=E-q[g+26];C=.20000000298023224>C?C:.20000000298023224;C=-.20000000298023224>C?-.20000000298023224:C;E=C*-q[g+43];z*=E;D*=E;E=q[g+39];u=p-q[g+41]*(u*D-y*z);p=q[g+40];g=j+q[g+42]*(x*D-A*z);n=(M[0]=n-z*E,t[0]);m=(M[0]=m-D*E,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=u;h=l[f]+12*l[e]|0;k=(M[0]=r+z*p,t[0]);n=(M[0]=w+D*p,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=g;f=.004999999888241291>(0<C?C:-C)}return f}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+68>>2],h=q[e+5],j=q[d+72>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+76>>2],h=q[e+5],j=q[d+80>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+88>>2]*e;q[b>>2]=q[d+84>>2]*e;q[b+4>>2]=f}),0,(function(b,d){return q[b+92>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.Lg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+17];f=q[d+18];V(N.K|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+19];f=q[d+20];V(N.L|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+24];V(N.Gh|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+25];V(N.Ue|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h=b>>2,j=l[h+12];g=j>>2;var k=o[g+2],m=b+104|0;l[m>>2]=k;var n=l[h+13];e=n>>2;var p=l[e+2];f=(b+108|0)>>2;l[f]=p;var u=j+28|0,j=b+128|0,r=l[u>>2],w=l[u+4>>2];l[j>>2]=r;l[j+4>>2]=w;var j=n+28|0,n=b+136|0,x=l[j>>2],y=l[j+4>>2];l[n>>2]=x;l[n+4>>2]=y;j=q[g+30];q[h+36]=j;n=q[e+30];q[h+37]=n;g=q[g+32];q[h+38]=g;var A=q[e+32];q[h+39]=A;var C=l[d+24>>2],z=q[(C+8>>2)+(3*k|0)];e=(d+28|0)>>2;var D=l[e],u=D+12*k|0,E=l[u+4>>2],u=(t[0]=l[u>>2],M[0]),E=(t[0]=E,M[0]),G=q[(D+8>>2)+(3*k|0)],H=q[(C+8>>2)+(3*p|0)],C=D+12*p|0,F=l[C+4>>2],C=(t[0]=l[C>>2],M[0]),F=(t[0]=F,M[0]),p=q[(D+8>>2)+(3*p|0)],I=mm(z),J=nm(z),z=mm(H),H=nm(H),D=b+112|0,L=q[h+17],r=(t[0]=r,M[0]),r=L-r,L=q[h+18],w=(t[0]=w,M[0]),L=L-w,w=J*r-I*L,r=I*r+J*L,I=(M[0]=w,t[0]),J=(M[0]=r,t[0])|0;l[D>>2]=0|I;l[D+4>>2]=J;D=b+120|0;I=q[h+19];x=(t[0]=x,M[0]);x=I-x;I=q[h+20];y=(t[0]=y,M[0]);I-=y;y=H*x-z*I;x=z*x+H*I;z=(M[0]=y,t[0]);H=(M[0]=x,t[0])|0;l[D>>2]=0|z;l[D+4>>2]=H;D=j+n;z=D+g*r*r+A*x*x;I=A*y;H=w*-g*r-I*x;D=D+g*w*w+I*y;I=z*D-H*H;I=0!=I?1/I:I;H*=-I;q[h+40]=I*D;q[h+41]=H;q[h+42]=H;q[h+43]=I*z;z=g+A;q[h+44]=0<z?1/z:z;D=b+84|0;0==(c[d+20|0]&1)<<24>>24?(q[D>>2]=0,q[h+22]=0,q[h+23]=0,A=p,g=G,j=E,E=C,n=F):(H=d+8|0,z=q[H>>2],D|=0,h=q[D>>2]*z,q[D>>2]=h,D=b+88|0,z*=q[D>>2],q[D>>2]=z,D=b+92|0,H=q[D>>2]*q[H>>2],q[D>>2]=H,A=p+A*(y*z-x*h+H),g=G-g*(w*z-r*h+H),u-=h*j,j=E-z*j,E=C+h*n,n=F+z*n);k=l[e]+12*k|0;u=(M[0]=u,t[0]);j=(M[0]=j,t[0])|0;l[(k|0)>>2]=0|u;l[(k+4|0)>>2]=j;q[(l[e]+8>>2)+(3*l[m>>2]|0)]=g;m=l[e]+12*l[f]|0;k=(M[0]=E,t[0]);n=(M[0]=n,t[0])|0;l[(m|0)>>2]=0|k;l[(m+4|0)>>2]=n;q[(l[e]+8>>2)+(3*l[f]|0)]=A}),0,(function(b,d){var e,f,g,h,j=b>>2,k=b+104|0,m=l[k>>2];h=(d+28|0)>>2;var n=l[h],p=n+12*m|0;g=l[p+4>>2];var u=(t[0]=l[p>>2],M[0]),r=(t[0]=g,M[0]),w=q[(n+8>>2)+(3*m|0)];g=(b+108|0)>>2;var x=l[g],p=n+12*x|0,y=l[p+4>>2],p=(t[0]=l[p>>2],M[0]),y=(t[0]=y,M[0]),A=q[(n+8>>2)+(3*x|0)],C=q[j+36],x=q[j+37],z=q[j+38],n=q[j+39],D=q[d>>2],E=b+92|0,G=q[E>>2],H=D*q[j+25],F=G+(A-w)*-q[j+44],I=-H,H=F<H?F:H,I=H<I?I:H;q[E>>2]=I;var E=I-G,G=w-z*E,w=A+n*E,A=q[j+31],E=q[j+30],I=q[j+29],H=q[j+28],F=p+A*-w-u-I*-G,J=y+E*w-r-H*G;e=q[j+40]*F+q[j+42]*J;var L=q[j+41]*F+q[j+43]*J;f=b+84|0;J=l[f+4>>2];F=(t[0]=l[f>>2],M[0]);J=(t[0]=J,M[0]);f=(f|0)>>2;var O=F-e;q[f]=O;e=(b+88|0)>>2;L=q[e]-L;q[e]=L;j=D*q[j+24];D=O*O+L*L;D>j*j?(D=Fh(D),1.1920928955078125e-7>D||(D=1/D,O*=D,q[f]=O,L*=D,q[e]=L),D=O,D*=j,q[f]=D,j*=L,e=q[e]=j):(D=O,e=L);j=D-F;D=e-J;m=l[h]+12*m|0;u=(M[0]=u-j*C,t[0]);r=(M[0]=r-D*C,t[0])|0;l[(m|0)>>2]=0|u;l[(m+4|0)>>2]=r;q[(l[h]+8>>2)+(3*l[k>>2]|0)]=G-z*(H*D-I*j);k=l[h]+12*l[g]|0;p=(M[0]=p+j*x,t[0]);y=(M[0]=y+D*x,t[0])|0;l[(k|0)>>2]=0|p;l[(k+4|0)>>2]=y;q[(l[h]+8>>2)+(3*l[g]|0)]=w+n*(E*D-A*j)}),0,Kb(1),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+92>>2],h=q[e+5],j=q[d+96>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+100>>2],h=q[e+5],j=q[d+104>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+156>>2],g=q[d+244>>2]*f*e;q[b>>2]=q[d+240>>2]*f*e;q[b+4>>2]=g}),0,(function(b,d){return q[b+156>>2]*q[b+256>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2],h=l[l[d+17]+56>>2],j=l[l[d+18]+56>>2];V(N.Zg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));V(N.Ah|0,(s=a,a+=4,l[s>>2]=h,s));V(N.Hh|0,(s=a,a+=4,l[s>>2]=j,s));h=q[d+38];V(N.Fb|0,(s=a,a+=8,Ee[0]=h,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j,k,m,n,p,u,r,w=b>>2,x=l[w+12];r=x>>2;var y=l[r+2],A=b+160|0;l[A>>2]=y;var C=l[w+13];u=C>>2;var z=l[u+2];p=(b+164|0)>>2;l[p]=z;var D=l[w+21];n=D>>2;var E=l[n+2];m=(b+168|0)>>2;l[m]=E;var G=l[w+22];k=G>>2;var H=l[k+2];j=(b+172|0)>>2;l[j]=H;var F=x+28|0,I=b+176|0,J=l[F>>2],L=l[F+4>>2];l[I>>2]=J;l[I+4>>2]=L;var O=C+28|0,R=b+184|0,T=l[O>>2],S=l[O+4>>2];l[R>>2]=T;l[R+4>>2]=S;var U=D+28|0,W=b+192|0,Q=l[U>>2],$=l[U+4>>2];l[W>>2]=Q;l[W+4>>2]=$;var ea=G+28|0,sa=b+200|0,Ba=l[ea>>2],oa=l[ea+4>>2];l[sa>>2]=Ba;l[sa+4>>2]=oa;var ga=q[r+30];q[w+52]=ga;var qa=q[u+30];q[w+53]=qa;var la=q[n+30];q[w+54]=la;var Ca=q[k+30];q[w+55]=Ca;var ia=q[r+32];q[w+56]=ia;var ya=q[u+32];q[w+57]=ya;var ta=q[n+32];q[w+58]=ta;var Ia=q[k+32];q[w+59]=Ia;h=l[d+24>>2]>>2;var na=q[h+(3*y|0)+2];g=(d+28|0)>>2;var Z=l[g];f=Z>>2;var ba=Z+12*y|0,ca=l[ba+4>>2],ma=(t[0]=l[ba>>2],M[0]),ka=(t[0]=ca,M[0]),aa=q[f+(3*y|0)+2],ra=q[h+(3*z|0)+2],ha=Z+12*z|0,za=l[ha+4>>2],X=(t[0]=l[ha>>2],M[0]),ua=(t[0]=za,M[0]),da=q[f+(3*z|0)+2],fa=q[h+(3*E|0)+2],Aa=Z+12*E|0,Qa=l[Aa+4>>2],pa=(t[0]=l[Aa>>2],M[0]),cb=(t[0]=Qa,M[0]),Ra=q[f+(3*E|0)+2],Ta=q[h+(3*H|0)+2],$a=Z+12*H|0,va=l[$a+4>>2],Wa=(t[0]=l[$a>>2],M[0]),fb=(t[0]=va,M[0]),gb=q[f+(3*H|0)+2],Xa=mm(na),Ua=nm(na),Va=mm(ra),pb=nm(ra),nb=mm(fa),La=nm(fa),qb=mm(Ta),bb=nm(Ta);e=(b+272|0)>>2;q[e]=0;var Fa=1==(l[w+19]|0),Ma=(t[0]=Ba,M[0]),wa=(t[0]=oa,M[0]),hb=(t[0]=T,M[0]),Ya=(t[0]=S,M[0]);if(Fa){q[w+60]=0;q[w+61]=0;q[w+64]=1;q[w+66]=1;var Za=ia+ta,Da=0,Oa=0,ib=1,ab=1}else{var Ga=(t[0]=L,M[0]),jb=(t[0]=J,M[0]),Ea=(t[0]=$,M[0]),Pa=(t[0]=Q,M[0]),Ja=q[w+31],db=q[w+32],xa=La*Ja-nb*db,Sa=nb*Ja+La*db,Ka=q[w+27]-Pa,tb=q[w+28]-Ea,kb=La*Ka-nb*tb,ub=nb*Ka+La*tb,rb=q[w+23]-jb,Bb=q[w+24]-Ga,lb=Ua*rb-Xa*Bb,yb=Xa*rb+Ua*Bb,xb=b+240|0,Ib=(M[0]=xa,t[0]),wb=(M[0]=Sa,t[0])|0;l[xb>>2]=0|Ib;l[xb+4>>2]=wb;var vb=kb*Sa-ub*xa;q[w+66]=vb;var zb=lb*Sa-yb*xa;q[w+64]=zb;Za=la+ga+ta*vb*vb+ia*zb*zb;Da=xa;Oa=Sa;ib=zb;ab=vb}var Eb=Za;q[e]=Eb;if(1==(l[w+20]|0)){q[w+62]=0;q[w+63]=0;var Cb=q[w+38];q[w+65]=Cb;q[w+67]=Cb;var eb=Cb*Cb*(ya+Ia),sb=0,ob=0,Db=Cb,Jb=Cb}else{var Rb=q[w+33],Nb=q[w+34],Ob=bb*Rb-qb*Nb,Lb=qb*Rb+bb*Nb,Pb=q[w+29]-Ma,Mb=q[w+30]-wa,Yb=bb*Pb-qb*Mb,Zb=qb*Pb+bb*Mb,ec=q[w+25]-hb,Ub=q[w+26]-Ya,jc=pb*ec-Va*Ub,Qb=Va*ec+pb*Ub,mb=q[w+38],cc=Ob*mb,Fb=Lb*mb,gc=b+248|0,wc=(M[0]=cc,t[0]),pc=(M[0]=Fb,t[0])|0;l[gc>>2]=0|wc;l[gc+4>>2]=pc;var qc=mb*(Yb*Lb-Zb*Ob);q[w+67]=qc;var $c=mb*(jc*Lb-Qb*Ob);q[w+65]=$c;eb=mb*mb*(Ca+qa)+Ia*qc*qc+ya*$c*$c;sb=cc;ob=Fb;Db=$c;Jb=qc}var Ec=Eb+eb;q[e]=Ec;q[e]=0<Ec?1/Ec:0;var sc=b+156|0;if(0==(c[d+20|0]&1)<<24>>24){q[sc>>2]=0;var kd=gb,wd=Ra,Lc=da,$b=aa,ac=ma,oc=ka,tc=X,Nc=ua,ld=pa,Wc=cb,ad=Wa,Xc=fb}else{var Cc=q[sc>>2],fd=ga*Cc,md=qa*Cc,nd=la*Cc,Oc=Ca*Cc,kd=gb-Ia*Cc*Jb,wd=Ra-ta*Cc*ab,Lc=da+ya*Cc*Db,$b=aa+ia*Cc*ib,ac=ma+Da*fd,oc=ka+Oa*fd,tc=X+sb*md,Nc=ua+ob*md,ld=pa-Da*nd,Wc=cb-Oa*nd,ad=Wa-sb*Oc,Xc=fb-ob*Oc}var gd=l[g]+12*y|0,od=(M[0]=ac,t[0]),pd=(M[0]=oc,t[0])|0;l[(gd|0)>>2]=0|od;l[(gd+4|0)>>2]=pd;q[(l[g]+8>>2)+(3*l[A>>2]|0)]=$b;var Pd=l[g]+12*l[p]|0,Xd=(M[0]=tc,t[0]),qd=(M[0]=Nc,t[0])|0;l[(Pd|0)>>2]=0|Xd;l[(Pd+4|0)>>2]=qd;q[(l[g]+8>>2)+(3*l[p]|0)]=Lc;var Qd=l[g]+12*l[m]|0,Pc=(M[0]=ld,t[0]),Ic=(M[0]=Wc,t[0])|0;l[(Qd|0)>>2]=0|Pc;l[(Qd+4|0)>>2]=Ic;q[(l[g]+8>>2)+(3*l[m]|0)]=wd;var Jc=l[g]+12*l[j]|0,fc=(M[0]=ad,t[0]),hd=(M[0]=Xc,t[0])|0;l[(Jc|0)>>2]=0|fc;l[(Jc+4|0)>>2]=hd;q[(l[g]+8>>2)+(3*l[j]|0)]=kd}),0,(function(b,d){var e,f,g,h,j,k=b>>2,m=b+160|0,n=l[m>>2];j=(d+28|0)>>2;var p=l[j];h=p>>2;f=p+12*n|0;e=l[f+4>>2];var u=(t[0]=l[f>>2],M[0]),r=(t[0]=e,M[0]),w=q[h+(3*n|0)+2];g=(b+164|0)>>2;e=l[g];var x=p+12*e|0;f=l[x+4>>2];var x=(t[0]=l[x>>2],M[0]),y=(t[0]=f,M[0]),A=q[h+(3*e|0)+2];f=(b+168|0)>>2;e=l[f];var C=p+12*e|0,z=l[C+4>>2],C=(t[0]=l[C>>2],M[0]),z=(t[0]=z,M[0]),D=q[h+(3*e|0)+2];e=(b+172|0)>>2;var E=l[e],p=p+12*E|0,G=l[p+4>>2],p=(t[0]=l[p>>2],M[0]),G=(t[0]=G,M[0]),H=q[h+(3*E|0)+2],F=q[k+60],I=q[k+61],E=q[k+62];h=q[k+63];var J=q[k+64],L=q[k+66],O=q[k+65],R=q[k+67],T=(F*(u-C)+I*(r-z)+E*(x-p)+h*(y-G)+(J*w-L*D)+(O*A-R*H))*-q[k+68],S=b+156|0;q[S>>2]+=T;var S=q[k+52]*T,U=w+q[k+56]*T*J,J=q[k+53]*T,O=A+q[k+57]*T*O,A=q[k+54]*T,D=D-q[k+58]*T*L,w=q[k+55]*T,k=H-q[k+59]*T*R,n=l[j]+12*n|0,u=(M[0]=u+F*S,t[0]),r=(M[0]=r+I*S,t[0])|0;l[(n|0)>>2]=0|u;l[(n+4|0)>>2]=r;q[(l[j]+8>>2)+(3*l[m>>2]|0)]=U;m=l[j]+12*l[g]|0;x=(M[0]=x+E*J,t[0]);y=(M[0]=y+h*J,t[0])|0;l[(m|0)>>2]=0|x;l[(m+4|0)>>2]=y;q[(l[j]+8>>2)+(3*l[g]|0)]=O;g=l[j]+12*l[f]|0;m=(M[0]=C-F*A,t[0]);x=(M[0]=z-I*A,t[0])|0;l[(g|0)>>2]=0|m;l[(g+4|0)>>2]=x;q[(l[j]+8>>2)+(3*l[f]|0)]=D;f=l[j]+12*l[e]|0;g=(M[0]=p-E*w,t[0]);m=(M[0]=G-h*w,t[0])|0;l[(f|0)>>2]=0|g;l[(f+4|0)>>2]=m;q[(l[j]+8>>2)+(3*l[e]|0)]=k}),0,(function(b,d){var e,f,g,h,j,k=b>>2,m=b+160|0,n=l[m>>2];j=(d+24|0)>>2;var p=l[j];h=p>>2;var u=p+12*n|0,r=l[u+4>>2],w=(t[0]=l[u>>2],M[0]),x=(t[0]=r,M[0]),y=q[h+(3*n|0)+2];g=(b+164|0)>>2;var A=l[g],C=p+12*A|0,z=l[C+4>>2],D=(t[0]=l[C>>2],M[0]),E=(t[0]=z,M[0]),G=q[h+(3*A|0)+2];f=(b+168|0)>>2;var H=l[f],F=p+12*H|0,I=l[F+4>>2],J=(t[0]=l[F>>2],M[0]),L=(t[0]=I,M[0]),O=q[h+(3*H|0)+2];e=(b+172|0)>>2;var R=l[e],T=p+12*R|0,S=l[T+4>>2],U=(t[0]=l[T>>2],M[0]),W=(t[0]=S,M[0]),Q=q[h+(3*R|0)+2],$=mm(y),ea=nm(y),sa=mm(G),Ba=nm(G),oa=mm(O),ga=nm(O),qa=mm(Q),la=nm(Q);if(1==(l[k+19]|0)){var Ca=q[k+56],ia=q[k+58],ya=Ca+ia,ta=y-O-q[k+35],Ia=1,na=1,Z=0,ba=0,ca=Ca,ma=ia}else{var ka=q[k+31],aa=q[k+32],ra=ga*ka-oa*aa,ha=oa*ka+ga*aa,za=q[k+27]-q[k+48],X=q[k+28]-q[k+49],ua=q[k+23]-q[k+44],da=q[k+24]-q[k+45],fa=ea*ua-$*da,Aa=$*ua+ea*da,Qa=(ga*za-oa*X)*ha-(oa*za+ga*X)*ra,pa=fa*ha-Aa*ra,cb=q[k+58],Ra=q[k+56],Ta=fa+(w-J),$a=Aa+(x-L),ya=q[k+54]+q[k+52]+cb*Qa*Qa+Ra*pa*pa,ta=(ga*Ta+oa*$a-za)*ka+(Ta*-oa+ga*$a-X)*aa,Ia=pa,na=Qa,Z=ra,ba=ha,ca=Ra,ma=cb}if(1==(l[k+20]|0)){var va=q[k+38],Wa=q[k+57],fb=q[k+59],gb=va*va*(Wa+fb),Xa=va,Ua=G-Q-q[k+36],Va=va,pb=0,nb=0,La=va,qb=Wa,bb=fb}else{var Fa=q[k+33],Ma=q[k+34],wa=la*Fa-qa*Ma,hb=qa*Fa+la*Ma,Ya=q[k+29]-q[k+50],Za=q[k+30]-q[k+51],Da=q[k+25]-q[k+46],Oa=q[k+26]-q[k+47],ib=Ba*Da-sa*Oa,ab=sa*Da+Ba*Oa,Ga=q[k+38],jb=Ga*((la*Ya-qa*Za)*hb-(qa*Ya+la*Za)*wa),Ea=Ga*(ib*hb-ab*wa),Pa=q[k+59],Ja=q[k+57],db=ib+(D-U),xa=ab+(E-W),gb=Ga*Ga*(q[k+55]+q[k+53])+Pa*jb*jb+Ja*Ea*Ea,Xa=jb,Ua=(la*db+qa*xa-Ya)*Fa+(db*-qa+la*xa-Za)*Ma,Va=Ea,pb=wa*Ga,nb=hb*Ga,La=Ga,qb=Ja,bb=Pa}var Sa=ya+gb,Ka=0<Sa?-(ta+La*Ua-q[k+37])/Sa:0,tb=q[k+52]*Ka,kb=x+ba*tb,ub=y+ca*Ka*Ia,rb=q[k+53]*Ka,Bb=D+pb*rb,lb=E+nb*rb,yb=G+qb*Ka*Va,xb=q[k+54]*Ka,Ib=J-Z*xb,wb=L-ba*xb,vb=O-ma*Ka*na,zb=q[k+55]*Ka,Eb=U-pb*zb,Cb=W-nb*zb,eb=Q-bb*Ka*Xa,sb=(M[0]=w+Z*tb,t[0]),ob=(M[0]=kb,t[0])|0;l[(u|0)>>2]=0|sb;l[(u+4|0)>>2]=ob;q[(l[j]+8>>2)+(3*l[m>>2]|0)]=ub;var Db=l[j]+12*l[g]|0,Jb=(M[0]=Bb,t[0]),Rb=(M[0]=lb,t[0])|0;l[(Db|0)>>2]=0|Jb;l[(Db+4|0)>>2]=Rb;q[(l[j]+8>>2)+(3*l[g]|0)]=yb;var Nb=l[j]+12*l[f]|0,Ob=(M[0]=Ib,t[0]),Lb=(M[0]=wb,t[0])|0;l[(Nb|0)>>2]=0|Ob;l[(Nb+4|0)>>2]=Lb;q[(l[j]+8>>2)+(3*l[f]|0)]=vb;var Pb=l[j]+12*l[e]|0,Mb=(M[0]=Eb,t[0]),Yb=(M[0]=Cb,t[0])|0;l[(Pb|0)>>2]=0|Mb;l[(Pb+4|0)>>2]=Yb;q[(l[j]+8>>2)+(3*l[e]|0)]=eb;return 1}),0,(function(){var b=a;V(N.Ng|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));a=b}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e=d+76|0,f=l[e+4>>2];l[b>>2]=l[e>>2];l[b+4>>2]=f}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+68>>2],h=q[e+5],j=q[d+72>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+100>>2]*e;q[b>>2]=q[d+96>>2]*e;q[b+4>>2]=f}),0,Kb(0),0,(function(){var b=a;V(N.rh|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));a=b}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h=b>>2;e=l[h+13];g=e>>2;var j=l[g+2];f=(b+116|0)>>2;l[f]=j;var k=b+128|0;e=e+28|0;var m=l[e+4>>2];l[k>>2]=l[e>>2];l[k+4>>2]=m;var n=b+136|0;q[n>>2]=q[g+30];var p=b+140|0;q[p>>2]=q[g+32];e=l[d+24>>2];var u=e+12*j|0,m=l[u+4>>2],r=(t[0]=l[u>>2],M[0]),w=(t[0]=m,M[0]),x=q[(e+8>>2)+(3*j|0)];e=(d+28|0)>>2;var y=l[e],m=y+12*j|0,u=l[m+4>>2],m=(t[0]=l[m>>2],M[0]),u=(t[0]=u,M[0]),j=q[(y+8>>2)+(3*j|0)],y=mm(x),A=nm(x),C=q[g+29],z=6.2831854820251465*q[h+21],x=q[d>>2];g=x*C*z*z;C=2*C*q[h+22]*z+g;1.1920928955078125e-7<C||P(N.ca|0,125,N.me|0,N.jh|0);x*=C;x=0!=x?1/x:x;q[h+27]=x;g*=x;q[h+23]=g;C=q[h+17]-q[k>>2];z=q[h+18]-q[h+33];k=A*C-y*z;y=y*C+A*z;A=b+120|0;C=(M[0]=k,t[0]);z=(M[0]=y,t[0])|0;l[(A|0)>>2]=0|C;l[(A+4|0)>>2]=z;n=q[n>>2];p=q[p>>2];A=n+p*y*y+x;C=k*-p*y;x=n+p*k*k+x;z=A*x-C*C;z=0!=z?1/z:z;C*=-z;q[h+36]=z*x;q[h+37]=C;q[h+38]=C;q[h+39]=z*A;x=b+160|0;r=r+k-q[h+19];w=w+y-q[h+20];A=(M[0]=r,t[0]);C=(M[0]=w,t[0]);l[(x|0)>>2]=0|A;l[(x+4|0)>>2]=C|0;q[x>>2]=r*g;q[h+41]=w*g;r=.9800000190734863*j;j=b+96|0;0==(c[d+20|0]&1)<<24>>24?(q[j>>2]=0,q[h+25]=0,h=m):(w=q[d+8>>2],j|=0,h=q[j>>2]*w,q[j>>2]=h,j=b+100|0,w*=q[j>>2],q[j>>2]=w,r+=p*(k*w-y*h),h=m+h*n,u+=w*n);m=l[e]+12*l[f]|0;h=(M[0]=h,t[0]);u=(M[0]=u,t[0])|0;l[(m|0)>>2]=0|h;l[(m+4|0)>>2]=u;q[(l[e]+8>>2)+(3*l[f]|0)]=r}),0,(function(b,d){var e,f,g,h=b>>2,j=b+116|0,k=l[j>>2];g=(d+28|0)>>2;var m=l[g],n=m+12*k|0,p=l[n+4>>2],n=(t[0]=l[n>>2],M[0]),p=(t[0]=p,M[0]),m=q[(m+8>>2)+(3*k|0)],u=q[h+31],r=q[h+30],w=q[h+27],x=b+96|0;f=(x|0)>>2;var y=q[f];e=(b+100|0)>>2;var A=q[e],C=-(n+u*-m+q[h+40]+y*w),z=-(p+r*m+q[h+41]+A*w),w=q[h+36]*C+q[h+38]*z,z=q[h+37]*C+q[h+39]*z,C=l[x+4>>2],x=(t[0]=l[x>>2],M[0]),C=(t[0]=C,M[0]),y=y+w;q[f]=y;A+=z;q[e]=A;w=q[d>>2]*q[h+26];z=y*y+A*A;z>w*w?(z=Fh(z),w/=z,y*=w,q[f]=y,f=A*w,q[e]=f,e=y):(e=y,f=A);e-=x;f-=C;x=q[h+34];h=m+q[h+35]*(r*f-u*e);k=l[g]+12*k|0;n=(M[0]=n+e*x,t[0]);p=(M[0]=p+f*x,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=p;q[(l[g]+8>>2)+(3*l[j>>2]|0)]=h}),0,Kb(1),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+68>>2],h=q[e+5],j=q[d+72>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+76>>2],h=q[e+5],j=q[d+80>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var d=d>>2,f=q[d+26],g=q[d+29]+q[d+28],h=(q[d+49]*f+q[d+47]*g)*e;q[b>>2]=(q[d+48]*f+q[d+46]*g)*e;q[b+4>>2]=h}),0,(function(b,d){return q[b+108>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.eg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));f=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=f,s));f=q[d+17];g=q[d+18];V(N.K|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+19];g=q[d+20];V(N.L|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+21];g=q[d+22];V(N.Wb|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+25];V(N.$a|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=c[b+136|0]&1;V(N.Yb|0,(s=a,a+=4,l[s>>2]=f,s));f=q[d+30];V(N.$e|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=q[d+31];V(N.kf|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=c[b+137|0]&1;V(N.ab|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+33];V(N.bb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+32];V(N.Af|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j,k,m=b>>2,n=l[m+12];k=n>>2;var p=o[k+2],u=b+144|0;l[u>>2]=p;var r=l[m+13];j=r>>2;var w=l[j+2];h=(b+148|0)>>2;l[h]=w;var x=n+28|0,y=b+152|0,A=l[x>>2],C=l[x+4>>2];l[y>>2]=A;l[y+4>>2]=C;var z=r+28|0,D=b+160|0,E=l[z>>2],G=l[z+4>>2];l[D>>2]=E;l[D+4>>2]=G;var H=q[k+30];q[m+42]=H;var F=q[j+30];q[m+43]=F;var I=q[k+32];q[m+44]=I;var J=q[j+32];q[m+45]=J;var L=l[d+24>>2],O=L+12*p|0,R=l[O+4>>2],T=(t[0]=l[O>>2],M[0]),S=(t[0]=R,M[0]),U=q[(L+8>>2)+(3*p|0)];g=(d+28|0)>>2;var W=l[g],Q=W+12*p|0,$=l[Q+4>>2],ea=(t[0]=l[Q>>2],M[0]),sa=(t[0]=$,M[0]),Ba=q[(W+8>>2)+(3*p|0)],oa=L+12*w|0,ga=l[oa+4>>2],qa=(t[0]=l[oa>>2],M[0]),la=(t[0]=ga,M[0]),Ca=q[(L+8>>2)+(3*w|0)],ia=W+12*w|0,ya=l[ia+4>>2],ta=(t[0]=l[ia>>2],M[0]),Ia=(t[0]=ya,M[0]),na=q[(W+8>>2)+(3*w|0)],Z=mm(U),ba=nm(U),ca=mm(Ca),ma=nm(Ca),ka=q[m+17],aa=(t[0]=A,M[0]),ra=ka-aa,ha=q[m+18],za=(t[0]=C,M[0]),X=ha-za,ua=ba*ra-Z*X,da=Z*ra+ba*X,fa=q[m+19],Aa=(t[0]=E,M[0]),Qa=fa-Aa,pa=q[m+20],cb=(t[0]=G,M[0]),Ra=pa-cb,Ta=ma*Qa-ca*Ra,$a=ca*Qa+ma*Ra,va=qa-T+Ta-ua,Wa=la-S+$a-da,fb=q[m+21],gb=q[m+22],Xa=ba*fb-Z*gb,Ua=Z*fb+ba*gb,Va=b+184|0,pb=(M[0]=Xa,t[0]),nb=(M[0]=Ua,t[0])|0;l[Va>>2]=0|pb;l[Va+4>>2]=nb;var La=va+ua,qb=Wa+da,bb=La*Ua-qb*Xa;q[m+52]=bb;var Fa=Ta*Ua-$a*Xa;q[m+53]=Fa;var Ma=H+F,wa=I*bb,hb=J*Fa,Ya=Ma+wa*bb+hb*Fa;q[m+63]=0<Ya?1/Ya:Ya;var Za=q[m+23],Da=q[m+24],Oa=ba*Za-Z*Da,ib=Z*Za+ba*Da,ab=b+192|0,Ga=(M[0]=Oa,t[0]),jb=(M[0]=ib,t[0])|0;l[ab>>2]=0|Ga;l[ab+4>>2]=jb;var Ea=La*ib-qb*Oa;q[m+50]=Ea;var Pa=Ta*ib-$a*Oa;q[m+51]=Pa;var Ja=I*Ea,db=J*Pa,xa=Ja+db,Sa=Ja*bb+db*Fa,Ka=I+J,tb=0==Ka?1:Ka,kb=wa+hb;q[m+54]=Ma+Ja*Ea+db*Pa;q[m+55]=xa;q[m+56]=Sa;q[m+57]=xa;q[m+58]=tb;q[m+59]=kb;q[m+60]=Sa;q[m+61]=kb;q[m+62]=Ya;if(0==(c[b+136|0]&1)<<24>>24){l[m+35]=0,q[m+28]=0}else{var ub=Xa*va+Ua*Wa,rb=q[m+31],Bb=q[m+30],lb=rb-Bb;if(.009999999776482582>(0<lb?lb:-lb)){l[m+35]=3}else{if(ub>Bb){f=(b+140|0)>>2,ub<rb?(l[f]=0,q[m+28]=0):2!=(l[f]|0)&&(l[f]=2,q[m+28]=0)}else{var yb=b+140|0;1!=(l[yb>>2]|0)&&(l[yb>>2]=1,q[m+28]=0)}}}0==(c[b+137|0]&1)<<24>>24&&(q[m+29]=0);var xb=b+104|0;if(0==(c[d+20|0]&1)<<24>>24){e=xb>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;var Ib=na,wb=Ba,vb=ea,zb=sa,Eb=ta,Cb=Ia}else{var eb=d+8|0,sb=q[eb>>2],ob=xb|0,Db=q[ob>>2]*sb;q[ob>>2]=Db;var Jb=b+108|0,Rb=q[Jb>>2]*sb;q[Jb>>2]=Rb;var Nb=b+112|0,Ob=q[Nb>>2]*sb;q[Nb>>2]=Ob;var Lb=b+116|0,Pb=q[Lb>>2]*q[eb>>2];q[Lb>>2]=Pb;var Mb=Pb+Ob,Yb=Oa*Db+Xa*Mb,Zb=ib*Db+Ua*Mb,Ib=na+J*(Db*Pa+Rb+Mb*Fa),wb=Ba-I*(Db*Ea+Rb+Mb*bb),vb=ea-Yb*H,zb=sa-Zb*H,Eb=ta+Yb*F,Cb=Ia+Zb*F}var ec=l[g]+12*p|0,Ub=(M[0]=vb,t[0]),jc=(M[0]=zb,t[0])|0;l[(ec|0)>>2]=0|Ub;l[(ec+4|0)>>2]=jc;q[(l[g]+8>>2)+(3*l[u>>2]|0)]=wb;var Qb=l[g]+12*l[h]|0,mb=(M[0]=Eb,t[0]),cc=(M[0]=Cb,t[0])|0;l[(Qb|0)>>2]=0|mb;l[(Qb+4|0)>>2]=cc;q[(l[g]+8>>2)+(3*l[h]|0)]=Ib}),0,(function(b,d){var e,f,g,h,j,k,m,n=b>>2,p=a;a+=24;var u,r=p+12;m=r>>2;k=(b+144|0)>>2;var w=o[k];j=(d+28|0)>>2;var x=l[j],y=x+12*w|0,A=l[y+4>>2],C=(t[0]=l[y>>2],M[0]),z=(t[0]=A,M[0]),D=q[(x+8>>2)+(3*w|0)];h=(b+148|0)>>2;var E=l[h],G=x+12*E|0,H=l[G+4>>2],F=(t[0]=l[G>>2],M[0]),I=(t[0]=H,M[0]),J=q[(x+8>>2)+(3*E|0)],L=q[n+42],O=q[n+43],R=q[n+44],T=q[n+45];if(0==(c[b+137|0]&1)<<24>>24){var S=J,U=D,W=C,Q=z,$=F,ea=I}else{if(3==(l[n+35]|0)){S=J,U=D,W=C,Q=z,$=F,ea=I}else{var sa=q[n+46],Ba=q[n+47],oa=q[n+53],ga=q[n+52],qa=b+116|0,la=q[qa>>2],Ca=q[d>>2]*q[n+32],ia=la+q[n+63]*(q[n+33]-(sa*(F-C)+Ba*(I-z)+oa*J-ga*D)),ya=-Ca,ta=ia<Ca?ia:Ca,Ia=ta<ya?ya:ta;q[qa>>2]=Ia;var na=Ia-la,Z=sa*na,ba=Ba*na,S=J+T*na*oa,U=D-R*na*ga,W=C-Z*L,Q=z-ba*L,$=F+Z*O,ea=I+ba*O}}var ca=$-W,ma=ea-Q,ka=b+192|0,aa=q[ka>>2],ra=b+196|0,ha=q[ra>>2],za=b+204|0,X=q[za>>2],ua=b+200|0,da=q[ua>>2],fa=aa*ca+ha*ma+X*S-da*U,Aa=S-U;if(0==(c[b+136|0]&1)<<24>>24){u=13}else{var Qa=b+140|0;if(0==(l[Qa>>2]|0)){u=13}else{var pa=b+184|0,cb=b+188|0,Ra=b+212|0,Ta=b+208|0;g=(b+104|0)>>2;var $a=q[g];f=(b+108|0)>>2;var va=q[f];e=(b+112|0)>>2;var Wa=q[e],fb=b+216|0,gb=-fa,Xa=-Aa,Ua=-(q[pa>>2]*ca+q[cb>>2]*ma+q[Ra>>2]*S-q[Ta>>2]*U);q[m]=gb;q[m+1]=Xa;q[m+2]=Ua;pn(p,fb,r);var Va=p|0;q[g]+=q[Va>>2];var pb=p+4|0;q[f]+=q[pb>>2];var nb=p+8|0,La=q[e]+q[nb>>2];q[e]=La;var qb=l[Qa>>2];if(1==(qb|0)){var bb=0<La?La:0,Fa=q[e]=bb}else{if(2==(qb|0)){var Ma=0>La?La:0,Fa=q[e]=Ma}else{Fa=La}}var wa=Fa-Wa,hb=gb-q[n+60]*wa,Ya=Xa-q[n+61]*wa,Za=q[fb>>2],Da=q[n+57],Oa=q[n+55],ib=q[n+58],ab=Za*ib-Da*Oa,Ga=0!=ab?1/ab:ab,jb=Ga*(ib*hb-Da*Ya)+$a,Ea=Ga*(Za*Ya-Oa*hb)+va;q[g]=jb;q[f]=Ea;var Pa=jb-$a,Ja=Ea-va;q[Va>>2]=Pa;q[pb>>2]=Ja;q[nb>>2]=wa;var db=Pa*q[za>>2]+Ja+wa*q[Ra>>2],xa=Pa*q[ua>>2]+Ja+wa*q[Ta>>2],Sa=q[ka>>2]*Pa+q[pa>>2]*wa,Ka=q[ra>>2]*Pa+q[cb>>2]*wa,tb=l[k];u=16}}if(13==u){var kb=-fa,ub=-Aa,rb=q[n+54],Bb=q[n+57],lb=q[n+55],yb=q[n+58],xb=rb*yb-Bb*lb,Ib=0!=xb?1/xb:xb,wb=Ib*(yb*kb-Bb*ub),vb=Ib*(rb*ub-lb*kb),zb=b+104|0;q[zb>>2]+=wb;var Eb=b+108|0;q[Eb>>2]+=vb;db=wb*X+vb;xa=wb*da+vb;Sa=aa*wb;Ka=ha*wb;tb=w}var Cb=S+T*db,eb=U-R*xa,sb=Q-Ka*L,ob=$+Sa*O,Db=ea+Ka*O,Jb=l[j]+12*tb|0,Rb=(M[0]=W-Sa*L,t[0]),Nb=(M[0]=sb,t[0])|0;l[(Jb|0)>>2]=0|Rb;l[(Jb+4|0)>>2]=Nb;q[(l[j]+8>>2)+(3*l[k]|0)]=eb;var Ob=l[j]+12*l[h]|0,Lb=(M[0]=ob,t[0]),Pb=(M[0]=Db,t[0])|0;l[(Ob|0)>>2]=0|Lb;l[(Ob+4|0)>>2]=Pb;q[(l[j]+8>>2)+(3*l[h]|0)]=Cb;a=p}),0,(function(b,d){var e,f,g=b>>2,h=b+144|0,j=l[h>>2];f=(d+24|0)>>2;var k=l[f],m=k+12*j|0,n=l[m+4>>2],p=(t[0]=l[m>>2],M[0]),u=(t[0]=n,M[0]),r=q[(k+8>>2)+(3*j|0)];e=(b+148|0)>>2;var w=l[e],x=k+12*w|0,y=l[x+4>>2],A=(t[0]=l[x>>2],M[0]),C=(t[0]=y,M[0]),z=q[(k+8>>2)+(3*w|0)],D=mm(r),E=nm(r),G=mm(z),H=nm(z),F=q[g+42],I=q[g+43],J=q[g+44],L=q[g+45],O=q[g+17]-q[g+38],R=q[g+18]-q[g+39],T=E*O-D*R,S=D*O+E*R,U=q[g+19]-q[g+40],W=q[g+20]-q[g+41],Q=H*U-G*W,$=G*U+H*W,ea=A+Q-p-T,sa=C+$-u-S,Ba=q[g+21],oa=q[g+22],ga=E*Ba-D*oa,qa=D*Ba+E*oa,la=ea+T,Ca=sa+S,ia=la*qa-Ca*ga,ya=Q*qa-$*ga,ta=q[g+23],Ia=q[g+24],na=E*ta-D*Ia,Z=D*ta+E*Ia,ba=la*Z-Ca*na,ca=Q*Z-$*na,ma=na*ea+Z*sa,ka=z-r-q[g+25],aa=0<ma?ma:-ma,ra=0<ka?ka:-ka;if(0==(c[b+136|0]&1)<<24>>24){var ha=0,za=0,X=aa}else{var ua=ga*ea+qa*sa,da=q[g+31],fa=q[g+30],Aa=da-fa;if(.009999999776482582>(0<Aa?Aa:-Aa)){var Qa=.20000000298023224>ua?ua:.20000000298023224,pa=0<ua?ua:-ua,cb=aa>pa?aa:pa,ha=-.20000000298023224>Qa?-.20000000298023224:Qa,za=1,X=cb}else{if(ua>fa){if(ua<da){za=ha=0,X=aa}else{var Ra=ua-da,Ta=Ra-.004999999888241291,$a=.20000000298023224>Ta?Ta:.20000000298023224,va=aa>Ra?aa:Ra,ha=0>$a?0:$a,za=1,X=va}}else{var Wa=ua-fa+.004999999888241291,fb=0>Wa?Wa:0,gb=fa-ua,Xa=aa>gb?aa:gb,ha=-.20000000298023224>fb?-.20000000298023224:fb,za=1,X=Xa}}}var Ua=F+I,Va=J*ba,pb=L*ca,nb=Ua+Va*ba+pb*ca,La=Va+pb;if(za){var qb=Va*ia+pb*ya,bb=J+L,Fa=0==bb?1:bb,Ma=J*ia,wa=L*ya,hb=Ma+wa,Ya=Ua+Ma*ia+wa*ya,Za=-ma,Da=-ka,Oa=-ha,ib=Fa*Ya-hb*hb,ab=hb*qb-La*Ya,Ga=La*hb-Fa*qb,jb=nb*ib+La*ab+qb*Ga,Ea=0!=jb?1/jb:jb,Pa=hb*Za,Ja=Ea*(ib*Za+ab*Da+Ga*Oa),db=Ea*(nb*(Ya*Da-hb*Oa)+La*(qb*Oa-Ya*Za)+qb*(Pa-qb*Da)),xa=Ea*(nb*(Fa*Oa-hb*Da)+La*(Pa-La*Oa)+qb*(La*Da-Fa*Za))}else{var Sa=J+L,Ka=0==Sa?1:Sa,tb=-ma,kb=-ka,ub=nb*Ka-La*La,rb=0!=ub?1/ub:ub,Ja=rb*(Ka*tb-La*kb),db=rb*(nb*kb-La*tb),xa=0}var Bb=na*Ja+ga*xa,lb=Z*Ja+qa*xa,yb=u-lb*F,xb=r-J*(Ja*ba+db+xa*ia),Ib=A+Bb*I,wb=C+lb*I,vb=z+L*(Ja*ca+db+xa*ya),zb=(M[0]=p-Bb*F,t[0]),Eb=(M[0]=yb,t[0])|0;l[(m|0)>>2]=0|zb;l[(m+4|0)>>2]=Eb;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=xb;var Cb=l[f]+12*l[e]|0,eb=(M[0]=Ib,t[0]),sb=(M[0]=wb,t[0])|0;l[(Cb|0)>>2]=0|eb;l[(Cb+4|0)>>2]=sb;q[(l[f]+8>>2)+(3*l[e]|0)]=vb;return.004999999888241291<X?0:.03490658849477768>=ra}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+92>>2],h=q[e+5],j=q[d+96>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+100>>2],h=q[e+5],j=q[d+104>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+116>>2],g=q[d+140>>2]*f*e;q[b>>2]=q[d+136>>2]*f*e;q[b+4>>2]=g}),0,Kb(0),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.Pg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+17];f=q[d+18];V(N.wh|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+19];f=q[d+20];V(N.Bh|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+23];f=q[d+24];V(N.K|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+25];f=q[d+26];V(N.L|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+21];V(N.af|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+22];V(N.lf|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+28];V(N.Fb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j=b>>2,k=l[j+12];h=k>>2;var m=l[h+2],n=b+120|0;l[n>>2]=m;var p=l[j+13];g=p>>2;var u=l[g+2];f=(b+124|0)>>2;l[f]=u;var r=k+28|0,w=b+160|0,x=l[r>>2],y=l[r+4>>2];l[w>>2]=x;l[w+4>>2]=y;var A=p+28|0,C=b+168|0,z=l[A>>2],D=l[A+4>>2];l[C>>2]=z;l[C+4>>2]=D;var E=q[h+30];q[j+44]=E;var G=q[g+30];q[j+45]=G;var H=q[h+32];q[j+46]=H;var F=q[g+32];q[j+47]=F;var I=l[d+24>>2],J=I+12*m|0,L=l[J+4>>2],O=(t[0]=l[J>>2],M[0]),R=(t[0]=L,M[0]),T=q[(I+8>>2)+(3*m|0)];e=(d+28|0)>>2;var S=l[e],U=S+12*m|0,W=l[U+4>>2],Q=(t[0]=l[U>>2],M[0]),$=(t[0]=W,M[0]),ea=q[(S+8>>2)+(3*m|0)],sa=I+12*u|0,Ba=l[sa+4>>2],oa=(t[0]=l[sa>>2],M[0]),ga=(t[0]=Ba,M[0]),qa=q[(I+8>>2)+(3*u|0)],la=S+12*u|0,Ca=l[la+4>>2],ia=(t[0]=l[la>>2],M[0]),ya=(t[0]=Ca,M[0]),ta=q[(S+8>>2)+(3*u|0)],Ia=mm(T),na=nm(T),Z=mm(qa),ba=nm(qa),ca=b+144|0,ma=q[j+23],ka=(t[0]=x,M[0]),aa=ma-ka,ra=q[j+24],ha=(t[0]=y,M[0]),za=ra-ha,X=na*aa-Ia*za,ua=Ia*aa+na*za,da=(M[0]=X,t[0]),fa=(M[0]=ua,t[0])|0;l[ca>>2]=0|da;l[ca+4>>2]=fa;var Aa=b+152|0,Qa=q[j+25],pa=(t[0]=z,M[0]),cb=Qa-pa,Ra=q[j+26],Ta=(t[0]=D,M[0]),$a=Ra-Ta,va=ba*cb-Z*$a,Wa=Z*cb+ba*$a,fb=(M[0]=va,t[0]),gb=(M[0]=Wa,t[0])|0;l[Aa>>2]=0|fb;l[Aa+4>>2]=gb;var Xa=b+128|0,Ua=O+X-q[j+17],Va=R+ua-q[j+18],pb=(M[0]=Ua,t[0]),nb=(M[0]=Va,t[0])|0;l[Xa>>2]=0|pb;l[Xa+4>>2]=nb;var La=b+136|0,qb=oa+va-q[j+19],bb=ga+Wa-q[j+20],Fa=(M[0]=qb,t[0]),Ma=(M[0]=bb,t[0])|0;l[La>>2]=0|Fa;l[La+4>>2]=Ma;var wa=Xa|0,hb=b+132|0,Ya=Fh(Ua*Ua+Va*Va),Za=La|0,Da=b+140|0,Oa=Fh(qb*qb+bb*bb);if(.04999999701976776<Ya){var ib=1/Ya,ab=Ua*ib;q[wa>>2]=ab;var Ga=Va*ib,jb=ab}else{jb=Ga=q[wa>>2]=0}q[hb>>2]=Ga;if(.04999999701976776<Oa){var Ea=1/Oa,Pa=qb*Ea;q[Za>>2]=Pa;var Ja=bb*Ea,db=Pa}else{db=Ja=q[Za>>2]=0}q[Da>>2]=Ja;var xa=X*Ga-ua*jb,Sa=va*Ja-Wa*db,Ka=q[j+28],tb=E+H*xa*xa+Ka*Ka*(G+F*Sa*Sa);q[j+48]=0<tb?1/tb:tb;if(0==(c[d+20|0]&1)<<24>>24){q[j+29]=0;var kb=ta,ub=ea,rb=Q,Bb=$,lb=ia,yb=ya}else{var xb=b+116|0,Ib=q[xb>>2]*q[d+8>>2];q[xb>>2]=Ib;var wb=-Ib,vb=jb*wb,zb=Ga*wb,Eb=Ib*-Ka,Cb=db*Eb,eb=Ja*Eb,kb=ta+F*(va*eb-Wa*Cb),ub=ea+H*(X*zb-ua*vb),rb=Q+vb*E,Bb=$+zb*E,lb=ia+Cb*G,yb=ya+eb*G}var sb=l[e]+12*m|0,ob=(M[0]=rb,t[0]),Db=(M[0]=Bb,t[0])|0;l[(sb|0)>>2]=0|ob;l[(sb+4|0)>>2]=Db;q[(l[e]+8>>2)+(3*l[n>>2]|0)]=ub;var Jb=l[e]+12*l[f]|0,Rb=(M[0]=lb,t[0]),Nb=(M[0]=yb,t[0])|0;l[(Jb|0)>>2]=0|Rb;l[(Jb+4|0)>>2]=Nb;q[(l[e]+8>>2)+(3*l[f]|0)]=kb}),0,(function(b,d){var e,f,g=b>>2,h=b+120|0,j=l[h>>2];f=(d+28|0)>>2;var k=l[f],m=k+12*j|0;e=l[m+4>>2];var n=(t[0]=l[m>>2],M[0]),p=(t[0]=e,M[0]),u=q[(k+8>>2)+(3*j|0)];e=(b+124|0)>>2;var r=l[e],m=k+12*r|0,w=l[m+4>>2],m=(t[0]=l[m>>2],M[0]),w=(t[0]=w,M[0]),k=q[(k+8>>2)+(3*r|0)],x=q[g+37],y=q[g+36],r=q[g+39],A=q[g+38],C=q[g+32],z=q[g+33],D=q[g+28],E=q[g+34],G=q[g+35],H=(-(C*(n+x*-u)+z*(p+y*u))-D*(E*(m+r*-k)+G*(w+A*k)))*-q[g+48],F=b+116|0;q[F>>2]+=H;F=-H;C*=F;z*=F;D=H*-D;E*=D;G*=D;D=q[g+44];x=u+q[g+46]*(y*z-x*C);u=q[g+45];g=k+q[g+47]*(A*G-r*E);j=l[f]+12*j|0;n=(M[0]=n+C*D,t[0]);p=(M[0]=p+z*D,t[0])|0;l[(j|0)>>2]=0|n;l[(j+4|0)>>2]=p;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=x;h=l[f]+12*l[e]|0;m=(M[0]=m+E*u,t[0]);w=(M[0]=w+G*u,t[0])|0;l[(h|0)>>2]=0|m;l[(h+4|0)>>2]=w;q[(l[f]+8>>2)+(3*l[e]|0)]=g}),0,(function(b,d){var e,f,g=b>>2,h=b+120|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+124|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),j=q[(j+8>>2)+(3*u|0)],x=mm(p),y=nm(p),A=mm(j),C=nm(j),z=q[g+23]-q[g+40],D=q[g+24]-q[g+41],u=y*z-x*D,y=x*z+y*D,z=q[g+25]-q[g+42],D=q[g+26]-q[g+43],x=C*z-A*D,A=A*z+C*D,E=n+u-q[g+17],D=m+y-q[g+18],z=r+x-q[g+19],C=w+A-q[g+20],G=Fh(E*E+D*D),H=Fh(z*z+C*C);if(.04999999701976776<G){var F=1/G,E=E*F,I=D*F}else{I=E=0}if(.04999999701976776<H){var D=1/H,J=z*D,L=C*D}else{L=J=0}var O=u*I-y*E,R=x*L-A*J,F=q[g+44],D=q[g+46],z=q[g+45],C=q[g+47],T=q[g+28],O=F+D*O*O+T*T*(z+C*R*R),g=q[g+27]-G-T*H,G=g*-(0<O?1/O:O),H=-G,E=E*H,I=I*H,G=G*-T,J=J*G,L=L*G,n=(M[0]=n+E*F,t[0]),m=(M[0]=m+I*F,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=p+D*(u*I-y*E);h=l[f]+12*l[e]|0;k=(M[0]=r+J*z,t[0]);n=(M[0]=w+L*z,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=j+C*(x*L-A*J);return.004999999888241291>(0<g?g:-g)}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+68>>2],h=q[e+5],j=q[d+72>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+76>>2],h=q[e+5],j=q[d+80>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+88>>2]*e;q[b>>2]=q[d+84>>2]*e;q[b+4>>2]=f}),0,(function(b,d){return q[b+92>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.gg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));f=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=f,s));f=q[d+17];g=q[d+18];V(N.K|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+19];g=q[d+20];V(N.L|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+29];V(N.$a|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=c[b+112|0]&1;V(N.Yb|0,(s=a,a+=4,l[s>>2]=f,s));f=q[d+30];V(N.Ve|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));f=q[d+31];V(N.bf|0,(s=a,a+=8,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=c[b+100|0]&1;V(N.ab|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+27];V(N.bb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+26];V(N.Zb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j,k,m=b>>2,n=l[m+12];k=n>>2;var p=o[k+2],u=b+128|0;l[u>>2]=p;var r=l[m+13];j=r>>2;var w=l[j+2];h=(b+132|0)>>2;l[h]=w;var x=n+28|0,y=b+152|0,A=l[x>>2],C=l[x+4>>2];l[y>>2]=A;l[y+4>>2]=C;var z=r+28|0,D=b+160|0,E=l[z>>2],G=l[z+4>>2];l[D>>2]=E;l[D+4>>2]=G;var H=q[k+30];q[m+42]=H;var F=q[j+30];q[m+43]=F;var I=q[k+32];q[m+44]=I;var J=q[j+32];q[m+45]=J;var L=l[d+24>>2],O=q[(L+8>>2)+(3*p|0)];g=(d+28|0)>>2;var R=l[g],T=R+12*p|0,S=l[T+4>>2],U=(t[0]=l[T>>2],M[0]),W=(t[0]=S,M[0]),Q=q[(R+8>>2)+(3*p|0)],$=q[(L+8>>2)+(3*w|0)],ea=R+12*w|0,sa=l[ea+4>>2],Ba=(t[0]=l[ea>>2],M[0]),oa=(t[0]=sa,M[0]),ga=q[(R+8>>2)+(3*w|0)],qa=mm(O),la=nm(O),Ca=mm($),ia=nm($),ya=b+136|0,ta=q[m+17],Ia=(t[0]=A,M[0]),na=ta-Ia,Z=q[m+18],ba=(t[0]=C,M[0]),ca=Z-ba,ma=la*na-qa*ca,ka=qa*na+la*ca,aa=(M[0]=ma,t[0]),ra=(M[0]=ka,t[0])|0;l[ya>>2]=0|aa;l[ya+4>>2]=ra;var ha=b+144|0,za=q[m+19],X=(t[0]=E,M[0]),ua=za-X,da=q[m+20],fa=(t[0]=G,M[0]),Aa=da-fa,Qa=ia*ua-Ca*Aa,pa=Ca*ua+ia*Aa,cb=(M[0]=Qa,t[0]),Ra=(M[0]=pa,t[0])|0;l[ha>>2]=0|cb;l[ha+4>>2]=Ra;var Ta=I+J,$a=0==Ta,va=H+F;q[m+46]=va+ka*ka*I+pa*pa*J;var Wa=-ka,fb=ma*Wa*I-pa*Qa*J;q[m+49]=fb;var gb=I*Wa-pa*J;q[m+52]=gb;q[m+47]=fb;q[m+50]=va+ma*ma*I+Qa*Qa*J;var Xa=ma*I+Qa*J;q[m+53]=Xa;q[m+48]=gb;q[m+51]=Xa;q[m+54]=Ta;q[m+55]=0<Ta?1/Ta:Ta;0==(c[b+100|0]&1)<<24>>24|$a&&(q[m+24]=0);if(0==(c[b+112|0]&1)<<24>>24|$a){l[m+56]=0}else{var Ua=$-O-q[m+29],Va=q[m+31],pb=q[m+30],nb=Va-pb;if(.06981317698955536>(0<nb?nb:-nb)){l[m+56]=3}else{if(Ua>pb){f=(b+224|0)>>2,Ua<Va?(l[f]=0,q[m+23]=0):(2!=(l[f]|0)&&(q[m+23]=0),l[f]=2)}else{var La=b+224|0;1!=(l[La>>2]|0)&&(q[m+23]=0);l[La>>2]=1}}}var qb=b+84|0;if(0==(c[d+20|0]&1)<<24>>24){e=qb>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;var bb=ga,Fa=Q,Ma=U,wa=W,hb=Ba,Ya=oa}else{var Za=d+8|0,Da=q[Za>>2],Oa=qb|0,ib=q[Oa>>2]*Da;q[Oa>>2]=ib;var ab=b+88|0,Ga=q[ab>>2]*Da;q[ab>>2]=Ga;var jb=b+92|0,Ea=q[jb>>2]*Da;q[jb>>2]=Ea;var Pa=b+96|0,Ja=q[Pa>>2]*q[Za>>2];q[Pa>>2]=Ja;bb=ga+J*(Qa*Ga-pa*ib+Ja+Ea);Fa=Q-I*(ma*Ga-ka*ib+Ja+Ea);Ma=U-ib*H;wa=W-Ga*H;hb=Ba+ib*F;Ya=oa+Ga*F}var db=l[g]+12*p|0,xa=(M[0]=Ma,t[0]),Sa=(M[0]=wa,t[0])|0;l[(db|0)>>2]=0|xa;l[(db+4|0)>>2]=Sa;q[(l[g]+8>>2)+(3*l[u>>2]|0)]=Fa;var Ka=l[g]+12*l[h]|0,tb=(M[0]=hb,t[0]),kb=(M[0]=Ya,t[0])|0;l[(Ka|0)>>2]=0|tb;l[(Ka+4|0)>>2]=kb;q[(l[g]+8>>2)+(3*l[h]|0)]=bb}),0,(function(b,d){var e,f,g,h,j,k,m,n=b>>2,p=a;a+=24;var u;m=p>>2;var r=p+12;k=r>>2;j=(b+128|0)>>2;var w=o[j];h=(d+28|0)>>2;var x=l[h],y=x+12*w|0,A=l[y+4>>2],C=(t[0]=l[y>>2],M[0]),z=(t[0]=A,M[0]),D=q[(x+8>>2)+(3*w|0)];g=(b+132|0)>>2;var E=l[g],G=x+12*E|0,H=l[G+4>>2],F=(t[0]=l[G>>2],M[0]),I=(t[0]=H,M[0]),J=q[(x+8>>2)+(3*E|0)],L=q[n+42],O=q[n+43],R=q[n+44],T=q[n+45],S=0==R+T;if(0==(c[b+100|0]&1)<<24>>24){var U=J,W=D}else{if(3==(l[n+56]|0)|S){U=J,W=D}else{var Q=b+96|0,$=q[Q>>2],ea=q[d>>2]*q[n+26],sa=$+(J-D-q[n+27])*-q[n+55],Ba=-ea,oa=sa<ea?sa:ea,ga=oa<Ba?Ba:oa;q[Q>>2]=ga;var qa=ga-$,U=J+T*qa,W=D-R*qa}}if(0==(c[b+112|0]&1)<<24>>24){u=20}else{var la=b+224|0;if(0==(l[la>>2]|0)|S){u=20}else{var Ca=b+148|0,ia=b+144|0,ya=b+140|0,ta=b+136|0,Ia=F+q[Ca>>2]*-U-C-q[ya>>2]*-W,na=I+q[ia>>2]*U-z-q[ta>>2]*W;q[m]=Ia;q[m+1]=na;q[m+2]=U-W;var Z=b+184|0;pn(r,Z,p);var ba=q[k],ca=-ba,ma=q[k+1],ka=-ma,aa=q[k+2],ra=-aa,ha=l[la>>2];if(3==(ha|0)){var za=b+84|0;q[za>>2]-=ba;var X=b+88|0;q[X>>2]-=ma;var ua=b+92|0;q[ua>>2]-=aa;var da=ca,fa=ka,Aa=ra}else{if(1==(ha|0)){var Qa=b+84|0;f=(b+92|0)>>2;var pa=q[f],cb=pa-aa;if(0>cb){var Ra=q[n+52]*pa-Ia,Ta=q[n+53]*pa-na,$a=q[Z>>2],va=q[n+49],Wa=q[n+47],fb=q[n+50],gb=$a*fb-va*Wa,Xa=0!=gb?1/gb:gb,Ua=Xa*(fb*Ra-va*Ta),Va=Xa*($a*Ta-Wa*Ra),pb=-pa,nb=Qa|0;q[nb>>2]+=Ua;var La=b+88|0;q[La>>2]+=Va;q[f]=0;da=Ua;fa=Va;Aa=pb}else{var qb=Qa|0;q[qb>>2]-=ba;var bb=b+88|0;q[bb>>2]-=ma;q[f]=cb;da=ca;fa=ka;Aa=ra}}else{if(2==(ha|0)){var Fa=b+84|0;e=(b+92|0)>>2;var Ma=q[e],wa=Ma-aa;if(0<wa){var hb=q[n+52]*Ma-Ia,Ya=q[n+53]*Ma-na,Za=q[Z>>2],Da=q[n+49],Oa=q[n+47],ib=q[n+50],ab=Za*ib-Da*Oa,Ga=0!=ab?1/ab:ab,jb=Ga*(ib*hb-Da*Ya),Ea=Ga*(Za*Ya-Oa*hb),Pa=-Ma,Ja=Fa|0;q[Ja>>2]+=jb;var db=b+88|0;q[db>>2]+=Ea;q[e]=0;da=jb;fa=Ea;Aa=Pa}else{var xa=Fa|0;q[xa>>2]-=ba;var Sa=b+88|0;q[Sa>>2]-=ma;q[e]=wa;da=ca;fa=ka;Aa=ra}}else{da=ca,fa=ka,Aa=ra}}}var Ka=q[ia>>2]*fa-q[Ca>>2]*da+Aa,tb=q[ta>>2]*fa-q[ya>>2]*da+Aa,kb=da,ub=fa,rb=l[j];u=23}}if(20==u){var Bb=q[n+37],lb=q[n+36],yb=q[n+35],xb=q[n+34],Ib=-(F+Bb*-U-C-yb*-W),wb=-(I+lb*U-z-xb*W),vb=q[n+46],zb=q[n+49],Eb=q[n+47],Cb=q[n+50],eb=vb*Cb-zb*Eb,sb=0!=eb?1/eb:eb,ob=sb*(Cb*Ib-zb*wb),Db=sb*(vb*wb-Eb*Ib),Jb=b+84|0;q[Jb>>2]+=ob;var Rb=b+88|0;q[Rb>>2]+=Db;Ka=lb*Db-Bb*ob;tb=xb*Db-yb*ob;kb=ob;ub=Db;rb=w}var Nb=z-ub*L,Ob=F+kb*O,Lb=I+ub*O,Pb=U+T*Ka,Mb=W-R*tb,Yb=l[h]+12*rb|0,Zb=(M[0]=C-kb*L,t[0]),ec=(M[0]=Nb,t[0])|0;l[(Yb|0)>>2]=0|Zb;l[(Yb+4|0)>>2]=ec;q[(l[h]+8>>2)+(3*l[j]|0)]=Mb;var Ub=l[h]+12*l[g]|0,jc=(M[0]=Ob,t[0]),Qb=(M[0]=Lb,t[0])|0;l[(Ub|0)>>2]=0|jc;l[(Ub+4|0)>>2]=Qb;q[(l[h]+8>>2)+(3*l[g]|0)]=Pb;a=p}),0,(function(b,d){var e,f,g=b>>2,h=b+128|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+132|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),u=q[(j+8>>2)+(3*u|0)],x=b+176|0,y=b+180|0;if(0==(c[b+112|0]&1)<<24>>24){j=p,p=u,u=0,x=q[x>>2],y=q[y>>2]}else{if(y=q[y>>2],x=q[x>>2],j=l[g+56],0==(j|0)|0==x+y){j=p,p=u,u=0}else{var A=u-p-q[g+29];if(3==(j|0)){var j=A-q[g+30],j=.13962635397911072>j?j:.13962635397911072,j=-.13962635397911072>j?-.13962635397911072:j,A=j*-q[g+55],C=0<j?j:-j}else{1==(j|0)?(j=A-q[g+30],A=j+.03490658849477768,A=0>A?A:0,A=(-.13962635397911072>A?-.13962635397911072:A)*-q[g+55],C=-j):2==(j|0)?(j=A-q[g+31],A=j-.03490658849477768,A=.13962635397911072>A?A:.13962635397911072,A=(0>A?0:A)*-q[g+55],C=j):C=A=0}j=p-x*A;p=u+y*A;u=C}}var C=mm(j),z=nm(j),D=mm(p),E=nm(p),G=q[g+17]-q[g+38],H=q[g+18]-q[g+39],A=z*G-C*H,z=C*G+z*H,G=q[g+19]-q[g+40],H=q[g+20]-q[g+41],C=E*G-D*H,D=D*G+E*H,F=r+C-n-A,I=w+D-m-z,E=Fh(F*F+I*I),G=q[g+42],g=q[g+43],H=G+g,J=H+x*z*z+y*D*D,L=y*C,O=A*-x*z-L*D,H=H+x*A*A+L*C,L=J*H-O*O,L=0!=L?1/L:L,H=-(L*(H*F-O*I)),F=-(L*(J*I-O*F)),n=(M[0]=n-G*H,t[0]),m=(M[0]=m-G*F,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=j-x*(A*F-z*H);h=l[f]+12*l[e]|0;k=(M[0]=r+g*H,t[0]);n=(M[0]=w+g*F,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=p+y*(C*F-D*H);return.004999999888241291<E?0:.03490658849477768>=u}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+68>>2],h=q[e+5],j=q[d+72>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+76>>2],h=q[e+5],j=q[d+80>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var e=q[d+92>>2]*e,f=q[d+108>>2]*e;q[b>>2]=q[d+104>>2]*e;q[b+4>>2]=f}),0,Kb(0),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.Tg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+17];f=q[d+18];V(N.K|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+19];f=q[d+20];V(N.L|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+21];V(N.sh|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j=b>>2,k=l[j+12];h=k>>2;var m=o[h+2],n=b+96|0;l[n>>2]=m;var p=l[j+13];g=p>>2;var u=l[g+2];f=(b+100|0)>>2;l[f]=u;var r=k+28|0,w=b+128|0,x=l[r>>2],y=l[r+4>>2];l[w>>2]=x;l[w+4>>2]=y;var A=p+28|0,C=b+136|0,z=l[A>>2],D=l[A+4>>2];l[C>>2]=z;l[C+4>>2]=D;var E=q[h+30];q[j+36]=E;var G=q[g+30];q[j+37]=G;var H=q[h+32];q[j+38]=H;var F=q[g+32];q[j+39]=F;var I=l[d+24>>2],J=I+12*m|0,L=l[J+4>>2],O=(t[0]=l[J>>2],M[0]),R=(t[0]=L,M[0]),T=q[(I+8>>2)+(3*m|0)];e=(d+28|0)>>2;var S=l[e],U=S+12*m|0,W=l[U+4>>2],Q=(t[0]=l[U>>2],M[0]),$=(t[0]=W,M[0]),ea=q[(S+8>>2)+(3*m|0)],sa=I+12*u|0,Ba=l[sa+4>>2],oa=(t[0]=l[sa>>2],M[0]),ga=(t[0]=Ba,M[0]),qa=q[(I+8>>2)+(3*u|0)],la=S+12*u|0,Ca=l[la+4>>2],ia=(t[0]=l[la>>2],M[0]),ya=(t[0]=Ca,M[0]),ta=q[(S+8>>2)+(3*u|0)],Ia=mm(T),na=nm(T),Z=mm(qa),ba=nm(qa),ca=b+112|0,ma=q[j+17],ka=(t[0]=x,M[0]),aa=ma-ka,ra=q[j+18],ha=(t[0]=y,M[0]),za=ra-ha,X=na*aa-Ia*za,ua=Ia*aa+na*za,da=(M[0]=X,t[0]),fa=(M[0]=ua,t[0])|0;l[ca>>2]=0|da;l[ca+4>>2]=fa;var Aa=b+120|0,Qa=q[j+19],pa=(t[0]=z,M[0]),cb=Qa-pa,Ra=q[j+20],Ta=(t[0]=D,M[0]),$a=Ra-Ta,va=ba*cb-Z*$a,Wa=Z*cb+ba*$a,fb=(M[0]=va,t[0]),gb=(M[0]=Wa,t[0])|0;l[Aa>>2]=0|fb;l[Aa+4>>2]=gb;var Xa=b+104|0,Ua=oa+va-O-X,Va=ga+Wa-R-ua,pb=(M[0]=Ua,t[0]),nb=(M[0]=Va,t[0])|0;l[Xa>>2]=0|pb;l[Xa+4>>2]=nb;var La=Xa|0,qb=b+108|0,bb=Fh(Ua*Ua+Va*Va);q[j+22]=bb;l[j+41]=0<bb-q[j+21]?2:0;if(.004999999888241291<bb){var Fa=1/bb,Ma=Ua*Fa;q[La>>2]=Ma;var wa=Va*Fa;q[qb>>2]=wa;var hb=X*wa-ua*Ma,Ya=va*wa-Wa*Ma,Za=E+H*hb*hb+G+F*Ya*Ya;q[j+40]=0!=Za?1/Za:0;if(0==(c[d+20|0]&1)<<24>>24){q[j+23]=0;var Da=ta,Oa=ea,ib=Q,ab=$,Ga=ia,jb=ya}else{var Ea=b+92|0,Pa=q[Ea>>2]*q[d+8>>2];q[Ea>>2]=Pa;var Ja=Ma*Pa,db=wa*Pa,Da=ta+F*(va*db-Wa*Ja),Oa=ea-H*(X*db-ua*Ja),ib=Q-Ja*E,ab=$-db*E,Ga=ia+Ja*G,jb=ya+db*G}var xa=l[e]+12*m|0,Sa=(M[0]=ib,t[0]),Ka=(M[0]=ab,t[0])|0;l[(xa|0)>>2]=0|Sa;l[(xa+4|0)>>2]=Ka;q[(l[e]+8>>2)+(3*l[n>>2]|0)]=Oa;var tb=l[e]+12*l[f]|0,kb=(M[0]=Ga,t[0]),ub=(M[0]=jb,t[0])|0;l[(tb|0)>>2]=0|kb;l[(tb+4|0)>>2]=ub;q[(l[e]+8>>2)+(3*l[f]|0)]=Da}else{q[La>>2]=0,q[qb>>2]=0,q[j+40]=0,q[j+23]=0}}),0,(function(b,d){var e,f,g=b>>2,h=b+96|0,j=l[h>>2];f=(d+28|0)>>2;var k=l[f],m=k+12*j|0;e=l[m+4>>2];var n=(t[0]=l[m>>2],M[0]),p=(t[0]=e,M[0]),u=q[(k+8>>2)+(3*j|0)];e=(b+100|0)>>2;var r=l[e],m=k+12*r|0,w=l[m+4>>2],m=(t[0]=l[m>>2],M[0]),w=(t[0]=w,M[0]),k=q[(k+8>>2)+(3*r|0)],x=q[g+29],y=q[g+28],r=q[g+31],A=q[g+30],C=q[g+22]-q[g+21],z=q[g+26],D=q[g+27],E=z*(m+r*-k-(n+x*-u))+D*(w+A*k-(p+y*u)),G=b+92|0,H=q[G>>2],C=H+(0>C?E+q[d+4>>2]*C:E)*-q[g+40],C=0<C?0:C;q[G>>2]=C;G=C-H;z*=G;D*=G;G=q[g+36];x=u-q[g+38]*(y*D-x*z);u=q[g+37];g=k+q[g+39]*(A*D-r*z);j=l[f]+12*j|0;n=(M[0]=n-z*G,t[0]);p=(M[0]=p-D*G,t[0])|0;l[(j|0)>>2]=0|n;l[(j+4|0)>>2]=p;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=x;h=l[f]+12*l[e]|0;m=(M[0]=m+z*u,t[0]);w=(M[0]=w+D*u,t[0])|0;l[(h|0)>>2]=0|m;l[(h+4|0)>>2]=w;q[(l[f]+8>>2)+(3*l[e]|0)]=g}),0,(function(b,d){var e,f,g=b>>2,h=b+96|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+100|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),j=q[(j+8>>2)+(3*u|0)],x=mm(p),y=nm(p),A=mm(j),C=nm(j),z=q[g+17]-q[g+32],D=q[g+18]-q[g+33],u=y*z-x*D,y=x*z+y*D,z=q[g+19]-q[g+34],D=q[g+20]-q[g+35],x=C*z-A*D,z=A*z+C*D,D=r+x-n-u,C=w+z-m-y,A=Fh(D*D+C*C);if(1.1920928955078125e-7>A){var A=0,E=C}else{E=1/A,D*=E,E*=C}var C=b+84|0,G=A-q[C>>2],G=.20000000298023224>G?G:.20000000298023224,G=(0>G?0:G)*-q[g+40],D=D*G,E=E*G,G=q[g+36],u=p-q[g+38]*(u*E-y*D),p=q[g+37],g=j+q[g+39]*(x*E-z*D),n=(M[0]=n-D*G,t[0]),m=(M[0]=m-E*G,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=u;h=l[f]+12*l[e]|0;k=(M[0]=r+D*p,t[0]);n=(M[0]=w+E*p,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=g;return.004999999888241291>A-q[C>>2]}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+80>>2],h=q[e+5],j=q[d+84>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+88>>2],h=q[e+5],j=q[d+92>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var f=q[d+108>>2]*e;q[b>>2]=q[d+104>>2]*e;q[b+4>>2]=f}),0,(function(b,d){return q[b+112>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.Ug|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));b=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+20];f=q[d+21];V(N.K|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+22];f=q[d+23];V(N.L|0,(s=a,a+=16,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=f,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=q[d+24];V(N.$a|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+17];V(N.Na|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+18];V(N.Oa|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j,k=b>>2,m=l[k+12];j=m>>2;var n=o[j+2],p=b+116|0;l[p>>2]=n;var u=l[k+13];h=u>>2;var r=l[h+2];g=(b+120|0)>>2;l[g]=r;var w=m+28|0,x=b+140|0,y=l[w>>2],A=l[w+4>>2];l[x>>2]=y;l[x+4>>2]=A;var C=u+28|0,z=b+148|0,D=l[C>>2],E=l[C+4>>2];l[z>>2]=D;l[z+4>>2]=E;var G=q[j+30];q[k+39]=G;var H=q[h+30];q[k+40]=H;var F=q[j+32];q[k+41]=F;var I=q[h+32];q[k+42]=I;var J=l[d+24>>2],L=q[(J+8>>2)+(3*n|0)];f=(d+28|0)>>2;var O=l[f],R=O+12*n|0,T=l[R+4>>2],S=(t[0]=l[R>>2],M[0]),U=(t[0]=T,M[0]),W=q[(O+8>>2)+(3*n|0)],Q=q[(J+8>>2)+(3*r|0)],$=O+12*r|0,ea=l[$+4>>2],sa=(t[0]=l[$>>2],M[0]),Ba=(t[0]=ea,M[0]),oa=q[(O+8>>2)+(3*r|0)],ga=mm(L),qa=nm(L),la=mm(Q),Ca=nm(Q),ia=b+124|0,ya=q[k+20],ta=(t[0]=y,M[0]),Ia=ya-ta,na=q[k+21],Z=(t[0]=A,M[0]),ba=na-Z,ca=qa*Ia-ga*ba,ma=ga*Ia+qa*ba,ka=(M[0]=ca,t[0]),aa=(M[0]=ma,t[0])|0;l[ia>>2]=0|ka;l[ia+4>>2]=aa;var ra=b+132|0,ha=q[k+22],za=(t[0]=D,M[0]),X=ha-za,ua=q[k+23],da=(t[0]=E,M[0]),fa=ua-da,Aa=Ca*X-la*fa,Qa=la*X+Ca*fa,pa=(M[0]=Aa,t[0]),cb=(M[0]=Qa,t[0])|0;l[ra>>2]=0|pa;l[ra+4>>2]=cb;var Ra=G+H,Ta=Ra+ma*ma*F+Qa*Qa*I,$a=-ma,va=ca*$a*F-Qa*Aa*I,Wa=F*$a-Qa*I,fb=Ra+ca*ca*F+Aa*Aa*I,gb=ca*F+Aa*I,Xa=F+I,Ua=q[k+17],Va=b+172|0;if(0<Ua){var pb=Ta*fb-va*va,nb=0!=pb?1/pb:pb;q[Va>>2]=nb*fb;var La=va*-nb;q[k+46]=La;q[k+45]=0;q[k+44]=La;q[k+47]=nb*Ta;e=(b+192|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;var qb=0<Xa?1/Xa:0,bb=Q-L-q[k+24],Fa=6.2831854820251465*Ua,Ma=qb*Fa*Fa,wa=q[d>>2],hb=wa*(2*qb*q[k+18]*Fa+wa*Ma),Ya=b+100|0;q[Ya>>2]=hb;var Za=0!=hb?1/hb:0;q[Ya>>2]=Za;q[k+19]=bb*wa*Ma*Za;var Da=Xa+Za;q[k+51]=0!=Da?1/Da:0}else{var Oa=fb*Xa-gb*gb,ib=gb*Wa-va*Xa,ab=va*gb-fb*Wa,Ga=Ta*Oa+va*ib+Wa*ab,jb=0!=Ga?1/Ga:Ga;q[Va>>2]=jb*Oa;var Ea=jb*ib;q[k+44]=Ea;var Pa=jb*ab;q[k+45]=Pa;q[k+46]=Ea;q[k+47]=jb*(Ta*Xa-Wa*Wa);var Ja=jb*(Wa*va-Ta*gb);q[k+48]=Ja;q[k+49]=Pa;q[k+50]=Ja;q[k+51]=jb*(Ta*fb-va*va);q[k+25]=0;q[k+19]=0}var db=b+104|0;if(0==(c[d+20|0]&1)<<24>>24){q[db>>2]=0;q[k+27]=0;q[k+28]=0;var xa=oa,Sa=W,Ka=S,tb=U,kb=sa,ub=Ba}else{var rb=q[d+8>>2],Bb=db|0,lb=q[Bb>>2]*rb;q[Bb>>2]=lb;var yb=b+108|0,xb=q[yb>>2]*rb;q[yb>>2]=xb;var Ib=b+112|0,wb=q[Ib>>2]*rb;q[Ib>>2]=wb;xa=oa+I*(Aa*xb-Qa*lb+wb);Sa=W-F*(ca*xb-ma*lb+wb);Ka=S-lb*G;tb=U-xb*G;kb=sa+lb*H;ub=Ba+xb*H}var vb=l[f]+12*n|0,zb=(M[0]=Ka,t[0]),Eb=(M[0]=tb,t[0])|0;l[(vb|0)>>2]=0|zb;l[(vb+4|0)>>2]=Eb;q[(l[f]+8>>2)+(3*l[p>>2]|0)]=Sa;var Cb=l[f]+12*l[g]|0,eb=(M[0]=kb,t[0]),sb=(M[0]=ub,t[0])|0;l[(Cb|0)>>2]=0|eb;l[(Cb+4|0)>>2]=sb;q[(l[f]+8>>2)+(3*l[g]|0)]=xa}),0,(function(b,d){var e,f,g=b>>2,h=b+116|0,j=l[h>>2];f=(d+28|0)>>2;var k=l[f],m=k+12*j|0;e=l[m+4>>2];var n=(t[0]=l[m>>2],M[0]),p=(t[0]=e,M[0]),u=q[(k+8>>2)+(3*j|0)];e=(b+120|0)>>2;var r=l[e],m=k+12*r|0,w=l[m+4>>2],m=(t[0]=l[m>>2],M[0]),w=(t[0]=w,M[0]),x=q[(k+8>>2)+(3*r|0)],r=q[g+39],k=q[g+40],y=q[g+41],A=q[g+42];if(0<q[g+17]){var C=b+112|0,z=q[C>>2],D=(x-u+q[g+19]+q[g+25]*z)*-q[g+51];q[C>>2]=z+D;var u=u-y*D,C=x+A*D,z=q[g+34],E=q[g+33],x=q[g+32],D=q[g+31],G=m+z*-C-n-x*-u,H=w+E*C-p-D*u,F=q[g+43]*G+q[g+46]*H,H=q[g+44]*G+q[g+47]*H,G=-F,g=-H,I=b+104|0;q[I>>2]-=F;F=b+108|0;q[F>>2]-=H;A=C+A*(E*g-z*G);y=u-y*(D*g-x*G);u=G}else{var z=q[g+34],E=q[g+33],D=q[g+32],C=q[g+31],H=m+z*-x-n-D*-u,I=w+E*x-p-C*u,J=x-u,G=q[g+43]*H+q[g+46]*I+q[g+49]*J,F=q[g+44]*H+q[g+47]*I+q[g+50]*J,I=q[g+45]*H+q[g+48]*I+q[g+51]*J,H=-G,g=-F,J=b+104|0;q[J>>2]-=G;G=b+108|0;q[G>>2]-=F;F=b+112|0;q[F>>2]-=I;A=x+A*(E*g-z*H-I);y=u-y*(C*g-D*H-I);u=H}j=l[f]+12*j|0;n=(M[0]=n-r*u,t[0]);p=(M[0]=p-r*g,t[0])|0;l[(j|0)>>2]=0|n;l[(j+4|0)>>2]=p;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=y;h=l[f]+12*l[e]|0;m=(M[0]=m+k*u,t[0]);w=(M[0]=w+k*g,t[0])|0;l[(h|0)>>2]=0|m;l[(h+4|0)>>2]=w;q[(l[f]+8>>2)+(3*l[e]|0)]=A}),0,(function(b,d){var e,f,g=b>>2,h=b+116|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+120|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),j=q[(j+8>>2)+(3*u|0)],x=mm(p),y=nm(p),A=mm(j),C=nm(j),z=q[g+39],D=q[g+40],E=q[g+41],u=q[g+42],G=q[g+20]-q[g+35],H=q[g+21]-q[g+36],F=y*G-x*H,y=x*G+y*H,G=q[g+22]-q[g+37],H=q[g+23]-q[g+38],x=C*G-A*H,A=A*G+C*H,H=z+D,C=H+y*y*E+A*A*u,I=-y,G=F*I*E-A*x*u,J=E*I-A*u,L=H+F*F*E+x*x*u,O=F*E+x*u,R=E+u,H=r+x-n-F,I=w+A-m-y;if(0<q[g+17]){g=Fh(H*H+I*I),J=C*L-G*G,O=0!=J?1/J:J,J=-(O*(L*H-G*I)),G=-(O*(C*I-G*H)),C=0,F=F*G-y*J,x=x*G-A*J,y=J}else{var T=j-p-q[g+24],g=Fh(H*H+I*I),S=L*R-O*O,U=O*J-G*R,W=G*O-L*J,Q=C*S+G*U+J*W,Q=0!=Q?1/Q:Q,$=H*O,L=Q*(C*(L*T-O*I)+G*($-G*T)+J*(G*I-L*H)),S=-(Q*(H*S+I*U+T*W)),G=-(Q*(C*(I*R-T*O)+G*(T*J-H*R)+J*($-I*J))),C=0<T?T:-T,F=F*G-y*S-L,x=x*G-A*S-L,y=S}A=G;n=(M[0]=n-z*y,t[0]);m=(M[0]=m-z*A,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=p-E*F;h=l[f]+12*l[e]|0;k=(M[0]=r+D*y,t[0]);n=(M[0]=w+D*A,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=j+u*x;return.004999999888241291<g?0:.03490658849477768>=C}),0,(function(b,d){var e;e=l[d+48>>2]>>2;var f=q[e+6],g=q[d+76>>2],h=q[e+5],j=q[d+80>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d){var e;e=l[d+52>>2]>>2;var f=q[e+6],g=q[d+84>>2],h=q[e+5],j=q[d+88>>2],k=h*g+f*j+q[e+4];q[b>>2]=f*g-h*j+q[e+3];q[b+4>>2]=k}),0,(function(b,d,e){var d=d>>2,f=q[d+27],g=q[d+29],h=(q[d+46]*f+q[d+44]*g)*e;q[b>>2]=(q[d+45]*f+q[d+43]*g)*e;q[b+4>>2]=h}),0,(function(b,d){return q[b+112>>2]*d}),0,(function(b){var d=b>>2,e=a,f=l[l[d+12]+8>>2],g=l[l[d+13]+8>>2];V(N.Wg|0,(s=a,a+=1,a=a+3>>2<<2,l[s>>2]=0,s));V(N.A|0,(s=a,a+=4,l[s>>2]=f,s));V(N.B|0,(s=a,a+=4,l[s>>2]=g,s));f=c[b+61|0]&1;V(N.C|0,(s=a,a+=4,l[s>>2]=f,s));f=q[d+19];g=q[d+20];V(N.K|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+21];g=q[d+22];V(N.L|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));f=q[d+23];g=q[d+24];V(N.Wb|0,(s=a,a+=16,Ee[0]=f,l[s>>2]=t[0],l[s+4>>2]=t[1],Ee[0]=g,l[s+8>>2]=t[0],l[s+12>>2]=t[1],s));b=c[b+128|0]&1;V(N.ab|0,(s=a,a+=4,l[s>>2]=b,s));b=q[d+31];V(N.bb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+30];V(N.Zb|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+17];V(N.Na|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));b=q[d+18];V(N.Oa|0,(s=a,a+=8,Ee[0]=b,l[s>>2]=t[0],l[s+4>>2]=t[1],s));d=l[d+14];V(N.z|0,(s=a,a+=4,l[s>>2]=d,s));a=e}),0,Hb(),0,(function(b){Ls(b)}),0,(function(b,d){var e,f,g,h,j,k,m=b>>2,n=l[m+12];k=n>>2;var p=l[k+2],u=b+132|0;l[u>>2]=p;var r=l[m+13];j=r>>2;var w=l[j+2];h=(b+136|0)>>2;l[h]=w;var x=n+28|0,y=b+140|0,A=l[x>>2],C=l[x+4>>2];l[y>>2]=A;l[y+4>>2]=C;var z=r+28|0,D=b+148|0,E=l[z>>2],G=l[z+4>>2];l[D>>2]=E;l[D+4>>2]=G;var H=q[k+30];q[m+39]=H;var F=q[j+30];q[m+40]=F;var I=q[k+32];q[m+41]=I;var J=q[j+32];q[m+42]=J;var L=l[d+24>>2],O=L+12*p|0,R=l[O+4>>2],T=(t[0]=l[O>>2],M[0]),S=(t[0]=R,M[0]),U=q[(L+8>>2)+(3*p|0)];g=(d+28|0)>>2;var W=l[g],Q=W+12*p|0,$=l[Q+4>>2],ea=(t[0]=l[Q>>2],M[0]),sa=(t[0]=$,M[0]),Ba=q[(W+8>>2)+(3*p|0)],oa=L+12*w|0,ga=l[oa+4>>2],qa=(t[0]=l[oa>>2],M[0]),la=(t[0]=ga,M[0]),Ca=q[(L+8>>2)+(3*w|0)],ia=W+12*w|0,ya=l[ia+4>>2],ta=(t[0]=l[ia>>2],M[0]),Ia=(t[0]=ya,M[0]),na=q[(W+8>>2)+(3*w|0)],Z=mm(U),ba=nm(U),ca=mm(Ca),ma=nm(Ca),ka=q[m+19],aa=(t[0]=A,M[0]),ra=ka-aa,ha=q[m+20],za=(t[0]=C,M[0]),X=ha-za,ua=ba*ra-Z*X,da=Z*ra+ba*X,fa=q[m+21],Aa=(t[0]=E,M[0]),Qa=fa-Aa,pa=q[m+22],cb=(t[0]=G,M[0]),Ra=pa-cb,Ta=ma*Qa-ca*Ra,$a=ca*Qa+ma*Ra,va=qa+Ta-T-ua,Wa=la+$a-S-da,fb=q[m+25],gb=q[m+26],Xa=ba*fb-Z*gb,Ua=Z*fb+ba*gb,Va=b+180|0,pb=(M[0]=Xa,t[0]),nb=(M[0]=Ua,t[0])|0;l[Va>>2]=0|pb;l[Va+4>>2]=nb;var La=va+ua,qb=Wa+da,bb=La*Ua-qb*Xa;q[m+49]=bb;var Fa=Ta*Ua-$a*Xa;q[m+50]=Fa;var Ma=H+F,wa=Ma+I*bb*bb+J*Fa*Fa;q[m+51]=0<wa?1/wa:wa;f=(b+212|0)>>2;q[f]=0;var hb=b+216|0;q[hb>>2]=0;var Ya=b+220|0;q[Ya>>2]=0;var Za=q[m+17];if(0<Za){var Da=q[m+23],Oa=q[m+24],ib=ba*Da-Z*Oa,ab=Z*Da+ba*Oa,Ga=b+172|0,jb=(M[0]=ib,t[0]),Ea=(M[0]=ab,t[0])|0;l[Ga>>2]=0|jb;l[Ga+4>>2]=Ea;var Pa=La*ab-qb*ib;q[m+47]=Pa;var Ja=Ta*ab-$a*ib;q[m+48]=Ja;var db=Ma+I*Pa*Pa+J*Ja*Ja;if(0<db){var xa=1/db;q[f]=xa;var Sa=va*ib+Wa*ab,Ka=6.2831854820251465*Za,tb=xa*Ka*Ka,kb=q[d>>2],ub=kb*(2*xa*q[m+18]*Ka+kb*tb),rb=0<ub?1/ub:ub;q[Ya>>2]=rb;q[hb>>2]=Sa*kb*tb*rb;var Bb=db+rb;q[f]=Bb;0<Bb&&(q[f]=1/Bb)}}else{q[m+29]=0}if(0==(c[b+128|0]&1)<<24>>24){q[m+52]=0,q[m+28]=0}else{var lb=I+J,yb=b+208|0;q[yb>>2]=lb;0<lb&&(q[yb>>2]=1/lb)}if(0==(c[d+20|0]&1)<<24>>24){q[m+27]=0;q[m+29]=0;q[m+28]=0;var xb=na,Ib=Ba,wb=ea,vb=sa,zb=ta,Eb=Ia}else{e=(d+8|0)>>2;var Cb=b+108|0,eb=q[Cb>>2]*q[e];q[Cb>>2]=eb;var sb=b+116|0,ob=q[sb>>2]*q[e];q[sb>>2]=ob;var Db=b+112|0,Jb=q[Db>>2]*q[e];q[Db>>2]=Jb;var Rb=Xa*eb+q[m+43]*ob,Nb=Ua*eb+q[m+44]*ob,xb=na+J*(eb*Fa+ob*q[m+48]+Jb),Ib=Ba-I*(eb*bb+ob*q[m+47]+Jb),wb=ea-Rb*H,vb=sa-Nb*H,zb=ta+Rb*F,Eb=Ia+Nb*F}var Ob=l[g]+12*p|0,Lb=(M[0]=wb,t[0]),Pb=(M[0]=vb,t[0])|0;l[(Ob|0)>>2]=0|Lb;l[(Ob+4|0)>>2]=Pb;q[(l[g]+8>>2)+(3*l[u>>2]|0)]=Ib;var Mb=l[g]+12*l[h]|0,Yb=(M[0]=zb,t[0]),Zb=(M[0]=Eb,t[0])|0;l[(Mb|0)>>2]=0|Yb;l[(Mb+4|0)>>2]=Zb;q[(l[g]+8>>2)+(3*l[h]|0)]=xb}),0,(function(b,d){var e,f,g=b>>2,h=q[g+39],j=q[g+40],k=q[g+41],m=q[g+42],n=b+132|0,p=l[n>>2];f=(d+28|0)>>2;var u=l[f],r=u+12*p|0;e=l[r+4>>2];var r=(t[0]=l[r>>2],M[0]),w=(t[0]=e,M[0]),x=q[(u+8>>2)+(3*p|0)];e=(b+136|0)>>2;var y=l[e],A=u+12*y|0,C=l[A+4>>2],A=(t[0]=l[A>>2],M[0]),C=(t[0]=C,M[0]),y=q[(u+8>>2)+(3*y|0)],z=q[g+43],D=q[g+44],E=q[g+48],u=q[g+47],G=b+116|0,H=q[G>>2],F=(z*(A-r)+D*(C-w)+E*y-u*x+q[g+54]+q[g+55]*H)*-q[g+53];q[G>>2]=H+F;z*=F;D*=F;r-=z*h;w-=D*h;u=x-k*F*u;x=A+z*j;A=C+D*j;C=y+m*F*E;y=b+112|0;E=q[y>>2];z=q[d>>2]*q[g+30];D=E+(C-u-q[g+31])*-q[g+52];F=-z;z=D<z?D:z;F=z<F?F:z;q[y>>2]=F;E=F-E;y=u-k*E;C+=m*E;F=q[g+45];z=q[g+46];u=q[g+50];E=q[g+49];g=(F*(x-r)+z*(A-w)+u*C-E*y)*-q[g+51];D=b+108|0;q[D>>2]+=g;F*=g;z*=g;p=l[f]+12*p|0;r=(M[0]=r-F*h,t[0]);h=(M[0]=w-z*h,t[0])|0;l[(p|0)>>2]=0|r;l[(p+4|0)>>2]=h;q[(l[f]+8>>2)+(3*l[n>>2]|0)]=y-k*g*E;k=l[f]+12*l[e]|0;n=(M[0]=x+F*j,t[0]);j=(M[0]=A+z*j,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=j;q[(l[f]+8>>2)+(3*l[e]|0)]=C+m*g*u}),0,(function(b,d){var e,f,g=b>>2,h=b+132|0;e=l[h>>2];f=(d+24|0)>>2;var j=l[f],k=j+12*e|0,m=l[k+4>>2],n=(t[0]=l[k>>2],M[0]),m=(t[0]=m,M[0]),p=q[(j+8>>2)+(3*e|0)];e=(b+136|0)>>2;var u=l[e],r=j+12*u|0,w=l[r+4>>2],r=(t[0]=l[r>>2],M[0]),w=(t[0]=w,M[0]),j=q[(j+8>>2)+(3*u|0)],x=mm(p),y=nm(p),A=mm(j),C=nm(j),u=q[g+19]-q[g+35],z=q[g+20]-q[g+36],D=y*u-x*z,z=x*u+y*z,E=q[g+21]-q[g+37],G=q[g+22]-q[g+38],u=C*E-A*G,A=A*E+C*G,E=r-n+u-D,G=w-m+A-z,H=q[g+25],F=q[g+26],C=y*H-x*F,x=x*H+y*F,y=E*C+G*x,I=q[g+39],F=q[g+40],J=q[g+41],L=q[g+49],H=q[g+42],g=q[g+50],g=I+F+J*L*L+H*g*g,g=0!=g?-y/g:0,O=C*g,L=x*g,n=(M[0]=n-O*I,t[0]),m=(M[0]=m-L*I,t[0])|0;l[(k|0)>>2]=0|n;l[(k+4|0)>>2]=m;q[(l[f]+8>>2)+(3*l[h>>2]|0)]=p-J*g*((E+D)*x-(G+z)*C);h=l[f]+12*l[e]|0;k=(M[0]=r+O*F,t[0]);n=(M[0]=w+L*F,t[0])|0;l[(h|0)>>2]=0|k;l[(h+4|0)>>2]=n;q[(l[f]+8>>2)+(3*l[e]|0)]=j+H*g*(u*x-A*C);return.004999999888241291>=(0<y?y:-y)}),0,iq,0,jq,0,kq,0,pq,0,(function(b,d,e){sp(b,d,e)}),0,lq,0,mq,0,(function(b){pp(b)}),0,nq,0,Xq,0,oq,0,Ks,0,Yq,0,(function(b){return b|0}),0,(function(b,d){fp(b,d)}),0,Ms,0,Zq,0,$q,0,ar,0,Ns,0,br,0,Os,0,cr,0,dr,0,er,0,fr,0,js,0,ks,0,ls,0,Ps,0,ms,0,ns,0,Qs,0,os,0,Rs,0,Ss,0,(function(b){xo(b)}),0,(function(b,d){mp(b,d)}),0,(function(b){return b+32|0}),0,ps,0,qs,0,rs,0,ss,0,Ts,0,Us,0,Vs,0,ts,0,Ws,0,us,0,Xs,0,Ys,0,Zs,0,(function(b,d,e){return gh(b,d,e)}),0,$s,0,at,0,bt,0,vs,0,ws,0,xs,0,(function(b){return b+102996|0}),0,ct,0,ys,0,(function(b){return b+102872|0}),0,zs,0,(function(b){aq(b)}),0,As,0,Bs,0,Cs,0,Ds,0,Es,0,Fs,0,dt,0,Gs,0,Hs,0,(function(b,d){Cp(b,d)}),0,et,0,Is,0,(function(b,d,e,f){Pp(b,d,e,f)}),0,Js,0,ft,0,gt,0,(function(b,d){Bp(b,d)}),0,ht,0,(function(b,d){return Dp(b,d)}),0,it,0,ku,0,jt,0,kt,0,lt,0,lu,0,(function(b){bq(b)}),0,mt,0,mu,0,nt,0,ot,0,pt,0,qu,0,qt,0,Ov,0,rt,0,st,0,(function(b){return b+12|0}),0,Mw,0,(function(b){return b+12|0}),0,Nw,0,Ow,0,Kb(1),0,Uw,0,Vw,0,Ww,0,Kb(0),0,tt,0,(function(b){return b+12|0}),0,ut,0,Yw,0,vt,0,Zw,0,$w,0,ax,0,bx,0,wt,0,cx,0,xt,0,yt,0,zt,0,At,0,dx,0,ex,0,Bt,0,au,0,bu,0,cu,0,hx,0,ix,0,lx,0,du,0,ox,0,px,0,qx,0,rx,0,sx,0,tx,0,eu,0,fu,0,(function(b){km(b)}),0,ux,0,(function(b,d,e,f){return Pk(b,d,e,f)}),0,(function(b){jm(b)}),0,(function(b,d){Nk(b,d)}),0,vx,0,Hb(),0,wx,0,Kb(0),0,xx,0,yx,0,Ax,0,Bx,0,Cx,0,Dx,0,Ex,0,gu,0,Fx,0,hu,0,iu,0,ju,0,wy,0,xy,0,Gx,0,(function(b,d,e){om(b,d,e)}),0,yy,0,Ay,0,By,0,Cy,0,Dy,0,Hx,0,Ey,0,Ix,0,Jx,0,Kx,0,Fy,0,Gy,0,Hy,0,Iy,0,(function(b,d){return qn(b,d)}),0,FB,0,hF,0,(function(b,d,e){Xm(b,d,e)}),0,iF,0,Lx,0,Mx,0,jF,0,Nx,0,kF,0,Ox,0,(function(b,d,e,f,g){Wm(b,d,e,f,g)}),0,Px,0,lF,0,Qx,0,Rx,0,mF,0,nF,0,Sx,0,oF,0,Tx,0,(function(b){return b+12|0}),0,qF,0,Ux,0,rF,0,Vx,0,Wx,0,sF,0,Xx,0,tF,0,uF,0,vF,0,wF,0,xF,0,Yx,0,Zx,0,zF,0,$x,0,AF,0,ay,0,by,0,cy,0,dy,0,ey,0,fy,0,gy,0,hy,0,BF,0,iy,0,(function(b){return b+64|0}),0,jy,0,ky,0,CF,0,ly,0,DF,0,my,0,EF,0,FF,0,GF,0,HF,0,ny,0,oy,0,py,0,qy,0,(function(b,d){kp(b,d)}),0,ry,0,sy,0,ty,0,uy,0,vy,0,IF,0,LF,0,MF,0,tG,0,NF,0,OF,0,(function(b,d,e){ip(b,d,e)}),0,PF,0,QF,0,RF,0,wG,0,(function(b){vo(b)}),0,SF,0,TF,0,UF,0,(function(b,d){uo(b,d)}),0,(function(b,d){return yo(b,d)}),0,zG,0,(function(b,d){hp(b,d)}),0,(function(b){return b+12|0}),0,(function(b){return b+44|0}),0,VF,0,WF,0,XF,0,(function(b){return b+28|0}),0,AG,0,DG,0,YF,0,GG,0,JG,0,ZF,0,$F,0,aG,0,KG,0,bG,0,(function(b){lp(b)}),0,cG,0,dG,0,eG,0,(function(b,d){dp(b,d)}),0,fG,0,gG,0,NG,0,hG,0,(function(b){return b+12|0}),0,iG,0,OG,0,PG,0,QG,0,(function(b,d){so(b,d)}),0,RG,0,SG,0,jG,0,kG,0,lG,0,mG,0,nG,0,TG,0,oG,0,pG,0,UG,0,qG,0,rG,0,VG,0,(function(b){return b+20|0}),0,sG,0,(function(b){return b+28|0}),0,WG,0,XG,0,YG,0,ZG,0,$G,0,aH,0,bH,0,cH,0,dH,0,qI,0,eH,0,fH,0,gH,0,hH,0,iH,0,jH,0,kH,0,lH,0,(function(b){return b+4|0}),0,rI,0,mH,0,nH,0,oH,0,pH,0,qH,0,rH,0,sH,0,tH,0,(function(b){return b+16|0}),0,uH,0,vH,0,wH,0,xH,0,sI,0,yH,0,tI,0,uI,0,zH,0,AH,0,BH,0,CH,0,DH,0,vI,0,EH,0,FH,0,GH,0,yI,0,zI,0,HH,0,AI,0,DI,0,IH,0,JH,0,KH,0,LH,0,MH,0,EI,0,FI,0,NH,0,GI,0,OH,0,(function(b,d,e){Hi(b,d,e)}),0,JI,0,PH,0,KI,0,QH,0,RH,0,SH,0,TH,0,LI,0,UH,0,VH,0,WH,0,MI,0,XH,0,YH,0,ZH,0,$H,0,aI,0,NI,0,bI,0,cI,0,dI,0,eI,0,(function(b){return b+22|0}),0,fI,0,gI,0,hI,0,OI,0,iI,0,jI,0,kI,0,lI,0,mI,0,nI,0,oI,0,(function(b){return b+36|0}),0,pI,0,PI,0,QI,0,RI,0,SI,0,TI,0,UI,0,(function(b){return b+20|0}),0,(function(b){return b+28|0}),0,dK,0,VI,0,WI,0,XI,0,YI,0,ZI,0,eK,0,fK,0,gK,0,iK,0,lK,0,$I,0,aJ,0,oK,0,pK,0,bJ,0,cJ,0,dJ,0,(function(b){return b+36|0}),0,eJ,0,fJ,0,gJ,0,hJ,0,qK,0,(function(b){return b+20|0}),0,iJ,0,(function(b){return b+28|0}),0,jJ,0,kJ,0,lJ,0,mJ,0,nJ,0,rK,0,oJ,0,pJ,0,qJ,0,rJ,0,sJ,0,tJ,0,uJ,0,vJ,0,wJ,0,xJ,0,yJ,0,zJ,0,AJ,0,(function(b){return b+20|0}),0,BJ,0,(function(b){return b+28|0}),0,CJ,0,DJ,0,sK,0,tK,0,EJ,0,FJ,0,GJ,0,HJ,0,uK,0,IJ,0,JJ,0,KJ,0,LJ,0,(function(b){return b+36|0}),0,MJ,0,(function(b){return b+44|0}),0,(function(b){return b+28|0}),0,NJ,0,vK,0,OJ,0,(function(b,d,e,f,g,h,j,k){fq(b,d,e,f,g,h,j,k)}),0,PJ,0,QJ,0,(function(b){return b+20|0}),0,RJ,0,SJ,0,TJ,0,UJ,0,wK,0,VJ,0,WJ,0,XJ,0,YJ,0,ZJ,0,xK,0,$J,0,yK,0,zK,0,aK,0,bK,0,(function(b){return b|0}),0,(function(b){return b+8|0}),0,AK,0,BK,0,cK,0,uL,0,CK,0,DK,0,EK,0,vL,0,wL,0,FK,0,xL,0,GK,0,HK,0,IK,0,JK,0,(function(b){return b+20|0}),0,KK,0,(function(b){return b+28|0}),0,LK,0,MK,0,NK,0,yL,0,zL,0,OK,0,PK,0,AL,0,QK,0,RK,0,SK,0,(function(b){return b+20|0}),0,TK,0,UK,0,VK,0,WK,0,XK,0,YK,0,ZK,0,BL,0,(function(b){return b+20|0}),0,(function(b){return b+28|0}),0,$K,0,CL,0,aL,0,bL,0,DL,0,EL,0,cL,0,dL,0,eL,0,fL,0,gL,0,FL,0,hL,0,GL,0,iL,0,jL,0,kL,0,lL,0,mL,0,nL,0,oL,0,HL,0,pL,0,qL,0,IL,0,rL,0,sL,0,(function(b){return b+20|0}),0,(function(b){return b+28|0}),0,JL,0,tL,0,(function(b){Ha(b|0)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d,e){var f,g,h=a;a+=112;g=h>>2;var j=h+56;f=j>>2;var k=(b|0)==(d|0);do{if(k){var m=1}else{if(0==(d|0)){m=0}else{var n=d,p=l[d>>2],m=n+l[p-8>>2]|0,p=l[p-4>>2];l[g]=lN;l[g+1]=n;l[g+2]=kN;l[g+3]=-1;for(var n=h+16|0,u=h+20|0,r=h+24|0,w=h+28|0,x=h+32|0,y=h+40|0,A=(p|0)==(lN|0),C=n,z=C>>2,D=z+9;z<D;z++){l[z]=0}i[C+36>>1]=0;c[C+38]=0;if(A){l[g+12]=1,K[l[l[lN>>2]+12>>2]](lN,h,m,m,1),m=1==(l[r>>2]|0)?m:0}else{if(z=h+36|0,K[l[l[p>>2]+16>>2]](p,h,m,1),m=l[z>>2],0==(m|0)){if(1!=(l[y>>2]|0)){m=0;break}if(1!=(l[w>>2]|0)){m=0;break}m=1==(l[x>>2]|0)?l[u>>2]:0}else{if(1==(m|0)){if(1!=(l[r>>2]|0)){if(0!=(l[y>>2]|0)){m=0;break}if(1!=(l[w>>2]|0)){m=0;break}if(1!=(l[x>>2]|0)){m=0;break}}m=l[n>>2]}else{m=0;break}}}p=m;if(0==(m|0)){m=0}else{z=j>>2;for(D=z+14;z<D;z++){l[z]=0}l[f]=p;l[f+2]=b;l[f+3]=-1;l[f+12]=1;K[l[l[m>>2]+20>>2]](p,j,l[e>>2],1);1!=(l[f+6]|0)?m=0:(l[e>>2]=l[f+4],m=1)}}}}while(0);a=h;return m}),0,(function(b,d,e,f,g){var h=d>>2;(l[h+2]|0)==(b|0)&&(c[d+53|0]=1,(l[h+1]|0)==(f|0)&&(c[d+52|0]=1,b=d+16|0,f=l[b>>2],0==(f|0)?(l[b>>2]=e,l[h+6]=g,l[h+9]=1,1==(l[h+12]|0)&1==(g|0)&&(c[d+54|0]=1)):(f|0)==(e|0)?(e=d+24|0,b=l[e>>2],2==(b|0)?l[e>>2]=g:g=b,1==(l[h+12]|0)&1==(g|0)&&(c[d+54|0]=1)):(h=d+36|0,l[h>>2]=l[h>>2]+1|0,c[d+54|0]=1)))}),0,(function(b,d,e,f){var g=d>>2,h=(l[g+2]|0)==(b|0);a:do{if(h){if((l[g+1]|0)==(e|0)){var j=d+28|0;1!=(l[j>>2]|0)&&(l[j>>2]=f)}}else{if((l[g]|0)==(b|0)){j=(l[g+4]|0)==(e|0);do{if(!j){var k=d+20|0;if((l[k>>2]|0)!=(e|0)){l[g+8]=f;l[k>>2]=e;b=d+40|0;l[b>>2]=l[b>>2]+1|0;1==(l[g+9]|0)&&2==(l[g+6]|0)&&(c[d+54|0]=1);l[g+11]=4;break a}}}while(0);1==(f|0)&&(l[g+8]=1)}}}while(0)}),0,(function(b,d,e,f){if((l[d+8>>2]|0)==(b|0)){var b=d+16|0,g=l[b>>2];0==(g|0)?(l[b>>2]=e,l[d+24>>2]=f,l[d+36>>2]=1):(g|0)==(e|0)?(d=d+24|0,2==(l[d>>2]|0)&&(l[d>>2]=f)):(f=d+36|0,l[f>>2]=l[f>>2]+1|0,l[d+24>>2]=2,c[d+54|0]=1)}}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d){return(b|0)==(d|0)?1:(d|0)==(mN|0)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d){return(b|0)==(d|0)}),0,(function(b){Ha(b|0);Ls(b)}),0,Kb(0),0,(function(b){Ha(b|0);Ls(b)}),0,Kb(0),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d){return(b|0)==(d|0)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d,e,f,g){var h=d>>2;(b|0)==(l[h+2]|0)?(c[d+53|0]=1,(l[h+1]|0)==(f|0)&&(c[d+52|0]=1,f=d+16|0,b=l[f>>2],0==(b|0)?(l[f>>2]=e,l[h+6]=g,l[h+9]=1,1==(l[h+12]|0)&1==(g|0)&&(c[d+54|0]=1)):(b|0)==(e|0)?(e=d+24|0,f=l[e>>2],2==(f|0)?l[e>>2]=g:g=f,1==(l[h+12]|0)&1==(g|0)&&(c[d+54|0]=1)):(g=d+36|0,l[g>>2]=l[g>>2]+1|0,c[d+54|0]=1))):(h=l[b+8>>2],K[l[l[h>>2]+12>>2]](h,d,e,f,g))}),0,(function(b,d,e,f){var g=d>>2,h=b|0,j=(h|0)==(l[g+2]|0);a:do{if(j){if((l[g+1]|0)==(e|0)){var k=d+28|0;1!=(l[k>>2]|0)&&(l[k>>2]=f)}}else{if((h|0)==(l[g]|0)){var m=(l[g+4]|0)==(e|0);do{if(!m&&(k=d+20|0,(l[k>>2]|0)!=(e|0))){l[g+8]=f;f=(d+44|0)>>2;if(4==(l[f]|0)){break a}h=d+52|0;c[h]=0;j=d+53|0;c[j]=0;b=l[b+8>>2];K[l[l[b>>2]+12>>2]](b,d,e,e,1);if(0==(c[j]&1)<<24>>24){var n=0,b=14}else{0==(c[h]&1)<<24>>24?(n=1,b=14):b=18}b:do{if(14==b){l[k>>2]=e;b=d+40|0;l[b>>2]=l[b>>2]+1|0;h=1==(l[g+9]|0);do{if(h){if(2!=(l[g+6]|0)){b=17}else{c[d+54|0]=1;if(n){break b}b=19}}else{b=17}}while(0);if(!(17==b&&n)){l[f]=4;break a}}}while(0);l[f]=3;break a}}while(0);1==(f|0)&&(l[g+8]=1)}else{k=l[b+8>>2],K[l[l[k>>2]+16>>2]](k,d,e,f)}}}while(0)}),0,(function(b,d,e,f){if((b|0)==(l[d+8>>2]|0)){var b=d+16|0,g=l[b>>2];0==(g|0)?(l[b>>2]=e,l[d+24>>2]=f,l[d+36>>2]=1):(g|0)==(e|0)?(d=d+24|0,2==(l[d>>2]|0)&&(l[d>>2]=f)):(f=d+36|0,l[f>>2]=l[f>>2]+1|0,l[d+24>>2]=2,c[d+54|0]=1)}else{b=l[b+8>>2],K[l[l[b>>2]+20>>2]](b,d,e,f)}}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d,e,f,g){var h=d>>2,j=(b|0)==(l[h+2]|0);do{if(j){if(c[d+53|0]=1,(l[h+1]|0)==(f|0)){c[d+52|0]=1;var k=d+16|0,m=l[k>>2];0==(m|0)?(l[k>>2]=e,l[h+6]=g,l[h+9]=1,1==(l[h+12]|0)&1==(g|0)&&(c[d+54|0]=1)):(m|0)==(e|0)?(k=d+24|0,m=l[k>>2],k=2==(m|0)?l[k>>2]=g:m,1==(l[h+12]|0)&1==(k|0)&&(c[d+54|0]=1)):(k=d+36|0,l[k>>2]=l[k>>2]+1|0,c[d+54|0]=1)}}else{var k=d+52|0,m=c[k]&1,n=d+53|0,p=c[n]&1,u=l[b+12>>2],r=(u<<3)+b+16|0;c[k]=0;c[n]=0;var w=l[b+20>>2],x=w>>8,y=l[b+16>>2];K[l[l[y>>2]+12>>2]](y,d,e,f+(0==(w&1|0)?x:l[l[f>>2]+x>>2])|0,0!=(w&2|0)?g:2);u=1<(u|0);a:do{if(u){for(var w=b+8|0,x=d+24|0,y=d+54|0,A=f,C=b+24|0;;){if(0!=(c[y]&1)<<24>>24){break a}var z=0==(c[k]&1)<<24>>24;do{if(z){if(0!=(c[n]&1)<<24>>24&&0==(l[w>>2]&1|0)){break a}}else{if(1==(l[x>>2]|0)){break a}if(0==(l[w>>2]&2|0)){break a}}}while(0);c[k]=0;c[n]=0;var z=l[C+4>>2],D=z>>8,E=l[C>>2];K[l[l[E>>2]+12>>2]](E,d,e,f+(0==(z&1|0)?D:l[l[A>>2]+D>>2])|0,0!=(z&2|0)?g:2);C=C+8|0;if(C>>>0>=r>>>0){break a}}}}while(0);c[k]=m;c[n]=p}}while(0)}),0,(function(b,d,e,f){var g,h=d>>2,j=b>>2,k=b|0,m=(k|0)==(l[h+2]|0);a:do{if(m){if((l[h+1]|0)==(e|0)){var n=d+28|0;1!=(l[n>>2]|0)&&(l[n>>2]=f)}}else{if((k|0)==(l[h]|0)){var p=(l[h+4]|0)==(e|0);do{if(!p&&(n=d+20|0,(l[n>>2]|0)!=(e|0))){l[h+8]=f;f=(d+44|0)>>2;if(4==(l[f]|0)){break a}m=(l[j+3]<<3)+b+16|0;p=d+52|0;g=d+53|0;var j=d+54|0,u=b+8|0,k=d+24|0,r=e,b=b+16|0,w=0,x=0;b:for(;;){var y=b>>>0<m>>>0;do{if(y){c[p]=0;c[g]=0;var A=o[b+4>>2],y=A>>8,C=o[b>>2];K[l[l[C>>2]+12>>2]](C,d,e,e+(0==(A&1|0)?y:l[l[r>>2]+y>>2])|0,2-(A>>>1&1)|0);if(0!=(c[j]&1)<<24>>24){A=x;break}if(0!=(c[g]&1)<<24>>24){if(0==(c[p]&1)<<24>>24){if(0==(l[u>>2]&1|0)){A=1;break}}else{if(1==(l[k>>2]|0)){break b}if(0==(l[u>>2]&2|0)){break b}w=1}x=1}b=b+8|0;continue b}A=x}while(0);0==(w&1)<<24>>24&&(l[n>>2]=e,d=d+40|0,l[d>>2]=l[d>>2]+1|0,1==(l[h+9]|0)&&2==(l[k>>2]|0)&&(c[j]=1));if(0!=(A&1)<<24>>24){break}l[f]=4;break a}l[f]=3;break a}}while(0);1==(f|0)&&(l[h+8]=1)}else{if(g=l[j+3],n=(g<<3)+b+16|0,p=l[j+5],u=p>>8,r=l[j+4],K[l[l[r>>2]+16>>2]](r,d,e+(0==(p&1|0)?u:l[l[e>>2]+u>>2])|0,0!=(p&2|0)?f:2),p=b+24|0,1<(g|0)){u=o[j+2];r=0==(u&2|0);do{if(r&&(g=(d+36|0)>>2,1!=(l[g]|0))){if(0==(u&1|0)){w=d+54|0;x=e;for(A=p;;){if(0!=(c[w]&1)<<24>>24){break a}if(1==(l[g]|0)){break a}var y=o[A+4>>2],C=y>>8,z=l[A>>2];K[l[l[z>>2]+16>>2]](z,d,e+(0==(y&1|0)?C:l[l[x>>2]+C>>2])|0,0!=(y&2|0)?f:2);A=A+8|0;if(A>>>0>=n>>>0){break a}}}else{w=d+24|0;x=d+54|0;A=e;for(y=p;;){if(0!=(c[x]&1)<<24>>24){break a}if(1==(l[g]|0)&&1==(l[w>>2]|0)){break a}var C=l[y+4>>2],z=C>>8,D=l[y>>2];K[l[l[D>>2]+16>>2]](D,d,e+(0==(C&1|0)?z:l[l[A>>2]+z>>2])|0,0!=(C&2|0)?f:2);y=y+8|0;if(y>>>0>=n>>>0){break a}}}}}while(0);g=d+54|0;for(u=e;;){if(0!=(c[g]&1)<<24>>24){break a}r=l[p+4>>2];w=r>>8;x=l[p>>2];K[l[l[x>>2]+16>>2]](x,d,e+(0==(r&1|0)?w:l[l[u>>2]+w>>2])|0,0!=(r&2|0)?f:2);p=p+8|0;if(p>>>0>=n>>>0){break a}}}}}}while(0)}),0,(function(b,d,e,f){var g=(b|0)==(l[d+8>>2]|0);a:do{if(g){var h=d+16|0,j=l[h>>2];0==(j|0)?(l[h>>2]=e,l[d+24>>2]=f,l[d+36>>2]=1):(j|0)==(e|0)?(h=d+24|0,2==(l[h>>2]|0)&&(l[h>>2]=f)):(h=d+36|0,l[h>>2]=l[h>>2]+1|0,l[d+24>>2]=2,c[d+54|0]=1)}else{var j=l[b+12>>2],h=(j<<3)+b+16|0,k=l[b+20>>2],m=k>>8,n=l[b+16>>2];K[l[l[n>>2]+20>>2]](n,d,e+(0==(k&1|0)?m:l[l[e>>2]+m>>2])|0,0!=(k&2|0)?f:2);if(1<(j|0)){j=d+54|0;k=e;for(m=b+24|0;;){var n=l[m+4>>2],p=n>>8,u=l[m>>2];K[l[l[u>>2]+20>>2]](u,d,e+(0==(n&1|0)?p:l[l[k>>2]+p>>2])|0,0!=(n&2|0)?f:2);if(0!=(c[j]&1)<<24>>24){break a}m=m+8|0;if(m>>>0>=h>>>0){break a}}}}}while(0)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b,d,e){var f,g,h,j,k=a;a+=224;j=k>>2;var m=k+56;h=m>>2;var n=k+112;g=n>>2;var p=k+168;f=p>>2;l[e>>2]=l[l[e>>2]>>2];var u=(b|0)==(d|0)|(d|0)==(mN|0);do{if(u){var r=1}else{if(0==(d|0)){r=0}else{var r=d,w=l[d>>2],x=r+l[w-8>>2]|0,y=l[w-4>>2];l[g]=oN;l[g+1]=r;l[g+2]=kN;l[g+3]=-1;for(var A=n+16|0,C=n+20|0,z=n+24|0,D=n+28|0,E=n+32|0,G=n+40|0,H=(y|0)==(oN|0),F=A,r=F>>2,w=r+9;r<w;r++){l[r]=0}i[F+36>>1]=0;c[F+38]=0;if(H){l[g+12]=1,K[l[l[oN>>2]+12>>2]](oN,n,x,x,1),r=1==(l[z>>2]|0)?x:0}else{if(r=n+36|0,K[l[l[y>>2]+16>>2]](y,n,x,1),r=l[r>>2],0==(r|0)){if(1!=(l[G>>2]|0)){r=0;break}if(1!=(l[D>>2]|0)){r=0;break}r=1==(l[E>>2]|0)?l[C>>2]:0}else{if(1==(r|0)){if(1!=(l[z>>2]|0)){if(0!=(l[G>>2]|0)){r=0;break}if(1!=(l[D>>2]|0)){r=0;break}if(1!=(l[E>>2]|0)){r=0;break}}r=l[A>>2]}else{r=0;break}}}if(0==(r|0)){r=0}else{if(0!=(l[r+8>>2]&(l[b+8>>2]^-1)|0)){r=0}else{if(w=l[b+12>>2],y=r+12|0,(w|0)==(l[y>>2]|0)|(w|0)==(tN|0)){r=1}else{if(0==(w|0)){r=0}else{r=w;w=l[w>>2];x=r+l[w-8>>2]|0;A=l[w-4>>2];l[h]=lN;l[h+1]=r;l[h+2]=kN;l[h+3]=-1;for(var C=m+16|0,z=m+20|0,D=m+24|0,E=m+28|0,G=m+32|0,H=m+40|0,F=(A|0)==(lN|0),I=C,r=I>>2,w=r+9;r<w;r++){l[r]=0}i[I+36>>1]=0;c[I+38]=0;if(F){l[h+12]=1,K[l[l[lN>>2]+12>>2]](lN,m,x,x,1),r=1==(l[D>>2]|0)?x:0}else{if(r=m+36|0,K[l[l[A>>2]+16>>2]](A,m,x,1),r=l[r>>2],0==(r|0)){if(1!=(l[H>>2]|0)){r=0;break}if(1!=(l[E>>2]|0)){r=0;break}r=1==(l[G>>2]|0)?l[z>>2]:0}else{if(1==(r|0)){if(1!=(l[D>>2]|0)){if(0!=(l[H>>2]|0)){r=0;break}if(1!=(l[E>>2]|0)){r=0;break}if(1!=(l[G>>2]|0)){r=0;break}}r=l[C>>2]}else{r=0;break}}}x=r;if(0==(r|0)){r=0}else{if(w=l[y>>2],0==(w|0)){r=0}else{r=w;w=l[w>>2];y=r+l[w-8>>2]|0;A=l[w-4>>2];l[j]=lN;l[j+1]=r;l[j+2]=kN;l[j+3]=-1;C=k+16|0;z=k+20|0;D=k+24|0;E=k+28|0;G=k+32|0;H=k+40|0;F=(A|0)==(lN|0);I=C;r=I>>2;for(w=r+9;r<w;r++){l[r]=0}i[I+36>>1]=0;c[I+38]=0;if(F){l[j+12]=1,K[l[l[lN>>2]+12>>2]](lN,k,y,y,1),y=1==(l[D>>2]|0)?y:0}else{if(r=k+36|0,K[l[l[A>>2]+16>>2]](A,k,y,1),r=l[r>>2],0==(r|0)){if(1!=(l[H>>2]|0)){r=0;break}if(1!=(l[E>>2]|0)){r=0;break}y=1==(l[G>>2]|0)?l[z>>2]:0}else{if(1==(r|0)){if(1!=(l[D>>2]|0)){if(0!=(l[H>>2]|0)){r=0;break}if(1!=(l[E>>2]|0)){r=0;break}if(1!=(l[G>>2]|0)){r=0;break}}y=l[C>>2]}else{r=0;break}}}A=y;if(0==(y|0)){r=0}else{r=p>>2;for(w=r+14;r<w;r++){l[r]=0}l[f]=A;l[f+2]=x;l[f+3]=-1;l[f+12]=1;K[l[l[y>>2]+20>>2]](A,p,l[e>>2],1);1!=(l[f+6]|0)?r=0:(l[e>>2]=l[f+4],r=1)}}}}}}}}}}while(0);a=k;return r}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(){return N.Qg|0}),0,(function(b){Ha(b|0);Ls(b)}),0,(function(){return N.uf|0}),0,Fg,0,(function(b){Dh(l[b+32>>2]);Dh(l[b+44>>2]);Dh(l[b+4>>2])}),0,(function(b){var d,e=b>>2;l[e]=-1;d=(b+12|0)>>2;l[d]=16;l[e+2]=0;var f=Ne(576),b=(b+4|0)>>2;l[b]=f;Oe(f,36*l[d]|0);var f=l[d]-1|0,g=0<(f|0);a:do{if(g){for(var h=0;;){var j=h+1|0;l[(l[b]+36*h+20|0)>>2]=j;l[(l[b]+36*h+32|0)>>2]=-1;h=l[d]-1|0;if((j|0)>=(h|0)){var k=h;break a}h=j}}else{k=f}}while(0);l[(l[b]+36*k+20|0)>>2]=-1;l[(l[b]+36*(l[d]-1)+32|0)>>2]=-1;l[e+4]=0;l[e+5]=0;l[e+6]=0}),0,(function(b){Dh(l[b+4>>2])}),0,(function(b){var d=b+8|0;l[d>>2]=128;l[b+4>>2]=0;var e=Ne(1024);l[b>>2]=e;Oe(e,l[d>>2]<<3);b=(b+12|0)>>2;for(d=b+14;b<d;b++){l[b]=0}if(0==(c[xp]&1)<<24>>24){d=0;for(b=1;!(14>(d|0)||P(N.e|0,73,N.Ga|0,N.Ta|0),(b|0)>(l[sn+(d<<2)>>2]|0)&&(d=d+1|0),c[rn+b|0]=d&255,b=b+1|0,641==(b|0));){}c[xp]=1}}),0,(function(b){var d=b+4|0,e=0<(l[d>>2]|0),b=b|0,f=l[b>>2];a:do{if(e){for(var g=0,h=f;;){if(Dh(l[h+(g<<3)+4>>2]),g=g+1|0,h=l[b>>2],(g|0)>=(l[d>>2]|0)){var j=h;break a}}}else{j=f}}while(0);Dh(j)}),0,(function(b){l[b+102400>>2]=0;l[b+102404>>2]=0;l[b+102408>>2]=0;l[b+102796>>2]=0}),0,(function(b){0!=(l[b+102400>>2]|0)&&P(N.n|0,32,N.Q|0,N.Ua|0);0!=(l[b+102796>>2]|0)&&P(N.n|0,33,N.Q|0,N.Xa|0)}),0,Hb(),0,to,0,Hb(),0,(function(b){var d=b>>2;Fg(b|0);l[d+15]=0;l[d+16]=0;l[d+17]=yp;l[d+18]=zp;l[d+19]=0}),0,(function(b){i[b+32>>1]=1;i[b+34>>1]=-1;i[b+36>>1]=0;l[b+40>>2]=0;l[b+24>>2]=0;l[b+28>>2]=0;b>>=2;l[b]=0;l[b+1]=0;l[b+2]=0;l[b+3]=0}),0,vp,0,(function(b){var d=b>>2,b=(b|0)>>2;so(l[b],l[d+5]);so(l[b],l[d+6]);so(l[b],l[d+4]);so(l[b],l[d+3]);so(l[b],l[d+2])}),0,wp,0,Ap,0,(function(b,d,e,f,g){var h=b>>2,j=b|0;l[j>>2]=RM+8|0;l[h+1]=4;l[h+12]=d;var k=b+52|0;l[k>>2]=f;l[h+14]=e;l[h+15]=g;l[h+31]=0;l[h+32]=0;b=(b+8|0)>>2;for(e=b+10;b<e;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[f+16>>2]);q[h+34]=b;b=q[d+20>>2];e=q[f+20>>2];q[h+35]=b>e?b:e;l[j>>2]=KM+8|0;3==(l[l[d+12>>2]+4>>2]|0)?d=f:(P(N.ta|0,43,N.ia|0,N.qa|0),d=l[k>>2]);0!=(l[l[d+12>>2]+4>>2]|0)&&P(N.ta|0,44,N.ia|0,N.I|0)}),0,(function(b,d,e,f,g){var h=b>>2,j=b|0;l[j>>2]=RM+8|0;l[h+1]=4;l[h+12]=d;var k=b+52|0;l[k>>2]=f;l[h+14]=e;l[h+15]=g;l[h+31]=0;l[h+32]=0;b=(b+8|0)>>2;for(e=b+10;b<e;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[f+16>>2]);q[h+34]=b;b=q[d+20>>2];e=q[f+20>>2];q[h+35]=b>e?b:e;l[j>>2]=NM+8|0;3==(l[l[d+12>>2]+4>>2]|0)?d=f:(P(N.ua|0,43,N.ka|0,N.qa|0),d=l[k>>2]);2!=(l[l[d+12>>2]+4>>2]|0)&&P(N.ua|0,44,N.ka|0,N.T|0)}),0,(function(b,d,e){var f=b>>2,g=b|0;l[g>>2]=RM+8|0;l[f+1]=4;l[f+12]=d;var h=b+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var b=(b+8|0)>>2,j=b+10;b<j;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[e+16>>2]);q[f+34]=b;b=q[d+20>>2];j=q[e+20>>2];q[f+35]=b>j?b:j;l[g>>2]=PM+8|0;0==(l[l[d+12>>2]+4>>2]|0)?d=e:(P(N.va|0,44,N.fa|0,N.Cb|0),d=l[h>>2]);0!=(l[l[d+12>>2]+4>>2]|0)&&P(N.va|0,45,N.fa|0,N.I|0)}),0,Qp,0,(function(b){var d=b+32|0;so(l[d>>2],l[b+40>>2]);so(l[d>>2],l[b+36>>2])}),0,(function(b,d,e){var f=b>>2,g=b|0;l[g>>2]=RM+8|0;l[f+1]=4;l[f+12]=d;var h=b+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var b=(b+8|0)>>2,j=b+10;b<j;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[e+16>>2]);q[f+34]=b;b=q[d+20>>2];j=q[e+20>>2];q[f+35]=b>j?b:j;l[g>>2]=SM+8|0;1==(l[l[d+12>>2]+4>>2]|0)?d=e:(P(N.wa|0,41,N.ha|0,N.ra|0),d=l[h>>2]);0!=(l[l[d+12>>2]+4>>2]|0)&&P(N.wa|0,42,N.ha|0,N.I|0)}),0,(function(b,d,e){var f=b>>2,g=b|0;l[g>>2]=RM+8|0;l[f+1]=4;l[f+12]=d;var h=b+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var b=(b+8|0)>>2,j=b+10;b<j;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[e+16>>2]);q[f+34]=b;b=q[d+20>>2];j=q[e+20>>2];q[f+35]=b>j?b:j;l[g>>2]=UM+8|0;1==(l[l[d+12>>2]+4>>2]|0)?d=e:(P(N.xa|0,41,N.ja|0,N.ra|0),d=l[h>>2]);2!=(l[l[d+12>>2]+4>>2]|0)&&P(N.xa|0,42,N.ja|0,N.T|0)}),0,(function(b,d,e){var f=b>>2,g=b|0;l[g>>2]=RM+8|0;l[f+1]=4;l[f+12]=d;var h=b+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var b=(b+8|0)>>2,j=b+10;b<j;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[e+16>>2]);q[f+34]=b;b=q[d+20>>2];j=q[e+20>>2];q[f+35]=b>j?b:j;l[g>>2]=WM+8|0;2==(l[l[d+12>>2]+4>>2]|0)?d=e:(P(N.ya|0,41,N.la|0,N.sa|0),d=l[h>>2]);0!=(l[l[d+12>>2]+4>>2]|0)&&P(N.ya|0,42,N.la|0,N.I|0)}),0,(function(b,d,e){var f=b>>2,g=b|0;l[g>>2]=RM+8|0;l[f+1]=4;l[f+12]=d;var h=b+52|0;l[h>>2]=e;l[f+14]=0;l[f+15]=0;l[f+31]=0;l[f+32]=0;for(var b=(b+8|0)>>2,j=b+10;b<j;b++){l[b]=0}b=Fh(q[(d+16|0)>>2]*q[e+16>>2]);q[f+34]=b;b=q[d+20>>2];j=q[e+20>>2];q[f+35]=b>j?b:j;l[g>>2]=YM+8|0;2==(l[l[d+12>>2]+4>>2]|0)?d=e:(P(N.za|0,44,N.ga|0,N.sa|0),d=l[h>>2]);2!=(l[l[d+12>>2]+4>>2]|0)&&P(N.za|0,45,N.ga|0,N.T|0)}),0,(function(b,d){var e,f=d>>2,g=b>>2,h=b|0;l[h>>2]=Ep+8|0;e=d+8|0;var j=d+12|0;(l[e>>2]|0)==(l[j>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[g+1]=l[f];l[g+2]=0;l[g+3]=0;l[g+12]=l[e>>2];l[g+13]=l[j>>2];l[g+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[g+16]=l[f+1];e=(b+16|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0;l[h>>2]=Fp+8|0;h=b+88|0;e=d+20|0;var j=b+80|0,k=l[e+4>>2];l[j>>2]=l[e>>2];l[j+4>>2]=k;e=d+28|0;j=l[e+4>>2];l[h>>2]=l[e>>2];l[h+4>>2]=j;q[g+26]=q[f+9];q[g+17]=q[f+10];q[g+18]=q[f+11];q[g+25]=0;q[g+24]=0;q[g+19]=0}),0,(function(b,d){var e,f=b>>2,g=b|0;l[g>>2]=Ep+8|0;e=d+8|0;var h=d+12|0;(l[e>>2]|0)==(l[h>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[f+1]=l[d>>2];l[f+2]=0;l[f+3]=0;l[f+12]=l[e>>2];l[f+13]=l[h>>2];l[f+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[f+16]=l[d+4>>2];e=(b+16|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0;l[g>>2]=Np+8|0;g=b+76|0;e=d+20|0;var h=b+68|0,j=l[e+4>>2];l[h>>2]=l[e>>2];l[h+4>>2]=j;e=d+28|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;q[f+21]=0;q[f+22]=0;q[f+23]=0;q[f+24]=q[d+36>>2];q[f+25]=q[d+40>>2]}),0,Kp,0,Gp,0,Hp,0,Jp,0,(function(b,d){var e,f,g=d>>2,h=b>>2;e=b|0;l[e>>2]=Ep+8|0;f=d+8|0;var j=d+12|0;(l[f>>2]|0)==(l[j>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[h+1]=l[g];l[h+2]=0;l[h+3]=0;l[h+12]=l[f>>2];l[h+13]=l[j>>2];l[h+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[h+16]=l[g+1];f=(b+16|0)>>2;l[f]=0;l[f+1]=0;l[f+2]=0;l[f+3]=0;l[f+4]=0;l[f+5]=0;l[f+6]=0;l[f+7]=0;l[e>>2]=Ip+8|0;e=b+76|0;f=d+20|0;var j=b+68|0,k=l[f+4>>2];l[j>>2]=l[f>>2];l[j+4>>2]=k;f=d+28|0;j=l[f+4>>2];l[e>>2]=l[f>>2];l[e+4>>2]=j;q[h+29]=q[g+9];e=(b+84|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;q[h+30]=q[(d+44|0)>>2];q[h+31]=q[g+12];q[h+26]=q[g+15];q[h+27]=q[g+14];c[b+112|0]=c[d+40|0]&1;c[b+100|0]=c[d+52|0]&1;l[h+56]=0}),0,(function(b,d){var e,f=b>>2,g=b|0;l[g>>2]=Ep+8|0;e=d+8|0;var h=d+12|0;(l[e>>2]|0)==(l[h>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[f+1]=l[d>>2];l[f+2]=0;l[f+3]=0;l[f+12]=l[e>>2];l[f+13]=l[h>>2];l[f+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[f+16]=l[d+4>>2];e=(b+16|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0;l[g>>2]=Op+8|0;g=b+76|0;e=d+20|0;var h=b+68|0,j=l[e+4>>2];l[h>>2]=l[e>>2];l[h+4>>2]=j;e=d+28|0;h=l[e+4>>2];l[g>>2]=l[e>>2];l[g+4>>2]=h;q[f+21]=q[d+36>>2];q[f+40]=0;q[f+23]=0;l[f+41]=0;q[f+22]=0}),0,(function(b,d){var e,f=d>>2,g=b>>2,h=b|0;l[h>>2]=Ep+8|0;e=d+8|0;var j=d+12|0;(l[e>>2]|0)==(l[j>>2]|0)&&P(N.m|0,173,N.p|0,N.r|0);l[g+1]=l[f];l[g+2]=0;l[g+3]=0;l[g+12]=l[e>>2];l[g+13]=l[j>>2];l[g+14]=0;c[b+61|0]=c[d+16|0]&1;c[b+60|0]=0;l[g+16]=l[f+1];e=(b+16|0)>>2;l[e]=0;l[e+1]=0;l[e+2]=0;l[e+3]=0;l[e+4]=0;l[e+5]=0;l[e+6]=0;l[e+7]=0;l[h>>2]=Mp+8|0;h=b+88|0;e=d+20|0;var j=b+80|0,k=l[e+4>>2];l[j>>2]=l[e>>2];l[j+4>>2]=k;e=d+28|0;j=l[e+4>>2];l[h>>2]=l[e>>2];l[h+4>>2]=j;q[g+24]=q[f+9];q[g+17]=q[f+10];q[g+18]=q[f+11];q[g+26]=0;q[g+27]=0;q[g+28]=0}),0,Lp,0,(function(b){for(var d=b>>2,e=d+9;d<e;d++){l[d]=0}q[(b+40|0)>>2]=1;q[b+44>>2]=.10000000149011612}),0,(function(b){b>>=2;Dh(l[b+1]);Dh(l[b+2]);Dh(l[b+3]);Dh(l[b+4]);Dh(l[b+5]);Dh(l[b+6])}),0,(function(b){l[b>>2]=QL+8|0}),0,(function(b){l[b>>2]=LO+8|0}),0];Module.FUNCTION_TABLE=K;function Eg(b){function d(){var d=0;lg=Na;Module._main&&(uf(wf),d=Module.Kh(b),Module.noExitRuntime||uf(Mf));if(Module.postRun){for("function"==typeof Module.postRun&&(Module.postRun=[Module.postRun]);0<Module.postRun.length;){Module.postRun.pop()()}}return d}b=b||Module.arguments;if(Module.preRun){for("function"==typeof Module.preRun&&(Module.preRun=[Module.preRun]);0<Module.preRun.length;){if(Module.preRun.pop()(),0<Qf){return 0}}}return Module.setStatus?(Module.setStatus("Running..."),setTimeout((function(){setTimeout((function(){Module.setStatus("")}),1);d()}),1),0):d()}Module.run=Eg;if(Module.preInit){for("function"==typeof Module.preInit&&(Module.preInit=[Module.preInit]);0<Module.preInit.length;){Module.preInit.pop()()}}uf(vf);Module.noInitialRun&&mg();0==Qf&&Eg();var NO={};function OO(b,d){var e=d?d.prototype.b:NO,f=e[b];if(f){return f}d=d||Object;f=Object.create(d.prototype);f.a=b;f.d=d;return e[b]=f}Module.wrapPointer=OO;Module.castObject=(function(b,d){return OO(b.a,d)});Module.NULL=OO(0);Module.destroy=(function(b){b.__destroy__||ja("Error: Cannot destroy object. (Did you create it yourself?)");b.__destroy__();b.d!==Object?delete b.d.prototype.b[b.a]:delete NO[b.a]});Module.compare=(function(b,d){return b.a===d.a});Module.getPointer=(function(b){return b.a});Module.getClass=(function(b){return b.d});Module.customizeVTable=(function(b,d){for(var e=Fe(b.a,"void*"),f=0;Fe(e+nc*f,"void*");){f++}var g=Ne(f*nc);xe(b.a,g,"void*");for(var h,j=K.length,k=0;k<f;k++){var m=K.length;((function(b){K.push((function(){h=b}))}))(k);K.push(0);xe(g+nc*k,m,"void*")}var n=[{a:0}];d.forEach((function(d){for(;;){try{d.original.apply(b,n);break}catch(f){n.push(n[0])}}d.Nh=Fe(e+h*nc,"void*")}));K=K.slice(0,j);var p={};d.forEach((function(b){var d=K.length;K.push(b.replacement);K.push(0);p[b.Nh]=d}));for(k=0;k<f;k++){j=Fe(e+nc*k,"void*"),j in p&&(j=p[j]),xe(g+nc*k,j,"void*")}return b});PO.prototype.get_m_contactFilter=(function(){return OO(iq(this.a),Module.b2ContactFilter)});PO.prototype.get_m_contactCount=(function(){return jq(this.a)});PO.prototype.set_m_contactFilter=(function(b){kq(this.a,b.a)});function PO(){this.a=pq();PO.prototype.b[this.a]=this;this.d=PO}PO.prototype.b={};Module.b2ContactManager=PO;PO.prototype.AddPair=(function(b,d){sp(this.a,b,d)});PO.prototype.set_m_allocator=(function(b){lq(this.a,b.a)});PO.prototype.set_m_contactCount=(function(b){mq(this.a,b)});PO.prototype.Collide=(function(){pp(this.a)});PO.prototype.set_m_contactList=(function(b){nq(this.a,b.a)});PO.prototype.FindNewContacts=(function(){Xq(this.a)});PO.prototype.get_m_contactListener=(function(){return OO(oq(this.a),Module.b2ContactListener)});PO.prototype.__destroy__=(function(){Ks(this.a)});PO.prototype.set_m_contactListener=(function(b){Yq(this.a,b.a)});PO.prototype.get_m_broadPhase=(function(){return OO(this.a|0,Module.b2BroadPhase)});PO.prototype.Destroy=(function(b){fp(this.a,b.a)});PO.prototype.set_m_broadPhase=(function(b){Ms(this.a,b.a)});PO.prototype.get_m_contactList=(function(){return OO(Zq(this.a),Module.b2Contact)});PO.prototype.get_m_allocator=(function(){return OO($q(this.a),Module.b2BlockAllocator)});QO.prototype.GetRestitution=(function(){return ar(this.a)});QO.prototype.SetFilterData=(function(b){Ns(this.a,b.a)});QO.prototype.SetFriction=(function(b){br(this.a,b)});function QO(){this.a=Os();QO.prototype.b[this.a]=this;this.d=QO}QO.prototype.b={};Module.b2Fixture=QO;QO.prototype.GetShape=(function(){return OO(cr(this.a),Module.b2Shape)});QO.prototype.SetRestitution=(function(b){dr(this.a,b)});QO.prototype.GetBody=(function(){return OO(er(this.a),Module.b2Body)});QO.prototype.GetNext=(function(){return OO(fr(this.a),Module.b2Fixture)});QO.prototype.GetFriction=(function(){return js(this.a)});QO.prototype.GetUserData=(function(){return ks(this.a)});QO.prototype.SetDensity=(function(b){ls(this.a,b)});QO.prototype.GetMassData=(function(b){Ps(this.a,b.a)});QO.prototype.SetSensor=(function(b){ms(this.a,b)});QO.prototype.GetAABB=(function(b){return OO(ns(this.a,b),Module.b2AABB)});QO.prototype.TestPoint=(function(b){return Qs(this.a,b.a)});QO.prototype.SetUserData=(function(b){os(this.a,b)});QO.prototype.__destroy__=(function(){Rs(this.a)});QO.prototype.RayCast=(function(b,d,e){return Ss(this.a,b.a,d.a,e)});QO.prototype.Refilter=(function(){xo(this.a)});QO.prototype.Dump=(function(b){mp(this.a,b)});QO.prototype.GetFilterData=(function(){return OO(this.a+32|0,Module.b2Filter)});QO.prototype.IsSensor=(function(){return ps(this.a)});QO.prototype.GetType=(function(){return qs(this.a)});QO.prototype.GetDensity=(function(){return rs(this.a)});RO.prototype.GetTreeQuality=(function(){return ss(this.a)});RO.prototype.GetFatAABB=(function(b){return OO(Ts(this.a,b),Module.b2AABB)});RO.prototype.GetUserData=(function(b){return Us(this.a,b)});RO.prototype.__destroy__=(function(){Vs(this.a)});RO.prototype.GetTreeHeight=(function(){return ts(this.a)});function RO(){this.a=Ws();RO.prototype.b[this.a]=this;this.d=RO}RO.prototype.b={};Module.b2BroadPhase=RO;RO.prototype.GetProxyCount=(function(){return us(this.a)});RO.prototype.GetTreeBalance=(function(){return Xs(this.a)});RO.prototype.TestOverlap=(function(b,d){return Ys(this.a,b,d)});RO.prototype.TouchProxy=(function(b){Zs(this.a,b)});RO.prototype.CreateProxy=(function(b,d){return gh(this.a,b.a,d)});RO.prototype.MoveProxy=(function(b,d,e){$s(this.a,b,d.a,e.a)});RO.prototype.DestroyProxy=(function(b){at(this.a,b)});SO.prototype.QueryAABB=(function(b,d){bt(this.a,b.a,d.a)});SO.prototype.SetSubStepping=(function(b){vs(this.a,b)});SO.prototype.GetTreeQuality=(function(){return ws(this.a)});SO.prototype.GetTreeHeight=(function(){return xs(this.a)});SO.prototype.GetProfile=(function(){return OO(this.a+102996|0,Module.b2Profile)});SO.prototype.GetTreeBalance=(function(){return ct(this.a)});SO.prototype.GetSubStepping=(function(){return ys(this.a)});SO.prototype.GetContactManager=(function(){return OO(this.a+102872|0,Module.b2ContactManager)});SO.prototype.SetContactListener=(function(b){zs(this.a,b.a)});SO.prototype.DrawDebugData=(function(){aq(this.a)});SO.prototype.SetContinuousPhysics=(function(b){As(this.a,b)});SO.prototype.SetGravity=(function(b){Bs(this.a,b.a)});SO.prototype.GetBodyCount=(function(){return Cs(this.a)});SO.prototype.GetAutoClearForces=(function(){return Ds(this.a)});SO.prototype.GetContinuousPhysics=(function(){return Es(this.a)});SO.prototype.GetJointList=(function(){return OO(Fs(this.a),Module.b2Joint)});SO.prototype.CreateBody=(function(b){return OO(dt(this.a,b.a),Module.b2Body)});SO.prototype.GetBodyList=(function(){return OO(Gs(this.a),Module.b2Body)});SO.prototype.SetDestructionListener=(function(b){Hs(this.a,b.a)});SO.prototype.DestroyJoint=(function(b){Cp(this.a,b.a)});function SO(b){this.a=et(b.a);SO.prototype.b[this.a]=this;this.d=SO}SO.prototype.b={};Module.b2World=SO;SO.prototype.GetJointCount=(function(){return Is(this.a)});SO.prototype.Step=(function(b,d,e){Pp(this.a,b,d,e)});SO.prototype.ClearForces=(function(){Js(this.a)});SO.prototype.GetWarmStarting=(function(){return ft(this.a)});SO.prototype.SetAllowSleeping=(function(b){gt(this.a,b)});SO.prototype.DestroyBody=(function(b){Bp(this.a,b.a)});SO.prototype.GetAllowSleeping=(function(){return ht(this.a)});SO.prototype.CreateJoint=(function(b){return OO(Dp(this.a,b.a),Module.b2Joint)});SO.prototype.GetProxyCount=(function(){return it(this.a)});SO.prototype.RayCast=(function(b,d,e){ku(this.a,b.a,d.a,e.a)});SO.prototype.IsLocked=(function(){return jt(this.a)});SO.prototype.GetContactList=(function(){return OO(kt(this.a),Module.b2Contact)});SO.prototype.SetDebugDraw=(function(b){lt(this.a,b.a)});SO.prototype.__destroy__=(function(){lu(this.a)});SO.prototype.Dump=(function(){bq(this.a)});SO.prototype.SetAutoClearForces=(function(b){mt(this.a,b)});SO.prototype.GetGravity=(function(){return OO(mu(this.a),Module.b2Vec2)});SO.prototype.GetContactCount=(function(){return nt(this.a)});SO.prototype.SetWarmStarting=(function(b){ot(this.a,b)});SO.prototype.SetContactFilter=(function(b){pt(this.a,b.a)});TO.prototype.__destroy__=(function(){qu(this.a)});TO.prototype.GetType=(function(){return qt(this.a)});TO.prototype.ComputeMass=(function(b,d){Ov(this.a,b.a,d)});TO.prototype.set_m_radius=(function(b){rt(this.a,b)});TO.prototype.get_m_radius=(function(){return st(this.a)});TO.prototype.GetVertex=(function(){return OO(this.a+12|0,Module.b2Vec2)});TO.prototype.Clone=(function(b){return OO(Mw(this.a,b.a),Module.b2Shape)});TO.prototype.GetSupportVertex=(function(){return OO(this.a+12|0,Module.b2Vec2)});TO.prototype.RayCast=(function(b,d,e,f){return Nw(this.a,b.a,d.a,e.a,f)});TO.prototype.ComputeAABB=(function(b,d,e){Ow(this.a,b.a,d.a,e)});TO.prototype.GetVertexCount=Kb(1);TO.prototype.GetChildCount=(function(){return Uw(this.a)});TO.prototype.TestPoint=(function(b,d){return Vw(this.a,b.a,d.a)});function TO(){this.a=Ww();TO.prototype.b[this.a]=this;this.d=TO}TO.prototype.b={};Module.b2CircleShape=TO;TO.prototype.GetSupport=Kb(0);TO.prototype.set_m_p=(function(b){tt(this.a,b.a)});TO.prototype.get_m_p=(function(){return OO(this.a+12|0,Module.b2Vec2)});function UO(){ja("b2Draw is abstract!")}UO.prototype.b={};Module.b2Draw=UO;UO.prototype.AppendFlags=(function(b){ut(this.a,b)});UO.prototype.DrawTransform=(function(b){Yw(this.a,b.a)});UO.prototype.ClearFlags=(function(b){vt(this.a,b)});UO.prototype.DrawPolygon=(function(b,d,e){Zw(this.a,b.a,d,e.a)});UO.prototype.DrawSolidCircle=(function(b,d,e,f){$w(this.a,b.a,d,e.a,f.a)});UO.prototype.DrawSolidPolygon=(function(b,d,e){ax(this.a,b.a,d,e.a)});UO.prototype.DrawCircle=(function(b,d,e){bx(this.a,b.a,d,e.a)});UO.prototype.SetFlags=(function(b){wt(this.a,b)});UO.prototype.DrawSegment=(function(b,d,e){cx(this.a,b.a,d.a,e.a)});UO.prototype.GetFlags=(function(){return xt(this.a)});function VO(){ja("b2Joint is abstract!")}VO.prototype.b={};Module.b2Joint=VO;VO.prototype.GetNext=(function(){return OO(yt(this.a),Module.b2Joint)});VO.prototype.GetBodyA=(function(){return OO(zt(this.a),Module.b2Body)});VO.prototype.GetBodyB=(function(){return OO(At(this.a),Module.b2Body)});VO.prototype.GetReactionTorque=(function(b){return dx(this.a,b)});VO.prototype.GetAnchorA=(function(){return OO(ex(this.a),Module.b2Vec2)});VO.prototype.GetUserData=(function(){return Bt(this.a)});VO.prototype.GetType=(function(){return au(this.a)});VO.prototype.SetUserData=(function(b){bu(this.a,b)});VO.prototype.GetCollideConnected=(function(){return cu(this.a)});VO.prototype.Dump=(function(){hx(this.a)});VO.prototype.GetAnchorB=(function(){return OO(ix(this.a),Module.b2Vec2)});VO.prototype.GetReactionForce=(function(b){return OO(lx(this.a,b),Module.b2Vec2)});VO.prototype.IsActive=(function(){return du(this.a)});function WO(){ja("b2RayCastCallback is abstract!")}WO.prototype.b={};Module.b2RayCastCallback=WO;WO.prototype.ReportFixture=(function(b,d,e,f){return ox(this.a,b.a,d.a,e.a,f)});XO.prototype.__destroy__=(function(){px(this.a)});function XO(){this.a=qx();XO.prototype.b[this.a]=this;this.d=XO}XO.prototype.b={};Module.b2DynamicTree=XO;XO.prototype.GetFatAABB=(function(b){return OO(rx(this.a,b),Module.b2AABB)});XO.prototype.GetUserData=(function(b){return sx(this.a,b)});XO.prototype.GetMaxBalance=(function(){return tx(this.a)});XO.prototype.GetHeight=(function(){return eu(this.a)});XO.prototype.GetAreaRatio=(function(){return fu(this.a)});XO.prototype.RebuildBottomUp=(function(){km(this.a)});XO.prototype.CreateProxy=(function(b,d){return ux(this.a,b.a,d)});XO.prototype.MoveProxy=(function(b,d,e){return Pk(this.a,b,d.a,e.a)});XO.prototype.Validate=(function(){jm(this.a)});XO.prototype.DestroyProxy=(function(b){Nk(this.a,b)});function YO(){this.a=vx();YO.prototype.b[this.a]=this;this.d=YO}YO.prototype.b={};Module.b2Timer=YO;YO.prototype.Reset=Hb();YO.prototype.__destroy__=(function(){wx(this.a)});YO.prototype.GetMilliseconds=Kb(0);ZO.prototype.__destroy__=(function(){xx(this.a)});function ZO(){this.a=yx();ZO.prototype.b[this.a]=this;this.d=ZO}ZO.prototype.b={};Module.b2ContactListener=ZO;ZO.prototype.EndContact=(function(b){Ax(this.a,b.a)});ZO.prototype.BeginContact=(function(b){Bx(this.a,b.a)});ZO.prototype.PreSolve=(function(b,d){Cx(this.a,b.a,d.a)});ZO.prototype.PostSolve=(function(b,d){Dx(this.a,b.a,d.a)});$O.prototype.__destroy__=(function(){Ex(this.a)});$O.prototype.GetType=(function(){return gu(this.a)});$O.prototype.CreateChain=(function(b,d){Fx(this.a,b.a,d)});$O.prototype.set_m_radius=(function(b){hu(this.a,b)});$O.prototype.get_m_radius=(function(){return iu(this.a)});$O.prototype.get_m_vertices=(function(){return OO(ju(this.a),Module.b2Vec2)});$O.prototype.ComputeMass=(function(b,d){wy(this.a,b.a,d)});$O.prototype.Clone=(function(b){return OO(xy(this.a,b.a),Module.b2Shape)});$O.prototype.get_m_count=(function(){return Gx(this.a)});$O.prototype.GetChildEdge=(function(b,d){om(this.a,b.a,d)});function $O(){this.a=yy();$O.prototype.b[this.a]=this;this.d=$O}$O.prototype.b={};Module.b2ChainShape=$O;$O.prototype.ComputeAABB=(function(b,d,e){Ay(this.a,b.a,d.a,e)});$O.prototype.RayCast=(function(b,d,e,f){return By(this.a,b.a,d.a,e.a,f)});$O.prototype.GetChildCount=(function(){return Cy(this.a)});$O.prototype.TestPoint=(function(b,d){return Dy(this.a,b.a,d.a)});$O.prototype.SetPrevVertex=(function(b){Hx(this.a,b.a)});$O.prototype.CreateLoop=(function(b,d){Ey(this.a,b.a,d)});$O.prototype.set_m_vertices=(function(b){Ix(this.a,b.a)});$O.prototype.SetNextVertex=(function(b){Jx(this.a,b.a)});$O.prototype.set_m_count=(function(b){Kx(this.a,b)});function aP(){ja("b2QueryCallback is abstract!")}aP.prototype.b={};Module.b2QueryCallback=aP;aP.prototype.ReportFixture=(function(b){return Fy(this.a,b.a)});bP.prototype.__destroy__=(function(){Gy(this.a)});bP.prototype.Clear=(function(){Hy(this.a)});bP.prototype.Free=(function(b,d){Iy(this.a,b,d)});bP.prototype.Allocate=(function(b){return qn(this.a,b)});function bP(){this.a=FB();bP.prototype.b[this.a]=this;this.d=bP}bP.prototype.b={};Module.b2BlockAllocator=bP;cP.prototype.__destroy__=(function(){hF(this.a)});cP.prototype.Set=(function(b,d){Xm(this.a,b.a,d)});cP.prototype.ComputeMass=(function(b,d){iF(this.a,b.a,d)});cP.prototype.set_m_radius=(function(b){Lx(this.a,b)});cP.prototype.get_m_radius=(function(){return Mx(this.a)});cP.prototype.Clone=(function(b){return OO(jF(this.a,b.a),Module.b2Shape)});cP.prototype.GetVertex=(function(b){return OO(Nx(this.a,b),Module.b2Vec2)});cP.prototype.RayCast=(function(b,d,e,f){return kF(this.a,b.a,d.a,e.a,f)});cP.prototype.SetAsBox=(function(b,d,e,f){e===Ha?Ox(this.a,b,d):Wm(this.a,b,d,e.a,f)});cP.prototype.set_m_centroid=(function(b){Px(this.a,b.a)});cP.prototype.ComputeAABB=(function(b,d,e){lF(this.a,b.a,d.a,e)});cP.prototype.set_m_vertexCount=(function(b){Qx(this.a,b)});cP.prototype.GetVertexCount=(function(){return Rx(this.a)});cP.prototype.GetChildCount=(function(){return mF(this.a)});cP.prototype.TestPoint=(function(b,d){return nF(this.a,b.a,d.a)});cP.prototype.GetType=(function(){return Sx(this.a)});function cP(){this.a=oF();cP.prototype.b[this.a]=this;this.d=cP}cP.prototype.b={};Module.b2PolygonShape=cP;cP.prototype.get_m_vertexCount=(function(){return Tx(this.a)});cP.prototype.get_m_centroid=(function(){return OO(this.a+12|0,Module.b2Vec2)});dP.prototype.__destroy__=(function(){qF(this.a)});dP.prototype.Set=(function(b,d){Ux(this.a,b.a,d.a)});dP.prototype.ComputeMass=(function(b,d){rF(this.a,b.a,d)});dP.prototype.set_m_radius=(function(b){Vx(this.a,b)});dP.prototype.get_m_radius=(function(){return Wx(this.a)});dP.prototype.Clone=(function(b){return OO(sF(this.a,b.a),Module.b2Shape)});dP.prototype.GetType=(function(){return Xx(this.a)});dP.prototype.RayCast=(function(b,d,e,f){return tF(this.a,b.a,d.a,e.a,f)});dP.prototype.ComputeAABB=(function(b,d,e){uF(this.a,b.a,d.a,e)});dP.prototype.GetChildCount=(function(){return vF(this.a)});dP.prototype.TestPoint=(function(b,d){return wF(this.a,b.a,d.a)});function dP(){this.a=xF();dP.prototype.b[this.a]=this;this.d=dP}dP.prototype.b={};Module.b2EdgeShape=dP;function eP(){ja("b2Contact is abstract!")}eP.prototype.b={};Module.b2Contact=eP;eP.prototype.GetNext=(function(){return OO(Yx(this.a),Module.b2Contact)});eP.prototype.SetEnabled=(function(b){Zx(this.a,b)});eP.prototype.GetWorldManifold=(function(b){zF(this.a,b.a)});eP.prototype.GetRestitution=(function(){return $x(this.a)});eP.prototype.ResetFriction=(function(){AF(this.a)});eP.prototype.GetFriction=(function(){return ay(this.a)});eP.prototype.IsTouching=(function(){return by(this.a)});eP.prototype.IsEnabled=(function(){return cy(this.a)});eP.prototype.GetFixtureB=(function(){return OO(dy(this.a),Module.b2Fixture)});eP.prototype.SetFriction=(function(b){ey(this.a,b)});eP.prototype.GetFixtureA=(function(){return OO(fy(this.a),Module.b2Fixture)});eP.prototype.GetChildIndexA=(function(){return gy(this.a)});eP.prototype.GetChildIndexB=(function(){return hy(this.a)});eP.prototype.Evaluate=(function(b,d,e){BF(this.a,b.a,d.a,e.a)});eP.prototype.SetRestitution=(function(b){iy(this.a,b)});eP.prototype.GetManifold=(function(){return OO(this.a+64|0,Module.b2Manifold)});eP.prototype.ResetRestitution=(function(){jy(this.a)});function fP(){ja("b2Shape is abstract!")}fP.prototype.b={};Module.b2Shape=fP;fP.prototype.get_m_radius=(function(){return ky(this.a)});fP.prototype.ComputeMass=(function(b,d){CF(this.a,b.a,d)});fP.prototype.set_m_radius=(function(b){ly(this.a,b)});fP.prototype.Clone=(function(b){return OO(DF(this.a,b.a),Module.b2Shape)});fP.prototype.GetType=(function(){return my(this.a)});fP.prototype.RayCast=(function(b,d,e,f){return EF(this.a,b.a,d.a,e.a,f)});fP.prototype.ComputeAABB=(function(b,d,e){FF(this.a,b.a,d.a,e)});fP.prototype.GetChildCount=(function(){return GF(this.a)});fP.prototype.TestPoint=(function(b,d){return HF(this.a,b.a,d.a)});function gP(){ja("b2Body is abstract!")}gP.prototype.b={};Module.b2Body=gP;gP.prototype.GetAngle=(function(){return ny(this.a)});gP.prototype.GetUserData=(function(){return oy(this.a)});gP.prototype.IsSleepingAllowed=(function(){return py(this.a)});gP.prototype.SetAngularDamping=(function(b){qy(this.a,b)});gP.prototype.SetActive=(function(b){kp(this.a,b)});gP.prototype.SetGravityScale=(function(b){ry(this.a,b)});gP.prototype.SetUserData=(function(b){sy(this.a,b)});gP.prototype.GetAngularVelocity=(function(){return ty(this.a)});gP.prototype.GetFixtureList=(function(){return OO(uy(this.a),Module.b2Fixture)});gP.prototype.ApplyForce=(function(b,d){vy(this.a,b.a,d.a)});gP.prototype.GetLocalPoint=(function(b){return OO(IF(this.a,b.a),Module.b2Vec2)});gP.prototype.SetLinearVelocity=(function(b){LF(this.a,b.a)});gP.prototype.GetJointList=(function(){return OO(MF(this.a),Module.b2JointEdge)});gP.prototype.GetLinearVelocity=(function(){return OO(tG(this.a),Module.b2Vec2)});gP.prototype.GetNext=(function(){return OO(NF(this.a),Module.b2Body)});gP.prototype.SetSleepingAllowed=(function(b){OF(this.a,b)});gP.prototype.SetTransform=(function(b,d){ip(this.a,b.a,d)});gP.prototype.GetMass=(function(){return PF(this.a)});gP.prototype.SetAngularVelocity=(function(b){QF(this.a,b)});gP.prototype.GetMassData=(function(b){RF(this.a,b.a)});gP.prototype.GetLinearVelocityFromWorldPoint=(function(b){return OO(wG(this.a,b.a),Module.b2Vec2)});gP.prototype.ResetMassData=(function(){vo(this.a)});gP.prototype.ApplyForceToCenter=(function(b){SF(this.a,b.a)});gP.prototype.ApplyTorque=(function(b){TF(this.a,b)});gP.prototype.IsAwake=(function(){return UF(this.a)});gP.prototype.SetType=(function(b){uo(this.a,b)});gP.prototype.CreateFixture=(function(b,d){return d===Ha?OO(yo(this.a,b.a),Module.b2Fixture):OO(zG(this.a,b.a,d),Module.b2Fixture)});gP.prototype.SetMassData=(function(b){hp(this.a,b.a)});gP.prototype.GetTransform=(function(){return OO(this.a+12|0,Module.b2Transform)});gP.prototype.GetWorldCenter=(function(){return OO(this.a+44|0,Module.b2Vec2)});gP.prototype.GetAngularDamping=(function(){return VF(this.a)});gP.prototype.ApplyLinearImpulse=(function(b,d){WF(this.a,b.a,d.a)});gP.prototype.IsFixedRotation=(function(){return XF(this.a)});gP.prototype.GetLocalCenter=(function(){return OO(this.a+28|0,Module.b2Vec2)});gP.prototype.GetWorldVector=(function(b){return OO(AG(this.a,b.a),Module.b2Vec2)});gP.prototype.GetLinearVelocityFromLocalPoint=(function(b){return OO(DG(this.a,b.a),Module.b2Vec2)});gP.prototype.GetContactList=(function(){return OO(YF(this.a),Module.b2ContactEdge)});gP.prototype.GetWorldPoint=(function(b){return OO(GG(this.a,b.a),Module.b2Vec2)});gP.prototype.SetAwake=(function(b){JG(this.a,b)});gP.prototype.GetLinearDamping=(function(){return ZF(this.a)});gP.prototype.IsBullet=(function(){return $F(this.a)});gP.prototype.GetWorld=(function(){return OO(aG(this.a),Module.b2World)});gP.prototype.GetLocalVector=(function(b){return OO(KG(this.a,b.a),Module.b2Vec2)});gP.prototype.SetLinearDamping=(function(b){bG(this.a,b)});gP.prototype.Dump=(function(){lp(this.a)});gP.prototype.SetBullet=(function(b){cG(this.a,b)});gP.prototype.GetType=(function(){return dG(this.a)});gP.prototype.GetGravityScale=(function(){return eG(this.a)});gP.prototype.DestroyFixture=(function(b){dp(this.a,b.a)});gP.prototype.GetInertia=(function(){return fG(this.a)});gP.prototype.IsActive=(function(){return gG(this.a)});gP.prototype.SetFixedRotation=(function(b){NG(this.a,b)});gP.prototype.ApplyAngularImpulse=(function(b){hG(this.a,b)});gP.prototype.GetPosition=(function(){return OO(this.a+12|0,Module.b2Vec2)});hP.prototype.GetMaxAllocation=(function(){return iG(this.a)});hP.prototype.__destroy__=(function(){OG(this.a)});function hP(){this.a=PG();hP.prototype.b[this.a]=this;this.d=hP}hP.prototype.b={};Module.b2StackAllocator=hP;hP.prototype.Allocate=(function(b){return QG(this.a,b)});hP.prototype.Free=(function(b){so(this.a,b)});function iP(){ja("b2DestructionListener is abstract!")}iP.prototype.b={};Module.b2DestructionListener=iP;iP.prototype.SayGoodbye=(function(b){RG(this.a,b.a)});jP.prototype.__destroy__=(function(){SG(this.a)});jP.prototype.set_maskBits=(function(b){jG(this.a,b)});jP.prototype.set_categoryBits=(function(b){kG(this.a,b)});jP.prototype.get_groupIndex=(function(){return lG(this.a)});jP.prototype.set_groupIndex=(function(b){mG(this.a,b)});jP.prototype.get_maskBits=(function(){return nG(this.a)});function jP(){this.a=TG();jP.prototype.b[this.a]=this;this.d=jP}jP.prototype.b={};Module.b2Filter=jP;jP.prototype.get_categoryBits=(function(){return oG(this.a)});kP.prototype.set_localAnchorA=(function(b){pG(this.a,b.a)});kP.prototype.__destroy__=(function(){UG(this.a)});kP.prototype.set_localAnchorB=(function(b){qG(this.a,b.a)});kP.prototype.get_maxForce=(function(){return rG(this.a)});function kP(){this.a=VG();kP.prototype.b[this.a]=this;this.d=kP}kP.prototype.b={};Module.b2FrictionJointDef=kP;kP.prototype.get_localAnchorA=(function(){return OO(this.a+20|0,Module.b2Vec2)});kP.prototype.set_maxForce=(function(b){sG(this.a,b)});kP.prototype.get_localAnchorB=(function(){return OO(this.a+28|0,Module.b2Vec2)});kP.prototype.set_maxTorque=(function(b){WG(this.a,b)});kP.prototype.get_maxTorque=(function(){return XG(this.a)});kP.prototype.Initialize=(function(b,d,e){YG(this.a,b.a,d.a,e.a)});lP.prototype.get_linearDamping=(function(){return ZG(this.a)});lP.prototype.get_awake=(function(){return $G(this.a)});lP.prototype.get_type=(function(){return aH(this.a)});lP.prototype.get_allowSleep=(function(){return bH(this.a)});lP.prototype.set_position=(function(b){cH(this.a,b.a)});lP.prototype.set_linearVelocity=(function(b){dH(this.a,b.a)});function lP(){this.a=qI();lP.prototype.b[this.a]=this;this.d=lP}lP.prototype.b={};Module.b2BodyDef=lP;lP.prototype.get_bullet=(function(){return eH(this.a)});lP.prototype.get_userData=(function(){return fH(this.a)});lP.prototype.set_angularDamping=(function(b){gH(this.a,b)});lP.prototype.set_fixedRotation=(function(b){hH(this.a,b)});lP.prototype.set_allowSleep=(function(b){iH(this.a,b)});lP.prototype.get_gravityScale=(function(){return jH(this.a)});lP.prototype.set_angularVelocity=(function(b){kH(this.a,b)});lP.prototype.set_userData=(function(b){lH(this.a,b)});lP.prototype.get_position=(function(){return OO(this.a+4|0,Module.b2Vec2)});lP.prototype.__destroy__=(function(){rI(this.a)});lP.prototype.set_type=(function(b){mH(this.a,b)});lP.prototype.set_gravityScale=(function(b){nH(this.a,b)});lP.prototype.get_angularDamping=(function(){return oH(this.a)});lP.prototype.set_bullet=(function(b){pH(this.a,b)});lP.prototype.set_active=(function(b){qH(this.a,b)});lP.prototype.set_angle=(function(b){rH(this.a,b)});lP.prototype.get_angle=(function(){return sH(this.a)});lP.prototype.get_angularVelocity=(function(){return tH(this.a)});lP.prototype.get_linearVelocity=(function(){return OO(this.a+16|0,Module.b2Vec2)});lP.prototype.get_active=(function(){return uH(this.a)});lP.prototype.set_linearDamping=(function(b){vH(this.a,b)});lP.prototype.get_fixedRotation=(function(){return wH(this.a)});lP.prototype.set_awake=(function(b){xH(this.a,b)});mP.prototype.Normalize=(function(){return sI(this.a)});mP.prototype.set_x=(function(b){yH(this.a,b)});function mP(b,d){this.a=b===Ha?tI():uI(b,d);mP.prototype.b[this.a]=this;this.d=mP}mP.prototype.b={};Module.b2Vec2=mP;mP.prototype.Set=(function(b,d){zH(this.a,b,d)});mP.prototype.get_x=(function(){return AH(this.a)});mP.prototype.get_y=(function(){return BH(this.a)});mP.prototype.set_y=(function(b){CH(this.a,b)});mP.prototype.IsValid=(function(){return DH(this.a)});mP.prototype.Skew=(function(){return OO(vI(this.a),Module.b2Vec2)});mP.prototype.LengthSquared=(function(){return EH(this.a)});mP.prototype.op_add=(function(b){FH(this.a,b.a)});mP.prototype.SetZero=(function(){GH(this.a)});mP.prototype.Length=(function(){return yI(this.a)});mP.prototype.__destroy__=(function(){zI(this.a)});mP.prototype.op_mul=(function(b){HH(this.a,b)});mP.prototype.op_sub=(function(){return OO(AI(this.a),Module.b2Vec2)});nP.prototype.__destroy__=(function(){DI(this.a)});nP.prototype.set_z=(function(b){IH(this.a,b)});nP.prototype.Set=(function(b,d,e){JH(this.a,b,d,e)});nP.prototype.get_z=(function(){return KH(this.a)});nP.prototype.op_add=(function(b){LH(this.a,b.a)});nP.prototype.SetZero=(function(){MH(this.a)});function nP(b,d,e){this.a=b===Ha?EI():FI(b,d,e);nP.prototype.b[this.a]=this;this.d=nP}nP.prototype.b={};Module.b2Vec3=nP;nP.prototype.op_mul=(function(b){NH(this.a,b)});nP.prototype.op_sub=(function(){return OO(GI(this.a),Module.b2Vec3)});oP.prototype.get_m_radius=(function(){return OH(this.a)});oP.prototype.Set=(function(b,d){Hi(this.a,b.a,d)});function oP(){this.a=JI();oP.prototype.b[this.a]=this;this.d=oP}oP.prototype.b={};Module.b2DistanceProxy=oP;oP.prototype.set_m_radius=(function(b){PH(this.a,b)});oP.prototype.__destroy__=(function(){KI(this.a)});oP.prototype.get_m_vertices=(function(){return QH(this.a)});oP.prototype.GetSupportVertex=(function(b){return OO(RH(this.a,b.a),Module.b2Vec2)});oP.prototype.get_m_count=(function(){return SH(this.a)});oP.prototype.GetVertexCount=(function(){return TH(this.a)});oP.prototype.GetVertex=(function(b){return OO(LI(this.a,b),Module.b2Vec2)});oP.prototype.GetSupport=(function(b){return UH(this.a,b.a)});oP.prototype.set_m_vertices=(function(b){VH(this.a,b.a)});oP.prototype.set_m_count=(function(b){WH(this.a,b)});pP.prototype.__destroy__=(function(){MI(this.a)});pP.prototype.get_isSensor=(function(){return XH(this.a)});pP.prototype.set_userData=(function(b){YH(this.a,b)});pP.prototype.set_shape=(function(b){ZH(this.a,b.a)});pP.prototype.get_density=(function(){return $H(this.a)});pP.prototype.get_shape=(function(){return aI(this.a)});function pP(){this.a=NI();pP.prototype.b[this.a]=this;this.d=pP}pP.prototype.b={};Module.b2FixtureDef=pP;pP.prototype.set_density=(function(b){bI(this.a,b)});pP.prototype.set_restitution=(function(b){cI(this.a,b)});pP.prototype.get_restitution=(function(){return dI(this.a)});pP.prototype.set_isSensor=(function(b){eI(this.a,b)});pP.prototype.get_filter=(function(){return OO(this.a+22|0,Module.b2Filter)});pP.prototype.get_friction=(function(){return fI(this.a)});pP.prototype.set_friction=(function(b){gI(this.a,b)});pP.prototype.get_userData=(function(){return hI(this.a)});pP.prototype.set_filter=(function(b){OI(this.a,b.a)});qP.prototype.set_localAnchorA=(function(b){iI(this.a,b.a)});qP.prototype.set_localAnchorB=(function(b){jI(this.a,b.a)});qP.prototype.get_motorSpeed=(function(){return kI(this.a)});qP.prototype.get_enableMotor=(function(){return lI(this.a)});qP.prototype.get_referenceAngle=(function(){return mI(this.a)});qP.prototype.set_enableLimit=(function(b){nI(this.a,b)});qP.prototype.set_motorSpeed=(function(b){oI(this.a,b)});qP.prototype.get_localAxisA=(function(){return OO(this.a+36|0,Module.b2Vec2)});qP.prototype.set_upperTranslation=(function(b){pI(this.a,b)});function qP(){this.a=PI();qP.prototype.b[this.a]=this;this.d=qP}qP.prototype.b={};Module.b2PrismaticJointDef=qP;qP.prototype.Initialize=(function(b,d,e,f){QI(this.a,b.a,d.a,e.a,f.a)});qP.prototype.set_lowerTranslation=(function(b){RI(this.a,b)});qP.prototype.get_upperTranslation=(function(){return SI(this.a)});qP.prototype.get_enableLimit=(function(){return TI(this.a)});qP.prototype.set_referenceAngle=(function(b){UI(this.a,b)});qP.prototype.get_localAnchorA=(function(){return OO(this.a+20|0,Module.b2Vec2)});qP.prototype.get_localAnchorB=(function(){return OO(this.a+28|0,Module.b2Vec2)});qP.prototype.__destroy__=(function(){dK(this.a)});qP.prototype.get_maxMotorForce=(function(){return VI(this.a)});qP.prototype.set_maxMotorForce=(function(b){WI(this.a,b)});qP.prototype.set_enableMotor=(function(b){XI(this.a,b)});qP.prototype.get_lowerTranslation=(function(){return YI(this.a)});qP.prototype.set_localAxisA=(function(b){ZI(this.a,b.a)});rP.prototype.__destroy__=(function(){eK(this.a)});rP.prototype.Set=(function(b){fK(this.a,b)});rP.prototype.GetAngle=(function(){return gK(this.a)});rP.prototype.GetYAxis=(function(){return OO(iK(this.a),Module.b2Vec2)});rP.prototype.GetXAxis=(function(){return OO(lK(this.a),Module.b2Vec2)});rP.prototype.set_c=(function(b){$I(this.a,b)});rP.prototype.SetIdentity=(function(){aJ(this.a)});function rP(b){this.a=b===Ha?oK():pK(b);rP.prototype.b[this.a]=this;this.d=rP}rP.prototype.b={};Module.b2Rot=rP;rP.prototype.get_c=(function(){return bJ(this.a)});sP.prototype.set_localAnchorA=(function(b){cJ(this.a,b.a)});sP.prototype.set_motorSpeed=(function(b){dJ(this.a,b)});sP.prototype.get_localAxisA=(function(){return OO(this.a+36|0,Module.b2Vec2)});sP.prototype.set_localAnchorB=(function(b){eJ(this.a,b.a)});sP.prototype.get_frequencyHz=(function(){return fJ(this.a)});sP.prototype.set_maxMotorTorque=(function(b){gJ(this.a,b)});sP.prototype.get_enableMotor=(function(){return hJ(this.a)});sP.prototype.__destroy__=(function(){qK(this.a)});sP.prototype.get_localAnchorA=(function(){return OO(this.a+20|0,Module.b2Vec2)});sP.prototype.get_maxMotorTorque=(function(){return iJ(this.a)});sP.prototype.get_localAnchorB=(function(){return OO(this.a+28|0,Module.b2Vec2)});sP.prototype.get_dampingRatio=(function(){return jJ(this.a)});sP.prototype.set_enableMotor=(function(b){kJ(this.a,b)});sP.prototype.set_frequencyHz=(function(b){lJ(this.a,b)});sP.prototype.Initialize=(function(b,d,e,f){mJ(this.a,b.a,d.a,e.a,f.a)});sP.prototype.set_dampingRatio=(function(b){nJ(this.a,b)});function sP(){this.a=rK();sP.prototype.b[this.a]=this;this.d=sP}sP.prototype.b={};Module.b2WheelJointDef=sP;sP.prototype.set_localAxisA=(function(b){oJ(this.a,b.a)});sP.prototype.get_motorSpeed=(function(){return pJ(this.a)});tP.prototype.set_localAnchorA=(function(b){qJ(this.a,b.a)});tP.prototype.get_lowerAngle=(function(){return rJ(this.a)});tP.prototype.set_upperAngle=(function(b){sJ(this.a,b)});tP.prototype.set_localAnchorB=(function(b){tJ(this.a,b.a)});tP.prototype.get_enableLimit=(function(){return uJ(this.a)});tP.prototype.set_lowerAngle=(function(b){vJ(this.a,b)});tP.prototype.get_enableMotor=(function(){return wJ(this.a)});tP.prototype.set_motorSpeed=(function(b){xJ(this.a,b)});tP.prototype.get_upperAngle=(function(){return yJ(this.a)});tP.prototype.set_referenceAngle=(function(b){zJ(this.a,b)});tP.prototype.set_maxMotorTorque=(function(b){AJ(this.a,b)});tP.prototype.get_localAnchorA=(function(){return OO(this.a+20|0,Module.b2Vec2)});tP.prototype.get_referenceAngle=(function(){return BJ(this.a)});tP.prototype.get_localAnchorB=(function(){return OO(this.a+28|0,Module.b2Vec2)});tP.prototype.set_enableLimit=(function(b){CJ(this.a,b)});tP.prototype.set_enableMotor=(function(b){DJ(this.a,b)});tP.prototype.__destroy__=(function(){sK(this.a)});function tP(){this.a=tK();tP.prototype.b[this.a]=this;this.d=tP}tP.prototype.b={};Module.b2RevoluteJointDef=tP;tP.prototype.Initialize=(function(b,d,e){EJ(this.a,b.a,d.a,e.a)});tP.prototype.get_maxMotorTorque=(function(){return FJ(this.a)});tP.prototype.get_motorSpeed=(function(){return GJ(this.a)});uP.prototype.set_localAnchorA=(function(b){HJ(this.a,b.a)});uP.prototype.__destroy__=(function(){uK(this.a)});uP.prototype.set_localAnchorB=(function(b){IJ(this.a,b.a)});uP.prototype.get_ratio=(function(){return JJ(this.a)});uP.prototype.get_lengthB=(function(){return KJ(this.a)});uP.prototype.get_lengthA=(function(){return LJ(this.a)});uP.prototype.get_localAnchorA=(function(){return OO(this.a+36|0,Module.b2Vec2)});uP.prototype.set_ratio=(function(b){MJ(this.a,b)});uP.prototype.get_localAnchorB=(function(){return OO(this.a+44|0,Module.b2Vec2)});uP.prototype.get_groundAnchorB=(function(){return OO(this.a+28|0,Module.b2Vec2)});uP.prototype.set_groundAnchorB=(function(b){NJ(this.a,b.a)});function uP(){this.a=vK();uP.prototype.b[this.a]=this;this.d=uP}uP.prototype.b={};Module.b2PulleyJointDef=uP;uP.prototype.set_groundAnchorA=(function(b){OJ(this.a,b.a)});uP.prototype.Initialize=(function(b,d,e,f,g,h,j){fq(this.a,b.a,d.a,e.a,f.a,g.a,h.a,j)});uP.prototype.set_lengthB=(function(b){PJ(this.a,b)});uP.prototype.set_lengthA=(function(b){QJ(this.a,b)});uP.prototype.get_groundAnchorA=(function(){return OO(this.a+20|0,Module.b2Vec2)});vP.prototype.get_bodyA=(function(){return OO(RJ(this.a),Module.b2Body)});vP.prototype.set_userData=(function(b){SJ(this.a,b)});vP.prototype.set_bodyA=(function(b){TJ(this.a,b.a)});vP.prototype.set_bodyB=(function(b){UJ(this.a,b.a)});vP.prototype.__destroy__=(function(){wK(this.a)});vP.prototype.get_bodyB=(function(){return OO(VJ(this.a),Module.b2Body)});vP.prototype.set_type=(function(b){WJ(this.a,b)});vP.prototype.get_collideConnected=(function(){return XJ(this.a)});vP.prototype.get_type=(function(){return YJ(this.a)});vP.prototype.set_collideConnected=(function(b){ZJ(this.a,b)});function vP(){this.a=xK();vP.prototype.b[this.a]=this;this.d=vP}vP.prototype.b={};Module.b2JointDef=vP;vP.prototype.get_userData=(function(){return $J(this.a)});wP.prototype.__destroy__=(function(){yK(this.a)});wP.prototype.Set=(function(b,d){zK(this.a,b.a,d)});wP.prototype.set_p=(function(b){aK(this.a,b.a)});wP.prototype.set_q=(function(b){bK(this.a,b.a)});wP.prototype.get_p=(function(){return OO(this.a|0,Module.b2Vec2)});wP.prototype.get_q=(function(){return OO(this.a+8|0,Module.b2Rot)});function wP(b,d){this.a=b===Ha?AK():BK(b.a,d.a);wP.prototype.b[this.a]=this;this.d=wP}wP.prototype.b={};Module.b2Transform=wP;wP.prototype.SetIdentity=(function(){cK(this.a)});xP.prototype.__destroy__=(function(){uL(this.a)});xP.prototype.set_b=(function(b){CK(this.a,b)});xP.prototype.Set=(function(b,d,e){DK(this.a,b,d,e)});xP.prototype.get_b=(function(){return EK(this.a)});function xP(b,d,e){this.a=b===Ha?vL():wL(b,d,e);xP.prototype.b[this.a]=this;this.d=xP}xP.prototype.b={};Module.b2Color=xP;kT.prototype.set_localAnchorA=(function(b){FK(this.a,b.a)});kT.prototype.__destroy__=(function(){xL(this.a)});kT.prototype.get_frequencyHz=(function(){return GK(this.a)});kT.prototype.set_localAnchorB=(function(b){HK(this.a,b.a)});kT.prototype.set_dampingRatio=(function(b){IK(this.a,b)});kT.prototype.set_referenceAngle=(function(b){JK(this.a,b)});kT.prototype.get_localAnchorA=(function(){return OO(this.a+20|0,Module.b2Vec2)});kT.prototype.get_referenceAngle=(function(){return KK(this.a)});kT.prototype.get_localAnchorB=(function(){return OO(this.a+28|0,Module.b2Vec2)});kT.prototype.get_dampingRatio=(function(){return LK(this.a)});kT.prototype.set_frequencyHz=(function(b){MK(this.a,b)});kT.prototype.Initialize=(function(b,d,e){NK(this.a,b.a,d.a,e.a)});function kT(){this.a=yL();kT.prototype.b[this.a]=this;this.d=kT}kT.prototype.b={};Module.b2WeldJointDef=kT;lT.prototype.__destroy__=(function(){zL(this.a)});lT.prototype.get_frequencyHz=(function(){return OK(this.a)});lT.prototype.set_dampingRatio=(function(b){PK(this.a,b)});function lT(){this.a=AL();lT.prototype.b[this.a]=this;this.d=lT}lT.prototype.b={};Module.b2MouseJointDef=lT;lT.prototype.get_maxForce=(function(){return QK(this.a)});lT.prototype.set_target=(function(b){RK(this.a,b.a)});lT.prototype.set_maxForce=(function(b){SK(this.a,b)});lT.prototype.get_target=(function(){return OO(this.a+20|0,Module.b2Vec2)});lT.prototype.set_frequencyHz=(function(b){TK(this.a,b)});lT.prototype.get_dampingRatio=(function(){return UK(this.a)});mT.prototype.set_localAnchorA=(function(b){VK(this.a,b.a)});mT.prototype.get_length=(function(){return WK(this.a)});mT.prototype.get_frequencyHz=(function(){return XK(this.a)});mT.prototype.set_localAnchorB=(function(b){YK(this.a,b.a)});mT.prototype.set_dampingRatio=(function(b){ZK(this.a,b)});mT.prototype.__destroy__=(function(){BL(this.a)});mT.prototype.get_localAnchorA=(function(){return OO(this.a+20|0,Module.b2Vec2)});mT.prototype.get_localAnchorB=(function(){return OO(this.a+28|0,Module.b2Vec2)});mT.prototype.get_dampingRatio=(function(){return $K(this.a)});function mT(){this.a=CL();mT.prototype.b[this.a]=this;this.d=mT}mT.prototype.b={};Module.b2DistanceJointDef=mT;mT.prototype.set_length=(function(b){aL(this.a,b)});mT.prototype.set_frequencyHz=(function(b){bL(this.a,b)});mT.prototype.Initialize=(function(b,d,e,f){DL(this.a,b.a,d.a,e.a,f.a)});nT.prototype.__destroy__=(function(){EL(this.a)});nT.prototype.set_joint1=(function(b){cL(this.a,b.a)});nT.prototype.set_joint2=(function(b){dL(this.a,b.a)});nT.prototype.set_ratio=(function(b){eL(this.a,b)});nT.prototype.get_joint1=(function(){return OO(fL(this.a),Module.b2Joint)});nT.prototype.get_joint2=(function(){return OO(gL(this.a),Module.b2Joint)});function nT(){this.a=FL();nT.prototype.b[this.a]=this;this.d=nT}nT.prototype.b={};Module.b2GearJointDef=nT;nT.prototype.get_ratio=(function(){return hL(this.a)});oT.prototype.__destroy__=(function(){GL(this.a)});oT.prototype.set_contact=(function(b){iL(this.a,b.a)});oT.prototype.get_prev=(function(){return OO(jL(this.a),Module.b2ContactEdge)});oT.prototype.get_other=(function(){return OO(kL(this.a),Module.b2Body)});oT.prototype.set_prev=(function(b){lL(this.a,b.a)});oT.prototype.get_next=(function(){return OO(mL(this.a),Module.b2ContactEdge)});oT.prototype.set_other=(function(b){nL(this.a,b.a)});oT.prototype.set_next=(function(b){oL(this.a,b.a)});function oT(){this.a=HL();oT.prototype.b[this.a]=this;this.d=oT}oT.prototype.b={};Module.b2ContactEdge=oT;oT.prototype.get_contact=(function(){return OO(pL(this.a),Module.b2Contact)});pT.prototype.set_localAnchorA=(function(b){qL(this.a,b.a)});pT.prototype.__destroy__=(function(){IL(this.a)});pT.prototype.get_maxLength=(function(){return rL(this.a)});pT.prototype.set_localAnchorB=(function(b){sL(this.a,b.a)});pT.prototype.get_localAnchorA=(function(){return OO(this.a+20|0,Module.b2Vec2)});pT.prototype.get_localAnchorB=(function(){return OO(this.a+28|0,Module.b2Vec2)});function pT(){this.a=JL();pT.prototype.b[this.a]=this;this.d=pT}pT.prototype.b={};Module.b2RopeJointDef=pT;pT.prototype.set_maxLength=(function(b){tL(this.a,b)});this.Box2D=Module;Module.b2_staticBody=0;Module.b2_kinematicBody=1;Module.b2_dynamicBody=2
;
(function() {

  cc.module('cc.Core').defines(function() {
    var _requestAnimFrame;
    _requestAnimFrame = (function() {
      return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback, element) {
        return window.setTimeout(callback, 1000 / 60);
      };
    })();
    cc.requestAnimationFrame = function(callback, element) {
      return _requestAnimFrame(callback, element);
    };
    cc.onVisibilityChange = function(callback) {
      var hidden, visibilityChange,
        _this = this;
      if (document.hidden != null) {
        hidden = "hidden";
        visibilityChange = "visibilitychange";
      } else if (document.mozHidden != null) {
        hidden = "mozHidden";
        visibilityChange = "mozvisibilitychange";
      } else if (document.msHidden != null) {
        hidden = "msHidden";
        visibilityChange = "msvisibilitychange";
      } else if (document.webkitHidden != null) {
        hidden = "webkitHidden";
        visibilityChange = "webkitvisibilitychange";
      }
      return document.addEventListener(visibilityChange, function() {
        return callback(document[hidden]);
      }, false);
    };
    cc.ZERO = 0.0000001;
    return cc.rand = function(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };
  });

}).call(this);
(function() {

  cc.module('cc.Image').defines(function() {
    return this.set(cc.Class.extend({
      init: function(path, onload) {
        this.data = new window.Image;
        this.data.onload = onload;
        return this.data.src = path;
      },
      draw: function(x, y) {},
      drawTile: function(x, y, tileN, tileSize) {}
    }));
  });

}).call(this);
(function() {

  cc.module('cc.physics.Entity').defines(function() {
    return this.set(cc.Class.extend({
      pos: {
        x: 0,
        y: 0,
        z: 0
      },
      width: 0,
      height: 0,
      v: {
        x: 0,
        y: 0
      },
      maxV: {
        x: 200,
        y: 100
      },
      a: {
        x: 0,
        y: 0
      },
      bounciness: 0,
      standing: false,
      friction: 0.5,
      density: 1.0,
      _knownByPhysicsServer: false,
      _events: [],
      facingLeft: true,
      _compressedPhysicsForNew: function() {
        var height, width, x, y;
        x = this.pos.x;
        y = this.pos.y;
        width = this.width;
        height = this.height;
        if (this.hitbox) {
          x += this.hitbox.offset.x;
          y += this.hitbox.offset.y;
          width = this.hitbox.width;
          height = this.hitbox.height;
        }
        return [x, y, this.v.x, this.v.y, this.a.x, this.a.y, width, height, this.category, this.mask, this.bounciness, this.friction, this.density, this.maxV.x, this.maxV.y];
      },
      compressedPhysics: function() {
        var ev;
        if (!this._knownByPhysicsServer) {
          this._knownByPhysicsServer = true;
          this._events = [];
          return this._compressedPhysicsForNew();
        } else {
          ev = this._events;
          this._events = [];
          return ev;
        }
      },
      uncompressPhysics: function(p) {
        this.pos.x = p[0], this.pos.y = p[1], this.v.x = p[2], this.v.y = p[3], this.standing = p[4];
        if (this.hitbox) {
          this.pos.x -= this.hitbox.offset.x;
          this.pos.y -= this.hitbox.offset.y;
        }
        this.update();
      },
      _detectFacing: function() {
        if ((this.facingLeft && this.v.x > 1) || (!this.facingLeft && this.v.x < -1)) {
          this.facingLeft = !this.facingLeft;
        }
      },
      setV: function(vx, vy) {
        this.v.x = vx;
        this.v.y = vy;
        this._detectFacing();
        this._events.push('v', this.v.x, this.v.y);
        return this._mark();
      },
      setPos: function(px, py) {
        this.pos.x = px;
        this.pos.y = py;
        if (this.hitbox) {
          px += this.hitbox.offset.x;
          py += this.hitbox.offset.y;
        }
        this._events.push('p', px, py);
        return this._mark();
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.Entity').parent('cc.physics.Entity').jClass({
    sprites: {},
    sprite: null,
    category: 1,
    mask: 1,
    init: function(game, x, y, settings) {
      this.game = game;
      this.pos.x = x;
      this.pos.y = y;
    },
    setSprite: function(name) {
      this.sprite = this.sprites[name];
      this.sprite.timer = this.game.syncTimer(this.sprite.frameLength);
      return this.sprite;
    },
    addSprite: function(name, frameLength, frames) {
      var sprite;
      this.sprites[name] = sprite = new cc.Sprite(this.spriteSheet, frameLength, frames);
      if (!this.sprite) {
        this.setSprite(name);
        if (this.width && this.height) {
          return;
        }
        if (!this.width) {
          this.width = sprite.sheet.tileWidth;
        }
        if (!this.height) {
          this.height = sprite.sheet.tileHeight;
        }
        if (this.hitbox) {
          if (!this.hitbox.offset) {
            this.hitbox.offset = {};
          }
          if (!(this.hitbox.offset.x != null)) {
            this.hitbox.offset.x = Math.ceil((this.width - this.hitbox.width) / 2);
          }
          if (!(this.hitbox.offset.y != null)) {
            this.hitbox.offset.y = Math.ceil((this.height - this.hitbox.height) / 2);
          }
        }
      }
      return sprite;
    },
    update: function() {
      if (!this.game.useWebWorker) {
        this._step(this.game.tick);
      }
      if (this.sprite) {
        this.sprite.update();
      }
    },
    _mark: function() {
      this.game._hasUpdates = true;
      return this.game._updates[this.id] = this;
    },
    draw: function() {
      this.game.renderer.setSize(this.width, this.height);
      this.game.renderer.selectSprite(this.sprite);
      this._detectFacing();
      this.game.renderer.drawEntity(this.pos.x, this.pos.y, this.pos.z, this.facingLeft);
    }
  });

}).call(this);
(function() {

  cc.module('cc.Surface').defines(function() {
    return this.set(cc.Class.extend({
      tile: null,
      init: function(game, sheet, tileIdx, x, y, width, height, friction, bounciness) {
        var nCols;
        this.game = game;
        this.sheet = sheet;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.friction = friction != null ? friction : 0;
        this.bounciness = bounciness != null ? bounciness : 0;
        nCols = this.sheet.imgWidth() / this.sheet.tileWidth;
        this.tile = vec2.createFrom(tileIdx % nCols, Math.floor(tileIdx / nCols));
        return this._tileRepeat = vec2.createFrom(this.width / this.sheet.tileWidth, this.height / this.sheet.tileHeight);
      },
      compressedPhysics: function() {
        return [this.x, this.y, this.width, this.height, this.friction, this.bounciness];
      },
      draw: function() {
        this.game.renderer.setSize(this.width, this.height);
        this.game.renderer.selectSprite(this);
        this.game.renderer.tileRepeat(this._tileRepeat);
        return this.game.renderer.drawSurface(this.x, this.y, this.z || 0);
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.Resources').requires('cc.Image').defines(function() {
    return this.set(cc.Class.extend({
      images: {},
      spriteSheets: {},
      audios: {},
      completeCallbacks: [],
      nToLoad: 0,
      nLoaded: 0,
      completeness: function() {
        if (0 === this.nToLoad) {
          return 1;
        } else {
          return this.nLoaded / this.nToLoad;
        }
      },
      _loaded: function() {
        var callback, completeness, _i, _len, _ref;
        ++this.nLoaded;
        completeness = this.completeness();
        _ref = this.completeCallbacks;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          callback = _ref[_i];
          callback(completeness);
        }
      },
      image: function(path) {
        var img,
          _this = this;
        img = this.images[path];
        if (img) {
          return img;
        }
        ++this.nToLoad;
        return img = this.images[path] = new cc.Image(path, function() {
          return _this._loaded();
        });
      },
      spriteSheet: function(path, width, height) {
        var spriteSheet,
          _this = this;
        spriteSheet = this.images[path];
        if (spriteSheet) {
          if (!(spriteSheet instanceof cc.SpriteSheet)) {
            throw "" + path + " is Image";
          }
          return spriteSheet;
        }
        ++this.nToLoad;
        return spriteSheet = this.spriteSheets[path] = this.images[path] = new cc.SpriteSheet(path, width, height, function() {
          return _this._loaded();
        });
      },
      onLoadStatusUpdate: function(callback) {
        callback(this.completeness());
        this.completeCallbacks.push(callback);
      },
      clearLoadStatusUpdates: function() {
        this.completeCallbacks.length = 0;
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.LoadingScreen').defines(function() {
    return this.set(cc.Class.extend({}));
  });

}).call(this);
(function() {

  cc.module('cc.Sprite').defines(function() {
    return this.set(cc.Class.extend({
      frames: null,
      timer: null,
      sheet: null,
      frame: 0,
      tile: null,
      init: function(sheet, frameLength, _frames) {
        var frame, nCols, _i, _len;
        this.sheet = sheet;
        this.frameLength = frameLength;
        nCols = this.sheet.imgWidth() / this.sheet.tileWidth;
        this.frames = [];
        for (_i = 0, _len = _frames.length; _i < _len; _i++) {
          frame = _frames[_i];
          this.frames.push(vec2.createFrom(frame % nCols, Math.floor(frame / nCols)));
        }
        return this.tile = this.frames[0];
      },
      update: function() {
        if (this.timer.expired()) {
          this.timer.reset();
          this.frame = (this.frame + 1) % this.frames.length;
          this.tile = this.frames[this.frame];
        }
      },
      rewind: function() {
        this.frame = 0;
        return this;
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.SpriteSheet').defines(function() {
    return this.set(cc.Class.extend({
      textureOffset: null,
      textureTileSize: null,
      init: function(path, tileWidth, tileHeight, onload, offset) {
        this.tileWidth = tileWidth;
        this.tileHeight = tileHeight;
        this.offset = offset;
        return this.image = new cc.Image(path, onload);
      },
      imgWidth: function() {
        return this.image.data.width;
      },
      imgHeight: function() {
        return this.image.data.height;
      }
    }));
  });

}).call(this);
(function() {
  var __hasProp = {}.hasOwnProperty;

  cc.module('cc.Game').defines(function() {
    return this.set(cc.Class.extend({
      now: 0,
      tick: 1,
      entities: [],
      entitiesById: {},
      surfaces: [],
      surfacesById: {},
      _updates: {},
      _hasUpdates: false,
      maxTick: 0.05,
      gravity: {
        x: 0,
        y: 0
      },
      scale: 1,
      box2dScale: 30,
      _thingCount: 0,
      renderer: null,
      input: null,
      viewport: null,
      useWebWorker: true,
      backgroundColor: [0.0, 0.0, 0.0, 1.0],
      ticks: 0,
      skips: 0,
      updates: 0,
      width: 0,
      height: 0,
      init: function(resources, options) {
        var _this = this;
        this.resources = resources;
        this.physicsClient = new cc.physics.Client(this.box2dScale, function(data, tick) {
          var entity, id, uent;
          _this.tick = tick;
          _this.now += tick;
          for (id in data) {
            if (!__hasProp.call(data, id)) continue;
            uent = data[id];
            entity = _this.entitiesById[id];
            if (entity) {
              entity.uncompressPhysics(uent);
            }
          }
          return _this.update();
        });
        this.setOptions(options);
        return this.input = new cc.Input;
      },
      setOptions: function(options) {
        if (!options) {
          return;
        }
        if (options.scale) {
          this.scale = options.scale;
        }
        if (options.maxTick) {
          this.maxTick = options.maxTick;
        }
        if (options.width) {
          this.width = options.width;
        }
        if (options.height) {
          return this.height = options.height;
        }
      },
      syncTimer: function(expiresIn) {
        return new cc.SyncTimer(this, expiresIn);
      },
      timer: function(expiresIn) {
        return new cc.Timer(this, expiresIn);
      },
      setScale: function(scale) {
        this.scale = scale;
        this.viewport.setScreenDimensions(this.width / this.scale, this.height / this.scale);
        this.renderer.setScale(this.scale);
      },
      main: function(canvas, options) {
        var _this = this;
        this.setOptions(options);
        if (!(canvas.getContext != null)) {
          if (!(typeof canvas === "string")) {
            throw 'canvas argument must be Canvas object or selector';
          }
          if (canvas[0] === '#') {
            canvas = document.getElementById(canvas.slice(1));
          } else {
            canvas = document.getElementById(canvas);
          }
        }
        if (canvas.getContext == null) {
          throw "could not find canvas";
        }
        return this.resources.onLoadStatusUpdate(function(cmplt) {
          var c, mainLoop;
          if (cmplt < 1) {
            return;
          }
          if (!_this.width) {
            _this.width = canvas.width;
          }
          if (!_this.height) {
            _this.height = canvas.height;
          }
          _this.viewport = new cc.Viewport(_this.width, _this.height, _this.width, _this.height);
          try {
            _this.renderer = new cc.gl.Renderer(canvas, _this.resources, _this.width, _this.height, _this.viewport);
          } catch (e) {
            alert("sorry WebGL is not enabled/supported in your browser, please try Firefox or Chrome " + e.stack);
            return;
          }
          _this.setScale(_this.scale);
          c = _this.backgroundColor;
          _this.renderer.setBackgroundColor(c[0], c[1], c[2], c[3]);
          _this.input.enable();
          if (_this.booted) {
            _this.booted();
          }
          _this.physicsClient.run();
          _this.physicsClient.sendConfig({
            maxTick: _this.maxTick,
            gravity: _this.gravity
          });
          _this.physicsClient.sendUpdates(_this._updates);
          _this._updates = {};
          (mainLoop = function() {
            cc.requestAnimationFrame(mainLoop);
            return _this.draw();
          })();
        });
      },
      spawnEntity: function(type, x, y, settings) {
        var entity;
        this._hasUpdates = true;
        entity = new type(this, x, y, settings);
        entity.id = ++this._thingCount;
        this.entities.push(entity);
        return this.entitiesById[entity.id] = this._updates[entity.id] = entity;
      },
      addSurface: function(sheet, tileIdx, x, y, width, height, bounciness) {
        var surface;
        this._hasUpdates = true;
        surface = new cc.Surface(this, sheet, tileIdx, x, y, width, height, bounciness);
        surface.id = ++this._thingCount;
        this.surfaces.push(surface);
        return this.surfacesById[surface.id] = this._updates[surface.id] = surface;
      },
      update: function() {
        ++this.updates;
        if (this._hasUpdates) {
          this.physicsClient.sendUpdates(this._updates);
          this._hasUpdates = false;
          this._updates = {};
        }
        this.input.update();
      },
      draw: function() {
        var entity, surface, _i, _j, _len, _len1, _ref, _ref1;
        if (!this.tick) {
          ++this.skips;
        } else {
          this.physicsClient.signalPaint();
          ++this.ticks;
          this.renderer.clear();
          this.renderer.drawingEntities();
          _ref = this.entities;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            entity = _ref[_i];
            entity.draw();
          }
          this.renderer.drawingSurfaces();
          _ref1 = this.surfaces;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            surface = _ref1[_j];
            surface.draw();
          }
          this.tick = 0;
        }
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.Viewport').defines(function() {
    return this.set(cc.Class.extend({
      init: function(width, height, screenWidth, screenHeight, x, y) {
        this.width = width;
        this.height = height;
        this.x = x != null ? x : 0;
        this.y = y != null ? y : 0;
        this.setScreenDimensions(screenWidth, screenHeight);
      },
      setScreenDimensions: function(screenWidth, screenHeight) {
        this.maxX = this.width - screenWidth;
        this.maxY = this.height - screenHeight;
      },
      setWidth: function(width) {
        this.maxX += width - this.width;
        this.width = width;
      },
      setHeight: function(height) {
        this.maxX += height - this.width;
        this.height = height;
      },
      checkX: function() {
        if (this.x > this.maxX) {
          this.x = this.maxX;
        } else if (this.x < 0) {
          this.x = 0;
        }
      },
      checkY: function() {
        if (this.y > this.maxY) {
          this.y = this.maxY;
        } else if (this.y < 0) {
          this.y = 0;
        }
      },
      scrollTo: function(x, y) {
        this.x = x;
        this.y = y;
        this.checkX();
        this.checkY();
      },
      scroll: function(sx, sy) {
        this.x += sx;
        this.y += sy;
        this.checkX();
        this.checkY();
      },
      scrollUp: function(s) {
        this.y -= s;
        if (this.y < 0) {
          this.y = 0;
        }
      },
      scrollRight: function(s) {
        this.x += s;
        if (this.x > this.maxX) {
          this.x = this.maxX;
        }
      },
      scrollDown: function(s) {
        this.y += s;
        if (this.y > this.maxY) {
          this.y = this.maxY;
        }
      },
      scrollLeft: function(s) {
        this.x -= s;
        if (this.x < 0) {
          this.x = 0;
        }
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.Input').defines(function() {
    var char, i, idx, key, _i, _j, _ref, _ref1;
    key = cc.key = {
      backspace: 8,
      tab: 9,
      enter: 13,
      shift: 16,
      ctrl: 17,
      alt: 18,
      pause: 19,
      "break": 19,
      space: 32,
      pageup: 33,
      pagedown: 34,
      end: 35,
      home: 36,
      left: 37,
      up: 38,
      right: 39,
      down: 40,
      insert: 45,
      "delete": 46,
      multiply: 106,
      add: 107,
      substract: 109,
      divide: 111,
      f11: 122,
      f12: 123,
      fullstop: 190,
      period: 190,
      forwardslash: 191,
      slash: 191,
      backslash: 220
    };
    ({
      fallthrough: false
    });
    for (i = _i = _ref = 'A'.charCodeAt(0), _ref1 = 'Z'.charCodeAt(0); _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1; i = _ref <= _ref1 ? ++_i : --_i) {
      char = String.fromCharCode(i);
      key[char.toLowerCase()] = i;
    }
    for (i = _j = 0; _j <= 9; i = ++_j) {
      idx = '0'.charCodeAt(0) + i;
      char = i.toString();
      key[char] = idx;
      key['n' + char] = idx;
      key['numpad' + char] = i + 96;
      key['f' + char] = i + 112;
    }
    return this.set(cc.Class.extend({
      state: {},
      pressed: {},
      released: {},
      _bindings: {},
      enable: function() {
        var _this = this;
        window.addEventListener('keydown', function(e) {
          return _this.press(e, false);
        });
        window.addEventListener('keyup', function(e) {
          return _this.release(e, false);
        });
      },
      press: function(e) {
        var bind, code;
        code = e.keyCode;
        bind = this._bindings[code];
        if (bind && !this.state[bind]) {
          this.pressed[bind] = code;
          this.state[bind] = code;
        }
        if (!this.fallthrough) {
          e.stopPropagation();
          e.preventDefault();
        }
      },
      release: function(e) {
        var bind, code;
        code = e.keyCode;
        bind = this._bindings[code];
        if (bind) {
          delete this.pressed[bind];
          delete this.state[bind];
          this.released[bind] = code;
        }
      },
      update: function() {
        this.released = {};
        return this.pressed = {};
      },
      bind: function(key, state) {
        return this._bindings[key] = state;
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.SyncTimer').defines(function() {
    return this.set(cc.Class.extend({
      init: function(_game, duration, offset) {
        this._game = _game;
        this.duration = duration != null ? duration : 0;
        this.offset = offset != null ? offset : 0;
        if (this.duration) {
          this.reset();
        } else {
          this.pause();
        }
      },
      expired: function() {
        return this._game.now >= this.expires;
      },
      delta: function() {
        return this._game.now - this.expires;
      },
      setDuration: function(duration) {
        this.duration = duration;
        this.reset();
      },
      pause: function() {
        this.expires = Number.MAX_VALUE;
      },
      reset: function() {
        this.expires = Math.floor((this._game.now / this.duration) - this.offset) * this.duration + this.duration + this.offset;
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.Timer').parent('cc.SyncTimer').jClass({
    init: function(_game, duration) {
      this._game = _game;
      this.duration = duration;
      this.reset();
    },
    reset: function() {
      this.expires = this._game.now + this.duration;
    }
  });

}).call(this);
(function() {
  var __hasProp = {}.hasOwnProperty;

  cc.module('cc.gl.Renderer').defines(function() {
    return this.set(cc.Class.extend({
      init: function(canvas, resources, width, height, viewport) {
        var path, spriteSheet, _ref;
        this.viewport = viewport;
        this._getGlContext(canvas, width, height);
        this._activatedTextureId = -1;
        this._shdr = new cc.gl.SpriteShaderProgram;
        this._shdr.attachContext(this.gl);
        this._shdr.link();
        this.texAtlas = new cc.gl.TextureAtlas;
        _ref = resources.spriteSheets;
        for (path in _ref) {
          if (!__hasProp.call(_ref, path)) continue;
          spriteSheet = _ref[path];
          this.texAtlas.addSpriteSheet(spriteSheet);
        }
        this.texAtlas.loadToTextures(this.gl);
      },
      _getGlContext: function(canvas, width, height) {
        try {
          this.gl = canvas.getContext("experimental-webgl");
          this.gl.viewportWidth = canvas.width = width;
          this.gl.viewportHeight = canvas.height = height;
        } catch (e) {
          alert("could not initialise WebGL");
        }
      },
      setSize: function(width, height) {
        this._shdr.setSize(width, height);
      },
      setScale: function(scale) {
        this._shdr.perspectiveAndScale(90, scale);
      },
      setBackgroundColor: function(r, g, b, a) {
        this._shdr.clearColor(r, g, b, a);
        return this;
      },
      selectSprite: function(sprite) {
        var newTextureId;
        newTextureId = sprite.sheet.textureId;
        if (newTextureId !== this._activatedTextureId) {
          this._shdr.activateTexture(this.texAtlas.textures[newTextureId]);
          this._activatedTextureId = newTextureId;
        }
        this._shdr.selectTile(sprite.sheet.textureTileSize, sprite.tile, sprite.sheet.textureOffset);
        return this;
      },
      tileRepeat: function(r) {
        this._shdr.tileRepeat(r);
      },
      drawingEntities: function() {
        this._shdr.modeDynamicEntity();
      },
      drawingSurfaces: function() {
        this._shdr.modeSurfaceEntity();
      },
      drawEntity: function(x, y, z, flipX) {
        this._shdr.drawAt(x - this.viewport.x, y - this.viewport.y, z);
        this._shdr.flipX(flipX);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this._shdr.spriteVertices.numItems);
        return this;
      },
      drawSurface: function(x, y, z) {
        this._shdr.drawAt(x - this.viewport.x, y - this.viewport.y, z);
        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, this._shdr.spriteVertices.numItems);
        return this;
      },
      clear: function() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        return this;
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.gl.TextureAtlas').defines(function() {
    return this.set(cc.Class.extend({
      init: function(width, height, maxTextures) {
        this.width = width != null ? width : 2048;
        this.height = height != null ? height : 2048;
        this.maxTextures = maxTextures != null ? maxTextures : 32;
        this._canvases = [];
        this._addTexture();
        return this.textures = [];
      },
      _addTexture: function() {
        this._canvas = document.createElement('canvas');
        this._canvas.width = this.width;
        this._canvas.height = this.height;
        this._canvas.rows = [
          {
            height: this.height,
            cells: [false]
          }
        ];
        this._canvas.colWidth = [this.width];
        return this._canvases.push(this._canvas);
      },
      _nRows: function() {
        return this._canvas.rows.length;
      },
      _nCols: function() {
        return this._canvas.colWidth.length;
      },
      _splitCell: function(rowIdx, colIdx, width, height) {
        var cell, colWidth, newRow, row, _i, _j, _len, _len1, _ref, _ref1;
        row = this._canvas.rows[rowIdx];
        if (height < row.height) {
          newRow = {
            height: row.height - height,
            cells: []
          };
          _ref = row.cells;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            cell = _ref[_i];
            newRow.cells.push(cell);
          }
          this._canvas.rows.splice(rowIdx + 1, 0, newRow);
          row.height = height;
        }
        colWidth = this._canvas.colWidth[colIdx];
        if (width < colWidth) {
          this._canvas.colWidth.splice(colIdx + 1, 0, colWidth - width);
          _ref1 = this._canvas.rows;
          for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
            row = _ref1[_j];
            row.cells.splice(colIdx + 1, 0, row.cells[colIdx]);
          }
          return this._canvas.colWidth[colIdx] = width;
        }
      },
      _searchCells: function(firstRow, rowIdx, colIdx, width, height) {
        var cellIdx, i, lastColIdx, lastRowIdx, row, _i, _j, _k, _l, _m, _ref, _ref1;
        for (lastColIdx = _i = colIdx, _ref = this._canvas.colWidth.length; colIdx <= _ref ? _i < _ref : _i > _ref; lastColIdx = colIdx <= _ref ? ++_i : --_i) {
          if (firstRow.cells[lastColIdx]) {
            return;
          }
          width -= this._canvas.colWidth[lastColIdx];
          if (width <= 0) {
            break;
          }
        }
        if (width > 0) {
          return;
        }
        for (lastRowIdx = _j = rowIdx, _ref1 = this._canvas.rows.length; rowIdx <= _ref1 ? _j < _ref1 : _j > _ref1; lastRowIdx = rowIdx <= _ref1 ? ++_j : --_j) {
          row = this._canvas.rows[lastRowIdx];
          for (cellIdx = _k = colIdx; colIdx <= lastColIdx ? _k <= lastColIdx : _k >= lastColIdx; cellIdx = colIdx <= lastColIdx ? ++_k : --_k) {
            if (row.cells[cellIdx]) {
              return;
            }
          }
          height -= row.height;
          if (height <= 0) {
            break;
          }
        }
        if (height > 0) {
          return;
        }
        this._splitCell(lastRowIdx, lastColIdx, width + this._canvas.colWidth[lastColIdx], height + this._canvas.rows[lastRowIdx].height);
        for (i = _l = rowIdx; rowIdx <= lastRowIdx ? _l <= lastRowIdx : _l >= lastRowIdx; i = rowIdx <= lastRowIdx ? ++_l : --_l) {
          row = this._canvas.rows[i];
          for (cellIdx = _m = colIdx; colIdx <= lastColIdx ? _m <= lastColIdx : _m >= lastColIdx; cellIdx = colIdx <= lastColIdx ? ++_m : --_m) {
            row.cells[cellIdx] = true;
          }
        }
        return true;
      },
      _getCell: function(width, height) {
        var colIdx, colWidth, row, rowIdx, x, y, _i, _j, _ref, _ref1;
        x = y = 0;
        for (rowIdx = _i = 0, _ref = this._canvas.rows.length; 0 <= _ref ? _i < _ref : _i > _ref; rowIdx = 0 <= _ref ? ++_i : --_i) {
          row = this._canvas.rows[rowIdx];
          for (colIdx = _j = 0, _ref1 = this._nCols(); 0 <= _ref1 ? _j < _ref1 : _j > _ref1; colIdx = 0 <= _ref1 ? ++_j : --_j) {
            colWidth = this._canvas.colWidth[colIdx];
            if (this._searchCells(row, rowIdx, colIdx, width, height)) {
              return [x, y];
            }
            x += colWidth;
          }
          y += row.height;
          x = 0;
        }
        if (this._canvases.length >= this.maxTextures) {
          throw "Too many sprite maps for available texture space";
        }
        this._addTexture();
        return this._getCell(width, height);
      },
      addSpriteSheet: function(spriteSheet) {
        var img, x, y, _ref;
        img = spriteSheet.image.data;
        _ref = this._getCell(img.width, img.height), x = _ref[0], y = _ref[1];
        this._canvas.getContext('2d').drawImage(img, x, y);
        spriteSheet.textureId = this._canvases.length - 1;
        spriteSheet.textureOffset = vec2.createFrom(x / this.width, y / this.height);
        spriteSheet.textureTileSize = vec2.createFrom(spriteSheet.tileWidth / this.width, spriteSheet.tileHeight / this.height);
      },
      loadToTextures: function(gl) {
        var canvas, glTexture, textureId, _i, _ref;
        for (textureId = _i = 0, _ref = this._canvases.length; 0 <= _ref ? _i < _ref : _i > _ref; textureId = 0 <= _ref ? ++_i : --_i) {
          canvas = this._canvases[textureId];
          delete canvas.rows;
          delete canvas.colWidth;
          glTexture = gl.createTexture();
          this.textures.push(glTexture);
          glTexture.idx = textureId;
          glTexture.id = gl['TEXTURE' + textureId];
          gl.bindTexture(gl.TEXTURE_2D, glTexture);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
          gl.texImage2D(gl.TEXTURE_2D, textureId, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
          gl.bindTexture(gl.TEXTURE_2D, null);
        }
      }
    }));
  });

}).call(this);
(function() {
  var __slice = [].slice;

  cc.module('cc.gl.ShaderProgram').defines(function() {
    return this.set(cc.Class.extend({
      init: function() {
        this.u = {};
        this.a = {};
      },
      attachContext: function(gl) {
        this.gl = gl;
        this.prgrm = this.gl.createProgram();
      },
      _attachShader: function(shader, content) {
        this.gl.shaderSource(shader, content);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
          alert(this.gl.getShaderInfoLog(shader));
        } else {
          this.gl.attachShader(this.prgrm, shader);
        }
      },
      _attribVertices: function() {
        var name, names, _i, _len;
        names = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        for (_i = 0, _len = names.length; _i < _len; _i++) {
          name = names[_i];
          this.gl.enableVertexAttribArray(this.a[name] = this.gl.getAttribLocation(this.prgrm, name));
        }
      },
      _uniforms: function() {
        var name, names, _i, _len;
        names = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        for (_i = 0, _len = names.length; _i < _len; _i++) {
          name = names[_i];
          this.u[name] = this.gl.getUniformLocation(this.prgrm, name);
        }
      },
      link: function() {
        this.gl.linkProgram(this.prgrm);
        if (!this.gl.getProgramParameter(this.prgrm, this.gl.LINK_STATUS)) {
          alert("Could not initialise shaders");
        }
        return this.gl.useProgram(this.prgrm);
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.gl.SpriteShaderProgram').parent('cc.gl.ShaderProgram').jClass({
    gl: null,
    scale: 1,
    init: function() {
      this.parent();
      this.pMatrix = mat4.create();
      this.mvMatrix = mat4.create();
    },
    activateTexture: function(texture) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
      this.gl.vertexAttribPointer(this.a.textureCoord, this.textureBuffer.itemSize, this.gl.FLOAT, false, 0, 0);
      this.gl.activeTexture(texture.id);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.uniform1i(this.u.sampler, texture.idx);
      return this;
    },
    setSize: function(width, height) {
      this.gl.uniform2f(this.u.size, width, height);
    },
    _attachSpriteFragmentShader: function() {
      var content, shader;
      content = "precision mediump float;\n\nvarying vec2 vTextureCoord;\nuniform int mode;\n\n// for mode 1\nuniform bool flipX;\n\n// for modes 1 and 2\nuniform sampler2D sampler;\nuniform vec2 tileSize;   // tile size in percentage of texture size\nuniform vec2 tileOffset; // index of tile e.g. (1,1) = (1 down, 1 right)\nuniform vec2 tileCoord;  // offset into texture of first pixel\n\n// for mode 2\nuniform vec2 tileRepeat;\n\n// for mode 3\nuniform vec4 color;\n\n// this converts the tile coordinate system to the gl coordinate system\n// First it flips the y-axis. Then it reverses the direction it scans\n// for the current pixel. It also has to add one to the y-offset to make\n// up for it being from the top left rather than the bottom right.\nvoid main(void) {\n  vec2 _tileOffset = vec2(tileOffset.s, tileOffset.t + 1.0);\n  vec2 _texCoord   = vec2(vTextureCoord.s, -vTextureCoord.t);\n\n  if (mode == 1) {\n    if (flipX) {\n      _texCoord.s = -_texCoord.s;\n      _tileOffset.s += 1.0;\n    }\n\n    gl_FragColor = texture2D(sampler,\n      vec2(1, -1) * (\n        (_texCoord * tileSize) + (tileSize * _tileOffset) + tileCoord));\n  }\n  else if (mode == 2) {\n    _texCoord.s = mod(_texCoord.s * tileRepeat.s, 1.0);\n    _texCoord.t = -mod(-_texCoord.t * tileRepeat.t, 1.0);\n\n    gl_FragColor = texture2D(sampler,\n      vec2(1, -1) * (\n        (_texCoord * tileSize) + (tileSize * _tileOffset) + tileCoord));\n  }\n  else if (mode == 3) {\n    gl_FragColor = color;\n  }\n}";
      shader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
      return this._attachShader(shader, content);
    },
    _attachSpriteVertexShader: function() {
      var content, shader;
      content = "attribute vec3 vertexPosition;\nattribute vec2 textureCoord;\n\nuniform mat4 mvMatrix;\nuniform mat4 pMatrix;\nuniform vec3 position;\n\n// size of sprite/surface\nuniform vec2 size;\n\n// to project y onto x.. multiply position by this\n// const mat3 shear = mat3(1,0,0, 0,0,1, 0,-1,0);\n\nvarying vec2 vTextureCoord;\n\nvoid main(void) {\n  gl_Position = pMatrix * mvMatrix *\n    vec4(\n      vec3(size, 1.0) * vertexPosition +\n        vec3(position.x, -position.y - size.y, position.z),\n      1.0);\n  vTextureCoord = textureCoord;\n}";
      shader = this.gl.createShader(this.gl.VERTEX_SHADER);
      return this._attachShader(shader, content);
    },
    selectTile: function(tileSize, tileOffset, sheetOffset) {
      this.gl.uniform2fv(this.u.tileSize, tileSize);
      this.gl.uniform2fv(this.u.tileOffset, tileOffset);
      this.gl.uniform2fv(this.u.tileCoord, sheetOffset);
    },
    tileRepeat: function(r) {
      this.gl.uniform2fv(this.u.tileRepeat, r);
    },
    perspectiveAndScale: function(deg, scale) {
      var zDistance;
      this.scale = scale != null ? scale : 1;
      mat4.perspective(deg, this.gl.viewportWidth / this.gl.viewportHeight, 1.0, 300.0, this.pMatrix);
      this.gl.uniformMatrix4fv(this.u.pMatrix, false, this.pMatrix);
      zDistance = -this.gl.viewportHeight / (2 * this.scale);
      mat4.identity(this.mvMatrix);
      mat4.translate(this.mvMatrix, [-this.gl.viewportWidth / (2 * this.scale), -zDistance, zDistance]);
      this.gl.uniformMatrix4fv(this.u.mvMatrix, false, this.mvMatrix);
      return this;
    },
    drawAt: function(x, y, z) {
      if (z == null) {
        z = 0;
      }
      this.gl.uniform3f(this.u.position, x, y, z);
      return this;
    },
    flipX: function(flip) {
      this.gl.uniform1i(this.u.flipX, flip);
      return this;
    },
    clearColor: function(r, g, b, a) {
      this.gl.clearColor(r, g, b, a);
    },
    _glOptions: function() {
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
      this.gl.disable(this.gl.DEPTH_TEST);
      this.gl.viewport(0, 0, this.gl.viewportWidth, this.gl.viewportHeight);
    },
    modeDynamicEntity: function() {
      this.gl.uniform1i(this.u.mode, 1);
    },
    modeSurfaceEntity: function() {
      this.gl.uniform1i(this.u.mode, 2);
    },
    modeColor: function() {
      this.gl.uniform1i(this.u.mode, 3);
    },
    setColor: function(color) {
      return this.gl.uniform4fv(this.u.color, color);
    },
    link: function() {
      var textureCoords, vertices;
      this.textureBuffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.textureBuffer);
      textureCoords = [1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0];
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoords), this.gl.STATIC_DRAW);
      this.textureBuffer.itemSize = 2;
      this.textureBuffer.numItems = 4;
      this.spriteVertices = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.spriteVertices);
      vertices = [1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0];
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
      this.spriteVertices.itemSize = 3;
      this.spriteVertices.numItems = 4;
      this._attachSpriteFragmentShader();
      this._attachSpriteVertexShader();
      this.parent();
      this._attribVertices("vertexPosition", "textureCoord");
      this._uniforms("tileSize", "tileOffset", "tileCoord", "tileRepeat", "sampler", "pMatrix", "mvMatrix", "position", "size", "flipX", "mode", "color");
      this._glOptions();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.spriteVertices);
      this.gl.vertexAttribPointer(this.a.vertexPosition, this.spriteVertices.itemSize, this.gl.FLOAT, false, 0, 0);
      return this;
    }
  });

}).call(this);
(function() {

  cc.module('cc.physics.Box2dEntityEvents').defines(function() {
    return this.set(cc.Class.extend({
      v: function(entity, args, idx) {
        var m, s, v;
        s = entity.world.scale;
        v = entity._body.GetLinearVelocity();
        m = entity._body.GetMass();
        entity._body.ApplyLinearImpulse(new b2Vec2(m * (args[idx] / s - v.get_x()), m * (args[idx + 1] / s - v.get_y())), entity._body.GetWorldCenter());
        return 3;
      },
      p: function(entity, args, idx) {
        var s;
        s = entity.world.scale;
        entity._body.SetTransform(new b2Vec2(args[idx] / s + entity.width / 2, args[idx + 1] / s + entity.height / 2), entity._body.GetAngle());
        return 3;
      },
      f: function(entity, args, idx) {
        entity._fix.SetFriction(args[idx]);
        return 2;
      },
      update: function(entity, events) {
        var idx;
        idx = this[events[0]](entity, events, 1);
        while (idx < events.length) {
          idx = this[events[idx]](entity, args, idx + 1);
        }
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.physics.Box2dEntity').requires('cc.physics.Box2dEntityEvents').defines(function() {
    return this.set(cc.Class.extend({
      _evHandler: new cc.physics.Box2dEntityEvents,
      maxV: {
        x: 200,
        y: 100
      },
      groundTouches: 0,
      standing: false,
      _onUpdate: null,
      _setFriction: function(val) {
        var contactEdge;
        this._fix.SetFriction(val);
        contactEdge = this._body.GetContactList();
        while (true) {
          if (Box2D.compare(contactEdge, Box2D.NULL)) {
            break;
          }
          contactEdge.get_contact().ResetFriction();
          contactEdge = contactEdge.get_next();
        }
      },
      groundContact: function() {
        ++this.groundTouches;
        if (!this.standing) {
          this.standing = true;
          this._onUpdate = function() {
            if (this.standing) {
              return this._setFriction(this.friction);
            }
          };
        }
      },
      groundLoseContact: function() {
        if (!--this.groundTouches) {
          this.standing = false;
          this._setFriction(0);
        }
      },
      init: function(p, world) {
        var filter, fix, footFixt, ftFree, ftHeight, ftShape, height, s, shape, width;
        this.world = world;
        this.world.entities.push(this);
        s = this.world.scale;
        this.width = p[6] / s;
        this.height = p[7] / s;
        this.friction = p[11];
        this._fixDef = new b2FixtureDef;
        filter = new b2Filter;
        filter.set_categoryBits(p[8]);
        filter.set_maskBits(p[9]);
        this._fixDef.set_filter(filter);
        this._fixDef.set_restitution(p[10]);
        this._fixDef.set_friction(this.friction);
        this._fixDef.set_density(p[12]);
        this.maxV.x = p[13];
        this.maxV.y = p[14];
        this._bodyDef = new b2BodyDef;
        this._bodyDef.set_type(Box2D.b2_dynamicBody);
        width = this.width / 2;
        height = this.height / 2;
        this._bodyDef.set_position(new b2Vec2(p[0] / s + width, p[1] / s + height));
        this._bodyDef.set_linearVelocity(new b2Vec2(p[2] / s, p[3] / s));
        this.a = {
          x: p[4] / s,
          y: p[5] / s
        };
        this._bodyDef.set_fixedRotation(true);
        shape = new b2PolygonShape;
        shape.SetAsBox(width, height);
        this._fixDef.set_shape(shape);
        this._body = this.world.b2.CreateBody(this._bodyDef);
        fix = this._body.CreateFixture(this._fixDef);
        fix.entity = this;
        this._fix = fix;
        ftHeight = 1 / (s * 3 * 2);
        ftFree = 1 / (s * 3);
        this._ftSensorDef = new b2FixtureDef;
        ftShape = new b2PolygonShape;
        ftShape.SetAsBox(width - ftFree, ftHeight, new b2Vec2(0, height + ftHeight), 0.0);
        this._ftSensorDef.set_shape(ftShape);
        this._ftSensorDef.set_isSensor(true);
        footFixt = this._body.CreateFixture(this._ftSensorDef);
        footFixt.entity = this;
        footFixt.foot = true;
      },
      _step: function(tick) {},
      update: function() {
        var p, s, v;
        if (this._onUpdate) {
          this._onUpdate();
          this._onUpdate = null;
        }
        s = this.world.scale;
        v = this._body.GetLinearVelocity();
        p = this._body.GetPosition();
        return [(p.get_x() - this.width / 2) * s, (p.get_y() - this.height / 2) * s, v.get_x() * s, v.get_y() * s, this.standing];
      },
      uncompressPhysics: function(p) {
        this._evHandler.update(this, p);
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.physics.Box2dSurface').defines(function() {
    return this.set(cc.Class.extend({
      init: function(p, world) {
        var filter, s, shape;
        this.world = world;
        s = this.world.scale;
        this.width = p[2] / s;
        this.height = p[3] / s;
        this._fixDef = new b2FixtureDef;
        filter = new b2Filter;
        filter.set_categoryBits(0xffffffff);
        filter.set_maskBits(0xffffffff);
        this._fixDef.set_filter(filter);
        this._fixDef.set_friction(p[4]);
        this._fixDef.set_restitution(p[5]);
        this._bodyDef = new b2BodyDef;
        this._bodyDef.set_type(Box2D.b2_staticBody);
        this._bodyDef.set_position(new b2Vec2(p[0] / s + this.width / 2, p[1] / s + this.height / 2));
        shape = new b2PolygonShape;
        shape.SetAsBox(this.width / 2, this.height / 2);
        this._fixDef.set_shape(shape);
        this._body = this.world.b2.CreateBody(this._bodyDef);
        this._body.CreateFixture(this._fixDef);
      },
      _step: function(tick) {}
    }));
  });

}).call(this);
(function() {

  cc.module('cc.physics.Box2dWorld').defines(function() {
    return this.set(cc.Class.extend({
      scale: 30.0,
      entities: [],
      init: function() {
        var _listener,
          _this = this;
        this.b2 = new b2World(new b2Vec2(0, 0));
        _listener = new b2ContactListener;
        self.console = {
          log: function(v) {
            return self.postMessage({
              log: v
            });
          }
        };
        Box2D.customizeVTable(_listener, [
          {
            original: b2ContactListener.prototype.BeginContact,
            replacement: function(ths, contact) {
              var a, b, c;
              c = Box2D.wrapPointer(contact, Box2D.b2Contact);
              a = c.GetFixtureA();
              b = c.GetFixtureB();
              if (a.foot) {
                a.entity.groundContact();
              }
              if (b.foot) {
                b.entity.groundContact();
              }
            }
          }, {
            original: b2ContactListener.prototype.EndContact,
            replacement: function(ths, contact) {
              var a, b, c;
              c = Box2D.wrapPointer(contact, Box2D.b2Contact);
              a = c.GetFixtureA();
              b = c.GetFixtureB();
              if (a.foot) {
                a.entity.groundLoseContact();
              }
              if (b.foot) {
                b.entity.groundLoseContact();
              }
            }
          }
        ]);
        this.b2.SetContactListener(_listener);
      },
      setGravity: function(g) {
        this.b2.SetGravity(new b2Vec2(g.x, g.y));
      },
      update: function(tick) {
        var data, ent, _i, _len, _ref;
        this.b2.Step(tick, 4, 8);
        this.b2.ClearForces();
        data = {};
        _ref = this.entities;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          ent = _ref[_i];
          data[ent.id] = ent.update();
        }
        return data;
      }
    }));
  });

}).call(this);
(function() {
  var __slice = [].slice,
    __hasProp = {}.hasOwnProperty;

  cc.module('cc.physics.Worker').defines(function() {
    return this.set(cc.Class.extend({
      entities: {},
      surfaces: {},
      enabled: true,
      maxTick: 0.05,
      now: 0,
      _clockUpdate: 0,
      tick: 0,
      _log: function() {
        var stuff;
        stuff = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        self.postMessage({
          log: stuff.join(' ')
        });
      },
      update: function() {
        var clock, data;
        if (!this.enabled) {
          return;
        }
        clock = new Date().getTime() / 1000;
        this.tick = clock - this._clockUpdate;
        if (this.tick > this.maxTick) {
          this.tick = this.maxTick;
        }
        this.now += this.tick;
        this._clockUpdate = clock;
        data = this.world.update(this.tick);
        self.postMessage({
          update: data,
          tick: this.tick
        });
      },
      init: function() {
        var _this = this;
        this.world = new cc.physics.Box2dWorld;
        this._clockUpdate = new Date().getTime() / 1000;
        self.onmessage = function(event) {
          return _this.onMessage(event.data);
        };
      },
      _isEntity: function(data) {
        return data.length === 15;
      },
      onMessage: function(data) {
        var entity, id, surface, updated, _ref;
        if (data.p) {
          this.update();
        } else if (data.u) {
          _ref = data.u;
          for (id in _ref) {
            if (!__hasProp.call(_ref, id)) continue;
            updated = _ref[id];
            entity = this.entities[id];
            if (entity) {
              entity.uncompressPhysics(updated);
            } else if (this._isEntity(updated)) {
              this.entities[id] = entity = new cc.physics.Box2dEntity(updated, this.world);
              entity.id = id;
            } else {
              this.surfaces[id] = surface = new cc.physics.Box2dSurface(updated, this.world);
              surface.id = id;
            }
          }
        } else if (data.enabled != null) {
          this.enabled = data.enabled;
          if (this.enabled) {
            this.update();
          }
        } else if (data.config != null) {
          if (data.config.maxTick) {
            this.maxTick = data.config.maxTick;
          }
          if (data.config.gravity) {
            this.world.setGravity(data.config.gravity);
          }
        }
      }
    }));
  });

}).call(this);
(function() {
  var __hasProp = {}.hasOwnProperty;

  cc.module('cc.physics.Client').defines(function() {
    return this.set(cc.Class.extend({
      init: function(pixelScale, _onUpdate) {
        var _this = this;
        this.pixelScale = pixelScale != null ? pixelScale : 30;
        this._onUpdate = _onUpdate;
        cc.onVisibilityChange(function(state) {
          return _this.worker.postMessage({
            enabled: !state
          });
        });
      },
      sendConfig: function(opts) {
        this.worker.postMessage({
          config: opts
        });
      },
      run: function() {
        var _this = this;
        this.worker = new Worker('cc/physics.js');
        this.worker.onmessage = function(event) {
          return _this._onMessage(event.data);
        };
        this.worker.onerror = function(event) {
          return _this._onError(event);
        };
      },
      sendUpdates: function(updates) {
        var data, id, update;
        data = {};
        for (id in updates) {
          if (!__hasProp.call(updates, id)) continue;
          update = updates[id];
          data[id] = update.compressedPhysics();
        }
        this.worker.postMessage({
          u: data
        });
      },
      signalPaint: function() {
        this.worker.postMessage({
          p: 1
        });
      },
      _onMessage: function(msg) {
        if (msg.log && console.log) {
          console.log("from worker:", msg.log);
        } else if (msg.update) {
          this._onUpdate(msg.update, msg.tick);
        }
      },
      _onError: function(event) {
        if (console.log) {
          console.log("worker error:", event.message);
        }
      }
    }));
  });

}).call(this);
(function() {

  cc.module('cc.gamer').requires('cc.Core', 'cc.Image', 'cc.Entity', 'cc.Surface', 'cc.Resources', 'cc.LoadingScreen', 'cc.Sprite', 'cc.SpriteSheet', 'cc.Game', 'cc.Viewport', 'cc.Input', 'cc.SyncTimer', 'cc.Timer', 'cc.gl.Renderer', 'cc.gl.TextureAtlas', 'cc.gl.SpriteShaderProgram', 'cc.physics.Box2dEntity', 'cc.physics.Box2dSurface', 'cc.physics.Box2dWorld', 'cc.physics.Worker', 'cc.physics.Client').empty();

}).call(this);
