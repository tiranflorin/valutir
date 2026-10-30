<?php

namespace App\EventSubscriber;

use App\Exception\ApiValidationException;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ExceptionEvent;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\KernelEvents;

class ApiExceptionSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly Security $security,
        #[Autowire('%kernel.environment%')] private readonly string $appEnv,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::EXCEPTION => 'onKernelException',
        ];
    }

    public function onKernelException(ExceptionEvent $event): void
    {
        $request = $event->getRequest();

        if (!str_starts_with($request->getPathInfo(), '/api')) {
            return;
        }

        $exception = $event->getThrowable();
        $user = $this->security->getUser();

        $headers = $request->headers->all();
        if (isset($headers['authorization'])) {
            $headers['authorization'] = ['*** redacted ***'];
        }

        $content = $request->getContent();
        $decodedContent = json_decode($content, true);
        if (JSON_ERROR_NONE === json_last_error() && is_array($decodedContent)) {
            $redactSensitiveValues = static function (array $value) use (&$redactSensitiveValues): array {
                foreach ($value as $key => $item) {
                    if (preg_match('/password|token|secret/i', (string) $key)) {
                        $value[$key] = '[REDACTED]';
                    } elseif (is_array($item)) {
                        $value[$key] = $redactSensitiveValues($item);
                    }
                }

                return $value;
            };

            $content = json_encode($redactSensitiveValues($decodedContent)) ?: '[REDACTED]';
        } elseif (preg_match('~^/api/(login_check|profile/password|reset-password(?:/|$))~', $request->getPathInfo())) {
            $content = '[REDACTED sensitive request body]';
        }

        if (strlen($content) > 4000) {
            $content = substr($content, 0, 4000).'... [truncated]';
        }

        $context = [
            'exception_class' => $exception::class,
            'exception_message' => $exception->getMessage(),
            'exception_code' => $exception->getCode(),
            'file' => $exception->getFile(),
            'line' => $exception->getLine(),
            'trace' => $exception->getTraceAsString(),
            'route' => $request->attributes->get('_route'),
            'method' => $request->getMethod(),
            'path' => $request->getPathInfo(),
            'query' => $request->query->all(),
            'request_body' => $content,
            'headers' => $headers,
            'client_ip' => $request->getClientIp(),
            'user' => $user ? [
                'identifier' => method_exists($user, 'getUserIdentifier') ? $user->getUserIdentifier() : null,
                'class' => $user::class,
            ] : null,
        ];

        $this->logger->error('Unhandled API exception', $context);

        $statusCode = Response::HTTP_INTERNAL_SERVER_ERROR;
        $message = 'Internal server error.';
        $errors = [];

        if ($exception instanceof ApiValidationException) {
            $event->setResponse(new JsonResponse([
                'message' => 'Validation failed.',
                'errors' => $exception->getErrors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY));

            return;
        }

        if ($exception instanceof HttpExceptionInterface) {
            $statusCode = $exception->getStatusCode();

            if ($statusCode < 500) {
                $message = $exception->getMessage() ?: Response::$statusTexts[$statusCode];
            }
        }

        $response = [
            'message' => $message,
            'errors' => $errors,
        ];

        if ('prod' !== $this->appEnv) {
            $response['debug'] = [
                'exception' => $exception::class,
                'detail' => $exception->getMessage(),
            ];
        }

        $event->setResponse(new JsonResponse($response, $statusCode));
    }
}
