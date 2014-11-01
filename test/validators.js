var assert = require('chai').assert;
var claire = require('claire');
var gen = claire.data;
var vs = require('../validators');
var valid = require('validator');
function upTo(n, gen){
  return claire.sized(function(){return n}, gen);
}

var spaces = claire.choice.apply(null, " \f\n\r\t\v\u00a0\u1680\u180e\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\uFEFF\xA0".split(''));

var blankGen = claire.transform(
  function(chars){return chars.join('')},
  claire.repeat(spaces)
);

describe('validators', function(){
  it('re-exports Validation, FormError, etc', function(){
    assert.isFunction(vs.Validation);
    assert.isFunction(vs.Success);
    assert.isFunction(vs.Failure);
    assert.isFunction(vs.FormError);
  });

  describe('notBlank', function(){
    it('is success when the field is not blank', claire.forAll(gen.Str)
      .given(function(s){return s.trim()})
      .satisfy(function(s){
        var v = vs.notBlank('a_field', {a_field: s});
        assert(v.is_success, "successful validation");
        assert.deepEqual(v.value, {a_field: s});
        return true;
      }).asTest()
    );

    it('responds with an error description on error', claire.forAll(blankGen)
      .satisfy(function(b){
        var v = vs.notBlank('a_field', {a_field: b});
        assert(v.is_failure, "failed validation");
        assert.instanceOf(v.value, vs.FormError);
        assert.deepEqual(v.value.a_field,
          [{code: 'blank', message: '"a_field" must not be blank'}]);
        return true;
      }).asTest()
    );
  });

  describe('isIn', function(){
    it('is success when the field value matches an option',
      claire.forAll(upTo(40, gen.Array(gen.Str)))
      .given(function(opts){return opts.length;})
      .satisfy(function(opts){
        var value = opts[Math.floor(Math.random()*(opts.length-1))];
        var v = vs.isIn(opts, 'a_field', {a_field: value});
        assert(v.is_success, "successful validation");
        assert.deepEqual(v.value, {a_field: value});
        return true;
      }).asTest()
    );

    it('fails when the value is not in the list',
      claire.forAll(upTo(40, gen.Array(gen.AlphaStr)), gen.AlphaStr)
      .given(function(opts, value){return !valid.isIn(value, opts);})
      .satisfy(function(opts, value){
        var attr = {a_field: value}
        var v = vs.isIn(opts, 'a_field', attr)
        assert(v.is_failure, 'failed validation');
        assert.instanceOf(v.value, vs.FormError);
        return true;
      }).asTest()
    );

    it('provides an error description on failure', function(){
      var opts = ['a value', 'a good option', 'some other thing'];
      var v = vs.isIn(opts, 'a_field', {a_field: 'a bad option'});
      assert(v.is_failure, 'failed validation');
      assert.instanceOf(v.value, vs.FormError);
      assert.deepEqual(v.value.a_field, [{code: 'not_in', options: opts,
        message: '"a_field" must be one of "a value", "a good option", or "some other thing"'}]);
    });
  });

  describe('notEmpty', function(){
    it('is success when the value is not empty',
      claire.forAll(upTo(30, gen.Array(gen.Any)))
      .given(function(value){return value.length})
      .satisfy(function(value){
        var attr = {a_field: value}
        var v = vs.notEmpty('a_field', attr);
        assert(v.is_success, "successful validation");
        assert.deepEqual(v.value, attr);
        return true;
      }).asTest()
    );

    it('rejects null and empty arrays', function(){
      var v = vs.notEmpty('a_field', {a_field: null});
      assert(v.is_failure, 'failed validation');
      assert.instanceOf(v.value, vs.FormError);
      assert.deepEqual(v.value.a_field, [{code: 'empty',
        message: '"a_field" must not be empty'}]);
      var val = {other: []};
      v = vs.notEmpty('other', val).concat(vs.notEmpty('not there', val));
      assert(v.is_failure, 'also failed');
      assert.deepEqual(v.value.other, [{code: 'empty',
        message: '"other" must not be empty'}]);
      assert.deepEqual(v.value['not there'], [{code: 'empty',
        message: '"not there" must not be empty'}]);
    });
  });

  describe('subsetOf', function(){
    it('is success if all values are in the options list', function(){
      var attrs = {field: ['a', 'c']};
      var v = vs.subsetOf(['a','b','c'], 'field', attrs);
      assert(v.is_success, 'successful validation');
      assert.equal(v.value, attrs);
    });

    it('fails when there are values not in the options list', function(){
      var attrs = {field: ['a', 2, 'not there']};
      var opts = ['a','b','c'];
      var v = vs.subsetOf(opts, 'field', attrs);
      assert(v.is_failure, 'failed validation');
      assert.instanceOf(v.value, vs.FormError);
      assert.deepEqual(v.value.field, [{
        code: 'not_all_in',
        options: opts,
        invalid: [2, 'not there'],
        message: '"2" and "not there" are not valid options for "field" '+
          '(valid options are "a", "b", or "c")'
      }]);
    });
  });
});
