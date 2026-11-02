<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(name: 'app:create-admin', description: 'Creates an admin user')]
final class CreateAdminCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $existing = $this->entityManager->getRepository(User::class)->findOneBy(['email' => 'admin@valutir.com']);
        if ($existing) {
            $output->writeln('<comment>Admin user already exists.</comment>');

            return Command::SUCCESS;
        }

        $user = new User();
        $user->setEmail('admin@valutir.com');
        $user->setName('Admin');
        $user->setRoles(['ROLE_ADMIN', 'ROLE_USER']);
        $user->setPassword($this->passwordHasher->hashPassword($user, 'hooboo'));

        $this->entityManager->persist($user);
        $this->entityManager->flush();

        $output->writeln('<info>Admin user created: admin@valutir.com / hooboo</info>');

        return Command::SUCCESS;
    }
}
