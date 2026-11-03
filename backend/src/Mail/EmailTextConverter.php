<?php

declare(strict_types=1);

namespace App\Mail;

use League\HTMLToMarkdown\HtmlConverter;
use Symfony\Component\Mime\HtmlToTextConverter\HtmlToTextConverterInterface;

/**
 * The plain-text part of every email, generated from its HTML: links become "[label](url)", so
 * they still work in text-only clients. The logo and the hidden inbox preview line are left out, and
 * HTML entities are decoded (the text part is never rendered as HTML).
 */
final class EmailTextConverter implements HtmlToTextConverterInterface
{
    private readonly HtmlConverter $converter;

    public function __construct()
    {
        $this->converter = new HtmlConverter([
            'strip_tags' => true,
            'hard_break' => true,
            'remove_nodes' => 'head style img',
        ]);
    }

    public function convert(string $html, string $charset): string
    {
        $html = (string) preg_replace([
            '~<div\b[^>]*\bclass="preheader"[^>]*>.*?</div>~s', // hidden inbox preview
            '~<a\b[^>]*>\s*<img\b[^>]*>\s*</a>~s',             // the logo, which links home
        ], '', $html);
        // Layout tables mean nothing in text: rows become lines, cells sit side by side.
        $html = (string) preg_replace(
            ['~<(table|tbody|thead|tr)\b[^>]*>~i', '~</(table|tbody|thead|tr)>~i', '~<td\b[^>]*>~i', '~</td>~i'],
            ['<div>', '</div>', '<span>', '</span> '],
            $html,
        );

        $text = html_entity_decode($this->converter->convert($html), \ENT_QUOTES | \ENT_HTML5, $charset);
        $text = (string) preg_replace('/^[ \t]+|[ \t]+$/m', '', $text); // indentation left by the table layout

        return trim((string) preg_replace("/\n{3,}/", "\n\n", $text));
    }
}
