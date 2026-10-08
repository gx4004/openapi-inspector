const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);

export function parseSpec(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 250000) throw new Error('Supply JSON smaller than 250 KB.');
  let spec;
  try { spec = JSON.parse(text); } catch { throw new Error('Invalid JSON. Convert YAML to JSON before using this tool.'); }
  if (!object(spec) || !/^3\.(0|1)\.\d+$/.test(spec.openapi || '')) throw new Error('Only OpenAPI 3.0.x and 3.1.x JSON documents are supported.');
  if (!object(spec.paths)) throw new Error('The paths field must be an object.');
  return spec;
}

function operations(spec) {
  const result = new Map();
  for (const [path, item] of Object.entries(spec.paths)) {
    if (!object(item)) continue;
    for (const [method, op] of Object.entries(item)) {
      if (methods.has(method) && object(op)) result.set(`${method.toUpperCase()} ${path}`, { path, item, op });
    }
  }
  return result;
}

export function inspectSpec(text) {
  const spec = parseSpec(text);
  const findings = [];
  const add = (severity, code, location, message) => findings.push({ severity, code, location, message });
  if (!object(spec.info) || !spec.info.title || !spec.info.version) add('error', 'missing_info', '/info', 'Provide info.title and info.version.');
  const ids = new Set();
  const ops = operations(spec);
  for (const [name, { path, item, op }] of ops) {
    if (!op.operationId) add('warning', 'missing_operation_id', name, 'Add a stable operationId for generated clients.');
    else if (ids.has(op.operationId)) add('error', 'duplicate_operation_id', name, 'Operation IDs must be unique.');
    else ids.add(op.operationId);
    if (!op.summary && !op.description) add('warning', 'missing_description', name, 'Explain what this operation does.');
    if (!object(op.responses) || !Object.keys(op.responses).length) add('error', 'missing_responses', name, 'Document at least one response.');
    const params = [...(Array.isArray(item.parameters) ? item.parameters : []), ...(Array.isArray(op.parameters) ? op.parameters : [])];
    for (const match of path.matchAll(/\{([^}]+)\}/g)) {
      const p = [...params].reverse().find(p => object(p) && p.in === 'path' && p.name === match[1]);
      if (!p) add('warning', 'undocumented_path_parameter', name, `Document path parameter ${match[1]}; referenced parameters are not resolved by this check.`);
      else if (p.required !== true) add('error', 'optional_path_parameter', name, `Path parameter ${match[1]} must be required.`);
    }
  }
  // Iterative traversal avoids recursion overflow on deeply nested documents.
  const stack = [[spec, '']];
  let externalReferences = 0;
  while (stack.length) {
    const [value, location] = stack.pop();
    if (!object(value) && !Array.isArray(value)) continue;
    if (typeof value.$ref === 'string') {
      if (!value.$ref.startsWith('#/')) externalReferences++;
      else {
        let target = spec;
        for (const key of value.$ref.slice(2).split('/').map(k => k.replaceAll('~1', '/').replaceAll('~0', '~'))) {
          target = object(target) || Array.isArray(target) ? (Object.hasOwn(target, key) ? target[key] : undefined) : undefined;
        }
        if (target === undefined) add('error', 'unresolved_local_reference', location, 'Local reference does not resolve.');
      }
    }
    for (const [key, child] of Object.entries(value)) stack.push([child, `${location}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`]);
  }
  return { operationCount: ops.size, findings: findings.slice(0, 100), totalFindings: findings.length, externalReferences,
    limitations: ['Focused lint checks, not complete OpenAPI validation.', 'External references are not fetched; referenced path items and parameters are not expanded.', 'No security audit or guarantee of runtime compatibility.'] };
}

export function compareSpecs(beforeText, afterText) {
  const before = operations(parseSpec(beforeText));
  const after = operations(parseSpec(afterText));
  const changes = [];
  for (const [name, old] of before) {
    const next = after.get(name);
    if (!next) { changes.push({ operation: name, code: 'removed_operation', message: 'Previously documented operation was removed.' }); continue; }
    const parameters = ({ item, op }) => {
      const map = new Map();
      for (const p of [...(Array.isArray(item.parameters) ? item.parameters : []), ...(Array.isArray(op.parameters) ? op.parameters : [])]) {
        if (object(p) && p.name && p.in) map.set(`${p.in}:${p.name}`, p);
      }
      return map;
    };
    const previous = parameters(old);
    for (const [key, p] of parameters(next)) {
      if (p.required === true && previous.get(key)?.required !== true) changes.push({ operation: name, code: 'new_required_parameter', message: `Parameter ${key} is newly required.` });
    }
    if (next.op.requestBody?.required === true && old.op.requestBody?.required !== true) changes.push({ operation: name, code: 'new_required_body', message: 'Request body is newly required.' });
    for (const code of Object.keys(object(old.op.responses) ? old.op.responses : {})) {
      if (!Object.hasOwn(next.op.responses || {}, code)) changes.push({ operation: name, code: 'removed_response', message: `Documented response ${code} was removed; review client impact.` });
    }
  }
  return { changes: changes.slice(0, 100), totalChanges: changes.length,
    limitations: ['Checks only removed operations/responses and newly required inline parameters/request bodies.', 'Does not compare schemas, authentication, media types, or resolve references. No findings does not establish compatibility.'] };
}
