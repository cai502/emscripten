import BaseHTTPServer, multiprocessing, os, shutil, subprocess, unittest, zlib, webbrowser, time, shlex
from runner import BrowserCore, path_from_root
from tools.shared import *
import ConfigParser # for reading AWS credentials

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
    self.initialize_aws_s3()
    super(tombo, self).setUpClass()
    self.browser_timeout = 20
    print
    print 'Running the browser tests. Make sure the browser allows popups from localhost.'
    print

  @classmethod
  def initialize_aws_s3(self):
    aws_credentials_path = './tombo/aws_credentials'
    if not os.path.exists(aws_credentials_path):
      raise 'Cannot find {0}'.format(aws_credentails_path)
    p = ConfigParser.SafeConfigParser()
    p.read('./tombo/aws_credentials')
    aws_access_key_id = p.get('default', 'aws_access_key_id')
    aws_secret_access_key = p.get('default', 'aws_secret_access_key')
    aws_env = os.environ.copy()
    aws_env['AWS_ACCESS_KEY_ID'] = aws_access_key_id
    aws_env['AWS_SECRET_ACCESS_KEY'] = aws_secret_access_key
    Popen(['aws', 's3', 'ls', '--region=us-west-2', '--output=json'], env=aws_env)

  def test_fs_tombofs_sync(self):
    for extra in [[], ['-DEXTRA_WORK']]:
      secret = str(time.time())
      self.btest(path_from_root('tests', 'tombo', 'test_tombofs_sync.c'), '1', force_c=True, args=['-ltombofs.js', '-DFIRST', '-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main', '_test', '_success']'''])
      self.btest(path_from_root('tests', 'tombo', 'test_tombofs_sync.c'), '1', force_c=True, args=['-ltombofs.js', '-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main', '_test', '_success']'''] + extra)

  def test_fs_tombofs_fsync(self):
    # sync from persisted state into memory before main()
    open(os.path.join(self.get_dir(), 'pre.js'), 'w').write('''
      Module.preRun = function() {
        addRunDependency('syncfs');

        FS.mkdir('/working1');
        FS.mount(TOMBOFS, {}, '/working1');
        FS.syncfs(true, function (err) {
          if (err) throw err;
          removeRunDependency('syncfs');
        });
      };
    ''')

    args = ['--pre-js', 'pre.js', '-s', 'EMTERPRETIFY=1', '-s', 'EMTERPRETIFY_ASYNC=1', '-ltombofs.js']
    secret = str(time.time())
    self.btest(path_from_root('tests', 'tombo', 'test_tombofs_fsync.c'), '1', force_c=True, args=args + ['-DFIRST', '-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main', '_success']'''])
    self.btest(path_from_root('tests', 'tombo', 'test_tombofs_fsync.c'), '1', force_c=True, args=args + ['-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main', '_success']'''])
