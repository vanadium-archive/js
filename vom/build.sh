#!/bin/bash

(
    export PATH="${VEYRON_ROOT}/environment/cout/node/bin:${PATH}"
    export PATH="../node_modules/.bin:${PATH}"
    npm install prova
    prova *_test.js -b -l chrome
)
