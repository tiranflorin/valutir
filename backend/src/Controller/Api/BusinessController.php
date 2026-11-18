<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Billing\CalendarDay;
use App\Business\AccountantExport;
use App\Business\BusinessCharge;
use App\Business\BusinessCharges;
use App\Clock\Clock;
use App\Entity\User;
use App\Http\CsvDownload;
use App\Repository\InvoiceFilingRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\RateLimiter\RateLimiterFactory;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;

/**
 * The Business view's invoice checklist (free) and the accountant export (paid, the one-time unlock).
 */
#[Route('/api/business')]
final class BusinessController extends AbstractController
{
    public function __construct(
        private readonly BusinessCharges $charges,
        private readonly InvoiceFilingRepository $invoiceFilings,
        private readonly AccountantExport $accountantExport,
        private readonly Clock $clock,
        #[Autowire(service: 'limiter.account_export')] private readonly RateLimiterFactory $exportLimiter,
    ) {
    }

    /** One month's business charges and whether each invoice is filed; `month=YYYY-MM`, the current month by default. */
    #[Route('/charges', name: 'api_business_charges', methods: ['GET'])]
    public function charges(#[CurrentUser] User $user, Request $request): JsonResponse
    {
        $value = $request->query->get('month');
        $month = null === $value ? $this->charges->currentMonth($user) : $this->charges->month($user, (string) $value);
        if (null === $month) {
            return $this->json(['message' => BusinessCharges::MONTH_ERROR], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'month' => $month->format('Y-m'),
            'charges' => array_map(static fn (BusinessCharge $charge): array => $charge->toArray(), $this->charges->between($user, $month, $month)),
        ]);
    }

    #[Route('/charges/{subscriptionId}/{date}/invoice', name: 'api_business_invoice_filed', methods: ['PUT'], requirements: ['subscriptionId' => '\d+'])]
    public function markFiled(#[CurrentUser] User $user, int $subscriptionId, string $date): Response
    {
        $subscription = $this->charges->pastCharge($user, $subscriptionId, $date);
        $this->invoiceFilings->markFiled($subscription, CalendarDay::fromString($date), $this->clock->now());

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    #[Route('/charges/{subscriptionId}/{date}/invoice', name: 'api_business_invoice_unfiled', methods: ['DELETE'], requirements: ['subscriptionId' => '\d+'])]
    public function unmarkFiled(#[CurrentUser] User $user, int $subscriptionId, string $date): Response
    {
        $subscription = $this->charges->pastCharge($user, $subscriptionId, $date);
        $this->invoiceFilings->unmarkFiled($subscription, CalendarDay::fromString($date));

        return new Response(null, Response::HTTP_NO_CONTENT);
    }

    /** The business charges from month `from` to month `to` (YYYY-MM, at most 12 months) as a CSV for the accountant. */
    #[Route('/export.csv', name: 'api_business_export', methods: ['GET'])]
    public function export(#[CurrentUser] User $user, Request $request): Response
    {
        [$first, $last] = $this->accountantExport->period($user, $request->query->get('from'), $request->query->get('to'));
        $limit = $this->exportLimiter->create('user-'.$user->getId())->consume();
        if (!$limit->isAccepted()) {
            return $this->json(
                ['message' => 'Too many downloads. Please try again later.'],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) max(1, $limit->getRetryAfter()->getTimestamp() - time())],
            );
        }

        return new CsvDownload($this->accountantExport->rows($user, $first, $last), AccountantExport::filename($first, $last));
    }
}
