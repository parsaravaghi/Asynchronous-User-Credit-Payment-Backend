import {
  Body,
  Controller,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PaymentStoreDto } from './dto/paymentStore.dto';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}
  @Post()
  @UsePipes(ValidationPipe)
  show(@Body() paymentStoreDto: PaymentStoreDto) {
    return this.paymentService.create(paymentStoreDto);
  }

  @Post(':id/retry')
  @UsePipes(ValidationPipe)
  retry(@Param('id') id: string) {
    return this.paymentService.retry(id);
  }
}
