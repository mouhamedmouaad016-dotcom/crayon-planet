import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CartProvider } from '../lib/cart';
import { supabaseServer } from '../lib/supabaseServer';
import Script from 'next/script';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://crayonplanetdz.com').replace(/\/$/, '');

export const metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'CRAYON PLANET | منتجات تعليمية وإبداعية للأطفال',
    template: '%s | CRAYON PLANET',
  },
  description: 'كراسات تعليمية، تلوين، بطاقات، قصص وموارد رقمية للطباعة للأطفال والعائلة - تحميل فوري.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ar_DZ',
    siteName: 'CRAYON PLANET',
    title: 'CRAYON PLANET | منتجات تعليمية وإبداعية للأطفال',
    description: 'كراسات تعليمية، تلوين، بطاقات، قصص وموارد رقمية للطباعة للأطفال والعائلة.',
    url: '/',
    images: ['/hero.jpg'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CRAYON PLANET',
    description: 'منتجات تعليمية وإبداعية للأطفال والعائلة.',
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

async function getSettings() {
  try {
    const supabase = supabaseServer();
    const { data } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle();

    return data || {};
  } catch (_) {
    return {};
  }
}

export default async function RootLayout({ children }) {
  const settings = await getSettings();
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

  return (
    <html lang="ar" dir="rtl">
      <body>
        {pixelId && (
          <>
            <Script
              id="meta-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window,document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${pixelId}');
                  fbq('track', 'PageView');
                `,
              }}
            />
          </>
        )}

        <CartProvider>
          <Header settings={settings} />
          <main className="max-w-5xl mx-auto px-4">{children}</main>
          <Footer settings={settings} />
        </CartProvider>
      </body>
    </html>
  );
}
