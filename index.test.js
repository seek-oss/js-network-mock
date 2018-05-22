const test = require('ava').test;
const sut = require('./index');
const http = require('http');
const request = require('superagent');

const demoData = {
  email: 'franksmith@domain.test'
};

const demoRequest = () => {

  return new Promise((resolve, reject) => {
    request
      .post('/somepath')
      .send(JSON.stringify(demoData))
      .set('X-API-Key', 'foobar')
      .set('Accept', 'application/json')
      .end((err, res) => {
        if (res) {
          resolve({ status: res.status, body: res.text, headers: res.headers  });
        } else {
          console.error('Error with request', err)
          reject(err)
        }
      });
  });
};

test.serial('Happy path test', (t) => {

  const expectedReq = {
    method: 'POST',
    url: '/somepath',
    headers: {
      'X-API-Key': 'foobar',
      Accept: 'application/json'
    },
    body: demoData
  };

  const networkMockPromise = sut(expectedReq, {
    status: 200,
    body: { foo: "bar" },
    headers: { "content-type": "application/json" }
  });
  const sampleReqPromise = demoRequest();

  return Promise.all([
    networkMockPromise,
    sampleReqPromise
  ]).then(results => {
    const resultRecievedByMock = results[1];
    t.deepEqual(resultRecievedByMock.body, JSON.stringify({ foo: "bar" }));
    t.is(resultRecievedByMock.status, 200);
  });
});


test.serial('Rejection test', (t) => {

  const expectedReq = {
    method: 'POST',
    url: '/some-different-path',
    headers: {
      'X-API-Key': 'foobar',
      Accept: 'application/json'
    },
  };

  const networkMockPromise = sut(expectedReq, { status: 200, body: { foo: "bar" } });
  const sampleReqPromise = demoRequest();

  return t.throws(networkMockPromise);
});


test.serial('Response type handling: returning strings', (t) => {

  const expectedReq = {
    method: 'POST',
    url: '/somepath',
    headers: {
      'X-API-Key': 'foobar',
      Accept: 'application/json'
    },
    body: demoData
  };

  const networkMockPromise = sut(expectedReq, { status: 200, body: "asdf" });
  return demoRequest().then(res => {
    t.is(res.body, 'asdf');
  });
});


test.serial('Response type handling: returning an object', (t) => {

  const expectedReq = {
    method: 'POST',
    url: '/somepath',
    headers: {
      'X-API-Key': 'foobar',
      Accept: 'application/json'
    },
    body: demoData
  };

  const networkMockPromise = sut(expectedReq, {
    status: 200, body: { foo: "bar" }
  });
  return demoRequest().then(res => {
    t.deepEqual(res.body, JSON.stringify({ foo: "bar" }));
  });
});

test.serial('Request headers are returned in response headers', (t) => {

  const expectedReq = {
    method: 'POST',
    url: '/somepath',
    headers: {
      'X-API-Key': 'foobar',
      Accept: 'application/json'
    },
    body: demoData
  };

  const networkMockPromise = sut(expectedReq, {
    status: 200, body: { foo: "bar" }, headers: {"mock-return-header": "thisandthat"}
  });
  
  return demoRequest()
    .then((res) => {
           //requests will to lower the key in header
           t.deepEqual(res.headers["mock-return-header"], 'thisandthat');
   })
    .catch(t.fail);
});

test.serial('Handling multiple requests in the case of a retry', (t) => {

  const expectations = [
    {
      request: {
        method: 'POST',
        url: '/somepath',
        headers: {
          'X-API-Key': 'foobar',
          Accept: 'application/json'
        },
        body: demoData
      },
      response: { status: 500, body: "Error!" },
    },
    {
      request: {
        method: 'POST',
        url: '/somepath',
        headers: {
          'X-API-Key': 'foobar',
          Accept: 'application/json'
        },
        body: demoData
      },
      response: { status: 200, body: { foo: "bar" } },
    }
  ]

  const networkMockPromise = sut(expectations);

  return demoRequest()
    .then(err => {
      t.is(err.status, 500);
      return demoRequest();
    }).then((res) => {
      t.is(res.status, 200);
      t.deepEqual(JSON.parse(res.body), { foo: "bar" });
    });
});

test.serial('Handling multiple requests with an assertion failing', (t) => {

  const expectations = [
    {
      request: {
        method: 'POST',
        url: '/somepath',
        headers: {
          'X-API-Key': 'foobar',
          Accept: 'application/json'
        },
        body: demoData
      },
      response: { status: 500, body: "Error!" },
    },
    {
      request: {
        method: 'GET',
        url: '/somepath',
        headers: {
          'X-API-Key': 'foobar',
          Accept: 'application/json'
        },
        body: demoData
      },
      response: { status: 200, body: { foo: "bar" } },
    }
  ]

  const networkMockPromise = sut(expectations);

  // retry a request
  demoRequest().then(() => demoRequest()).catch(e => { console.error(e) })

  return networkMockPromise.catch(e => {
    t.deepEqual(e.actual.body, { email: "franksmith@domain.test" });
    t.deepEqual(e.err, "Did not receive the expected payload");
    t.deepEqual(e.expected.method, "GET");
    t.deepEqual(e.actual.method, "POST");
  })

});
