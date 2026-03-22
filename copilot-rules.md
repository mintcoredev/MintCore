# Copilot Safety Rules for MintCore

Copilot MUST NOT modify:
- CashTokens logic
- Script generation or validation
- Wallet or key handling
- Accounting or tax logic
- Burn scripts or irreversible operations

Copilot MAY modify:
- UI code
- Documentation
- Tests
- Non-critical utilities

Requirements for all AI-generated code:
- Small, focused changes only
- Include or update tests
- No new dependencies without approval
- No secrets or sensitive data
- Preserve all invariants
