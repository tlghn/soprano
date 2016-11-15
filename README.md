# soprano
Abstract Multi-protocol Socket Library for NodeJs

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

