-- migration_005: تنظيف وصف المنتج (رمز � وسطر "Lughati +1") — للمراجعة فقط، لا تُنفَّذ قبل موافقتك.
-- يغيّر عمود description لصفوف محددة فقط. خذ نسخة احتياطية أو نفّذ المعاينة أولاً.

-- 1) معاينة (قراءة فقط): الصفوف التي ستتأثر
select id, name,
       description like '%' || chr(65533) || '%' as has_bad_char,
       description ~* 'lughati' as has_lughati
from public.products
where description like '%' || chr(65533) || '%' or description ~* 'lughati';

-- 2) التنظيف (يغيّر البيانات)
update public.products
set description = btrim(
      regexp_replace(
        replace(description, chr(65533), ''),
        '(^|\n)[ \t]*Lughati[^\n]*', '\1', 'gi')),
    updated_at = now()
where description like '%' || chr(65533) || '%' or description ~* 'lughati';

-- 3) تحقق: يجب ألا يعيد أي صف
select id, name from public.products
where description like '%' || chr(65533) || '%' or description ~* 'lughati';
