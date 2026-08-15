import { FailureReason } from 'generated/prisma';
import { PrismaService } from 'src/database/prisma.service';

export const paymentFailed = async (args: {
  paymentId: string;
  prisma: PrismaService;
  reason: FailureReason;
}) => {
  await args.prisma.$transaction(async (tx) => {
    await tx.paymentRequest.update({
      where: {
        id: args.paymentId,
      },
      data: {
        status: 'FAILED',
        failureReason: args.reason,
      },
    });

    await tx.paymentEvent.create({
      data: {
        eventType: 'FAILED',
        paymentRequestId: args.paymentId,
      },
    });
  });
};
