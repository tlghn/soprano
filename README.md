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
- Soprano.PubSubProtocol: [github](https://github.com/tlghn/soprano.pubsub) / [npm](https://www.npmjs.com/package/soprano.pubsub)
  - Publish / Subscription protocol with some cool features


## Examples

### Basic Usage

server.js

```javascript
const Soprano = require('./');

(async function () {
    try{

        // create Soprano instance
        let soprano = new Soprano({port: 3000, host: '0.0.0.0'});

        // create Protocol instance
        let echoProtocol = soprano.createProtocol(Soprano.EchoProtocol);

        // Attach some optional middleware (this is protocol specific)
        echoProtocol.use(async function (echoData, req) {
            // modify data by adding "ECHO: " prefix
            return Buffer.concat([Buffer.from("ECHO: "), echoData]);
        });


        // Bind protocol to soprano instance
        await soprano.bind(echoProtocol);

        // Create SopranoServer and listen on specified port
        let server = await soprano.listen();

        console.log("listening on %s:%s", server.host, server.port);

    } catch (err){
        console.log(err);
    }
})();
```



client.js

```javascript
const Soprano = require('./');

(async function () {
    try{
        // create Soprano instance
        let soprano = new Soprano();

        // create EchoProtocol instance
        let echoProtocol = soprano.createProtocol(Soprano.EchoProtocol);

        // echo something and grab the server result
        let result = await echoProtocol.echo('Hello World');

        console.log(result);
    } catch (err){
        console.log(err);
    }
})();
```

