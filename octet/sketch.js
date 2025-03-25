import { fetchJSON, _splineForward } from './util.js';

// NOTE Do not use 0 for any of because that will break
//      the 'mode || _currentMode' pattern.

// NOTE When updating constants, assignments in trainingWheels() too.

export const LEFT = 37;
export const RIGHT = 39;

export const UP = 38;
export const DOWN = 40;

export const BASELINE = 100; //0;
export const TOP = 101;
export const BOTTOM = 102;

export const CORNER = 1; //0;
export const CORNERS = 2; //1;
export const CENTER = 3;  // formerly DIAMETER
export const RADIUS = 4; //2;

export const OPEN = 1;
export const CLOSE = 2;

// arc() modes, along with OPEN (the default)
export const CHORD = 2;
export const PIE = 3;
export const WEDGE = 4;

export const ROUND = 'round';  //1;
export const SQUARE = 'square';  //2;
export const BUTT = 'butt';  // 3;
export const MITER = 'miter';  // 4;
export const BEVEL = 'bevel';  // 5;

// const PAGE_UP = 33;
// const PAGE_DOWN = 34;

export const BACKSPACE = 8;
export const DELETE = 127;

export const PI = Math.PI;
export const TAU = Math.PI * 2;

export const RADIANS = 1; //0;
export const DEGREES = 2; //1;

// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
export const REPLACE    = 'copy';  // needs verification
export const BLEND      = 'source-over';  // default
export const ADD        = 1 << 1;  // TODO
export const SUBTRACT   = 1 << 2;  // TODO
export const LIGHTEST   = 'lighten';  // needs verification ('lightest' also exists?)
export const DARKEST    = 'darken';  // needs verification ('darkest' does not exist)
export const DIFFERENCE = 'difference';
export const EXCLUSION  = 'exclusion';
export const MULTIPLY   = 'multiply';
export const SCREEN     = 'screen';
export const OVERLAY    = 'overlay';
export const HARD_LIGHT = 'hard-light';
export const SOFT_LIGHT = 'soft-light';
export const DODGE      = 'color-dodge';
export const BURN       = 'color-burn';


function _isAvailable(where, what) {
  return typeof(where[what]) !== 'undefined';
}


// Putting in a function because we may want to change how it's used later.
// Was 'methodExists' but it may not necessarily be a class method.
// Also not 'functionExists' because that suggests checking by name rather
// than the actual reference to it.
function _isFunction(what) {
  return typeof(what) !== 'undefined';
}


/*
function _getOffsets(elem) {
  let rect = elem.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX
  }
}
*/


// https://stackoverflow.com/a/4819886
function _isTouchDevice() {
  return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0) ||
     (navigator.msMaxTouchPoints > 0));
}


function _openTypeLoaded() {
  return typeof(opentype) !== 'undefined';
}


function _determinant3x3(t00, t01, t02,
                         t10, t11, t12,
                         t20, t21, t22) {
  return (t00 * (t11 * t22 - t12 * t21) +
          t01 * (t12 * t20 - t10 * t22) +
          t02 * (t10 * t21 - t11 * t20));
}


class Matrix4x4 {
  m00; m01; m02; m03;
  m10; m11; m12; m13;
  m20; m21; m22; m23;
  m30; m31; m32; m33;

  constructor() {
    if (arguments.length == 16) {
      // console.log('setting matrix to', arguments);
      this.set(...arguments);
    } else {
      // console.log('args to matrix constructor:', arguments);
    }
  }

  set(m00, m01, m02, m03,
      m10, m11, m12, m13,
      m20, m21, m22, m23,
      m30, m31, m32, m33) {
    this.m00 = m00; this.m01 = m01; this.m02 = m02; this.m03 = m03;
    this.m10 = m10; this.m11 = m11; this.m12 = m12; this.m13 = m13;
    this.m20 = m20; this.m21 = m21; this.m22 = m22; this.m23 = m23;
    this.m30 = m30; this.m31 = m31; this.m32 = m32; this.m33 = m33;
  }

  copy() {
    return new Matrix4x4(this.m00, this.m01, this.m02, this.m03,
                        this.m10, this.m11, this.m12, this.m13,
                        this.m20, this.m21, this.m22, this.m23,
                        this.m30, this.m31, this.m32, this.m33)
  }

  apply(n00, n01, n02, n03,
        n10, n11, n12, n13,
        n20, n21, n22, n23,
        n30, n31, n32, n33) {
    if (arguments.length == 1) {
      const source = n00;
      // console.trace('args 1', source.toString());
      this.apply(source.m00, source.m01, source.m02, source.m03,
                 source.m10, source.m11, source.m12, source.m13,
                 source.m20, source.m21, source.m22, source.m23,
                 source.m30, source.m31, source.m32, source.m33);

    } else if (arguments.length == 16) {
      // console.log(arguments);
      let r00 = this.m00*n00 + this.m01*n10 + this.m02*n20 + this.m03*n30;
      let r01 = this.m00*n01 + this.m01*n11 + this.m02*n21 + this.m03*n31;
      let r02 = this.m00*n02 + this.m01*n12 + this.m02*n22 + this.m03*n32;
      let r03 = this.m00*n03 + this.m01*n13 + this.m02*n23 + this.m03*n33;

      let r10 = this.m10*n00 + this.m11*n10 + this.m12*n20 + this.m13*n30;
      let r11 = this.m10*n01 + this.m11*n11 + this.m12*n21 + this.m13*n31;
      let r12 = this.m10*n02 + this.m11*n12 + this.m12*n22 + this.m13*n32;
      let r13 = this.m10*n03 + this.m11*n13 + this.m12*n23 + this.m13*n33;

      let r20 = this.m20*n00 + this.m21*n10 + this.m22*n20 + this.m23*n30;
      let r21 = this.m20*n01 + this.m21*n11 + this.m22*n21 + this.m23*n31;
      let r22 = this.m20*n02 + this.m21*n12 + this.m22*n22 + this.m23*n32;
      let r23 = this.m20*n03 + this.m21*n13 + this.m22*n23 + this.m23*n33;

      let r30 = this.m30*n00 + this.m31*n10 + this.m32*n20 + this.m33*n30;
      let r31 = this.m30*n01 + this.m31*n11 + this.m32*n21 + this.m33*n31;
      let r32 = this.m30*n02 + this.m31*n12 + this.m32*n22 + this.m33*n32;
      let r33 = this.m30*n03 + this.m31*n13 + this.m32*n23 + this.m33*n33;

      this.m00 = r00; this.m01 = r01; this.m02 = r02; this.m03 = r03;
      this.m10 = r10; this.m11 = r11; this.m12 = r12; this.m13 = r13;
      this.m20 = r20; this.m21 = r21; this.m22 = r22; this.m23 = r23;
      this.m30 = r30; this.m31 = r31; this.m32 = r32; this.m33 = r33;
    }
  }

  // Apply another matrix to the left of this one.
  preApply(n00, n01, n02, n03,
           n10, n11, n12, n13,
           n20, n21, n22, n23,
           n30, n31, n32, n33) {
    let r00 = n00*this.m00 + n01*this.m10 + n02*this.m20 + n03*this.m30;
    let r01 = n00*this.m01 + n01*this.m11 + n02*this.m21 + n03*this.m31;
    let r02 = n00*this.m02 + n01*this.m12 + n02*this.m22 + n03*this.m32;
    let r03 = n00*this.m03 + n01*this.m13 + n02*this.m23 + n03*this.m33;

    let r10 = n10*this.m00 + n11*this.m10 + n12*this.m20 + n13*this.m30;
    let r11 = n10*this.m01 + n11*this.m11 + n12*this.m21 + n13*this.m31;
    let r12 = n10*this.m02 + n11*this.m12 + n12*this.m22 + n13*this.m32;
    let r13 = n10*this.m03 + n11*this.m13 + n12*this.m23 + n13*this.m33;

    let r20 = n20*this.m00 + n21*this.m10 + n22*this.m20 + n23*this.m30;
    let r21 = n20*this.m01 + n21*this.m11 + n22*this.m21 + n23*this.m31;
    let r22 = n20*this.m02 + n21*this.m12 + n22*this.m22 + n23*this.m32;
    let r23 = n20*this.m03 + n21*this.m13 + n22*this.m23 + n23*this.m33;

    let r30 = n30*this.m00 + n31*this.m10 + n32*this.m20 + n33*this.m30;
    let r31 = n30*this.m01 + n31*this.m11 + n32*this.m21 + n33*this.m31;
    let r32 = n30*this.m02 + n31*this.m12 + n32*this.m22 + n33*this.m32;
    let r33 = n30*this.m03 + n31*this.m13 + n32*this.m23 + n33*this.m33;

    this.m00 = r00; this.m01 = r01; this.m02 = r02; this.m03 = r03;
    this.m10 = r10; this.m11 = r11; this.m12 = r12; this.m13 = r13;
    this.m20 = r20; this.m21 = r21; this.m22 = r22; this.m23 = r23;
    this.m30 = r30; this.m31 = r31; this.m32 = r32; this.m33 = r33;
  }

  determinant() {
    let f = this.m00
      * ((this.m11 * this.m22 * this.m33 +
          this.m12 * this.m23 * this.m31 +
          this.m13 * this.m21 * this.m32)
          - this.m13 * this.m22 * this.m31
          - this.m11 * this.m23 * this.m32
          - this.m12 * this.m21 * this.m33);
    f -= this.m01
      * ((this.m10 * this.m22 * this.m33 +
          this.m12 * this.m23 * this.m30 +
          this.m13 * this.m20 * this.m32)
          - this.m13 * this.m22 * this.m30
          - this.m10 * this.m23 * this.m32
          - this.m12 * this.m20 * this.m33);
    f += this.m02
      * ((this.m10 * this.m21 * this.m33 +
          this.m11 * this.m23 * this.m30 +
          this.m13 * this.m20 * this.m31)
          - this.m13 * this.m21 * this.m30
          - this.m10 * this.m23 * this.m31
          - this.m11 * this.m20 * this.m33);
    f -= this.m03
      * ((this.m10 * this.m21 * this.m32 +
          this.m11 * this.m22 * this.m30 +
          this.m12 * this.m20 * this.m31)
          - this.m12 * this.m21 * this.m30
          - this.m10 * this.m22 * this.m31
          - this.m11 * this.m20 * this.m32);
    return f;
  }

  invert() {
    const det = this.determinant();
    if (det == 0) {
      return false;
    }

    // first row
    let t00 =  _determinant3x3(this.m11, this.m12, this.m13,
                               this.m21, this.m22, this.m23,
                               this.m31, this.m32, this.m33);
    let t01 = -_determinant3x3(this.m10, this.m12, this.m13,
                               this.m20, this.m22, this.m23,
                               this.m30, this.m32, this.m33);
    let t02 =  _determinant3x3(this.m10, this.m11, this.m13,
                               this.m20, this.m21, this.m23,
                               this.m30, this.m31, this.m33);
    let t03 = -_determinant3x3(this.m10, this.m11, this.m12,
                               this.m20, this.m21, this.m22,
                               this.m30, this.m31, this.m32);

    // second row
    let t10 = -_determinant3x3(this.m01, this.m02, this.m03,
                               this.m21, this.m22, this.m23,
                               this.m31, this.m32, this.m33);
    let t11 =  _determinant3x3(this.m00, this.m02, this.m03,
                               this.m20, this.m22, this.m23,
                               this.m30, this.m32, this.m33);
    let t12 = -_determinant3x3(this.m00, this.m01, this.m03,
                               this.m20, this.m21, this.m23,
                               this.m30, this.m31, this.m33);
    let t13 =  _determinant3x3(this.m00, this.m01, this.m02,
                               this.m20, this.m21, this.m22,
                               this.m30, this.m31, this.m32);

    // third row
    let t20 =  _determinant3x3(this.m01, this.m02, this.m03,
                               this.m11, this.m12, this.m13,
                               this.m31, this.m32, this.m33);
    let t21 = -_determinant3x3(this.m00, this.m02, this.m03,
                               this.m10, this.m12, this.m13,
                               this.m30, this.m32, this.m33);
    let t22 =  _determinant3x3(this.m00, this.m01, this.m03,
                               this.m10, this.m11, this.m13,
                               this.m30, this.m31, this.m33);
    let t23 = -_determinant3x3(this.m00, this.m01, this.m02,
                               this.m10, this.m11, this.m12,
                               this.m30, this.m31, this.m32);

    // fourth row
    let t30 = -_determinant3x3(this.m01, this.m02, this.m03,
                               this.m11, this.m12, this.m13,
                               this.m21, this.m22, this.m23);
    let t31 =  _determinant3x3(this.m00, this.m02, this.m03,
                               this.m10, this.m12, this.m13,
                               this.m20, this.m22, this.m23);
    let t32 = -_determinant3x3(this.m00, this.m01, this.m03,
                               this.m10, this.m11, this.m13,
                               this.m20, this.m21, this.m23);
    let t33 =  _determinant3x3(this.m00, this.m01, this.m02,
                               this.m10, this.m11, this.m12,
                               this.m20, this.m21, this.m22);

    // transpose and divide by the determinant
    this.m00 = t00 / det;
    this.m01 = t10 / det;
    this.m02 = t20 / det;
    this.m03 = t30 / det;

    this.m10 = t01 / det;
    this.m11 = t11 / det;
    this.m12 = t21 / det;
    this.m13 = t31 / det;

    this.m20 = t02 / det;
    this.m21 = t12 / det;
    this.m22 = t22 / det;
    this.m23 = t32 / det;

    this.m30 = t03 / det;
    this.m31 = t13 / det;
    this.m32 = t23 / det;
    this.m33 = t33 / det;

    return true;
  }

  toString() {
    return '[ ' +
      this.m00 + ', ' + this.m01 + ', ' + this.m02 + ', ' + this.m03 + ', ' +
      this.m10 + ', ' + this.m11 + ', ' + this.m12 + ', ' + this.m13 + ', ' +
      this.m20 + ', ' + this.m21 + ', ' + this.m22 + ', ' + this.m23 + ', ' +
      this.m30 + ', ' + this.m31 + ', ' + this.m32 + ', ' + this.m33 + ' ]';
  }
}


export class Vec2 {
  x; y;

  constructor(ix, iy) {
    this.x = ix;
    this.y = iy;
  }

  set(a, b) {
    if (arguments.length == 1 && typeof(a) === 'object') {
      this.x = a.x;
      this.y = a.y;
    } else {
      this.x = a;
      this.y = b;
    }
  }

  mag() {
    return Math.sqrt(this.x*this.x + this.y*this.y);
  }

  dot(x, y) {
    if (arguments.length == 1 && typeof(x) === 'object') {
      return this.x * x.x + this.y * x.y;
    }
    return this.x * x + this.y * y;
  }

  normalize() {
    let m = this.mag();
    if (m != 0 && m != 1) {
      this.div(m);
    }
    return this;
  }

  limit(amount) {
    if (mag > amount) {
      normalize();
      this.mult(max);
    }
    return this;
  }

  copy() {
    return new Vec2(this.x, this.y);
  }

  add(a, b) {
    if (arguments.length == 1 && typeof(a) === 'object') {
      this.x += a.x;
      this.y += a.y;
    } else {
      this.x += a;
      this.y += b;
    }
    return this;
  }

  sub(a, b) {
    if (arguments.length == 1 && typeof(a) === 'object') {
      this.x -= a.x;
      this.y -= a.y;
    } else {
      this.x -= a;
      this.y -= b;
    }
    return this;
  }

  div(value) {
    this.x /= value;
    this.y /= value;
    return this;
  }

  mult(value) {
    this.x *= value;
    this.y *= value;
    return this;
  }
}


export class Sketch {
  // sketch;  // instead of self, since that'll conflict with window.self

  width;
  height;

  // TODO this should roughly be the default, need to clean it up
  _fullSize = true;

  frameCount = 0;
  focused = true;

  inputX = 0;
  inputY = 0;

  mouseX = 0;
  mouseY = 0;
  mouseIsPressed = false;

  touchX;
  touchY;
  touchIsPressed = false;

  // const PRESS = 1;
  // const RELEASE = 2;
  // const CLICK = 3;
  // const DRAG = 4;
  // const MOVE = 5;
  // let mouseAction = 0;

  key;
  keyCode;

  //

  _blendMode = BLEND;
  _angleMode = RADIANS;
  _rectMode = CORNER;
  _ellipseMode = CENTER;

  //

  canvas = null;
  ctx;


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // CONSTRUCTOR


  constructor(canvas_id) {
    if (canvas_id) {
      this.init(canvas_id);
    }
  }


  init(canvas_id) {
    this._setupCanvas(canvas_id);
    this._handleLoad();
    this.loop();
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // LOAD


  _insideLoad = false;
  _loadPromises = [ ];

  _handleLoad() {
    if (_isAvailable(this, 'load')) {
      this._insideLoad = true;

      // call the sketch's load block
      this.load();

      // 'values' will contain everything returned from the promises
      // (most of which will just be undefined)
      Promise.all(this._loadPromises).then((/*values*/) => {
        /*
        values.forEach((item) => {
          if (typeof(item) !== 'undefined') {
            console.log(item);
          }
        });
        */
        this._insideLoad = false;
      });
    }
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // FILL/STROKE

  _fill = null;
  _stroke = null;
  _strokeWeight = 1;
  _strokeCap = ROUND;
  _strokeJoin = MITER;

  _strokeCapSet = new Set([ 'butt', 'round', 'square' ]);
  _strokeJoinSet = new Set([ 'miter', 'bevel', 'round' ]);


  fill(what) {
    // console.log(`sketch: inside fill(${what})`);
    // if (what == 'white') {
    //   console.trace();
    // }
    this._fill = what;
    // this.ctx.fillStyle = what;
    // console.log(`sketch: after fill(${what}), ctx.fillStyle is ${this.ctx.fillStyle}`);
    this._fillImpl();
  }


  _fillImpl() {
    this.ctx.fillStyle = this._fill;
  }


  noFill() {
    this._fill = null;
    // ctx.fillStyle = 'none';
  }


  stroke(what) {
    this._stroke = what;
    this._strokeImpl();
  }


  _strokeImpl() {
    this.ctx.strokeStyle = this._stroke;
  }


  noStroke() {
    this._stroke = null;
    // ctx.strokeStyle = 'none';
  }


  // butt, round, square or BUTT, ROUND, SQUARE
  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineJoin
  strokeCap(newCap) {
    // SQUARE, PROJECT, ROUND
    if (this._strokeCapSet.has(newCap)) {
      this.ctx.lineCap = newCap;
      this._strokeCap = newCap;
    } else {
      console.error("Please use strokeCap(BUTT), strokeCap(ROUND), or strokeCap(SQUARE)");
    }
  }


  // 'miter', 'bevel', 'round' or MITER, BEVEL, ROUND
  // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineCap
  strokeJoin(newJoin) {
    if (this._strokeJoinSet.has(newJoin)) {
      this.ctx.lineJoin = newJoin;
      this._strokeJoin = newJoin;
    } else {
      console.error("Please use strokeJoin(MITER), strokeJoin(BEVEL), or strokeJoin(ROUND)");
    }
  }


  strokeWeight(w) {
    // console.log('setting weight to', w);
    this._strokeWeight = w;
    // if (w === 0) {
    //   this.noStroke();
    // } else {
    this.ctx.lineWidth = w;
    // }
  }


  /*
  function fillGray(g) {
    var gg = Math.floor(g);
    fillRGBA(gg, gg, gg, 255);
  }


  function fillRGBA(r, g, b, a) {
    ctx.fillStyle = 'rgba(' + constrain(r, 0, 255) + ',' + constrain(g, 0, 255) + ',' + constrain(b, 0, 255) + ',' + constrain(a/255.0, 0, 1) + ')';
  }
  */


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // BLEND MODES


  blendMode(mode) {
    this._blendMode = mode;
    this._blendModeImpl();
  }


  _blendModeImpl() {
    this.ctx.globalCompositeOperation = this._blendMode;
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // CLEAR

  clear(farbe) {
    // better for flicker but still terrible
    // this.canvas.style.backgroundColor = farbe;

    this.ctx.save();
    const ratio = window.devicePixelRatio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // ctx.clearRect(0, 0, canvas.width, canvas.height);
    // console.log('clear() setting ctx.fillStyle to', farbe, '(it was', this.ctx.fillStyle, ')');
    this.ctx.fillStyle = farbe;
    // console.log('clear() ctx.fillStyle is now', this.ctx.fillStyle);
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
    // console.log('clear() ctx.fillStyle after restore is', this.ctx.fillStyle);
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // PRIMITIVES


  // TODO this is slow! (somewhat intentionally) need to implement setPixel()
  point(x, y) {
    if (this._stroke !== null && this._strokeWeight !== 0) {
      let saveFill = this.ctx.fillStyle;
      this.ctx.fillStyle = this.ctx.strokeStyle;

      this.ctx.beginPath();
      const radius = this._strokeWeight / 2;
      if (this._strokeCap == ROUND) {
        this.ctx.ellipse(x, y, radius, radius, 0, 0, TAU);
      } else {
        this.ctx.fillRect(x - radius, y - radius, this._strokeWeight, this._strokeWeight);
      }
      this.ctx.fill();
      this.ctx.closePath();

      this.ctx.fillStyle = saveFill;
    }
  }


  line(x1, y1, x2, y2) {
    if (this._stroke !== null && this._strokeWeight !== 0) {
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }


  triangle(x1, y1, x2, y2, x3, y3) {
    // console.log('triangle()', this._fill, this._stroke);
    this.beginPath();
    this.vertex(x1, y1);
    this.vertex(x2, y2);
    this.vertex(x3, y3);
    this.endPath(CLOSE);
  }


  quad(x1, y1, x2, y2, x3, y3, x4, y4) {
    this.beginPath();
    this.vertex(x1, y1);
    this.vertex(x2, y2);
    this.vertex(x3, y3);
    this.vertex(x4, y4);
    this.endPath(CLOSE);
  }


  rectMode(newMode) {
    if (newMode != CORNER && newMode != CORNERS && newMode != CENTER && newMode != RADIUS) {
      console.error('Use rectMode() with CORNER, CORNERS, CENTER, or RADIUS');
    } else {
      this._rectMode = newMode;
    }
  }


  rect(x, y, w, h, mode) {
    mode = mode || this._rectMode;
    if (mode != CORNER && mode != CORNERS && mode != CENTER && mode != RADIUS) {
      console.error('The mode for rect() should be CORNER, CORNERS, CENTER, or RADIUS');
    }

    if (mode == CORNERS) {
      w -= x;  // get width/height by subtracting x2/y2
      h -= y;

    } else if (mode == CENTER) {
      x -= w/2;
      y -= h/2;

    } else if (mode == RADIUS) {
      x -= w;
      y -= h;
      w *= 2;
      h *= 2;
    }

    if (arguments.length == 4 || arguments.length == 5) {
      if (this._fill != null) {
        this.ctx.fillRect(x, y, w, h);
      }
      if (this._stroke !== null && this._strokeWeight !== 0) {
        this.ctx.beginPath();
        this.ctx.lineWidth = this._strokeWeight;
        this.ctx.rect(x, y, w, h);
        this.ctx.stroke();
      }
    } else {
      console.error('rect() expects 4 or 8 parameters');
    }
  }


  roundRect(x, y, w, h, tl, tr, br, bl, mode) {
    mode = mode || this._rectMode;
    // TODO merge this with below, if/when decided it's preferable
    if (mode != CORNER && mode != CORNERS && mode != CENTER) {
      console.error('The mode for roundRect() should be CORNER, CORNERS, or CENTER');
    }

    if (mode == CORNERS) {
      w -= x;  // get width/height by subtracting x2/y2
      h -= y;
    } else if (mode == CENTER) {
      x -= w/2;
      y -= h/2;
    }

    if (arguments.length == 8 || arguments.length == 9) {
      this.ctx.beginPath();
      // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/roundRect
      this.ctx.roundRect(x, y, w, h, [ tl, tr, br, bl ]);
      if (this._fill != null) {
        this.ctx.fill();
      }
      if (this._stroke != null) {
        this.ctx.stroke();
      }
    } else {
      console.error('roundRect() 8 parameters (or a 9th with the "mode"');
    }
  }


  square(x, y, extent, mode) {
    this.rect(x, y, extent, extent, mode);
  }


  ellipseMode(newMode) {
    if (newMode != CORNER && newMode != CORNERS && newMode != CENTER && newMode != RADIUS) {
      console.error('Use ellipseMode() with CORNER, CORNERS, CENTER, or RADIUS, not', newMode);
      // console.error('RADIUS is', RADIUS);
    } else {
      this._ellipseMode = newMode;
    }
  }


  circle(x, y, extent, mode) {
    this.ellipse(x, y, extent, extent, mode);
  }


  ellipse() {
    const mode = arguments[4] || this._ellipseMode;
    if (mode == CENTER) {
      this._ellipseImpl(arguments[0], arguments[1], arguments[2], arguments[3]);

    } else if (mode == RADIUS) {
      this._ellipseImpl(arguments[0], arguments[1], arguments[2]*2, arguments[3]*2);

    } else if (mode == CORNER) {
      let w = arguments[2];
      let h = arguments[3];
      this._ellipseImpl(arguments[0] + w/2, arguments[1] + h/2, w, h);

    } else if (mode == CORNERS) {
      let w = arguments[2] - arguments[0];
      let h = arguments[3] - arguments[1];
      this._ellipseImpl(arguments[0] + w/2, arguments[1] + h/2, w, h);
    }
  }


  _ellipseImpl(cx, cy, w, h) {
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/ellipse
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, w/2, h/2, 0, 0, TAU);
    if (this._fill != null) {
      this.ctx.fill();
    }
    if (this._stroke != null && this._strokeWeight != 0) {
      this.ctx.stroke();
    }
    this.ctx.closePath();
  }


  arc(x, y, extent, start, stop, kind=WEDGE) {
    // console.log(x, y, extent, start, stop, kind);
    let centerX = x;
    let centerY = y;
    let radius = extent;

    if (this._ellipseMode == CORNERS) {
      radius /= 2  // was diameter
      centerX -= radius
      centerY -= radius

    } else if (this._ellipseMode == RADIUS) {
      // no changes

    } else if (this._ellipseMode == CENTER) {
      radius /= 2
    }

    if (this._angleMode == DEGREES) {
      start = radians(start)
      stop = radians(stop)
    }

    // make sure the loop will exit before starting while()
    if (start == start && stop == stop) {
      // ignore equal and degenerate cases
      // if (stop > start) {
        // make sure that we're starting at a useful point
        // while (start < 0) {
        //   start += TAU;
        //   stop += TAU;
        // }

        if (stop - start > TAU) {
          // don't change start, it is visible in PIE mode
          stop = start + TAU;
        }
        this._arcImpl(centerX, centerY, radius, start, stop, kind);
      // }
    }
  }


  _arcImpl(centerX, centerY, radius, startAngle, stopAngle, kind) {
    if (radius <= 0) {
      console.error(`arc() called with radius ${radius}`);
      return;
    }
    // console.log(centerX, centerY, radius, startAngle, stopAngle, kind);
    // let start = CGFloat(startAngle)
    // let stop = CGFloat(stopAngle)
    // let r = CGFloat(radius)

    // let startPoint: CGPoint =
    //     CGPoint(x: CGFloat(x + radius*Foundation.cos(startAngle)),
    //             y: CGFloat(y + radius*Foundation.sin(startAngle)))
    // let centerPoint: CGPoint =
    //     CGPoint(x: CGFloat(x), y: CGFloat(y))
    // let stopPoint: CGPoint =
    //     CGPoint(x: CGFloat(x + radius*Foundation.cos(stopAngle)),
    //             y: CGFloat(y + radius*Foundation.sin(stopAngle)))
    let startX = centerX + radius * Math.cos(startAngle);
    let startY = centerY + radius * Math.sin(startAngle);
    let stopX = centerX + radius * Math.cos(stopAngle);
    let stopY = centerY + radius * Math.sin(stopAngle);

    if (kind == WEDGE) {
      if (this._fill != null) {
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        // this.ctx.moveTo(stopX, stopY);
        // this.ctx.lineTo(centerX, centerY);
        // this.ctx.lineTo(startX, startY);
        this.ctx.arc(centerX, centerY, radius, startAngle, stopAngle, false);
        // this.endShape(OPEN);
        // this.ctx.moveTo(startX, startY);
        // this.ctx.arcTo(stopX, stopY, centerX, centerY, radius);

        if (this._fill != null) {
            this.ctx.fill();
        }
        // if (this._stroke != null) {
        //     this.ctx.stroke();
        // }
      }

      if (this._stroke != null) {
        this.ctx.beginPath();
        // this.ctx.moveTo(centerX, centerY);
        this.ctx.arc(centerX, centerY, radius, startAngle, stopAngle, false);

        // if (this._fill != null) {
        //   this.ctx.fill();
        // }
        if (this._stroke != null && this._strokeWeight != 0) {
          this.ctx.stroke();
        }
      }

    } else if (kind == OPEN) {
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, startAngle, stopAngle, false);

      if (this._fill != null) {
        this.ctx.fill();
      }
      if (this._stroke != null && this._strokeWeight != 0) {
        this.ctx.stroke();
      }

    } else if (kind == CHORD) {
      if (this._fill != null) {
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, startAngle, stopAngle, false);

        if (this._fill != null) {
          this.ctx.fill();
        }
      }

      if (this._stroke != null && this._strokeWeight != 0) {
        this.ctx.beginPath();
        this.ctx.moveTo(stopX, stopY);
        this.ctx.lineTo(startX, startY);
        this.ctx.arc(centerX, centerY, radius, startAngle, stopAngle, false);
        this.ctx.stroke();
      }

    } else if (kind == PIE) {
      this.ctx.beginPath();
      this.ctx.moveTo(stopX, stopY);
      this.ctx.lineTo(centerX, centerY);
      this.ctx.lineTo(startX, startY);
      this.ctx.arc(centerX, centerY, radius, startAngle, stopAngle, false);

      if (this._fill != null) {
        this.ctx.fill();
      }
      if (this._stroke != null && this._strokeWeight != 0) {
        this.ctx.stroke();
      }
    }
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // PATHS


  // _shapeMoved = false;
  _vertices = null;


  beginPath() {
    // this._shapeMoved = false;
    // this.ctx.beginPath();
    this._vertices = [ ];
    this._curveVertices = null;
  }


  vertex(x, y) {
    /*
    if (this._shapeMoved) {
      this.ctx.lineTo(x, y);
    } else {
      this.ctx.moveTo(x, y);
      this._shapeMoved = true;
    }
    */
    this._vertices.push({ 'x': x, 'y': y });
  }


  endPath(mode=OPEN) {
    this.ctx.beginPath();
    if (this._vertices != null) {
      this._vertices.forEach((vertex, index) => {
        if (index == 0) {
          this.ctx.moveTo(vertex.x, vertex.y);
        } else {
          this.ctx.lineTo(vertex.x, vertex.y);
        }
      });
      if (mode == CLOSE) {
        this.ctx.closePath();
      }
      if (this._fill != null) {
        this.ctx.fill();
      }
      if (this._stroke != null && this._strokeWeight != 0) {
        this.ctx.stroke();
      }
      this._vertices = null;
    }
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // BEZIER

  _bezierInited = false;
  _bezierDetail;

  _bezierBasisMatrix =  // const, used by both curve and bezier
    new Matrix4x4(-1,  3, -3,  1,
                   3, -6,  3,  0,
                  -3,  3,  0,  0,
                   1,  0,  0,  0);

  _bezierDrawMatrix = null;


  bezierVertex(x2, y2, x3, y3, x4, y4) {
    this._bezierInitCheck();
    if (this._vertices == null) {
      console.error("vertex() must be used at least once " +
                    "before bezierVertex() or quadraticVertex()");
    }
    const draw = this._bezierDrawMatrix;

    const prev = this._vertices[this._vertices.length - 1];
    let x1 = prev.x;
    let y1 = prev.y;

    let xplot1 = draw.m10*x1 + draw.m11*x2 + draw.m12*x3 + draw.m13*x4;
    let xplot2 = draw.m20*x1 + draw.m21*x2 + draw.m22*x3 + draw.m23*x4;
    let xplot3 = draw.m30*x1 + draw.m31*x2 + draw.m32*x3 + draw.m33*x4;

    let yplot1 = draw.m10*y1 + draw.m11*y2 + draw.m12*y3 + draw.m13*y4;
    let yplot2 = draw.m20*y1 + draw.m21*y2 + draw.m22*y3 + draw.m23*y4;
    let yplot3 = draw.m30*y1 + draw.m31*y2 + draw.m32*y3 + draw.m33*y4;

    for (let j = 0; j < this._bezierDetail; j++) {
      x1 += xplot1; xplot1 += xplot2; xplot2 += xplot3;
      y1 += yplot1; yplot1 += yplot2; yplot2 += yplot3;
      this.vertex(x1, y1);
    }
  }


  quadraticVertex(cx, cy, x3, y3) {
    const prev = this._vertices[this._vertices.length - 1];
    const x1 = prev.x;
    const y1 = prev.y;

    bezierVertex(x1 + ((cx-x1)*2 / 3.0), y1 + ((cy-y1)*2 / 3.0),
                 x3 + ((cx-x3)*2 / 3.0), y3 + ((cy-y3)*2 / 3.0),
                 x3, y3);
  }


  _bezierInitCheck() {
    if (!this._bezierInited) {
      this.bezierDetail(30);
      this._bezierInited = true;
    }
  }


  bezierDetail(detail) {
    this._bezierDetail = detail;

    if (this._bezierDrawMatrix == null) {
      this._bezierDrawMatrix = new Matrix4x4();
    }

    // setup matrix for forward differencing to speed up drawing
    // console.log(this._bezierDrawMatrix.toString());  // undefined to start
    _splineForward(detail, this._bezierDrawMatrix);

    // multiply the basis and forward diff matrices together
    // saves much time since this needn't be done for each curve
    this._bezierDrawMatrix.apply(this._bezierBasisMatrix);
  }


  bezier(x1, y1, x2, y2, x3, y3, x4, y4) {
    beginPath();
    vertex(x1, y1);
    bezierVertex(x2, y2, x3, y3, x4, y4);
    endPath();
  }


  //////////////////////////////////////////////////////////////

  // CATMULL-ROM


  _curveInited = false;
  _curveDetail = 30;
  _curveTightness = 0;
  _curveVertices = null;

  // Catmull-Rom basis matrix, perhaps with optional s parameter
  _curveBasisMatrix = null;
  _curveDrawMatrix = null;

  _bezierBasisInverse = null;
  _curveToBezierMatrix = null;


  curveVertex(x, y) {
    if (this._vertices == null) {
      console.error("Use beginPath() before curveVertex()");
    }
    if (this._curveVertices == null) {
      this._curveVertices = [ ];
    }
    this._curveInitCheck();

    // float[] v = curveVertices[curveVertexCount];
    // v[X] = x;
    // v[Y] = y;
    // curveVertexCount++;
    this._curveVertices.push({ 'x': x, 'y': y });

    // draw a segment if there are enough points
    const count = this._curveVertices.length;
    if (count > 3) {
      this._curveVertexSegment(this._curveVertices[count - 4].x,
                               this._curveVertices[count - 4].y,
                               this._curveVertices[count - 3].x,
                               this._curveVertices[count - 3].y,
                               this._curveVertices[count - 2].x,
                               this._curveVertices[count - 2].y,
                               this._curveVertices[count - 1].x,
                               this._curveVertices[count - 1].y);
    }
  }


  _curveVertexSegment(x1, y1, x2, y2, x3, y3, x4, y4) {
    let x0 = x2;
    let y0 = y2;

    const draw = this._curveDrawMatrix;

    let xplot1 = draw.m10*x1 + draw.m11*x2 + draw.m12*x3 + draw.m13*x4;
    let xplot2 = draw.m20*x1 + draw.m21*x2 + draw.m22*x3 + draw.m23*x4;
    let xplot3 = draw.m30*x1 + draw.m31*x2 + draw.m32*x3 + draw.m33*x4;

    let yplot1 = draw.m10*y1 + draw.m11*y2 + draw.m12*y3 + draw.m13*y4;
    let yplot2 = draw.m20*y1 + draw.m21*y2 + draw.m22*y3 + draw.m23*y4;
    let yplot3 = draw.m30*y1 + draw.m31*y2 + draw.m32*y3 + draw.m33*y4;

    // vertex() will reset splineVertexCount, so save it
    // let savedCount = curveVertexCount;

    this.vertex(x0, y0);
    for (let j = 0; j < this._curveDetail; j++) {
      x0 += xplot1; xplot1 += xplot2; xplot2 += xplot3;
      y0 += yplot1; yplot1 += yplot2; yplot2 += yplot3;
      this.vertex(x0, y0);
    }
    // curveVertexCount = savedCount;
  }


  curvePoint(a, b, c, d, t) {
    this._curveInitCheck();

    const tt = t * t;
    const ttt = t * tt;
    const cb = this._curveBasisMatrix;

    // not optimized (and probably need not be)
    return (a * (ttt*cb.m00 + tt*cb.m10 + t*cb.m20 + cb.m30) +
            b * (ttt*cb.m01 + tt*cb.m11 + t*cb.m21 + cb.m31) +
            c * (ttt*cb.m02 + tt*cb.m12 + t*cb.m22 + cb.m32) +
            d * (ttt*cb.m03 + tt*cb.m13 + t*cb.m23 + cb.m33));
  }


  curveTangent(a, b, c, d, t) {
    _curveInitCheck();

    const tt3 = t * t * 3;
    const t2 = t * 2;
    const cb = this._curveBasisMatrix;

    // not optimized (and probably need not be)
    return (a * (tt3*cb.m00 + t2*cb.m10 + cb.m20) +
            b * (tt3*cb.m01 + t2*cb.m11 + cb.m21) +
            c * (tt3*cb.m02 + t2*cb.m12 + cb.m22) +
            d * (tt3*cb.m03 + t2*cb.m13 + cb.m23) );
  }


  curveDetail(detail) {
    this._curveDetail = detail;
    // _curveInit();  // just set false in case curveTightness() used next
    this._curveInited = false;
  }


  curveTightness(tightness) {
    this._curveTightness = tightness;
    // _curveInit();  // just set false in case curveDetail() used next
    this._curveInited = false;
  }


  _curveInitCheck() {
    if (!this._curveInited) {
      // allocate only if/when used to save startup time
      if (this._curveDrawMatrix == null) {
        this._curveBasisMatrix = new Matrix4x4();
        this._curveDrawMatrix = new Matrix4x4();
        this._curveInited = true;
      }

      const s = this._curveTightness;
      this._curveBasisMatrix.set((s-1)/2.0, (s+3)/2.0,  (-3-s)/2.0, (1-s)/2.0,
                                 (1-s),     (-5-s)/2.0, (s+2),      (s-1)/2.0,
                                 (s-1)/2.0, 0,          (1-s)/2.0,  0,
                                 0,         1,          0,          0);

      _splineForward(this._curveDetail, this._curveDrawMatrix);

      // first time around, allocate the inverse
      if (this._bezierBasisInverse == null) {
        this._bezierBasisInverse = this._bezierBasisMatrix.copy();
        this._bezierBasisInverse.invert();
        // console.log(this._bezierBasisInverse.toString());
        this._curveToBezierMatrix = new Matrix4x4();
      }

      this._curveToBezierMatrix.set(this._curveBasisMatrix);
      this._curveToBezierMatrix.preApply(this._bezierBasisInverse);

      // multiply the basis and forward diff matrices together
      // saves much time since this needn't be done for each curve
      this._curveDrawMatrix.apply(this._curveBasisMatrix);
      // console.log(this._curveDrawMatrix);
    }
  }


  curve(x1, y1, x2, y2, x3, y3, x4, y4) {
    this.beginPath();
    this.curveVertex(x1, y1);
    this.curveVertex(x2, y2);
    this.curveVertex(x3, y3);
    this.curveVertex(x4, y4);
    this.endPath();
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // IMAGE

  // image(img, x, y, mode=CORNER) {
  // image(img, x, y, w, h, mode=CORNER) {
  image(img, x, y) {
    let w = img.width;
    let h = img.height;
    let mode = this._rectMode;
    // if (arguments.length == 3) {  // x, y
      // all set
    if (arguments.length == 4) {  // x, y, mode
      mode = arguments[3];

    } else if (arguments.length >= 5) {  // x, y, w, h
      w = arguments[3];
      h = arguments[4];

      if (arguments.length == 6) {   // x, y, w, h, mode
        mode = arguments[5];
      }
    }

    if (mode == CORNERS) {
      w -= x;  // get width/height by subtracting x2/y2
      h -= y;

    } else if (mode == CENTER) {
      x -= w/2;
      y -= h/2;
    }

    this.ctx.drawImage(img, x, y, w, h);
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // FONTS/TEXT

  _textAlignX = LEFT;
  _textAlignY = BASELINE;
  _textFont; // = 'sans-serif';
  _textSize; // = 12;
  _textStyle = '';  // blech; only added for legacy mode

  /*
  const myFont = new FontFace('My Font', 'url(https://myfont.woff2)');
  myFont.load().then((font) => {
    document.fonts.add(font);
    console.log('Font loaded');
  });
  */

  //String(Math.round(Math.random() * 1000000))

  // const FONT_FACE = false;
  // USE_OPENTYPE = typeof(opentype) !== 'undefined';
  fontLookup = { }

  loadFont(location) {
    if (this._insideLoad) {
      // Relative urls will always be weird (what's our relative path
      // when we're in a js file that's in a weird subfolder?),
      // instead make everything relative to the document.
      // (TODO will need to update this for non-document scenarios.)
      let baseUrl = document.location.href;
      baseUrl = baseUrl.substring(0, baseUrl.lastIndexOf('/'));

      if (!_openTypeLoaded()) {
        // https://developer.mozilla.org/en-US/docs/Web/API/FontFace
        const randomName = 'font' + Math.round(Math.random() * 1000000);
        let face = new FontFace(randomName, `url(${baseUrl}/${location})`);
        document.fonts.add(face);
        this._loadPromises.push(face.load());
        // console.log(face);
        return randomName;

      } else {
        let start = location.lastIndexOf('/') + 1;
        let stop = location.lastIndexOf('.');
        let name = location.substring(start, stop);
        this.fontLookup[name] = null;  // make a place for it

        let promise = fetch(location)
          .then(res => res.arrayBuffer())
          .then(data => {
            const font = opentype.parse(data);
            this.fontLookup[name] = font;
            // console.log(font);
        });
        this._loadPromises.push(promise);
        return name;
      }

    } else {
      console.error(`loadFont(${location}) can only be used inside load()`);
      return null;
    }
  }


  textFont() {
    this._textFont = arguments[0];
    if (arguments.length == 2) {
      this._textSize = arguments[1];
    }
    this._textFontImpl();

    if (arguments.length == 2) {
      // has to be called after _textFontImpl() because textAscent/Descent
      // will need the metrics after they've been set on the ctx
      this._updateLeading();
    }
  }


  textSize() {
    this._textSize = arguments[0];

    // this.ctx.font = this._textSize + 'px ' + (this._textFont != null ? this._textFont : 'sans-serif');
    this._textFontImpl();

    // has to be called after _textFontImpl() (but not all of those
    // calls should update the leading, so can't do it in there)
    this._updateLeading();
  }


  textLeading(amount) {
    this._textLeading = amount;
  }


  _updateLeading() {
    // reset leading when changing the font size
    this._textLeading = (this.textAscent() + this.textDescent()) * 1.275;
    // console.trace('leading is now', this._textLeading);
  }


  _textFontImpl() {
    this.ctx.font = this._textStyle + ' ' + this._textSize + 'px ' +
      (this._textFont != null ? this._textFont : 'sans-serif');
    // console.log(this.ctx.font);
  }


  text(str, x, y, honorStroke=false) {
    if (typeof(str) !== 'string') {
      // avoid any breakage downstream for assuming this is a string
      str = String(str);

    } else if (str.includes('\n')) {
      const lines = str.split('\n');

      const alignY = this._textAlignY;
      if (alignY != BASELINE) {
        const blockH = this.textAscent() + (lines.length - 1) * this._textLeading;
        if (alignY == CENTER) {
          y -= blockH / 2;  // TODO probably not right, but zzz
        } else if (alignY == BOTTOM) {
          y -= blockH;
        }
      }
      this._textAlignY = BASELINE;
      lines.forEach(line => {
        this.text(line, x, y);
        y += this._textLeading;
      })
      // reset to the previous placement
      this._textAlignY = alignY;
      return;
    }

    if (this._textAlignX == CENTER) {
      x -= this.textWidth(str) / 2;
    } else if (this._textAlignX == RIGHT) {
      x -= this.textWidth(str);
    }

    if (this._textAlignY == CENTER) {
      y += this.textAscent() / 2;
    } else if (this._textAlignY == TOP) {
      y += this.textAscent();
    } else if (this._textAlignY == BOTTOM) {
      y -= this.textDescent();
    }

    if (!_openTypeLoaded()) {
      if (honorStroke && this._stroke != null && this._strokeWeight != 0) {
        // console.log('stroke on text', str, this._stroke, this.ctx.strokeStyle, this._strokeWeight);
        // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/strokeText
        this.ctx.strokeText(str, x, y);
      }
      // console.log('filling text', this._fill, this.ctx.fillStyle, this.ctx.font, this._textFont, this._textSize);
      if (this._fill != null) {
        this.ctx.fillText(str, x, y);
      }

    } else {
      let font = this.fontLookup[this._textFont];
      // https://github.com/opentypejs/opentype.js?tab=readme-ov-file#fontdrawctx-text-x-y-fontsize-options
      const options = {
        /*'kerning': true,*/
        /*'hinting': true*/
      };
      // console.log(_textFont);

      if (typeof(font) !== 'undefined') {
        // Uhh... Font.draw() can only draw black text
        // https://github.com/opentypejs/opentype.js/issues/623
        // font.draw(this.ctx, str, x, y, this._textSize, options);
        const path = font.getPath(str, x, y, this._textSize, options);
        path.fill = this._fill;
        path.draw(this.ctx);
      }
    }
  }


  textAscent() {
    if (_openTypeLoaded()) {
      const font = this.fontLookup[this._textFont];
      // return font.measureText('H').actualBoundingBoxAscent;
      // console.log(font);
      return font.ascender * this._textSize / font.unitsPerEm;

    } else {
      // https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics/actualBoundingBoxAscent
      return this.ctx.measureText('H').actualBoundingBoxAscent;
    }
  }


  textDescent() {
    if (_openTypeLoaded()) {
      const font = this.fontLookup[this._textFont];
      return font.descender * this._textSize / font.unitsPerEm;

    } else {
      // https://developer.mozilla.org/en-US/docs/Web/API/TextMetrics/actualBoundingBoxDescent
      return this.ctx.measureText('j').actualBoundingBoxDescent;
    }
  }


  textAlign(align) {
    if (align == LEFT) {
      // this.ctx.textAlign = 'left';
      this._textAlignX = align;
    } else if (align == CENTER) {
      // this.ctx.textAlign = 'center';
      this._textAlignX = align;
    } else if (align == RIGHT) {
      // this.ctx.textAlign = 'right';
      this._textAlignX = align;
    } else {
      console.error(`textAlign(${align}, ...) should be LEFT, CENTER, or RIGHT`);
    }

    if (arguments.length != 2) {
      this._textAlignY = BASELINE;  // reset to the baseline since nothing specified

    } else {
      if (arguments[1] == CENTER) {
        this._textAlignY = CENTER;
      } else if (arguments[1] == BASELINE) {
        this._textAlignY = BASELINE;
      } else if (arguments[1] == TOP) {
        this._textAlignY = TOP;
      } else if (arguments[1] == BOTTOM) {
        this._textAlignY = BOTTOM;
      } else {
        console.error(`textAlign(..., ${arguments[1]}) should be BASELINE, CENTER, TOP, or BOTTOM`);
      }
    }
  }


  /*
  function textLeft(str, x, y) {
    ctx.fillText(str, x, y);
  }


  function textRight(str, x, y) {
    ctx.fillText(str, x - textWidth(str), y);
  }


  function textCenter(str, x, y) {
    ctx.fillText(str, x - textWidth(str)/2, y);
  }
  */


  textWidth(str) {
    // let metrics = ctx.measureText(str);
    // return metrics.width;

    if (_openTypeLoaded()) {
      let font = this.fontLookup[this._textFont];
      // console.log(typeof(font));
      // console.log(font);
      return font.getAdvanceWidth(str, this._textSize);

    } else {
      return this.ctx.measureText(str).width;
    }
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .


  /*
  // Don't love this, because a clip rect is often constructed out of
  // multiple shapes, so it's too close to beginPath() and it's behavior.
  // Instead, we'll use clipRect() and clip(shape). Tempting to go with
  // clip(x, y, w, h) (and then clipShape() since that's also more rare)
  // but it doesn't self-document as well, especially when the args are
  // identical to rect(). Also, there isn't a noClip() because the only
  // way to reset the clip for Context2D is to contain the clip calls
  // inside save() and restore(), and that's likely to be the case for
  // other rendering contexts that use this same PS-derived model.

  beginClip(x, y, w, h, mode=CORNER) {
    if (mode == CORNERS) {
      w -= x;  // x2 was passed in, subtract x to make it w
      h -= y;  // see above
    } else if (mode == CENTER) {
      x -= w / 2;
      y -= h / 2;
    }

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();
  }


  endClip() {
    this.ctx.restore();
  }
  */

  clipRect(x, y, w, h, mode=CORNER) {
    if (mode == CORNERS) {
      w -= x;  // x2 was passed in, subtract x to make it w
      h -= y;  // see above
    } else if (mode == CENTER) {
      x -= w / 2;
      y -= h / 2;
    }

    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();
  }


  // TODO clip(shape)


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .


  _styleStack = [ ];


  push() {
    this.ctx.save();

    const state = {
      'fill': this._fill,
      'stroke': this._stroke,
      'strokeWeight': this._strokeWeight,
      'textFont': this._textFont,
      'textSize': this._textSize,
      'textAlignX': this._textAlignX,
      'textAlignY': this._textAlignY,
      'textLeading': this._textLeading,
      'textStyle': this._textStyle,
      'blendMode': this._blendMode
    };
    this._styleStack.push(state);
    // console.log('push', state);
  }


  pop() {
    if (this._styleStack.length == 0) {
      console.error('pop() called without a matching call to push()');

    } else {
      this.ctx.restore();

      const state = this._styleStack.pop();
      // console.log('pop', state);
      // don't want to call these directly, in case of overrides (even by legacy)
      // this.fill(state.fill);
      // this.stroke(state.stroke);
      // but these alone are not enough, since need to update the var too
      // this.ctx.fillStyle = state.fill;
      // this.ctx.strokeStyle = state.stroke;
      this._fill = state.fill;
      this._fillImpl();
      this._stroke = state.stroke;
      this._strokeImpl();
      this._strokeWeight = state.strokeWeight;
      this.ctx.lineWidth = this._strokeWeight;
      this.blendMode(state.blendMode);

      if (state.textFont != null) {
        this.textFont(state.textFont, state.textSize);
        this.textLeading(state.textLeading);
        this.textAlign(state.textAlignX, state.textAlignY);
        // this.textStyle(state.textStyle);
        this._textStyle = state.textStyle;
      }
    }
  }


  translate(tx, ty) {
    this.ctx.translate(tx, ty);
  }


  scale(a, b) {
    if (arguments.length == 1) {
      this.ctx.scale(a, a);
    } else {
      this.ctx.scale(a, b);
    }
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // ANGLES


  angleMode(newMode) {
    if (newMode != RADIANS && newMode != DEGREES) {
      console.error('Use angleMode() with DEGREES or RADIANS.');
    } else {
      this._angleMode = newMode;
    }
  }


  rotate(theta) {
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
    if (this._angleMode == DEGREES) {
      theta *= Math.PI / 180;
    }
    this.ctx.rotate(theta);
  }


  sin(theta) {
    return Math.sin(this._angleMode == DEGREES ? radians(theta) : theta);
  }


  cos(theta) {
    return Math.cos(this._angleMode == DEGREES ? radians(theta) : theta);
  }


  tan(theta) {
    return Math.tan(this._angleMode == DEGREES ? radians(theta) : theta);
  }


  asin(value) {
    const theta = Math.asin(value);
    return this._angleMode == DEGREES ? degrees(theta) : theta;
  }


  acos(value) {
    const theta = Math.acos(value);
    return this._angleMode == DEGREES ? degrees(theta) : theta;
  }


  atan(value) {
    const theta = Math.atan(value);
    return this._angleMode == DEGREES ? degrees(theta) : theta;
  }


  atan2(y, x) {
    const theta = Math.atan2(y, x);
    return this._angleMode == DEGREES ? degrees(theta) : theta;
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .


  _elapsedStart = new Date().getTime();

  // number of seconds elapsed
  elapsed() {
    return (new Date().getTime() - this._elapsedStart) / 1000;
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // FILE I/O


  loadJSON(location, loadCallback, errorCallback) {
    if (this._insideLoad) {
      let outgoing = { };
      let promise = fetchJSON(location, (incoming) => {
        // copy everything into outgoing
        Object.assign(outgoing, incoming);
        loadCallback(outgoing);
      },
      errorCallback || function(error) {
        console.error(error);
      });
      this._loadPromises.push(promise);
      return outgoing;

    } else {
      console.error(`loadJSON() can only be used inside load(), use fetchJSON() anywhere else`);
      return null;
    }
  }


  loadXML(location) {
    if (this._insideLoad) {
      let outgoing = new MiniXML();
      let promise = fetch(location)
        .then((response) => response.text())
        .then((xml) => {
          outgoing.init(xml);
        })
      this._loadPromises.push(promise);
      return outgoing;

    } else {
      console.error(`loadXML() can only be used inside load(), use fetchXML() anywhere else`);
      return null;
    }
  }


  loadImage(location) {
    if (this._insideLoad) {
      const img = new Image();
      let promise = new Promise((resolve, reject) => {
        img.onload = () => {
          resolve(img);
        };

        img.onerror = () => {
          reject(new Error(`Error loading image from ${location}`));
        };

        img.src = location;
      });
      this._loadPromises.push(promise);
      return outgoing;

    } else {
      console.error(`loadImage() can only be used inside load(), use fetchImage() anywhere else`);
      return null;
    }
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .


  cursor(name) {
    this.canvas.style.cursor = name;
  }


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .


  // These functions allow you to design for a specific set of dimensions,
  // but maintain the aspect ratio if the window is a different size.

  _ratio = false;
  rwidth;
  rheight;
  rmouseX;
  rmouseY;

  _ratioLeft;
  _ratioTop;
  _ratioScale;

  // duplicated because pulling from the canvas size anyway,
  // but we still need somewhere to set rwidth/rheight
  // windowRatio(wide, high) {
  canvasRatio(wide, high) {
    this._ratio = true;
    this.rwidth = wide;
    this.rheight = high;

    // no need to resize
    //resizeCanvas(windowWidth, windowHeight);

    // since called in setup(), needs to apply to everything after
    // this._updateRatio();
    // turning off 250131 because it was breaking Lookout
  }

  _updateRatio() {
    let aspectH = this.width / this.rwidth;
    let aspectV = this.height / this.rheight;
    this._ratioScale = Math.min(aspectH, aspectV);
    this._ratioTop = (this.height - this._ratioScale * this.rheight) / 2;
    this._ratioLeft = (this.width - this._ratioScale * this.rwidth) / 2;
    this.translate(this._ratioLeft, this._ratioTop);
    this.scale(this._ratioScale);

    this.rmouseX = this.ratioX(this.mouseX);
    this.rmouseY = this.ratioY(this.mouseY);
    // this.inputX = this.ratioX(mouseX);
    // this.inputY = this.ratioY(mouseY);
  }

  ratioX(x) {
    return (x - this._ratioLeft) / this._ratioScale;
  }

  ratioY(y) {
    return (y - this._ratioTop) / this._ratioScale;
  }

  screenRatioX(x) {
    return this._ratioLeft + x*this._ratioScale;
  }

  screenRatioY(y) {
    return this._ratioTop + y*this._ratioScale;
  }

  matte(color) {
    this.push();
    const ratio = window.devicePixelRatio;
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // this.scale(1 / this._ratioScale);
    // this.translate(-this._ratioLeft, -this._ratioTop);
    // this.fill(color);
    this.ctx.fillStyle = color || 'black';
    if (this._ratioTop != 0) {
      this.ctx.fillRect(0, 0, this.width, this._ratioTop);  // top
      this.ctx.fillRect(0, height - this._ratioTop, this.width, this._ratioTop);  // bottom
    }
    if (this._ratioLeft != 0) {
      this.ctx.fillRect(0, 0, this._ratioLeft, this.height);  // left
      this.ctx.fillRect(this.width - this._ratioLeft, 0, this._ratioLeft, this.height);  // right
    }
    this.pop();
  }

  /*
  windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    if (!isLooping()) {
      redraw();
    }
  }
  */


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .


  _frameRateMillis = 1000.0 / 30;
  _looper = null;
  _noLoopQueued = false;


  frameRate(fps) {
    this._frameRateMillis = 1000.0 / fps;
    if (this._looper != null) {
      // Can't just call noLoop() then loop() because of noLoopQueued behavior.
      clearInterval(this._looper);
      this._looper = null;
      this.loop();
    }
  }


  loop() {
    if (this._looper == null) {
      // this._looper = setInterval(this._requestDraw, this._frameRateMillis);
      this._looper = setInterval(() => this._requestDraw(), this._frameRateMillis);
    }
  }


  noLoop() {
    if (this._looper != null) {
      if (this.frameCount == 0) {
        // noLoop() called inside setup, defer until draw() runs at least once
        this._noLoopQueued = true;
      } else {
        clearInterval(this._looper);
        this._looper = null;
      }
    }
  }


  redraw() {
    // ignore redraw() calls before setup() and first draw() have run
    if (this.frameCount > 1) {
      this._requestDraw();
    }
  }


  _handleDraw(/* when */) {
    if (this._insideLoad) return;  // ignore draw calls until loaded

    /*
    if (_wheels != null) {
      // pollute the global namespace with our vars
      window.width = this.width;
      window.height = this.height;
    }
    */

    // console.log(when);
    // console.log(this);
    if (this.frameCount == 0) {
      if (_isAvailable(this, 'setup')) {
        this.ctx.save();
        this.setup();
        this.ctx.restore();
      }

    } else {
      if (_isAvailable(this, 'draw')) {
        this.ctx.save();

        // reapply fill, stroke, etc
        this.ctx.fillStyle = this._fill;
        this.ctx.strokeStyle = this._stroke;
        this.ctx.lineWidth = this._strokeWeight;
        this.ctx.lineCap = this._strokeCap;
        this.ctx.lineJoin = this._strokeJoin;
        // console.log('stroke now', this._stroke, this._strokeWeight, this.ctx.strokeStyle, this.ctx.lineWidth);
        this._textFontImpl();

        if (this._ratio) {
          this._updateRatio();
        }
        this.draw();

        while (this._styleStack.length > 0) {
          console.error('push() called without a matching call to pop()');
          this.pop();
        }
        this.ctx.restore();
      }

      if (this._noLoopQueued) {
        this.noLoop();
        this._noLoopQueued = false;
      }
    }
    this.frameCount++;
  }


  _requestDraw() {
    // console.log(self);
    // console.trace();
    // console.log(this);  // it's window until we deref interval with () =>
    // this._handleDraw();  // TESTING REMOVE
    // console.log(requestAnimationFrame);
    // console.log(this._handleDraw);
    // requestAnimationFrame(sketch._handleDraw);
    // requestAnimationFrame(this.canvas.sketch._handleDraw);
    requestAnimationFrame((when) => this._handleDraw(when));
    /*
    requestAnimationFrame((when) => {
      if (this._fullSize) {
        let ratio = window.devicePixelRatio || 1;
        let w = parseInt(this.canvas.getAttribute("width"));
        let h = parseInt(this.canvas.getAttribute("height"));
        if (w != this.width*ratio || h != this.height*ratio) {
          console.log('need resize', w, h, this.width * ratio, this.height * ratio);
          this._resizeCanvas();
        }
      }
      this._handleDraw(when)
    });
    */
    // requestAnimationFrame(this._handleDraw);
  }


  /*
  requestSetup() {
    requestAnimationFrame(handleSetup);
  }


  handleSetup() {
    setup();
    frameCount++;
  }
  */


  // . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . .

  // TODO these are legacy for ratio and CSS zoom calls;
  //      sort out how those are used and give these a proper burial
  _scaleLeft = 0;
  _scaleTop = 0;
  _scaling = 1;  // scaling = mainEl.style.zoom;


  // Capture events for the canvas being moved to a different screen,
  // or some types of zoom updates ('cept Safari, which has a Think Different)
  // https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
  _removePixelListener = null;

  _updatePixelRatio() {
    if (this._removePixelListener != null) {
      this._removePixelListener();
    }
    const mqString = `(resolution: ${window.devicePixelRatio}dppx)`;
    const media = matchMedia(mqString);
    media.addEventListener("change", this._updatePixelRatio);
    this._removePixelListener = () => {
      media.removeEventListener("change", this._updatePixelRatio);
    };
    this._resizeCanvas();  // this is where we actually work with dpr
  }


  _resizeCanvas() {
    /*
    // console.log(this.canvas.getAttribute("width"), 2*this.canvas.parentNode.offsetWidth,
    //             this.canvas.getAttribute("height"), 2*this.canvas.parentNode.offsetHeight);
    // NOTE! getAttribute() returns a string, so do not use ===
    if (this.canvas.getAttribute("width") == 2*this.canvas.parentNode.offsetWidth &&
        this.canvas.getAttribute("height") == 2*this.canvas.parentNode.offsetHeight) {
      console.log('skipping resize');
      return;
    // } else {
    }
    */

    // console.log('inside _resizeCanvas()');
    if (this._fullSize) {
      // avoids infinite expansion in Lookout 3
      // (though probably b/c triggering a DOM reflow, which is likely costly)
      this.canvas.style.width = "0px";
      this.canvas.style.height = "0px";

      // console.log('parent node is', this.canvas.parentNode);
      // console.log('  canvas was ', this.canvas.getAttribute("width"), this.canvas.getAttribute("height"));
      // console.log('canvas was', this.canvas.getAttribute("width"), this.canvas.getAttribute("height"));

      // if parent node is a <div> use that for sizing,
      // otherwise, size to the window itself
      if (this.canvas.parentNode.tagName.toLowerCase() === 'div') {
        // console.log('resizing to div ' + this.canvas.parentNode.offsetWidth + 'x' + this.canvas.parentNode.offsetHeight);
        this.canvas.setAttribute("width", this.canvas.parentNode.offsetWidth);
        this.canvas.setAttribute("height", this.canvas.parentNode.offsetHeight);

      } else {
        // console.log('resizing to window ' + window.innerWidth + 'x' + window.innerHeight);
        this.canvas.setAttribute("width", window.innerWidth);
        this.canvas.setAttribute("height", window.innerHeight);

        // prevent scrollbars
        // document.body.style.overflow = 'hidden';
        const body = document.getElementsByTagName('body')[0];
        if (body !== null) {
          body.style.overflow = 'hidden';
        }
      }
    }

    this.width = parseInt(this.canvas.getAttribute("width"));
    this.height = parseInt(this.canvas.getAttribute("height"));

    let cssWidth = this.width;
    let cssHeight = this.height;

    // Implemented more or less everywhere:
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio#browser_compatibility
    // This can also be set by the zoom level of the browser,
    // except for Safari: https://bugs.webkit.org/show_bug.cgi?id=124862
    // (Which is also why Safari is not listed as fully supporting the feature.)
    let ratio = window.devicePixelRatio;

    this.canvas.setAttribute("width", this.width * ratio);
    this.canvas.setAttribute("height", this.height * ratio);

    this.canvas.style.width = cssWidth + 'px';
    this.canvas.style.height = cssHeight + 'px';

    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    if (_isAvailable(this, 'canvasResized')) {
      canvasResized();
    }
    this.redraw();
  }


  _digestTouch(event) {  //, click) {
    //alert('delegating touch ' + event);
    event.preventDefault();
    // only bother with the last event in the list
    if (event.targetTouches.length > 0) {
      let lastTouch = event.targetTouches[event.targetTouches.length - 1];
      this._digestPointer(lastTouch);
      this.touchX = this.mouseX;
      this.touchY = this.mouseY;
    }
  }


  _digestMouse(event) {
    event.preventDefault();
    this._digestPointer(event);
  }


  _digestPointer(event) {
    // console.log(this);
    // let offsets = _getOffsets(this.canvas);
    let rect = this.canvas.getBoundingClientRect();
    let offsetX = rect.left + window.scrollX;
    let offsetY = rect.top + window.scrollY;

    this.mouseX = ((event.pageX - offsetX) - this._scaleLeft) / this._scaling;
    this.mouseY = ((event.pageY - offsetY) - this._scaleTop) / this._scaling;

    if (this._ratio) {
      this.rmouseX = this.ratioX(this.mouseX);
      this.rmouseY = this.ratioY(this.mouseY);
    }
  }


  _setupCanvas(canvasId) {
    if (canvasId !== null) {
      this.canvas = document.getElementById(canvasId);
    }
    if (this.canvas == null) {
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'sketch';
      document.body.appendChild(this.canvas);
    }

    const sketch = this;

    this.ctx = this.canvas.getContext('2d');
    // better alignment hack from the old times; prolly not legit anymore
    //ctx.translate(0.5, 0.5);

    this.canvas.addEventListener("focus", () => {
      sketch.focused = true;
    });

    this.canvas.addEventListener("blur", () => {
      sketch.focused = false;
    });

    this._resizeCanvas();
    this._updatePixelRatio();

    if (this._fullSize) {
      // window.addEventListener('resize', resizeCanvas);
      // console.log('parent node is', this.canvas.parentNode);
      // console.log('canvas node is', this.canvas);

      if (this.canvas.parentNode.tagName === 'div') {
        // https://developer.mozilla.org/en-US/docs/Web/API/Resize_Observer_API
        new ResizeObserver(() => this._resizeCanvas()).observe(this.canvas.parentNode);
      } else {
        // resize event only fired on window (i.e. not divs)
        window.addEventListener('resize', () => sketch._resizeCanvas());
      }
    }

    if (_isTouchDevice()) {
      this.canvas.addEventListener('touchstart', function(event) {
        // sketch.touchIsPressed = true;
        sketch.mouseIsPressed = true;
        sketch._digestTouch(event);
        // if (typeof(touchPressed) !== 'undefined') touchPressed();
        // if (typeof(mousePressed) !== 'undefined') mousePressed();
        if (_isAvailable(sketch, 'mousePressed')) sketch.mousePressed();
      }, false);

      this.canvas.addEventListener('touchmove', function(event) {
        sketch._digestMouse(event);
        // if (typeof(touchDragged) !== 'undefined') touchDragged();
        // if (sketch.touchIsPressed) {
        if (sketch.mouseIsPressed) {
          if (_isAvailable(sketch, 'mouseDragged')) sketch.mouseDragged();
        } else {
          if (_isAvailable(sketch, 'mouseMoved')) sketch.mouseMoved();
        }
      }, false);

      this.canvas.addEventListener('touchend', function(event) {
        sketch._digestMouse(event);
        if (_isAvailable(sketch, 'mouseReleased')) sketch.mouseReleased();
        sketch.mouseIsPressed = false;
      }, false);

    } else {
      this.canvas.addEventListener('mousedown', function(event) {
        sketch.mouseIsPressed = true;
        sketch._digestMouse(event);
        // if (typeof(mousePressed) !== 'undefined') mousePressed();
        if (_isAvailable(sketch, 'mousePressed')) sketch.mousePressed();
      }, false);

      this.canvas.addEventListener('mousemove', function(event) {
        sketch._digestMouse(event);
        if (sketch.mouseIsPressed) {
          // if (typeof(this.mouseDragged) !== 'undefined') mouseDragged();
          if (_isAvailable(sketch, 'mouseDragged')) sketch.mouseDragged();
        } else {
          // if (typeof(this.mouseMoved) !== 'undefined') mouseMoved();
          if (_isAvailable(sketch, 'mouseMoved')) sketch.mouseMoved();
        }
      }, false);

      this.canvas.addEventListener('mouseup', function(event) {
        sketch._digestMouse(event);
        // if (typeof(mouseReleased) !== 'undefined') mouseReleased();
        if (_isAvailable(sketch, 'mouseReleased')) sketch.mouseReleased();
        sketch.mouseIsPressed = false;
      }, false);

      this.canvas.addEventListener('mouseenter', function(event) {
        sketch._digestMouse(event);
        if (_isAvailable(sketch, 'mouseEnter')) sketch.mouseEnter();

      }, false);

      this.canvas.addEventListener('mouseleave', function(event) {
        sketch._digestMouse(event);
        if (_isAvailable(sketch, 'mouseLeave')) sketch.mouseLeave();

      }, false);
    }

    /*
    //this.addEventListener('keydown', keyPressed, true);
    window.addEventListener('keydown', function(event) {
      //console.log(event);
      self.key = event.which;
      self.keyCode = event.keyCode;
      //console.log('self for keys is:');
      //console.log(self);
      //console.log(self.key + ' ' + self.keyCode);
      self.keyPressed();
    }, false);

    var oldPress = document.onkeypress;

    // http://jimblackler.net/BackspaceTrap.htm
    var trapBackspace = function(event) {
      var keyNum;

      if (window.event) {  // eg. IE
        keyNum = window.event.keyCode;

      } else if (event.which) {  // eg. Firefox
        keyNum = event.which;
      }

      // allow period and comma to go through for presentations
      //if (keyNum == 44 || keyNum == 46) {
        //return true;
      //}

      if (keyNum == Sketch.BACKSPACE) {
        //document.getElementById("keypressed").innerHTML = "Backspace pressed";
        //console.log("backspace");
        return false;  // nullifies the backspace
      }

      if (oldPress) {
        oldPress(event);
      }

      return true;
    }

    document.onkeydown = trapBackspace; // IE, Firefox, Safari
    document.onkeypress = trapBackspace; // only Opera (and Chrome?)
  */
  }
}