<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Clock\Clock;
use App\Entity\User;
use App\Service\AccountExportService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\HeaderUtils;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * "Download my data": the signed-in user's own data, built on request and never stored.
 */
#[Route('/api/profile/export')]
final class AccountExportController extends AbstractController
{
    /** Allowed values of the CSV's `view` query parameter. */
    private const array VIEWS = ['personal' => false, 'business' => true];

    public function __construct(
        private readonly AccountExportService $exportService,
        private readonly Clock $clock,
        #[Autowire(service: 'limiter.account_export')] private readonly RateLimiterFactory $exportLimiter,
    ) {
    }

    #[Route('', name: 'api_profile_export', methods: ['GET'])]
    public function account(#[CurrentUser] User $user): Response
    {
        if (null !== $tooMany = $this->rejectIfTooMany($user)) {
            return $tooMany;
        }

        $response = new JsonResponse($this->exportService->export($user));
        $response->setEncodingOptions(JsonResponse::DEFAULT_ENCODING_OPTIONS | \JSON_PRETTY_PRINT | \JSON_UNESCAPED_UNICODE | \JSON_UNESCAPED_SLASHES);

        return $this->asDownload($response, \sprintf('valutir-export-%s.json', $this->today()));
    }

    #[Route('/subscriptions.csv', name: 'api_profile_export_subscriptions_csv', methods: ['GET'])]
    public function subscriptionsCsv(#[CurrentUser] User $user, Request $request): Response
    {
        $view = $request->query->get('view');
        if (null !== $view && !\array_key_exists($view, self::VIEWS)) {
            return $this->json(['message' => 'view must be "personal" or "business".'], Response::HTTP_BAD_REQUEST);
        }
        if (null !== $tooMany = $this->rejectIfTooMany($user)) {
            return $tooMany;
        }

        $rows = $this->exportService->subscriptionRows($user, null === $view ? null : self::VIEWS[$view]);
        $response = new StreamedResponse(static function () use ($rows): void {
            $out = fopen('php://output', 'w');
            if (false === $out) {
                return;
            }
            // Byte order mark, so Excel reads the file as UTF-8.
            fwrite($out, "\u{FEFF}");
            foreach ($rows as $row) {
                fputcsv($out, $row, ',', '"', '');
            }
            fclose($out);
        });
        $response->headers->set('Content-Type', 'text/csv; charset=utf-8');
        $suffix = null === $view ? '' : '-'.$view;

        return $this->asDownload($response, \sprintf('valutir-subscriptions%s-%s.csv', $suffix, $this->today()));
    }

    private function asDownload(Response $response, string $filename): Response
    {
        $response->headers->set('Content-Disposition', HeaderUtils::makeDisposition(HeaderUtils::DISPOSITION_ATTACHMENT, $filename));
        // Personal data: never kept by the browser or a proxy.
        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    /** Each export reads every row the user has; 10 an hour per user is plenty for a person. */
    private function rejectIfTooMany(User $user): ?JsonResponse
    {
        $limit = $this->exportLimiter->create('user-'.$user->getId())->consume();
        if ($limit->isAccepted()) {
            return null;
        }

        return $this->json(
            ['message' => 'Too many downloads. Please try again later.'],
            Response::HTTP_TOO_MANY_REQUESTS,
            ['Retry-After' => (string) max(1, $limit->getRetryAfter()->getTimestamp() - time())],
        );
    }

    private function today(): string
    {
        return $this->clock->now()->format('Y-m-d');
    }
}
