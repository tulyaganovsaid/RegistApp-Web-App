# security_spec.md

## Data Invariants
1. A user profile must have a valid structure and email. Roles must be restricted to standard categories: `Client`, `Operator`, or `Admin`. Users cannot change their own roles once registered.
2. Orders belong to a client identified by `clientEmail`. No user should be able to alter an order's `createdAt` or change payment status to "Completed" without a valid operator or admin signature.
3. System configurations can only be updated by verified admins.
4. Audit logs are write-only by signed-in users. No deletions or updates are ever permitted.

## The "Dirty Dozen" Payloads (Exploit Scenarios)
1. **Self-Promotion Exploit**: User tries to create or update their own user profile setting `role: "Admin"`.
2. **Identity Theft Exploit**: User tries to write an order with a `clientEmail` that doesn't match their authenticated email.
3. **Immortality Bypass**: User tries to change `createdAt` of an active order after creation.
4. **State Escalation**: Client tries to transition status fields of an order directly from `Payment Pending` to `Completed` without operator action.
5. **PII Blanket Read**: Authenticated user attempts to list and scrape all tourist passports and private emails.
6. **Config Hijacking**: Average client tries to post to the `system_config` collection to modify payment card details.
7. **History Eraser**: User tries to delete audit logs to hide previous fraudulent actions.
8. **Malicious Lock Override**: User tries to modify an order whose status is already in terminal state "Completed" or "Rejected due to violations".
9. **Log Forgery**: Unauthenticated caller drafts a fake check-in audit log in the system.
10. **Denial of Wallet String Injection**: Attacker injects a 5MB payload into the ID or fields of a database collection.
11. **Orphaned Registration Write**: Creating an order without checking that the referenced user profile exists.
12. **Status Lock Interception**: Operator sets system configuration parameters without an executive admin group membership.

## Test Runner Definition
We have draft tests to verify rules deny illegal access. Testing is mock-validated using the security emulator or mock requests.
