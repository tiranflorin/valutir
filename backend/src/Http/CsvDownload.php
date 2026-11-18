<?php

declare(strict_types=1);

namespace App\Http;

use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * A CSV attachment of the user's own data: UTF-8 with a byte order mark (so Excel reads it right),
 * never kept by the browser or a proxy. Cells must already be made formula-safe.
 */
final class CsvDownload extends StreamedResponse
{
    /**
     * @param iterable<list<string>> $rows
     */
    public function __construct(iterable $rows, string $filename)
    {
        parent::__construct(static function () use ($rows): void {
            $out = fopen('php://output', 'w');
            if (false === $out) {
                return;
            }
            fwrite($out, "\u{FEFF}");
            foreach ($rows as $row) {
                fputcsv($out, $row, ',', '"', '');
            }
            fclose($out);
        });
        $this->headers->set('Content-Type', 'text/csv; charset=utf-8');
        $this->headers->set('Content-Disposition', HeaderUtils::makeDisposition(HeaderUtils::DISPOSITION_ATTACHMENT, $filename));
        $this->headers->set('Cache-Control', 'no-store, private');
    }
}
