import BaseHTTPServer, multiprocessing, os, shutil, subprocess, unittest, zlib, webbrowser, time, shlex, httplib
from runner import BrowserCore, path_from_root
from tools.shared import *
import ConfigParser # for reading AWS credentials
import json
import re

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

class PlatformHandler(BaseHTTPServer.BaseHTTPRequestHandler):
  AWS_CREDENTIALS_PATH = './tombo/aws_credentials'
  AWS_REGION = 'us-west-2'
  S3_BUCKET_NAME = 'tombofs.development'
  S3_ENDPOINT = 's3-us-west-2.amazonaws.com'

  TOMBO_USER_ID = 'tombo-test-user'
  TOMBO_APP_ID = 'app-id-{}-{}'.format(os.getpid(), int(float(time.time()) * 1000))
  S3_USER_BASE_URL = 's3://{}/{}/'.format(S3_BUCKET_NAME, TOMBO_USER_ID)
  S3_BASE_URL = 's3://{}/{}/{}/'.format(S3_BUCKET_NAME, TOMBO_USER_ID, TOMBO_APP_ID)
  S3_USER_BASE_PATH = '{}/'.format(TOMBO_USER_ID)
  S3_BASE_PATH = '{}/{}/'.format(TOMBO_USER_ID, TOMBO_APP_ID)

  @classmethod
  def initialize(self):
    self.sts_credential()

  def do_GET(s):
    s.send_response(200)
    s.send_header('Access-Control-Allow-Origin', '*')
    s.send_header('Access-Control-Request-Method', '*')
    s.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    s.send_header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    s.end_headers()
    s.wfile.write(json.dumps(
      {
        'data': {
          'type': 'credential',
          'attributes': {
            'access_key_id': PlatformHandler.federation_access_key_id,
            'secret_access_key': PlatformHandler.federation_secret_access_key,
            'session_token': PlatformHandler.federation_session_token,
            'expiration': PlatformHandler.federation_expiration,
            'bucket': PlatformHandler.S3_BUCKET_NAME,
            'region': PlatformHandler.AWS_REGION,
            'endpoint': PlatformHandler.S3_ENDPOINT
          }
        }
      }
    ))

  @classmethod
  def execute_aws_command_with_credentials(self, service, commands, access_key_id, secret_access_key, session_token=None):
    if commands is None:
      commands = []
    aws_env = {
      'PATH': os.environ['PATH'],
      'AWS_ACCESS_KEY_ID': access_key_id,
      'AWS_SECRET_ACCESS_KEY': secret_access_key,
    }
    if session_token:
      aws_env['AWS_SESSION_TOKEN'] = session_token
    p = Popen(
      ['aws', service] + commands + [
        '--region={}'.format(self.AWS_REGION),
        '--output=json'
      ], env=aws_env, stdout=PIPE, stderr=PIPE)
    stdout, stderr = p.communicate()
    if stderr != '':
      raise Exception(stderr)
    if service == 's3':
      # s3 output cannot be JSON
      return stdout
    elif service == 's3api':
      if commands[0] == 'delete-object':
        # NOTE: aws s3api delete-object doesn't respond any output X(
        return stdout
    try:
      return json.loads(stdout)
    except ValueError as e:
      raise Exception(stdout)

  @classmethod
  def execute_aws_command_with_federation(self, service, commands):
    return self.execute_aws_command_with_credentials(
      service, commands,
      self.federation_access_key_id,
      self.federation_secret_access_key,
      self.federation_session_token
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
    try:
      self.execute_aws_command('s3', [
        'rm', self.S3_USER_BASE_URL, '--recursive'
      ])
    except Exception as e:
      if str(e).find('NoSuchBucket') == -1:
        raise e

  @classmethod
  def sts_credential(self):
    result = self.execute_aws_command('sts', [
      'get-federation-token',
      '--name', self.TOMBO_USER_ID,
      '--duration-seconds', '129600',
      '--policy', json.dumps({
        'Version': '2012-10-17',
        'Statement': [
          {
            'Effect': 'Allow',
            'Action': [
              's3:ListBucket'
            ],
            'Resource': 'arn:aws:s3:::{}'.format(self.S3_BUCKET_NAME),
            'Condition': {
              'StringLike': {
                's3:prefix': [
                  self.S3_USER_BASE_PATH + '*'
                ]
              }
            }
          },
          {
            'Effect': 'Allow',
            'Action': [
              's3:PutObject*',
              's3:GetObject*',
              's3:DeleteObject*'
            ],
            'Resource': 'arn:aws:s3:::{}/{}/*'.format(self.S3_BUCKET_NAME, self.TOMBO_USER_ID)
          }
        ]
      })
    ])
    credentials = result['Credentials']
    self.federation_access_key_id = credentials['AccessKeyId']
    self.federation_secret_access_key = credentials['SecretAccessKey']
    self.federation_session_token = credentials['SessionToken']
    self.federation_expiration = credentials['Expiration']

class tombo(BrowserCore):
  PRE_JS_TOMBOFS = ['--pre-js', 'tombofs-parameters.js']

  @classmethod
  def setUpClass(self):
    super(tombo, self).setUpClass()
    self.browser_timeout = 30

    def run_platform_server():
      platform_httpd = BaseHTTPServer.HTTPServer(('localhost', 11111), PlatformHandler)
      platform_httpd.serve_forever()

    PlatformHandler.initialize()
    self.platform_server = multiprocessing.Process(target=run_platform_server)
    self.platform_server.start()

    while True:
      try:
        conn = httplib.HTTPConnection('localhost', 11111)
        conn.request('GET', '/')
        r = conn.getresponse()
        if r.status == 200:
          break
      except:
        pass
      print 'Waiting for launching a test platform server'
      time.sleep(1)

    print
    print 'Running the browser tests. Make sure the browser allows popups from localhost.'
    print

  @classmethod
  def tearDownClass(self):
    super(tombo, self).tearDownClass()
    self.platform_server.terminate()

  def setUp(self):
    super(tombo, self).setUp()
    self.write_tombofs_parameters_js()
    PlatformHandler.initialize_s3()

  def write_tombofs_parameters_js(self):
    open(os.path.join(self.get_dir(), 'tombofs-parameters.js'), 'w').write(
      'Module.tombo = {}; document.cookie = {};'.format(
        json.dumps({
          'appId': PlatformHandler.TOMBO_APP_ID,
          'userId': PlatformHandler.TOMBO_USER_ID,
          'apiURI': 'http://localhost:11111/',
          'enableTomboFS': true
        }),
        json.dumps('user_jwt=user.jwt')
      )
    )

  def test_s3_policy(self):
    # Preparation
    FORBIDDEN_BUCKET_NAME = 'user.cannot.access'
    PlatformHandler.execute_aws_command('s3api', [
      'put-object',
      '--bucket', FORBIDDEN_BUCKET_NAME,
      '--key', 'test.file',
      '--body', os.path.realpath(__file__)
    ])
    OTHER_USER_NAME = 'tombo-other-user'
    OTHER_USER_TEST_FILE_PATH = '{}/test.file'.format(OTHER_USER_NAME)
    # Cannot do put-object under other user's path with federation user
    with self.assertRaises(Exception):
      PlatformHandler.execute_aws_command_with_federation('s3api', [
        'put-object',
        '--bucket', PlatformHandler.S3_BUCKET_NAME,
        '--key', OTHER_USER_TEST_FILE_PATH,
        '--body', os.path.realpath(__file__)
      ])
    # Can do put-object with IAM user
    PlatformHandler.execute_aws_command('s3api', [
      'put-object',
      '--bucket', PlatformHandler.S3_BUCKET_NAME,
      '--key', OTHER_USER_TEST_FILE_PATH,
      '--body', os.path.realpath(__file__)
    ])

    # Cannot do list-buckets
    with self.assertRaises(Exception):
      PlatformHandler.execute_aws_command_with_federation('s3api', [
        'list-buckets',
      ])
    # Cannot do list-objects under other bucket
    with self.assertRaises(Exception):
      PlatformHandler.execute_aws_command_with_federation('s3api', [
        'list-objects-v2',
        '--bucket', FORBIDDEN_BUCKET_NAME
      ])
    TEST_FILE_PATH = PlatformHandler.S3_BASE_PATH + 'test.file'
    # Can do put-object under app path
    PlatformHandler.execute_aws_command_with_federation('s3api', [
      'put-object',
      '--bucket', PlatformHandler.S3_BUCKET_NAME,
      '--key', TEST_FILE_PATH,
      '--body', os.path.realpath(__file__)
    ])
    # Cannot do list-objects under bucket
    with self.assertRaises(Exception):
      results = PlatformHandler.execute_aws_command_with_federation('s3api', [
        'list-objects-v2',
        '--bucket', PlatformHandler.S3_BUCKET_NAME
      ])
    # Can do list-objects under user path
    PlatformHandler.execute_aws_command_with_federation('s3api', [
      'list-objects-v2',
      '--bucket', PlatformHandler.S3_BUCKET_NAME,
      '--prefix', PlatformHandler.S3_USER_BASE_PATH
    ])
    # Can list under app path in the user path
    results = PlatformHandler.execute_aws_command_with_federation('s3api', [
      'list-objects-v2',
      '--bucket', PlatformHandler.S3_BUCKET_NAME,
      '--prefix', PlatformHandler.S3_BASE_PATH
    ])
    # The list has only the uploaded object
    self.assertEqual(len(results['Contents']), 1)
    self.assertEqual(results['Contents'][0]['Key'], TEST_FILE_PATH)
    # Can delete uploaded object
    PlatformHandler.execute_aws_command_with_federation('s3api', [
      'delete-object',
      '--bucket', PlatformHandler.S3_BUCKET_NAME,
      '--key', TEST_FILE_PATH
    ])

    # Teardown
    PlatformHandler.execute_aws_command('s3api', [
      'delete-object',
      '--bucket', PlatformHandler.S3_BUCKET_NAME,
      '--key', OTHER_USER_TEST_FILE_PATH
    ])

  def test_fs_tombofs_sync(self):
    for extra in [[], ['-DEXTRA_WORK']]:
      secret = str(time.time())
      self.btest(path_from_root('tests', 'tombo', 'test_tombofs_sync.c'), '1', force_c=True, args=tombo.PRE_JS_TOMBOFS + ['-ltombofs.js', '-DFIRST', '-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main', '_test', '_success']'''])

      # FIRST execution
      results = PlatformHandler.execute_aws_command_with_federation('s3api', [
        'list-objects-v2',
        '--bucket', PlatformHandler.S3_BUCKET_NAME,
        '--prefix', PlatformHandler.S3_BASE_PATH
      ])
      keys_first = frozenset([i['Key'] for i in results['Contents']])
      keys_first_without_timestamp = frozenset([re.sub(r'/\d+$', '', i) for i in keys_first])
      keys_expected = frozenset([PlatformHandler.S3_BASE_PATH + i for i in [
        'tombofs.manifest',
        'entries/working1/moar.txt',
        'entries/working1/waka.txt',
        'entries/working1/empty.txt'
      ]])
      self.assertSetEqual(keys_first_without_timestamp, keys_expected)

      # SECOND execution
      self.btest(path_from_root('tests', 'tombo', 'test_tombofs_sync.c'), '1', force_c=True, args=tombo.PRE_JS_TOMBOFS + ['-ltombofs.js', '-DSECRET=\"' + secret + '\"', '-s', '''EXPORTED_FUNCTIONS=['_main', '_test', '_success']'''] + extra)
      results = PlatformHandler.execute_aws_command_with_federation('s3api', [
        'list-objects-v2',
        '--bucket', PlatformHandler.S3_BUCKET_NAME,
        '--prefix', PlatformHandler.S3_BASE_PATH
      ])
      keys_second = frozenset([i['Key'] for i in results['Contents']])
      keys_second_without_timestamp = frozenset([re.sub(r'/\d+$', '', i) for i in keys_second])
      self.assertSetEqual(keys_second, keys_first)

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
