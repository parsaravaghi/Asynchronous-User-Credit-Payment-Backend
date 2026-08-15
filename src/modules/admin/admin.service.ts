import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { UserQueryDto } from './dto/userQuery.dto';
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/client';
import { TimePeriod } from './dto/timePeriod.dto';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async showUserBlanace(userQueryDto: UserQueryDto) {
    // Cache key is based on the requested page.
    const cachKey = `admin${userQueryDto.page}:userBalance`;

    const cached = await this.cacheManager.get(cachKey);

    // Return cached data and skip the database query.
    if (cached) {
      return cached;
    }

    const user = await this.prisma.user.findMany({
      take: userQueryDto.limit,
      skip: --userQueryDto.page * userQueryDto.limit,
      select: {
        id: true,
        username: true,
        email: true,
        balance: true,
      },
    });

    if (user.length === 0) {
      throw new NotFoundException();
    }

    // Store the query result in cache for subsequent requests.
    await this.cacheManager.set(cachKey, user);
    return user;
  }

  async showUserDetail(userId: string) {
    try {
      // Use a user-specific key to avoid returning another user's data.
      const cacheKey = `admin:${userId}:userDetail`;

      const cached = await this.cacheManager.get(cacheKey);

      // Skip the database query when cached data exists.
      if (cached) {
        return cached;
      }

      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        include: {
          transactions: {
            take: 10,
            orderBy: {
              createdAt: 'desc',
            },
          },
          paymentRequests: {
            take: 10,
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException();
      }

      // Cache the user details to reduce repeated database queries.
      await this.cacheManager.set(cacheKey, user);
      return user;
    } catch (error) {
      // Preserve NestJS HTTP exceptions such as NotFoundException.
      if (error instanceof HttpException) {
        throw error;
      }

      // Convert unexpected errors into a generic internal server error.
      if (!(error instanceof PrismaClientKnownRequestError)) {
        throw new InternalServerErrorException();
      }

      throw new ConflictException('unknown db error');
    }
  }

  async showUserTransactions(dto: TimePeriod) {
    // Aggregate transactions by the requested time period.
    const result = await this.prisma.$queryRaw`
      SELECT
        DATE_TRUNC(${dto.period}, "createdAt") AS period,
        SUM(amount) FILTER (WHERE type = 'CREDIT') AS total_credit,
        SUM(amount) FILTER (WHERE type = 'DEBIT') AS total_debit
      FROM "Transaction"
      GROUP BY period
    `;

    return result;
  }

  async showBalanceUsage(userId: string) {
    // Verify the user exists before calculating their balance usage.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    // Calculate total credits and debits for this specific user.
    const [result] = await this.prisma.$queryRaw<
      { total_credit: string; total_debit: string }[]
    >`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE type = 'CREDIT'), 0) AS total_credit,
        COALESCE(SUM(amount) FILTER (WHERE type = 'DEBIT'), 0) AS total_debit
      FROM "Transaction"
      WHERE "userId" = ${userId}
    `;

    return {
      userId,
      totalCredit: Number(result.total_credit),
      totalDebit: Number(result.total_debit),
    };
  }
}
