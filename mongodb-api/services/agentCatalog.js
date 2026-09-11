const { getReadDB } = require('../config/db');

const MCP_DELIMITER = '_mcp_';
const MCP_SERVER_MARKER = 'sys__server__sys';

const DEFAULT_PROVIDERS = [
  'openAI',
  'anthropic',
  'google',
  'azureOpenAI',
  'bedrock',
  'groq',
  'mistral',
  'ollama',
  'custom',
];

const DEFAULT_MODELS = {
  openAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o3-mini', 'o4-mini'],
  anthropic: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  google: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  azureOpenAI: ['gpt-4o', 'gpt-4o-mini'],
  bedrock: ['anthropic.claude-3-5-sonnet-20241022-v2:0'],
  groq: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768'],
  mistral: ['mistral-large-latest', 'mistral-small-latest'],
  ollama: ['llama3.2', 'mistral'],
  custom: [],
};

const BUILTIN_TOOLS = [
  { id: 'execute_code', label: 'Code Interpreter', kind: 'builtin' },
  { id: 'file_search', label: 'File Search', kind: 'builtin' },
  { id: 'web_search', label: 'Web Search', kind: 'builtin' },
  { id: 'artifacts', label: 'Artifacts', kind: 'builtin' },
  { id: 'memory', label: 'Memory', kind: 'builtin' },
];

function mcpServerToken(serverName) {
  return `${MCP_SERVER_MARKER}${MCP_DELIMITER}${serverName}`;
}

function extractMcpServerNamesFromTools(tools = []) {
  const names = new Set();
  for (const tool of tools) {
    const key = String(tool);
    const idx = key.lastIndexOf(MCP_DELIMITER);
    if (idx === -1) continue;
    const serverName = key.slice(idx + MCP_DELIMITER.length);
    if (serverName) names.add(serverName);
  }
  return [...names];
}

function extractToolsFromMcpDoc(doc) {
  const tools = [];
  const seen = new Set();
  const serverName = doc.serverName;

  const push = (id, label) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    tools.push({ id, label: label || id, kind: 'mcp', serverName });
  };

  // LibreChat server attachment token
  push(mcpServerToken(serverName), `${serverName} (servidor)`);

  const toolFunctions = doc.config?.toolFunctions || {};
  for (const key of Object.keys(toolFunctions)) {
    push(key, key);
  }

  const capsTools = doc.config?.capabilities?.tools || {};
  for (const key of Object.keys(capsTools)) {
    // capabilities may store bare names; prefer embedding with delimiter if missing
    if (key.includes(MCP_DELIMITER)) {
      push(key, key);
    } else {
      push(`${key}${MCP_DELIMITER}${serverName}`, key);
    }
  }

  return tools;
}

async function getDistinctProvidersAndModels() {
  const agents = getReadDB().collection('agents');
  const [providersAgg, modelsAgg] = await Promise.all([
    agents.distinct('provider'),
    agents
      .aggregate([
        { $match: { provider: { $type: 'string' }, model: { $type: 'string' } } },
        { $group: { _id: '$provider', models: { $addToSet: '$model' } } },
      ])
      .toArray(),
  ]);

  const modelsByProvider = { ...DEFAULT_MODELS };
  for (const row of modelsAgg) {
    const provider = row._id;
    if (!provider) continue;
    const existing = new Set(modelsByProvider[provider] || []);
    for (const model of row.models || []) {
      if (model) existing.add(model);
    }
    modelsByProvider[provider] = [...existing].sort();
  }

  const providers = [...new Set([...DEFAULT_PROVIDERS, ...providersAgg.filter(Boolean)])].sort(
    (a, b) => a.localeCompare(b),
  );

  return { providers, modelsByProvider };
}

async function getMcpCatalog() {
  const docs = await getReadDB()
    .collection('mcpservers')
    .find({})
    .project({ serverName: 1, config: 1 })
    .sort({ serverName: 1 })
    .toArray();

  return docs
    .filter((doc) => doc.serverName)
    .map((doc) => ({
      serverName: doc.serverName,
      title: doc.config?.title || doc.serverName,
      description: doc.config?.description || '',
      tools: extractToolsFromMcpDoc(doc),
    }));
}

async function getAgentOptionsCatalog() {
  const [{ providers, modelsByProvider }, mcpServers] = await Promise.all([
    getDistinctProvidersAndModels(),
    getMcpCatalog(),
  ]);

  return {
    providers,
    modelsByProvider,
    builtinTools: BUILTIN_TOOLS,
    mcpServers,
    meta: {
      mcpDelimiter: MCP_DELIMITER,
      mcpServerMarker: MCP_SERVER_MARKER,
    },
  };
}

module.exports = {
  MCP_DELIMITER,
  MCP_SERVER_MARKER,
  BUILTIN_TOOLS,
  mcpServerToken,
  extractMcpServerNamesFromTools,
  getAgentOptionsCatalog,
};
