// model for error handling

// based on built in error but we can tweak it to look and work the way we want.
class HttpError extends Error {
  constructor(message, errorCode) {
    super(message); // add a 'message' property
    this.code = errorCode; // add a 'code' property
  }
}

module.exports = HttpError;
