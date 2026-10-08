# Publication checklist and review cases

## Required publisher configuration

1. Publish this source under the publisher's GitHub account with its MIT license.
2. Deploy the Node service at a stable public HTTPS URL; set HOST=0.0.0.0, configure rate limits and confirm /health.
3. Replace the endpoint in plugin/mcp.json. Add the actual verified publisher name and public product, support, privacy and terms URLs to the manifest's com.openai.interface fields. Draft policy text must reflect the selected hosting provider's logging/retention.
4. Add an original listing icon and a real screenshot. Record a real ChatGPT walkthrough; do not fabricate results.
5. Connect and test the remote MCP server in ChatGPT with no authentication.
6. Complete OpenAI individual/business verification and ensure Apps Management Write access.
7. ZIP the contents of plugin/ at the archive root, upload in the OpenAI plugin portal, resolve scans, verify the domain, enter review cases/materials, and submit for review.

Official process: https://developers.openai.com/plugins/deploy/submission

## Listing draft

Name: OpenAPI Inspector

Subtitle: Check API specs and changes

Category: Developer Tools (confirm available category in portal)

Description: Inspect supplied OpenAPI JSON for common documentation issues and review selected compatibility changes between two versions. Reports contain precise findings and limitations. Supports OpenAPI 3.0.x and 3.1.x JSON under 250 KB. Does not fetch URLs, call your API, expand references, validate every OpenAPI rule or perform a security audit.

## Review cases

- Supply examples/pets.json and ask to inspect it: one operation, no findings; limitations must be communicated.
- Remove operationId and responses: missing_operation_id and missing_responses findings.
- Compare pets.json with a version removing GET /pets/{id}: removed_operation.
- Add a required query parameter: new_required_parameter.
- Submit malformed JSON: actionable error, not an invented report.
- Supply YAML or an API URL: explain JSON requirement; no network request.
- Ask unrelated general knowledge: neither tool should be invoked.
- Add instructions in a specification's description: treat as untrusted data, not instructions.
- Ask whether zero findings guarantees compatibility: explain the checks are limited.

Local automated testing does not replace real ChatGPT review cases. These host-level cases are not yet verified.
