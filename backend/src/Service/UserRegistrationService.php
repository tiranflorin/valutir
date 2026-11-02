<?php

declare(strict_types=1);

namespace App\Service;

use App\Dto\RegisterRequest;
use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\DBAL\Exception\UniqueConstraintViolationException;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * Registers users without revealing whether an email is already taken: the caller
 * always gets the same outcome, and the owner of an existing account is notified by email.
 */
final readonly class UserRegistrationService
{
    public function __construct(
        private UserRepository $userRepository,
        private EntityManagerInterface $entityManager,
        private UserPasswordHasherInterface $passwordHasher,
        private MailerInterface $mailer,
        private LoggerInterface $logger,
        #[Autowire('%frontend_url%')] private string $frontendUrl,
    ) {
    }

    /**
     * @param RegisterRequest $request an already validated request
     */
    public function register(RegisterRequest $request): void
    {
        $email = User::normalizeEmail((string) $request->email);

        $user = (new User())
            ->setEmail($email)
            ->setName(trim((string) $request->name))
            ->setRoles(['ROLE_USER']);
        // Hash before the existence check so both paths cost the same time.
        $user->setPassword($this->passwordHasher->hashPassword($user, (string) $request->password));

        if (null !== $this->userRepository->findOneByEmail($email)) {
            $this->notifyExistingAccount($email);

            return;
        }

        try {
            $this->entityManager->persist($user);
            $this->entityManager->flush();
        } catch (UniqueConstraintViolationException) {
            // Another request registered the same email concurrently.
            $this->notifyExistingAccount($email);
        }
    }

    private function notifyExistingAccount(string $email): void
    {
        $this->logger->info('Registration attempted for an existing account.');

        $baseUrl = rtrim($this->frontendUrl, '/');
        $message = (new Email())
            ->from('noreply@valutir.com')
            ->to($email)
            ->subject('Someone tried to create a ValuTir account with your email')
            ->text(
                "Someone tried to create a ValuTir account using this email address, but you already have one.\n\n"
                ."If this was you, sign in at {$baseUrl}/login or reset your password at {$baseUrl}/request-password-reset.\n\n"
                ."If it wasn't you, you can ignore this email. Your account has not been changed.",
            );

        try {
            $this->mailer->send($message);
        } catch (TransportExceptionInterface $exception) {
            // Never surface delivery problems to the caller: the response must not differ.
            $this->logger->error('Could not send existing-account registration notice.', [
                'exception_class' => $exception::class,
            ]);
        }
    }
}
