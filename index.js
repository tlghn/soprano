/**
 * Created by tolgahan on 03.11.2016.
 */
const Soprano = require('./core/Soprano');
const awync = require('awync');

Soprano.Protocol = require('./core/Protocol');
Soprano.MethodCollection = require('./core/MethodCollection');
Soprano.ProtocolCollection = require('./core/ProtocolCollection');
Soprano.Slave = require('./core/Slave');
Soprano.SocketFactory = require('./core/SocketFactory');
Soprano.FilterFactory = require('./core/FilterFactory');

Soprano.RequestResponseProtocol = require('./core/protocols/RequestResponseProtocol');
Soprano.FixedHeaderRequestResponseProtocol = require('./core/protocols/FixedHeaderRequestResponseProtocol');
Soprano.EchoProtocol = require('./core/protocols/EchoProtocol');

Soprano.SUPPRESS_REJECT = awync.SUPPRESS_REJECT;
Soprano.SUPPRESS_THROW = awync.SUPPRESS_THROW;
Soprano.SUPPRESS = awync.SUPPRESS;
Soprano.captureErrors = awync.captureErrors;
Soprano.releaseErrors = awync.releaseErrors;
Soprano.run = awync;

module.exports = Soprano;