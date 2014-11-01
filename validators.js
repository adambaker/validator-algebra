var _ = require('lodash');
var Validation = require('validation-algebra');
var Suc = Validation.Success, Fail = Validation.Failure;
var FormError = require('form-error');
var validator = require('validator');
function q(str){ return '"'+str+'"'; }
function listFormat(conj, list){
  var last = _.last(list), rest = list.slice(0, list.length - 1);
  if(rest.length > 1){
    return rest.map(function(val){return q(val);}).join(', ') +
      ', '+conj+' '+q(last);
  } else if (rest.length) {
    return q(rest[0])+' '+conj+' '+q(last);
  } else { return q(last); }
};

module.exports = {
  Validation: Validation,
  Success: Suc,
  Failure: Fail,
  FormError: FormError,
  notBlank: function(field, attrs) {
    var val = validator.trim(attrs[field]);
    return !validator.isNull(val) ? new Suc(attrs) :
      new Fail(new FormError(field, {code: 'blank',
        message: q(field)+' must not be blank'}));
  },
  isIn: function(options, field, attrs) {
    if(validator.isIn(attrs[field], options)){
      return new Suc(attrs)
    } else {
      return new Fail(new FormError(field, {
        code: 'not_in',
        options: options,
        message: q(field)+' must be one of '+ listFormat('or', options)
      }));
    }
  },
  notEmpty: function(field, attrs) {
    return attrs[field] && attrs[field].length ? new Suc(attrs) :
      new Fail(new FormError(field,{code: 'empty',
        message: q(field)+' must not be empty'
      }));
  },
  subsetOf: function(options, field, attrs){
    var invalid =  _.difference(attrs[field]||[], options);
    return invalid.length ? new Fail(new FormError(field, {
      code: 'not_all_in', options: options, invalid: invalid,
      message: listFormat('and', invalid)+' are not valid options for '+
        q(field)+' (valid options are '+ listFormat('or', options)+')'
    })) : new Suc(attrs);
  },
};
