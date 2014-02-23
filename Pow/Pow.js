/**
 * Pow Event manager
 *
 * @author      Thomas Josseau
 * @version     0.1.1
 * @date        2014.02.23
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
            1,                      // Updates - Modifications
            1,                      // Minor updates - Corrections
            new Date(
                2014,               // Year \
                2               -1, // Month >---- of last update
                23                  // Day  /
            )
        ],

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
        wires_stats = {},
        model = {
            wire : {
                state : true,
                listeners : {}
            },
            wire_stats : {
                triggered : 0,
                listeners : {}
            },
            listener : {
                state : true,
                fn : null,
                unique : false
            }
        },

        init = function(action) {
            action = action.toString() ;
            if (wires[action]) return action ;

            wires[action] = clone(model.wire) ;
            wires_stats[action] = clone(model.wire_stats) ;

            return action ;
        },

        wireParse = function(args) {
            var listener,
                fn ;
            if (typeof args[0] === 'function') {
                listener = 'common' ;
                fn = args[0] ;
            }
            else if (typeof args[0] === 'string' && typeof args[1] === 'function') {
                listener = args[0] ;
                fn = args[1] ;
            }

            return {
                listener : listener,
                fn : fn
            } ;
        } ;

    copy(String.prototype, {
        wires : wires,
        wires_stats : wires_stats,

        pow : function()
        {
            var action = init(this),
                listener ;

            if (!wires[action].state) return ;

            for (var l in wires[action].listeners) {
                listener = wires[action].listeners[l] ;
                if (listener.state)  {
                    listener.fn.apply({}, arguments) ;
                    wires_stats[action].listeners[l]++ ;
                    if (listener.unique) action.unwire(l) ;
                }
            }

            wires_stats[action].triggered++ ;

            return this ;
        },

        powoff : function()
        {
            wires[init(this)].state = false ;
            return this ;
        },

        powon : function()
        {
            wires[init(this)].state = true ;
            return this ;
        },

        wire : function()
        {
            var action = init(this, true),
                args = wireParse(arguments),
                listener = args.listener,
                listeners = wires[action].listeners,
                fn = args.fn,
                stats ;

            if (listeners[listener] != null)
                throw "Listener '"+listener+"' is already wired to action '"+action+"'." ;

            listeners[listener] = clone(model.listener) ;
            listeners[listener].fn = fn ;

            stats = wires_stats[action].listeners ;
            stats[listener] = 0 ;

            return this ;
        },

        wireonce : function()
        {
            var action = init(this),
                args = wireParse(arguments),
                listener = args.listener,
                fn = args.fn,
                stats ;
            
            wires[action].listeners[listener] = clone(model.listener) ;
            wires[action].listeners[listener].fn = fn ;
            wires[action].listeners[listener].unique = true ;

            stats = wires_stats[action].listeners ;
            stats[listener] = (stats[listener] || 0)+1 ;

            return this ;
        },

        unwire : function(listener)
        {
            var action = init(this) ;

            if (listener == null) delete wires[action].listeners['common'] ;
            else if (listener === true) wires[action].listeners = {} ;
            else delete wires[action].listeners[listener] ;

            return this ;
        },

        wireoff : function(listener)
        {
            var action = init(this) ;

            if (listener == null) wires[action].listeners['common'].state = false ;
            else if (listener === true)
                for (var l in wires[action].listeners)
                    wires[action].listeners[l].state = false ;
            else wires[action].listeners[listener].state = false ;

            return this ;
        },

        wireon : function(listener)
        {
            var action = init(this) ;

            if (listener == null) wires[action].listeners['common'].state = true ;
            else if (listener === true)
                for (var l in wires[action].listeners)
                    wires[action].listeners[l].state = true ;
            else wires[action].listeners[listener].state = true ;

            return this ;
        }
    }) ;
})(
    typeof window !== 'undefined' && window.document ? 'client'         // Web browser compatibility
  : typeof module !== 'undefined' && module.exports ? 'server'          // Node.js Server compatibility
  : 'undefined'                                                         // Undefined context
) ;
