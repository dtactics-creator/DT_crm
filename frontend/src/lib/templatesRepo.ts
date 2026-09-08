import supabase from './supabase';

export type PropertyType = 'text' | 'textarea' | 'image' | 'color' | 'number' | 'boolean' | 'select';

export interface TemplateProperty {
  id: string;
  label: string;
  type: PropertyType;
  options?: { label: string; value: string }[];
  default?: any;
}

export interface TemplateSection {
  id: string;
  title: string;
  properties: TemplateProperty[];
}

export interface TemplateSchema {
  sections: TemplateSection[];
}

export interface CampaignTemplateRow {
  id: string;
  name: string;
  description: string | null;
  thumbnail: string | null;
  is_default: boolean;
  status: string;
  schema: TemplateSchema;
  default_config: Record<string, any>;
  component_name: string;
  created_at?: string;
  updated_at?: string;
}

export type CampaignTemplateFormState = Omit<CampaignTemplateRow, 'id' | 'created_at' | 'updated_at'> & { id?: string };

export async function fetchAllTemplates(): Promise<CampaignTemplateRow[]> {
  const { data, error } = await supabase
    .from('dt_campaign_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching templates:', error);
    throw new Error(error.message);
  }

  return data || [];
}

export async function fetchTemplateById(id: string): Promise<CampaignTemplateRow> {
  const { data, error } = await supabase
    .from('dt_campaign_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching template:', error);
    throw new Error(error.message);
  }

  return data;
}

export async function saveTemplate(form: CampaignTemplateFormState): Promise<CampaignTemplateRow> {
  const payload = {
    name: form.name.trim(),
    description: form.description?.trim() || null,
    thumbnail: form.thumbnail?.trim() || null,
    is_default: form.is_default,
    status: form.status,
    schema: form.schema,
    default_config: form.default_config,
    component_name: form.component_name,
    updated_at: new Date().toISOString(),
  };

  if (form.is_default) {
    // If setting this to default, unset all others first
    await supabase.from('dt_campaign_templates').update({ is_default: false }).neq('id', form.id || '00000000-0000-0000-0000-000000000000');
  }

  if (form.id) {
    const { data, error } = await supabase
      .from('dt_campaign_templates')
      .update(payload)
      .eq('id', form.id)
      .select();
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Failed to update template');
    return data[0];
  } else {
    const { data, error } = await supabase
      .from('dt_campaign_templates')
      .insert(payload)
      .select();
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) throw new Error('Failed to create template');
    return data[0];
  }
}

export async function toggleTemplateStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('dt_campaign_templates')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('dt_campaign_templates')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message);
}
