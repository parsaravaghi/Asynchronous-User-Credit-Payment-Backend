import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/client';

import { PrismaService } from 'prisma/prisma.service';

import { UserStoreDto } from './dto/userStor.dto';
import { UserCreditDto } from './dto/userCredit.dto';
import { UserDuplicateException } from './exceptions/userDuplicate.exception';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userStoreDto: UserStoreDto) {
    try {
      return await this.prisma.user.create({
        data: userStoreDto,
      });
    } catch (error) {
      // Handle Prisma-specific errors separately from unexpected errors.
      if (!(error instanceof PrismaClientKnownRequestError)) {
        throw new InternalServerErrorException();
      }

      switch (error.code) {
        // P2002 = unique constraint violation.
        case 'P2002':
          throw new UserDuplicateException();

        default:
          throw new BadRequestException();
      }
    }
  }

  async getUserBalance(id: string) {
    try {
      // findUniqueOrThrow automatically throws P2025 when the user doesn't exist.
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id },
      });

      return {
        userId: user.id,
        balance: user.balance,
        asOf: user.asOf,
      };
    } catch (error) {
      // P2025 means the requested record was not found.
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException();
        }
      }

      throw new InternalServerErrorException();
    }
  }

  async createUserCredit(userId: string, userCreditDto: UserCreditDto) {
    // Both balance update and transaction creation must succeed or both are rolled back.
    return this.prisma.$transaction(async (tx) => {
      try {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            // Atomic increment prevents read-modify-write race conditions.
            balance: {
              increment: userCreditDto.amount,
            },
            asOf: new Date(),
          },
        });

        return await tx.transaction.create({
          data: {
            amount: userCreditDto.amount,
            type: 'CREDIT',
            balanceAfter: user.balance,
            userId: user.id,
          },
        });
      } catch (error) {
        // P2025 means the user doesn't exist.
        if (
          error instanceof PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new NotFoundException();
        }

        throw error;
      }
    });
  }
}
