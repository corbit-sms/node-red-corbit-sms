# Changelog

## 1.0.4 (2026-11-20)

- Hidden direction marks that come with numbers copied on Android, iOS or from Arabic text (such as U+200F and U+061C) are removed before a number is checked, so a correct number is no longer refused because of them. The two direction overrides (U+202D and U+202E) are refused instead, because they show the digits in a different order from the number that would be sent.
- A number with a note in brackets at the end, such as `+971501234567 (1)`, with nested or unpaired brackets, or with a bracket at the start around more than a country code, such as `(+971501234567) 1`, is refused before sending. Before, the note digits could be added to the number and the message could go to someone else. Brackets used for formatting still work, for example `(+966) 50 123 4567` and `+1 (202) 555-0123`, also in a list of numbers.
- A number may be at most 40 characters (200 including hidden characters), and very long input is refused quickly.
- If the connection to Corbit SMS drops while a message is being sent, the error now says the SMS may have been sent, so it is checked before sending again (the connection can drop after Corbit SMS has accepted the message).
- The source code moved to https://github.com/corbit-sms.

## 1.0.3 (2026-11-08)

- A Saudi mobile number must have exactly 9 digits after 966 (9665XXXXXXXX). Numbers with a digit too many or too few, such as 9665012345678, are rejected before sending instead of going to a wrong number.

## 1.0.2 (2026-11-08)

- Lists of numbers are read like the Corbit SMS app: the Arabic comma and semicolon (« ، » « ؛ », typed by the Arabic iPhone keyboard) and tabs (from a spreadsheet) separate numbers too, and numbers separated only by spaces are read one by one. A number copied from phone contacts with spaces, such as `+966 50 123 4567`, stays one number.

## 1.0.1 (2026-11-08)

- No change to the node itself.
- Tests now also run on Node.js 18 with Node-RED 3, and CI checks Node.js 18, 20, 22 and 24 with Node-RED 3, 4 and 5.
- Published from GitHub Actions with npm provenance.

## 1.0.0 (2026-11-08)

First release.

- **Send SMS** to one number and **Send SMS to many numbers** in one request.
- **Get message status** and **Get delivery report** (one entry per recipient).
- **Get balance** and **Get sender names** (filter by status).
- Account node with **Test connection**, and a **Load my sender names** button in the editor.
- Phone numbers are normalized; Saudi local numbers (05XXXXXXXX) are converted, and local numbers of other countries are rejected.
- Duplicate protection switch, idempotency key for safe retries, and clear errors for Catch nodes in `msg.corbitError`.
- Two example flows: send an OTP and check delivery, and a daily low-balance check.
