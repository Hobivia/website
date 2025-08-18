// /api/lodgings.js — Vercel Serverless Function
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.SANITY_API_PROJECT_ID,
  dataset: process.env.SANITY_API_DATASET || 'production',
  apiVersion: '2024-08-01',
  useCdn: true,                 // rapide en lecture publique
  token: process.env.SANITY_API_READ_TOKEN || undefined // inutile si dataset public
});

export default async function handler(req, res) {
  try {
    const { category = '', search = '', limit = '200', skip = '0', id = '' } = req.query;

    // GROQ basique + jointure catégorie
    let query = `*[_type == "lodging" ${
      id ? '&& (_id == $id || slug.current == $id)' : ''
    } ${category ? '&& category->key == $cat' : ''}]{
      _id,
      title,
      "slug": slug.current,
      shortDescription,
      description,
      "category": category->key,
      location{lat, lng},
      city, region, country,
      "images": images[].asset->url,
      priceFrom,
      bookingUrl,
      featured
    } | order(_updatedAt desc)`;

    const params = {};
    if (category) params.cat = category;
    if (id) params.id = id;

    let items = await client.fetch(query, params);

    // Search côté API (titre / short / ville)
    const s = (search || '').toLowerCase();
    if (s) {
      items = items.filter(x =>
        `${x.title} ${x.shortDescription || ''} ${x.city || ''}`.toLowerCase().includes(s)
      );
    }

    // Pagination
    const total = items.length;
    const start = parseInt(skip, 10) || 0;
    const end = start + (parseInt(limit, 10) || 50);
    items = items.slice(start, end);

    // Normalisation au format Hobivia
    const normalized = items.map(it => ({
      id: it._id,
      title: it.title,
      shortDescription: it.shortDescription || '',
      description: it.description || '',
      category: it.category || '',
      location: it.location
        ? { lat: it.location.lat, lng: it.location.lng, city: it.city, region: it.region, country: it.country }
        : null,
      images: it.images || [],
      priceFrom: it.priceFrom || 0,
      bookingUrl: it.bookingUrl || '',
      featured: !!it.featured
    }));

    // CORS: autorise ton front (si besoin)
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ total, items: normalized });
  } catch (err) {
    return res.status(500).json({ error: true, message: err.message });
  }
}
