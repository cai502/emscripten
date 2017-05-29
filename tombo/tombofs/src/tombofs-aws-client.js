import 'aws-sdk/dist/aws-sdk';
const AWS = window.AWS;
const Cookies = require('js-cookie');

class TomboFSAWSClient {
  constructor(userId, appId, apiURI) {
    let guid_regex = /^[a-z0-9\-]+$/;
    if (guid_regex.test(userId)) {
      this.userId = userId;
    }
    if (guid_regex.test(appId)) {
      this.appId = appId;
    }
    this.apiURI = apiURI;
    this.expiration = 0;
  }

  setCredentials(
    bucket, region, endpoint,
    accessKeyId, secretAccessKey, sessionToken, expiration
  ) {
    // expiration should be ISO-8601 format string.
    // ex.) 2011-07-15T23:28:33.359Z
    this.bucket = bucket;
    this.region = region;
    this.endpoint = endpoint;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.sessionToken = sessionToken;
    this.expiration = Date.parse(expiration);
  }

  haveValidCredentials() {
    const now = Date.now();
    // 60 secs is the margin to avoid errors.
    const result = !!(now < (this.expiration - 60) && this.accessKeyId && this.secretAccessKey && this.sessionToken);
    return result;
  }

  validS3Client() {
    if (this.haveValidCredentials() && this.s3) {
      // if credential is valid and there is an old S3 client instance,
      // we can reuse it.
      return this.s3;
    }
    this.s3 = null;
    this.accessKeyId = null;
    this.secretAccessKey = null;
    this.sessionToken = null;
    this.expiration = 0;
    return null;
  }

  createS3Client() {
    if (!this.accessKeyId || !this.secretAccessKey || !this.sessionToken) {
      console.log('ERROR: invalid credentials');
      return null;
    }
    const credentials = new AWS.Credentials(
      this.accessKeyId,
      this.secretAccessKey,
      this.sessionToken
    );
    this.s3 = new AWS.S3({
      credentials: credentials,
      endpoint: this.endpoint,
      region: this.region
    });
    return this.s3;
  }

  fetchCredentials() {
    return new Promise((resolve, reject) => {
      console.log('AWS fetchCredentials()')
      if (!this.apiURI) {
        return reject(new Error('Empty apiURI to fetch credentials for the remote file system.'));
      }
      const user_jwt = Cookies.get('user_jwt');
      if (!user_jwt || /^[A-Za-z0-9_\-]+$/.test(user_jwt)) {
        return reject(new Error('Cannot get user_jwt cookie.'));
      }
      fetch(this.apiURI + `file_systems/credential?user_jwt=${user_jwt}&application_id=${this.appId}`).then((response) => {
        if (response.ok) {
          return response.json();
        }
        return Promise.reject(new Error('API response is not ok'));
      }).then((body) => {
        if (
          body['data']['type'] != 'credential' ||
          !body['data']['attributes']['bucket'] ||
          !body['data']['attributes']['region'] ||
          !body['data']['attributes']['endpoint'] ||
          !body['data']['attributes']['access_key_id'] ||
          !body['data']['attributes']['secret_access_key'] ||
          !body['data']['attributes']['session_token'] ||
          !body['data']['attributes']['expiration']
        ) {
          return Promise.reject(new Error('Failed to parse the response from remote filesystem credential API.'));
        }
        this.setCredentials(
          body['data']['attributes']['bucket'],
          body['data']['attributes']['region'],
          body['data']['attributes']['endpoint'],
          body['data']['attributes']['access_key_id'],
          body['data']['attributes']['secret_access_key'],
          body['data']['attributes']['session_token'],
          body['data']['attributes']['expiration']
        );
        resolve();
      }).catch((error) => {
        reject(error);
      });
    });
  }

  getClient() {
    return new Promise((resolve, reject) => {
      let s3client = this.validS3Client();
      if (s3client) { return resolve(s3client); };
      this.fetchCredentials().then(() => {
        resolve(this.createS3Client());
      }).catch((e) => {
        reject(e);
      });
    });
  }

  userPathPrefix() {
    if (!this.userId) {
      throw new Error('AWS userPathPrefix(): empty userId');
    }
    return `${this.userId}/`;
  }

  appPathPrefix() {
    if (!this.appId) {
      throw new Error('AWS appPathPrefix(): empty appId');
    }
    return `${this.userPathPrefix()}${this.appId}/`;
  }

  getObject(key) {
    return this.getClient().then((client) => {
      const actualKey = this.appPathPrefix() + key;

      console.log(`AWS getObject(${key}): ${actualKey}`);

      return new Promise((resolve, reject) => {
        client.getObject({
          Bucket: this.bucket,
          Key: actualKey,
          // NOTE: do not cache
          ResponseCacheControl: 'No-cache',
          ResponseExpires: 0,
        }, (err, data) => {
          if (err) { return reject(err); }
          resolve(data);
        });
      });
    });
  }

  putObject(key, body) {
    return this.getClient().then((client) => {
      const actualKey = this.appPathPrefix() + key;

      console.groupCollapsed(`AWS putObject(${key}, body): ${actualKey}`);
      console.log(body);
      console.groupEnd();

      return new Promise((resolve, reject) => {
        client.putObject({
          Bucket: this.bucket,
          Key: actualKey,
          Body: body
        }, (err, data) => {
          if (err) { return reject(err); }
          resolve(data);
        });
      });
    });
  }

  deleteObject(key) {
    return this.getClient().then((client) => {
      const actualKey = this.appPathPrefix() + key;

      console.log(`AWS deleteObject(${key}): ${actualKey}`);

      return new Promise((resolve, reject) => {
        client.deleteObject({
          Bucket: this.bucket,
          Key: actualKey
          // TODO: Support VersionId
        }, (err, data) => {
          if (err) { return reject(err); }
          resolve(data);
        });
      });
    });
  }

  deleteObjects(keys) {
    return this.getClient().then((client) => {
      const actualKey = this.appPathPrefix() + key;

      const objects = keys.map((key) => {
        return {
          Key: key
          // TODO: Support VersionId
        };
      });

      console.groupCollapsed('AWS deleteObjects(keys)');
      console.log({
        keys: keys,
        objects: objects
      });
      console.groupEnd();

      return new Promise((resolve, reject) => {
        client.deleteObjects({
          Bucket: this.bucket,
          Delete: {
            Objects: objects
          }
        }, (err, data) => {
          if (err) { return reject(err); }
          resolve(data);
        });
      });
    });
  }

  listObjects(prefix) {
    return this.getClient().then((client) => {
      let params = {
        Bucket: this.bucket,
        Delimiter: '/',
        Prefix: this.appPathPrefix() + prefix
      };

      let contents = [];

      return new Promise((resolve, reject) => {
        client.listObjects(params).eachPage((err, data) => {
          if (err) { return reject(err); }
          if (data === null) { return resolve(contents); }
          contents = contents.concat(data.Contents);
        });
      });
    });
  }

  pathToKeyPrefix(path) {
    // NOTE: for deletion
    // TODO: Handle directory correctly
    return `entries${path}/`;
  }

  pathAndEntryToKey(path, entry) {
    // NOTE: Is the timestamp on a millisecond basis is enough?
    if (!entry.timestamp || typeof entry.timestamp.getTime !== 'function') {
      throw new Error('AWS pathAndEntryToKey: entry must have `timestamp` of Date object.');
    }
    return `entries${path}/${entry.timestamp.getTime()}`;
  }

  getFile(path, entry) {
    return this.getObject(this.pathAndEntryToKey(path, entry));
  }

  putFile(path, entry) {
    if (!entry.contents) {
      return Promise.reject(new Error('AWS putFile(): entry must have `contents`'));
    }
    return this.putObject(this.pathAndEntryToKey(path, entry), entry.contents);
  }

  deleteFiles(paths) {
    // NOTE: paths is enough for deletion because all the file versions
    // under the path will be deleted.
    return this.deleteObjects(paths.map(this.pathToKeyPrefix));
  }

  getManifest() {
    console.log('AWS getManifest()');
    // This manifest file contains entries per mountpoint
    return this.getObject('tombofs.manifest').then((data) => {
      if (data.Body) {
        return JSON.parse(data.Body);
      } else {
        return Promise.reject(new Error('Invalid manifest file'));
      }
    }).catch((err) => {
      // If manifest file doesn't exist, initialize
      if (err.code === 'NoSuchKey') {
        console.log('AWS getManifest(): Initialize manifest');
        return {
          mountpoints: {}
        };
      }

      // rethrow
      return Promise.reject(err);
    });
  }

  putManifest(content) {
    console.groupCollapsed('AWS putManifest()');
    console.log(content);
    console.groupEnd();
    return this.putObject('tombofs.manifest', JSON.stringify(content)).then((data) => {
      return data;
    });
  }
}

module.exports = TomboFSAWSClient;
