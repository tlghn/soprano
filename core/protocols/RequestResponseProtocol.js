/**
 * Created by tolgahan on 09.11.2016.
 */
"use strict";

const Protocol = require('./../Protocol');
const awync = require('awync');
const SopranoClient = require('../SopranoClient');

class RequestResponseProtocol extends Protocol {

    /**
     * @param soprano {Soprano}
     */
    constructor(soprano){
        super(soprano, RequestResponseProtocol);
    }

    /**
     * @param data {*}
     * @param options {*|undefined}
     * @returns {*}
     * @private
     */
    *_execute(data, options = void 0){
        let connection = yield this._connect(options);

        let output = yield connection.createOutput(this.createOutput());
        yield output.end(data);
        yield output.release();

        let input = yield connection.createInput(this.createInput());
        let result = yield input.whichever('error', 'data');
        yield input.release();

        yield result.args[0];
    }

    /**
     * @param connection {SopranoClient}
     */
    handover(connection){

        awync(function *(connection) {
            try{
                let input = yield connection.createInput(this.createInput());

                let event = yield input.whichever('error', 'data');
                yield input.release();
                let result = event.args[0];
                result = yield this.handle(result, connection);

                let output = yield connection.createOutput(this.createOutput());
                yield output.end(result);
                yield output.release();
                yield awync.sleep();
                
            } catch (err){
                console.log(err);
            } finally {
                yield connection.end();
            }

        }.bind(this, connection));
    }

    /**
     * @param data {*}
     * @param sopranoClient {SopranoClient}
     * @returns {*}
     */
    *handle(data, sopranoClient){
        yield data;
    }
}

module.exports = RequestResponseProtocol;