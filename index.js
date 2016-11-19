/**
 * Created by tolgahan on 03.11.2016.
 */
const Soprano = require('./core/Soprano');
const awync = require('awync');

Soprano.MethodCollection = require('./core/MethodCollection');
Soprano.ProtocolCollection = require('./core/ProtocolCollection');
Soprano.Slave = require('./core/Slave');
Soprano.Disposable = require('./core/Disposable');
Soprano.DisposableMap = require('./core/DisposableMap');
Soprano.DisposableSet = require('./core/DisposableSet');
Soprano.EndlessStream = require('./core/EndlessStream');
Soprano.EventBridge = require('./core/EventBridge');

Soprano.errors = require('./core/errors');
Soprano.Symbols = require('./core/symbols');
Soprano.debug = require('./core/debug');

Soprano.SocketFactory = require('./core/SocketFactory');
Soprano.FilterFactory = require('./core/FilterFactory');

Soprano.Protocol = require('./core/Protocol');
Soprano.RequestResponseProtocol = require('./core/protocols/RequestResponseProtocol');
Soprano.FixedHeaderRequestResponseProtocol = require('./core/protocols/FixedHeaderRequestResponseProtocol');
Soprano.StreamProtocol = require('./core/protocols/StreamProtocol');
Soprano.FixedHeaderStreamProtocol = require('./core/protocols/FixedHeaderStreamProtocol');
Soprano.EchoProtocol = require('./core/protocols/EchoProtocol');

Soprano.Controller = require('./core/Controller');

Soprano.Id = require('./core/Id');

Soprano.Adapter = require('./core/Adapter');
Soprano.MemoryAdapter = require('./core/adapters/MemoryAdapter');

Soprano.Writer = require('./core/Writer');
Soprano.Reader = require('./core/Reader');

Soprano.LengthPrefixedTransformer = require('./core/transformers/LengthPrefixedTransformer');
Soprano.JSONTransformer = require('./core/transformers/JSONTransformer');

Soprano.fixedHeaderProtocolMixin = require('./core/mixins/fixedHeaderProtocol');

Soprano.utils = require('./utils');


Soprano.SUPPRESS_REJECT = awync.SUPPRESS_REJECT;
Soprano.SUPPRESS_THROW = awync.SUPPRESS_THROW;
Soprano.SUPPRESS = awync.SUPPRESS;
Soprano.captureErrors = awync.captureErrors;
Soprano.releaseErrors = awync.releaseErrors;
Soprano.run = awync;
Soprano.sleep = awync.sleep;
Soprano.isGeneratorFunction = awync.isGeneratorFunction;

module.exports = Soprano;