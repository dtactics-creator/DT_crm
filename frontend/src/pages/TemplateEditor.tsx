import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Save, AlertCircle, Sparkles, PanelRightClose, PanelRightOpen, Loader2, UploadCloud, ChevronDown, ChevronRight } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Field from '../components/ui/Field';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { saveTemplate, type CampaignTemplateRow, type CampaignTemplateFormState } from '../lib/templatesRepo';
import { useToast } from '../components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSidebar } from '../components/layout/AppLayout';
import { useMasters, toOptions } from '../hooks/useMasters';
import { ColorControl } from '../components/ui/ColorPicker';
import { uploadFile } from '../lib/upload';

import GenieWishTemplate from '../components/templates/GenieWishTemplate';

const TemplatePreview = ({ config, componentName }: { config: any, componentName: string }) => {
  const [dummyReveal, setDummyReveal] = useState<any>(null);

  const handleReveal = () => {
    setDummyReveal({
      type: 'Offer',
      brand: 'Preview Brand',
      title: '25% OFF YOUR NEXT ORDER',
      description: 'Get 25% off your next purchase with this exclusive promo code.',
      couponCode: 'MAGIC25',
      expiry: '7 Days',
      cta: { label: 'Shop Now', url: '#' },
      image: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=640&auto=format&fit=crop',
    });
  };

  if (componentName === 'GenieWish') {
    return (
      <div className="w-full h-full relative overflow-y-auto overflow-x-hidden">
        <GenieWishTemplate
          config={config}
          reveal={dummyReveal}
          onReveal={handleReveal}
          onReset={() => setDummyReveal(null)}
        />
      </div>
    );
  }
  return <div className="p-8 text-center text-muted-fg">Unknown template component: {componentName}</div>;
};

// Default Schema for Genie's Wish Template
const defaultGenieSchema = {
  sections: [
    {
      id: 'home', title: 'Home',
      properties: [
        { id: 'background', label: 'Page Background Color', type: 'color', default: '#1e1b4b' },
        { id: 'bgImage', label: 'Background Image', type: 'image', default: 'night-desert.jpg' },
        { id: 'title', label: 'Main Title', type: 'text', default: 'Rub the Magic Lamp and Discover Your Surprise!' },
        { id: 'titleColor', label: 'Title Color', type: 'color', default: '#fbbf24' },
        { id: 'titleFontFamily', label: 'Title Font Family', type: 'text', default: '"Cinzel Decorative", serif' },
        { id: 'subtitle', label: 'Subtitle', type: 'text', default: 'Arabian Nights' },
        { id: 'subtitleColor', label: 'Subtitle Color', type: 'color', default: '#fcd34d' },
        { id: 'bodyFontFamily', label: 'Body Font Family', type: 'text', default: '"Cormorant Garamond", serif' },
        { id: 'lampImage', label: 'Lamp Image', type: 'image', default: 'magic-lamp.png' },
      ]
    },
    {
      id: 'reveal', title: 'Reveal Card',
      properties: [
        { id: 'modalBackground', label: 'Modal Background', type: 'color', default: '#080b13' },
        { id: 'modalTextColor', label: 'Modal Text Color', type: 'color', default: '#ffffff' },
        { id: 'modalButtonColor', label: 'Button Background', type: 'color', default: '#fbbf24' },
        { id: 'modalButtonTextColor', label: 'Button Text', type: 'color', default: '#080b13' },
        { id: 'modalAccentColor', label: 'Accent & Glow', type: 'color', default: '#fbbf24' },
      ]
    }
  ]
};

export default function TemplateEditor({ open, onClose, template, onSaved }: {
  open: boolean;
  onClose: () => void;
  template: CampaignTemplateRow | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ home: true, reveal: false });

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };
  const { setCollapsed: setMainSidebarCollapsed } = useSidebar();
  const [sidebarWidth, setSidebarWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const [activeColorProp, setActiveColorProp] = useState<string | null>(null);

  const { data: masters } = useMasters();
  const fontOpts = useMemo(() => toOptions(masters, 'campaign_font'), [masters]);

  useEffect(() => {
    if (open) {
      setMainSidebarCollapsed(true);
    } else {
      setMainSidebarCollapsed(false);
    }
  }, [open, setMainSidebarCollapsed]);

  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      let newWidth = document.body.clientWidth - e.clientX;
      if (newWidth < 300) newWidth = 300;
      if (newWidth > 800) newWidth = 800;
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, propId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // No artificial application-level size limit — actual limits are determined
    // by infrastructure (Nginx, SFTP, disk space).
    let url = URL.createObjectURL(file);
    if (file.type.startsWith('video/')) {
      url += '#video';
    }
    setPendingFiles(prev => ({ ...prev, [propId]: file }));
    setConfig(propId, url);
    if (e.target) e.target.value = '';
  };

  const [form, setForm] = useState<CampaignTemplateFormState>({
    name: 'New Template',
    description: '',
    thumbnail: '',
    is_default: false,
    status: 'inactive',
    schema: defaultGenieSchema as any,
    default_config: {
      background: '#1e1b4b', bgImage: 'night-desert.jpg',
      titleFontFamily: '"Cinzel Decorative", serif',
      bodyFontFamily: '"Cormorant Garamond", serif',
      title: 'Rub the Magic Lamp and Discover Your Surprise!', titleColor: '#fbbf24',
      subtitle: 'Arabian Nights', subtitleColor: '#fcd34d',
      lampImage: 'magic-lamp.png',
      modalBackground: '#080b13',
      modalTextColor: '#ffffff',
      modalButtonColor: '#fbbf24', modalButtonTextColor: '#080b13',
      modalAccentColor: '#fbbf24'
    },
    component_name: 'GenieWish',
  });

  useEffect(() => {
    if (open) {
      if (template) {
        setForm({
          id: template.id,
          name: template.name,
          description: template.description || '',
          thumbnail: template.thumbnail || '',
          is_default: template.is_default,
          status: template.status,
          schema: template.component_name === 'GenieWish' ? (defaultGenieSchema as any) : template.schema,
          default_config: template.default_config,
          component_name: template.component_name,
        });
      } else {
        setForm({
          name: 'New Template',
          description: '',
          thumbnail: '',
          is_default: false,
          status: 'inactive',
          schema: defaultGenieSchema as any,
          default_config: {
            background: '#1e1b4b', bgImage: 'night-desert.jpg',
            googleFontUrl: 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&display=swap',
            titleFontFamily: '"Cinzel Decorative", serif',
            bodyFontFamily: '"Cormorant Garamond", serif',
            title: 'Rub the Magic Lamp and Discover Your Surprise!', titleColor: '#fbbf24',
            subtitle: 'Arabian Nights', subtitleColor: '#fcd34d',
            lampImage: 'magic-lamp.png',
            modalBackground: '#080b13',
            modalTextColor: '#ffffff',
            modalButtonColor: '#fbbf24', modalButtonTextColor: '#080b13',
            modalAccentColor: '#fbbf24'
          },
          component_name: 'GenieWish',
        });
      }
    }
  }, [open, template]);

  useEffect(() => {
    if (!masters) return;
    const fonts = masters.filter(m => m.category === 'campaign_font');
    const titleFont = fonts.find(f => f.value === form.default_config.titleFontFamily);
    const bodyFont = fonts.find(f => f.value === form.default_config.bodyFontFamily);

    const extractUrl = (str?: string | null) => {
      if (!str) return null;
      const urlPart = str.split('|||')[0];
      const match = urlPart.match(/href="([^"]+)"/);
      if (match) return match[1];
      if (urlPart.startsWith('http')) return urlPart;
      return null;
    };

    const url1 = extractUrl(titleFont?.description);
    const url2 = extractUrl(bodyFont?.description);

    const urls = [];
    if (url1) urls.push(url1);
    if (url2 && url2 !== url1) urls.push(url2);
    const newGoogleFontUrl = urls.join(',');

    if (form.default_config.googleFontUrl !== newGoogleFontUrl) {
      setForm(prev => ({ ...prev, default_config: { ...prev.default_config, googleFontUrl: newGoogleFontUrl } }));
    }
  }, [masters, form.default_config.titleFontFamily, form.default_config.bodyFontFamily]);

  const setConfig = (k: string, v: any) => {
    setForm(prev => ({ ...prev, default_config: { ...prev.default_config, [k]: v } }));
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      let finalConfig = { ...form.default_config };
      const oldUrlsToClean: string[] = [];

      for (const [propId, file] of Object.entries(pendingFiles)) {
        if (!file) continue;

        const result = await uploadFile(file as File);

        if (template && template.default_config[propId]) {
          oldUrlsToClean.push(template.default_config[propId]);
        }

        finalConfig[propId] = result.url;
      }

      let finalThumbnail = form.thumbnail;
      const assetProps = form.schema?.sections?.find((s: any) => s.id === 'assets' || s.title === 'Visual Assets')?.properties?.filter((p: any) => p.type === 'image') || [];
      const imageProps = assetProps.length > 0 ? assetProps : form.schema?.sections?.flatMap((s: any) => s.properties)?.filter((p: any) => p.type === 'image') || [];
      if (imageProps.length > 0) {
        finalThumbnail = finalConfig[imageProps[0].id] || form.thumbnail;
      }

      const formToSave = { ...form, default_config: finalConfig, thumbnail: finalThumbnail };

      if (oldUrlsToClean.length > 0) {
        import('../lib/utils').then(({ deleteStorageImages }) => {
          deleteStorageImages(oldUrlsToClean);
        });
      }

      return saveTemplate(formToSave);
    },
    onSuccess: () => {
      toast('Template saved successfully', 'success');
      setPendingFiles({});
      onSaved();
    },
    onError: (e: Error) => toast(`Error saving template: ${e.message}`, 'error'),
  });

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="absolute inset-0 z-50 flex flex-row-reverse bg-slate-950 overflow-hidden"
        >
          {/* Floating Expand Button (visible only when collapsed) */}
          <AnimatePresence>
            {collapsed && (
              <motion.button
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                onClick={() => setCollapsed(false)}
                className="absolute right-4 top-4 z-50 h-10 w-10 rounded-xl bg-surface border border-app shadow-lg flex items-center justify-center text-base-fg hover:bg-surface-2 transition-colors"
              >
                <PanelRightOpen className="h-5 w-5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Editor Panel */}
          <motion.div
            initial={{ marginRight: -sidebarWidth }} animate={{ marginRight: collapsed ? -sidebarWidth : 0 }} exit={{ marginRight: -sidebarWidth }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{ width: sidebarWidth }}
            className="bg-surface border-l border-app flex flex-col h-full shadow-2xl relative z-10 shrink-0"
          >
            {/* Drag Handle */}
            <div
              onMouseDown={(e) => { e.preventDefault(); setIsResizing(true); }}
              className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-brand-500/50 z-50 group"
            >
              <div className={`absolute inset-y-0 left-[0.5px] w-[1px] ${isResizing ? 'bg-brand-500' : 'bg-transparent group-hover:bg-brand-500/50'}`} />
            </div>
            <div className="h-16 px-5 border-b border-app flex items-center justify-between shrink-0 bg-surface-2">
              <div className="flex items-center gap-2 text-brand-600">
                {/* <Sparkles className="h-5 w-5" /> */}
                <h2 className="font-bold text-base-fg">Template Builder</h2>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setCollapsed(true)} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-3 transition-colors" title="Collapse Sidebar">
                  <PanelRightClose className="h-4.5 w-4.5" />
                </button>
                <button onClick={onClose} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-fg hover:bg-surface-3 transition-colors" title="Close">
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div className="rounded-xl border border-app bg-surface-2 p-4 shadow-sm space-y-4">
                <h3 className="text-[11.5px] font-bold text-subtle-fg uppercase tracking-wider">Meta Information</h3>
                <div className="space-y-4">
                  <Field label="Template Name">
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Enter template name" />
                  </Field>
                  <Field label="Description">
                    <Input value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Enter template description" />
                  </Field>
                  <Field label="Status">
                    <SearchableSelect
                      value={form.status}
                      onChange={v => setForm(f => ({ ...f, status: v }))}
                      options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
                    />
                  </Field>
                </div>
              </div>

              {form.schema.sections.map((sec: any) => (
                <div key={sec.id} className="rounded-xl border border-app bg-surface-2 shadow-sm">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-3 transition-colors"
                    onClick={() => toggleSection(sec.id)}
                  >
                    <h3 className="text-[11.5px] font-bold text-subtle-fg uppercase tracking-wider">{sec.title}</h3>
                    {expandedSections[sec.id] ? <ChevronDown className="h-4 w-4 text-muted-fg" /> : <ChevronRight className="h-4 w-4 text-muted-fg" />}
                  </div>
                  <AnimatePresence initial={false}>
                    {expandedSections[sec.id] && (
                      <motion.div
                        initial={{ height: 0, overflow: 'hidden' }}
                        animate={{ height: 'auto', overflow: 'visible' }}
                        exit={{ height: 0, overflow: 'hidden' }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                      >
                        <div className="space-y-4 p-4 pt-0">
                          {sec.properties.map((prop: any) => (
                            <Field key={prop.id} label={prop.label}>
                              {prop.type === 'image' ? (
                                <div className="flex gap-3 items-start">
                                  <div className="flex-1">
                                    <Input
                                      value={form.default_config[prop.id] ?? prop.default}
                                      onChange={e => {
                                        setConfig(prop.id, e.target.value);
                                        setPendingFiles(prev => {
                                          const next = { ...prev };
                                          delete next[prop.id];
                                          return next;
                                        });
                                      }}
                                      placeholder={`Enter ${prop.label.toLowerCase()} URL or upload...`}
                                    />
                                  </div>
                                  <div>
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      onClick={() => document.getElementById(`img-upload-${prop.id}`)?.click()}
                                    >
                                      <UploadCloud className="h-4 w-4 mr-2" />
                                      Upload
                                    </Button>
                                    <input
                                      type="file"
                                      id={`img-upload-${prop.id}`}
                                      className="hidden"
                                      accept="image/*,video/*"
                                      onChange={(e) => handleImageUpload(e, prop.id)}
                                    />
                                  </div>
                                </div>
                              ) : prop.type === 'color' || prop.id.toLowerCase().includes('color') || prop.id === 'background' ? (
                                <ColorControl
                                  value={form.default_config[prop.id] ?? prop.default}
                                  onChange={(v) => setConfig(prop.id, v)}
                                  isActive={activeColorProp === prop.id}
                                  onToggle={() => setActiveColorProp(prev => prev === prop.id ? null : prop.id)}
                                />
                              ) : prop.id.toLowerCase().includes('font') && !prop.id.toLowerCase().includes('url') ? (
                                <SearchableSelect
                                  value={form.default_config[prop.id] ?? prop.default}
                                  onChange={v => setConfig(prop.id, v)}
                                  options={fontOpts}
                                  placeholder={`Select ${prop.label.toLowerCase()}`}
                                />
                              ) : (
                                <Input
                                  value={form.default_config[prop.id] ?? prop.default}
                                  onChange={e => setConfig(prop.id, e.target.value)}
                                  placeholder={`Enter ${prop.label.toLowerCase()}`}
                                />
                              )}
                            </Field>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <div className="p-5 border-t border-app bg-surface-2 shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] text-muted-fg">
                <AlertCircle className="h-4 w-4" />
                Live Preview
              </div>
              <Button onClick={() => saveMut.mutate()} loading={saveMut.isPending} icon={<Save className="h-4 w-4" />}>
                Save Template
              </Button>
            </div>
          </motion.div>

          {/* Live Preview Panel */}
          <div className="flex-1 h-full relative z-0 overflow-hidden bg-surface">
            <TemplatePreview config={form.default_config} componentName={form.component_name} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
