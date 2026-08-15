import { HttpException, HttpStatus } from '@nestjs/common';

export class MaxAttemptException extends HttpException {
  constructor() {
    super('Max attempt reached', HttpStatus.BAD_REQUEST);
  }
}
