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
  S3_BUCKET_NAME = 'tombofs.development'
  COGNITO_IDENTITY_POOL_ID = 'us-west-2:3fd36f0b-b2e2-4bd3-9bde-f7ca921936f5'
  COGNITO_ROLE_ARN = 'arn:aws:iam::125704208149:role/Cognito_TomboAuth_Role'

  TOMBO_USER_ID = 'tombo-test-user'
  TOMBO_APP_ID = 'app-id-{}-{}'.format(os.getpid(), int(float(time.time()) * 1000))
  S3_USER_BASE_URL = 's3://{}/{}/'.format(S3_BUCKET_NAME, TOMBO_USER_ID)
  S3_BASE_URL = 's3://{}/{}/{}/'.format(S3_BUCKET_NAME, TOMBO_USER_ID, TOMBO_APP_ID)
  PRE_JS_TOMBOFS = ['--pre-js', 'tombofs-parameters.js']

  @classmethod
  def setUpClass(self):
    try:
      self.initialize_s3()
    except Exception as e:
      if str(e).find('NoSuchBucket') == -1:
        raise e
    self.cognito_credentials()
    super(tombo, self).setUpClass()
    self.browser_timeout = 20
    print
    print 'Running the browser tests. Make sure the browser allows popups from localhost.'
    print

  @classmethod
  def execute_aws_command_with_credentials(self, service, commands, access_key_id, secret_access_key, session_token=None):
    if commands is None:
      commands = []
    aws_env = os.environ.copy()
    aws_env['AWS_ACCESS_KEY_ID'] = access_key_id
    aws_env['AWS_SECRET_ACCESS_KEY'] = secret_access_key
    if session_token:
      aws_env['AWS_SESSION_TOKEN'] = session_token
    p = Popen(
      ['aws', service] + commands + [
        '--region={}'.format(self.AWS_REGION),
        '--output=json'
      ], env=aws_env, stdout=PIPE, stderr=PIPE)
    stdout, stderr = p.communicate()
    if service == 's3':
      if stderr != '':
        raise Exception(stderr)
      # s3 output cannot be JSON
      return stdout
    else:
      return json.loads(stdout)

  @classmethod
  def execute_aws_command_with_cognito(self, service, commands):
    return self.execute_aws_command_with_credentials(
      service, commands,
      self.cognito_access_key_id,
      self.cognito_secret_access_key,
      self.cognito_session_token
    )

  @classmethod
  def execute_aws_command(self, service, commands):
    if not hasattr(self, 'aws_access_key_id'):
      if not os.path.exists(self.AWS_CREDENTIALS_PATH):
        raise 'Cannot find {0}'.format(self.AWS_CREDENTIALS_PATH)
      p = ConfigParser.SafeConfigParser()
      p.read(self.AWS_CREDENTIALS_PATH)
      self.aws_access_key_id = p.get('default', 'aws_access_key_id')
      self.aws_secret_access_key = p.get('default', 'aws_secret_access_key')
    return self.execute_aws_command_with_credentials(
      service, commands,
      self.aws_access_key_id,
      self.aws_secret_access_key
    )

  @classmethod
  def initialize_s3(self):
    print '{} is removed'.format(tombo.S3_USER_BASE_URL)
    self.execute_aws_command('s3', ['rm', tombo.S3_USER_BASE_URL, '--recursive'])

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
    self.cognito_access_key_id = credentials['AccessKeyId']
    self.cognito_secret_access_key = credentials['SecretAccessKey']
    self.cognito_session_token = credentials['SessionToken']
    self.cognito_expiration = credentials['Expiration']

  def setUp(self):
    super(tombo, self).setUp()
    self.write_tombofs_parameters_js()

  def write_tombofs_parameters_js(self):
    open(os.path.join(self.get_dir(), 'tombofs-parameters.js'), 'w').write('Module.tombo = {}'.format(json.dumps({
      'appId': tombo.TOMBO_APP_ID,
      'userId': tombo.TOMBO_USER_ID,
      'aws': {
        'debugAccessKeyId': tombo.cognito_access_key_id,
        'debugSecretAccessKey': tombo.cognito_secret_access_key,
        'debugSessionToken': tombo.cognito_session_token,
        'debugExpiration': tombo.cognito_expiration
      }
    })))

  def test_s3_policy(self):
    with self.assertRaises(Exception):
      self.execute_aws_command_with_cognito('s3', ['ls'])
    self.execute_aws_command_with_cognito('s3', ['cp', os.path.realpath(__file__), tombo.S3_USER_BASE_URL + 'test.file'])
    result = self.execute_aws_command_with_cognito('s3', ['ls', tombo.S3_USER_BASE_URL])
    self.assertNotEqual(result.find(' test.file'), -1)

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
