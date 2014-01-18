(function (global) {

var app;

var VERSION = "0.1";

var Entropy = {
    getVersion: function () {
        return "v" + VERSION;
    }
};

/* -- pseudo-global helper functions -- */
/*  I call them pseudo global, cause they are visible only in the scope of Entropy modules,
    not in the global scope. */

function isString(val) {
    return typeof val === "string" || val instanceof String;
}

global["Entropy"] = app = Entropy;

(function (app) {
    /**
     * Easing functions by Robert Panner
     * http://www.robertpenner.com/easing/
     *
     * t: current time, b: beginning value, c: change in value, d: duration
     */

    app.Easing = {
        Linear: {
            In: function (t, b, c, d) {
                return c * t / d + b;
            }
        },
        Quadratic: {
            In: function (t, b, c, d) {
                t /= d;
                return c * t * t + b;
            },
            Out: function (t, b, c, d) {
                t /= d;
                return -c * t*(t-2) + b;
            },
            InOut: function (t, b, c, d) {
                t /= d / 2;
                if (t < 1) return c / 2 * t * t + b;
                t--;
                return -c / 2 * (t * (t - 2) - 1) + b;
            }
        },
        Cubic: {
            In: function (t, b, c, d) {
                t /= d;
                return c*t*t*t + b;
            },
            Out: function (t, b, c, d) {
                t /= d;
                t--;
                return c*(t*t*t + 1) + b;
            },
            InOut: function (t, b, c, d) {
                t /= d/2;
                if (t < 1) return c/2*t*t*t + b;
                t -= 2;
                return c/2*(t*t*t + 2) + b;
            }
        },
        Quartic: {
            In: function (t, b, c, d) {
                t /= d;
                return c*t*t*t*t + b;
            },
            Out: function (t, b, c, d) {
                t /= d;
                t--;
                return -c * (t*t*t*t - 1) + b;
            },
            InOut: function (t, b, c, d) {
                t /= d/2;
                if (t < 1) return c/2*t*t*t*t + b;
                t -= 2;
                return -c/2 * (t*t*t*t - 2) + b;
            }
        },
        Quintic: {
            In: function (t, b, c, d) {
                t /= d;
                return c*t*t*t*t*t + b;
            },
            Out: function (t, b, c, d) {
                t /= d;
                t--;
                return c*(t*t*t*t*t + 1) + b;
            },
            InOut: function (t, b, c, d) {
                t /= d/2;
                if (t < 1) return c/2*t*t*t*t*t + b;
                t -= 2;
                return c/2*(t*t*t*t*t + 2) + b;
            }
        },
        Sine: {
            In: function (t, b, c, d) {
                return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
            },
            Out: function (t, b, c, d) {
                return c * Math.sin(t/d * (Math.PI/2)) + b;
            },
            InOut: function (t, b, c, d) {
                return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
            }
        },
        Exponential: {
            In: function (t, b, c, d) {
                return c * Math.pow( 2, 10 * (t/d - 1) ) + b;
            },
            Out: function (t, b, c, d) {
                return c * ( -Math.pow( 2, -10 * t/d ) + 1 ) + b;
            },
            InOut: function (t, b, c, d) {
                t /= d/2;
                if (t < 1) return c/2 * Math.pow( 2, 10 * (t - 1) ) + b;
                t--;
                return c/2 * ( -Math.pow( 2, -10 * t) + 2 ) + b;
            }
        },
        Circular: {
            In: function (t, b, c, d) {
                t /= d;
                return -c * (Math.sqrt(1 - t*t) - 1) + b;
            },
            Out: function (t, b, c, d) {
                t /= d;
                t--;
                return c * Math.sqrt(1 - t*t) + b;
            },
            InOut: function (t, b, c, d) {
                t /= d/2;
                if (t < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
                t -= 2;
                return c/2 * (Math.sqrt(1 - t*t) + 1) + b;
            }
        }
    };


})(app);

(function (app) {
    var _component_manifest = {};
    var _system_manifest = {};
    var _entity_pattern = {};
    var _can_modify = true;
    var _next_c_id = 0;

    function Engine (game) {
        _can_modify = false;

        /**
         * Main game object reference.
         * @type {Game}
         */
        this.game = game;

        /**
         * Greatest entity id so far.
         * Variable is used to assign unique ids to new entities.
         * @type {Number}
         */
        this._greatest_e_id = 0;

        /**
         * Array with entity ids to reuse. These come from entities removals.
         * @type {Array}
         */
        this._e_ids_to_reuse = [];

        /**
         * 2D array with entity-component idicators. Values are simply true or false.
         * For example, if [2][3] == true, means, that entity with id 2 has component
         * with id 3. Components ids can be obtained via component manifest.
         * 
         * @type {Array}
         */
        this._entities = [];

        /**
         * Helper variable used to simplify using of add and remove methods.
         * It stores id of current worked on entity.
         * @type {Number}
         */
        this._current_e_id = null;

        /**
         * Counter of all entities present at the system.
         * @type {Number}
         */
        this._entities_count = 0;

        /**
         * 2D array similar to entities array. However, istead of bool values
         * it contains plain objects - real component instances. 
         * @type {Array}
         */
        this._components_index = [];

        /**
         * Component pool. Contains componet object that can be reused when creating 
         * or modifying entities. For more GC friendlyness.
         * @type {Array}
         */
        this._components_pool = [];

        /**
         * Size of component pool.
         * @type {Number}
         */
        this._components_pool_size = 0;
        //this._nodes = {};
        
        this._entities_pool = {};

        this._entities_pool_size = 0;
        /**
         * Ordered linked list with system instances. The update method iterates
         * through them on every tick and call their update method.
         * @type {OrderedLinkedList}
         */
        this._systems = new app.OrderedLinkedList();


        this._updating = false;

        this._families = {
            none: new app.Family("none")
        };

        this._entity_family_index = [];

        this._entities_to_remove = [];

        this._blank_family = new app.Family("empty");

        //initializing component pool
        for (var i = 0; i < _next_c_id; i += 1) {
            this._components_pool[i] = [];
        }
    }

    Engine.component = function (name, component) {
        if (!_can_modify) {
            app.Game.error("Entropy: you can't specify components during system work - do it before initialization.");
        }

        if (typeof name !== "string" && !(name instanceof String)) {
            app.Game.error("Entropy: component name should be string.");
        }

        if (typeof component !== "object") {
            app.Game.error("Entropy: component should be plain object.");
        }

        if (typeof _component_manifest[name] !== "undefined") {
            app.Game.error("Entropy: you can't specify same component twice.");
        }

        _component_manifest[name] = [
            _next_c_id,
            component
        ];

        //Entropy.trigger("componentadded", this._greatest_c_id);

        _next_c_id += 1;
    };

    Engine.system = function (name, system) {
        if (!_can_modify) {
            app.Game.error("Entropy: you can't specify systems during system work - do it before initialization.");
        }

        if (typeof name !== "string" && !(name instanceof String)) {
            app.Game.error("Entropy: system name should be string.");
        }

        if (typeof system !== "object") {
            app.Game.error("Entropy: system should be plain object.");
        }

        if (typeof _system_manifest[name] !== "undefined") {
            app.Game.error("Entropy: you can't specify same system twice.");
        }

        if (!("update" in system)) {
            app.Game.error("Entropy: system should specify 'update' method.");
        }

        _system_manifest[name] = system;
    };

    Engine.entity = function (name, family, pattern) {
        _entity_pattern[name] = {
            families: family.split("|"),
            pattern: pattern
        };
    };

    // Engine.node = function (name, node) {
    //     //_node_manifest[name] = node;
    // };

    Engine.prototype = {
        getComponentPattern: function (name) {
            return _component_manifest[name][1];
        },
        getNewComponent: function (name) {
            var id = _component_manifest[name][0];

            if (this._components_pool[id].length > 0) {
                this._components_pool_size -= 1;

                var new_component = this._components_pool[id].pop();
                new_component.deleted = false;

                return new_component;
            } else {
                return {
                    id: id,
                    name: name,
                    deleted: false
                };
            }
        },
        addComponentToPool: function (name, obj) {
            var id = _component_manifest[name][0];

            this._components_pool_size += 1;

            return this._components_pool[id].push(obj);
        },
        setComponentsIndex: function (e_id, c_id) {
            this._components_index[e_id][c_id] = true;
        },
        unsetComponentsIndex: function (e_id, c_id) {
            this._components_index[e_id][c_id] = false;
        },
        canModify: function () {
            return _can_modify;
        },
        create: function (name) {
/*
            if (typeof family !== "string") {
                app.Game.error("Entropy: family name should be string.");
            }*/
            var id;
            var e;
            var families;
            var i, max;
            var f;
            var args;

            if (arguments.length > 1) {
                args = Array.prototype.slice.call(arguments, 1);
                args.unshift(this.game);
            } else {
                args = [this.game];
            }

            if (this._e_ids_to_reuse.length !== 0) {
                id = this._e_ids_to_reuse.pop();
            } else {
                id = this._greatest_e_id;
                this._greatest_e_id += 1;

                this._components_index[id] = this._components_index[id] || [];
            }

            this._entities_pool[name] = this._entities_pool[name] || [];

            if (this._entities_pool[name].length > 0) {
                e = this._entities_pool[name].pop();

                e.setId(id);
                e.setRecycled();

                this._entities_pool_size -= 1;
            } else {
                this._entities_pool[name] = [];

                e = new app.Entity(id, name, this.game);
            }

            //applying creational function to entity object
            _entity_pattern[name].pattern.create.apply(e, args);

            this._entities[id] = e;

            families = _entity_pattern[name].families;

            max = families.length;
            for (i = 0; i < max; i += 1) {
                f = families[i];

                if (!this._families.hasOwnProperty(f)) {
                    this._families[f] = new app.Family(f);
                }

                this._families[f].append(e);
            }

            this._entity_family_index[id] = families;

            this._entities_count += 1;
        },
        remove: function (e) {
            var args;
            var id = e.id;
            var i, max;
            var f, e_f_id;
            var families = _entity_pattern[e.name].families;

            //already removed
            if (typeof this._entities[id] === "undefined") {
                
                return;
            }

            if (arguments.length > 1) {
                 args = Array.prototype.slice.call(arguments, 2);
                 args.unshift(this.game);
            } else {
                args = [this.game];
            }

            max = families.length;
            for (i = 0; i < max; i += 1) {
                f = families[i];

                this._families[f].remove(e);
            }

            _entity_pattern[e.name].pattern.remove  && _entity_pattern[e.name].pattern.remove.apply(e, args);

            //soft delete all components
            e.removeAllComponents(true);
            this._components_index[id].length = 0;

            this._entities_pool[e.name].push(e);
            this._entities_pool_size += 1;

            delete this._entities[id];

            this._e_ids_to_reuse.push(id);

            this._entities_count -= 1;
        },
        removeAllEntities: function () {

        },
        markForRemoval: function (e) {
            this._entities_to_remove.push(e);
        },
        getEntity: function (id) {
            if (typeof this._entities[id] !== "undefined") {
                return this._entities[id];
            } else {
                return null;
            }
        },
        getEntitiesWith: function (c_array) {
            var e_matched = [];
            var i, max1, max2;
            var e_id, c_id, found;

            c_array = c_array.map(function (name) {
                return _component_manifest[name][0];
            });

            max1 = this._components_index.length;
            for (e_id = 0; e_id < max1; e_id += 1) {
                found = 0;

                max2 = c_array.length;
                for (i = 0; i < max2; i += 1) {
                    c_id = c_array[i];

                    if (this._components_index[e_id][c_id]) {
                        found += 1;
                    }
                }

                if (found === c_array.length) {
                    e_matched.push(this._entities[e_id]); //copying temp array
                }
            }

            return e_matched;
        },
        getAllEntities: function () {
            return this._entities.map(function (entity) {
                return entity;
            });
        },
        getFamily: function (family) {
            if (!isString(family)) {
                app.Game.error("family name must be a string.");
            }

            if (!this._families.hasOwnProperty(family)) {
                //app.Game.log("there is no such family, empty array returned.");

                return this._blank_family;
            } else {
                return this._families[family];
            }
        },
        addSystem: function (name, priority) {
            var args = Array.prototype.slice.call(arguments, 2);

            var system = _system_manifest[name];

            system.game = this.game;
            system.engine = this;
            system._name = name;

            system.init && system.init.apply(system, args);

            this._systems.insert(system, priority);

            return this;
        },
        removeSystem: function (system) {
            if (!this.isUpdating()) {
                this._systems.remove(system);
            }

            return this;
        },
        removeAllSystems: function () {
            this._systems.clear();
        },
        isSystemActive: function (name) {
            var node = this._systems.head;

            while (node) {
                if (node.data._name === name) {
                    return true;
                }

                node = node.next;
            }

            return false;
        },
        update: function (delta, event) {
            this._updating = true;

            var node = this._systems.head;

            while (node) {
                node.data.update(delta, event);

                node = node.next;
            }

            node = this._systems.head;

            while (node) {
                node.data.afterUpdate && node.data.afterUpdate(delta, event);

                node = node.next;
            }

            for (var i = 0, max = this._entities_to_remove.length; i < max; i++) {
                this.remove(this._entities_to_remove[i]);
            }

            this._entities_to_remove.length = 0;

            //Entropy.trigger("updatecomplete");

            this._updating = false;
        },
        clear: function () {

        },
        isUpdating: function () {
            return this._updating;
        },
        getComponentPoolSize: function () {
            return this._component_pool_size;
        }
    };

    app["Engine"] = Engine;
})(app);

(function (app) {

    function Entity (id, name, game) {
        this.id = id;
        this.name = name;
        this.engine = game.engine;
        this.game = game;
        this.components = {};
        this.recycled = false;

        this.states = {
            default: {
                onEnter: function () {},
                onExit: function () {}
            }
        };

        this.current_state = "default";
    }

    var p = Entity.prototype;

    p.add = function (name) {
        var args = [];

        if (arguments.length > 1) {
            args = Array.prototype.slice.call(arguments, 1);
        }

        var lowercase_name = name.toLowerCase();

        var component_pattern = this.engine.getComponentPattern(name);
    
        if (!this.components.hasOwnProperty(lowercase_name)) {
            this.components[lowercase_name] = this.engine.getNewComponent(name);
        } else {
            if (!this.recycled) {
                app.Game.warning(" you are trying to add same component twice. Existing component will be overridden.");
            }
        }

        component_pattern.init.apply(
            this.components[lowercase_name],
            args
        );

        this.engine.setComponentsIndex(this.id, this.components[lowercase_name].id);

        return this;
    };

    p.remove = function (name, soft_delete) {
        var lowercase_name = name.toLowerCase();

        if (soft_delete && this.components[lowercase_name].deleted) {
            //nothing to soft delete
            return this;
        }

        if (this.components.hasOwnProperty(lowercase_name)) {
            var component_pattern = this.engine.getComponentPattern(name);

            if (!soft_delete) {
                this.engine.addComponentToPool(name, this.components[lowercase_name]);

                delete this.components[lowercase_name];
            } else {
                this.components[lowercase_name].deleted = true;
            }

            this.engine.unsetComponentsIndex(this.id, this.components[lowercase_name].id);
        }

        return this;
    };

    p.removeAllComponents = function (soft_delete) {
        for (var lowercase_name in this.components) {
            this.remove(this.components[lowercase_name].name, soft_delete);
        }

        return this;
    };

    p.setId = function (id) {
        this.id = id;
    };

    p.setRecycled = function () {
        this.recycled = true;
    };

    p.addState = function (name, obj) {
        if (!this.states.hasOwnProperty(name)) {
            this.states[name] = obj;
        } else {
            app.Game.warning("such state already exists.");
        }

        return this;
    };

    p.state = function (name) {
        var args = [];

        if (arguments.length > 1) {
            args = Array.prototype.slice.call(arguments, 1);
        }

        this.states[this.current_state].onExit.apply(
            this.states[this.current_state],
            args);

        this.current_state = name;

        return this;
    };


    app["Entity"] = Entity;

})(app);

(function (app) {

    function Node (data) {
        this.data = data;
        this.next = null;
    }

    function Family (name) {
        this.name = name;

        this.head = this.tail = null;

        this.break_iteration = false;
    }

    Family.prototype = {
        append: function (entity) {
            var node = new Node(entity);

            if (this.head === null) {
                this.head = node;
                this.tail = this.head;
            } else if (this.head.next === null) {
                this.head.next = node;
                this.tail = this.head.next;
            } else {
                this.tail.next = node;
                this.tail = node;
            }
        },
        remove: function (data) {
            var node = this.findPrecedingNode(data);

            if (node !== -1) {
                var obolete_node = node.next;
                node.next = node.next.next;

                //prepare for removal by GC
                obolete_node = null;
            }
        },
        findPrecedingNode: function (data) {
            var node = this.head;

            while (node) {
                if (data instanceof Node) {
                    if (node.next === data) { return node; }
                } else if (data instanceof app.Entity) {
                    if (node.next !== null && node.next.data === data) { return node; }
                } else {
                    return -1;
                }

                node = node.next;
            }

            return -1;
        },
        iterate: function (fn, binding) {
            binding = binding || (function () { return this; })();

            var node = this.head;

            while (node) {

                fn.call(binding, node.data, node.data.components, node, this);

                if (this.break_iteration) break;

                node = node.next;
            }

            this.break_iteration = false;
        },
        breakIteration: function () {
            this.break_iteration = true;
        },
        one: function () {
            return this.head.data;
        }
    };

    app["Family"] = Family;

})(app);

(function (app) {
    _consts = {};

    var _states = {
        dummy: {
            onEnter: function (game) {
                //dummy enter
            },
            onReturn: function (game) {
                //dummy return
            },
            onExit: function (game) {
                //dummy exit
            }
        }
    };

    var _current_state = "dummy";
    var _entered_states = {};
    var _e_patterns = {};

    function Game (starting_state) {
        this.input = new app["Input"](this);
        this.engine = new app["Engine"](this);
        this.ticker = new app["Ticker"](this);

        this.ticker.addListener(this.engine, this.engine.update);

        this.changeState(starting_state);
    }

    Game.addState = function (name, state_obj) {
        if (typeof name !== "string") {
            Game.error("state name should be type of string.");
        }

        _states[name] = state_obj;
    };

    Game.entityPattern = function (name, family, obj) {
        if (arguments.length !== 3) {
            Game.error("wrong number of arguments for ent. pattern.");
        }

        _e_patterns[name] = {
            family: family,
            pattern: obj
        };
    };

    Game.log = function (message) {
        console.log("Entropy: ", message);
    };

    Game.error = function (message) {
        throw new Error(["Entropy: ", message].join(" "));
    };

    Game.warning = function (message) {
        console.warn("Entropy: ", message);
    };

    Game.constans = function (name, value) {
        if (typeof name !== "string" || name === "") {
            Game.error("constans name should be non-empty string.");
        }

        name = name.toUpperCase();

        if (Game.hasOwnProperty(name)) {
            Game.error("can't define same constans twice.");
        } else {
            Object.defineProperty(Game, name, {
                value: value
            });
        }
    };

    Game.prototype = {
        
        changeState: function (name) {
            if (typeof name !== "string" || !(name in _states)) {
                Game.error("no such state or state name not a string.");
            }

            var args = Array.prototype.slice.call(arguments, 1);
            args.unshift(this);

            _states[_current_state].onExit.apply(_states[_current_state], args);
            

            if (name in _entered_states) {
                _current_state = name;
                _states[name].onReturn.apply(_states[name], args);
            } else {
                _current_state = name;
                _states[name].onEnter.apply(_states[name], args);
                _entered_states[name] = true;
            }
            

            console.log(_current_state);
        },
        setRenderer: function (renderer) {
            this.renderer = renderer;
        },
        setStage: function (stage) {
            this.stage = stage;
        },
        create: function (name) {
            var args = Array.prototype.slice.call(arguments, 1);

            this.engine.createEntity(_e_patterns[name]["family"]);

            return _e_patterns[name].pattern.create.apply(this.engine, args);
        },
        start: function () {
            this.ticker.start();

            Game.log("Game starded!");
        },
        pause: function () {
            this.ticker.pause();

            Game.log("Game paused!");
        },
        resume: function () {
            this.ticker.resume();

            Game.log("Game resumed!");
        }
    };

    app["Game"] = Game;
})(app);

(function (app) {
    //var key_names = ["BACKSPACE", "TAB", "ENTER", "SHIFT", "CTRL", "ALT", "PAUSE_BREAK", "CAPS_LOCK ", "ESCAPE", "SPACE", "PAGE_UP", "PAGE_DOWN", "END", "HOME", "LEFT_ARROW", "UP_ARROW", "RIGHT_ARROW", "DOWN_ARROW", "INSERT", "DELETE", "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "LEFT_WINDOW_KEY", "RIGHT_WINDOW_KEY", "SELECT_KEY", "NUMPAD_0", "NUMPAD_1", "NUMPAD_2", "NUMPAD_3", "NUMPAD_4", "NUMPAD_5", "NUMPAD_6", "NUMPAD_7", "NUMPAD_8", "NUMPAD_9", "MULTIPLY", "ADD", "SUBTRACT", "DECIMAL_POINT", "DIVIDE", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F1", "F11", "F12", "NUM_LOCK", "SCROLL_LOCK", "SEMI_COLON", "EQUAL_SIGN", "COMMA", "DASH", "PERIOD", "FORWARD_SLASH", "GRAVE_ACCENT", "OPEN_BRACKET", "BACK_SLASH", "CLOSE_BRAKET", "SINGLE_QUOTE"];

    var _keys = {
        "BACKSPACE": 8,
        "TAB": 9,
        "ENTER": 13,
        "SHIFT": 16,
        "CTRL": 17,
        "ALT": 18,
        "PAUSE_BREAK": 19,
        "CAPS_LOCK ": 20,
        "ESCAPE": 27,
        "SPACE": 32,
        "PAGE_UP": 33,
        "PAGE_DOWN": 34,
        "END": 35,
        "HOME": 36,
        "LEFT_ARROW": 37,
        "UP_ARROW": 38,
        "RIGHT_ARROW": 39,
        "DOWN_ARROW": 40,
        "INSERT": 45,
        "DELETE": 46,
        "0": 48,
        "1": 49,
        "2": 50,
        "3": 51,
        "4": 52,
        "5": 53,
        "6": 54,
        "7": 55,
        "8": 56,
        "9": 57,
        "A": 65,
        "B": 66,
        "C": 67,
        "D": 68,
        "E": 69,
        "F": 70,
        "G": 71,
        "H": 72,
        "I": 73,
        "J": 74,
        "K": 75,
        "L": 76,
        "M": 77,
        "N": 78,
        "O": 79,
        "P": 80,
        "Q": 81,
        "R": 82,
        "S": 83,
        "T": 84,
        "U": 85,
        "V": 86,
        "W": 87,
        "X": 88,
        "Y": 89,
        "Z": 90,
        "LEFT_WINDOW_KEY": 91,
        "RIGHT_WINDOW_KEY": 92,
        "SELECT_KEY": 93,
        "NUMPAD_0": 96,
        "NUMPAD_1": 97,
        "NUMPAD_2": 98,
        "NUMPAD_3": 99,
        "NUMPAD_4": 100,
        "NUMPAD_5": 101,
        "NUMPAD_6": 102,
        "NUMPAD_7": 103,
        "NUMPAD_8": 104,
        "NUMPAD_9": 105,
        "MULTIPLY": 106,
        "ADD": 107,
        "SUBTRACT": 109,
        "DECIMAL_POINT": 110,
        "DIVIDE": 111,
        "F1": 112,
        "F2": 113,
        "F3": 114,
        "F4": 115,
        "F5": 116,
        "F6": 117,
        "F7": 118,
        "F8": 119,
        "F9": 120,
        "F10": 121,
        "F11": 122,
        "F12": 123,
        "NUM_LOCK": 144,
        "SCROLL_LOCK": 145,
        "SEMI_COLON": 186,
        "EQUAL_SIGN": 187,
        "COMMA": 188,
        "DASH": 189,
        "PERIOD": 190,
        "FORWARD_SLASH": 191,
        "GRAVE_ACCENT": 192,
        "OPEN_BRACKET": 219,
        "BACK_SLASH": 220,
        "CLOSE_BRACKET": 221,
        "SINGLE_QUOTE": 222
    };

    var _pressed_keys = [];
    var _mouse_position = {
        x: 0,
        y: 0
    };

    function Input (game) {
        this.game = game;

        for (var i = 0; i < 256; i++) {
                _pressed_keys[i] = false;
            }

            window.addEventListener("keydown", function (e) {
                _pressed_keys[e.keyCode] = true;
            });

            window.addEventListener("keyup", function (e) {
                _pressed_keys[e.keyCode] = false;
            });
    }

    Input.prototype = {
        isPressed: function (name) {
            return _pressed_keys[_keys[name]];
        },
        getPressedKeys: function () {
            var keys = {};

            for (var name in _keys) {
                keys[name] = _pressed_keys[_keys[name]];
            }

            return keys;
        },
        setMouseStagePosition: function (position) {
            _mouse_position = position;
        },
        getMouseStagePosition: function () {
            return _mouse_position;
        }
    };

    app["Input"] = Input;
})(app);

/**
 * Ordered single linked list implementation.
 * 
 * @author "Tymoteusz Dzienniak"
 * @license MIT license
 */

(function (app) {

    /**
     * Linked list conctructor.
     * It initializes head and tail properties with null value.
     */
    function OrderedLinkedList () {
        this.head = this.tail = null;
    }

    /**
     * Returns node object.
     * @param {any} data data to store in node
     */
    var Node = function (data) {
        return {
            next: null,
            priority: null,
            data: data
        };
    };

    OrderedLinkedList.prototype = {

        /**
         * Adds new node at the end of the list.
         * Function is only a syntax sugar.
         * @param  {any} data any valid JavaScript data
         * @return {OrderedLinkedList} this
         */
        append: function (data) {
            return this.insert(data);
        },

        /**
         * Removes given node from list.
         * @param  {Node} node
         * @return {undefined}
         */
        remove: function (node) {
            if (node === this.head) {
                this.head = this.head.next;

                return this;
            }

            var i = this.head;

            while (i.next !== node) {
                i = i.next;
            }

            i.next = node.next;

            if (node === this.tail) {
                this.tail = i;
            }

            node = null;

            return this;
        },
        /**
         * Insert new node into list.
         * 
         * @param  {any} data     data to store in list node
         * @param  {number} priority [optional] if specified, function inserts data before node with higher priority
         * @return {object}       list instance             
         */
        insert: function (data, priority) {
            var node = Node(data);

            /*
             * list is empty
             */
            if (this.head === null) {
                node.priority = priority || 0;
                this.head = this.tail = node;

                return this;
            }

            var current = this.head;

            node.priority = priority || this.tail.priority;

            /*
             * list contains only one node (head === tail)
             */
            if (current.next === null) {
                if (current.priority <= node.priority) {
                    current.next = node;
                    this.tail = current.next;
                } else {
                    this.head = node;
                    this.head.next = this.tail = current;
                }

                return this;
            }

            /*
             * node priority is greater or equal tail priority
             * node should become tail
             */
            if (node.priority >= this.tail.priority) {
                this.tail.next = node;
                this.tail = node;

                return this;
            }

            /*
             * node priority is less than head priority
             * node should become head
             */
            if (node.priority < this.head.priority) {
                node.next = this.head;
                this.head = node;

                return this;
            }

            /*
             * list has more than one node
             */
            while (current.next !== null) { 
               if (current.next.priority > node.priority) {
                    node.next = current.next;
                    current.next = node;

                    break;
                }

                current = current.next;
            }

            return this;
        },
        /**
         * Iterates over all list nodes, starting from head, calling function for every node.
         * @param  {Function} fn [description]
         * @return {[type]}      [description]
         */
        iterate: function (fn) {
            for (var node = this.head; node; node = node.next) {
                fn(this, node);
            }
        },
        /**
         * Clears list.
         * @return {[type]} [description]
         */
        clear: function () {
            this.head = this.tail = null;
        }
    };

    app["OrderedLinkedList"] = OrderedLinkedList;
})(app);

/**
 * Ordered single linked list implementation.
 * 
 * @author "Tymoteusz Dzienniak"
 * @license MIT license
 */

(function (app) {

    /**
     * Linked list conctructor.
     * It initializes head and tail properties with null value.
     */
    function OrderedLinkedList () {
        this.head = this.tail = null;
    }

    /**
     * Returns node object.
     * @param {any} data data to store in node
     */
    var Node = function (data) {
        return {
            next: null,
            priority: null,
            data: data
        };
    };

    OrderedLinkedList.prototype = {

        /**
         * Adds new node at the end of the list.
         * Function is only a syntax sugar.
         * @param  {any} data any valid JavaScript data
         * @return {OrderedLinkedList} this
         */
        append: function (data) {
            return this.insert(data);
        },

        /**
         * Removes given node from list.
         * @param  {Node} node
         * @return {undefined}
         */
        remove: function (node) {
            if (node === this.head) {
                this.head = this.head.next;

                return this;
            }

            var i = this.head;

            while (i.next !== node) {
                i = i.next;
            }

            i.next = node.next;

            if (node === this.tail) {
                this.tail = i;
            }

            node = null;

            return this;
        },
        /**
         * Insert new node into list.
         * 
         * @param  {any} data     data to store in list node
         * @param  {number} priority [optional] if specified, function inserts data before node with higher priority
         * @return {object}       list instance             
         */
        insert: function (data, priority) {
            var node = Node(data);

            /*
             * list is empty
             */
            if (this.head === null) {
                node.priority = priority || 0;
                this.head = this.tail = node;

                return this;
            }

            var current = this.head;

            node.priority = priority || this.tail.priority;

            /*
             * list contains only one node (head === tail)
             */
            if (current.next === null) {
                if (current.priority <= node.priority) {
                    current.next = node;
                    this.tail = current.next;
                } else {
                    this.head = node;
                    this.head.next = this.tail = current;
                }

                return this;
            }

            /*
             * node priority is greater or equal tail priority
             * node should become tail
             */
            if (node.priority >= this.tail.priority) {
                this.tail.next = node;
                this.tail = node;

                return this;
            }

            /*
             * node priority is less than head priority
             * node should become head
             */
            if (node.priority < this.head.priority) {
                node.next = this.head;
                this.head = node;

                return this;
            }

            /*
             * list has more than one node
             */
            while (current.next !== null) { 
               if (current.next.priority > node.priority) {
                    node.next = current.next;
                    current.next = node;

                    break;
                }

                current = current.next;
            }

            return this;
        },
        /**
         * Iterates over all list nodes, starting from head, calling function for every node.
         * @param  {Function} fn [description]
         * @return {[type]}      [description]
         */
        iterate: function (fn) {
            for (var node = this.head; node; node = node.next) {
                fn(this, node);
            }
        },
        /**
         * Clears list.
         * @return {[type]} [description]
         */
        clear: function () {
            this.head = this.tail = null;
        }
    };

    app["OrderedLinkedList"] = OrderedLinkedList;
})(app);

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 
// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
 
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

// perf.now polyfill by Paul Irish
// relies on Date.now() which has been supported everywhere modern for years.
// as Safari 6 doesn't have support for NavigationTiming, we use a Date.now() timestamp for relative values
 
// if you want values similar to what you'd get with real perf.now, place this towards the head of the page
// but in reality, you're just getting the delta between now() calls, so it's not terribly important where it's placed
 
(function(){
 
  // prepare base perf object
  if (typeof window.performance === 'undefined') {
      window.performance = {};
  }
 
  if (!window.performance.now){
    
    var nowOffset = Date.now();
 
    if (performance.timing && performance.timing.navigationStart){
      nowOffset = performance.timing.navigationStart;
    }
 
 
    window.performance.now = function now(){
      return Date.now() - nowOffset;
    };
 
  }
 
})();

(function (app) {
    var FPS = 60,
        MAX_FRAME_TIME = 1000 / FPS * 2,
        _paused = false,
        _ticks = 0,
        callbacks = [],
        raf = window.requestAnimationFrame,
        last_time_value = 0,
        is_running = false,
        currentFPS = FPS,
        _raf_id = 0;

    var event = {};

    function Ticker (game) {
        this.game = game;
    }

    function tick (time) {
        raf(tick);

        if (_paused) {
            is_running = false;
            return;
        }

        time = time || performance.now();

        var delta = time - last_time_value;

        if (delta >= MAX_FRAME_TIME) {
            delta = 1000 / FPS;
        }

        last_time_value = time;

        /*if (_ticks % FPS === 0) {
            currentFPS = 1000 / delta;
        }*/

        event.delta = delta;
        event.ticks = _ticks;
        event.paused = _paused;

        for (var i = 0, len = callbacks.length; i < len; i++) {
            callbacks[i][1].call(callbacks[i][0], delta, event);
        }

        _ticks++;
    }

    Ticker.prototype = {
        /*currentFPS: function () {
            return Math.round(currentFPS);
        },*/
        setFPS: function (fps) {
            FPS = fps || FPS;
        },
        getFPS: function () {
            return FPS;
        },
        getTicks: function () {
            return _ticks;
        },
        pause: function () {
            _paused = true;

            //cancelAnimationFrame(_raf_id);
        },
        resume: function () {
            if (_paused && !is_running) {
                is_running = true;
                _paused = false;
            }
        },
        addListener: function (that, callback) {
            callbacks.push([that, callback]);
        },
        start: function () {
            _raf_id = raf(tick);
        }
    };

    app["Ticker"] = Ticker;
})(app);

(function (app) {

    function degToRad(degrees) {
        return degrees * Math.PI / 180;
    }

    function radToDeg(radians) {
        return radians * 180 / Math.PI;
    }

    var Vector = function (coords) {
        if (Object.prototype.toString.call(coords) === "[object Array]") {
            this.x = coords[0];
            this.y = coords[1];
            this.updatePolarCoords();
        } else if (typeof coords === 'object') {
            if (typeof coords.x === 'undefined') { //podano wspórzędne biegunowe
                this.angle = 0;
                this.rotate(coords.angle);

                this.length = coords.length;

                //uzupełnianie wspórzędnych kartezjańskich
                this.updateCartCoords();
            } else { //podano wspórzędne kartezjańskie
                this.x = coords.x;
                this.y = coords.y;

                //uzupełnianie współrzędnych biegunowych
                this.updatePolarCoords();
            }
        } else {
            throw new Error('Podałeś zły format współrzędnych!');
        }
    };

    var v = Vector.prototype;

    v.rotate = function (angle, return_new) {
        angle %= 360;
        return_new = return_new || false;

        if (return_new) {
            return new Vector({length: this.length, angle: this.angle + angle});
        } else {
            this.angle += angle;
            this.angle %= 360;

            this.updateCartCoords();

            return this;
        }
    };

    v.rotateRad = function (angle, return_new) {
        angle = angle % (2 * Math.PI);
        return_new = return_new || false;

        if (return_new) {
            return new Vector({length: this.length, angle: this.angle + radToDeg(angle)});
        } else {
            this.rotate(radToDeg(angle));

            return this;
        }
    };

    v.add = function (vector, return_new) {
        return_new = return_new || false;
        var x, y;

        if (Object.prototype.toString.call(vector) === "[object Array]") {
            x = vector[0];
            y = vector[1];
        } else if (typeof vector === 'object') {
            x = vector.x;
            y = vector.y;
        } else {
            throw new Error('Zły parametr.');
        }

        if (return_new) { //zwraca nowy wektor, nie modyfikuje obecnego
            return new Vector([this.x + x, this.y + y]);
        } else {
            this.x += x;
            this.y += y;

            this.updatePolarCoords();

            return this;
        }
    };

    v.scale = function (scalar, return_new) {
        return_new = return_new || false;

        if (return_new) { //zwraca nowy wektor, nie modyfikuje obecnego
            return new Vector([this.x * scalar, this.y * scalar]);
        } else {
            this.x *= scalar;
            this.y *= scalar;

            this.updatePolarCoords();
        }

        return this;
    };

    v.setAngle = function (angle, return_new) {
        return_new = return_new || false;

        if (return_new) {
            return new Vector({length: this.length, angle: angle});
        } else {
            this.angle = 0;
            this.rotate(angle);

            return this;
        }
    };

    v.getRadAngle = function () {
        return degToRad(this.angle);
    };

    v.truncate = function (desiredLength, return_new) {
        return_new = return_new || false;

        if (return_new) { //zwraca nowy wektor, nie modyfikuje obecnego
            return new Vector({
                angle: this.angle,
                length: desiredLength
            });
        } else {
            this.length = desiredLength;
            this.updateCartCoords();
        }

        return this;
    };

    v.normalize = function (return_new) {
        return this.truncate(1, return_new);
    };

    v.substract = function (vector, return_new) {
        return_new = return_new || false;
        var x, y;

        if (Object.prototype.toString.call(vector) === "[object Array]") {
            x = vector[0];
            y = vector[1];
        } else if (typeof vector === 'object') {
            x = vector.x;
            y = vector.y;
        } else {
            throw new Error('Zły parametr.');
        }

        if (return_new) { //zwraca nowy wektor, nie modyfikuje obecnego
            return new Vector([this.x - x, this.y - y]);
        } else {
            this.x -= x;
            this.y -= y;

            this.updatePolarCoords();

            return this;
        }
    };

    v.dot = function (vector) {
        var scalar;

        if (Object.prototype.toString.call(vector) === "[object Array]") {
            scalar = this.x * vector[0] + this.y * vector[1];
        } else if (typeof vector === 'object') {
            scalar = this.x * vector.x + this.y * vector.y;
        } else {
            throw new Error('Zły parametr.');
        }

        return scalar;
    };

    v.reverseX = function (return_new) {
        return_new = return_new || false;

        if (return_new) {
            return new Vector([-this.x, this.y]);
        } else {
            this.x = -this.x;
            this.updatePolarCoords();
        }
    };

    v.reverseY = function (return_new) {
        return_new = return_new || false;

        if (return_new) {
            return new Vector([this.x, -this.y]);
        } else {
            this.y = -this.y;
            this.updatePolarCoords();
        }
    };

    v.reverseBoth = function (return_new) {
        return_new = return_new || false;

        if (return_new) {
            return new Vector([-this.x, -this.y]);
        } else {
            this.x = -this.x;
            this.y = -this.y;
            this.updatePolarCoords();
        }

        return this;
    };

    v.minAngleTo = function (vector) {
        if (this.angle < 0) {
            this.angle += 360;
        }

        if (vector.angle < 0) {
            vector.angle += 360;
        }

        var angle = vector.angle - this.angle;

        if (angle > 180) {
            angle = 360 + this.angle - vector.angle;
        } else if (angle < -180) {
            angle = 360 - this.angle + vector.angle;
        }

        return angle;
    };

    v.negate = function (return_new) {
        return this.reverseBoth(return_new);
    };

    v.clone = function () {
        return new Vector([this.x, this.y]);
    };

    v.updatePolarCoords = function () {
        this.length = Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));

        this.angle = 0;
        this.rotate(radToDeg(Math.atan2(this.y, this.x) + 2 * Math.PI));
    };

    v.updateCartCoords = function () {
        this.x = Math.cos(degToRad(this.angle)) * this.length;
        this.y = Math.sin(degToRad(this.angle)) * this.length;
        //this.y = (this.angle === 180 || this.angle === -180) ? 0 : Math.sin(this.angle * Math.PI / 180) * this.length
    };

    v.debug = function () {
        return "x: " + this.x + ", y: " + this.y + ", angle: " + this.angle + ", length: " + this.length;
    };

    app["Vector"] = Vector;
})(app);

})(this);