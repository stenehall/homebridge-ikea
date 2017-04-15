const utils = require('./utils')
const util = require('util')

let Kelvin, Accessory, Service, Characteristic, UUIDGen

const UUID_KELVIN = 'C4E24248-04AC-44AF-ACFF-40164E829DBA'

module.exports = function(homebridge) {
  Accessory = homebridge.platformAccessory
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  UUIDGen = homebridge.hap.uuid // @TODO: Should be using this

  Characteristic.Kelvin = function() {
      Characteristic.call(this, 'Kelvin', UUID_KELVIN)

      this.setProps({
          format: Characteristic.Formats.INT,
          unit: 'K',
          maxValue: 4000,
          minValue: 2200,
          minStep: 500,
          perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
      });

      this.value = this.getDefaultValue();
  }
  util.inherits(Characteristic.Kelvin, Characteristic);
  Characteristic.Kelvin.UUID = UUID_KELVIN

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
    const accessoryInformation = new Service.AccessoryInformation()
    accessoryInformation.setCharacteristic(Characteristic.Name, this.device.name)
    .setCharacteristic(Characteristic.Manufacturer, this.device.details["0"])
    .setCharacteristic(Characteristic.Model, this.device.details["1"])
    .setCharacteristic(Characteristic.FirmwareRevision, this.device.details["3"])

    const self = this

    const lightbulbService = new Service.Lightbulb(self.name)
    lightbulbService.addCharacteristic(Characteristic.Kelvin)

    lightbulbService
    .getCharacteristic(Characteristic.On)
    .on('get', callback => {
      utils.getDevice(self.config, self.device.instanceId).then(device => {
        self.currentBrightness = device.light[0]["5851"]
        self.currentState = device.light[0]["5850"]
        callback(null, self.currentState)
      })
    })
    .on('set', (state, callback) => {
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
    .on('get', callback => {
      utils.getDevice(self.config, self.device.instanceId).then(device => {
        self.currentBrightness = device.light[0]["5851"]
        self.currentState = device.light[0]["5850"]
        callback(null, parseInt(Math.round(self.currentBrightness * 100 / 255)))
      })
    })
    .on('set', (powerOn, callback) => {
      self.currentBrightness = Math.floor(255 * (powerOn / 100))
      utils.setBrightness(self.config, self.device.instanceId, Math.round(255 * (powerOn / 100)), result => callback())
    })

    lightbulbService
      .getCharacteristic(Characteristic.Kelvin)
      .on('get', callback => {
        utils.getDevice(self.config, self.device.instanceId).then(device => {
          let colorX, colorY
          colorX = device.light[0]["5709"]
          colorY = device.light[0]["5710"]
          if(colorX == 24930 && colorY == 24694){
            callback(null, 2200)
          }else if(colorX == 33135 && colorY == 27211){
            callback(null, 2700)
          }else if(colorX == 30140 && colorY == 26909){
            callback(null, 4000)
          }else{
            callback(null, 2200)          
          }
        })

      })
      .on('set', (kelvin, callback) => {
        utils.setKelvin(self.config, self.device.instanceId, parseInt(kelvin), result => callback())
      })

    return [accessoryInformation, lightbulbService]
  }
}
