/**
 * Pow Event manager
 *
 * @author      Thomas Josseau
 * @version     0.2.1
 * @date        2014.02.28
 * @link        https://github.com/tjosseau/objectyve
 *
 * @description
 *      Pow is a light library to manage custom events.
 */

(function(jsCore) {
    // "use strict" ; // Strict mode - Disabled in production

    var global ;
    switch (jsCore) {
        case 'client' : global = window ;       break ;     // Client side JavaScript
        case 'server' : global = GLOBAL ;       break ;     // Server side JavaScript (with Node.js)
        default :       global = {} ;           break ;     // Unknown context
    }

    var VERSION = [
            0,                      // Version of library's Core
            2,                      // Updates - Modifications
            1,                      // Minor updates - Corrections
            new Date(
                2014,               // Year \
                2               -1, // Month >---- of last update
                28                  // Day  /
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

        wires = {},

        Wire = (function() {
                var _Wire = function(action) {
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
                copy(_Wire, {
                    prototype : {
                        set : function(name) {
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
                        },
                        out : function() {
                            if (!this.listener) return ;
                            throw "Not yet..." ;
                            return this ;
                        }
                    },

                    init : function(action, args) {
                        action = action.toString() ;

                        if (!wires[action]) wires[action] = new Wire(action) ;
                        var wire = wires[action] ;

                        if (args) {
                            var parsedArgs = Wire.parse(args),
                                l = parsedArgs.listener ;
                            wire.asked[l] = wire.asked[l] || 0 ;
                            wire.ignored[l] = wire.ignored[l] || 0 ;
                            wire.triggered[l] = wire.triggered[l] || 0 ;
                            return {
                                action : action,
                                listener : wire.listeners[l],
                                l : l,
                                fn : parsedArgs.fn,
                                wire : wire,
                                listeners : wire.listeners
                            } ;
                        }
                        else {
                            return {
                                action : action,
                                wire : wire,
                                listeners : wire.listeners
                            } ;
                        }
                    },

                    parse : function(args) {
                        var listener,
                            fn ;
                        if (typeof args[0] === 'function') {
                            listener = COMMON ;
                            fn = args[0] ;
                        }
                        else if (typeof args[0] === 'string') {
                            listener = args[0] ;
                            fn = args[1] ;
                        }

                        return {
                            listener : listener,
                            fn : fn
                        } ;
                    }
                }) ;

                return _Wire ;
            })(),

            Listener = (function() {
                var _Listener = function(wire, fn) {
                    copy(this, {
                        state : true,
                        unique : false,
                        async : false,
                        safe : false,
                        wire : wire,
                        fn : fn || function() {}
                    }) ;
                } ;
                _Listener.prototype = {} ;
                return _Listener ;
            })()

    copy(String.prototype, {
        pow : function()
        {
            var __ = Wire.init(this),
                args = arguments ;

            if (!__.wire.state) return ;
            __.wire.called++ ;

            var listener ;
            for (var l in __.wire.listeners) {
                listener = __.wire.listeners[l] ;

                if (listener.state) {

                    if (listener.async) {
                        setTimeout(function() {
                            if (listener.safe) {
                                try { listener.fn.apply({}, args) }
                                catch (e) { console.info('/!\\ '+e) ; }
                            }
                            else listener.fn.apply({}, args) ;
                        }, 0) ;
                    }
                    else {
                        if (listener.safe) {
                            try { listener.fn.apply({}, args) }
                            catch (e) { console.info('/!\\ '+e) ; }
                        }
                        else listener.fn.apply({}, args) ;
                    }

                    __.wire.triggered[l]++ ;
                    if (listener.unique) __.action.unwire(l) ;
                }
            }

            return this ;
        },

        power : function(value)
        {
            Wire.init(this).wire.state = value == null ? true : !!value ;

            return this ;
        },

        wire : function()
        {
            var __ = Wire.init(this, arguments) ;

            if (__.listener != null)
                throw "Listener '"+__.l+"' is already wired to action '"+__.action+"'." ;

            __.listeners[__.l] = new Listener(__.wire, __.fn) ;
            __.wire.asked[__.l]++ ;

            __.wire.set(__.l) ;
            return __.wire ;
        },

        unwire : function()
        {
            var __ = Wire.init(this, arguments) ;

            if (__.l == null) delete __.listeners[COMMON] ;
            else if (__.l === true) __.listeners = {} ;
            else delete __.wire.listeners[__.l] ;
            __.wire.ignored[__.l]++ ;

            return __.wire ;
        }
    }) ;
    copy(String, {
        wires : wires,
        
        setDefault : function(name) {
            COMMON = name ;
        }
    }) ;
})(
    typeof window !== 'undefined' && window.document ? 'client'         // Web browser compatibility
  : typeof module !== 'undefined' && module.exports ? 'server'          // Node.js Server compatibility
  : 'undefined'                                                         // Undefined context
) ;
