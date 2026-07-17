# Deferred Work

## Deferred from: code review of 7-3-google-smtp-email-provider (2026-07-16)

- **Test gap: Google SMTP auth wiring unverified** [BE/TripPlanner.Tests/GoogleEmailSenderTests.cs:53] — The `ThrowsAnyAsync<Exception>` unreachable-host test fails at `ConnectAsync` and never reaches `AuthenticateAsync`, so nothing verifies that `Username`/`AppPassword` (not a hardcoded `"resend"`) and StartTls are used. Correct by inspection today; mirrors the equally-untested `ResendEmailSenderTests`. Closing it requires a local fake SMTP server that asserts the auth handshake (a mock would not count).
- **Port 465 (Gmail implicit-SSL) unsupported** [BE/TripPlanner.Infrastructure/ExternalServices/Google/GoogleEmailSender.cs:24] — `SecureSocketOptions.StartTls` is hard-coded while `SmtpPort` is configurable; connecting to 465 fails the TLS handshake. Mirrors `ResendEmailSender`; default 587 works. A TLS-mode toggle is out of this story's scope.
