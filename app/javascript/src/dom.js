// test
// js library to build uis
// just lets us build
// * dom elements
// * wrappers around dom elements

// every app should have:
// * data / state
// * actions / commands
// * queries / (just the state)
// * views / ui

// API
//
// mount object -> object -> function -> element
//
// action value -> (state -> state) | state
//
// view state -> actions -> element
function log(i) {
  console.log(i);
  return i;
}

// history api is limited in size so create our own.
var stateHistory = [];

function mount(state, actions, view, container, rootNode) {
  // Manage history changes
  actions = merge(actions, actions, {
    default: function (old, _, key) {
      var action = old[key];
      old[key] = function actionHandler() {
        var result = action.apply(actions, arguments);

        if (typeof result === 'function')
          result = result(state);

        // only update the ui if something is returned
        if (result) {
          state = merge(state, result);
          scheduleRender();
        }
      }
    }
  });

  var skipRender = false;
  function scheduleRender() {
    if (!skipRender) {
      skipRender = true;
      setTimeout(render);
    }
  }

  function render () {
    skipRender = false;

    if (rootNode) {
      var newNode = view(state, actions);
      rootNode.parentNode.replaceChild(newNode, rootNode);
      rootNode = newNode;
      rootNode.load && rootNode.load();
    } else if (container) {
      rootNode = view(state, actions);
      container.appendChild(rootNode);
      rootNode.load && rootNode.load();
    } else {
      // enables sub components to use mount without wrapper element
      rootNode = view(state, actions);
    }

    return rootNode;
  }

  // mount can be used to mount sub components
  return render();
}

function h(tag, attributes, children) {
  var element = merge(document.createElement(tag), attributes, {
    style: function (old, _new, key) {
      // merge them inplace without setting them anew
      merge(old[key], _new[key]);
    }
  });

  element.load = function () {
    for (var i = 0; i < element.children.length; i++) {
      element.children[i].onload && element.children[i].onload();
    }
    element.onload && element.onload();
  };

  return (
      children
        ? (children.hasOwnProperty('length') && typeof children !== 'string'
            ? children
            : [children])
        : []
    ).
    reduce(function (node, child) {
      node.appendChild((typeof child === 'string' || typeof child === 'number')
          ? document.createTextNode(child)
          : child);

      return node;
    }, element);
}

function merge(obj1, obj2, keyHandlers) {
  if (!obj1) return obj2;
  if (!obj2) return obj1;
  // entities with the same id shouldn't be merged
  if (obj1.hasOwnProperty('id') && obj2.hasOwnProperty('id') && obj1.id !== obj2.id) return obj2;

  for (var key in obj2) {
    if (obj2.hasOwnProperty(key)) {
      if (keyHandlers && keyHandlers.hasOwnProperty(key))
        keyHandlers[key](obj1, obj2, key);
      else if (keyHandlers && keyHandlers.default)
        keyHandlers.default(obj1, obj2, key);
      else if (obj2[key] && typeof obj2[key] === 'object')
        obj1[key] = merge(obj1[key], obj2[key]);
      else
        obj1[key] = obj2[key];
    }
  }

  return obj1;
}

function memoize(fn) {
  var cache = {};
  return function () {
    var key = JSON.stringify([].slice.call(arguments));
    return cache[key] || (cache[key] = fn.apply(this, arguments));
  };
}

export { mount, h };
