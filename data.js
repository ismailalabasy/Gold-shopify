// Fictional demo brands/products. No affiliation with real jewelry businesses.
// Replace these through the dashboard or connect Supabase for real pilot data.
export const demoShops = [
  {
    id: 'demo-nour', owner_id: 'demo', slug: 'maison-nour', name: 'Maison Nour', tagline: 'Jewels for your most luminous moments.',
    hero_title: 'Timeless gold. Modern stories.',
    hero_subtitle: 'Considered pieces for the moments worth keeping. Explore our curated collection and find your next forever favorite.',
    theme: 'ivory', whatsapp: '201000000001', address: 'Heliopolis, Cairo, Egypt', instagram: 'maisonnour.demo',
  },
  {
    id: 'demo-dahab', owner_id: 'demo', slug: 'dar-dahab', name: 'Dar Dahab', tagline: 'Gold that feels like home.',
    hero_title: 'Every piece has a story.',
    hero_subtitle: 'A celebration of Egyptian gold craftsmanship, thoughtful gifting and everyday elegance.',
    theme: 'obsidian', whatsapp: '201000000002', address: 'Mohandessin, Giza, Egypt', instagram: 'dardahab.demo',
  },
  {
    id: 'demo-joud', owner_id: 'demo', slug: 'joud-jewelry', name: 'Joud Jewelry', tagline: 'Made to be treasured.',
    hero_title: 'A little everyday magic.',
    hero_subtitle: 'Fine jewelry with a personal touch. Browse, fall in love, and visit us to try it on.',
    theme: 'sage', whatsapp: '201000000003', address: 'Maadi, Cairo, Egypt', instagram: 'joudjewelry.demo',
  },
];
const entries = [
  ['Luna Halo Ring','Rings',18,3.8,'available',null,'Delicate round gold ring with a luminous centerpiece.','ring'],
  ['Dune Cuff','Bracelets',21,8.4,'available',null,'Sculptural gold cuff with a softly hammered finish.','bracelet'],
  ['Solstice Pendant','Necklaces',18,5.1,'available',null,'An everyday keepsake inspired by the light.','necklace'],
  ['Aurora Drops','Earrings',18,2.9,'reserved',null,'Refined drop earrings with a contemporary silhouette.','earrings'],
  ['Heritage Chain','Necklaces',21,7.2,'available',null,'A delicate statement chain designed for layering.','chain'],
  ['Golden Hour Ring','Rings',21,4.5,'available',null,'A statement ring with an understated glow.','ring2'],
  ['Pearl Orbit Studs','Earrings',18,2.2,'available',null,'Simple polished earrings for every occasion.','earrings2'],
  ['Forever Link','Bracelets',18,6.8,'available',null,'The classic link, reimagined.','bracelet2'],
];
export const demoProducts = demoShops.flatMap((shop, idx) => entries.map((p, i) => ({
  id: `${shop.id}-p${i+1}`, shop_id: shop.id, title: p[0], category: p[1], karat: p[2],
  weight: p[3], status: p[4], price: p[5], show_price: false, description: p[6], image_url: '', art: p[7],
  code: `${['MN','DD','JJ'][idx]}-${String(i+1).padStart(3,'0')}`,
})));
