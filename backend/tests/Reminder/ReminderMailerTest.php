<?php

declare(strict_types=1);

namespace App\Tests\Reminder;

use App\Billing\CalendarDay;
use App\Entity\ReminderLog;
use App\Entity\Subscription;
use App\Entity\User;
use App\Reminder\DueReminder;
use App\Reminder\ReminderMailer;
use App\Reminder\UnsubscribeToken;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

final class ReminderMailerTest extends TestCase
{
    public function testDigestListsTrialsThenRenewalsWithSharesAndUnsubscribeLinks(): void
    {
        $user = $this->user();
        $netflix = $this->subscription('Netflix', '13.99', shareWith: 4);
        $design = $this->subscription('Design app', '19.99');

        $email = $this->mailer()->buildDigest($user, [
            new DueReminder($design, ReminderLog::KIND_TRIAL_ENDING, CalendarDay::fromString('2026-11-04'), 2),
            new DueReminder($netflix, ReminderLog::KIND_RENEWAL, CalendarDay::fromString('2026-11-03'), 1),
        ]);
        $text = (string) $email->getTextBody();

        self::assertSame('2 payments coming up', $email->getSubject());
        self::assertSame(['ada@example.test'], array_map(static fn ($a): string => $a->getAddress(), $email->getTo()));
        self::assertStringContainsString('- Design app: trial ends on Wed 4 Nov (in 2 days), then the first charge is €19.99', $text);
        self::assertStringContainsString('- Netflix: €13.99 (your share €3.50) tomorrow (Tue 3 Nov)', $text);
        self::assertLessThan(strpos($text, 'RENEWALS'), strpos($text, 'TRIALS ENDING'));
        self::assertStringContainsString('Turn them off: http://frontend.test/unsubscribe?token=', $text);
        self::assertSame('<https://api.test/api/reminders/unsubscribe?token=signed>', $email->getHeaders()->get('List-Unsubscribe')?->getBodyAsString());
        self::assertSame('List-Unsubscribe=One-Click', $email->getHeaders()->get('List-Unsubscribe-Post')?->getBodyAsString());
    }

    public function testSingleReminderGetsASpecificSubject(): void
    {
        $email = $this->mailer()->buildDigest($this->user(), [
            new DueReminder($this->subscription('Spotify', '10.99'), ReminderLog::KIND_RENEWAL, CalendarDay::fromString('2026-11-02'), 0),
        ]);

        self::assertSame('Spotify renews today (Mon 2 Nov): €10.99', $email->getSubject());
    }

    private function mailer(): ReminderMailer
    {
        $urls = $this->createStub(UrlGeneratorInterface::class);
        $urls->method('generate')->willReturn('https://api.test/api/reminders/unsubscribe?token=signed');

        return new ReminderMailer($this->createStub(MailerInterface::class), new UnsubscribeToken('secret'), $urls, 'http://frontend.test/');
    }

    private function user(): User
    {
        $user = (new User())->setEmail('ada@example.test')->setName('Ada');
        (new \ReflectionProperty(User::class, 'id'))->setValue($user, 7);

        return $user;
    }

    private function subscription(string $name, string $amount, ?int $shareWith = null): Subscription
    {
        return (new Subscription())->setServiceName($name)->setAmount($amount)->setCurrency('EUR')->setHouseholdSharing($shareWith);
    }
}
