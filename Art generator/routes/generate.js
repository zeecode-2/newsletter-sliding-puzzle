const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();

// Return a client using the per-request key when provided, otherwise fall back to env var.
// A new client is created per-request only when the caller supplies their own key so the
// shared cached client stays valid for server-side key usage.
let _serverClient = null;

function getClient(requestApiKey) {
  if (requestApiKey) {
    return new Anthropic({ apiKey: requestApiKey });
  }
  if (!_serverClient) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('No API key provided. Either set ANTHROPIC_API_KEY in .env or enter your key in the form.');
    }
    _serverClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _serverClient;
}

function validateInput(body) {
  const errors = [];
  if (!body.artworkTitle?.trim()) errors.push('Artwork title is required');
  if (!body.artistName?.trim()) errors.push('Artist name is required');
  if (!body.medium?.trim()) errors.push('Medium / materials are required');
  const desc = body.description?.trim() || '';
  if (!desc) errors.push('Inspiration / description is required');
  else if (desc.length < 100) errors.push(`Description must be at least 100 characters (currently ${desc.length})`);
  return errors;
}

// ---------------------------------------------------------------------------
// System prompt — cached (ephemeral) for all requests
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an elite SEO/AEO strategist and art copywriter combining five expert skills:
1. seo-visibility-expert — llms.txt, schema markup, crawler optimization
2. description-seo — title optimization, meta descriptions, keyword placement
3. seo-content-writer — HOOK-STORY-MEDIUM-OFFER-VSL copywriting structure
4. seo-geo — geographic keyword optimization, regional variations
5. seo-aeo-best-practices — AI crawler formatting, featured snippet optimization

CRITICAL: You MUST respond with a single valid JSON object. No markdown code fences, no prose before or after. Pure JSON only.`;

// ---------------------------------------------------------------------------
// Build user prompt
// ---------------------------------------------------------------------------
function buildPrompt(d) {
  return `Generate a complete SEO/AEO analysis for this artwork. Return ONLY valid JSON matching the exact schema below.

ARTWORK DATA:
- Title: ${d.artworkTitle}
- Artist / Brand: ${d.artistName}${d.brand ? ` (Gallery/Brand: ${d.brand})` : ''}
- Medium / Materials: ${d.medium}
- Dimensions: ${d.dimensions || 'Not specified'}
- Price: ${d.price ? `$${d.price}` : 'Not specified'}
- Edition: ${d.edition || 'Original one-of-a-kind'}
- Style / Movement: ${d.style || 'Contemporary'}
- Location / City: ${d.location || 'Not specified'}
- Brief Description / Inspiration: ${d.description}
- Target Keywords (user-provided): ${d.keywords || 'auto-generate from artwork data'}
- Website / Shop URL: ${d.websiteUrl || 'https://example.com'}

REQUIRED JSON SCHEMA (fill every field with real, high-quality content):

{
  "layer1_seo_visibility": {
    "llms_txt": "Full multi-line llms.txt file content. Include: # Site Name, > tagline, blank line, description paragraph, ## Featured Collections section with 3 items, ## About section, ## Contact line.",
    "json_ld": {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": "artwork title",
      "description": "rich 2-sentence description",
      "image": "https://example.com/artwork.jpg",
      "brand": {
        "@type": "Brand",
        "name": "artist/gallery name"
      },
      "creator": {
        "@type": "Person",
        "name": "artist name",
        "jobTitle": "Visual Artist"
      },
      "offers": {
        "@type": "Offer",
        "price": "0.00",
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "seller": {
          "@type": "Organization",
          "name": "gallery/brand name"
        }
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "47"
      },
      "additionalProperty": [
        {"@type": "PropertyValue", "name": "Medium", "value": "medium value"},
        {"@type": "PropertyValue", "name": "Dimensions", "value": "dimensions value"},
        {"@type": "PropertyValue", "name": "Edition", "value": "edition value"}
      ]
    },
    "robots_txt_suggestions": [
      "User-agent: *",
      "Allow: /",
      "User-agent: GPTBot",
      "Allow: /",
      "User-agent: Claude-Web",
      "Allow: /",
      "User-agent: PerplexityBot",
      "Allow: /",
      "Sitemap: https://example.com/sitemap.xml"
    ],
    "performance_tips": [
      "Specific tip 1 for this artwork type",
      "Specific tip 2",
      "Specific tip 3",
      "Specific tip 4"
    ]
  },
  "layer2_description_seo": {
    "seo_title": "50-60 char title with PRIMARY keyword in first 15 chars",
    "meta_description": "150-160 char meta with hook + benefit + CTA. Make it irresistible to click.",
    "url_slug": "lowercase-hyphenated-slug-under-75-chars",
    "primary_keyword": "main target keyword phrase",
    "lsi_keywords": ["related keyword 1", "related keyword 2", "related keyword 3", "related keyword 4", "related keyword 5"],
    "keyword_density": 2.1,
    "seo_score": 85,
    "readability_score": 68,
    "title_length": 55,
    "meta_length": 155,
    "reading_level": "8th Grade",
    "seo_score_breakdown": {
      "title_optimization": 18,
      "meta_optimization": 17,
      "keyword_usage": 20,
      "content_length": 15,
      "structure": 15
    }
  },
  "layer3_content_writer": {
    "hook": "2-3 powerful sentences. Stop the scroll. Viewer-focused. Question or striking observation that creates emotional connection.",
    "story": [
      "Paragraph 1 — sensory opening, place the reader in the scene",
      "Paragraph 2 — the artist's process, challenge, or discovery",
      "Paragraph 3 — breakthrough moment or unique technique",
      "Paragraph 4 — the emotional truth behind the work"
    ],
    "medium": "1-2 sentences weaving in dimensions, materials, and edition naturally.",
    "offer": "1 paragraph: the emotional transformation the buyer experiences. What they're really buying. The specific feeling this piece brings into their home or life.",
    "vsl": "2-3 closing sentences. Direct call to emotion. Mirror back the buyer's desire. Final irresistible reason to act now.",
    "full_description": "Complete assembled HOOK + STORY + MEDIUM + OFFER + VSL as one flowing piece. Minimum 250 words.",
    "power_word_count": 14,
    "emotional_word_percentage": 32,
    "sensory_word_count": 8,
    "cta_strength": "strong",
    "engagement_elements": {
      "second_person": true,
      "emotional_triggers": true,
      "scarcity": true,
      "social_proof": false
    },
    "structure_validation": {
      "hook_sentences": 3,
      "story_paragraphs": 4,
      "medium_sentences": 2,
      "offer_sentences": 4,
      "vsl_sentences": 3,
      "total_word_count": 280
    }
  },
  "layer4_seo_geo": {
    "location_detected": "city/region from input or 'Not specified'",
    "geographic_keywords": ["geo keyword 1", "geo keyword 2", "geo keyword 3", "geo keyword 4"],
    "location_enhanced_titles": [
      "Title variation with city name",
      "Title variation with region/country",
      "Title variation with gallery location"
    ],
    "regional_meta_description": "150-160 char meta with location keyword naturally integrated",
    "geo_recommendations": [
      "Specific geo SEO recommendation 1",
      "Specific geo SEO recommendation 2",
      "Specific geo SEO recommendation 3",
      "Specific geo SEO recommendation 4"
    ],
    "shipping_notes": "Brief note about regional shipping/availability if location specified"
  },
  "layer5_aeo": {
    "ai_discoverability_score": 88,
    "featured_snippet_score": 76,
    "would_ai_recommend": true,
    "recommendation_reason": "1-2 sentences explaining why an AI would or would not recommend this piece",
    "checklist": {
      "artist_personality_evident": true,
      "medium_clearly_stated": true,
      "edition_information_clear": true,
      "emotional_benefit_obvious": true,
      "scarcity_emphasized": true,
      "quality_craftsmanship_highlighted": true,
      "price_value_clear": true,
      "collector_appeal_stated": true
    },
    "ai_optimized_summary": "3-4 sentences structured for AI crawlers. Frontloads key facts: title, artist, medium, dimensions, price, edition, emotional theme. Reads like an encyclopedia entry for ChatGPT/Claude/Perplexity.",
    "featured_snippet_qa": [
      {"question": "What is this artwork?", "answer": "Direct factual answer in 1-2 sentences"},
      {"question": "What medium and materials are used?", "answer": "Direct answer"},
      {"question": "Is this a limited edition piece?", "answer": "Direct answer"},
      {"question": "Who is the artist?", "answer": "Direct answer with background"},
      {"question": "What makes this artwork unique?", "answer": "Direct answer"}
    ],
    "aeo_improvements": [
      "Specific AEO improvement suggestion 1",
      "Specific AEO improvement suggestion 2",
      "Specific AEO improvement suggestion 3"
    ]
  }
}`;
}

// ---------------------------------------------------------------------------
// POST /api/generate
// ---------------------------------------------------------------------------
router.post('/generate', async (req, res) => {
  const errors = validateInput(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(' | ') });
  }

  try {
    const client = getClient(req.body.apiKey?.trim() || null);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [
        {
          role: 'user',
          content: buildPrompt(req.body),
        },
      ],
    });

    const rawText = message.content[0].text.trim();

    let data;
    try {
      // Strip any accidental markdown fences
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      data = JSON.parse(cleaned);
    } catch {
      // Last-resort: extract the outermost JSON object
      const match = rawText.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('AI returned non-JSON output');
      data = JSON.parse(match[0]);
    }

    // Patch real values into json_ld that Claude may have left as placeholders
    if (data.layer1_seo_visibility?.json_ld) {
      const jld = data.layer1_seo_visibility.json_ld;
      if (req.body.price && jld.offers) jld.offers.price = String(req.body.price);
      if (req.body.websiteUrl && jld.offers) jld.offers.url = req.body.websiteUrl;
    }

    res.json({
      success: true,
      data,
      usage: {
        input_tokens: message.usage?.input_tokens,
        output_tokens: message.usage?.output_tokens,
        cache_read: message.usage?.cache_read_input_tokens,
      },
    });
  } catch (err) {
    console.error('[generate]', err.message);

    if (err.message.includes('ANTHROPIC_API_KEY')) {
      return res.status(500).json({ error: err.message });
    }
    if (err.status === 401) {
      return res.status(401).json({ error: 'Invalid API key. Check your ANTHROPIC_API_KEY in .env' });
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'API rate limit hit. Please wait a moment and try again.' });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: 'Bad request to AI API. Check your input.' });
    }
    res.status(500).json({ error: 'Generation failed. Please try again.' });
  }
});

module.exports = router;
