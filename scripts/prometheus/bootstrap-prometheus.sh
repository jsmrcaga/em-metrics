#!/usr/bin/env bash

node ./generate-fake-prom-data.js

promtool generate-blocks-open-metrics
promtool generate-blocks-from-rules
