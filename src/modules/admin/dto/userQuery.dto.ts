import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UserQueryDto {
  @IsOptional()
  @IsIn(['id', 'username', 'email', 'balance', 'createdAt'])
  sort?: string = 'createdAt';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  page: number = 1;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: string = 'asc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit: number = 50;
}
