import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminApplicationsQueryDto {
  @IsOptional()
  @IsUUID()
  job_id?: string;

  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  cursor?: string;
}
