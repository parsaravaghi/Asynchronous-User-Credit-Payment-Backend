# Asynchronous User Credit Payment Backend

## Overview

Design and implement a backend service to manage user credit balances and allow users to submit payment requests, which are processed asynchronously.

## Functional Requirements

### 1. User Credit Balance Management

* Per-user balance must be maintained (table: users or accounts).
* Provide a way to seed/default balances or an API to credit/recharge user accounts.

### 2. Payment Request Submission

* Provide an API to submit a payment request with:

  * `userId`
  * `amount`
  * `reference` (e.g., invoice number)
  * `description`

* On submission:

  * Store a payment request record with initial status (`PENDING` or `QUEUED`).
  * Place the request into a processing queue for background (async) processing.

### 3. Asynchronous Payment Processing Worker

* Background worker picks requests from the queue.
* Processing logic includes:

  * Check if the user’s balance is sufficient.
  * If sufficient: deduct atomically and mark as `SUCCEEDED`.
  * If not: mark as `FAILED` with reason.
* Simulate failures via:

  * Higher amount → higher chance of failure.
  * Specific reference patterns → always fail (for testing).
* Concurrency safety: Prevent race conditions/double deduction.

### 4. Payment Status Management

Track and update payment request status:

* `PENDING`
* `QUEUED`
* `PROCESSING`
* `SUCCEEDED`
* `FAILED`
* Optional: `CANCELLED`

### 5. Transaction Records

For each successful payment (debit):

* Record amount, user, payment request ID, timestamp, reference, and transaction type (`DEBIT`).
* Table: `transactions`.

### 6. Event History

Log significant state changes/events per payment:

* Created
* Queued
* Processing Started
* Succeeded
* Failed
* Retry Triggered

Table: `payment_events`.

### 7. Retry Mechanism

* Allow retry for system/technical failures only (not business logic like insufficient funds).
* Record retry attempts in event history.
* Ensure idempotency and atomicity: no double deduction even if requests are retried.
* Define retry policy (max attempts, backoff, etc.).

### 8. Minimal Admin Panel

Reports features:

* Aggregate credits/debits per period (daily, monthly, yearly).
* List of users and their balances.
* User account details and transactions.
* Report on balance usage per user.

## Technical Notes

### Stack

* NestJS
* Redis
* PostgreSQL
* Prisma
* RabbitMQ

### Database Design

PostgreSQL, suggested tables:

* `users`: User info and aggregate balance.
* `payment_requests`: Payment request records (amount, status, reference, user, etc.).
* `transactions`: Records of actual debits (plus optional credits).
* `payment_events`: History of events/state changes for each payment.

### Processing and Concurrency

* Use an async job queue (e.g. RabbitMQ).
* Ensure atomic balance deduction (use SQL `UPDATE ... WHERE` with pre-check or DB transaction).
* Implement unique request key / idempotency key for payment requests.

### Retry Policy

* Only allow retries for errors classified as technical (e.g., transient DB error, queue failure).
* Business errors (like insufficient balance) do not allow retry unless balance changes.

### Simulation of Failures

For testing:

* Set failure probability based on amount.
* Special treatment for references containing e.g. `"FAIL"` to force error.

## Estimated Timeline

* 4–5 days maximum for the MVP implementation.
