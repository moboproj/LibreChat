const { getAgentOptionsCatalog } = require('../services/agentCatalog');
const { fromException } = require('../utils/httpError');

const getAgentOptions = async (req, res) => {
  try {
    const catalog = await getAgentOptionsCatalog();
    return res.json(catalog);
  } catch (error) {
    return fromException(res, error);
  }
};

module.exports = {
  getAgentOptions,
};
