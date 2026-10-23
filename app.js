import { CONFIG } from './config.js';
import { demoShops, demoProducts } from './data.js';
import { jewelryArt } from './art.js';

const app = document.querySelector('#app');
const isLive = Boolean(CONFIG.supabaseUrl && CONFIG.supabasePublishableKey);
let supabase = null;
let state = {
  live: isLive, shops: [], shop: null, products: [], user: null, adminUnlocked: false,
  view: 'overview', category: 'All', karat: 'All', search: '', modalId: null,
};
const categories = ['All','Rings','Necklaces','Earrings','Bracelets','Other'];
const themes = [{id:'ivory',name:'Ivory & Gold'},{id:'obsidian',name:'Midnight Gold'},{id:'sage',name:'Sage & Gold'}];
const storageKey = 'atelier-jewelry-mvp-v1';
const newId = () => globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2));
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const enc = encodeURIComponent;
const fmtMoney = val => new Intl.NumberFormat('en-EG', {style:'currency',currency:'EGP',maximumFractionDigits:0}).format(Number(val)||0);
const slugify = val => String(val).toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s-]/g,'').trim().replace(/\s+/g,'-').replace(/-+/g,'-').slice(0,60);
const url = (admin=false, slug=state.shop?.slug, product='') => {
  const p = new URLSearchParams(); if(slug) p.set('store',slug); if(admin)p.set('admin','1');if(product)p.set('product',product);
  return window.location.pathname + (p.size ? '?' + p.toString() : '');
};
const safeImage = src => {
  const s=String(src||'').trim();
  if (/^https:\/\//i.test(s)) return s;
  if (/^data:image\/(png|jpeg|webp|gif);base64,/i.test(s)) return s;
  return '';
};
const socialUrl = handle => /^[@a-zA-Z0-9._]+$/.test(handle||'') ? `https://www.instagram.com/${handle.replace('@','')}/` : '';
const phoneForWA = shop => String(shop?.whatsapp||'').replace(/\D/g,'');
const whatsappHref = (p=null, variant='query') => {
  const phone=phoneForWA(state.shop);
  if(!phone)return '#';
  const name = p?.title || 'your jewelry collection';
  const message = variant === 'visit' ? `Hello ${state.shop.name}! I'd like to request a visit to see ${name} (${p?.code||''}). Is it available?` : `Hello ${state.shop.name}! I'm interested in ${name}${p?.code ? ' ('+p.code+')' : ''}. Can you share more details and the current price?`;
  return `https://wa.me/${phone}?text=${enc(message + (p ? '\n'+new URL(url(false,state.shop.slug,p.id),location.origin).href : ''))}`;
};
const productImage = (p,variant='') => safeImage(p.image_url) ? `<img src="${esc(safeImage(p.image_url))}" alt="${esc(p.title)}" loading="lazy" />` : jewelryArt(p.art||mapArt(p.category),variant);
const mapArt = cat => ({Rings:'ring',Necklaces:'necklace',Earrings:'earrings',Bracelets:'bracelet'})[cat]||'ring';
function toast(message, error=false){const n=document.createElement('div');n.className='toast'+(error?' error':'');n.textContent=message;document.querySelector('#toasts').append(n);setTimeout(()=>n.remove(),4800)}
function errorMessage(e){return (e && e.message) ? e.message : String(e)}
function getDemoDb(){
  try {const x=JSON.parse(localStorage.getItem(storageKey)||'null'); if(x?.shops && x?.products)return x;}catch(e){}
  return {shops:structuredClone(demoShops),products:structuredClone(demoProducts)};
}
function persistDemo(){if(state.live)return;let db=getDemoDb(); if(state.shops.length)db.shops=state.shops; db.products=state.productsAll||db.products;try{localStorage.setItem(storageKey,JSON.stringify(db));}catch(e){toast('Browser storage is full. Try smaller product images.',true)}}
function route(){const q=new URLSearchParams(location.search);return {admin:q.get('admin')==='1',slug:q.get('store'),product:q.get('product')};}
function navTo(admin=false,slug=state.shop?.slug,product=''){history.pushState({},'',url(admin,slug,product));closeModal();state.category='All';state.karat='All';state.search='';renderRoot();window.scrollTo(0,0)}
function getDemoShop(slug){return state.shops.find(s=>s.slug===slug) || state.shops[0] || null}
async function connect(){
  if(!state.live){const db=getDemoDb();state.shops=db.shops;state.productsAll=db.products;return;}
  try{
    const module=await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase=module.createClient(CONFIG.supabaseUrl,CONFIG.supabasePublishableKey);
    const {data:{session},error}=await supabase.auth.getSession();if(error)throw error;
    state.user=session?.user||null;
  }catch(e){
    app.innerHTML=`<div class="loading-screen" style="padding:30px;display:block;text-align:center;height:auto;margin:80px auto;max-width:520px"><h2>Cannot connect to Supabase</h2><p>${esc(errorMessage(e))}</p><p>Check <code>config.js</code>, your internet connection and database setup.</p></div>`;
    throw e;
  }
}
async function fetchData(){
  if(!state.live){
    state.shop=getDemoShop(route().slug);state.products=state.productsAll.filter(p=>p.shop_id===state.shop?.id);return;
  }
  const {admin,slug}=route();
  let owned=[];
  if(admin && state.user){
    const {data,error}=await supabase.from('shops').select('*').eq('owner_id',state.user.id).order('created_at',{ascending:true});
    if(error)throw error;owned=data||[];state.shops=owned;
  }
  if(admin){state.shop=owned.find(s=>s.slug===slug)||owned[0]||null;}
  else{
    const q=slug ? supabase.from('shops').select('*').eq('slug',slug).maybeSingle() : supabase.from('shops').select('*').order('created_at',{ascending:true}).limit(1).maybeSingle();
    const {data,error}=await q;if(error)throw error;state.shop=data||null;
  }
  if(!state.shop){state.products=[];return;}
  const {data,error}=await supabase.from('products').select('*').eq('shop_id',state.shop.id).order('created_at',{ascending:false});
  if(error)throw error;state.products=data||[];
}
const mark = `<svg class="logo-mark" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M5 19 15 7h12l10 12-16 17L5 19Z" stroke="currentColor" stroke-width="1.7"/><path d="M5 19h32M15 7l6 12 6-12M21 19v17" stroke="currentColor" stroke-width="1.2"/></svg>`;
function nameMark(shop){return `<span class="brand-wordmark">${mark}<span>${esc(shop?.name||'Atelier')}</span></span>`;}
function demoShopSelector(){if(state.live)return '';return `<select class="shop-picker" id="shop-selector" aria-label="Preview a demo jewelry shop">${state.shops.map(s=>`<option value="${esc(s.slug)}" ${state.shop?.slug===s.slug?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`}
function publicProductCard(p,i){
  return `<article class="product-card" data-action="product" data-id="${esc(p.id)}" tabindex="0" role="button" aria-label="View ${esc(p.title)}"><div class="product-image alt${i%4}">${productImage(p)}<span class="product-badge ${p.status==='reserved'?'reserved':''}">${p.status==='reserved'?'Reserved':'Discover'}</span></div><div class="product-caption"><h3>${esc(p.title)}</h3><div class="product-meta">${esc(p.karat)}K gold ${p.weight?' · '+esc(p.weight)+'g':''} · ${esc(p.category)}</div><span class="product-price">${p.show_price&&p.price!=null?fmtMoney(p.price):'Price on request'}</span><span class="product-arrow">↗</span></div></article>`;
}
function publicProducts(){
  let items=state.products.filter(p=>p.status!=='sold');
  if(state.category!=='All')items=items.filter(p=>p.category===state.category);
  if(state.karat!=='All')items=items.filter(p=>String(p.karat)===state.karat);
  return `<div class="catalog-tools"><div class="tabs" role="group" aria-label="Filter by jewelry category">${categories.filter(c=>c==='All'||state.products.some(p=>p.category===c&&p.status!=='sold')).map(c=>`<button data-action="category" data-cat="${esc(c)}" class="tab ${state.category===c?'active':''}">${esc(c)}</button>`).join('')}</div><div class="filter-right"><span>${items.length} pieces</span><select class="tiny-select" id="karat-filter" aria-label="Filter by karat"><option value="All">All karats</option>${[18,21,24,14].map(k=>`<option value="${k}" ${state.karat===String(k)?'selected':''}>${k}K gold</option>`).join('')}</select></div></div><div class="product-grid">${items.length?items.map(publicProductCard).join(''):'<div class="empty-state">No pieces in this category yet. Explore another collection.</div>'}</div>`;
}
function renderPublic(){
  if(!state.shop){app.innerHTML=`<div class="loading-screen" style="flex-direction:column"><h1>No storefront found</h1><p>Ask the shop owner for the correct storefront link.</p><a class="btn btn-outline" href="${esc(url(true,'', ''))}">Merchant login</a></div>`;return;}
  const s=state.shop;
  const insta=socialUrl(s.instagram);const hasPhone=phoneForWA(s);
  document.title=`${s.name} · Fine jewelry`;
  app.innerHTML=`<div class="storefront theme-${esc(s.theme||'ivory')}">
    ${!state.live?'<div class="demo-banner">✦ Interactive demo · Fictional jewelry shops · Changes in this mode stay in your browser</div>':''}
    <div class="announcement">AN EDITORIAL JEWELRY EXPERIENCE · CRAFTED FOR YOUR SHOP</div>
    <header class="store-header"><div class="container head-inner"><a href="${esc(url(false,s.slug))}" class="brand-home" aria-label="Store homepage">${nameMark(s)}</a><nav class="store-nav"><a href="#collection">Collections</a><a href="#story">Our story</a><a href="#visit">Visit us</a></nav><div class="head-right">${demoShopSelector()}<a class="head-btn" href="${esc(url(true,s.slug))}">Merchant login ↗</a></div></div></header>
    <main><section class="hero"><div class="container hero-grid"><div class="hero-copy"><div class="eyebrow">THE ART OF EVERYDAY TREASURES</div><h1>${esc(s.hero_title||'Made to be treasured.')}</h1><p>${esc(s.hero_subtitle||s.tagline||'Explore our jewelry collection and find your forever piece.')}</p><div class="hero-actions"><a href="#collection" class="btn btn-primary">Explore the collection <span>↗</span></a>${hasPhone?`<a class="btn btn-outline" href="${esc(whatsappHref())}" target="_blank" rel="noopener noreferrer">Ask us on WhatsApp ↗</a>`:''}</div><div class="hero-foot"><span class="tiny-seal">✧</span><span>Curated with care · Visit the shop to see your piece</span></div></div><div class="hero-visual">${jewelryArt('ring2','hero-ring')}<div class="stamp"><span>MADE FOR YOUR MOMENT</span><b>Small treasures, big stories.</b></div></div></div></section>
    <div class="container trustline"><div class="trust-item"><span class="trust-ico">◇</span><span><strong>Jewelry with character</strong><br />Selected collections</span></div><div class="trust-item"><span class="trust-ico">✦</span><span><strong>Ask us anything</strong><br />Personal assistance</span></div><div class="trust-item"><span class="trust-ico">⌖</span><span><strong>Discover in person</strong><br />Visit our showroom</span></div></div>
    <section class="section" id="collection"><div class="container"><div class="section-kicker"><div><div class="eyebrow">OUR COLLECTION</div><h2>Pieces to fall in love with</h2></div><p>Explore the details. Have a question? Ask us directly about any piece or arrange a visit to see it in person.</p></div><div id="products-root">${publicProducts()}</div></div></section>
    <section class="story-block" id="story"><div class="container story-grid"><div class="story-ornament"><span>✧</span></div><div><div class="eyebrow">THE PEOPLE BEHIND THE PIECES</div><h2>Jewelry that stays with you.</h2><p>${esc(s.tagline||'Our pieces are made for life’s little celebrations.')} Browse the collection at your own pace, then reach out to see the pieces you love in person.</p>${hasPhone?`<a class="btn btn-gold" href="${esc(whatsappHref())}" target="_blank" rel="noopener noreferrer" style="margin-top:18px">Talk to the shop ↗</a>`:''}</div></div></section></main>
    <footer class="store-footer" id="visit"><div class="container"><div class="footer-grid"><div>${nameMark(s)}<p>${esc(s.address||'Visit our showroom for details')}</p></div><div class="footer-links">${hasPhone?`<a href="${esc(whatsappHref())}" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>`:''}${insta?`<a href="${esc(insta)}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>`:''}<a href="${esc(url(true,s.slug))}">Merchant login</a></div></div><div class="fineprint">Availability and prices are confirmed directly by the shop. This website does not process online purchases. ${!state.live?'Fictional demonstration inventory.':''}</div></div></footer>
    </div>`;
  if(route().product){const p=state.products.find(x=>x.id===route().product && x.status!=='sold');if(p)openModal(p.id,false);}
}
function openModal(id,updateUrl=true){
  const p=state.products.find(x=>String(x.id)===String(id));if(!p)return;
  closeModal(false);state.modalId=id;
  if(updateUrl && !route().admin)history.pushState({},'',url(false,state.shop.slug,id));
  const node=document.createElement('div');node.className='overlay';node.id='product-overlay';node.innerHTML=`<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(p.title)}"><button type="button" class="modal-close" data-action="close-modal" aria-label="Close">×</button><div class="product-modal-inner"><div class="modal-image">${productImage(p)}</div><div class="modal-details"><div class="eyebrow">${esc(p.category)} · ${esc(p.code||'HANDPICKED')}</div><h2>${esc(p.title)}</h2><p>${esc(p.description||'A refined piece from our curated jewelry collection.')}</p><div class="spec-row"><span>Material</span><b>${esc(p.karat)}K gold</b></div>${p.weight?`<div class="spec-row"><span>Weight</span><b>${esc(p.weight)} g</b></div>`:''}<div class="spec-row"><span>Availability</span><b>${p.status==='reserved'?'Reserved — ask us':'Confirm with shop'}</b></div><div class="spec-row"><span>Pricing</span><b>${p.show_price&&p.price!=null?fmtMoney(p.price):'Price on request'}</b></div><div class="modal-actions">${phoneForWA(state.shop)?`<a class="btn btn-primary" href="${esc(whatsappHref(p,'query'))}" target="_blank" rel="noopener noreferrer">Ask about this piece ↗</a><a class="btn btn-outline" href="${esc(whatsappHref(p,'visit'))}" target="_blank" rel="noopener noreferrer">Request an in-store viewing ↗</a>`:'<span class="muted">Contact the store for details.</span>'}<button class="btn btn-outline" data-action="copy-link">Copy product link ↗</button></div><p class="modal-note">No online purchase or reservation is confirmed through this site. The shop confirms details directly.</p></div></div></div>`;
  node.addEventListener('click',ev=>{if(ev.target===node)closeModal()});document.body.append(node);document.body.classList.add('modal-open');
}
function closeModal(updateUrl=true){const n=document.querySelector('#product-overlay, #edit-overlay');if(n)n.remove();document.body.classList.remove('modal-open');state.modalId=null;if(updateUrl && !route().admin && route().product)history.replaceState({},'',url(false,state.shop?.slug));}
function overview(){
  const total=state.products.length, active=state.products.filter(p=>p.status==='available').length, publicCount=state.products.filter(p=>p.status!=='sold').length;
  const checkoutLink=new URL(url(false,state.shop?.slug),location.origin).href;
  return `<div class="eyebrow">GOOD TO SEE YOU</div><h2 style="font:normal 37px var(--serif);margin:10px 0 6px">Your showroom, in one place.</h2><p class="intro">Manage your collection, keep the public catalog current, and share your own branded jewelry website.</p>
  <div class="stat-grid"><div class="stat"><span class="small-label">Total products</span><strong>${total}</strong><span class="stat-icon">◇</span></div><div class="stat"><span class="small-label">Available</span><strong>${active}</strong><span class="stat-icon">✧</span></div><div class="stat"><span class="small-label">Visible in catalog</span><strong>${publicCount}</strong><span class="stat-icon">◉</span></div></div>
  <div class="admin-split"><div class="panel"><h3>Make your store launch-ready</h3><div class="checklist"><div class="check"><em>✓</em><div><b>Set up your identity</b><div class="muted">Shop name, colors, hero message and contact details.</div></div></div><div class="check"><em>✓</em><div><b>Add your jewelry</b><div class="muted">Photos, karat, weight, and whether to show a price.</div></div></div><div class="check"><em>✓</em><div><b>Keep it accurate</b><div class="muted">Mark items as available, reserved or sold as stock changes.</div></div></div><div class="check"><em>✓</em><div><b>Share your link</b><div class="muted">Customers browse and ask questions directly via WhatsApp.</div></div></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" data-action="add-product">+ Add a product</button><button class="btn btn-outline" data-action="copy-store">Copy store link</button></div></div></div><div class="panel"><h3>Your live-looking showroom</h3><div class="preview-card">${mark}<h3>${esc(state.shop?.name)}</h3><p>${esc(state.shop?.tagline)}</p></div><div class="slug-chip" style="margin-top:16px">${esc(checkoutLink)}</div><p>Share this link after you connect a live database. In demo mode, edits are saved only in this browser.</p><button class="btn btn-outline btn-small" data-action="preview">Preview your store ↗</button></div></div>`;
}
function productsAdmin(){
 let ps=state.products;
 if(state.search)ps=ps.filter(p=>(p.title+' '+p.code+' '+p.category).toLowerCase().includes(state.search.toLowerCase()));
 return `<div style="display:flex;align-items:start;justify-content:space-between;gap:15px;flex-wrap:wrap"><div><div class="eyebrow">PRODUCT MANAGEMENT</div><h2 style="font:normal 35px var(--serif);margin:9px 0 7px">Your collection</h2><p class="intro">Create and update the products visitors see in your showroom.</p></div><button class="btn btn-primary" data-action="add-product">+ Add product</button></div><div class="panel" style="margin-top:26px"><div style="display:flex;align-items:center;justify-content:space-between;gap:15px;flex-wrap:wrap;margin-bottom:19px"><b style="font-size:14px">All products <span class="muted">(${ps.length})</span></b><input id="search-products" value="${esc(state.search)}" placeholder="Search products…" aria-label="Search products" style="border:1px solid #e4e6df;border-radius:6px;padding:11px;font-size:13px;max-width:260px;width:100%"></div><div class="table-wrap"><table class="data-table"><thead><tr><th>Piece</th><th>Karat / weight</th><th>Price</th><th>Status</th><th>Actions</th></tr></thead><tbody>${ps.map(p=>`<tr><td><div class="table-prod"><div class="table-thumb">${productImage(p)}</div><div><b>${esc(p.title)}</b><div class="muted" style="font-size:11px;margin-top:5px">${esc(p.code||p.category)}</div></div></div></td><td>${esc(p.karat)}K<br><span class="muted">${p.weight?esc(p.weight)+' g':'—'}</span></td><td>${p.show_price&&p.price!=null?fmtMoney(p.price):'<span class="muted">On request</span>'}</td><td><span class="status ${esc(p.status)}">${esc(p.status)}</span></td><td><button class="icon-btn" title="Edit product" data-action="edit-product" data-id="${esc(p.id)}">✎</button> <button class="icon-btn" title="Delete product" data-action="delete-product" data-id="${esc(p.id)}">×</button></td></tr>`).join('')||'<tr><td colspan="5" class="muted" style="padding:32px;text-align:center">No products. Add your first piece to get started.</td></tr>'}</tbody></table></div></div>`;
}
function storeSettings(){const s=state.shop;return `<div class="eyebrow">PERSONALIZE YOUR STOREFRONT</div><h2 style="font:normal 35px var(--serif);margin:10px 0 7px">Your store identity</h2><p class="intro">Start with a beautiful wordmark and curated colors. Full branding is optional.</p><div class="settings-grid" style="margin-top:27px"><div class="panel"><form id="settings-form" class="form-grid"><div class="field full"><label class="required" for="set-name">Shop name</label><input id="set-name" name="name" maxlength="80" required value="${esc(s.name)}"></div><div class="field full"><label for="set-tagline">Short tagline</label><input id="set-tagline" name="tagline" maxlength="170" value="${esc(s.tagline)}"></div><div class="field full"><label class="required" for="set-headline">Homepage headline</label><input id="set-headline" name="hero_title" maxlength="130" required value="${esc(s.hero_title)}"></div><div class="field full"><label for="set-subtitle">Homepage introduction</label><textarea id="set-subtitle" name="hero_subtitle" maxlength="360">${esc(s.hero_subtitle)}</textarea></div><div class="field"><label for="set-wa">WhatsApp (with country code)</label><input id="set-wa" name="whatsapp" placeholder="2010XXXXXXXX" inputmode="tel" value="${esc(s.whatsapp)}"><span class="help">No + sign. Example: 201012345678</span></div><div class="field"><label for="set-insta">Instagram username</label><input id="set-insta" name="instagram" placeholder="yourshop" value="${esc(s.instagram||'')}"></div><div class="field full"><label for="set-address">Shop address</label><input id="set-address" name="address" maxlength="230" value="${esc(s.address||'')}"></div><div class="field full"><label>Choose a visual style</label><div class="theme-pick">${themes.map(t=>`<button type="button" class="theme-option ${s.theme===t.id?'active':''}" data-action="pick-theme" data-theme="${t.id}"><div class="theme-swatch swatch-${t.id}"><span></span></div>${esc(t.name)}</button>`).join('')}</div><input type="hidden" name="theme" id="theme-value" value="${esc(s.theme||'ivory')}"></div><div class="field full"><button class="btn btn-primary" type="submit">Save changes ↗</button></div></form></div><div><div class="panel"><h3>How your name appears</h3><div class="preview-card" id="brand-preview">${nameMark(s)}<p>${esc(s.tagline)}</p></div><p>We use a clean typographic logo by default. Merchants can add a professional logo in a later version.</p></div><div class="tip" style="margin-top:17px"><b>Store URL:</b><br>${esc(new URL(url(false,s.slug),location.origin).href)}<br><br>Each merchant has a unique storefront URL. Custom domains are planned for a later version.</div></div></div>`}
function noOwnedShops(){return `<div class="panel" style="max-width:600px;margin-top:32px"><div class="eyebrow">WELCOME TO ATELIER</div><h2 style="font:normal 37px var(--serif);margin:14px 0">${state.shops.length?'Create another store':'Create your first store'}</h2><p class="intro">One shared platform, your own branded storefront. Start with a name and connect your details later.</p><form id="create-store-form" class="form-grid" style="margin-top:20px"><div class="field full"><label class="required">Jewelry shop name</label><input name="name" placeholder="e.g. Nour Fine Jewellery" minlength="2" maxlength="80" required autofocus></div><div class="field full"><label class="required">Store URL identifier (lowercase English)</label><input name="slug" placeholder="e.g. nour-jewelry" pattern="[a-z0-9]+(-[a-z0-9]+)*" maxlength="60" minlength="3" required><span class="help">Shown in your store link. Cannot contain spaces or Arabic characters.</span></div><div class="field full"><label>WhatsApp with country code</label><input name="whatsapp" placeholder="2010XXXXXXXX" inputmode="tel"></div><div class="field full"><button class="btn btn-primary" type="submit">Create my store ↗</button></div></form></div>`}
function renderAdmin(){
  if(state.live && !state.user)return renderLogin();
  if(!state.live && !state.adminUnlocked)return renderLogin();
  document.title='Merchant dashboard · Atelier';
  const hasShop=Boolean(state.shop);
  app.innerHTML=`<div class="admin"><aside class="sidebar"><a class="brand-wordmark" href="${esc(url(false,state.shop?.slug))}">${mark}<span>atelier</span></a><div class="sidebar-tag">MERCHANT STUDIO</div><nav class="side-nav" aria-label="Dashboard navigation"><button class="side-link ${state.view==='overview'?'active':''}" data-action="admin-view" data-view="overview"><span class="sicon">▦</span> Overview</button><button class="side-link ${state.view==='products'?'active':''}" data-action="admin-view" data-view="products"><span class="sicon">◇</span> Products</button><button class="side-link ${state.view==='settings'?'active':''}" data-action="admin-view" data-view="settings"><span class="sicon">⚙</span> Branding & settings</button><button class="side-link" data-action="preview"><span class="sicon">↗</span> View website</button><button class="side-link ${state.view==='new-store'?'active':''}" data-action="admin-view" data-view="new-store"><span class="sicon">＋</span> New store</button></nav><div class="sidebar-bottom"><p>Built for the way independent jewelry shops really work.</p><button data-action="logout">← ${state.live?'Sign out':'Leave demo dashboard'}</button></div></aside><main class="admin-main"><div class="admin-header"><div><h1>${hasShop?esc(state.shop.name):'Create your store'}</h1><small>Jewelry storefront studio</small></div><div class="admin-head-actions">${hasShop && state.shops.length>1?`<select class="tiny-select" id="owned-store-picker" aria-label="Choose merchant store">${state.shops.map(s=>`<option value="${esc(s.slug)}" ${state.shop.slug===s.slug?'selected':''}>${esc(s.name)}</option>`).join('')}</select>`:''}${hasShop?'<button class="btn btn-outline btn-small" data-action="preview">Preview store ↗</button>':''}</div></div><div class="admin-content">${!state.live?'<div class="notice"><strong>Demo mode:</strong> Products and settings save only in this browser. Configure Supabase before inviting real pilot merchants.</div>':''}${hasShop && state.view!=='new-store'?(state.view==='overview'?overview():state.view==='products'?productsAdmin():storeSettings()):noOwnedShops()}</div></main></div>`;
}
function renderLogin(){
  document.title='Merchant login · Atelier';
  app.innerHTML=`<div class="login-wrap"><section class="login-side">${jewelryArt('necklace')}<div class="eyebrow" style="color:#d2ba8b">MERCHANT STUDIO</div><h2>Beautiful stores.<br />Built for jewelry.</h2><p>Your own digital showroom, a simple dashboard, and one easy way for customers to discover your pieces.</p></section><section class="login-card-wrap"><div class="login-card"><button class="backlink" data-action="public">← Back to the showroom</button><div class="brand-wordmark" style="margin-bottom:48px">${mark}<span>atelier</span></div><div class="eyebrow">MERCHANT ACCESS</div><h1>Welcome back.</h1><p class="intro">Manage your collection and update your branded storefront in minutes.</p>${state.live?`<form id="login-form"><div class="form-error" id="auth-error"></div><div class="field"><label>Email</label><input type="email" name="email" placeholder="you@shop.com" autocomplete="username" required></div><div class="field"><label>Password</label><input type="password" name="password" placeholder="Your password" autocomplete="current-password" required minlength="6"></div><button type="submit" class="btn btn-primary" style="width:100%">Sign in to your dashboard ↗</button></form><p class="muted" style="font-size:12px;line-height:1.7;margin-top:24px">Pilot merchants receive login credentials from the platform operator. Public signup is deliberately disabled.</p>`:`<div class="notice" style="margin-top:26px">This interactive demo works without a database. Real merchant accounts, shared product changes, and secure login are enabled when you connect Supabase.</div><button class="btn btn-primary" style="width:100%" data-action="enter-demo">Enter demo dashboard ↗</button><p class="muted" style="font-size:12px;line-height:1.7;margin-top:19px">Explore all features without signing up. Nothing here is shared with other devices.</p>`}</div></section></div>`;
}
async function renderRoot(){
  try{await fetchData();if(route().admin)renderAdmin();else renderPublic();}
  catch(e){app.innerHTML=`<div class="loading-screen" style="display:block;text-align:center;height:auto;padding:100px 20px"><h2>Unable to load store</h2><p>${esc(errorMessage(e))}</p><button class="btn btn-outline" data-action="reload">Retry</button></div>`;toast(errorMessage(e),true)}
}
function editor(p=null){
  closeModal(false);
  const existing=Boolean(p);
  const node=document.createElement('div');node.className='overlay';node.id='edit-overlay';
  node.innerHTML=`<div class="modal product-editor" role="dialog" aria-modal="true" aria-label="${existing?'Edit':'Add'} jewelry"><button type="button" class="modal-close" data-action="close-modal" aria-label="Close">×</button><div class="eyebrow">${existing?'EDIT THE COLLECTION':'ADD TO COLLECTION'}</div><h2>${existing?'Edit jewelry piece':'Add a jewelry piece'}</h2><p class="intro" style="margin-bottom:25px">Add the essentials. You can keep the price private and let customers request a quote.</p><form id="product-form" class="form-grid"><input type="hidden" name="product_id" value="${existing?esc(p.id):''}"><div class="field full"><label class="required">Product name</label><input name="title" required maxlength="120" placeholder="e.g. Golden Hour Ring" value="${esc(p?.title||'')}"></div><div class="field"><label class="required">Category</label><select name="category" required>${categories.filter(c=>c!=='All').map(c=>`<option value="${c}" ${p?.category===c?'selected':''}>${c}</option>`).join('')}</select></div><div class="field"><label class="required">Gold karat</label><select name="karat" required>${[18,21,24,14].map(k=>`<option value="${k}" ${Number(p?.karat||18)===k?'selected':''}>${k}K</option>`).join('')}</select></div><div class="field"><label>Weight in grams (optional)</label><input type="number" name="weight" min="0.01" max="100000" step="0.01" placeholder="e.g. 4.50" value="${p?.weight!=null?esc(p.weight):''}"></div><div class="field"><label>Availability</label><select name="status"><option value="available" ${p?.status==='available'||!p?'selected':''}>Available</option><option value="reserved" ${p?.status==='reserved'?'selected':''}>Reserved</option><option value="sold" ${p?.status==='sold'?'selected':''}>Sold (hide from catalog)</option></select></div><div class="field"><label>SKU / Product code</label><input name="code" maxlength="50" value="${esc(p?.code||'')}" placeholder="Optional"></div><div class="field"><label>Price (EGP)</label><input type="number" name="price" step="0.01" min="0" max="1000000000" placeholder="Optional" value="${p?.price!=null?esc(p.price):''}"></div><div class="field full"><label><span class="switchfield"><input type="checkbox" name="show_price" ${p?.show_price?'checked':''} style="width:auto"> Display the price publicly (otherwise show “Price on request”)</span></label><span class="help">Prices can change; the customer should still confirm the final price with the shop.</span></div><div class="field full"><label>Short description</label><textarea name="description" maxlength="550">${esc(p?.description||'')}</textarea></div><div class="field full"><label>Upload product photo (JPEG / PNG / WebP)</label><input type="file" name="image_file" accept="image/png,image/jpeg,image/webp"><span class="help">Optional. Max 5 MB. Images uploaded in demo mode are optimized and saved in this browser. Live mode uses Supabase Storage.</span></div><div class="field full"><label>Or paste an HTTPS image link</label><input type="url" name="image_url" placeholder="https://your-site.com/product-photo.jpg" value="${esc(p?.image_url?.startsWith('https:')?p.image_url:'')}"></div><div class="field full"><div class="form-error" id="product-error"></div><div class="modal-toolbar"><button type="button" class="btn btn-outline" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-primary" id="product-submit">${existing?'Save changes':'Add product'} ↗</button></div></div></form></div>`;
  node.addEventListener('click',ev=>{if(ev.target===node)closeModal(false)});
  document.body.append(node);document.body.classList.add('modal-open');
}
function setFormError(id,msg){const e=document.getElementById(id);if(e){e.textContent=msg;e.classList.add('visible')}}
function pickTheme(theme){const field=document.querySelector('#theme-value');if(!field)return;field.value=theme;document.querySelectorAll('.theme-option').forEach(e=>e.classList.toggle('active',e.dataset.theme===theme));}
async function saveSettings(form){
  const fd=new FormData(form);const payload={};for(const k of ['name','tagline','hero_title','hero_subtitle','whatsapp','instagram','address','theme'])payload[k]=String(fd.get(k)||'').trim();
  if(!payload.name||!payload.hero_title){toast('Please complete the required fields.',true);return;}
  if(payload.whatsapp && !/^\+?[0-9 ()\-]{9,22}$/.test(payload.whatsapp)){toast('Please use a valid phone number with country code.',true);return;}
  if(state.live){
    const {error}=await supabase.from('shops').update(payload).eq('id',state.shop.id).eq('owner_id',state.user.id);
    if(error)throw error;
  } else {
    Object.assign(state.shop,payload);state.shops=state.shops.map(s=>s.id===state.shop.id?{...s,...payload}:s);persistDemo();
  }
  toast('Your storefront settings have been saved.');await renderRoot();
}
async function readOptimizedImage(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Please upload a JPEG, PNG or WebP image.');
  if(file.size>5*1024*1024)throw new Error('Image exceeds 5 MB.');
  return new Promise((resolve,reject)=>{
    const img=new Image();const obj=URL.createObjectURL(file);
    img.onload=()=>{
      try{const factor=Math.min(1,1100/Math.max(img.width,img.height));const c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*factor));c.height=Math.max(1,Math.round(img.height*factor));const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.76));}catch(e){reject(e)}finally{URL.revokeObjectURL(obj)}
    };
    img.onerror=()=>{URL.revokeObjectURL(obj);reject(new Error('Could not read the image file.'))};img.src=obj;
  });
}
async function uploadImageLive(file){
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Only JPEG, PNG and WebP images are allowed.');
  if(file.size>5*1024*1024)throw new Error('Maximum photo size is 5 MB.');
  if(!state.user)throw new Error('Sign in before uploading.');
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];
  const key=`${state.user.id}/${newId()}.${ext}`;
  const {error}=await supabase.storage.from(CONFIG.productImageBucket).upload(key,file,{contentType:file.type,upsert:false});
  if(error)throw error;
  const {data}=supabase.storage.from(CONFIG.productImageBucket).getPublicUrl(key);
  return data.publicUrl;
}
async function saveProduct(form){
  const fd=new FormData(form),id=String(fd.get('product_id')||''),old=state.products.find(p=>p.id===id)||null;
  const priceTxt=String(fd.get('price')||'').trim();
  const shown=fd.has('show_price');
  if(shown && !priceTxt)throw new Error('Enter a price or untick “Display price publicly”.');
  let image_url=old?.image_url||'';
  const file=fd.get('image_file');
  const imageLink=String(fd.get('image_url')||'').trim();
  if(file instanceof File && file.size>0){image_url=state.live?await uploadImageLive(file):await readOptimizedImage(file)}
  else if(imageLink){if(!/^https:\/\//i.test(imageLink))throw new Error('Product image link must start with https://');image_url=imageLink}
  const payload={shop_id:state.shop.id,title:String(fd.get('title')||'').trim(),category:String(fd.get('category')||'Other'),karat:Number(fd.get('karat')),weight:fd.get('weight')?Number(fd.get('weight')):null,status:String(fd.get('status')),code:String(fd.get('code')||'').trim()||`ITEM-${Date.now().toString(36).toUpperCase()}`,price:priceTxt?Number(priceTxt):null,show_price:shown,description:String(fd.get('description')||'').trim(),image_url,art:old?.art||mapArt(fd.get('category'))};
  if(!payload.title)throw new Error('Please enter the jewelry piece name.');
  if(state.live){
    const result=old ? await supabase.from('products').update(payload).eq('id',old.id).eq('shop_id',state.shop.id) : await supabase.from('products').insert(payload);
    if(result.error)throw result.error;
  } else {
    if(old)state.productsAll=state.productsAll.map(p=>p.id===old.id?{...p,...payload}:p);
    else state.productsAll.push({...payload,id:'demo-'+newId()});
    persistDemo();
  }
  closeModal(false);toast(old?'Product updated successfully.':'New jewelry piece added.');await renderRoot();
}
async function deleteProduct(id){
  const p=state.products.find(p=>p.id===id);if(!p)return;
  if(!confirm(`Delete "${p.title}"? This cannot be undone.`))return;
  if(state.live){const {error}=await supabase.from('products').delete().eq('id',id).eq('shop_id',state.shop.id);if(error)throw error}
  else{state.productsAll=state.productsAll.filter(p=>p.id!==id);persistDemo()}
  toast('Product deleted.');await renderRoot();
}
async function createStore(form){
  const fd=new FormData(form),name=String(fd.get('name')||'').trim(),slug=String(fd.get('slug')||'').trim().toLowerCase(),whatsapp=String(fd.get('whatsapp')||'').trim();
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length<3)throw new Error('Choose a lowercase English store identifier, e.g. nour-jewelry.');
  if(!name)throw new Error('Enter a store name.');
  const payload={name,slug,whatsapp,owner_id:state.live?state.user.id:'demo',tagline:'Jewelry made for your moment.',hero_title:'Something beautiful awaits.',hero_subtitle:'Explore our collection and ask us about the pieces you love.',theme:'ivory',address:'',instagram:''};
  if(state.live){const {error}=await supabase.from('shops').insert(payload);if(error)throw error}
  else{if(state.shops.some(s=>s.slug===slug))throw new Error('A demo store with this identifier already exists.');state.shops.push({...payload,id:'demo-'+newId()});persistDemo()}
  toast('Your shop is ready!');state.view='overview';navTo(true,slug);
}
async function doLogin(form){
  const fd=new FormData(form);const btn=form.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='Signing in…';
  try{
    const {data,error}=await supabase.auth.signInWithPassword({email:String(fd.get('email')||''),password:String(fd.get('password')||'')});if(error)throw error;
    state.user=data.user;state.view='overview';await renderRoot();toast('Welcome to your dashboard.');
  }catch(e){setFormError('auth-error',errorMessage(e));btn.disabled=false;btn.textContent='Sign in to your dashboard ↗'}
}
async function copyText(value){
  try{await navigator.clipboard.writeText(value);toast('Link copied to clipboard.')}catch(e){prompt('Copy this link:',value)}
}
async function handleAction(el){
  const action=el.dataset.action;
  try{
    switch(action){
      case 'product':openModal(el.dataset.id);break;
      case 'close-modal':closeModal();break;
      case 'category':state.category=el.dataset.cat;document.querySelector('#products-root').innerHTML=publicProducts();break;
      case 'enter-demo':state.adminUnlocked=true;state.view='overview';await renderRoot();break;
      case 'public':navTo(false);break;
      case 'admin-view':state.view=el.dataset.view;renderAdmin();break;
      case 'preview':window.open(url(false,state.shop?.slug),'_blank','noopener');break;
      case 'pick-theme':pickTheme(el.dataset.theme);break;
      case 'add-product':editor();break;
      case 'edit-product':editor(state.products.find(p=>p.id===el.dataset.id));break;
      case 'delete-product':await deleteProduct(el.dataset.id);break;
      case 'reload':await renderRoot();break;
      case 'copy-store':await copyText(new URL(url(false,state.shop?.slug),location.origin).href);break;
      case 'copy-link':await copyText(new URL(url(false,state.shop?.slug,state.modalId),location.origin).href);break;
      case 'logout':if(state.live){const {error}=await supabase.auth.signOut();if(error)throw error;state.user=null}else state.adminUnlocked=false;state.view='overview';navTo(true,state.shop?.slug);break;
    }
  }catch(e){toast(errorMessage(e),true)}
}
document.addEventListener('click',ev=>{
  const el=ev.target.closest('[data-action]');if(!el)return;
  if(el.closest('form') && el.tagName==='BUTTON' && el.type==='submit')return;
  ev.preventDefault();handleAction(el);
});
document.addEventListener('submit',async ev=>{
  const form=ev.target;if(!['login-form','settings-form','product-form','create-store-form'].includes(form.id))return;
  ev.preventDefault();const button=form.querySelector('button[type="submit"]');if(button)button.disabled=true;
  try{
    if(form.id==='login-form')await doLogin(form);
    if(form.id==='settings-form')await saveSettings(form);
    if(form.id==='product-form')await saveProduct(form);
    if(form.id==='create-store-form')await createStore(form);
  }catch(e){if(form.id==='product-form')setFormError('product-error',errorMessage(e));else toast(errorMessage(e),true)}
  finally{if(button && document.contains(button))button.disabled=false}
});
document.addEventListener('change',async ev=>{
  const el=ev.target;
  if(el.id==='shop-selector'){navTo(false,el.value);return}
  if(el.id==='owned-store-picker'){state.view='overview';navTo(true,el.value);return}
  if(el.id==='karat-filter'){state.karat=el.value;document.querySelector('#products-root').innerHTML=publicProducts();return}
});
document.addEventListener('input',ev=>{
  if(ev.target.id==='search-products'){state.search=ev.target.value;const pos=ev.target.selectionStart;const active=document.activeElement;renderAdmin();const el=document.getElementById('search-products');if(el){el.focus();el.setSelectionRange(pos,pos)}return}
});
document.addEventListener('keydown',ev=>{
  if(ev.key==='Escape' && document.querySelector('#product-overlay, #edit-overlay'))closeModal();
  if((ev.key==='Enter'||ev.key===' ')&&ev.target?.dataset?.action==='product'){ev.preventDefault();openModal(ev.target.dataset.id)}
});
window.addEventListener('popstate',()=>{closeModal(false);renderRoot()});
(async()=>{try{await connect();await renderRoot()}catch(e){console.error('Initialization failed:',e)}})();
