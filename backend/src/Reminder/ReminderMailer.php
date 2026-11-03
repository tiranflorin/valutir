<?php

declare(strict_types=1);

namespace App\Reminder;

use App\Entity\ReminderLog;
use App\Entity\User;
use App\Mail\EmailFactory;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * The daily digest of upcoming payments. Unlike account notices, delivery errors are thrown
 * so the command can retry the user on its next run.
 */
final readonly class ReminderMailer
{
    public function __construct(
        private MailerInterface $mailer,
        private EmailFactory $emails,
        private UnsubscribeToken $unsubscribeToken,
        private UrlGeneratorInterface $urlGenerator,
    ) {
    }

    /**
     * @param non-empty-list<DueReminder> $reminders
     *
     * @throws TransportExceptionInterface
     */
    public function sendDigest(User $user, array $reminders): void
    {
        $this->mailer->send($this->buildDigest($user, $reminders));
    }

    /**
     * @param non-empty-list<DueReminder> $reminders
     */
    public function buildDigest(User $user, array $reminders): Email
    {
        $token = $this->unsubscribeToken->create($user);
        $oneClickUrl = $this->urlGenerator->generate('api_reminders_unsubscribe', ['token' => $token], UrlGeneratorInterface::ABSOLUTE_URL);
        $items = fn (string $kind): array => array_values(array_map(
            fn (DueReminder $reminder): array => [
                'service' => (string) $reminder->subscription->getServiceName(),
                'when' => $this->when($reminder),
                'amount' => $this->amount($reminder),
            ],
            array_filter($reminders, static fn (DueReminder $reminder): bool => $kind === $reminder->kind),
        ));

        $email = $this->emails->create('email/reminder_digest.html.twig', (string) $user->getEmail(), $this->subject($reminders), [
            'name' => $user->getName() ?: 'there',
            'trials' => $items(ReminderLog::KIND_TRIAL_ENDING),
            'renewals' => $items(ReminderLog::KIND_RENEWAL),
            'subscriptions_url' => $this->emails->appUrl('/my-subs'),
            'unsubscribe_url' => $this->emails->appUrl('/unsubscribe?token='.rawurlencode($token)),
        ]);
        // One-click unsubscribe (RFC 8058), expected by Gmail and Yahoo for recurring mail.
        $email->getHeaders()->addTextHeader('List-Unsubscribe', sprintf('<%s>', $oneClickUrl));
        $email->getHeaders()->addTextHeader('List-Unsubscribe-Post', 'List-Unsubscribe=One-Click');

        return $email;
    }

    /**
     * @param non-empty-list<DueReminder> $reminders
     */
    private function subject(array $reminders): string
    {
        if (1 === \count($reminders)) {
            $reminder = $reminders[0];
            $service = $reminder->subscription->getServiceName();

            return ReminderLog::KIND_TRIAL_ENDING === $reminder->kind
                ? sprintf('Your %s trial ends %s', $service, $this->when($reminder))
                : sprintf('%s renews %s: %s', $service, $this->when($reminder), $this->amount($reminder));
        }

        return sprintf('%d payments coming up', \count($reminders));
    }

    private function when(DueReminder $reminder): string
    {
        $date = $reminder->chargeDate->format('D j M');

        return match ($reminder->daysUntil) {
            0 => sprintf('today (%s)', $date),
            1 => sprintf('tomorrow (%s)', $date),
            default => sprintf('on %s (in %d days)', $date, $reminder->daysUntil),
        };
    }

    private function amount(DueReminder $reminder): string
    {
        $subscription = $reminder->subscription;
        $currency = (string) $subscription->getCurrency();
        $full = (float) $subscription->getAmount();
        $text = $this->money($full, $currency);
        $people = $subscription->isHouseholdShared() ? (int) $subscription->getHouseholdSize() : 1;

        return $people > 1 ? sprintf('%s (your share %s)', $text, $this->money($full / $people, $currency)) : $text;
    }

    private function money(float $amount, string $currency): string
    {
        $formatted = (new \NumberFormatter('en_GB', \NumberFormatter::CURRENCY))->formatCurrency($amount, $currency);

        return false === $formatted ? sprintf('%.2f %s', $amount, $currency) : $formatted;
    }
}
