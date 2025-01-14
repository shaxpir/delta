import rfdc = require('rfdc');
import isEqual = require('fast-deep-equal');
const cloneDeep = rfdc();

interface AttributeMap {
  [key: string]: unknown;
}

function isObject(value: unknown): value is AttributeMap {
  return value === Object(value) && !Array.isArray(value);
}

function isEmptyObject(value: unknown): value is AttributeMap {
  return isObject(value) && !Object.keys(value).length;
}

function removeNullOrEmptyObjects<T>(value: T): void {
  if (!value || !isObject(value)) return;
  for (const key in value) {
    const k = key as keyof typeof value;
    removeNullOrEmptyObjects(value[k]);
    if (value[k] == null || isEmptyObject(value[k])) delete value[k];
  }
}

namespace AttributeMap {
  export function compose(
    a: AttributeMap = {},
    b: AttributeMap = {},
    keepNull = false,
  ): AttributeMap | undefined {
    if (typeof a !== 'object') {
      a = {};
    }
    if (typeof b !== 'object') {
      b = {};
    }
    const attributes = cloneDeep(b);
    for (const key in a) {
      const aValue = a[key];
      const attrValue = attributes[key];
      if (isObject(aValue) && isObject(attrValue)) {
        attributes[key] = compose(aValue, attrValue, keepNull);
      }
    }
    if (!keepNull) removeNullOrEmptyObjects(attributes);
    for (const key in a) {
      if (a[key] !== undefined && b[key] === undefined) {
        attributes[key] = a[key];
      }
    }
    return Object.keys(attributes).length > 0 ? attributes : undefined;
  }

  export function diff(
    a: AttributeMap = {},
    b: AttributeMap = {},
  ): AttributeMap | undefined {
    if (typeof a !== 'object') {
      a = {};
    }
    if (typeof b !== 'object') {
      b = {};
    }
    const attributes = Object.keys(a)
      .concat(Object.keys(b))
      .reduce<AttributeMap>((attrs, key) => {
        if (!isEqual(a[key], b[key])) {
          attrs[key] = b[key] === undefined ? null : b[key];
          const aValue = a[key];
          const bValue = b[key];
          if (b[key] === undefined) {
            attrs[key] = null;
          } else if (isObject(aValue) && isObject(bValue)) {
            attrs[key] = diff(aValue, bValue);
          } else {
            attrs[key] = bValue;
          }
        }
        return attrs;
      }, {});
    return Object.keys(attributes).length > 0 ? attributes : undefined;
  }

  export function invert(
    attr: AttributeMap = {},
    base: AttributeMap = {},
  ): AttributeMap {
    attr = attr || {};
    const baseInverted = Object.keys(base).reduce<AttributeMap>((memo, key) => {
      const attrValue = attr[key];
      const baseValue = base[key];
      if (!isEqual(baseValue, attrValue) && attrValue !== undefined) {
        if (isObject(attrValue) && isObject(baseValue)) {
          memo[key] = invert(attrValue, baseValue);
        } else {
          memo[key] = base[key];
        }
      }
      return memo;
    }, {});
    return Object.keys(attr).reduce<AttributeMap>((memo, key) => {
      if (attr[key] !== base[key] && base[key] === undefined) {
        memo[key] = null;
      }
      return memo;
    }, baseInverted);
  }

  export function transform(
    a: AttributeMap | undefined,
    b: AttributeMap | undefined,
    priority = false,
  ): AttributeMap | undefined {
    if (typeof a !== 'object') {
      return b;
    }
    if (typeof b !== 'object') {
      return undefined;
    }
    if (!priority) {
      return b; // b simply overwrites us without priority
    }
    const attributes = Object.keys(b).reduce<AttributeMap>((attrs, key) => {
      const aValue = a[key];
      const bValue = b[key];
      if (aValue === undefined) {
        attrs[key] = bValue; // null is a valid value
      } else if (isObject(aValue) && isObject(bValue)) {
        attrs[key] = transform(aValue, bValue, true);
      }
      return attrs;
    }, {});
    return Object.keys(attributes).length > 0 ? attributes : undefined;
  }
}

export default AttributeMap;
