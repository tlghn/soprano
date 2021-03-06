/**
 * Created by tolgahan on 14.11.2016.
 */

"use strict";
const RRP = require('./RequestResponseProtocol');
const Symbols = require('../symbols');
const errors = require('../errors');
const fixedHeaderProtocol = require('../mixins/fixedHeaderProtocol');

class FixedHeaderRequestResponseProtocol extends RRP {
    /**
     * @param soprano {Soprano}
     * @param header {Buffer}
     */
    constructor(soprano, header){
        super(soprano);
        this._initFixedHeader(header);
    }
}

fixedHeaderProtocol(FixedHeaderRequestResponseProtocol);

module.exports = FixedHeaderRequestResponseProtocol;