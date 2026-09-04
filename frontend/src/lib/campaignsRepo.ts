import supabase from './supabase';

export interface CampaignRow {
  id: string;
  type: string;
  title: string;
  description: string;
  image: string | null;
  cta_label: string | null;
  cta_url: string | null;
  coupon_code: string | null;
  expiry: string | null;
  brand: string | null;
  qr: boolean;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
}

export type CampaignFormState = Omit<CampaignRow, 'id' | 'created_at'> & { id?: string };

export async function fetchAllCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await supabase
    .from('dt_campaigns')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching campaigns:', error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function saveCampaign(form: CampaignFormState): Promise<void> {
  const payload = {
    type: form.type.trim(),
    title: form.title.trim(),
    description: form.description?.trim() || '',
    image: form.image?.trim() || null,
    cta_label: form.cta_label?.trim() || null,
    cta_url: form.cta_url?.trim() || null,
    coupon_code: form.coupon_code?.trim() || null,
    expiry: form.expiry?.trim() || null,
    brand: form.brand?.trim() || null,
    qr: form.qr,
    is_active: form.is_active,
    sort_order: Number(form.sort_order) || 0,
  };

  if (form.id) {
    const { error } = await supabase
      .from('dt_campaigns')
      .update(payload)
      .eq('id', form.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('dt_campaigns')
      .insert(payload);
    if (error) throw new Error(error.message);
  }
}

export async function toggleCampaignActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('dt_campaigns')
    .update({ is_active })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase
    .from('dt_campaigns')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
