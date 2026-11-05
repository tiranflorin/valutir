<?php

declare(strict_types=1);

namespace App\Command;

use App\Clock\Clock;
use App\Entity\User;
use App\Repository\UserRepository;
use App\Validator\PasswordPolicy;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Gives an account ROLE_ADMIN.
 *
 * - The account exists (the normal path, also in production): the role is added. No password is
 *   asked for or changed; the owner keeps signing in with their own.
 * - It doesn't exist: the account is created, only in an interactive terminal, with a password
 *   typed at a hidden prompt. The password never appears in arguments, shell history, or output.
 */
#[AsCommand(name: 'app:create-admin', description: 'Grants ROLE_ADMIN to an account, creating it interactively if needed')]
final class CreateAdminCommand extends Command
{
    private const ROLE = 'ROLE_ADMIN';

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly ValidatorInterface $validator,
        private readonly Clock $clock,
        private readonly LoggerInterface $logger,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::REQUIRED, 'Email address of the account')
            ->addOption('name', null, InputOption::VALUE_REQUIRED, 'Display name, when a new account is created', 'Admin');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $email = User::normalizeEmail((string) $input->getArgument('email'));

        $emailErrors = $this->validator->validate($email, [
            new Assert\NotBlank(),
            new Assert\Length(max: 180),
            new Assert\Email(mode: Assert\Email::VALIDATION_MODE_HTML5),
        ]);
        if (\count($emailErrors) > 0) {
            $io->error('That is not a valid email address.');

            return Command::INVALID;
        }

        $user = $this->userRepository->findOneByEmail($email);
        if (null !== $user) {
            return $this->grant($user, $io);
        }

        return $this->create($email, (string) $input->getOption('name'), $input, $io);
    }

    private function grant(User $user, SymfonyStyle $io): int
    {
        if (\in_array(self::ROLE, $user->getRoles(), true)) {
            $io->note(\sprintf('%s is already an admin.', $user->getEmail()));

            return Command::SUCCESS;
        }

        $user->setRoles(array_values(array_unique([...$user->getRoles(), self::ROLE])));
        $this->entityManager->flush();
        $this->logger->notice('Admin role granted from the console.', ['user_id' => $user->getId()]);
        $io->success(\sprintf('%s is now an admin. Their password is unchanged.', $user->getEmail()));

        return Command::SUCCESS;
    }

    private function create(string $email, string $name, InputInterface $input, SymfonyStyle $io): int
    {
        if (!$input->isInteractive()) {
            $io->error('No account with that email. Register it in the app first (or run this command in an interactive terminal to create it with a password prompt).');

            return Command::FAILURE;
        }

        $name = trim($name);
        if ('' === $name || mb_strlen($name) > 255) {
            $io->error('The name must be 1 to 255 characters.');

            return Command::INVALID;
        }

        $io->text(\sprintf('No account for %s yet; creating one.', $email));
        $password = (string) $io->askHidden('Password (hidden)');
        $passwordErrors = $this->validator->validate($password, [
            new Assert\NotBlank(),
            new Assert\Length(max: 4096),
            new PasswordPolicy(),
        ]);
        if (\count($passwordErrors) > 0) {
            $io->error((string) $passwordErrors->get(0)->getMessage());

            return Command::INVALID;
        }
        if ($password !== (string) $io->askHidden('Repeat the password')) {
            $io->error('The passwords do not match.');

            return Command::INVALID;
        }

        $user = (new User())
            ->setEmail($email)
            ->setName($name)
            ->setRoles([self::ROLE]);
        $user->setPassword($this->passwordHasher->hashPassword($user, $password));
        // Created by an operator who controls the address; no verification link is sent.
        $user->markEmailVerified($this->clock->now());

        $this->entityManager->persist($user);
        $this->entityManager->flush();
        $this->logger->notice('Admin account created from the console.', ['user_id' => $user->getId()]);
        $io->success(\sprintf('Admin account created for %s.', $email));

        return Command::SUCCESS;
    }
}
