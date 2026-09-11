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
  start_datetime: string | null;
  end_datetime: string | null;
  template_id: string | null;
  template_config: any | null;
  created_at?: string;
}

export type CampaignFormState = Omit<CampaignRow, 'id' | 'created_at'> & { id?: string };

export async function fetchAllCampaigns(): Promise<CampaignRow[]> {
  const { data, error } = await supabase
    .from('dt_campaigns')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching campaigns:', error);
    throw new Error(error.message);
  }

  const campaigns = data || [];
  const now = new Date();

  // Auto-deactivate expired campaigns
  const toDeactivate = campaigns.filter(c => 
    c.is_active && c.end_datetime && new Date(c.end_datetime) <= now
  );

  if (toDeactivate.length > 0) {
    toDeactivate.forEach(c => c.is_active = false);
    Promise.all(toDeactivate.map(c => 
      supabase.from('dt_campaigns').update({ is_active: false }).eq('id', c.id)
    )).catch(err => console.error('Failed to auto-deactivate campaigns', err));
  }

  return campaigns;
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
    start_datetime: form.start_datetime ? new Date(form.start_datetime).toISOString() : null,
    end_datetime: form.end_datetime ? new Date(form.end_datetime).toISOString() : null,
    template_id: form.template_id || null,
    template_config: form.template_config || null,
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
