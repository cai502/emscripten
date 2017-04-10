import 'aws-sdk/dist/aws-sdk';
const AWS = window.AWS;

class TomboFSAWSClient {
  constructor(userId, appId) {
    this.userId = userId;
    this.appId = appId;
    this.bucket = 'tombofs.development';
    this.region = 'us-west-2';
    this.endpoint = 's3-us-west-2.amazonaws.com';
  }

  getClient() {
    // FIXME: This method should be implemented by XHR
    return new Promise((resolve, reject) => { resolve(null); });
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
          Key: actualKey
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
