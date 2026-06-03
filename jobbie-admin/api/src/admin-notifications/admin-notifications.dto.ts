import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export type BroadcastAudience = 'all' | 'company' | 'individual';

export class AdminBroadcastDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  link_path?: string;

  @IsOptional()
  @IsIn(['all', 'company', 'individual'])
  audience?: BroadcastAudience;
}

export class BroadcastAudienceQueryDto {
  @IsOptional()
  @IsIn(['all', 'company', 'individual'])
  audience?: BroadcastAudience;
}
