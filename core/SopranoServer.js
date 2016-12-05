/**
 * Created by tolgahan on 09.11.2016.
 */
"use strict";

const Slave = require('./Slave');
const Symbols = require('./symbols');
const SocketFactory = require('./SocketFactory');
const Server = SocketFactory.Server;
const EventBridge = require('./EventBridge');
const errors = require('./errors');
const SopranoClient = require('./SopranoClient');
const Protocol = require('./Protocol');
const stream = require('stream');
const Disposable = require('./Disposable');
const Reader = require('./Reader');
const Writer = require('./Writer');

class SopranoServer extends Slave {

    constructor(soprano, options){
        super(soprano);
        this.setResource(Symbols.options, options);
    }

    async _handleBridgedEvent(source, name, args){
        switch (name){
            case 'connection':
                let client = args[0];
                client.setNoDelay(true);

                try{
                    let reader = new Reader(client);
                    let protocols = this.soprano.protocols;
    
                    let minHeaderLength = await protocols.getMinHeaderLength();
                    let maxHeaderLength = await protocols.getMaxHeaderLength();
    
                    let headerBytes = Buffer.alloc(maxHeaderLength);
                    let headerPos = 0;
                    let protocol = null;
    
                    while (!protocol){
                        let chunk = await reader.read(minHeaderLength);

                        if(headerPos > maxHeaderLength){
                            headerBytes = Buffer.concat([headerBytes, chunk]);
                        } else {
                            chunk.copy(headerBytes, headerPos);
                            headerPos += chunk.length;
                            minHeaderLength = 1;
                        }

                        let matchResult = await protocols.matchHeader(headerBytes, 0, headerPos);
                        if(matchResult === false){
                            continue;
                        }

                        if(matchResult instanceof Protocol){
                            protocol = matchResult;
                            break;
                        }

                        //noinspection ExceptionCaughtLocallyJS
                        throw new errors.InvalidProtocolError('INVALID_PROTOCOL');
                    }

                    let sopranoClient = SopranoClient.create(protocol, client, true);
                    sopranoClient.server = this;
                    await protocol.handover(sopranoClient, headerBytes.slice(0, headerPos));
                    await reader.release(false);
                } catch (err){
                    let writer = new Writer(client);
                    await writer.end(err.constructor.name + ':' + err.message);
                    client.dispose();
                }

                break;
        }
        return false;
    }

    /**
     * @returns {Object}
     */
    get initialOptions(){
        return this.getResource(Symbols.options);
    }

    /**
     * @returns {Server}
     */
    get net(){
        return this.getResource(Symbols.net);
    }

    /**
     * @returns {string}
     */
    get host(){
        return this.getResource(Symbols.host) || (this.initialOptions && this.initialOptions.host) || this.soprano.host;
    }

    /**
     * @returns {number}
     */
    get port(){
        return this.getResource(Symbols.port) || (this.initialOptions && this.initialOptions.port) || this.soprano.port;
    }

    async listen(options = void 0){

        let {host, port} = this;
        options = Object.assign({}, {host, port}, this.getResource(Symbols.options), options);
        this.setResource(Symbols.host, options.host);
        this.setResource(Symbols.port, options.port);

        var net = this.net;
        if(net){
            net.close();
        }

        this.setResource(Symbols.net, net = this.soprano.socketFactory.createServer(options));
        this.setResource(
            Symbols.netEvents,
            EventBridge.create(
                net,
                this,
                net.eventNames
            )
        );

        this.emit('net', net);

        this.net.listen(options);

        try{
            await this.whichever('error', 'listening');
        } catch (err){
            this.dispose();
            throw err;
        }

        return this;
    }
}

module.exports = SopranoServer;