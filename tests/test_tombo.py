import BaseHTTPServer, multiprocessing, os, shutil, subprocess, unittest, zlib, webbrowser, time, shlex
from runner import BrowserCore, path_from_root
from tools.shared import *

# User can specify an environment variable EMSCRIPTEN_BROWSER to force the browser test suite to
# run using another browser command line than the default system browser.
emscripten_browser = os.environ.get('EMSCRIPTEN_BROWSER')
if emscripten_browser:
  cmd = shlex.split(emscripten_browser)
  def run_in_other_browser(url):
    Popen(cmd + [url])
  if EM_BUILD_VERBOSE_LEVEL >= 3:
    print >> sys.stderr, "using Emscripten browser: " + str(cmd)
  webbrowser.open_new = run_in_other_browser

class tombo(BrowserCore):
  @classmethod
  def setUpClass(self):
    super(tombo, self).setUpClass()
    self.browser_timeout = 20
    print
    print 'Running the browser tests. Make sure the browser allows popups from localhost.'
    print

  def test_fs_tombofs_fsync(self):
    args = ['-s', 'EMTERPRETIFY=1', '-s', 'EMTERPRETIFY_ASYNC=1'];
    for mode in [[], ['-s', 'MEMFS_APPEND_TO_TYPED_ARRAYS=1']]:
      secret = str(time.time())
      self.btest(path_from_root('tests', 'tombo', 'test_tombofs_fsync.c'), '1', force_c=True, args=args + mode + ['-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main']'''])
