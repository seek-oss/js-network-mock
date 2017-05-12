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
      .end(function(err, res){
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
