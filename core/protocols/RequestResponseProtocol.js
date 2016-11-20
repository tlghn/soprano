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
     * @param options {*}
     * @param writeHeader {boolean}
     * @param requestOptions {*}
     * @returns {*}
     * @private
     */
    *_execute(data, options = void 0, writeHeader = true, requestOptions = void 0){

        debug('%s >> initialize request', this.constructor.name);

        let middleWares = this.middleWares;
        for(let middleWare of middleWares){
            data = yield middleWare(data);
        }

        let connection = yield this._connect(options, writeHeader);

        let request = this.createOutput(connection, requestOptions);
        let output = yield connection.createOutput(request);
        yield output.end(data);

        debug('%s >> request sent to %s:%s', this.constructor.name, connection.remoteAddress, connection.remotePort);

        let input = yield connection.createInput(this.createInput(connection, request));
        let value = yield input.read();
        yield input.release();

        debug('%s >> reply received from %s:%s', this.constructor.name, connection.remoteAddress, connection.remotePort);
        yield value;
    }

    /**
     * @param connection {SopranoClient}
     * @param header {Buffer}
     */
    handover(connection, header){

        awync(function *(connection, header) {
            yield awync.captureErrors;
            let ip = connection.remoteAddress;
            let port = connection.remotePort;
            debug('%s >> connection accepted from %s:%s', this.constructor.name, ip, port);
            try{
                let request = this.createInput(connection, header);
                let input = yield connection.createInput(request);
                let result = yield input.read();
                yield input.release();
                debug('%s >> request received from %s:%s', this.constructor.name, ip, port);

                try{
                    let middleWares = this.middleWares;
                    for(let middleWare of middleWares){
                        result = yield middleWare(result, connection);
                    }
                    result = yield this.handle(null, result, connection);
                } catch (err){
                    result = yield this.handle(err, result, connection);
                }

                let output = yield connection.createOutput(this.createOutput(connection, request));
                yield output.end(result);
                debug('%s >> reply sent to %s:%s', this.constructor.name, ip, port);

            } catch (err){
                debug('%s >> %s %s:%s', this.constructor.name, err, ip, port);
            } finally {
                yield connection.end();
                debug('%s >> disconnected from %s:%s', this.constructor.name, ip, port);
            }
        }.bind(this, connection, header));
    }

    //noinspection JSMethodCanBeStatic
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