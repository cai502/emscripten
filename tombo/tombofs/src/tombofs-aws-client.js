import 'aws-sdk/dist/aws-sdk';
const AWS = window.AWS;

class TomboFSAWSClient {
  constructor(user_id) {
    this.user_id = user_id;
    this.bucket = 'tombofs.development';
    AWS.config.region = 'us-west-2';
  }

  getCredential() {
    return new Promise((resolve, reject) => {
      // FIXME: This method should be implemented by XHR
    });
  }

  userPathPrefix() {
    return `${this.user_id}/`;
  }

  getObject(key) {
    return new Promise((resolve, reject) => {
      this.s3.getObject({
        Bucket: this.bucket,
        Key: this.userPathPrefix() + key,
      }, (err, data) => {
        if (err) { return reject(err); }
        resolve(data);
      });
    });
  }

  putObject(key, body) {
    return new Promise((resolve, reject) => {
      this.s3.putObject({
        Bucket: this.bucket,
        Key: this.userPathPrefix() + key,
        Body: body
      }, (err) => {
        if (err) { return reject(err); }
        resolve();
      });
    });
  }

  listObjects(prefix) {
    return new Promise((resolve, reject) => {
      let params = {
        Bucket: this.bucket,
        Delimiter: '/',
        Prefix: this.userPathPrefix() + prefix
      };

      let contents = [];

      this.s3.listObjects(params).eachPage((err, data) => {
        if (err) { return reject(err); }
        if (data === null) { return resolve(contents); }
        contents = contents.concat(data.Contents);
      });
    });
  }
}

module.exports = TomboFSAWSClient;
