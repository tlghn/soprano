# soprano
Abstract Multi-protocol Socket Library for NodeJs

## Install
```
npm i soprano --save
```

## Protocols
- EchoProtocol (Built-in Echo protocol)
- Soprano.RPCProtocol: [github](https://github.com/tlghn/soprano.rpc) / [npm](https://www.npmjs.com/package/soprano.rpc)
 - Simple RPC (Remote Procedure Call) protocol with some cool features


## Examples

### Basic Usage

server.js

```
const Soprano = require('soprano');

Soprano.run(function *() {

    let soprano = new Soprano();

    let echoProtocol = new Soprano.EchoProtocol(soprano);

    yield soprano.bind(echoProtocol);

    yield soprano.listen();

    console.log('listening...')

});
```


client.js

```
const Soprano = require('soprano');

Soprano.run(function *() {

    let soprano = new Soprano();

    let echoProtocol = new Soprano.EchoProtocol(soprano);

    yield soprano.bind(echoProtocol);

    console.log(yield echoProtocol.echo('Hello world'));
});

```

