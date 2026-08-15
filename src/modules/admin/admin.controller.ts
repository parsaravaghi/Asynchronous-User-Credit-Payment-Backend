import {
  Controller,
  Get,
  Param,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { UserQueryDto } from './dto/userQuery.dto';
import { AdminService } from './admin.service';
import { TimePeriod } from './dto/timePeriod.dto';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('/users')
  @UsePipes(
    new ValidationPipe({
      transform: true,
    }),
  )
  async users(@Query() userQueryDto: UserQueryDto) {
    return await this.adminService.showUserBlanace(userQueryDto);
  }

  @Get('users/:id')
  async userDetail(@Param('id') id: string) {
    return await this.adminService.showUserDetail(id);
  }

  @Get('/reports/aggregate')
  @UsePipes(
    new ValidationPipe({
      transform: true,
    }),
  )
  async reportAggregate(@Query() timPeriodDto: TimePeriod) {
    return this.adminService.showUserTransactions(timPeriodDto);
  }

  @Get('reports/usage/:userId')
  @UsePipes(
    new ValidationPipe({
      transform: true,
    }),
  )
  async reportUsage(@Param('userId') userId: string) {
    return this.adminService.showBalanceUsage(userId);
  }
}
