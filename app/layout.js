import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CartProvider } from '../lib/cart';
import { supabaseServer } from '../lib/supabaseServer';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://crayonplanetdz.com').replace(/\/$/, '');

export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: 'CRAYON PLANET | منتجات رقمية تعليمية وإبداعية للأطفال', template: '%s | CRAYON PLANET' },
  description: 'كراسات تعليمية، تلوين، بطاقات، أنشطة، قصص وموارد رقمية قابلة للطباعة للأطفال والعائلة — تحميل فوري، الأسعار بالدينار الجزائري.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ar_DZ',
    siteName: 'CRAYON PLANET',
    title: 'CRAYON PLANET | منتجات رقمية تعليمية وإبداعية للأطفال',
    description: 'كراسات تعليمية، تلوين، بطاقات، أنشطة، قصص وموارد رقمية قابلة للطباعة للأطفال والعائلة.',
    url: '/',
    images: ['/hero.jpg'],
  },
  twitter: { card: 'summary_large_image', title: 'CRAYON PLANET', description: 'منتجات رقمية تعليمية وإبداعية للأطفال والعائلة.' },
  robots: { index: true, follow: true },
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

async function getSettings() {
  try {
    const supabase = supabaseServer();
    const { data } = await supabase.from('settings').select('*').eq('id', 1).maybeSingle();
    return data || {};
  } catch (_) {
    return {};
  }
}

export default async function RootLayout({ children }) {
  const settings = await getSettings();
  return (
    <html lang="ar" dir="rtl">
      <body>
        <CartProvider>
          <Header settings={settings} />
          <main className="max-w-5xl mx-auto px-4">{children}</main>
          <Footer settings={settings} />
        </CartProvider>
      </body>
    </html>
  );
}
