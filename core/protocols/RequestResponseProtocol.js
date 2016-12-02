/**
 * Created by tolgahan on 09.11.2016.
 */
"use strict";

const Protocol = require('./../Protocol');
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
    async _execute(data, options = void 0, writeHeader = true, requestOptions = void 0){

        debug('%s >> initialize request', this.constructor.name);

        let middleWares = this.middleWares;
        for(let middleWare of middleWares){
            data = await middleWare(data);
        }

        let connection = await this._connect(options, writeHeader);

        let request = this.createOutput(connection, requestOptions);
        let output = await connection.createOutput(request);
        await output.end(data);

        debug('%s >> request sent to %s:%s', this.constructor.name, connection.remoteAddress, connection.remotePort);

        let input = await connection.createInput(this.createInput(connection, request));
        let value = await input.read();
        await input.release();

        debug('%s >> reply received from %s:%s', this.constructor.name, connection.remoteAddress, connection.remotePort);
        return value;
    }

    /**
     * @param connection {SopranoClient}
     * @param header {Buffer}
     */
    handover(connection, header){
        
        ((async function (connection, header) {
            let ip = connection.remoteAddress;
            let port = connection.remotePort;
            debug('%s >> connection accepted from %s:%s', this.constructor.name, ip, port);
            try{
                let request = this.createInput(connection, header);
                let input = await connection.createInput(request);
                let result = await input.read();
                await input.release();
                debug('%s >> request received from %s:%s', this.constructor.name, ip, port);

                try{
                    let middleWares = this.middleWares;
                    for(let middleWare of middleWares){
                        result = await middleWare(result, connection);
                    }
                    result = await this.handle(null, result, connection);
                } catch (err){
                    result = await this.handle(err, result, connection);
                }

                let output = await connection.createOutput(this.createOutput(connection, request));
                await output.end(result);
                debug('%s >> reply sent to %s:%s', this.constructor.name, ip, port);

            } catch (err){
                debug('%s >> %s %s:%s', this.constructor.name, err, ip, port);
            } finally {
                await connection.end();
                debug('%s >> disconnected from %s:%s', this.constructor.name, ip, port);
            }
        }).bind(this, connection, header))();
    }

    //noinspection JSMethodCanBeStatic
    /**
     * @param err;
     * @param data {*}
     * @param sopranoClient {SopranoClient}
     * @returns {*}
     */
    async handle(err, data, sopranoClient){
        return err || data;
    }
}

module.exports = RequestResponseProtocol;