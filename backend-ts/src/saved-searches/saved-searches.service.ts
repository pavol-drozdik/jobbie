import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateSavedSearchDto,
  SavedSearchResponseDto,
  UpdateSavedSearchDto,
} from './saved-searches.dto';

type SavedRow = {
  id: string;
  user_id: string;
  name: string | null;
  query_json: Record<string, unknown>;
  notify_email: boolean;
  last_notified_at: string | null;
  created_at: string;
  updated_at: string;
};

function toDto(row: SavedRow): SavedSearchResponseDto {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    query_json: row.query_json,
    notify_email: row.notify_email,
    last_notified_at: row.last_notified_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

@Injectable()
export class SavedSearchesService {
  constructor(private readonly supabase: SupabaseService) {}

  async listForUser(userId: string): Promise<SavedSearchResponseDto[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('saved_searches')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) {
      return [];
    }
    return ((data ?? []) as SavedRow[]).map(toDto);
  }

  async create(
    userId: string,
    body: CreateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    const insert = {
      user_id: userId,
      name: body.name ?? null,
      query_json: body.query_json,
      notify_email: body.notify_email ?? false,
      last_notified_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabase
      .getClient()
      .from('saved_searches')
      .insert(insert)
      .select()
      .single();
    if (error || !data) {
      throw new NotFoundException(error?.message ?? 'Insert failed');
    }
    return toDto(data as SavedRow);
  }

  async update(
    userId: string,
    id: string,
    body: UpdateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) {
      patch.name = body.name;
    }
    if (body.query_json !== undefined) {
      patch.query_json = body.query_json;
    }
    if (body.notify_email !== undefined) {
      patch.notify_email = body.notify_email;
    }
    if (Object.keys(patch).length === 0) {
      return this.getOne(userId, id);
    }
    patch.updated_at = new Date().toISOString();
    const { data, error } = await this.supabase
      .getClient()
      .from('saved_searches')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error || !data) {
      throw new NotFoundException('Saved search not found');
    }
    return toDto(data as SavedRow);
  }

  async remove(userId: string, id: string): Promise<{ ok: boolean }> {
    const { error } = await this.supabase
      .getClient()
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) {
      throw new NotFoundException(error.message);
    }
    return { ok: true };
  }

  private async getOne(
    userId: string,
    id: string,
  ): Promise<SavedSearchResponseDto> {
    const { data, error } = await this.supabase
      .getClient()
      .from('saved_searches')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) {
      throw new NotFoundException('Saved search not found');
    }
    return toDto(data as SavedRow);
  }
}
