### Network-mock

A small shim around the excellent [MITM](https://github.com/moll/node-mitm) to make modern nodejs testing somewhat easier.

It wraps the assertion in a promise and assembles the network request etc.

Used to assert a network request is received, and then to reply to it.

**Usage**:

```js
  const networkMock = require('network-mock');
  const myCode = require('./myCode');

  // it's asserting this is what will be sent
  const expectedReq = {
    method: 'POST',
    url: '/somepath',
    headers: {
      'X-API-Key': 'foobar',
      Accept: 'application/json'
    },
    body: demoData
  };

  // the mock will send this back to the code under test
  const reply = {status: 200, body: {foo: "bar"}};

  const mockPromise = networkMock(expectedReq, reply);
  const myCodesPromise = mycode.doNetworkIO();

  Promise.all([mockPromise, myCodesPromise])
    .then(res => {
      // assert stuff and test success?
    })
    .catch(e => {
       // test failure
    });
```

**Multiple assertions**:

It is also possible to provide multiple requests with an array for either
the expected requests, or the responses to multiple requests.

This is an example of retry-logic being tested, where the downstream application
initially returns a 500, then succeeds upon retry.

```

  const networkMock = require('network-mock');
  const myCode = require('./myCode');

  const expectedReq = [{
    method: 'POST',
    url: '/somepath',
    body: demoData
  },
  {
    method: 'POST',
    url: '/somepath',
    body: demoData
  }];

  const responses = [
    {status: 500, body: "error"}
    {status: 200, body: {foo: "bar"}}
  ]

  const mockPromise = networkMock(expectedReq, responses);
  const myCodesPromise = mycode.doNetworkIO();

  Promise.all([mockPromise, myCodesPromise])
    .then(res => {
      // assert stuff and test success?
    })
    .catch(e => {
       // test failure
    });
```
