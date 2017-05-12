const R = require('ramda');

const lowerAllKeysOfAnObject = (o) =>{
  const keys = Object.keys(o);
  let newObject = {};
  keys.forEach(k => {
    newObject[k.toLowerCase()] = o[k];
  });
  return newObject;
};

// Check the subset of headers we care about match
const compareHeaders = (e, a) => {
  const expected = lowerAllKeysOfAnObject(e);
  const actual = lowerAllKeysOfAnObject(a);

  if (!expected) {
    return true; // don't do a comparison if no expectation is set
  }
  const matches = R.map(([k, v]) => R.equals(v, actual[k]), R.toPairs(expected));
  return R.all(R.identity, matches);
};

module.exports = compareHeaders;
