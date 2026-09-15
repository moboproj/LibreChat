const { getReadDB } = require('../config/db');

function isAgentModelRef(value) {
  const raw = String(value || '').trim();
  return Boolean(raw) && /^agent_/i.test(raw);
}

/**
 * Format endpoint/model for admin tables.
 * Confirmed cases:
 * - agents + name + model -> agent(Name) / gemini…
 * - non-agents -> openAI / gpt-4o
 * - empty model -> … / Sin modelo
 * - agents without resolvable name -> agents / Sin modelo
 */
function formatEndpointModel({ endpoint, model, agent } = {}) {
  const ep = String(endpoint || '').trim();
  const rawModel = String(model || '').trim();
  const isAgentEndpoint =
    ep.toLowerCase() === 'agents' || Boolean(agent) || isAgentModelRef(rawModel);

  const llmFromAgent = agent?.model ? String(agent.model).trim() : '';
  const llmDirect = rawModel && !isAgentModelRef(rawModel) ? rawModel : '';
  const llm = llmFromAgent || llmDirect;

  if (isAgentEndpoint) {
    if (agent?.name) {
      return `agent(${agent.name}) / ${llm || 'Sin modelo'}`;
    }
    return `agents / ${llm || 'Sin modelo'}`;
  }

  const epLabel = ep || 'Sin endpoint';
  return `${epLabel} / ${llm || 'Sin modelo'}`;
}

function readableEndpointLabel(endpoint) {
  const raw = String(endpoint || '').trim();
  if (!raw) return 'Sin endpoint';
  if (raw.toLowerCase() === 'agents') return 'Agentes';
  if (raw.toLowerCase() === 'unknown') return 'Sin endpoint';
  return raw;
}

async function loadAgentsByRefs(refs = []) {
  const unique = [...new Set(refs.map((ref) => String(ref || '').trim()).filter(Boolean))];
  if (!unique.length) return new Map();

  const docs = await getReadDB()
    .collection('agents')
    .find({ id: { $in: unique } })
    .project({ id: 1, name: 1, model: 1, provider: 1 })
    .toArray();

  const map = new Map();
  for (const doc of docs) {
    if (doc.id) map.set(String(doc.id), doc);
    if (doc._id) map.set(String(doc._id), doc);
  }
  return map;
}

function agentRefFromConversation(doc = {}) {
  if (doc.agent_id) return String(doc.agent_id);
  if (isAgentModelRef(doc.model)) return String(doc.model);
  return '';
}

/**
 * Label for stats donut: "AgentName / llm" | llm | "Sin modelo"
 */
function formatModelResponseLabel({ model, agent } = {}) {
  const rawModel = String(model || '').trim();
  if (!rawModel && !agent) return 'Sin modelo';

  const llmFromAgent = agent?.model ? String(agent.model).trim() : '';
  const llmDirect = rawModel && !isAgentModelRef(rawModel) ? rawModel : '';
  const llm = llmFromAgent || llmDirect;

  if (agent?.name) {
    return `${agent.name} / ${llm || 'Sin modelo'}`;
  }
  if (isAgentModelRef(rawModel)) {
    return 'Sin modelo';
  }
  return llm || 'Sin modelo';
}

async function resolveMessagesByModelRows(rows = []) {
  const refs = rows.map((row) => row?._id).filter((id) => isAgentModelRef(id));
  const agents = await loadAgentsByRefs(refs);

  const merged = new Map();
  for (const row of rows) {
    const agent = agents.get(String(row?._id || ''));
    const label = formatModelResponseLabel({ model: row?._id, agent });
    const prev = merged.get(label) || 0;
    merged.set(label, prev + Number(row?.count || 0));
  }

  return [...merged.entries()]
    .map(([label, count]) => ({ _id: label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function resolveMessagesByEndpointRows(rows = []) {
  const merged = new Map();
  for (const row of rows) {
    const label = readableEndpointLabel(row?._id);
    const prev = merged.get(label) || 0;
    merged.set(label, prev + Number(row?.count || 0));
  }
  return [...merged.entries()]
    .map(([label, count]) => ({ _id: label, count }))
    .sort((a, b) => b.count - a.count);
}

async function attachEndpointModelLabels(documents = []) {
  if (!documents.length) return documents;
  const refs = documents.map((doc) => agentRefFromConversation(doc)).filter(Boolean);
  const agents = await loadAgentsByRefs(refs);
  return documents.map((doc) => {
    const ref = agentRefFromConversation(doc);
    const agent = ref ? agents.get(ref) : null;
    return {
      ...doc,
      endpointModelLabel: formatEndpointModel({
        endpoint: doc.endpoint,
        model: doc.model,
        agent,
      }),
      agentName: agent?.name || null,
      agentModel: agent?.model || null,
    };
  });
}

module.exports = {
  isAgentModelRef,
  formatEndpointModel,
  readableEndpointLabel,
  loadAgentsByRefs,
  agentRefFromConversation,
  formatModelResponseLabel,
  resolveMessagesByModelRows,
  resolveMessagesByEndpointRows,
  attachEndpointModelLabels,
};
