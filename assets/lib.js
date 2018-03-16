// ----- OBJECT STUFF -----
Array.isArray = Array.isArray ||
  (function (a) { return a.length > -1 });
Array.from = Array.from ||
  (function (o) { return Array.prototype.slice.call(o) });

String.isString = String.isString ||
  (function (s) { return typeof s === 'string' });
String.format = String.format || function (string, obj) {
  return Object.keys(obj).reduce(function (string, key) {
    return string.replace('{'+key+'}', obj[key]);
  }, string);
};

Object.isObject = Object.isObject ||
  (function (o) { return !Array.isArray(o) && typeof o === 'object' });
Object.copy = function (o) { return JSON.parse(JSON.stringify(o)) };

Function.curry = Function.curry ||
  (function () {
    var args = Array.from(arguments);
    return args[0].bind.apply(args[0], args);
  });

Function.compose = Function.compose ||
  (function () {
    var functions = Array.from(arguments);

    return function () {
      return functions.slice(1).reduce(function (arg, func) {
        return func.call(null, arg);
      }, functions[0].apply(null, Array.from(arguments)));
    };
  });

// ----- STREAMS STUFF -----
//
function Stream(parent) {
  var self = this;
  var handlers = [];
  function recv(cb) {
    handlers.push(cb);
    return self;
  }
  function send(data) {
    handlers.forEach(function (handler) {
      handler(data);
    });
    return self;
  }
  function filter(predicate) {
    var child = new Stream(self);
    recv(function (event) {
      if (predicate(event)) child.send(event);
    });
    return child;
  }
  return {
    recv: recv,
    send: send,
    filter: filter
  };
}

// ----- CSV STUFF -----
// Generate a csv from a list of objects.
function CSV(objects, columns) {
  columns = columns || objects.reduce(function (columns, object) {
    for (var key in object) {
      if (columns.indexOf(key) === -1) {
        columns.push(key.replace("\"", "\\\""));
      }
    }
    return columns;
  }, []);
  // firstly we need to know what columns we're going to have. We can either
  // use the set of columns that the user provides which we assume will be
  // correct or we can discover all of the unique columns that exist in the
  // array of objects.
  //
  // We do that by reducing an array over the list of objects. Initially
  // reduce is called with an empty array in "columns" and the first object.
  // We iterate through the set of keys in the object and if it isn't already
  // in the array, we push it in.
  
  return [columns.map(function (c)  { return String.format('"{column}"', { column: c }) }).join(', ')].
    concat(objects.map(function (object) {
      return columns.map(function (c) {
        if (object.hasOwnProperty(c)) {
          return String.format('"{cell}"', { cell: object[c].toString().replace("\"", "\\\"") });
        } else {
          return '';
        }
      }).join(', ');
    })).join("\r\n");
  // Next we generate our header row by mapping over each column name we've
  // discovered / been passed and wrapping it in double quotes \". This
  // allows us to use special characters like comas, tabs, newlines etc in
  // our column headers. Perhaps a little permissive but it causes no harm
  // but prevents accidental harm (e.g. when accidentally pasting a new line
  // into a header). We join those wrapped headers with a comma and a space to aid
  // to aid readability. 
  //
  // Next we pop the headers row in an array and concatenate that array with
  // another array formed by mapping over each object and pulling out each
  // value form the object in the order the columns are in, wrapping those
  // values in double quotes to prevent special chars breaking the csv. After
  // joining our wrapped column values we finally have a big array of all of
  // the rows in our csv. The last thing to do is join those arrays with
  // "\r\n" because that is what the csv spec requires for portable newlines.
}

// ----- LOCAL STORAGE STUFF -----
function save(id, data) {
  localStorage.setItem(id, JSON.stringify(data));
}

function load(id) {
  return JSON.parse(localStorage.getItem(id));
}

function destroy(id) {
  localStorage.removeItem(id);
}

function persistent(id, obj) {
  var model = merge(obj, load(id) || new obj.constructor);
  var ARModel = merge(model, {
    // allow destruction of data instance
    destroy: function () {
      destroy(id);
    },
    // Bunch up changes to the ARModel and write all at once.
    save: debounce(function () {
      save(id, data);
    }, 10)
  });

  return (function proxify(proxyObj) {
    if (Object.isObject(proxyObj) || Array.isArray(proxyObj)) {
      return walkMap(proxyObj, function (subProxyObj) {
        return new Proxy(subProxyObj, {
          get: function (target, prop) {
            if (prop !== 'IS_PROXY') {
              return target[prop];
            }
            return true;
          },
          set: function (target, prop, value) {
            target[prop] = value.IS_PROXY ? value : proxify(value);
            ARModel.save();
            return target[prop] || true;
          },
          deleteProperty: function (target, prop) {
            delete target[prop];
            ARModel.save();
            return true;
          }
        });
      });
    } else {
      return proxyObj;
    }
  })(ARModel);
}

// ----- HTTP STUFF -----
function decodeParams(paramString) {
  return paramString.split('&').reduce(function (params, pairString) {
    return pairString.split('=').reduce(function (key, value) {
      var isArray = key.match(/(.*?)\[(.*?)\]/);

      if (isArray) {
        var paramKey = isArray[1];
        var mapKey = isArray[2];
        if (mapKey) {
          params[paramKey] = params[paramKey] || {};
          params[paramKey][mapKey] = decodeURIComponent(value);
        } else {
          params[paramKey] = params[paramKey] || [];
          params[paramKey].push(decodeURIComponent(value));
        }
      } else {
        params[key] = decodeURIComponent(value);
      }
      return params;
    });
  }, {});
}

// ----- FUNCTIONAL STUFF -----
function walkMap(obj, func) {
  if (!obj) return obj;

  return func(Object.keys(obj).reduce(function (receiver, key) {
    if (obj.hasOwnProperty(key)) {
      if (Object.isObject(obj[key]) || Array.isArray(obj[key])) {
        receiver[key] = walkMap(obj[key], func);
      } else {
        receiver[key] = obj[key]; 
      }
    }
    return receiver;
  }, obj));
}

function flatten(arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

function merge(obj1, obj2) {
  if (!obj1) return obj2;
  if (!obj2) return obj1;

  if (Object.isObject(obj1)) {
    for (var key in obj2) {
      obj1[key] = merge(obj1[key], obj2[key]);
    }
    return obj1;
  }

  if (Array.isArray(obj1)) {
    var idMap = obj1.concat(obj2)
      .reduce(function(items, item) {
        items[item.id] = items[item.id] || [];  
        items[item.id].push(item);
        return items;
      }, {});

    var withoutId = idMap[undefined] || [];
    delete idMap[undefined];

    return withoutId
      .concat(
        Object.values(idMap)
          .map(function (items) { return items.reduce(merge) }));
  }

  return obj2;
}

function debounce(func, milliseconds) {
  var timeout;
  return function () {
    var self = this;
    var args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function () {
      func.call(self, args);
    }, milliseconds);
  };
}

function zip() {
  var args = Array.from(arguments);
  return args[0].map(function (_, i) {
    return args.map(function (array) { return array[i]; });
  });
}

function compose() {
  var functions = Array.from(arguments);
  return function () {
    var self = this;
    return functions.reduce(function (args, func) {
      if (!Array.isArray(args))
        args = [args];

      return func.apply(self, args);
    }, Array.from(arguments));
  };
}

// ----- HTML STUFF -----
function createElement(name, attributes) {
  return merge(document.createElement(name), attributes);
}

function elementFactory(name, builders) {
  // Ways to use this function
  // html.div('Hey') => <div>Hey</div>
  // html.div({ text: 'hey' }) => <div>Hey</div>
  // html.div([html.div('Hey')]) => <div><div>Hey</div></div>
  // html.div({
  //    children: [
  //      html.div('Hey')
  //    ]
  //  }) => <div><div>Hey</div></div>
  return function (attributes) {
    if (String.isString(attributes)) {
      return arguments.callee.call(this, { text: attributes });
    } else if (Array.isArray(attributes)) {
      return arguments.callee.call(this, { children: attributes });
    } else if (attributes instanceof HTMLElement) {
      return arguments.callee.call(this, { children: [attributes] });
    } else {
      var toBuild = {};
      for (key in builders) {
        if (attributes && attributes.hasOwnProperty(key)) {
          toBuild[key] = attributes[key];
          delete attributes[key];
        }
      }

      var el = createElement(name, attributes);

      for (key in toBuild) {
        builders[key](el, toBuild[key]);
      }

      // A lifecycle function that can be called after the element's are
      // appended to the dom.
      el.load = function () {
        Array.from(el.children).map(function (c) { c.load() });
        if (el.onload) el.onload();
      };

      return el;
    };
  }
}

var attributeBuilders = {
  style: function (el, styles) {
    merge(el.style, styles);
  },
  text: function (el, text) {
    el.appendChild(document.createTextNode(text));
  },
  children: function (el, children) {
    if (!children.map)
      console.log(children);
    children.map(function (child) {
      if (child instanceof Node) {
        el.appendChild(child);  
      } else {
        el.appendChild(objToDOMNode(child));
      }
    });
  }
};

window.html = ['div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'input', 'label', 'button', 'textarea', 'a', 'ul', 'li', 'ol', 'pre', 'img']
  .reduce(function (h, e) {
    h[e] = elementFactory(e, attributeBuilders);
    return h;
  }, {});

// ----- LITTLE VDOM SPA STUFF -----

var util = {
  findChild: function (el, index, id) {
    return id 
      ? el.querySelector(String.format("[data-v-dom-id='{id}']", { id: id }))
      : el.childNodes[index];
  },
  buildPath: function (path, tag, index, id) {
    return id
      ? String.format("{path} > [data-v-dom-id='{id}']", { path: path, id: id }) 
      : String.format("{path} > {tag}:nth-child({index})", { path: path, tag: tag, index: index + 1 })
  }
};

var attributeDiffers = {
  childNodes: function (oldDom, newDom, path) {
    var patches = Array.from(oldDom.childNodes)
      .reduce(function (patches, child, index) {
        var newChild = util.findChild(newDom, index, child.dataset && child.dataset.vDomId);

        if (newChild) {
          var patch = html.diff(
            child,
            newChild,
            util.buildPath(path, child.tagName, index, newChild.dataset && newChild.dataset.vDomId)
          );
          return patches.concat(patch);
        } else {
          return patches.concat({
            type: 'delete',
            path: util.buildPath(path, child.tagName, index, child.dataset && child.dataset.vDomId)
          });
        }
      }, []);

    patches = Array.from(newDom.childNodes)
      .reduce(function (patches, child, index) {
        var oldChild = util.findChild(oldDom, index, child.dataset && child.dataset.vDomId);

        if (!oldChild) {
          return patches.concat({
            type: 'create',
            element: child,
            path: path
          });
        }
        return patches;
      }, patches);

    return patches;
  }
};

html.diff = function (oldDom, newDom, path) {
  var patches = [];

  for (var key in newDom) {
    if (attributeDiffers.hasOwnProperty(key)) {
      patches = patches.concat(
        attributeDiffers[key](oldDom, newDom, path || oldDom.tagName)
      );
    }
  }

  return patches;
};

html.patch = function (element, patches) {
  patches.forEach(function (patch) {
    var subject = element.querySelector(patch.path);
    switch (patch.type) {
      case 'create':
        subject.append(patch.element);
        break;
      case 'delete':
        subject.parentElement.removeChild(subject);
        break;
      default:
        console.error('Patch not supported', path.type);
        break;
    }
  });

  return element;
}

function makeRenderer(root, data, view) {
  return function () {  
    root = root || document.body;

    if (typeof root === 'string')
      root = document.getElementById(root);

    while (root.firstChild) {
      root.removeChild(root.firstChild);
    }
    var newChild = view(data);
    root.appendChild(newChild);
    newChild.load();
  }
}
