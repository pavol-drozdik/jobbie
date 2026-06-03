import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminUserSearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class GrantCreditsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  amount!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}

export class CloseAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  confirm_phrase!: string;
}
