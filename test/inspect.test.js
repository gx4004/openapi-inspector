import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectSpec, compareSpecs } from '../src/inspect.js';
import { createHttpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const base = () => ({ openapi: '3.1.0', info: { title: 'Example', version: '1' }, paths: {
  '/pets/{id}': { get: { operationId: 'getPet', summary: 'Get a pet', parameters: [{ in: 'path', name: 'id', required: true }], responses: { '200': { description: 'OK' } } } },
} });
test('clean inline specification has no findings', () => assert.equal(inspectSpec(JSON.stringify(base())).totalFindings, 0));
test('detects duplicates, missing responses and optional path parameters', () => {
  const doc = base();
  doc.paths['/pets/{id}'].get.parameters[0].required = false;
  doc.paths['/other'] = { get: { operationId: 'getPet' } };
  const codes = inspectSpec(JSON.stringify(doc)).findings.map(f => f.code);
  for (const code of ['duplicate_operation_id', 'missing_responses', 'optional_path_parameter']) assert.ok(codes.includes(code));
});
test('resolves escaped reference pointers and rejects missing references', () => {
  const doc = base(); doc.components = { schemas: { 'A/B': { type: 'string' } } };
  doc.refs = [{ $ref: '#/components/schemas/A~1B' }, { $ref: '#/components/schemas/Missing' }];
  assert.equal(inspectSpec(JSON.stringify(doc)).findings.filter(f => f.code === 'unresolved_local_reference').length, 1);
});
test('rejects malformed, unsupported and oversized input', () => {
  for (const text of ['{', '{}', 'x'.repeat(250001)]) assert.throws(() => inspectSpec(text));
});
test('diff detects removed operation and newly required inputs', () => {
  const old = base(), next = base();
  next.paths['/pets/{id}'].get.parameters.push({ name: 'tenant', in: 'header', required: true });
  next.paths['/pets/{id}'].get.requestBody = { required: true };
  delete next.paths['/pets/{id}'].get.responses['200'];
  const codes = compareSpecs(JSON.stringify(old), JSON.stringify(next)).changes.map(c => c.code);
  assert.deepEqual(codes, ['new_required_parameter', 'new_required_body', 'removed_response']);
  next.paths = {};
  assert.equal(compareSpecs(JSON.stringify(old), JSON.stringify(next)).changes[0].code, 'removed_operation');
});
test('operation parameter overrides path parameter', () => {
  const old = base(), next = base();
  old.paths['/pets/{id}'].parameters = [{ in: 'query', name: 'q', required: false }];
  next.paths['/pets/{id}'].parameters = [{ in: 'query', name: 'q', required: true }];
  next.paths['/pets/{id}'].get.parameters.push({ in: 'query', name: 'q', required: false });
  assert.equal(compareSpecs(JSON.stringify(old), JSON.stringify(next)).totalChanges, 0);
});
test('real MCP client discovers and invokes both tools over HTTP', async () => {
  const http = createHttpServer();
  await new Promise(resolve => http.listen(0, '127.0.0.1', resolve));
  const client = new Client({ name: 'test-client', version: '1.0.0' });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${http.address().port}/mcp`)));
    assert.equal((await client.listTools()).tools.length, 2);
    const report = await client.callTool({ name: 'inspect_openapi', arguments: { spec_json: JSON.stringify(base()) } });
    assert.equal(report.structuredContent.totalFindings, 0);
    const diff = await client.callTool({ name: 'compare_openapi', arguments: { before_json: JSON.stringify(base()), after_json: JSON.stringify(base()) } });
    assert.equal(diff.structuredContent.totalChanges, 0);
    const invalid = await client.callTool({ name: 'inspect_openapi', arguments: { spec_json: '{' } });
    assert.equal(invalid.isError, true);
  } finally { await client.close(); await new Promise(resolve => http.close(resolve)); }
});
