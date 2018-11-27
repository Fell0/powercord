const { sleep } = require('ac/util');

const moduleFilters = require('./modules.json');

exports.init = async () => {
  while (!window.webpackJsonp) {
    await sleep(1);
  }

  const moduleID = Math.random.toString();
  const instance = webpackJsonp.push([
    [],
    { [moduleID]: (_, e, r) => {
      e.cache = r.c;
      e.require = r;
    } },
    [ [ moduleID ] ]
  ]);
  delete instance.cache[moduleID];

  const getModule = (filter, unsuccessfulIterations = 0) => {
    if (Array.isArray(filter)) {
      const keys = filter;
      filter = m => keys.every(key => m[key]);
    }

    if (unsuccessfulIterations > 16) {
      return null;
    }

    const moduleInstances = Object.values(instance.cache);
    const mdl = moduleInstances.find(m => (
      m.exports && (
        filter(m.exports) ||
        (m.exports.default && filter(m.exports.default))
      )
    ));

    if (!mdl) {
      unsuccessfulIterations++;
      return sleep(100)
        .then(() => getModule(filter, unsuccessfulIterations));
    }

    return mdl.exports.default || mdl.exports;
  };
  
  const getModuleByDisplayName = (displayName) =>
    getModule(m => m.displayName && m.displayName.toLowerCase() === displayName);

  for (const mdl in moduleFilters) {
    const filters = moduleFilters[mdl];
    let target = {};

    if (filters.some(Array.isArray)) {
      for (const nestedFilters of filters) {
        Object.assign(target, await getModule(nestedFilters));
      }
    } else {
      target = await getModule(filters);
    }

    exports[mdl] = target;
  }

  delete exports.init;
  Object.assign(exports, {
    getModuleByDisplayName,
    moduleFilters,
    getModule,
    instance
  });

  return true;
};
