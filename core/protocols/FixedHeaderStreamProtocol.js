/**
 * Created by tolgahan on 17.11.2016.
 */

"use strict";
const SP = require('./StreamProtocol');
const Symbols = require('../symbols');
const errors = require('../errors');
const fixedHeaderProtocol = require('../mixins/fixedHeaderProtocol');

class FixedHeaderStreamProtocol extends SP {
    /**
     * @param soprano {Soprano}
     * @param header {Buffer}
     */
    constructor(soprano, header){
        super(soprano);
        this._initFixedHeader(header);
    }
}

fixedHeaderProtocol(FixedHeaderStreamProtocol);

module.exports = FixedHeaderStreamProtocol;