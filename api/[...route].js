let cachedApp = null;

module.exports = async (req, res) => {
  // Vercel Serverless Functions automatically parse the body and attach it to req.body.
  // Express's express.json() middleware doesn't know this and tries to read the stream again,
  // causing the request to hang forever.
  // Setting req._body = true tells Express's body-parser to skip reading the stream.
  if (req.body) {
    req._body = true;
  }

  if (!cachedApp) {
    const { default: app } = await import("../artifacts/api-server/dist/app.mjs");
    cachedApp = app;
  }

  return cachedApp(req, res);
};
