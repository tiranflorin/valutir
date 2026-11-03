# Emails

Every email ValuTir sends uses one branded layout: `backend/templates/email/layout.html.twig`. **To change the look of all emails, edit that one file.** It holds the brand colors and fonts (the `brand` tokens at the top), the logo, the card, the button and link macros, and the footer. Each email is a short template in `backend/templates/email/` that extends the layout and only fills in its text.

| Email | Template | Sent by | When |
|---|---|---|---|
| Confirm your email address | `verify_email` | `AccountMailer` | After sign-up, or "Resend link" |
| Someone tried to create an account with your email | `existing_account` | `AccountMailer` | Sign-up with an already registered address (sent instead of the confirmation, so the response doesn't reveal the account) |
| Reset your password | `password_reset` | `AccountMailer` | Password reset request for a registered address |
| Confirm your new email address | `email_change_confirm` | `AccountMailer` | Email change started (to the new address) |
| Your email address was changed | `email_changed` | `AccountMailer` | Email change confirmed (to the old address) |
| Your account was deleted | `account_deleted` | `AccountMailer` | Account deletion |
| Payment reminder digest | `reminder_digest` | `ReminderMailer` | `app:reminders:send`, at most once a day; carries one-click unsubscribe headers |
| Contact form message | `contact_message` | `ContactController` | Contact form, to `CONTACT_RECIPIENT`, with the sender as Reply-To |

How it's built (`App\Mail\EmailFactory`):

- Every link is a real `<a href>`. Buttons also show their URL underneath, for clients that block buttons.
- The CSS is inlined into the HTML, because many email clients drop `<style>` blocks. Layout uses tables, there are no web fonts, and the logo is a PNG: Gmail and Outlook don't show SVG.
- The plain-text part is generated from the HTML (`App\Mail\EmailTextConverter`). Links become `[label](url)`, and the logo and the hidden inbox preview line are left out.
- Twig autoescapes everything, so user text (names, service names, contact messages) can't inject markup or links.
- Sent from "ValuTir <noreply@valutir.com>". Stripe receipts are sent by Stripe and branded in the Stripe Dashboard (Settings → Branding).

The logo is `frontend/public/brand/email-logo.png` (560×200, shown at 140×50), loaded from `FRONTEND_URL`, so it's deployed with the frontend. If the logo changes, re-export it from `header-logo.svg` at the same size. Locally, restart the frontend container after adding files to `public/`, because Vite only picks them up at startup. Look at sent emails in MailDev at `http://localhost:1080`.
