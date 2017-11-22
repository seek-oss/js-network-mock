const Mitm = require('mitm');
const R = require('ramda');
const compareHeaders = require('./headers');

/**
* @param expectedReqs {object/array} either an array or expected request or a single request
* @param responses {object/array} either an array of responses or single response object
* @return promise for the test
*/
const mock = function() {

  let reqResponseList;

  let expectedReq;
  let response;

  // Simple case: only a request/response pair
  if(arguments.length === 2) {
    expectedReq = arguments[0];
    response = arguments[1];
  }
  // multiple requests to mock, just set an array
  else if (arguments.length === 1 && Array.isArray(arguments[0])) {
    reqResponseList = arguments[0];
  }
  else {
    throw new Error("Mock called with unexpected arguments, expects either "
     +  "(expectedRequest, respone) or an array of {request,response} objects")
  }

  return new Promise((resolve, reject) => {

    const mitm = Mitm();

    mitm.on('request', (req, res) => {

      let httpBodyString = '';

      // if the passed expected requests are in the form of an array,
      // pop off one for each request
      if (reqResponseList && reqResponseList.length > 0) {
        reqResp = reqResponseList.shift();
        if(!reqResp.request || !reqResp.response) {
          throw new Error('expected the mocked request/response objects to be in a single object as {request, response}');
        }
        expectedReq = reqResp.request;
        response = reqResp.response;
      }

      req.on('data', (d) => { httpBodyString += d.toString(); });
      req.on('end', () => {

          // incoming request has completed, now time to check everything:
          let httpBody;

          if (httpBodyString) {
            try {
              httpBody = JSON.parse(httpBodyString)
            }
            catch(e){
              // ignore error and set the body to be a string
              httpBody = httpBodyString
            }
          }

        const completeReq = {
          method: req.method,
          url: req.url,
          body: httpBody,
          headers: req.headers
        };

        if (R.equals(expectedReq.body, completeReq.body) &&
            R.equals(expectedReq.url, req.url) &&
            R.equals(expectedReq.method, req.method) &&
            compareHeaders(expectedReq.headers, req.headers)
            ) {
            // Cool, got the expected request, now respond with the
            // given payload
          res.statusCode = response.status;

          if(response.headers){
            Object.keys(response.headers).forEach(function(k) {
              res.setHeader(k, response.headers[k]);
            });
          }

          if(response.body && typeof response.body !== "string"){
            res.end(JSON.stringify(response.body));
          }
          else {
            res.end(response.body);
          }

          if(!reqResponseList || reqResponseList.length === 0){
            resolve();
            mitm.disable();
          }
          else {
            console.log('Expecting ', reqResponseList.length, ' more requests');
          }
        } else {
            // This is intentionally obviously wrong status-code.
            // Just trying to signal through all available channels
            // that the mock did not receive the expected payload, and
            // therefore cannot continue.
          res.status = 600;
          console.error('Did not receive the expected payload:');
          console.error('expected:', expectedReq);
          console.error('actual:', completeReq);
          reject({ err: 'Did not receive the expected payload',
            expected: expectedReq,
            actual: completeReq
          });
          mitm.disable();
        }
      });
    });
  });

}

module.exports = mock
