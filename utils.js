var execSync = require('child_process').execSync

const coap = (method, config, payload = "{}") => `${config.coapClient} -u "Client_identity" -k "${config.psk}" -e '${payload}' -m ${method} coaps://${config.ip}/15001/`

const put = (config, id, payload) => coap("put", config, payload) + id
const get = (config, id="") => coap("get", config) + id

const kelvinToProcent = kelvin => (kelvin - 2200) / 18 // 4000
const procentToKelvin = procent => 2200 + (18 * procent) // 4000
const colorX = procent => Math.round(33135 - (82.05 * procent))  // 24930
const colorY = procent => Math.round(27211 - (25.17 * (100 - procent))) // 24694

const getKelvin = colorX => procentToKelvin(Math.round((33135 - colorX) / 82.05))

module.exports.getKelvin = getKelvin

module.exports.setBrightness = (config, id, brightness, callback) => {
  const arguments = `{ "3311" : [{ "5851" : ${brightness}} ] }`
  const cmd = put(config, id, arguments)

  if (config.debug) {
    config.log(`Setting brightness of ${brightness} for ${id}`)
    config.log(cmd)
  }

  callback(execSync(cmd, {encoding: "utf8"}))
}

module.exports.setKelvin = (config, id, kelvin, callback) => {
  const arguments = `{ "3311" : [{ "5709" : ${colorX(kelvinToProcent(kelvin))}, "5710": ${colorY(kelvinToProcent(kelvin))} }] }`
  var cmd = put(config, id, arguments)

  if (config.debug) {
    config.log(cmd)
  }
  callback(execSync(cmd, {encoding: "utf8"}))
}
  
// Source: http://stackoverflow.com/a/9493060
const hslToRgb = (h, s, l) => {
  var r, g, b;

  if(s == 0){
    r = g = b = l; // achromatic
  } else {
    var hue2rgb = function hue2rgb(p, q, t){
      if(t < 0) t += 1;
      if(t > 1) t -= 1;
      if(t < 1/6) return p + (q - p) * 6 * t;
      if(t < 1/2) return q;
      if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

const hexToRgb = (hex) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

const rgbToHsl = (r, g, b) => {
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}

// Source http://stackoverflow.com/a/36061908
const rgbToXy = (red,green,blue) => {
  red = (red > 0.04045) ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : (red / 12.92);
  green = (green > 0.04045) ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : (green / 12.92);
  blue = (blue > 0.04045) ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : (blue / 12.92);
  var X = red * 0.664511 + green * 0.154324 + blue * 0.162028;
  var Y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
  var Z = red * 0.000088 + green * 0.072310 + blue * 0.986039;
  var fx = X / (X + Y + Z);
  var fy = Y / (X + Y + Z);
  return [fx.toPrecision(4),fy.toPrecision(4)];
}

module.exports.convertRGBToHSL = (hex) => {	
  var c = hexToRgb(hex)
  return rgbToHsl(c.r, c.g, c.b);
}

module.exports.setColor = (config, id, color, callback) => {
  // First we convert hue and saturation
  // to RGB, with 75% lighntess
  const rgb = hslToRgb(color.hue, color.saturation, 0.75);
  // Then we convert the rgb values to
  // CIE L*a*b XY values
  const cie = rgbToXy(...rgb).map(item => {
    // we need to scale the values
    return Math.floor(100000 * item);
  });  
  
  const arguments = `{ "3311" : [{ "5709" : ${cie[0]}, "5710": ${cie[1]} }] }`
  const cmd = put(config, id, arguments)
  
  if (config.debug) {
    config.log(cmd)
  }
  callback(execSync(cmd, {encoding: "utf8"}))
}

// @TODO: Figure out if the gateway actually don't support this
module.exports.setOnOff = (config, id, state, callback) => {
  const arguments = `{ "3311" : [{ "5580" : ${state}} ] }`
  var cmd = put(config, id, arguments)

  if (config.debug) {
    config.log(cmd)
  }
  callback(execSync(cmd, {encoding: "utf8"}))
}

const parseDeviceList = str => {
  const split = str.trim().split("\n")
  return split.pop().slice(1,-1).split(",")
}

module.exports.getDevices = config => new Promise((resolve, reject) => {
  var cmd = get(config)
  if (config.debug) {
    config.log(cmd)
  }

  resolve(parseDeviceList(execSync(cmd, {encoding: "utf8"})))
})

const parseDevice = str => {
  const split = str.trim().split("\n")
  const json = JSON.parse(split.pop())

  return {
    name: json["9001"],
    type: json["5750"],
    createdAt: json["9002"],
    instanceId: json["9003"],
    details: json["3"],
    reachabilityState: json["9019"],
    lastSeen: json["9020"],
    otaUpdateState: json["9054"],
    switch: json["15009"],
    light: json["3311"]
  }

  /*
    light: {
    {
       onoff: json["3311"]["5580"],
       dimmer: json["3311"]["5851"],
       color_x: json["3311"]["5709"],
       color_y: json["3311"]["5710"],
       color: json["3311"]["5706"],
       instance_id: json["3311"]["9003"],
       "5707":0,
       "5708":0,
       "5711":0,
      }
    }
  */
}

module.exports.getDevice = (config, id) => new Promise((resolve, reject) => {

  var cmd = get(config, id)
  if (config.debug) {
    config.log(`Get device information for: ${id}`)
    config.log(cmd)
  }

  resolve(parseDevice(execSync(cmd, {encoding: "utf8"})))

})
