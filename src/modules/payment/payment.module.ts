import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ClientsModule } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { createRmqOption } from 'src/common/utils/rmq.utils';
import { PaymentConsumer } from './payment.consumer';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'PAYMENT_JOB',
        inject: [ConfigService],
        useFactory: createRmqOption('payment_queue'),
      },
    ]),
  ],
  controllers: [PaymentController, PaymentConsumer],
  providers: [PaymentService, PaymentConsumer],
})
export class PaymentModule {}
