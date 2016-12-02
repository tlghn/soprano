/**
 * Created by tolgahan on 03.11.2016.
 */
const Soprano = require('./core/Soprano');

const EventEmitter = require('./core/EventEmitter');
Soprano.EventEmitter = EventEmitter;

const SopranoClient = require('./core/SopranoClient');
Soprano.SopranoClient = SopranoClient;

const SopranoServer = require('./core/SopranoServer');
Soprano.SopranoServer = SopranoServer;

const MethodCollection = require('./core/MethodCollection');
Soprano.MethodCollection = MethodCollection;

const ProtocolCollection = require('./core/ProtocolCollection');
Soprano.ProtocolCollection = ProtocolCollection;

const Slave = require('./core/Slave');
Soprano.Slave = Slave;

const Disposable = require('./core/Disposable');
Soprano.Disposable = Disposable;

const DisposableMap = require('./core/DisposableMap');
Soprano.DisposableMap = DisposableMap;

const DisposableSet = require('./core/DisposableSet');
Soprano.DisposableSet = DisposableSet;

const EndlessStream = require('./core/EndlessStream');
Soprano.EndlessStream = EndlessStream;

const EventBridge = require('./core/EventBridge');
Soprano.EventBridge = EventBridge;

const errors = require('./core/errors');
Soprano.errors = errors;

let Symbols = require('./core/symbols');
Soprano.Symbols = Symbols;

const debug = require('./core/debug');
Soprano.debug = debug;

const SocketFactory = require('./core/SocketFactory');
Soprano.SocketFactory = SocketFactory;

const FilterFactory = require('./core/FilterFactory');
Soprano.FilterFactory = FilterFactory;

const Protocol = require('./core/Protocol');
Soprano.Protocol = Protocol;

const RequestResponseProtocol = require('./core/protocols/RequestResponseProtocol');
Soprano.RequestResponseProtocol = RequestResponseProtocol;

const FixedHeaderRequestResponseProtocol = require('./core/protocols/FixedHeaderRequestResponseProtocol');
Soprano.FixedHeaderRequestResponseProtocol = FixedHeaderRequestResponseProtocol;

const StreamProtocol = require('./core/protocols/StreamProtocol');
Soprano.StreamProtocol = StreamProtocol;

const FixedHeaderStreamProtocol = require('./core/protocols/FixedHeaderStreamProtocol');
Soprano.FixedHeaderStreamProtocol = FixedHeaderStreamProtocol;

const EchoProtocol = require('./core/protocols/EchoProtocol');
Soprano.EchoProtocol = EchoProtocol;

const Controller = require('./core/Controller');
Soprano.Controller = Controller;

const Id = require('./core/Id');
Soprano.Id = Id;

const Adapter = require('./core/Adapter');
Soprano.Adapter = Adapter;

const MemoryAdapter = require('./core/adapters/MemoryAdapter');
Soprano.MemoryAdapter = MemoryAdapter;

const Writer = require('./core/Writer');
Soprano.Writer = Writer;

const Reader = require('./core/Reader');
Soprano.Reader = Reader;

const LengthPrefixedTransformer = require('./core/transformers/LengthPrefixedTransformer');
Soprano.LengthPrefixedTransformer = LengthPrefixedTransformer;

const JSONTransformer = require('./core/transformers/JSONTransformer');
Soprano.JSONTransformer = JSONTransformer;

const fixedHeaderProtocolMixin = require('./core/mixins/fixedHeaderProtocol');
Soprano.fixedHeaderProtocolMixin = fixedHeaderProtocolMixin;

const utils = require('./utils');
Soprano.utils = utils;

module.exports = Soprano;