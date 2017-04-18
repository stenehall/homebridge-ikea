# Homebridge Ikea

A [homebridge](https://github.com/nfarina/homebridge) plugin for [Ikeas Trådfri](http://www.ikea.com/se/sv/catalog/categories/departments/lighting/36812/) lamps using [Ikeas Trådfri gateway](http://www.ikea.com/se/sv/catalog/products/40337806/) with an [Ikea trådfri lightbulb](http://www.ikea.com/se/sv/catalog/products/10318263/). As of now it works just fine for turn lamps on/off and setting the brighness and changing the temperature.

## Functionality

- Find all your Ikea lamps connected to your Gateway.
- Uses provided lamp information from the Gateway.
- Turn on and off your lamps.
- Dim the lamps.
- Control the temperature/kelvin of your lamps. Currently doesn't work in HomeKit app, only tested in Eve.

## Dependencies

If you're running macOS or linux the included binaries should work out of the box for you and you shouldn't have to provide your own version. If you're running another OS or if the provided binaries aren't working please as the path to `coap-client` using `coapClient`. Here's how [I compiled the included binaries versions](https://github.com/stenehall/homebridge-ikea/wiki/Compile-coap-client).

## Add to your config

Manually adding all lamps are no fun, right? We want them to just appear for us!

You'll have to figure out the IP to your gateway yourself (if you've managed to compile coap-client I'm guessing you'll handle that). The PSK will be written under the Gateway.

```
{
  "platform": "Ikea",
  "name": "Gateway",
  "ip": "192.168.x.xxx",
  "psk": "xxxxxxxxxxxxxxxx"
}
```

If you need the actual coaps communication for debugging add `debug: true` to your config.

## Todos

- ~~Improve on Kelvin selection~~ (Cheers [sandyjmacdonald](https://github.com/bwssytems/ha-bridge/issues/570#issuecomment-293914023))
- ~~Get lamp state from Gateway on boot~~ (Cheers [shoghicp](https://github.com/stenehall/homebridge-ikea/pull/2))
-  ~~Don't leak PSKs in log~~ (Cheers [Firehed](https://github.com/stenehall/homebridge-ikea/pull/7))
- Clean up code, make it actually readable
- Break out all IPSOObjects numbers to utils, hiding it away.

## Credits

Thanks to [r41d](https://github.com/r41d) for figuring out [https://github.com/bwssytems/ha-bridge/issues/570#issuecomment-292188880](https://github.com/bwssytems/ha-bridge/issues/570#issuecomment-292188880
)

Thanks to [Hedda](https://github.com/Hedda) for [https://github.com/bwssytems/ha-bridge/issues/570#issuecomment-292081839](https://github.com/bwssytems/ha-bridge/issues/570#issuecomment-292081839)

And a huge thanks to the rest of the people in [https://github.com/bwssytems/ha-bridge/issues/570](https://github.com/bwssytems/ha-bridge/issues/570)
