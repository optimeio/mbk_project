# Shared Layer

Use this directory for cross-domain reusable code only.

Suggested structure:
- `ui/` generic reusable UI primitives
- `hooks/` generic hooks with no domain coupling
- `lib/` shared clients and platform adapters
- `utils/` pure helpers used by multiple domains
- `config/` app-wide static config
- `types/` shared typedefs/contracts

Rule:
- Do not place domain/business logic here.
- Domain logic belongs in `src/modules/<domain>`.

