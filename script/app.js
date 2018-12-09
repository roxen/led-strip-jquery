const NOF_LEDS = 144;
const STRIP_LENGTH = 1000; // mm
const MM_PER_LED = STRIP_LENGTH / NOF_LEDS;

let leds = [];
let stripElem = $("#strip");
for (let i = 0; i < NOF_LEDS; i++) {
  let led = $("<div></div>");
  stripElem.append(led);
  leds[i] = led;
}

// The "physical" led strip
class LedStrip {
  constructor(leds) {
    this.leds = leds;
  }

  setPixelColor(index, red, green, blue) {
    if (index >= 0 && index < leds.length) {
      leds[index].css("background", "rgb(" + red + ", " + green + ", " + blue + ")");
    }
  }
}

class Color {
  constructor(red, green, blue) {
    this._red = red;
    this._green = green;
    this._blue = blue;
  }

  get red() {
    return this._red;
  }

  get green() {
    return this._green;
  }

  get blue() {
    return this._blue;
  }
}

class StripContext {
  constructor(strip) {
    this.strip = strip;
    this.clearColor = new Color(200, 200, 200);
  }

  setPixelColor(index, red, green, blue) {
    this.strip.setPixelColor(index, red, green, blue);
  }

  mapPositionToLedNo(position) {
    return Math.floor(position / MM_PER_LED);
  }

  clearStrip() {
    for (let i = 0; i < NOF_LEDS; i++) {
      this.strip.setPixelColor(i, this.clearColor.red, this.clearColor.green, this.clearColor.blue);
    }
  }
}

class StripObject {
  constructor() {
    this.visible = true;
  }
  update(progress) {
  };

  draw(stripContext) {
  }

  set visible(value) {
    this._visible = value;
  }

  get visible() {
    return this._visible;
  }
}

class LoopingWorm extends StripObject {
  // Length in nof leds here
  constructor(startPosition, speed, length, color) {
    super();
    this.position = startPosition;
    this.speed = speed;
    this.length = length;
    this.color = color;
  }

  update(progress) {
    this.position += progress * this.speed / 1000;
    if (this.position > STRIP_LENGTH + this.length * MM_PER_LED) {
      this.position = 0;
    }
  }

  draw(stripContext) {
    let ledNo = stripContext.mapPositionToLedNo(this.position);
    for (let i = 0; i < this.length; i++) {
      stripContext.setPixelColor(ledNo + i - this.length, this.color.red, this.color.green, this.color.blue);
    }
  }
}

class BouncingWorm extends StripObject {
  // Length in nof leds here
  constructor(startPosition, speed, length, color) {
    super();
    this.position = startPosition;
    this.speed = speed;
    this.length = length;
    this.color = color;
  }

  update(progress) {
    this.position += progress * this.speed / 1000;
    if (this.position > STRIP_LENGTH + this.length * MM_PER_LED || this.position < 0) {
      this.speed = -this.speed;
    }
  }

  draw(stripContext) {
    let ledNo = stripContext.mapPositionToLedNo(this.position);
    for (let i = 0; i < this.length; i++) {
      stripContext.setPixelColor(ledNo + i - this.length, this.color.red, this.color.green, this.color.blue);
    }
  }
}

// Background wave effect
class Wave extends StripObject {
  constructor() {
    super();
    this.wavelength = 250; // mm
    this.speed = 500; // mm/s
    this.minLightness = .4; // lightness in hsl
    this.maxLightness = .9; // lightness in hsl
    this.amplitude = this.maxLightness - this.minLightness;
    this.baseAngle = 0;
    this.origin = 0; // source
  }

  // if speed is 1000 mm/s, base angle should run 2pi in one s
  update(progress) {
    this.baseAngle -= this.speed / this.wavelength * 2 * Math.PI * progress / 1000;
  }

  draw(stripContext) {
    for (let i = 0; i < NOF_LEDS; i++) {
      let position = i * MM_PER_LED;
      let angleOffset = (this.origin - position) / this.wavelength * 2 * Math.PI;
      let angle = this.baseAngle - angleOffset;
      if (position < this.origin) {
        angle = this.baseAngle + angleOffset;
      }

      let value = this.minLightness + this.amplitude / 2 * Math.sin(angle) + (this.amplitude / 2);

      let rgb = hslToRgb(180 / 360, 1.0, value);
      stripContext.setPixelColor(i, rgb[0], rgb[1], rgb[2]);
    }
  }
}

let ledStrip = new LedStrip(leds);

let stripContext = new StripContext(ledStrip);


let worm1 = new LoopingWorm(0, 63, 8, new Color(0, 0, 255));
let worm2 = new LoopingWorm(0, 201, 5, new Color(255, 0, 0));

let worm3 = new BouncingWorm(0, 300, 3, new Color(255, 0, 255));

let wave1 = new Wave();


$("#toggle-wave").click(function () {
  wave1.visible = !wave1.visible;
});

let pause = false;
$("#pause").click(function () {
  pause = !pause;
});


function update(progress) {
  if (!pause) {
    wave1.update(progress);
    worm1.update(progress);
    worm2.update(progress);
    worm3.update(progress);
  }
}

function draw(stripContext) {
  stripContext.clearStrip();

  if (wave1.visible) {
    wave1.draw(stripContext);
  }

  worm1.draw(stripContext);
  worm2.draw(stripContext);
  worm3.draw(stripContext);
}

stripContext.clearStrip();
wave1.draw(stripContext);


function loop(timestamp) {
  let progress = timestamp - lastRender;

  update(progress);
  draw(stripContext);

  lastRender = timestamp;
  window.requestAnimationFrame(loop)
}

let lastRender = 0;
window.requestAnimationFrame(loop);


/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r * 255, g * 255, b * 255];
}
