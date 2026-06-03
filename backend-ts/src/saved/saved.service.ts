import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { SavedCompanyItemDto } from './saved.dto';

type ProfileCardRow = {
  id: string;
  role: string;
  display_name: string | null;
  company_name: string | null;
  logo_url: string | null;
  avatar_url: string | null;
  location: string | null;
  description: string | null;
  registered_office: string | null;
  registry_verified_at: string | null;
};

@Injectable()
export class SavedService {
  constructor(private supabase: SupabaseService) {}

  async listSavedCompanyIds(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from('saved_companies')
      .select('company_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      return [];
    }
    return (data ?? []).map((r: { company_id: string }) => String(r.company_id));
  }

  async listSavedCompanies(userId: string): Promise<SavedCompanyItemDto[]> {
    const { data: bookmarks, error: bErr } = await this.supabase
      .getClient()
      .from('saved_companies')
      .select('company_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (bErr || !bookmarks?.length) {
      return [];
    }
    const order = bookmarks as { company_id: string; created_at: string }[];
    const ids = order.map((r) => r.company_id);
    const { data: profiles, error: pErr } = await this.supabase
      .getClient()
      .from('profiles')
      .select(
        'id,role,display_name,company_name,logo_url,avatar_url,location,description,registered_office,registry_verified_at',
      )
      .in('id', ids)
      .eq('role', 'company');
    if (pErr || !profiles?.length) {
      return [];
    }
    const byId = new Map<string, ProfileCardRow>();
    for (const p of profiles as ProfileCardRow[]) {
      byId.set(p.id, p);
    }
    const out: SavedCompanyItemDto[] = [];
    for (const row of order) {
      const p = byId.get(row.company_id);
      if (!p) {
        continue;
      }
      out.push({
        company_id: p.id,
        created_at: row.created_at,
        display_name: p.display_name,
        company_name: p.company_name,
        logo_url: p.logo_url,
        avatar_url: p.avatar_url,
        location: p.location,
        description: p.description,
        registered_office: p.registered_office,
        registry_verified:
          p.registry_verified_at != null &&
          String(p.registry_verified_at).length > 0,
      });
    }
    return out;
  }

  async saveCompany(userId: string, companyId: string): Promise<void> {
    if (userId === companyId) {
      throw new BadRequestException({
        code: 'CANNOT_SAVE_OWN_PROFILE',
        message: 'Nemôžete uložiť vlastný firemný profil.',
      });
    }
    const { data: target, error: tErr } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id,role')
      .eq('id', companyId)
      .maybeSingle();
    if (tErr || !target) {
      throw new NotFoundException('Firma nebola nájdená.');
    }
    const role = String((target as { role?: string }).role ?? '');
    if (role !== 'company') {
      throw new BadRequestException({
        code: 'NOT_A_COMPANY_PROFILE',
        message: 'Uložiť možno len firemný profil.',
      });
    }
    const { error } = await this.supabase
      .getClient()
      .from('saved_companies')
      .upsert(
        { user_id: userId, company_id: companyId },
        { onConflict: 'user_id,company_id', ignoreDuplicates: true },
      );
    if (error) {
      throw new BadRequestException(error.message);
    }
  }

  async unsaveCompany(userId: string, companyId: string): Promise<void> {
    await this.supabase
      .getClient()
      .from('saved_companies')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId);
  }
}
