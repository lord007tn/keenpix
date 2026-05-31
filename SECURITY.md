# Security Policy

## Supported Versions

Keenpix ships from `master`. Security fixes are applied to `master` and released in the next tagged version.

| Version | Supported |
| ------- | --------- |
| `master` | yes |
| Older tags | no |

## Reporting a Vulnerability

Please do not open a public issue for security problems.

Use GitHub private vulnerability reporting for this repository, or contact the maintainer through the repository owner's GitHub profile.

Include:

- A description of the issue and impact.
- Steps to reproduce or a minimal proof of concept.
- Affected commit SHA, tag, Docker image digest, or deploy URL if relevant.
- Your suggested fix or mitigation, if you have one.

You should receive an acknowledgement within 3 business days. We will coordinate a fix and disclosure timeline based on severity.

## Scope

In scope:

- `/api/keenpix` transform requests.
- Origin fetching, SSRF protections, DNS rebinding protections, cache keys, and response headers.
- Authentication and session handling.
- Docker/self-host configuration defaults.

Out of scope:

- Findings requiring access to a maintainer machine.
- Social engineering.
- Upstream dependency vulnerabilities that have not been triaged against Keenpix.
- Volumetric denial of service against a self-hosted instance you do not operate.
