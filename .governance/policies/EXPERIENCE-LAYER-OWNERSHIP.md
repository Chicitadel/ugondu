# [TOKEN:EXPERIENCE_LAYER_OWNERSHIP]

## PURPOSE
To permanently freeze the architectural boundary of the Experience Layer (`portal.airroofers.eu`, `hub.airroofers.eu`).

## IMMUTABLE BOUNDARY LAWS

### Portal Owns:
- Customer journeys
- Presentation
- Workflows
- UI state

### Hub Owns:
- Workspace
- Launchpad
- Dashboards
- Orchestration
- Navigation

### Portal and Hub NEVER Own:
- Repositories (Data access)
- Business rules
- Persistence
- Entitlement logic
- Invoices
- Users
- Organizations
- Products

## DECOMPOSITION PATTERN
The Experience Layer must **never** import classes from Core Platform namespaces (`AirRoofers\Billing\...`, `AirRoofers\Identity\...`).

Instead, the Experience Layer must depend on **Interfaces** (e.g., `BillingGatewayInterface`), which consume canonical **SDKs** provided by the Core Platform, which in turn communicate with the backend via APIs.

## SAFE MIGRATION PATTERN
Never delete business logic during a migration until the replacement is functional.
The mandatory sequence is:
> **Replace → Validate → Switch → Verify → Remove**
