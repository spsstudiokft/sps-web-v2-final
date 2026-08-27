# Two-factor authentication implementation tracker

Last updated: 2026-08-27

Status legend: `[x]` complete, `[-]` implemented but not fully rolled out, `[ ]` pending.

## Milestone 1 — shared authentication foundation

- [x] Store authentication factors separately for `admin` and `client` account contexts.
- [x] Add persistent, single-use authentication challenges with expiry and attempt counters.
- [x] Isolate login, enrollment, and disable challenges so their tokens cannot be used across purposes.
- [x] Add recovery-code and security-event table foundations.
- [x] Issue a short-lived, purpose-restricted pre-authentication JWT before the second step.
- [x] Include `account_context`, `amr`, and `auth_time` in newly issued full session JWTs.
- [x] Preserve dual client-plus-admin credential selection.
- [ ] Add token-version-backed session revocation.
- [ ] Require non-default `JWT_SECRET` and a dedicated `MFA_ENCRYPTION_KEY` in production startup validation.

## Milestone 2 — email login confirmation

- [x] Generate cryptographically secure eight-digit email codes.
- [x] Store only an HMAC digest of each email code.
- [x] Expire codes after five minutes and accept them only once.
- [x] Limit a challenge to five failed verification attempts.
- [x] Add a 60-second resend cooldown and invalidate the previous challenge on resend.
- [-] Add hourly per-account sending limits (implemented); per-IP limits remain pending.
- [x] Refuse login when delivery is simulated or fails, instead of silently exposing a code.
- [x] Add verification and resend API endpoints.
- [x] Add reusable email-code UI with OTP autocomplete support.
- [x] Integrate the second step into admin password login.
- [x] Integrate the second step into client password login.
- [x] Add verified enrollment flow before users can enable email confirmation.
- [x] Add current-password-plus-email-factor protected disable flow.
- [x] Add the optional email-2FA settings card to both client and admin account settings.
- [-] Replace the temporary email body with a branded, centrally editable SPS email template (complete); five-locale email content variants remain pending.
- [ ] Add five-locale UI translations; the current new UI copy is Hungarian.
- [-] Add security-event writes for send, failed/successful verification, password failure, and factor changes; recovery and TOTP events remain pending.
- [ ] Add an administrator policy switch and gradual enforcement dates.

## Milestone 3 — authenticator app / TOTP

- [x] Add the open-source RFC 6238 TOTP dependency.
- [x] Generate a unique TOTP secret per user and account context.
- [x] Encrypt TOTP secrets with `MFA_ENCRYPTION_KEY` before database storage.
- [x] Generate the `otpauth://` URI without sending the secret to any third party.
- [x] Render the QR code locally in the browser.
- [x] Require a valid first TOTP code before activating the factor.
- [x] Support six-digit, 30-second TOTP verification with a maximum ±1 time window.
- [x] Prevent replay of a TOTP value within the accepted time step.
- [x] Make TOTP the primary login factor when it is enrolled, while retaining optional email OTP.
- [x] Add persistent per-portal login modes: email only, authenticator only, or combined authenticator-then-email verification.
- [x] Continue a combined login from the verified TOTP/recovery step into a separate email challenge and include both methods in the final session `amr` claim.
- [ ] Require TOTP for superadmin accounts after a controlled enrollment window.

## Milestone 4 — recovery and lifecycle

- [x] Generate ten one-time recovery codes after TOTP enrollment.
- [x] Display recovery codes once and store only their hashes.
- [x] Allow the show-once recovery-code set to be downloaded as a local UTF-8 text file immediately after enrollment.
- [x] Support recovery-code login after the password step.
- [ ] Regenerate recovery codes only after password and active-factor verification.
- [ ] Notify the account email after factor enable, disable, replacement, or recovery.
- [ ] Add a support-admin reset procedure that never reveals secrets.
- [ ] Revoke existing sessions after password, email, or MFA changes.

## Milestone 5 — magic links and sensitive operations

- [ ] Require TOTP after a client magic link whenever TOTP is enabled.
- [ ] Ensure email magic link plus email OTP is never presented as two independent factors.
- [ ] Add step-up authentication for security settings and high-risk admin actions.
- [ ] Add recent-authentication checks using the JWT `auth_time` claim.

## Verification and rollout

- [x] Targeted server bundle compiles with the new database and API modules.
- [x] Targeted browser bundles compile for both login pages and the shared challenge component.
- [x] Restore the declared `botid` dependency locally so the complete Vite production build runs successfully.
- [x] Verify live Resend delivery: API accepted a non-simulated message with a provider message ID and inbox receipt was confirmed.
- [ ] Add isolated integration tests for expiry, replay, resend, attempt limit, dual accounts, and inactive accounts.
- [ ] Browser-test real email delivery for a client account.
- [-] Browser-test real email delivery for primary and secondary admin accounts: dev-account flow confirmed by the user; secondary-admin coverage remains pending.
- [ ] Verify local, Vercel Preview, and Vercel Production environment variables separately.
- [ ] Perform a controlled pilot before making any factor mandatory.
- [x] Run an isolated TOTP integration check covering encrypted storage, enrollment, ten recovery codes, replay rejection, and single-use recovery consumption; temporary records were removed.
