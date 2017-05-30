#!/bin/sh -exu
node node_modules/eslint/bin/eslint.js --config=.eslintrc --fix src/*
