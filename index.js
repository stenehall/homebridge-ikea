var utils = require('./utils')
var util = require('util')

var Accessory, Service, Characteristic, UUIDGen

module.exports = function(homebridge) {
  console.log("homebridge API version: " + homebridge.version)
  Accessory = homebridge.platformAccessory
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  UUIDGen = homebridge.hap.uuid // @TODO: Should be using this

  homebridge.registerPlatform("homebridge-ikea", "Ikea", IkeaPlatform)
}

function IkeaPlatform(log, config) {
  this.config = config
  this.devices = []

  // Device log
  this.log = string => log("[" + this.name + "] " + string)
}

IkeaPlatform.prototype = {
  accessories: async function(callback) {
    const self = this
    const foundAccessories = []

    const devices = await utils.getDevices(self.config)

    await Promise.all(devices.map(async deviceId => {
      const device = await utils.getDevice(self.config, deviceId)
      if (device.type === 2) {
        foundAccessories.push(new IkeaAccessory(self.log, self.config, device))
      }
    }))

    callback(foundAccessories)
  }
}

function IkeaAccessory(log, config, device) {
  this.log = log
  this.config = config
  this.device = device

  this.currentBrightness = this.device.light[0]["5851"]
  this.currentState = this.device.light[0]["5850"]
  this.previousBrightness = this.currentBrightness
  this.name = device.name
}

IkeaAccessory.prototype = {
  // Respond to identify request
  identify: function(callback) {
    this.log("Hi!")
    callback()
  },

  getServices: function() {
    var accessoryInformation = new Service.AccessoryInformation()
    accessoryInformation.setCharacteristic(Characteristic.Name, this.device.name)
    .setCharacteristic(Characteristic.Manufacturer, "Ikea")
    .setCharacteristic(Characteristic.Model, "Lamp")

    var self = this

    var lightbulbService = new Service.Lightbulb(self.name)

    lightbulbService
    .getCharacteristic(Characteristic.On)
    .on('get', function(callback) {
      utils.getDevice(self.config, self.device.instanceId).then(device => {
        self.currentBrightness = device.light[0]["5851"]
        self.currentState = device.light[0]["5850"]
        callback(null, self.currentState)
      })
    })
    .on('set', function(state, callback) {
      if (self.currentState == 1 && state == 0) { // We're turned on but want to turn off.
        self.currentState = 0
        utils.setBrightness(self.config, self.device.instanceId, 0, result => callback())
      } else if(self.currentState == 0 && state == 1) {
        self.currentState = 1
        utils.setBrightness(self.config, self.device.instanceId, (self.currentBrightness > 1 ? self.currentBrightness : 255), result => callback())
      } else {
        callback()
      }
    })

    lightbulbService
    .getCharacteristic(Characteristic.Brightness)
    .on('get', function(callback) {
      utils.getDevice(self.config, self.device.instanceId).then(device => {
        self.currentBrightness = device.light[0]["5851"]
        self.currentState = device.light[0]["5850"]
        callback(null, parseInt(self.currentBrightness * 100 / 255))
      })
    })
    .on('set', function(powerOn, callback) {
      self.currentBrightness = Math.floor(255 * (powerOn / 100))
      utils.setBrightness(self.config, self.device.instanceId, Math.floor(255 * (powerOn / 100)), result => callback())
    })

    return [accessoryInformation, lightbulbService]
  }
}
