const test = require('ava').test;
const sut = require('./index');
const http = require('http');
const request = require('superagent');

const demoData= {
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
        if (err || !res.ok) {
          reject(err);
        } else {
          resolve({status: res.status, body: res.text});
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

  const networkMockPromise = sut(expectedReq, {status: 200, body: {foo: "bar"}});
  const sampleReqPromise = demoRequest();

  return Promise.all([
    networkMockPromise,
    sampleReqPromise
  ]).then(results => {
    const resultRecievedByMock = results[1];
    t.deepEqual(resultRecievedByMock.body, JSON.stringify({foo: "bar"}));
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

  const networkMockPromise = sut(expectedReq, {status: 200, body: {foo: "bar"}});
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

  const networkMockPromise = sut(expectedReq, {status: 200, body: "asdf"});
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

  const networkMockPromise = sut(expectedReq, {status: 200, body: {foo: "bar"}});
  return demoRequest().then(res => {
    t.deepEqual(res.body, JSON.stringify({foo: "bar"}));
  });
});

test.serial('Handling multiple requests in the case of a retry', (t) => {

  const expectedReqs = [
    {
      method: 'POST',
      url: '/somepath',
      headers: {
        'X-API-Key': 'foobar',
        Accept: 'application/json'
      },
      body: demoData
    },
    {
      method: 'POST',
      url: '/somepath',
      headers: {
        'X-API-Key': 'foobar',
        Accept: 'application/json'
      },
      body: demoData
    }
  ]

  const networkMockPromise = sut(expectedReqs, [
    {status: 500, body: "Error!"},
    {status: 200, body: {foo: "bar"}},
  ]);

  return demoRequest()
    .catch(err => {
      t.is(err.status, 500);
      return demoRequest();
    }).then((res) => {
      t.is(res.status, 200);
      t.deepEqual(JSON.parse(res.body), {foo: "bar"});
  });
});


test.serial('Handling multiple requests with an assertion failing', (t) => {

  const expectedReqs = [
    {
      method: 'POST',
      url: '/somepath',
      headers: {
        'X-API-Key': 'foobar',
        Accept: 'application/json'
      },
      body: demoData
    },
    {
      method: 'get',
      url: '/somepath',
      headers: {
        'X-API-Key': 'foobar',
        Accept: 'application/json'
      },
      body: demoData
    }
  ]

  const networkMockPromise = sut(expectedReqs, {status: 200, body: {foo: "bar"}});

  demoRequest().then(() => demoRequest())

  return networkMockPromise.catch(e => {
    t.deepEqual(e.actual.body, {email: "franksmith@domain.test"});
    t.deepEqual(e.err, "Did not receive the expected payload");
    t.deepEqual(e.expected.method, "get"); // no idea what's with the casing here
    t.deepEqual(e.actual.method, "POST");
  })

});
