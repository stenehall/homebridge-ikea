# Homebridge Ikea

This is a very quick and still very dirty implementation of [Ikeas gateway](http://www.ikea.com/se/sv/catalog/products/40337806/) with an [Ikea lightbulb](http://www.ikea.com/se/sv/catalog/products/10318263/). As of now it works just fine to turn it on and set the brighness but temperature is not yet working.

## Up and running

For this to work we first need [libcoap](https://github.com/obgm/libcoap.git) since it seems to be the best tool to talk coap for now.

### Install libcoap

This is the little util that we'll be using to actually talk with the gateway. I've tried this on a raspberry pi so any debian:ish should work.

```
apt-get install libtool

git clone --recursive https://github.com/obgm/libcoap.git
cd libcoap
git checkout dtls
git submodule update --init --recursive
./autogen.sh
./configure --disable-documentation --disable-shared
make
sudo make install
```
This gives you a nice little util that you can actually controll your IKEA gateway with.

A command would look something like this.

```
coap-client -u "Client_identity" -k your-secret-key -m get "coaps://192.168.1.123:5684/15001/65537"
```
This will return all information about my lamp.

```
coap-client -u "Client_identity" -k your-secret-key -m get "coaps://192.168.1.123:5684/15001"
```
Calling above following seems to give you back a list of IDs for known devices. For me that returns `[65536,65537]` Where `65536` is the small remote control I have and `65537` is the lamp.

(All creeds to https://github.com/bwssytems/ha-bridge/issues/570#issuecomment-292081839 et. all in that thread)

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

## Credits

Thanks to [r41d](https://github.com/r41d) for figuring out [https://github.com/bwssytems/ha-bridge/issues/570#issuecomment-292188880](https://github.com/bwssytems/ha-bridge/issues/570#issuecomment-292188880
)

Thanks to [Hedda](https://github.com/Hedda) for [https://github.com/bwssytems/ha-bridge/issues/570#issuecomment-292081839](https://github.com/bwssytems/ha-bridge/issues/570#issuecomment-292081839)

And a huge thanks to the rest of the people in [https://github.com/bwssytems/ha-bridge/issues/570](https://github.com/bwssytems/ha-bridge/issues/570)

## Todos
- Atm when changing brightness a "setOn" command is also being call causing the light to flicker.
- Try with multiple lamps
- Fix temperature of light
- break out and clean up code (ofcourse)
