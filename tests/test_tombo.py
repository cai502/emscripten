import BaseHTTPServer, multiprocessing, os, shutil, subprocess, unittest, zlib, webbrowser, time, shlex
from runner import BrowserCore, path_from_root
from tools.shared import *
import ConfigParser # for reading AWS credentials
import json

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
  COGNITO_IDENTITY_POOL_ID = 'us-west-2:3fd36f0b-b2e2-4bd3-9bde-f7ca921936f5'
  COGNITO_ROLE_ARN = 'arn:aws:iam::125704208149:role/Cognito_TomboAuth_Role'

  TOMBO_USER_ID = 'tombo-test-user'
  TOMBO_APP_ID = 'app-id-{}-{}'.format(os.getpid(), int(float(time.time()) * 1000))
  PRE_JS_TOMBOFS = ['--pre-js', 'tombofs-parameters.js']

  @classmethod
  def setUpClass(self):
    self.initialize_s3()
    self.cognito_credentials()
    super(tombo, self).setUpClass()
    self.browser_timeout = 20
    print
    print 'Running the browser tests. Make sure the browser allows popups from localhost.'
    print

  @classmethod
  def execute_aws_command(self, service, commands):
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
    p = Popen(
      ['aws', service] + commands + [
        '--region={}'.format(self.AWS_REGION),
        '--output=json'
      ], env=self.aws_env, stdout=PIPE)
    stdout, stderr = p.communicate()
    if service == 's3':
      # s3 output cannot be JSON
      return stdout
    else:
      return json.loads(stdout)

  @classmethod
  def initialize_s3(self):
    url_to_be_removed = 's3://{}/{}/{}/'.format(self.S3_BUCKET_NAME, self.TOMBO_USER_ID, self.TOMBO_APP_ID)
    print '{} is removed'.format(url_to_be_removed)
    self.execute_aws_command('s3', ['rm', url_to_be_removed, '--recursive'])

  @classmethod
  def cognito_credentials(self):
    result = self.execute_aws_command('cognito-identity', [
      'get-open-id-token-for-developer-identity',
      '--identity-pool-id', tombo.COGNITO_IDENTITY_POOL_ID,
      '--logins', json.dumps({
        'login.tombo.app': tombo.TOMBO_USER_ID
      })
    ])
    web_identity_token = result['Token']
    result = self.execute_aws_command('sts', [
      'assume-role-with-web-identity',
      '--role-arn', tombo.COGNITO_ROLE_ARN,
      '--role-session-name', tombo.TOMBO_USER_ID,
      '--policy', json.dumps({
        'Version': '2012-10-17',
        'Statement': [
          {
            'Effect': 'Allow',
            'Action': '*',
            'Resource': 'arn:aws:s3:::{}/{}/*'.format(tombo.S3_BUCKET_NAME, tombo.TOMBO_USER_ID)
          }
         ]
      }),
      '--web-identity-token', web_identity_token
    ])
    credentials = result['Credentials']
    self.cognitoAccessKeyId = credentials['AccessKeyId']
    self.cognitoSecretAccessKey = credentials['SecretAccessKey']
    self.cognitoSessionToken = credentials['SessionToken']
    self.cognitoExpiration = credentials['Expiration']

  def setUp(self):
    super(tombo, self).setUp()
    self.write_tombofs_parameters_js()

  def write_tombofs_parameters_js(self):
    open(os.path.join(self.get_dir(), 'tombofs-parameters.js'), 'w').write('Module.tombo = {}'.format(json.dumps({
      'appId': tombo.TOMBO_APP_ID,
      'userId': tombo.TOMBO_USER_ID,
      'aws': {
        'debugAccessKeyId': tombo.cognitoAccessKeyId,
        'debugSecretAccessKey': tombo.cognitoSecretAccessKey,
        'debugSessionToken': tombo.cognitoSessionToken,
        'debugExpiration': tombo.cognitoExpiration
      }
    })));

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
