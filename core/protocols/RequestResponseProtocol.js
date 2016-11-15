/**
 * Created by tolgahan on 09.11.2016.
 */
"use strict";

const Protocol = require('./../Protocol');
const errors = require('./../errors');
const stream = require('stream');
const Stream = stream.Stream;
const Disposable = require('./../Disposable');
const awync = require('awync');
const SopranoClient = require('../SopranoClient');

class RequestResponseProtocol extends Protocol {

    constructor(soprano){
        super(soprano, RequestResponseProtocol);
    }

    *_execute(data, options = void 0){
        let connection = yield this._connect(options);

        let output = yield connection.createOutput(this.createOutput());
        yield output.end(data);

        let input = yield connection.createInput(this.createInput());
        let result = yield input.whichever('error', 'data');

        yield result.args[0];
    }

    handover(connection){

        awync(function *(connection) {
            try{
                let input = yield connection.createInput(this.createInput());

                let event = yield input.whichever('error', 'data');
                let result = event.args[0];
                result = yield this.handle(result);

                let output = yield connection.createOutput(this.createOutput());
                yield output.end(result);
                yield awync.sleep();
                
            } catch (err){
                console.log(err);
            } finally {
                yield connection.end();
            }

        }.bind(this, connection));
    }

    *handle(data){
        yield data;
    }

    /**
     * @returns Stream
     */
    createInput(){
    }

    /**
     * @returns Stream
     */
    createOutput(){
    }


}

module.exports = RequestResponseProtocol;