/**
 * Vercel serverless catch-all for /api/* routes.
 *
 * Vercel's runtime pre-parses the request body. By the time Express
 * tries to read the stream via express.json(), the body stream is
 * already consumed and Express hangs forever waiting for data.
 *
 * Fix: we detect if Vercel already parsed the body and, if so, we
 * re-inject it as a readable stream so Express can parse it normally.
 */
const { Readable } = require("stream");

const handler = async (req, res) => {
  // If Vercel already parsed the body, re-create a readable stream
  // so that Express's body-parser middleware can consume it.
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    const bodyStr = JSON.stringify(req.body);
    const readable = new Readable();
    readable.push(bodyStr);
    readable.push(null);

    // Patch the request so Express sees an unparsed stream
    req.headers["content-length"] = Buffer.byteLength(bodyStr).toString();
    req.headers["content-type"] = req.headers["content-type"] || "application/json";

    // Override the internal read methods
    req._read = readable._read.bind(readable);
    req.push = readable.push.bind(readable);

    // Replace req with a proxy that delegates stream reads to our Readable
    const originalReq = req;
    req = Object.assign(readable, {
      method: originalReq.method,
      url: originalReq.url,
      headers: originalReq.headers,
      query: originalReq.query,
      httpVersion: originalReq.httpVersion || "1.1",
      httpVersionMajor: originalReq.httpVersionMajor || 1,
      httpVersionMinor: originalReq.httpVersionMinor || 1,
      connection: originalReq.connection || originalReq.socket || {},
      socket: originalReq.socket || originalReq.connection || {},
    });
  } else if (typeof req.body === "string") {
    const bodyStr = req.body;
    const readable = new Readable();
    readable.push(bodyStr);
    readable.push(null);

    req.headers["content-length"] = Buffer.byteLength(bodyStr).toString();

    const originalReq = req;
    req = Object.assign(readable, {
      method: originalReq.method,
      url: originalReq.url,
      headers: originalReq.headers,
      query: originalReq.query,
      httpVersion: originalReq.httpVersion || "1.1",
      httpVersionMajor: originalReq.httpVersionMajor || 1,
      httpVersionMinor: originalReq.httpVersionMinor || 1,
      connection: originalReq.connection || originalReq.socket || {},
      socket: originalReq.socket || originalReq.connection || {},
    });
  }

  const { default: app } = await import("../artifacts/api-server/dist/app.mjs");
  return app(req, res);
};

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
