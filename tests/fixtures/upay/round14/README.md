# Round 14: recorded sample answers (not real upay answers)

Made by hand in the shape we expect, for the three verifiers in `lib/payments/upay/upay_verifiers.ts`.
When upay answers, replace each file with the real answer (keys and card numbers removed) and update
`lib/payments/upay/upay_answer_config.ts` until `npm test -- --only round14` passes.

| File | Shape | What it is |
|---|---|---|
| `status-*.json` | A, status query | LOGIN, then the status answer. paid, paid in USD, declined, cancelled, error code, another cashier id, a low amount |
| `ipn-signed-paid.txt` | B, signed IPN | form body, HMAC-SHA256 over the sorted fields, secret `test-ipn-secret-not-real` |
| `ipn-md5-paid.txt` | B, signed IPN | the same with MD5 over cashierid, totalamount, status and the secret |
| `ipn-plain-paid.txt` | C, IPN from a known IP | form body, no signature |
| `postback-*.txt` | C | upay's answer when we post the IPN back |
| `green-*.json` | Green Invoice | a refused token and a refused document (morning's errorCode and errorMessage) |
