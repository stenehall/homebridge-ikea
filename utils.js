var execSync = require('child_process').execSync

const coap = (method, config) => `coap-client -u "Client_identity" -k "${config.psk}" -m ${method} coaps://${config.ip}/15001/`

const put = config => coap("put", config)
const get = config => coap("get", config)

const kelvinToProcent = kelvin => (kelvin - 2200) / 18 // 4000
const procentToKelvin = procent => 2200 + (18 * procent) // 4000
const colorX = procent => Math.round(33135 - (82.05 * procent))  // 24930
const colorY = procent => Math.round(27211 - (25.17 * (100 - procent))) // 24694

const getKelvin = colorX => procentToKelvin(Math.round((33135 - colorX) / 82.05))

module.exports.getKelvin = getKelvin

module.exports.setBrightness = (config, id, brightness, callback) => {
  var cmd = `echo '{ "3311" : [{ "5851" : ${brightness}} ] }' | ${put(config)}${id} -f -`

  if (config.debug) {
    config.log(`Setting brightness of ${brightness} for ${id}`)
    config.log(cmd)
  }

  callback(execSync(cmd, {encoding: "utf8"}))
}

module.exports.setKelvin = (config, id, kelvin, callback) => {

  var cmd = `echo '{ "3311" : [{ "5709" : ${colorX(kelvinToProcent(kelvin))}, "5710": ${colorY(kelvinToProcent(kelvin))} }] }' | ${put(config)}${id} -f -`
  if (config.debug) {
    config.log(cmd)
  }
  callback(execSync(cmd, {encoding: "utf8"}))
}

// @TODO: Figure out if the gateway actually don't support this
module.exports.setOnOff = (config, id, state, callback) => {
  var cmd = `echo '{ "3311" : [{ "5580" : ${state}} ] }' | ${put(config)}${id} -f -`
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

  var cmd = get(config) + id
  if (config.debug) {
    config.log(`Get device information for: ${id}`)
    config.log(cmd)
  }

  resolve(parseDevice(execSync(cmd, {encoding: "utf8"})))

})
