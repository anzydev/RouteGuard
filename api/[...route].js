const handler = async (req, res) => {
  const { default: app } = await import("../artifacts/api-server/dist/app.mjs");
  return app(req, res);
};

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
