import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/client';

import { PrismaService } from 'src/database/prisma.service';
import { PaymentStoreDto } from './dto/paymentStore.dto';
import { paymentFailed } from 'src/common/utils/payment.utils';
import { InsufficientBalance } from 'src/common/exceptions/incufficientBalance.exception';
import { PaymentNotFound } from 'src/common/exceptions/paymentNotFound.exception';
import { MaxAttemptException } from 'src/common/exceptions/maxAttempt.exception';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,

    @Inject('PAYMENT_JOB')
    private readonly paymentJob: ClientProxy,
  ) {}

  async create(dto: PaymentStoreDto) {
    try {
      // Create the payment and its initial events in one transaction
      // so the payment can never exist without its corresponding history.
      const payment = await this.prisma.$transaction(async (tx) => {
        const payment = await tx.paymentRequest.create({
          data: {
            userId: dto.userId,
            amount: dto.amount,
            description: dto.description,
            reference: dto.reference,
            idempotencyKey: dto.idempotencyKey,
            status: 'PENDING',
          },
        });

        // Record the initial lifecycle events atomically with payment creation.
        await tx.paymentEvent.createMany({
          data: [
            {
              paymentRequestId: payment.id,
              eventType: 'CREATED',
            },
            {
              paymentRequestId: payment.id,
              eventType: 'QUEUED',
            },
          ],
        });

        return payment;
      });

      // Publish only after the transaction commits.
      // This prevents a worker from receiving a job for a rolled-back payment.
      this.emitPaymentJob(payment.id);

      return payment;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async retry(id: string) {
    try {
      const payment = await this.prisma.$transaction(async (tx) => {
        // The status condition makes retrying an already-processed payment
        // fail instead of creating another processing attempt.
        const payment = await tx.paymentRequest.update({
          where: {
            id,
            status: 'FAILED',
          },
          data: {
            attemptCount: {
              increment: 1,
            },
            status: 'PENDING',
          },
          include: {
            user: true,
          },
        });

        // Enforce the retry limit inside the transaction.
        if (payment.maxAttempt <= payment.attemptCount) {
          throw new MaxAttemptException();
        }

        if (payment.amount > payment.user.balance) {
          throw new InsufficientBalance();
        }

        // Keep retry history and queue state consistent with the payment state.
        await tx.paymentEvent.createMany({
          data: [
            {
              paymentRequestId: payment.id,
              eventType: 'RETRY_TRIGGERED',
            },
            {
              paymentRequestId: payment.id,
              eventType: 'QUEUED',
            },
          ],
        });

        return payment;
      });

      // Queue only after the retry transaction has successfully committed.
      this.emitPaymentJob(payment.id);

      return payment;
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async process(paymentId: string) {
    try {
      // Atomically claim the payment.
      // If two workers process the same message concurrently,
      // only one can change the payment from PENDING/FAILED to PROCESSING.
      const payment = await this.prisma.paymentRequest.update({
        where: {
          id: paymentId,
          status: { in: ['PENDING', 'FAILED'] },
        },
        data: {
          status: 'PROCESSING',
        },
        include: {
          user: true,
        },
      });

      // Record that this payment entered the processing state.
      await this.prisma.paymentEvent.create({
        data: {
          paymentRequestId: payment.id,
          eventType: 'PROCESSING_STARTED',
        },
      });

      if (payment.amount > payment.user.balance) {
        throw new InsufficientBalance();
      }

      await this.prisma.$transaction(async (tx) => {
        // The balance check and decrement happen in a single atomic UPDATE.
        // This prevents two concurrent payments from both spending the same balance.
        const user = await tx.user.update({
          where: {
            id: payment.userId,
            balance: {
              gte: payment.amount,
            },
          },
          data: {
            balance: {
              decrement: payment.amount,
            },
          },
        });

        // Store the balance after the debit for financial/audit purposes.
        await tx.transaction.create({
          data: {
            type: 'DEBIT',
            amount: payment.amount,
            balanceAfter: user.balance,
            paymentRequestId: payment.id,
            userId: payment.userId,
          },
        });

        // The payment becomes successful only after the balance and
        // financial transaction have both been persisted successfully.
        await tx.paymentRequest.update({
          where: {
            id: payment.id,
          },
          data: {
            failureReason: null,
            status: 'SUCCEEDED',
          },
        });

        // Record the final successful state in the payment history.
        await tx.paymentEvent.create({
          data: {
            paymentRequestId: payment.id,
            eventType: 'SUCCEEDED',
          },
        });
      });
    } catch (error) {
      // Convert processing failures into the appropriate persisted
      // payment failure state and application exception.
      await this.handleProcessError(paymentId, error);
    }
  }

  private emitPaymentJob(paymentId: string) {
    // Send only the payment ID.
    // The consumer loads the current state from the database,
    // avoiding stale payment data inside the RabbitMQ message.
    this.paymentJob.emit('payment.process', {
      paymentId,
    });
  }

  private async handleProcessError(
    paymentId: string,
    error: unknown,
  ): Promise<never> {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new PaymentNotFound();
    }

    if (error instanceof InsufficientBalance) {
      await paymentFailed({
        paymentId,
        prisma: this.prisma,
        reason: 'INSUFFICIENT_BALANCE',
      });

      throw error;
    }

    // Persist the failed state and failure event before exposing
    // the technical error to the caller/worker.
    await paymentFailed({
      paymentId,
      prisma: this.prisma,
      reason: 'TECHNICAL_ERROR',
    });

    throw new InternalServerErrorException();
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    if (error instanceof PrismaClientKnownRequestError) {
      // P2025 means the update condition matched no record.
      // In this case the payment either does not exist or is no longer FAILED.
      switch (error.code) {
        case 'P2025':
          throw new PaymentNotFound();
        // The payment references a user that does not exist.
        case 'P2003':
          throw new NotFoundException('User not found');

        // A unique field such as reference/idempotencyKey already exists.
        case 'P2002':
          throw new ConflictException('Payment already exists');
      }
    }

    // Hide unexpected database errors behind a generic application error.
    throw new InternalServerErrorException();
  }
}
