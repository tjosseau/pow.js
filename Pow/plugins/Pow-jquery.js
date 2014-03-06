
Pow.extend.jQuery = function() {

    jQuery.fn.wire = function($1, $2, $3) {
        var selector = this.selector.replace(/ /g, '^'),
            actions = $1.split(" "),
            wires = "" ;

        for (var a=0, al=actions.length ; a<al ; a++) {
            wires += selector+':'+actions[a]+" " ;
            if (!Pow.hasWire(selector+':'+actions[a]))
                this.on(actions[a], (function(_action) {
                    return function() {
                        Pow.pow(selector+':'+_action, arguments) ;
                    } ;
                })(actions[a])) ;
        }
        wires = wires.substr(0, wires.length-1) ;

        var set = Pow.wire(wires, $2, $3) ;
        set.$ = this ;
        return this.wires = set ;
    } ;

    jQuery.fn.unwire = function($1, $2) {
        var selector = this.selector.replace(/ /g, '^'),
            actions = $1.split(" "),
            wires = "",
            a,
            al ;

        for (a=0, al=actions.length ; a<al ; a++)
            wires += selector+':'+actions[a]+" " ;
        wires = wires.substr(0, wires.length-1) ;

        var set = Pow.unwire(wires, $2) ;
        set.$ = this ;

        for (a=0, al=actions.length ; a<al ; a++)
            if (!Pow.hasWire(selector+':'+actions[a]))
                this.off(actions[a]) ;

        return this.wires = set ;
    } ;
    
} ;
