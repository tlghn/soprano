/**
 * Created by tolgahan on 07.11.2016.
 */
"use strict";

const stream = require('stream');
const EventEmitter = require('./EventEmitter');

const errors = require('./errors');
const net = require('net');
const Symbols = require('./symbols');
const Disposable = require('./Disposable');
const EventBridge = require('./EventBridge');

class Server extends EventEmitter {

    constructor(options = void 0){
        super();
        if(this.constructor === Server){
            throw new errors.AbstractError('Server class is abstract');
        }
    }

    address() {
        throw new errors.NotImplementedError();
    }

    close(callback = void 0){
        throw new errors.NotImplementedError();
    }

    getConnections(callback) {
        throw new errors.NotImplementedError();
    }

    listen(options, callback = void 0) {
        throw new errors.NotImplementedError();
    }

    get listening(){
        throw new errors.NotImplementedError();
    }

    get maxConnections(){
        throw new errors.NotImplementedError();
    }

    set maxConnections(value){
        throw new errors.NotImplementedError();
    }

    ref(){
        throw new errors.NotImplementedError();
    }

    unref() {
        throw new errors.NotImplementedError();
    }

    /**
     * @returns (Set)
     */
    get eventNames(){
        throw new errors.NotImplementedError();
    }

    _onDispose(){
        throw new errors.NotImplementedError();
    }
}

class Client extends stream.Duplex {

    constructor(options = void 0){
        super();
        if(this.constructor === Client){
            throw new errors.AbstractError('Client class is abstract');
        }
    }

    address(){
        throw new errors.NotImplementedError();
    }

    get bufferSize() {
        throw new errors.NotImplementedError();
    }

    set bufferSize(value){
        throw new errors.NotImplementedError();
    }

    get bytesRead(){
        throw new errors.NotImplementedError();
    }

    get bytesWritten(){
        throw new errors.NotImplementedError();
    }

    connect(options = void 0, callback = void 0){
        throw new errors.NotImplementedError();
    }

    get connecting(){
        throw new errors.NotImplementedError();
    }

    destroy(exception = void 0){
        throw new errors.NotImplementedError();
    }

    get destroyed(){
        throw new errors.NotImplementedError();
    }

    end(data = void 0, encoding = void 0){
        throw new errors.NotImplementedError();
    }

    get localAddress(){
        throw new errors.NotImplementedError();
    }

    get localPort(){
        throw new errors.NotImplementedError();
    }

    pause(){
        throw new errors.NotImplementedError();
    }

    ref(){
        throw new errors.NotImplementedError();
    }

    get remoteAddress(){
        throw new errors.NotImplementedError();
    }

    get remotePort(){
        throw new errors.NotImplementedError();
    }

    resume(){
        throw new errors.NotImplementedError();
    }

    setEncoding(encoding = void 0){
        throw new errors.NotImplementedError();
    }

    setKeepAlive(enable = void 0, initialDelay = void 0){
        throw new errors.NotImplementedError();
    }

    setNoDelay(noDelay = void 0){
        throw new errors.NotImplementedError();
    }

    setTimeout(timeout, callback = void 0){
        throw new errors.NotImplementedError();
    }

    unref(){
        throw new errors.NotImplementedError();
    }

    write(data, encoding = void 0, callback = void 0){
        throw new errors.NotImplementedError();
    }

    /**
     * @returns (Set)
     */
    get eventNames(){
        throw new errors.NotImplementedError();
    }

    _onDispose(){
        super.end();
    }

    _read(){
        return null;
    }
}

EventEmitter.attach(Client.prototype);
Disposable.attach(Server);
Disposable.attach(Client);

class SocketFactory {

    constructor(){
        if(this.constructor === SocketFactory){
            throw new errors.AbstractError('SocketFactory class is abstract');
        }
    }

    /**
     * @param options Factory specific options. Optional
     * @returns Server|Disposable
     */
    createServer(options = void 0) {
        throw new errors.NotImplementedError();
    }

    /**
     * @param options Factory specific options. Optional
     * @returns Client|Disposable
     */
    createClient(options = void 0) {
        throw new errors.NotImplementedError();
    }
}

function netEventArgumentMapper(arg) {
    if(arg instanceof net.Socket){
        return new NetClient(arg);
    }

    if(arg instanceof net.Server){
        return new NetServer(arg);
    }

    return arg;
}

const NET_SERVER_EVENTS = new Set(['close', 'connection', 'error', 'listening']);
const NET_CLIENT_EVENTS = new Set([
    'close', 'connect', 'data',
    'drain', 'end', 'error',
    'lookup', 'timeout',
    'pipe', 'unpipe',
    'readable', 'finish'
]);

class NetClient extends Client {

    constructor(options = void 0){
        var base;
        if(options instanceof net.Socket){
            base = options;
            options = void 0;
        }

        super(options);


        var weak = !!base;

        if(!base){
            base = new net.Socket(options);
        }

        this.setResource(Symbols.base, base, weak);

        this.setResource(
            Symbols.netEvents,
            EventBridge.create(base, this, NET_CLIENT_EVENTS, netEventArgumentMapper)
        );

        this._onBaseReady(base);
    }

    /**
     * @param base {net.Socket}
     * @protected
     */
    _onBaseReady(base){}

    /**
     *
     * @returns net.Socket
     */
    get base(){
        this.throwIfDisposed();
        return this.getResource(Symbols.base);
    }

    address(){
        this.throwIfDisposed();
        return this.base.address();
    }

    get bufferSize() {
        this.throwIfDisposed();
        return this.base.bufferSize;
    }

    set bufferSize(value){
        this.throwIfDisposed();
        this.base.bufferSize = value;
    }

    get bytesRead(){
        this.throwIfDisposed();
        return this.base.bytesRead;
    }

    get bytesWritten(){
        this.throwIfDisposed();
        return this.base.bytesWritten;
    }

    connect(options = void 0, callback = void 0){
        this.throwIfDisposed();
        this.base.connect(options, callback);
        return this;
    }

    cork(){
        this.throwIfDisposed();
        this.base.cork();
        return this;
    }

    get connecting(){
        this.throwIfDisposed();
        return this.base.connecting;
    }

    destroy(exception = void 0){
        this.throwIfDisposed();
        this.base.destroy(exception);
        return this;
    }

    get destroyed(){
        this.throwIfDisposed();
        return this.base.destroyed;
    }

    end(data = void 0, encoding = void 0){
        this.throwIfDisposed();
        this.base.end(data, encoding);
        return this;
    }

    isPaused(){
        this.throwIfDisposed();
        return this.base.isPaused();
    }

    get localAddress(){
        this.throwIfDisposed();
        return this.base.localAddress;
    }

    get localPort(){
        this.throwIfDisposed();
        return this.base.localPort;
    }

    pause(){
        this.throwIfDisposed();
        this.base.pause();
        return this;
    }

    pipe(destination, options = void 0){
        this.throwIfDisposed();
        return this.base.pipe(destination, options);
    }

    read(size = void 0){
        if(this.isDisposed()){
            return super.read(size);
        } else {
            return this.base.read(size);
        }
    }

    ref(){
        this.throwIfDisposed();
        this.base.ref();
        return this;
    }

    get remoteAddress(){
        this.throwIfDisposed();
        return this.base.remoteAddress;
    }

    get remotePort(){
        this.throwIfDisposed();
        return this.base.remotePort;
    }

    resume(){
        this.throwIfDisposed();
        this.base.resume();
        return this;
    }

    setDefaultEncoding(encoding){
        this.throwIfDisposed();
        this.base.setDefaultEncoding();
        return this;
    }

    setEncoding(encoding = void 0){
        this.throwIfDisposed();
        this.base.setEncoding(encoding);
        return this;
    }

    setKeepAlive(enable = void 0, initialDelay = void 0){
        this.throwIfDisposed();
        this.base.setKeepAlive(enable, initialDelay);
        return this;
    }

    setNoDelay(noDelay = void 0){
        this.throwIfDisposed();
        this.base.setNoDelay(noDelay);
        return this;
    }

    setTimeout(timeout, callback = void 0){
        this.throwIfDisposed();
        this.base.setTimeout(timeout, callback);
        return this;
    }

    uncork(){
        this.throwIfDisposed();
        this.base.uncork();
        return this;
    }

    unpipe(destination = void 0){
        this.throwIfDisposed();
        this.base.unpipe(destination);
        return this;
    }

    unref(){
        this.throwIfDisposed();
        this.base.unref();
        return this;
    }

    unshift(chunk){
        this.throwIfDisposed();
        this.base.unshift(chunk);
        return this;
    }

    wrap(stream){
        this.throwIfDisposed();
        return this.base.wrap(stream);
    }

    write(data, encoding = void 0, callback = void 0){
        this.throwIfDisposed();
        return this.base.write(data, encoding, callback);
    }

    _onDispose(){
        var base = this.base;
        if(base){
            base.destroy();
        }
        super._onDispose();
    }

    get eventNames(){
        this.throwIfDisposed();
        return NET_CLIENT_EVENTS;
    }
}

class NetServer extends Server {

    constructor(options = void 0){
        var base;
        if(options instanceof net.Server){
            base = options;
            options = void 0;
        }
        super(options);

        var weak = !!base;

        if(!base){
            base = new net.Server(options);
        }

        this.setResource(Symbols.base, base, weak);

        this.setResource(
            Symbols.netEvents,
            EventBridge.create(
                base,
                this,
                NET_SERVER_EVENTS,
                netEventArgumentMapper
            )
        );

        this._onBaseReady(base);
    }

    /**
     * @param base {net.Socket}
     * @protected
     */
    _onBaseReady(base){}

    /***
     * @returns net.Server
     */
    get base(){
        this.throwIfDisposed();
        return this.getResource(Symbols.base);
    }

    address() {
        this.throwIfDisposed();
        return this.base.address();
    }

    close(callback = void 0){
        this.throwIfDisposed();
        this.base.close(callback);
        return this;
    }

    getConnections(callback) {
        this.throwIfDisposed();
        this.base.getConnections(callback);
        return this;
    }

    listen(options, callback = void 0) {
        this.throwIfDisposed();
        this.base.listen(options, callback);
        return this;
    }

    get listening(){
        this.throwIfDisposed();
        return this.base.listening;
    }

    get maxConnections(){
        this.throwIfDisposed();
        return this.base.maxConnections;
    }

    set maxConnections(value){
        this.throwIfDisposed();
        this.base.maxConnections = value;
    }

    ref(){
        this.throwIfDisposed();
        this.base.ref();
        return this;
    }

    unref() {
        this.throwIfDisposed();
        this.base.unref();
        return this;
    }

    get eventNames(){
        this.throwIfDisposed();
        return NET_SERVER_EVENTS;
    }

    _onDispose(){
        var base = this.base;
        if(base){
            base.close();
        }
    }
}

class NetSocketFactory extends SocketFactory {
    createServer(options = void 0) {
        return new NetServer(options);
    }

    createClient(options = void 0) {
        return new NetClient(options);
    }
}

NetSocketFactory.NetClient = NetClient;
NetSocketFactory.NetServer = NetServer;

SocketFactory.Client = Client;
SocketFactory.Server = Server;

SocketFactory.NetSocketFactory = NetSocketFactory;

SocketFactory.defaultFactory = new NetSocketFactory();

module.exports = SocketFactory;