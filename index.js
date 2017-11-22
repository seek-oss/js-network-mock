const Mitm = require('mitm');
const R = require('ramda');
const compareHeaders = require('./headers');

/**
* @param expectedReqs {object/array} either an array or expected request or a single request
* @param responses {object/array} either an array of responses or single response object
* @return promise for the test
*/
const mock = (expectedReqs, responses) =>
  new Promise((resolve, reject) => {

    const mitm = Mitm();

    mitm.on('request', (req, res) => {

      let httpBodyString = '';

      let expectedReq;

      if (Array.isArray(expectedReqs) && expectedReqs.length > 0) {
        // if the passed expected requests are in the form of an array,
        // pop off one for each request
        expectedReq = expectedReqs.shift();
      } else if (Array.isArray(expectedReqs) && expectedReqs.length === 0){
        reject(new Error({ err: 'more requests have occured than there were expected'}));
        return;
      } else {
        // if the passed reques is a simple object, just use it
        expectedReq = expectedReqs;
      }

      let response;

      if (Array.isArray(responses) && responses.length > 0) {
        // if the passed expected requests are in the form of an array,
        // grap off one for each request
        response = responses.shift();
      } else if (Array.isArray(responses) && responses.length === 0){
        reject(new Error({ err: 'more responses have been returned than there were expected'}));
      }
      else {
        response = responses
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
          if(!Array.isArray(expectedReqs) || expectedReqs.length === 0){
            resolve();
            mitm.disable();
          }
          else {
            console.log('Expecting ', expectedReqs.length, 'more requests');
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
          if(!Array.isArray(expectedReqs) || expectedReqs.length === 0){
            mitm.disable();
          }
        }
      });
    });
  });

module.exports = mock
