/**
 * Pow Event manager
 *
 * @author      Thomas Josseau
 * @version     0.4.34
 * @date        2014.03.06
 * @link        https://github.com/tjosseau/objectyve
 *
 * @description
 *      Pow is a light library to manage custom events.
 */

(function(jsCore) {
    // "use strict" ; // Strict mode - Disabled in production

    var global, Pow ;
    switch (jsCore) {
        case 'client' : global = window ;       break ;     // Client side JavaScript
        case 'server' : global = GLOBAL ;       break ;     // Server side JavaScript (with Node.js)
        default :       global = {} ;           break ;     // Unknown context
    }

    var VERSION = [
            0,                      // Version of library's Core
            4,                      // Updates - Modifications
            4,                      // Minor updates - Corrections
            new Date(
                2014,               // Year \
                3               -1, // Month >---- of last update
                6                   // Day  /
            )
        ],

        COMMON = '_common_',

        echo = function()
        {
            if (console) console.log.apply(console, arguments) ;
            return arguments.length === 1 ? arguments[0] : arguments ;
        },

        is = {
            object : function(o) { return o != null && typeof o === 'object' && !is.array(o) ; },
            bool : function(o) { return typeof o === 'boolean' ; },
            array : function(o) { return Object.prototype.toString.call(o) === '[object Array]' ; },
            number : function(o) { return !isNaN(parseFloat(o)) && isFinite(o) ; },
            string : function(o) { return typeof o === 'string' ; },
            funct : function(o) { return typeof o === 'function' ; },
            container : function(o) { return is.object(o) || is.array(o) ; },
            empty : function(o) { for (undefined in o) return false ; return true ; },
            constructor : function(o) { return o === 'constructor' ; }
        },

        clone = function(object)
        {
            var newObject = {} ;
            for (var p in object) {
                if (is.object(object[p])) newObject[p] = clone(object[p]) ;
                else newObject[p] = object[p] ;
            }
            return newObject ;
        },

        copy = function(context, object)
        {
            for (var p in object) context[p] = object[p] ;
        },

        setOf = function(Constructor) {
            var Set = function(objs) {
                this.objects = {} ;
                copy(this.objects, objs) ;
            }
            Set.prototype = {
                get : function(name) {
                    return this.objects[name] ;
                },
                set : function(name, value) {
                    this.objects[name] = value ;
                },
                unset : function(name) {
                    delete this.objects[name] ;
                },
                each : function(fn, context) {
                    for (var o in this.objects) fn.call(context, o, this.objects[o]) ;
                }
            } ;
            for (var m in Constructor.prototype)
                (function(method) {
                    Set.prototype[method] = function() {
                        for (var w in this.objects)
                            this.objects[w][method].apply(this.objects[w], arguments) ;
                        return this ;
                    } ;
                })(m) ;
            return Set ;
        },

        parseStringSet = function(string) {
            var obj = {},
                names = string.split(" ") ;
            for (var n=0, nl=names.length ; n<nl ; n++)
                obj[names[n]] = null ;
            return obj ;
        },

        wires = {},

        Wire = (function() {
                var Wire = function(action) {
                    copy(this, {
                        state : true,
                        action : action,
                        listeners : {},
                        listener : COMMON,
                        called : 0,
                        asked : {},
                        ignored : {},
                        triggered : {}
                    }) ;
                    Object.defineProperty(this, 'listener', {
                        enumerable : false,
                        configurable : true
                    }) ;
                } ;
                copy(Wire, {
                    prototype : {
                        select : function(name) {
                            this.listener = this.listeners[name] ;
                            return this ;
                        },
                        on : function() {
                            if (!this.listener) return ;
                            this.listener.state = true ;
                            return this ;
                        },
                        off : function() {
                            if (!this.listener) return ;
                            this.listener.state = false ;
                            return this ;
                        },
                        once : function(value) {
                            if (!this.listener) return ;
                            this.listener.unique = value !== false ;
                            return this ;
                        },
                        safe : function(value) {
                            if (!this.listener) return ;
                            this.listener.safe = value !== false ;
                            return this ;
                        },
                        less : function(value) {
                            if (!this.listener) return ;
                            this.listener.async = value !== false ;
                            return this ;
                        }
                    },

                    parse : function(args) {
                        var listeners = COMMON,
                            fn ;
                        if (typeof args[1] === 'function') {
                            fn = args[1] ;
                        }
                        else if (typeof args[1] === 'string') {
                            listeners = args[1] ;
                            fn = args[2] ;
                        }

                        return {
                            actions : parseStringSet(args[0]),
                            listeners : parseStringSet(listeners),
                            fn : fn
                        } ;
                    },

                    init : function(action) {
                        if (!this.wires[action]) this.wires[action] = new Wire(action) ;
                        var wire = this.wires[action] ;

                        return {
                            action : action,
                            wire : wire,
                            listeners : wire.listeners
                        } ;
                    },

                    listen : function(action, l, fn) {
                        var wire = this.wires[action] ;
                        l = l ;

                        wire.asked[l] = wire.asked[l] || 0 ;
                        wire.ignored[l] = wire.ignored[l] || 0 ;
                        wire.triggered[l] = wire.triggered[l] || 0 ;

                        return {
                            listener : wire.listeners[l],
                            l : l,
                            fn : fn
                        } ;
                    }
                }) ;

                return Wire ;
            })(),

            WireSet = setOf(Wire),

            Listener = (function() {
                var Listener = function(wire, fn) {
                    copy(this, {
                        state : true,
                        unique : false,
                        async : false,
                        safe : false,
                        wire : wire,
                        fn : fn || function() {}
                    }) ;
                } ;
                Listener.prototype = {} ;
                return Listener ;
            })(),

            ListenerSet = setOf(Listener) ;

    Pow = global.Pow = {
        wires : wires,
        model : {
            Wire : Wire,
            Listener : Listener
        },

        pow : function(actions, args)
        {
            var wires = new WireSet(parseStringSet(actions)),
                __,
                listener ;
            args = args || [] ;

            wires.each(function(action) {
                __ = Wire.init.call(this, action) ;

                if (!__.wire.state) return ;
                __.wire.called++ ;

                for (var l in __.wire.listeners) {
                    listener = __.wire.listeners[l] ;

                    if (listener.state) {
                        if (listener.async) {
                            setTimeout(function() {
                                if (listener.safe) {
                                    try { listener.fn.apply({}, args) }
                                    catch (e) { console.info('/!\\ '+e) ; }
                                }
                                else {
                                    listener.fn.apply({}, args) ;
                                }
                            }, 0) ;
                        }
                        else {
                            if (listener.safe) {
                                try { listener.fn.apply({}, args) }
                                catch (e) { console.info('/!\\ '+e) ; }
                            }
                            else {
                                listener.fn.apply({}, args) ;
                            }
                        }

                        __.wire.triggered[l]++ ;
                        if (listener.unique) Pow.unwire.call(this, action, l) ;
                    }
                }
            }, this) ;
        },

        on : function(action)
        {
            var wires = new WireSet(Wire.parse(arguments).actions),
                __ ;

            wires.each(function(action) {
                __ = Wire.init.call(this, action) ;
                __.wire.state = true ;
            }, this) ;

            return this ;
        },

        off : function(action)
        {
            var wires = new WireSet(Wire.parse(arguments).actions),
                __ ;

            wires.each(function(action) {
                __ = Wire.init.call(this, action) ;
                __.wire.state = false ;
            }, this) ;

            return this ;
        },

        wire : function()
        {
            var args = Wire.parse(arguments),
                wires = new WireSet(args.actions),
                __ ;

            wires.each(function(action) {
                __ = Wire.init.call(this, action) ;
                wires.set(action, Pow.wires[action]) ;

                new ListenerSet(args.listeners).each(function(l) {
                    copy(__, Wire.listen.call(this, __.action, l, args.fn)) ;

                    if (__.fn) {
                        if (__.listener != null)
                            throw "Listener '"+__.l+"' is already wired to action '"+__.action+"'." ;

                        __.listeners[__.l] = new Listener(__.wire, __.fn) ;
                        __.wire.asked[__.l]++ ;
                    }

                    __.wire.select(__.l) ;
                }, this) ;
            }, this) ;

            return wires ;
        },

        unwire : function()
        {
            var args = Wire.parse(arguments),
                wires = new WireSet(args.actions),
                __ ;

            wires.each(function(action) {
                __ = Wire.init.call(this, action) ;
                wires.set(action, Pow.wires[action]) ;

                new ListenerSet(args.listeners).each(function(l) {
                    copy(__, Wire.listen.call(this, action, l, args.fn)) ;

                    if (__.l === true) __.listeners = {} ;
                    else delete __.wire.listeners[__.l] ;
                    __.wire.ignored[__.l]++ ;
                }, this) ;
            }, this) ;

            return wires ;
        },

        hasWire : function(action) {
            return wires[action] && !is.empty(wires[action].listeners) ;
        },

        setDefaultWire : function(name) {
            COMMON = name ;
        },

        extend : {
            String : function() {
                copy(global.String.prototype, {
                    pow : function() {
                        return Pow.pow(this.toString(), arguments) ;
                    },
                    wire : function($1, $2) {
                        return Pow.wire(this.toString(), $1, $2) ;
                    },
                    unwire : function($1) {
                        return Pow.unwire(this.toString(), $1) ;
                    }
                }) ;
            }
        }
    } ;
})(
    typeof window !== 'undefined' && window.document ? 'client'         // Web browser compatibility
  : typeof module !== 'undefined' && module.exports ? 'server'          // Node.js Server compatibility
  : 'undefined'                                                         // Undefined context
) ;
