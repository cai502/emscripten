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
  AWS_CREDENTIALS_PATH = './tombo/aws_credentials'
  AWS_REGION = 'us-west-2'
  S3_BUCKET_NAME = 'tombo.development'
  TOMBO_USER_ID = 'tombo-test-user'
  TOMBO_APP_ID = 'app-id-{}-{}'.format(os.getpid(), int(float(time.time()) * 1000))
  PRE_JS_TOMBOFS = ['--pre-js', 'tombofs-parameters.js']

  @classmethod
  def setUpClass(self):
    self.initialize_s3()
    super(tombo, self).setUpClass()
    self.browser_timeout = 20
    print
    print 'Running the browser tests. Make sure the browser allows popups from localhost.'
    print

  @classmethod
  def execute_s3_command(self, commands):
    if not hasattr(self, 'aws_env'):
      if not os.path.exists(self.AWS_CREDENTIALS_PATH):
        raise 'Cannot find {0}'.format(self.AWS_CREDENTIALS_PATH)
      p = ConfigParser.SafeConfigParser()
      p.read(self.AWS_CREDENTIALS_PATH)
      aws_access_key_id = p.get('default', 'aws_access_key_id')
      aws_secret_access_key = p.get('default', 'aws_secret_access_key')
      aws_env = os.environ.copy()
      aws_env['AWS_ACCESS_KEY_ID'] = aws_access_key_id
      aws_env['AWS_SECRET_ACCESS_KEY'] = aws_secret_access_key
      self.aws_env = aws_env
    Popen(
      ['aws', 's3'] + commands + [
        '--region={}'.format(self.AWS_REGION),
        '--output=json',
        '--recursive'
      ], env=self.aws_env)

  @classmethod
  def initialize_s3(self):
    url_to_be_removed = 's3://{}/{}/{}/'.format(self.S3_BUCKET_NAME, self.TOMBO_USER_ID, self.TOMBO_APP_ID)
    print '{} is removed'.format(url_to_be_removed)
    self.execute_s3_command(['rm', url_to_be_removed, '--recursive'])

  def setUp(self):
    super(tombo, self).setUp()
    self.write_tombofs_parameters_js()

  def write_tombofs_parameters_js(self):
    open(os.path.join(self.get_dir(), 'tombofs-parameters.js'), 'w').write('''
      Module.tombo = {
        appId: '%s',
        userId: '%s'
      };
    ''' % (tombo.TOMBO_APP_ID, tombo.TOMBO_USER_ID))

  def test_fs_tombofs_sync(self):
    for extra in [[], ['-DEXTRA_WORK']]:
      secret = str(time.time())
      self.btest(path_from_root('tests', 'tombo', 'test_tombofs_sync.c'), '1', force_c=True, args=tombo.PRE_JS_TOMBOFS + ['-ltombofs.js', '-DFIRST', '-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main', '_test', '_success']'''])
      self.btest(path_from_root('tests', 'tombo', 'test_tombofs_sync.c'), '1', force_c=True, args=tombo.PRE_JS_TOMBOFS + ['-ltombofs.js', '-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main', '_test', '_success']'''] + extra)

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

    args = tombo.PRE_JS_TOMBOFS + ['--pre-js', 'pre.js', '-s', 'EMTERPRETIFY=1', '-s', 'EMTERPRETIFY_ASYNC=1', '-ltombofs.js']
    secret = str(time.time())
    self.btest(path_from_root('tests', 'tombo', 'test_tombofs_fsync.c'), '1', force_c=True, args=args + ['-DFIRST', '-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main', '_success']'''])
    self.btest(path_from_root('tests', 'tombo', 'test_tombofs_fsync.c'), '1', force_c=True, args=args + ['-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main', '_success']'''])
