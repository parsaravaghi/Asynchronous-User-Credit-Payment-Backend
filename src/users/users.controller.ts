import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserStoreDto } from './dto/userStor.dto';
import { UsersService } from './users.service';
import { UserCreditDto } from './dto/userCredit.dto';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}

  @Post()
  @UsePipes(ValidationPipe)
  async store(@Body() userStoreDto: UserStoreDto) {
    return await this.userService.create(userStoreDto);
  }

  @Get(':id/balance')
  async getBalance(@Param('id') id: string) {
    return await this.userService.getUserBalance(id);
  }

  @Post(':id/credit')
  @UsePipes(ValidationPipe)
  chargeCredit(@Param('id') id: string, @Body() userCreditDto: UserCreditDto) {
    return this.userService.createUserCredit(id, userCreditDto);
  }
}
