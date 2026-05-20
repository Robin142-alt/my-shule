# SMS Campaign Failure

Use this when fee reminders, parent notifications, or support incident messages fail delivery.

1. Check `sms.delivery.failure_rate`, provider latency, and campaign queue dead letters.
2. Verify provider credentials, webhook health, sender id, and tenant SMS wallet balance.
3. Stop duplicate campaign retries until idempotency keys and delivery receipts are checked.
4. Communicate through support status if many parents are affected.
5. Resume campaigns in bounded batches and monitor failed/queued counts.
6. Attach provider response summaries without raw parent phone numbers.
