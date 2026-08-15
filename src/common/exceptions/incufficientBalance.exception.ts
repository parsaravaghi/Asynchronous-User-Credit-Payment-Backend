import { HttpException, HttpStatus } from '@nestjs/common';

export class InsufficientBalance extends HttpException {
  constructor() {
    super('Insufficient balancae', HttpStatus.BAD_REQUEST);
  }
}
