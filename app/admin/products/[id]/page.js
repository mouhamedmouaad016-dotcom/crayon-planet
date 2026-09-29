import { supabaseServer } from '../../../../lib/supabaseServer';
import ProductForm from '../../../../components/ProductForm';
import { notFound } from 'next/navigation';

export default async function EditProduct({ params }) {
  const supabase = supabaseServer();
  const { data: product } = await supabase.from('products').select('*').eq('id', params.id).maybeSingle();
  if (!product) return notFound();
  return <ProductForm product={product} />;
}
