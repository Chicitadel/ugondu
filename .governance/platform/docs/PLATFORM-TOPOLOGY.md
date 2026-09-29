# PLATFORM TOPOLOGY

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

## The Acyclic Platform Hierarchy
The Air Roofers ecosystem strictly enforces the following hierarchy to prevent circular dependencies and tangled microservices. 

```text
                     Products
                          │
            ┌─────────────┼─────────────┐
            │             │             │
      Dashboard      Portal       Developer APIs
            │             │             │
            └─────────────┼─────────────┘
                          │
                Platform Composition Layer
                          │
                Platform Integration Layer
                          │
      ┌──────────┬─────────┼──────────┬───────────┐
      │          │         │          │           │
 Identity   Licensing  Billing  Telemetry  Workflow
      │          │         │          │           │
      └──────────┴─────────┼──────────┴───────────┘
                           │
                    Event Bus / Message Broker
                           │
                     Infrastructure Layer
```

**Rule:** Dependencies may only flow DOWNWARDS. Products must never communicate with each other directly; they communicate through the Integration Layer and the Event Bus.
