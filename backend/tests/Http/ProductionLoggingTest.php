<?php

declare(strict_types=1);

namespace App\Tests\Http;

use App\Admin\OperatorReport;
use Monolog\Logger;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;
use Symfony\Component\Yaml\Yaml;

/**
 * Production buffers a request's log lines and writes them only when it logs an error. Lines that
 * must never be lost bypass that buffer: notices and warnings (account security events such as a
 * password change or reset, admin roles granted, rejected Stripe webhooks, reversed payments; the
 * go-live alerts watch for some), and every admin page view, which the Privacy Policy promises is logged.
 */
final class ProductionLoggingTest extends KernelTestCase
{
    public function testNoticesAndWarningsAreWrittenAsTheyHappen(): void
    {
        $handler = $this->unbufferedHandlerFor(['!deprecation', '!admin']);

        self::assertSame('notice', $handler['level']);
    }

    public function testEveryAdminViewIsWrittenAsItHappens(): void
    {
        $handler = $this->unbufferedHandlerFor(['admin']);
        self::assertSame('info', $handler['level']);
        self::assertContains('!admin', $this->prodHandlers()['main']['channels'], 'The buffered handler must leave the admin channel alone.');

        $report = static::getContainer()->get(OperatorReport::class);
        $logger = (new \ReflectionProperty(OperatorReport::class, 'logger'))->getValue($report);
        self::assertInstanceOf(Logger::class, $logger);
        self::assertSame('admin', $logger->getName());
    }

    /**
     * @param list<string> $channels
     *
     * @return array<string, mixed>
     */
    private function unbufferedHandlerFor(array $channels): array
    {
        $matching = array_values(array_filter(
            $this->prodHandlers(),
            static fn (array $handler): bool => 'stream' === $handler['type'] && $channels === ($handler['channels'] ?? null),
        ));
        self::assertCount(1, $matching);
        self::assertSame('php://stderr', $matching[0]['path']);

        return $matching[0];
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function prodHandlers(): array
    {
        return Yaml::parseFile(\dirname(__DIR__, 2).'/config/packages/monolog.yaml')['when@prod']['monolog']['handlers'];
    }
}
