import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PaymentService } from './payment.service';

@Controller()
export class PaymentConsumer {
  constructor(private paymentService: PaymentService) {}

  @EventPattern('payment.process')
  process(@Payload() data: { paymentId: string }) {
    return this.paymentService.process(data.paymentId);
  }
}
