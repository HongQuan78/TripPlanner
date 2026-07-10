# Deferred Work

## Deferred from: code review of epic-4-user-authentication (2026-07-10)

- Case-sensitive email lookup (`u.Email == email` in `UserRepository.GetByEmailAsync`) — a user who registered as `User@X.com` and logs in / resends with `user@x.com` silently misses. Pre-existing across login/register/resend.
- Direct `DateTime.UtcNow` usage with no `TimeProvider` abstraction (`VerifyEmailUseCase`, `VerificationTokenService`) — expiry-boundary behavior cannot be tested deterministically. Pre-existing pattern across the codebase.
