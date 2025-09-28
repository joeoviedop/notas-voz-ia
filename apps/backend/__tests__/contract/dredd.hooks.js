// Minimal Dredd hookfile for contract testing
// Adds correlation ID and can be extended to inject auth if needed.

exports.beforeEach = function (transaction, done) {
  transaction.request.headers = transaction.request.headers || {};
  transaction.request.headers['x-correlation-id'] = `dredd-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  done();
};