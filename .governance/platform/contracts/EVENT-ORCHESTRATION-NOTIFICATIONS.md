# ORCHESTRATION EVENT CONTRACT: NOTIFICATIONS

**Governance Status:** FROZEN
**Version:** 1.0.0

This document defines the strict lifecycle events emitted by the Notification Router within `operations.airroofers.eu`. All events MUST adhere to the CloudEvent envelope standard.

## 1. NotificationQueued
Emitted when a notification request is received and a Delivery Plan has been formulated.
- **Type**: `AirRoofers.Orchestration.NotificationQueued`
- **Payload**:
  - `delivery_plan_id`: string
  - `recipient_id`: string
  - `channels`: array of strings

## 2. NotificationSent
Emitted when the Notification Router has successfully handed the payload to a Provider (e.g., SMS, Email) for delivery.
- **Type**: `AirRoofers.Orchestration.NotificationSent`
- **Payload**:
  - `delivery_plan_id`: string
  - `provider_id`: string
  - `channel`: string
  - `sent_at`: ISO8601 Timestamp

## 3. NotificationDelivered
Emitted when the Provider asynchronously confirms delivery to the recipient's device/inbox.
- **Type**: `AirRoofers.Orchestration.NotificationDelivered`
- **Payload**:
  - `delivery_plan_id`: string
  - `provider_receipt_id`: string
  - `delivered_at`: ISO8601 Timestamp

## 4. NotificationFailed
Emitted when a notification fails to send or fails to deliver (e.g., bounce, provider outage).
- **Type**: `AirRoofers.Orchestration.NotificationFailed`
- **Payload**:
  - `delivery_plan_id`: string
  - `reason`: string
  - `failed_at`: ISO8601 Timestamp
