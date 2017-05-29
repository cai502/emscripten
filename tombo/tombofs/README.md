# tombo file system

## setup

```console
npm install
```

## build

```console
npm run build
```

Or watch the directory.

```console
npm run build -- --watch
```

## test

```console
cd ${EMSCRIPTEN}/tests
python runner.py tombo
# with specific browser
EMSCRIPTEN_BROWSER=/Applications/Google\\\ Chrome\\\ Canary.app/Contents/MacOS/Google\\\ Chrome\\\ Canary python runner.py tombo
```
