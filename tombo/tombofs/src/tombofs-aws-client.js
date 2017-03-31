import 'aws-sdk/dist/aws-sdk';
const AWS = window.AWS;

class TomboFSAWSClient {
  constructor(userId, appId) {
    this.userId = userId;
    this.appId = appId;
    this.bucket = 'tombofs.development';
    AWS.config.region = 'us-west-2';
  }

  getClient() {
    // FIXME: This method should be implemented by XHR
    return new Promise((resolve, reject) => { resolve(null); });
  }

  userPathPrefix() {
    return `${this.userId}/`;
  }

  appPathPrefix() {
    return `${this.userPathPrefix()}${this.appId}/`;
  }

  getObject(key) {
    return this.getClient((client) => {
      client.getObject({
        Bucket: this.bucket,
        Key: this.appPathPrefix() + key,
      }, (err, data) => {
        if (err) { return reject(err); }
        resolve(data);
      });
    });
  }

  putObject(key, body) {
    return this.getClient((client) => {
      client.putObject({
        Bucket: this.bucket,
        Key: this.appPathPrefix() + key,
        Body: body
      }, (err, data) => {
        if (err) { return reject(err); }
        resolve(data);
      });
    });
  }

  deleteObject(key) {
    return this.getClient((client) => {
      client.deleteObject({
        Bucket: this.bucket,
        Key: this.appPathPrefix() + key
        // TODO: Support VersionId
      }, (err, data) => {
        if (err) { return reject(err); }
        resolve(data);
      });
    });
  }

  deleteObjects(keys) {
    return this.getClient((client) => {
      const objects = keys.map((key) => {
        return {
          Key: this.appPathPrefix() + key
          // TODO: Support VersionId
        };
      });
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
  }

  listObjects(prefix) {
    return this.getClient((client) => {
      let params = {
        Bucket: this.bucket,
        Delimiter: '/',
        Prefix: this.appPathPrefix() + prefix
      };

      let contents = [];

      client.listObjects(params).eachPage((err, data) => {
        if (err) { return reject(err); }
        if (data === null) { return resolve(contents); }
        contents = contents.concat(data.Contents);
      });
    });
  }

  pathToKey(path) {
    return `entries${path}`;
  }

  getFile(path) {
    return this.getObject(this.pathToKey(path));
  }

  putFile(path, content) {
    return this.putObject(this.pathToKey(path), content);
  }

  deleteFiles(paths) {
    return this.deleteObjects(paths.map(this.pathToKey));
  }

  getManifest() {
    // This manifest file contains entries per mountpoint
    return this.getObject('tombofs.manifest').then((data) => {
      if (data.Body) {
        return JSON.parse(data.Body);
      } else {
        return {
          mountpoints: {}
        };
      }
    }).catch((err) => {
      // FIXME: handle 404
      console.log(err);
    });
  }

  putManifest(content) {
    return this.putObject('tombofs.manifest', JSON.stringify(content)).then((data) => {
      return data;
    });
  }
}

module.exports = TomboFSAWSClient;
