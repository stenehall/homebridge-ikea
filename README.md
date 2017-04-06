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

Once you know the name and id of your lamp add it to your accessories list and you should be good to go. This works nicely for my single lamp, not yet tested with anything more.

```
"accessories": [
  {
    "accessory": "Ikea Gateway",
    "name": "ikea",
    "id": 65537
  }
]
```

For now the gateways ip is hard-coded into the index.js file of this as well, so you'd have to replace that.
Same goes with the secret-key. That also needs to be replaced.

## Todos
- Atm when changing brightness a "setOn" command is also being call causing the light to flicker.
- Try with multiple lamps
- Fix temperature of light
- break out and clean up code (ofcourse)
