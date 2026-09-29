export default function Empty({ title, sub }) {
  return (
    <div className="text-center py-10 px-4 bg-brand-soft border-2 border-dashed border-brand-yellow rounded-2xl">
      <div className="text-4xl mb-2">🖍️</div>
      <h3 className="font-bold text-lg">{title}</h3>
      {sub && <p className="text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
