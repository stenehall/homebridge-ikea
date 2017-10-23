const utils = require('./utils')
const util = require('util')
const os = require('os')

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
          unit: 'Kelvin',
          maxValue: 4000,
          minValue: 2200,
          minStep: 1,
          perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE]
      });

      this.value = this.getDefaultValue();
  }
  util.inherits(Characteristic.Kelvin, Characteristic);
  Characteristic.Kelvin.UUID = UUID_KELVIN  

  homebridge.registerPlatform("homebridge-ikea", "Ikea", IkeaPlatform)
}

function IkeaPlatform(log, config) {
  this.log = log
  this.config = config
  this.config.log = this.log
  this.devices = []

  if (!this.config.coapClient && (os.platform() !== "darwin" && os.platform() !== "linux")) {
    throw Error("No coap-client found, please specify the path to it using coapClient")
  }
  this.config.coapClient = this.config.coapClient || `${__dirname}/bin/coap-client-${os.platform()}`

}

IkeaPlatform.prototype = {
  accessories: async function(callback) {
    const self = this
    const foundAccessories = []

    const devices = await utils.getDevices(self.config)

    await Promise.all(devices.map(async deviceId => {
      const device = await utils.getDevice(self.config, deviceId)
      if (device && device.type === 2) {
        foundAccessories.push(new IkeaAccessory(self.log, self.config, device))
      }
    }))

    callback(foundAccessories)
  }
}

function IkeaAccessory(log, config, device) {
  this.name = device.name
  this.config = config
  this.config.log = string => log("[" + this.name + "] " + string)
  this.device = device

  this.currentBrightness = this.device.light[0]["5851"]
  this.currentState = this.device.light[0]["5850"]
  this.previousBrightness = this.currentBrightness
  this.color = {}
}

IkeaAccessory.prototype = {
  // Respond to identify request
  identify: function(callback) {
    this.config.log("Hi!")
    callback()
  },

  getServices: function() {
    const accessoryInformation = new Service.AccessoryInformation()
    accessoryInformation
    .setCharacteristic(Characteristic.Name, this.device.name)
    .setCharacteristic(Characteristic.Manufacturer, this.device.details["0"])
    .setCharacteristic(Characteristic.Model, this.device.details["1"])
    .setCharacteristic(Characteristic.FirmwareRevision, this.device.details["3"])

    const self = this

    const lightbulbService = new Service.Lightbulb(self.name)
    
    lightbulbService
    .addCharacteristic(Characteristic.StatusActive)
    
    lightbulbService
    .setCharacteristic(Characteristic.StatusActive, this.device.reachabilityState)
    .setCharacteristic(Characteristic.On, this.device.light[0]["5850"])
    .setCharacteristic(Characteristic.Brightness, parseInt(Math.round(this.device.light[0]["5851"] * 100 / 255)))
    

    lightbulbService
    .getCharacteristic(Characteristic.StatusActive)
    .on('get', callback => {
      try {
        utils.getDevice(self.config, self.device.instanceId).then(device => {
          if(!device) {
            throw "Time out getDevice"
          }
          callback(null, device.reachabilityState)
        })       
      } catch (error) {
        callback("no_response")
      }
    })

    lightbulbService
    .getCharacteristic(Characteristic.On)
    .on('get', callback => {
      try {
        utils.getDevice(self.config, self.device.instanceId).then(device => {
          if(!device) {
            throw "Time out getDevice"
          }
          self.currentBrightness = device.light[0]["5851"]
          self.currentState = device.light[0]["5850"]
          callback(null, self.currentState)
        })
      } catch (error) {
        if (self.config.debug) {
          self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.On get) \n' + error.message)
        }
        callback("no_response")
      }
    })
    .on('set', (state, callback) => {
      if (typeof state !== 'number') {
        state = state ? 1 : 0;
      }    
      
      try {        
        if (self.currentState == 1 && state == 0) { // We're turned on but want to turn off.
          self.currentState = 0
          utils.setBrightness(self.config, self.device.instanceId, 0, result => callback())
        } else if(self.currentState == 0 && state == 1) {
          self.currentState = 1
          utils.setBrightness(self.config, self.device.instanceId, (self.currentBrightness > 1 ? self.currentBrightness : 255), result => callback())
        } else {
          callback()
        }
      } catch (error) {
        if (self.config.debug) {
          self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.On set) \n' + error.message)
        }
        callback("no_response")
      }

    })

    lightbulbService
    .getCharacteristic(Characteristic.Brightness)
    .on('get', callback => {
      try {
        utils.getDevice(self.config, self.device.instanceId).then(device => {
          if(!device) {
            throw "Time out getDevice"
          }
          self.currentBrightness = device.light[0]["5851"]
          self.currentState = device.light[0]["5850"]
          callback(null, parseInt(Math.round(self.currentBrightness * 100 / 255)))
        })
      } catch (error) {
        if (self.config.debug) {
          self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Brightness) get \n' + error.message)
        }
        callback("no_response")
      }
    })
    .on('set', (powerOn, callback) => {
      self.currentBrightness = Math.floor(255 * (powerOn / 100))
      try {
        utils.setBrightness(self.config, self.device.instanceId, Math.round(255 * (powerOn / 100)), result => callback())
      } catch (error) {
        if (self.config.debug) {
          self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Brightness) set \n' + error.message)
        }
        callback("no_response")
      }
    })
            
    if(typeof this.device.light[0]["5706"] !== 'undefined'){
        if(this.device.light[0]["5706"].length < 6){
            this.device.light[0]["5706"] = "ffcea6" //Default value when it was offline
        }
        
        var hsl;
        try {
          hsl = utils.convertRGBToHSL(this.device.light[0]["5706"])
        } catch (error) {
          hsl = utils.convertRGBToHSL("ffcea6"); //default value
          if (self.config.debug) {          
            self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Brightness) set convertRGBToHSL'  + this.device.light[0]["5706"]+  '\n' + error.message)
          }
        }
        
        lightbulbService
        .addCharacteristic(Characteristic.Kelvin)

        lightbulbService
        .setCharacteristic(Characteristic.Kelvin, utils.getKelvin(this.device.light[0]["5709"]))
        .setCharacteristic(Characteristic.Hue, hsl[0] * 360)
        .setCharacteristic(Characteristic.Saturation, hsl[1] * 100)
        
        
        lightbulbService
        .getCharacteristic(Characteristic.Kelvin)
        .on('get', callback => {
          try {            
            utils.getDevice(self.config, self.device.instanceId).then(device => {
              if(!device) {
                throw "Time out getDevice"
              }
              self.currentKelvin = utils.getKelvin(device.light[0]["5709"])
              callback(null, self.currentKelvin)
            })
          } catch (error) {
            if (self.config.debug) {
              self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Kelvin) 5706 get \n' + error.message)
            }
            callback("no_response")
          }
        })
        .on('set', (kelvin, callback) => {
          try {            
            utils.setKelvin(self.config, self.device.instanceId, kelvin, result => callback())
          } catch (error) {
            if (self.config.debug) {
              self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Kelvin) 5706 set \n' + error.message)
            }
            callback("no_response")
          }
        })

        lightbulbService
          .getCharacteristic(Characteristic.Hue)
          .on('get', callback => {
            try {
              utils.getDevice(self.config, self.device.instanceId).then(device => {
                if(!device) {
                  throw "Time out getDevice"
                }
                if(typeof device.light[0]["5706"] === 'undefined' || device.light[0]["5706"] && device.light[0]["5706"].length < 6){
                  if (self.config.debug) {
                    self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Hue) get failed polling Hue, return value \n' + device.light[0]["5706"])
                  }
                  device.light[0]["5706"] = "ffcea6" //Default value when it fails polling
                }
                var hsl;
                try {
                  hsl = utils.convertRGBToHSL(device.light[0]["5706"])
                } catch (error) {
                  hsl = utils.convertRGBToHSL("ffcea6"); //default value
                  if (self.config.debug) {          
                    self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Hue) set convertRGBToHSL '  + device.light[0]["5706"]+  '\n' + error.message)
                  }
                }
                
                callback(null, hsl[0] * 360)
              })
            } catch (error) {
              if (self.config.debug) {
                self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Hue) get \n' + error.message)
              }
              callback("no_response")
            }

          })
          .on('set', (hue, callback) => {
            self.color.hue = hue / 360
            try {              
              if (typeof self.color.saturation !== 'undefined') {
                utils.setColor(self.config, self.device.instanceId, self.color, result => callback())
                self.color = {}
              }else{
                callback()            
              }
            } catch (error) {
              if (self.config.debug) {
                self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Hue) set \n' + error.message)
              }
              callback("no_response")
            }
          })

        lightbulbService
          .getCharacteristic(Characteristic.Saturation)
          .on('get', callback => {
            try {
              utils.getDevice(self.config, self.device.instanceId).then(device => {
                if(!device) {
                  throw "Time out getDevice"
                }
                if(typeof device.light[0]["5706"] === 'undefined' || device.light[0]["5706"] && device.light[0]["5706"].length < 6){
                  if (self.config.debug) {
                    self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Saturation) get failed polling Saturation, return value \n' + device.light[0]["5706"])
                  }
                  device.light[0]["5706"] = "ffcea6" //Default value when it fails polling
                }
                var hsl;
                try {
                  hsl = utils.convertRGBToHSL(device.light[0]["5706"])
                } catch (error) {
                  hsl = utils.convertRGBToHSL("ffcea6"); //default value
                  if (self.config.debug) {          
                    self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Saturation) set convertRGBToHSL '  + device.light[0]["5706"]+  '\n' + error.message)
                  }
                }
                callback(null, hsl[1] * 100)
              })
            } catch (error) {
              if (self.config.debug) {
                self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Saturation) get \n' + error.message)
              }
              callback("no_response")
            }


          })
          .on('set', (saturation, callback) => {
            self.color.saturation = saturation / 100
            try {
              if (typeof self.color.hue !== 'undefined') {
                utils.setColor(self.config, self.device.instanceId, self.color, result => callback())
                self.color = {}
              }else{
                callback()            
              }
            } catch (error) {
              if (self.config.debug) {
                self.config.log('ERROR lightbulbService.getCharacteristic(Characteristic.Saturation) set \n' + error.message)
              }
              callback("no_response")
            }
          })
    }

    return [accessoryInformation, lightbulbService]
  }
}
