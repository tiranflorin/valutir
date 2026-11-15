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
use App\Tests\Support\Emails;
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
        $html = (string) $email->getHtmlBody();

        self::assertStringContainsString("Design app\nTrial ends on Wed 4 Nov (in 2 days), then the first charge  €19.99", $text);
        self::assertStringContainsString("Netflix\nRenews tomorrow (Tue 3 Nov)  €13.99 (your share €3.50)", $text);
        self::assertLessThan(strpos($text, 'Renewals'), strpos($text, 'Trials ending'));
        // Real links in the HTML, and labelled URLs in the plain-text part.
        self::assertMatchesRegularExpression('~<a href="http://frontend\.test/unsubscribe\?token=[^"]+"[^>]*>Turn them off</a>~', $html);
        self::assertStringContainsString('<a href="http://frontend.test/my-subs"', $html);
        self::assertStringContainsString('[Turn them off](http://frontend.test/unsubscribe?token=', $text);
        self::assertStringContainsString('[See all your subscriptions](http://frontend.test/my-subs)', $text);
        self::assertSame('<https://api.test/api/reminders/unsubscribe?token=signed>', $email->getHeaders()->get('List-Unsubscribe')?->getBodyAsString());
        self::assertSame('List-Unsubscribe=One-Click', $email->getHeaders()->get('List-Unsubscribe-Post')?->getBodyAsString());
    }

    public function testServiceNamesCannotInjectMarkup(): void
    {
        $email = $this->mailer()->buildDigest($this->user(), [
            new DueReminder($this->subscription('<a href="https://evil.example">Win</a>', '1.00'), ReminderLog::KIND_RENEWAL, CalendarDay::fromString('2026-11-02'), 0),
        ]);
        $html = (string) $email->getHtmlBody();

        self::assertStringNotContainsString('<a href="https://evil.example"', $html);
        self::assertStringContainsString('&lt;a href="https://evil.example"&gt;Win&lt;/a&gt;', $html);
    }

    public function testSingleReminderGetsASpecificSubject(): void
    {
        $email = $this->mailer()->buildDigest($this->user(), [
            new DueReminder($this->subscription('Spotify', '10.99'), ReminderLog::KIND_RENEWAL, CalendarDay::fromString('2026-11-02'), 0),
        ]);

        self::assertSame('Spotify renews today (Mon 2 Nov): €10.99', $email->getSubject());
    }

    public function testAFlaggedSubscriptionAsksForTheDecisionWithTheUsersNote(): void
    {
        $flagged = $this->subscription('Gym', '45.00');
        (new \ReflectionProperty(Subscription::class, 'id'))->setValue($flagged, 12);
        // 23:30 UTC on 2 Nov is already 3 Nov in Bucharest, the user's time zone.
        $flagged->flagForReview(new \DateTimeImmutable('2026-11-02 23:30:00 UTC'), 'Have I been since summer?');
        $user = $this->user();
        $user->setTimezone('Europe/Bucharest');

        $email = $this->mailer()->buildDigest($user, [
            new DueReminder($flagged, ReminderLog::KIND_RENEWAL, CalendarDay::fromString('2026-11-20'), 3),
            new DueReminder($this->subscription('Spotify', '10.99'), ReminderLog::KIND_RENEWAL, CalendarDay::fromString('2026-11-20'), 3),
        ]);
        $text = (string) $email->getTextBody();

        self::assertStringContainsString('You flagged it for review on 3 Nov 2026 (“Have I been since summer?”). Still keeping it? [Decide on its page](http://frontend.test/subscriptions/12)', $text);
        self::assertSame(1, substr_count($text, 'flagged it for review'));
    }

    private function mailer(): ReminderMailer
    {
        $urls = $this->createStub(UrlGeneratorInterface::class);
        $urls->method('generate')->willReturn('https://api.test/api/reminders/unsubscribe?token=signed');

        return new ReminderMailer($this->createStub(MailerInterface::class), Emails::factory(), new UnsubscribeToken('secret'), $urls);
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
