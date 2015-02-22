'use strict';

var is = require('check-types');
var debug = require('../debug');
var extend = require('node.extend');
var config = require('../config');
var register = require('./register');
var slice = Array.prototype.slice;

var EventEmitter = require('./event');
var BitSet = require('bitset.js').BitSet;

function Entity(name, pattern, engine) {
    EventEmitter.call(this);

    this.engine = engine;
    this.pattern = pattern;

    this.bitset = new BitSet(config('max_components_count'));
    this._modifications = [];

    this.id = 0;
    this.name = name;
    this.components = {};

    this._setDefaults();
}

extend(Entity.prototype, EventEmitter.prototype);
extend(Entity.prototype, {
    add: function (name) {
        if (is.not.unemptyString(name)) {
            debug.warn('component name must be a non-empty string');
            return this;
        }

        var lowercaseName = name.toLowerCase();

        var component = this.engine._getNewComponent(lowercaseName);
        if (component == null) {
            debug.warn('there is no component pattern with name %s', name);
            return this;
        }

        var args = slice.call(arguments, 1);
        component._pattern.initialize.apply(component, args);

        this.components[lowercaseName] = component;

        this._modifications.push({
            fn: function () {
                this.bitset.set(register.getComponentID(lowercaseName));
            }
        });

        this.engine.markModifiedEntity(this);

        return this;
    },
    remove: function (name) {
        if (is.not.unemptyString(name)) {
            debug.warn('component name must be a non-empty string');
            return this;
        }

        var lowercaseName = name.toLowerCase();

        if (!(lowercaseName in this.components)) {
            debug.warn('this entity does not have such component "%s" - nothing to remove', name);
            return this;
        }

        this._modifications.push({
            fn: function () {
                this.engine._addComponentToPool(this.components[lowercaseName]);

                this.components[lowercaseName] = null;
                this.bitset.clear(register.getComponentID(lowercaseName));
            }
        });

        this.engine.markModifiedEntity(this);

        return this;
    },
    get: function (name) {
         if (is.not.unemptyString(name)) {
            debug.warn('component name must be a non-empty string');
            return this;
        }

        return this.components[name.toLowerCase()];
    },
    reset: function () {
        if (is.function(this._pattern.reset)) {
            this.pattern.reset.call(this, this.engine.game);
        }

        this._setDefaults();

        return this;
    },
    applyModifications: function () {
        var mod;

        while (mod = this._modifications.shift()) {
            mod.fn.apply(this, mod.args);
        }
    },
    clearModifications: function () {
        while (this._modifications.shift());
    },
    _setDefaults: function () {
        this._inFinalState = false;
        this._remainingStateChanges = [];
        this._stateObject = {};
        this._currentStates = [];
        this._stateChanges = [];
    }
});

module.exports = Entity;