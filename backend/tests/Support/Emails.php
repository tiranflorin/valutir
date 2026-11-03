<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Mail\EmailFactory;
use Twig\Environment;
use Twig\Extra\CssInliner\CssInlinerExtension;
use Twig\Loader\FilesystemLoader;

/**
 * A real EmailFactory over the real templates, for unit tests that check what an email says.
 */
final class Emails
{
    public static function factory(string $frontendUrl = 'http://frontend.test'): EmailFactory
    {
        $twig = new Environment(new FilesystemLoader(\dirname(__DIR__, 2).'/templates'), ['strict_variables' => true]);
        $twig->addExtension(new CssInlinerExtension());

        return new EmailFactory($twig, $frontendUrl);
    }
}
