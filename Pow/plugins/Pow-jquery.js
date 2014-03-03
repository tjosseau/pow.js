
Pow.extend.jQuery = function() {

    jQuery.fn.wire = function($1, $2, $3) {
        var selector = this.selector.replace(/ /g, '^'),
            actions = $1.split(" "),
            action,
            wires = "" ;
        for (var a=0, al=actions.length ; a<al ; a++) {
            action = actions[a] ;
            wires += selector+':'+action+" " ;
            this.on(action, function() {
                Pow.pow(selector+':'+action, arguments) ;
            }) ;
        }
        wires = wires.substr(0, wires.length-1) ;

        var set = Pow.wire(wires, $2, $3) ;
        set.$ = this ;
        return set ;
    } ;

    jQuery.fn.unwire = function($1, $2) {
        var selector = this.selector.replace(/ /g, '^'),
            actions = $1.split(" "),
            action,
            wires = "" ;
        for (var a=0, al=actions.length ; a<al ; a++) {
            action = actions[a] ;
            wires += selector+':'+action+" " ;
            this.off(action) ;
        }
        wires = wires.substr(0, wires.length-1) ;

        var set = Pow.unwire(wires, $2) ;
        set.$ = this ;
        return set ;
    } ;
    
} ;
