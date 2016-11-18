/**
 * Created by tolgahan on 18.11.2016.
 */
"use strict";

class Id {
    constructor(max = 1000000){
        this._max = max;
        this._current = 0;
    }

    next(){
        let id = this._current++;
        this._current %= this._max;
        return id;
    }
}

module.exports = Id;