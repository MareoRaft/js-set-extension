"use strict";

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

// //////////////////////////////////////////////////////////////////////////////// //
// MIT License
//
// Copyright (c) 2018 Jan Küster
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
//   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// //////////////////////////////////////////////////////////////////////////////// //
// //////////////////////////////////////////////////////////////////////////////// //
//                                                                                  //
// INTERNAL                                                                         //
//                                                                                  //
// //////////////////////////////////////////////////////////////////////////////// //

/**
 * @private
 */
function checkRules(rules) {
  rules.forEach(function (rule) {
    if (typeof rule !== 'function') {
      throw new Error("Expected [rule] to be typeof [function], got [".concat(typeof value === "undefined" ? "undefined" : _typeof(value), "]"));
    }
  });
  return true;
}
/**
 * @private
 */


function checkSet(set) {
  if (!set || !set.constructor || !(set instanceof global.Set)) {
    throw new Error("Expected [set] to be instanceof [Set], got [".concat(set && set.constructor, "]"));
  }

  return true;
} // //////////////////////////////////////////////////////////////////////////////// //
//                                                                                  //
// OVERRIDES                                                                        //
//                                                                                  //
// //////////////////////////////////////////////////////////////////////////////// //

/**
 * The original add function.
 * @private
 */


var _originalAdd = global.Set.prototype.add;
/**
 * Adds a value to the set. If the set already contains the value, nothing happens.
 * Overrides Set.prototype.add.
 * @name Set.prototype.add
 * @function
 * @throws Error if rules function exists and {value} failed the rules check.
 * @param value {*}- Required. Any arbitrary value to be added to the set.
 * @returns {Set} the Set object
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/add
 */

function add(value) {
  if (this.rulesFct && !this.rulesFct.call(null, value)) {
    throw new Error("Value [".concat(value, "] does not match ruleset."));
  }

  return _originalAdd.call(this, value);
}

global.Set.prototype.add = add;
/**
 * The original has function reference.
 * @private
 */

var originalHas = global.Set.prototype.has;
/**
 * Resolves an element's inner structure to make it comparable by JSON.stringify.
 * @private
 */

function resolve(obj) {
  var circ = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : new _originalSet([obj]);

  if (typeof obj === 'undefined' || typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean' || obj === null) {
    return obj;
  }

  if (typeof obj === 'function') {
    var fctObj = {
      fctStr: String(obj).replace(/\s+/g, '') // function body to string
      // resolve all function properties / attached references

    };
    fctObj.refs = Object.getOwnPropertyNames(obj).map(function (key) {
      return originalHas.call(circ, obj[key]) ? 'circular' : resolve(obj[key], circ);
    });
    return fctObj;
  }

  var isArray = Array.isArray(obj);

  if (_typeof(obj) !== 'object' && !isArray) {
    return obj;
  } // add obj to check for
  // circular references


  circ.add(obj);

  if (isArray) {
    return obj.map(function (el) {
      return originalHas.call(circ, el) ? 'circular' : resolve(el, circ);
    });
  }

  var copy = {};
  Object.getOwnPropertyNames(obj).sort(function (a, b) {
    return a.localeCompare(b);
  }).forEach(function (key) {
    copy[key] = originalHas.call(circ, obj[key]) ? 'circular' : resolve(obj[key], circ);
  });
  return copy;
}
/**
 * Checks if the current set instance contains a given value by recursive deep compare.
 * Overrides the original Set.prototype.has.
 * The check is recursive and respects
 * <ul>
 *   <li>primitive types</li>
 *   <li>complex types, such as Objects or Arrays</li>
 *   <li>nested Objects and cyclic references</li>
 *   <li>functions</li>
 *   <li>functions with properties attached</li>
 *   <li>sets, sets of sets</li>
 * </ul>
 *
 * Note, that functions will be checked against their whitespace-trimmed bodies, which can return false negatives,
 * if for example a comment is added to the compare function that not exists in the original function.
 *
 * @function
 * @name Set.prototype.has
 * @example
 * const a = Set.from({ a:true, b:false })
 * a.has({ b:false, a:true })  // true
 * a.has({ b:false, a:false }) // false
 * @param value {*} - The value to be checked.
 * @returns {boolean} - True, if the value is contained by the set. False, if otherwise.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set/has
 */


global.Set.prototype.has = function has(value) {
  var valType = _typeof(value);

  if (valType === 'string' || valType === 'number' || valType === 'boolean') {
    return originalHas.call(this, value);
  }

  var iterator = this.values();
  var element;

  while ((element = iterator.next().value) !== void 0) {
    var elType = _typeof(element);

    if (elType !== valType) {
      return false;
    }

    var setCompare = element instanceof Set && value instanceof Set; // if both point to the same reference

    if (element === value) {
      return true;
    } else // if we want to check if this set has a set with the
      // same elements as the given set in the argument,
      // we need to check for equality of all elements of this set
      // and the argument set
      if (setCompare && element.equal(value)) {
        return true;
      } else // - if we want to check if ordered pairs (represented as arrays),
        //   are equal, we resolve their children and compare their strings.
        // - For all nested objects we recursively create a "sorted"
        //   version of both and compare their strings.
        // - functions are string-ed and their properties are resolved
        //   like objects
        if (elType === 'function' && valType === 'function' || !setCompare && elType === 'object' && valType === 'object' || Array.isArray(element) && Array.isArray(value)) {
          var sortedElmnt = resolve(element);
          var sortedValue = resolve(value);

          if (JSON.stringify(sortedElmnt) === JSON.stringify(sortedValue)) {
            return true;
          }
        }
  } // and if nothing has matched, we assume
  // that it is not contained in this set


  return false;
}; // //////////////////////////////////////////////////////////////////////////////// //
//                                                                                  //
// PROTOTYPES                                                                       //
//                                                                                  //
// //////////////////////////////////////////////////////////////////////////////// //

/**
 * Pass a function that dictates the rules for elements to be part of this set.
 * Use without args to get the current rules function.
 * <br>
 * A rules function needs to fulfill the following requirements:
 * <ul>
 *   <li>Obtain a single element as argument</li>
 *   <li>Check, if that element passes certain conditions</li>
 *   <li>Return false if the element fails any condition</li>
 *   <li>Otherwise return true</li>
 * </ul>
 * <br>
 * If a set contains a rules function (or a merge of many rules functions), the element will only be added to the set,
 * if it passes the rules check.
 * @function
 * @name Set.prototype.rules
 * @example
 * const isInt = n => Number.isInteger(n)
 * const integers = Set.from()
 * integers.rules(isInt)
 * integers.add(1)   // OK, no error
 * integers.add(1.5) // throws error!
 * integers.add(1.0) // OK, because 1.0 === 1 in JS Number
 * @param value {Function} (Optional) a Function that obtains a single argument and returns either a truthy or falsey value.
 * @returns {Function|undefined} Returns the current rules Function or undefined if there is on rules function assigned.
 */


function rules(value) {
  if (value) {
    checkRules([value]);
    this.rulesFct = value;
  }

  return this.rulesFct;
}

global.Set.prototype.rules = rules;
/**
 * Creates an (unsorted) array from all elements of this set.
 * @function
 * @name Set.prototype.toArray
 * @example new Set([1, 2, 3, 4]).toArray() // [ 1, 2, 3, 4 ]
 * @returns {Array} Array containing all elements of this set in unsorted order.
 */

function toArray() {
  var self = this;
  var out = [];
  out.length = self.size;
  var count = 0;
  self.forEach(function (value) {
    out[count++] = value;
  });
  return out;
}

global.Set.prototype.toArray = toArray;
/**
 * Returns an arbitrary element of this collection.
 * Basically the first element, retrieved by iterator.next().value will be used.
 * @function
 * @name Set.prototype.any
 * @returns {*} An arbitrary element of the current set that could by of any type, depending on the elements of the set.
 */

function any() {
  var self = this;
  var iterator = self.values();
  return iterator.next().value;
}

global.Set.prototype.any = any;
/**
 * Checks, whether the current set (this) is a superset of the given set.
 * A set A is superset of set B, if A contains all elements of B.
 * <br>
 * Expression: <code>A ⊇ B</code>
 * @function
 * @name Set.prototype.isSupersetOf
 * @example
 * const a = Set.from(1,2,3,4)
 * const b = Set.from(1,2,3)
 * const c = Set.from(1,2,3,4,5)
 * a.isSupersetOf(b) // true
 * a.isSupersetOf(c) // false
 * c.isSupersetOf(b) // true
 * @param set {Set} - A set instance of which this set is checked to be the superset.
 * @throws Throws an error, if the given set is not a set instance.
 * @returns {boolean} true if this set is the superset of the given set, otherwise false.
 * @see https://en.wikipedia.org/wiki/Subset
 */

function isSupersetOf(set) {
  var iterator = set.values();
  var value;

  while ((value = iterator.next().value) !== void 0) {
    if (!this.has(value)) return false;
  }

  return true;
}

global.Set.prototype.isSupersetOf = isSupersetOf;
/**
 * Checks, whether the current set (this) is a subset of the given set.
 * A set A is subset of set B, if B contains all elements of A.
 * <br>
 * Expression: <code>A ⊆ B</code>
 * <br>
 * If their sizes are also equal, they can be assumed as equal.
 * If their sizes are not equal, then A is called a proper subset of B.
 * @function
 * @name Set.prototype.isSubsetOf
 * @example
 * const a = Set.from(1,2,3,4)
 * const b = Set.from(1,2,3)
 * const c = Set.from(1,2,3,4,5)
 * a.isSubsetOf(b) // false
 * b.isSubsetOf(c) // true
 * c.isSubsetOf(a) // false
 * @param set {Set} - A set instance of which this set is checked to be the subset.
 * @throws Throws an error, if the given set is not a set instance.
 * @returns {boolean} - true if this set is the subset of the given set, false otherwise
 * @see https://en.wikipedia.org/wiki/Subset
 * @see Set.prototype.equal
 * @see Set.prototype.isProperSubsetOf
 */

function isSubsetOf(set) {
  return set.isSupersetOf(this);
}

global.Set.prototype.isSubsetOf = isSubsetOf;
/**
 * Checks, whether the current set (this) is a proper superset of the given set.
 * A set A is a proper subset of set B, if A contains all elements of B and their sizes are not equal.
 * <br>
 * Expression: <code>A ⊃ B</code>
 * @function
 * @name Set.prototype.properSupersetOf
 * @param set {Set} - A set instance of which this set is checked to be the proper superset.
 * @returns {boolean}
 * @see https://en.wikipedia.org/wiki/Subset
 */

function isProperSupersetOf(set) {
  return this.size !== set.size && this.isSupersetOf(set);
}

global.Set.prototype.properSupersetOf = isProperSupersetOf;
/**
 * Checks, whether the current set (this) is a proper subset of the given set.
 * A set A is a proper subset of set B, if B contains all elements of A and their sizes are not equal.
 * <br>
 * Expression: <code>A ⊂ B</code>
 * @function
 * @name Set.prototype.properSupersetOf
 * @param set {Set} - A set instance of which this set is checked to be the proper subset.
 * @returns {boolean}
 * @see https://en.wikipedia.org/wiki/Subset
 */

function isProperSubsetOf(set) {
  return this.size !== set.size && this.isSubsetOf(set);
}

global.Set.prototype.properSubsetOf = isProperSubsetOf;
/**
 * Checks, whether two sets are equal in terms of their contained elements.
 * Note: This implementation uses a deep object comparison in order to check for "sameness".
 * This allows also to check equality for more complex / nested structures without the restriction of interpreting
 * "sameness" as "being the exact same instance". If such an equality is desired, please use Set.prototype.equalSrict
 * @function
 * @name Set.prototype.equal
 * @example
 * const a = Set.from(1,2,3)
 * const b = Set.from(1,2,3.0) // note that 3.0 will evaluate to 3 here!
 * a === b    // false
 * a.equal(b) // true
 * @example
 * const a = Set.from({ a:true, b:false })
 * const b = Set.from({ b:false, a:true })
 * a.equal(b) // true
 * @param set {Set} - A set instance, which this set is to be compared with.
 * @throws Throws an error if the given paramter is not a Set instance.
 * @returns {boolean} true, if all elements of this set equal to the elements of the given set.
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness
 * @see Set.prototype.isSubsetOf
 */

function equal(set) {
  checkSet(set);

  if (this.size !== set.size) {
    return false;
  }

  return this.isSubsetOf(set);
}

global.Set.prototype.equal = equal; // //////////////////////////////////////////////////////////////////////////////// //
//                                                                                  //
// CONSTRUCTOR                                                                      //
//                                                                                  //
// //////////////////////////////////////////////////////////////////////////////// //

/**
 * The original Set reference.
 * @private
 */

var _originalSet = global.Set;
/**
 * Use <code>new Set(elements, rulesFct)</code> to create new sets. Alternatively you can use <code>Set.from</code>
 * @class
 * @name Set
 * @classdesc Extended version of <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set">Set (MDN link)</a>
 * @param elements {array} - an Array of element.
 * @param rulesFct {function} - a function which every element added to the set needs to pass.
 * @see Set.from
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
 * @returns {Set} An instance of the extended version of <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set">Set (MDN link)</a>
 */

function ExtendedSet(elements, rulesFct) {
  var original = new _originalSet();

  if (rulesFct) {
    original.rules(rulesFct);
  }

  if (elements) {
    elements.forEach(function (element) {
      return original.add(element);
    });
  }

  return original;
}

global.Set = ExtendedSet;
global.Set.prototype = _originalSet.prototype; // //////////////////////////////////////////////////////////////////////////////// //
//                                                                                  //
// STATICS                                                                          //
//                                                                                  //
// //////////////////////////////////////////////////////////////////////////////// //

/**
 * Creates a new Set from arbitrary arguments wihtout the need of "new" and the array notation.
 * @function
 * @name Set.from
 * @example Set.from(1,2,3,4,5) // returns Set { 1, 2, 3, 4, 5 }
 * @example
 * const ints = Set.from(1,2,3)
 * const flts = Set.from(4.5, 5.6, 6.7)
 * Set.from(ints, flts) // returns Set { Set {1, 2, 3}, Set { 4.5, 5.6, 6.7 } }
 * @param args {...*} - values of any types / length (using comma notation or spread operator)
 * @returns {Set} A set containing the given argument values.
 */

function from() {
  for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
    args[_key] = arguments[_key];
  }

  return new Set(args.concat());
}

global.Set.from = from;
/**
 * Autowraps a value to a Set, unless it is already a Set.
 * @function
 * @name Set.toSet
 * @param value  {*} - Any arbitrary value
 * @returns {Set} A Set containing the value or the value if it is already a Set.
 */

function toSet(value) {
  return value instanceof Set ? value : Set.from(value);
}

global.Set.toSet = toSet;
/**
 * Copies all elements of a given Set instance into a new Set and returns it.
 * <strong>It does not deep-clone the elements of the set.</strong>
 * @function
 * @name Set.copy
 * @throws Throws an error if the argument is not a Set instance.
 * @param set {Set} a set instance from which to copy from
 * @returns {Set} a new Set instance containing all elements of the source.
 */

function copy(set) {
  checkSet(set);
  var c = new Set();
  set.forEach(function (el) {
    return c.add(el);
  });
  return c;
}

global.Set.copy = copy;
/**
 * Creates a unified set of an arbitrary number of sets.
 * A union of A and B is a set containing all elements of A and B.
 * <br>Expression: <code>C = A ∪ B</code>
 * <br>Example: <code>{1,2} ∪ {2,3,4} = {1,2,3,4}</code>
 * @name Set.union
 * @function
 * @param args {...Set} - an arbitrary list of Set instances
 * @throws Throws an error if any of the argument is not a Set instance.
 * @returns {Set} a Set instance with the unified elements of the given args.
 * @see https://en.wikipedia.org/wiki/Union_(set_theory)
 */

function union() {
  var set3 = new Set();

  for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    args[_key2] = arguments[_key2];
  }

  args.forEach(function (set) {
    return checkSet(set) && set.forEach(function (value) {
      return set3.add(value);
    });
  });
  return set3;
}

global.Set.union = union;
/**
 * Creates an intersection set of an arbitrary number of sets.
 * An intersection is a set of A and B, which contains all elements that appear in A, as well as in B.
 * <br>
 * Expression: <code>C = A ∩ B</code>
 * <br>
 * Example: <code>{1, 2, 3} ∩ {2, 3, 4} = {2, 3}.</code>
 * @name Set.intersect
 * @function
 * @param args {...Set}- an arbitrary list of Set instances
 * @throws Throws an error if any of the argument is not a Set instance.
 * @returns {Set} a Set instance with the unified elements of the given args.
 * @see https://en.wikipedia.org/wiki/Intersection_(set_theory)
 */

function intersect() {
  for (var _len3 = arguments.length, args = new Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
    args[_key3] = arguments[_key3];
  }

  args.forEach(function (arg) {
    return checkSet(arg);
  });
  var set3 = new Set([]);
  args.forEach(function (set) {
    set.forEach(function (value) {
      if (args.every(function (compare) {
        return compare.has(value);
      })) {
        set3.add(value);
      }
    });
  });
  return set3;
}

global.Set.intersect = intersect;
/**
 * Creates a complement of two sets (subtracts B from A): <code>C = A \ B</code>
 *
 * @name Set.complement
 * @function
 * @throws Throws an error if any of the argument is not a Set instance.
 * @param set1 - A the set to be subtracted from
 * @param set2 - B the set which elements will be subtracted from A
 * @returns {ExtendedSet|*} A new Set with all elements of A minus the elements of B
 */

function complement(set1, set2) {
  checkSet(set1);
  checkSet(set2);
  var set3 = new Set([]);
  set1.forEach(function (value) {
    if (!set2.has(value)) {
      set3.add(value);
    }
  });
  return set3;
}

global.Set.complement = complement;
/**
 *
 * @private
 */

function symDiff(set1, set2) {
  var set3 = new Set();

  function addToSet(source, compare, target) {
    source.forEach(function (value) {
      if (!compare.has(value)) {
        target.add(value);
      }
    });
  }

  addToSet(set1, set2, set3);
  addToSet(set2, set1, set3);
  return set3;
}
/**
 * Creates the symmetric difference (disjunctive union) of an arbitrary number (2 .. n) of sets.
 * The symmetric difference of two sets A and B is a set, that contains only those elements,
 * which are in either of the sets and not in their intersection.
 * The symmetric difference is commutative and associative, which is why arbitrary number of sets can be used as input
 * for a sequencial-computed symmetric difference.
 * <br>
 * Expression: <code>C = A Δ B</code>
 *
 * @function
 * @name Set.symDiff
 * @param args {...Set}- An arbitrary amount of Set instances
 * @example
 * const a = Set.from(1,2,3)
 * const b = Set.from(3,4)
 * Set.symDiff(a, b) // Set { 1, 2, 4 }
 * @throws Throws an error if any of the given arguments is not a set instance.
 * @returns {Set} Returns a new Set, that contains only elements.
 * @see https://en.wikipedia.org/wiki/Symmetric_difference
 */


function symmetricDifference() {
  for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
    args[_key4] = arguments[_key4];
  }

  args.forEach(function (arg) {
    return checkSet(arg);
  });

  if (args.length === 2) {
    return symDiff.apply(void 0, args);
  }

  var set3 = symDiff(args.shift(), args.shift());

  while (args.length > 0) {
    set3 = symDiff(set3, args.shift());
  }

  return set3;
}

global.Set.symDiff = symmetricDifference;
/**
 * Creates the cartesian product of two given sets.
 * The cartesian product of two sets A and B is the set of all ordered pairs (a, b) where a ∈ A and b ∈ B.
 * <br>
 * Expression: <code>C = A x B = { (a, b) | a ∈ A and b ∈ B}</code>
 * <br>
 * Note, that <code>A x B ≠ B x A</code> (not commutative)
 * @function
 * @name Set.cartesian
 * @param set1 {Set} - A set instance
 * @param set2 {Set} - A set instance
 * @example
 * const a = Set.from(1,2)
 * const b = Set.from(3,4)
 * Set.cartesian(a, b) // Set { [1, 3], [1, 4], [2, 3], [2, 4] }
 * Set.cartesian(b, a) // Set { [3, 1], [3, 2], [4, 1], [4, 2] }
 * @throws Throws an error unless both arguments are set instances.
 * @return {Set} a new set instance, that contains the ordered element pairs.
 * @see https://en.wikipedia.org/wiki/Cartesian_product
 */

global.Set.cartesian = function cartesianProduct(set1, set2) {
  checkSet(set1);
  checkSet(set2);
  var set3 = new Set();
  set1.forEach(function (value1) {
    return set2.forEach(function (value2) {
      return set3.add([value1, value2]);
    });
  });
  return set3;
};
/**
 * https://en.wikipedia.org/wiki/Power_set
 * @private
 */


function addToSubset(e, T) {
  T.forEach(function (X) {
    return X.add(e);
  });
  return T;
}
/**
 * https://en.wikipedia.org/wiki/Power_set
 * @private
 */


function subsets(S) {
  checkSet(S);

  if (S.size === 0) {
    return Set.from(S);
  }

  var e = S.any();
  var T = Set.complement(S, Set.from(e));
  var PT = subsets(T);
  var PTe = addToSubset(e, subsets(T));
  return Set.union(PT, PTe);
}
/**
 * Creates the powerset of a given set instance by using a recursive algorithm (see <a href="https://en.wikipedia.org/wiki/Power_set">Wikipedia</a>, section Algorithms).
 * The powerset of a set contains all possible subsets of the set, plus itself and the empty set.
 * <br>
 * <strong>Attention:</strong> This method grows exponentially with the size of the given set.
 * @name Set.power
 * @function
 * @param set {Set} - A Set instance.
 * @throws
 * Throws an error if the given set is not a set instance.
 * @returns {Set} a new set instance with all subsets of the given set, plus the given set itself and the empty set.
 * @see https://en.wikipedia.org/wiki/Power_set
 */


function powerSet(set) {
  checkSet(set);
  var subs = subsets(set);
  subs.add(new Set());
  set.forEach(function (value) {
    return subs.add(Set.from(value));
  });
  return subs;
}

global.Set.power = powerSet;
/**
 * Merges two rules functions with a strict pass concept.
 * The resulting function requires the given element to pass at least one of the given functions (logical OR).
 * @function
 * @name Set.mergeRules
 * @throws Throws an error if any of the given parameters is not a Function
 * @param rules {...Function} - An arbitrary amount of (rules-) functions. See {@link Set.prototype.rules} for requirements of a rules function.
 * @returns {function(*=): boolean} The resulting rules function that can be attached to a set instance.
 * @see Set.prototype.rules
 *
 */

function mergeRules() {
  for (var _len5 = arguments.length, rules = new Array(_len5), _key5 = 0; _key5 < _len5; _key5++) {
    rules[_key5] = arguments[_key5];
  }

  checkRules(rules);
  return function (value) {
    var passed = rules.some(function (rule) {
      return rule.call(value);
    });

    if (!passed) {
      throw new Error("Value [".concat(value, "] does not match any rule of the ruleset."));
    }

    return true;
  };
}

global.Set.mergeRules = mergeRules;
/**
 * Merges two rules functions with a strict pass concept.
 * The resulting function requires the given element to pass all of the given functions (logical AND).
 * Thus, if the element fails one, it fails all.
 * <strong>Attention:</strong> If passed rules are mutually exclusive, none given element will pass the test in any circumstance.
 * @function
 * @name Set.mergeRulesStrict
 * @throws Throws an error if any of the given parameters is not a Function
 * @param rules {...Function} - An arbitrary amount of (rules-) functions. See {@link Set.prototype.rules} for requirements of a rules function.
 * @returns {function(*=): boolean} The resulting rules function that can be attached to a set instance.
 * @see Set.prototype.rules
 */

function mergeRulesStrict() {
  for (var _len6 = arguments.length, rules = new Array(_len6), _key6 = 0; _key6 < _len6; _key6++) {
    rules[_key6] = arguments[_key6];
  }

  checkRules(rules);
  return function (value) {
    var passed = rules.every(function (rule) {
      return rule.call(value);
    });

    if (!passed) {
      throw new Error("Value [".concat(value, "] does not match any rule of the ruleset."));
    }

    return true;
  };
}

global.Set.mergeRulesStrict = mergeRulesStrict;
//# sourceMappingURL=index.js.map