const test = require('ava').test;
const sut = require('./headers');

test('Can compare headers passing case', (t) => {
  t.true(sut({ foo: 1 }, { foo: 1, bar: 2 }));
});

test('Can compare headers failing case', (t) => {
  t.false(sut({ foo: 2 }, { foo: 1, bar: 2 }));
});

test('header keys are not case sensitive', (t) => {
  t.true(sut({ foo: 1 }, { FOO: 1, bar: 2 }));
});
