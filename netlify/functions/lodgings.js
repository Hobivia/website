// Netlify Function: Proxy Contentful GraphQL + Fallback local
// CommonJS pour compat Netlify par défaut
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const SPACE = process.env.CONTENTFUL_SPACE;
const ENV = process.env.CONTENTFUL_ENV || 'master';
const TOKEN = process.env.CONTENTFUL_CDA_TOKEN;

const GRAPHQL_ENDPOINT = (SPACE && ENV)
  ? `https://graphql.contentful.com/content/v1/spaces/${SPACE}/environments/${ENV}`
  : null;

// Helpers
function normalize(items){
  return (items || []).map(it => {
    const images = (it.imagesCollection?.items || it.images || [])
      .map(a => a.url || a);
    return {
      id: it.sys?.id || it.id,
      title: it.title,
      shortDescription: it.shortDescription || '',
      description: it.description || '',
      category: it.category?.key || it.category || '',
      location: it.location ? {
        lat: it.location.lat, lng: it.location.lon || it.location.lng,
        city: it.city || it.location.city || '', region: it.region || '', country: it.country || ''
      } : null,
      images,
      priceFrom: it.priceFrom || 0,
      bookingUrl: it.bookingUrl || '',
      featured: !!it.featured
    };
  });
}

async function fetchContentful(limit = 200, skip = 0){
  if(!GRAPHQL_ENDPOINT || !TOKEN) return null;
  const query = `
    query Lodgings($limit:Int!, $skip:Int!){
      lodgingCollection(limit:$limit, skip:$skip, order: sys_publishedAt_DESC) {
        total
        items {
          sys { id }
          title
          slug
          shortDescription
          description
          category { key }
          location { lat lon }
          city
          region
          country
          imagesCollection(limit:10) { items { url(transform:{quality:75}) } }
          priceFrom
          bookingUrl
          featured
        }
      }
    }`;
  const res = await fetch('/api/lodgings?category=surf&limit=200');
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer ' + TOKEN
    },
    body: JSON.stringify({ query, variables: { limit, skip } })
  });
  if(!res.ok) throw new Error('Contentful error: ' + res.status);
  const json = await res.json();
  const col = json.data?.lodgingCollection;
  return { total: col?.total || 0, items: normalize(col?.items || []) };
}

function readSeed(){
  const file = path.join(process.cwd(), 'data', 'seed-lodgings.json');
  const raw = fs.readFileSync(file, 'utf8');
  const json = JSON.parse(raw);
  return { total: json.total || (json.items?.length || 0), items: json.items || [] };
}

exports.handler = async (event) => {
  try{
    const params = event.queryStringParameters || {};
    const limit = Math.min(parseInt(params.limit || '50', 10), 200);
    const skip = parseInt(params.skip || '0', 10);
    const category = (params.category || '').toLowerCase();
    const search = (params.search || '').toLowerCase();
    const id = params.id || '';

    let data = null;
    try{
      data = await fetchContentful(200, 0);
    }catch(e){
      // fallback silencieux
      data = readSeed();
    }

    let items = data.items || [];

    // Recherche par id (ou slug) si demandé (pour logement.html)
    if (id){
      const match = items.filter(x => x.id === id || x.slug === id);
      return json({ total: match.length, items: match });
    }

    // Filtres côté function (robuste et simple)
    if (category) items = items.filter(x => (x.category || '').toLowerCase() === category);
    if (search){
      items = items.filter(x => {
        const hay = `${x.title} ${x.shortDescription||''} ${x.location?.city||''}`.toLowerCase();
        return hay.includes(search);
      });
    }

    const total = items.length;
    const page = items.slice(skip, skip + limit);

    return json({ total, items: page });
  }catch(err){
    return {
      statusCode: 500,
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ error: true, message: err.message })
    };
  }
};

function json(body){
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // CORS same-origin implicite : on ne met pas d’ACAO * ici
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}
