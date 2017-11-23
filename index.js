const Mitm = require('mitm');
const R = require('ramda');
const requestMatches = require('./request-matches');

/**
* internal helper function to send mock data back
* @param responseHandler the http Response object used by mitm
* @param responseToSend the payload to send back
*/
const sendResponse = (responseHandler, responseToSend) => {
  responseHandler.statusCode = responseToSend.status;

  if(responseToSend.headers){
    Object.keys(responseToSend.headers).forEach(function(k) {
      res.setHeader(k, responseToSend.headers[k]);
    });
  }

  if(responseToSend.body && typeof responseToSend.body !== "string"){
    responseHandler.end(JSON.stringify(responseToSend.body));
  }
  else {
    responseHandler.end(responseToSend.body);
  }
}

/**
* Internal function to handle formatting the incoming request body
* @param req {object} The request object from mitm
* @param httpBodyString {string} the accumulated request string
* @return {object} a request object including body as string or json
*/
const parseIncomingRequest = (req, httpBodyString) => {
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

  return {
    method: req.method,
    url: req.url,
    body: httpBody,
    headers: req.headers
  };
}

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

        const actualReq = parseIncomingRequest(req, httpBodyString)

        if (requestMatches(expectedReq, actualReq)) {

          // Cool, got the expected request, now respond with the
          // given payload
          sendResponse(res, response);

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
          console.error('actual:', actualReq);
          reject({ err: 'Did not receive the expected payload',
          expected: expectedReq,
          actual: actualReq 
        });
        mitm.disable();
      }
    });
  });
});

}

module.exports = mock
