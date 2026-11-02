<?php

declare(strict_types=1);

namespace App\Clock;

/**
 * The current time, injectable so scheduled commands can be tested at a fixed moment.
 */
interface Clock
{
    public function now(): \DateTimeImmutable;
}
