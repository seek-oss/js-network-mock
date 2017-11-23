
const compareHeaders = require('./headers');
const R = require('rambda');

module.exports = (expectedReq, actualReq) => {
  return R.equals(expectedReq.body, actualReq.body) &&
    R.equals(expectedReq.url, actualReq.url) &&
    R.equals(expectedReq.method, actualReq.method) &&
    compareHeaders(expectedReq.headers, actualReq.headers);
}
