import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentClaimedException extends HttpException {
  constructor() {
    super('Payment is already claimed', HttpStatus.BAD_REQUEST);
  }
}
