import { HttpException, HttpStatus } from '@nestjs/common';

export class UserDuplicateException extends HttpException {
  constructor() {
    super('user duplicate exception', HttpStatus.CONFLICT);
  }
}
