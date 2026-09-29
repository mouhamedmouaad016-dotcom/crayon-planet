import { supabaseServer } from '../../lib/supabaseServer';
import Empty from '../../components/Empty';

export const metadata = { title: 'تواصل معنا', description: 'طرق التواصل مع فريق CRAYON PLANET عبر البريد ووسائل التواصل الاجتماعي.' };

export default async function Contact() {
  const supabase = supabaseServer();
  const { data: s } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
  const links = [
    s?.whatsapp && ['https://wa.me/' + s.whatsapp.replace(/\D/g, ''), 'WhatsApp'],
    s?.facebook && [s.facebook, 'Facebook'],
    s?.instagram && [s.instagram, 'Instagram'],
    s?.pinterest && [s.pinterest, 'Pinterest'],
    s?.telegram && [s.telegram, 'Telegram'],
    s?.x && [s.x, 'X'],
    s?.linkedin && [s.linkedin, 'LinkedIn'],
    s?.support_email && ['mailto:' + s.support_email, s.support_email],
  ].filter(Boolean);

  return (
    <div className="py-6">
      <h2 className="mb-3">تواصل معنا</h2>
      {links.length ? (
        <div className="flex flex-wrap gap-2">
          {links.map(([href, label]) => (
            <a key={label} href={href} target="_blank" rel="noopener" className="chip">{label}</a>
          ))}
        </div>
      ) : (
        <Empty title="قنوات التواصل قيد الإعداد" sub="ستظهر هنا فور إضافتها من لوحة الإدارة." />
      )}
    </div>
  );
}
