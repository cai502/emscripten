# tombo file system

## setup

```console
eval "$(a2obrew init -)" # for adding a2o's node into $PATH
npm install
```

## watch

Watch the directory.

```console
npm run watch
```

## production build

```console
npm run build
```

## test

```console
cd ${EMSCRIPTEN}/tests
python runner.py tombo
# with specific browser
EMSCRIPTEN_BROWSER=/Applications/Google\\\ Chrome\\\ Canary.app/Contents/MacOS/Google\\\ Chrome\\\ Canary python runner.py tombo
```
