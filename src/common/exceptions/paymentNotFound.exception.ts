import { HttpException, HttpStatus } from '@nestjs/common';

export class PaymentNotFound extends HttpException {
  constructor() {
    super('Payment Not Found', HttpStatus.NOT_FOUND);
  }
}
