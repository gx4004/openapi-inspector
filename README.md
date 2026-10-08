# OpenAPI Inspector

An open-source, read-only MCP plugin for focused OpenAPI JSON inspection and API change review. Version 0.1.0 is a local prototype, not yet published to OpenAI or deployed publicly.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
npm test
npm start
```

Endpoint: `http://127.0.0.1:8787/mcp`. Health check: `/health`.
For container deployment set `HOST=0.0.0.0`; set `PORT` to the hosting platform's assigned port. Deploy behind HTTPS with request rate limits. No OpenAI API key is needed: the MCP server performs deterministic checks, while the host handles conversation.

## Try it without ChatGPT

```sh
node src/cli.js inspect examples/pets.json
node src/cli.js compare examples/pets.json examples/pets-v2.json
```

The second example reports that the new version requires a tenant header. Existing clients that omit it may fail. This demonstrates one supported check, not a complete compatibility assessment. The offline CLI requires no hosting account.

## Tools

- `inspect_openapi(spec_json)`: checks missing/duplicate operation IDs, missing documentation/responses, inline path parameters and unresolved local references.
- `compare_openapi(before_json, after_json)`: flags removed operations/responses and newly required inline parameters/request bodies.

Documents must be OpenAPI 3.0.x or 3.1.x JSON under 250 KB. Results are capped at 100 findings and include total counts. YAML, remote fetching, full validation, reference expansion, schema diffs, authentication changes and complete compatibility analysis are out of scope. No findings does not mean an API is valid, secure or compatible.

## ChatGPT testing

After deploying a stable public HTTPS endpoint, add a custom MCP server in ChatGPT Plugins, use the `/mcp` URL and no authentication, install it, and invoke it in a chat. Test the prompts in SUBMISSION.md before public submission.

## Data handling

The application does not save specifications, log request bodies or call URLs described in them. Documents pass through ChatGPT and the server hosting provider; their respective data policies also apply. Configure infrastructure logging and retention before making any public privacy commitments. Do not submit secrets or sensitive specifications to a public endpoint.

## Release status

Local code and tests are provided. GitHub publication, hosting, verified publisher identity, public policy/support URLs, real ChatGPT testing, listing assets and portal review remain outstanding. See SUBMISSION.md. The plugin configuration is a template and must receive the real deployment URL before use.

Licensed under MIT. See LICENSE.
