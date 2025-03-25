function SimpleSVG(path, x, y, w, h, loadCallback) {
  let mapX = x;
  let mapY = y;
  let mapW = w;
  let mapH = h;
  let doc = null;

  let children = { };

  let xhr = new XMLHttpRequest();
  xhr.overrideMimeType("image/svg+xml");  // just in case server doesn't set it properly
  xhr.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      handleDoc(xhr.responseXML.documentElement);
      if (loadCallback) {  //
        loadCallback();
      }
    }
  };
  xhr.open("GET", path, true);
  xhr.send();


  function handleDoc(content) {
    doc = content;

    document.getElementsByTagName("body")[0].appendChild(doc);

    // create a lookup assigning the first level of g and path shapes as the list
    doc.childNodes.forEach(function(node) {
      if (node.nodeName == 'path' || node.nodeName == 'g') {
        children[node.id] = node;
      }
    });

    let sketch = document.getElementById('defaultCanvas0');
    let bounds = sketch.getBoundingClientRect();
    let sketchX = window.scrollX + bounds.left;
    let sketchY = window.scrollY + bounds.top;

    doc.style.position = 'absolute';
    doc.style.left = (sketchX + mapX) + 'px';
    doc.style.top = (sketchY + mapY) + 'px';
    doc.style.width = mapW + 'px';
    doc.style.height = mapH + 'px';
  }


  this.listShapes = function() {
    return Object.keys(children);
  };


  function setAttributeRecursive(shape, attr, what) {
    if (shape.hasAttribute(attr)) {  // don't introduce new attrs where not needed
      shape.setAttribute(attr, what);
    }
    shape.childNodes.forEach(function(kid) {
      if (kid.nodeName == 'path' || kid.nodeName == 'g') {
        //path.setAttribute('fill', what);
        setAttributeRecursive(kid, attr, what);
      }
    });
  }

  this.setFill = function(target, what) {
    let shape = typeof(target) === 'string' ? doc.getElementById(target) : target;
    if (shape !== null) {
      setAttributeRecursive(shape, 'fill', what);
    } else {
      if (typeof(target) === 'string') {
        console.err(`${target} does not exist in the svg`);
      }
    }
  };


  this.setStroke = function(target, what) {
    let shape = typeof(target) === 'string' ? doc.getElementById(target) : target;
    if (shape !== null) {
      setAttributeRecursive(shape, 'stroke', what);
    } else {
      if (typeof(target) === 'string') {
        console.err(`${target} does not exist in the svg`);
      }
    }
  };


  this.onClick = function(userCallback) {
    Object.values(children).forEach(function(kid) {
      kid.onclick = function(evt) {
        let el = evt.target;
        // walk up the tree to make sure we're only getting first level deep
        while (el.parentNode.nodeName !== 'svg') {
          el = el.parentNode;
        }
        userCallback(el);
      };
    });
  };


  this.onMouseOver = function(userCallback) {
    Object.values(children).forEach(function(kid) {
      kid.onmouseover = function(evt) {
        let el = evt.target;
        // walk up the tree to make sure we're only getting first level deep
        while (el.parentNode.nodeName !== 'svg') {
          el = el.parentNode;
        }
        userCallback(el);
      };
    });
  };


  this.onMouseOut = function(userCallback) {
    Object.values(children).forEach(function(kid) {
      kid.onmouseout = function(evt) {
        let el = evt.target;
        // walk up the tree to make sure we're only getting first level deep
        while (el.parentNode.nodeName !== 'svg') {
          el = el.parentNode;
        }
        userCallback(el);
      };
    });
  };
}
