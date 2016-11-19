/**
 * Created by tolgahan on 09.11.2016.
 */
"use strict";

const Protocol = require('./../Protocol');
const awync = require('awync');
const SopranoClient = require('../SopranoClient');
const debug = require('../debug')();

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

        debug('%s >> initialize request', this.constructor.name);

        let middleWares = this.middleWares;
        for(let middleWare of middleWares){
            data = yield middleWare(data);
        }

        let connection = yield this._connect(options);

        let output = yield connection.createOutput(this.createOutput());
        yield output.end(data);

        debug('%s >> request sent to %s:%s', this.constructor.name, connection.remoteAddress, connection.remotePort);

        let input = yield connection.createInput(this.createInput());
        let value = yield input.read();
        yield input.release();

        debug('%s >> reply received from %s:%s', this.constructor.name, connection.remoteAddress, connection.remotePort);
        yield value;
    }

    /**
     * @param connection {SopranoClient}
     */
    handover(connection){

        awync(function *(connection) {
            let ip = connection.remoteAddress;
            let port = connection.remotePort;
            debug('%s >> connection accepted from %s:%s', this.constructor.name, ip, port);
            try{
                let input = yield connection.createInput(this.createInput());
                let result = yield input.read();
                yield input.release();
                debug('%s >> request received from %s:%s', this.constructor.name, ip, port);

                try{
                    yield awync.captureErrors;
                    let middleWares = this.middleWares;
                    for(let middleWare of middleWares){
                        result = yield middleWare(result, connection);
                    }
                    result = yield this.handle(null, result, connection);
                    yield awync.releaseErrors;
                } catch (err){
                    result = yield this.handle(err, result, connection);
                }

                let output = yield connection.createOutput(this.createOutput());
                yield output.end(result);
                debug('%s >> reply sent to %s:%s', this.constructor.name, ip, port);

            } catch (err){
                debug('%s >> %s %s:%s', this.constructor.name, err, ip, port);
            } finally {
                yield connection.end();
                debug('%s >> disconnected from %s:%s', this.constructor.name, ip, port);
            }
        }.bind(this, connection));
    }

    /**
     * @param err;
     * @param data {*}
     * @param sopranoClient {SopranoClient}
     * @returns {*}
     */
    *handle(err, data, sopranoClient){
        yield err || data;
    }
}

module.exports = RequestResponseProtocol;