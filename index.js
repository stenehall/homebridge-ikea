var exec = require('child_process').exec
var Service, Characteristic

module.exports = function(homebridge) {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory("homebridge-ikea", "Ikea Gateway", IkeaAccessory)
}

function setState(id, state, callback) {
  var cmd = "echo '{ \"3311\" : [{ \"5851\" : " + state + " , \"5709\": 33135 , \"5710\": 27211 } ] }' | coap-client -u \"Client_identity\" -k your-secret-key -m put \"coaps://192.168.1.123:5684/15001/" + id + "\" -f -"
  console.log(cmd)
  exec(cmd, function(error, stdout, stderr) {
    console.log(stdout)
    callback(stdout)
  })
}

function getState(id, callback) {
  var cmd = 'coap-client -u "Client_identity" -k your-secret-key -m get "coaps://192.168.1.123:5684/15001/' + id + '"'
  console.log(cmd)

  exec(cmd, function(error, stdout, stderr) {
    var state = stdout.match(/"5851":(\d+)/)[1]
    callback(parseInt(state))
  })
}


function IkeaAccessory(log, config) {
  this.log = log
  this.name = config["name"]
  this.id = config["id"]
}

IkeaAccessory.prototype.getServices = function() {

  var service = new Service.AccessoryInformation()
  service.setCharacteristic(Characteristic.Name, this.name)
    .setCharacteristic(Characteristic.Manufacturer, "Ikea")
    .setCharacteristic(Characteristic.Model, "Lamp")

  var self = this

  var lightbulbService = new Service.Lightbulb(self.name)

  lightbulbService
    .getCharacteristic(Characteristic.On)
    .on('get', function(callback) {
      console.log("Getting power state on the '%s'...", self.name)

      getState(self.id, function(state) {
        console.log("state", state)
        console.log("Power state for the '%s' is %s - %s", self.name, (state == 255 ? 1 : 0), state)
        callback(null, (state == 255 ? 1 : 0))
      })
    })
    .on('set', function(value, callback) {
      console.log("value", value)
      setState(self.id, (value == 1 ? 1 : 0), function(result) {
        callback()
      })
    })

  lightbulbService
    .getCharacteristic(Characteristic.Brightness)
    .on('get', function(callback) {
      getState(self.id, function(state) {
        console.log("Power brightness for the '%s' is %s - %s", self.name, state, Math.floor(state * 100 / 255))
        callback(null, parseInt(state * 100 / 255))
      })
    })
    .on('set', function(powerOn, callback) {
      console.log("Setting brightness state on the '%s' to %s - %s", self.name, Math.floor(255 * (powerOn / 100)), powerOn)
      setState(self.id, Math.floor(255 * (powerOn / 100)), function(result) {
        callback()
      })
    })
  return [service, lightbulbService]
}
