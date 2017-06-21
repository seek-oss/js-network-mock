const Mitm = require('mitm');
const R = require('ramda');
const compareHeaders = require('./headers');

const mock = (expectedReq, response) =>

  new Promise((resolve, reject) => {
    const mitm = Mitm();
    let httpBodyString = '';

    mitm.on('request', (req, res) => {
      req.on('data', (d) => { httpBodyString += d.toString(); });
      req.on('end', () => {

        // incoming request has completed, now time to check everything:

        let body;

        try {
          // Attempt to treat it as JSON if it's possible
          body = JSON.parse(httpBodyString);
        }
        catch(_){
          // Else blindly handle it as a string
          body = httpBodyString;
        }

        const completeReq = {
          method: req.method,
          url: req.url,
          body: body,
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
          resolve();
          mitm.disable();
        } else {
            // This is intentionally obviously wrong status-code.
            // Just trying to signal through all available channels
            // that the mock did not receive the expected payload, and
            // therefore cannot continue.
          res.status = 600;
          console.error('Did not receive the expected payload:');
          console.error('expected:', expectedReq);
          console.error('actual:', completeReq);
          reject(new Error({ err: 'Did not receive the expected payload',
            expected: expectedReq,
            actual: completeReq
          }));
          mitm.disable();
        }
      });
    });
  });

module.exports = mock;
