/* =====================================================================
   Art Description Generator — Frontend Application
   ===================================================================== */

'use strict';

// -----------------------------------------------------------------------
// State
// -----------------------------------------------------------------------
let currentData = null;

// -----------------------------------------------------------------------
// DOM references
// -----------------------------------------------------------------------
const form         = document.getElementById('artForm');
const generateBtn  = document.getElementById('generateBtn');
const btnText      = document.getElementById('btnText');
const formError    = document.getElementById('formError');
const emptyState   = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const resultsState = document.getElementById('resultsState');

// -----------------------------------------------------------------------
// API Key — persist in sessionStorage (cleared on tab close)
// -----------------------------------------------------------------------
(function initApiKey() {
  const saved = sessionStorage.getItem('art_api_key');
  if (saved) document.getElementById('apiKey').value = saved;
})();

window.toggleApiKey = function() {
  const input = document.getElementById('apiKey');
  input.type = input.type === 'password' ? 'text' : 'password';
};

// -----------------------------------------------------------------------
// Description char counter
// -----------------------------------------------------------------------
window.updateCounter = function() {
  const ta = document.getElementById('description');
  const counter = document.getElementById('descCounter');
  const hint = document.getElementById('descHint');
  if (!ta || !counter) return;
  const len = ta.value.length;
  counter.textContent = `${len} / 800`;
  if (len >= 100) {
    counter.className = 'char-counter ok';
    if (hint) hint.style.color = 'var(--success)';
  } else {
    counter.className = len > 60 ? 'char-counter warn' : 'char-counter';
    if (hint) hint.style.color = '';
  }
};

// -----------------------------------------------------------------------
// Clear form
// -----------------------------------------------------------------------
window.clearForm = function() {
  form.reset();
  hideError();
  updateCounter();
  showEmpty();
  currentData = null;
  structureVisible = false;
};

// -----------------------------------------------------------------------
// Tab switching
// -----------------------------------------------------------------------
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// -----------------------------------------------------------------------
// Loading animation
// -----------------------------------------------------------------------
let loadingTimer = null;

function startLoadingAnimation() {
  const steps = [1, 2, 3, 4, 5];
  let idx = 0;

  steps.forEach(n => {
    const el = document.getElementById(`step${n}`);
    if (el) { el.className = 'loading-step'; }
  });

  function advance() {
    if (idx > 0) {
      const prev = document.getElementById(`step${idx}`);
      if (prev) prev.className = 'loading-step done';
    }
    idx++;
    if (idx <= steps.length) {
      const cur = document.getElementById(`step${idx}`);
      if (cur) cur.className = 'loading-step active';
    }
  }

  advance();
  loadingTimer = setInterval(() => {
    if (idx < steps.length) { advance(); }
    else { clearInterval(loadingTimer); }
  }, 2800);
}

function stopLoadingAnimation() {
  clearInterval(loadingTimer);
  [1,2,3,4,5].forEach(n => {
    const el = document.getElementById(`step${n}`);
    if (el) el.className = 'loading-step done';
  });
}

// -----------------------------------------------------------------------
// Form submit
// -----------------------------------------------------------------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideError();

  const apiKey = v('apiKey');
  if (apiKey) sessionStorage.setItem('art_api_key', apiKey);

  const payload = {
    apiKey,
    artworkTitle: v('artworkTitle'),
    artistName:   v('artistName'),
    medium:       v('medium'),
    description:  v('description'),
    dimensions:   v('dimensions'),
    edition:      v('edition'),
    price:        v('price'),
    style:        v('style'),
    keywords:     v('keywords'),
    location:     v('location'),
    brand:        v('brand'),
    websiteUrl:   v('websiteUrl'),
  };

  // Client-side validation
  const required = ['artworkTitle','artistName','medium','description'];
  const missing = required.filter(k => !payload[k]);
  if (missing.length) {
    showError('Please fill in all required fields (marked with *).');
    return;
  }
  if (payload.description.length < 100) {
    showError(`Inspiration / description must be at least 100 characters (currently ${payload.description.length}).`);
    return;
  }

  setLoading(true);

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error || `Server error ${res.status}`);
    }

    if (!json.success || !json.data) {
      throw new Error('Unexpected response from server.');
    }

    currentData = json.data;
    renderAll(currentData);
    showResults();
    // Scroll to results on mobile
    if (window.innerWidth <= 1024) {
      document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (err) {
    showError(err.message);
    showEmpty();
  } finally {
    setLoading(false);
  }
});

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
function v(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setLoading(on) {
  generateBtn.disabled = on;
  btnText.textContent = on ? 'Generating…' : 'Generate SEO + AEO Description';

  if (on) {
    emptyState.style.display  = 'none';
    resultsState.style.display = 'none';
    loadingState.style.display = 'block';
    startLoadingAnimation();
  } else {
    stopLoadingAnimation();
    loadingState.style.display = 'none';
  }
}

function showEmpty() {
  emptyState.style.display   = 'block';
  loadingState.style.display = 'none';
  resultsState.style.display = 'none';
}

function showResults() {
  emptyState.style.display   = 'none';
  loadingState.style.display = 'none';
  resultsState.style.display = 'block';
  // Reset to first tab
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', i===0));
  document.querySelectorAll('.tab-pane').forEach((p,i) => p.classList.toggle('active', i===0));
}

function showError(msg) {
  formError.textContent = '⚠️ ' + msg;
  formError.style.display = 'flex';
}

function hideError() {
  formError.style.display = 'none';
}

function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function scoreColor(n) {
  if (n >= 80) return 'var(--success)';
  if (n >= 60) return 'var(--accent)';
  if (n >= 40) return '#f97316';
  return 'var(--danger)';
}

function scoreClass(n) {
  if (n >= 80) return 'score-excellent';
  if (n >= 60) return 'score-good';
  if (n >= 40) return 'score-fair';
  return 'score-poor';
}

function progressBar(label, value, max, color, unit='') {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return `
    <div class="progress-wrap">
      <div class="progress-label">
        <span>${esc(label)}</span>
        <span>${value}${unit} / ${max}${unit}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
}

// -----------------------------------------------------------------------
// Copy utilities
// -----------------------------------------------------------------------
window.copyCode = function(preId, btn) {
  const el = document.getElementById(preId);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '✅ Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.innerHTML = orig; btn.classList.remove('copied'); }, 1800);
  });
};

window.copyRawDescription = function() {
  if (!currentData) return;
  const text = currentData.layer3_content_writer?.full_description || '';
  navigator.clipboard.writeText(text).then(() => {
    alert('Description copied to clipboard!');
  });
};

let structureVisible = false;
window.toggleStructure = function() {
  structureVisible = !structureVisible;
  document.getElementById('structureSections').style.display = structureVisible ? 'block' : 'none';
  document.getElementById('toggleStructureBtn').textContent = structureVisible ? '🏗️ Hide Sections' : '🏗️ Show Sections';
};

// -----------------------------------------------------------------------
// Download as ZIP
// -----------------------------------------------------------------------
window.downloadZip = async function() {
  if (!currentData || typeof JSZip === 'undefined') return;

  const d  = currentData;
  const l1 = d.layer1_seo_visibility  || {};
  const l2 = d.layer2_description_seo || {};
  const l3 = d.layer3_content_writer  || {};
  const l4 = d.layer4_seo_geo         || {};
  const l5 = d.layer5_aeo             || {};

  const zip = new JSZip();

  // Layer 1 — SEO Visibility
  zip.file('llms.txt', l1.llms_txt || '');
  zip.file('schema.jsonld',
    '<script type="application/ld+json">\n' +
    JSON.stringify(l1.json_ld || {}, null, 2) +
    '\n</script>'
  );
  zip.file('robots-suggestions.txt',
    Array.isArray(l1.robots_txt_suggestions)
      ? l1.robots_txt_suggestions.join('\n')
      : (l1.robots_txt_suggestions || '')
  );
  zip.file('performance-tips.txt',
    (l1.performance_tips || []).map((t, i) => `${i + 1}. ${t}`).join('\n')
  );

  // Layer 2 — Description SEO
  zip.file('seo-metadata.txt', [
    `SEO TITLE (${(l2.seo_title || '').length} chars)`,
    l2.seo_title || '',
    '',
    `META DESCRIPTION (${(l2.meta_description || '').length} chars)`,
    l2.meta_description || '',
    '',
    `URL SLUG`,
    l2.url_slug || '',
    '',
    `PRIMARY KEYWORD`,
    l2.primary_keyword || '',
    '',
    `LSI KEYWORDS`,
    (l2.lsi_keywords || []).join(', '),
    '',
    `SEO SCORE: ${l2.seo_score || '—'}/100`,
    `READABILITY SCORE: ${l2.readability_score || '—'}/100`,
    `KEYWORD DENSITY: ${l2.keyword_density || '—'}%`,
    `READING LEVEL: ${l2.reading_level || '—'}`,
  ].join('\n'));

  // Layer 3 — Content Writer
  zip.file('description.txt', l3.full_description || '');
  zip.file('description-sections.txt', [
    '=== HOOK ===',
    l3.hook || '',
    '',
    '=== STORY ===',
    (Array.isArray(l3.story) ? l3.story : [l3.story || '']).join('\n\n'),
    '',
    '=== MEDIUM ===',
    l3.medium || '',
    '',
    '=== OFFER ===',
    l3.offer || '',
    '',
    '=== VSL ===',
    l3.vsl || '',
  ].join('\n'));

  // Layer 4 — GEO
  zip.file('geo-optimization.txt', [
    `LOCATION DETECTED: ${l4.location_detected || 'none'}`,
    '',
    'GEOGRAPHIC KEYWORDS',
    (l4.geographic_keywords || []).join('\n'),
    '',
    'LOCATION-ENHANCED TITLE VARIATIONS',
    (l4.location_enhanced_titles || []).map((t, i) => `${i + 1}. ${t}`).join('\n'),
    '',
    'REGIONAL META DESCRIPTION',
    l4.regional_meta_description || '',
    '',
    'GEO RECOMMENDATIONS',
    (l4.geo_recommendations || []).map((r, i) => `${i + 1}. ${r}`).join('\n'),
    '',
    'SHIPPING NOTES',
    l4.shipping_notes || '',
  ].join('\n'));

  // Layer 5 — AEO
  const cl = l5.checklist || {};
  zip.file('aeo-report.txt', [
    `AI DISCOVERABILITY SCORE: ${l5.ai_discoverability_score || '—'}/100`,
    `FEATURED SNIPPET SCORE: ${l5.featured_snippet_score || '—'}/100`,
    `WOULD AI RECOMMEND: ${l5.would_ai_recommend ? 'YES' : 'NO'}`,
    `REASON: ${l5.recommendation_reason || ''}`,
    '',
    'AI-OPTIMIZED SUMMARY',
    l5.ai_optimized_summary || '',
    '',
    'AEO CHECKLIST',
    ...Object.entries(cl).map(([k, v]) => `${v ? '✓' : '✗'} ${k.replace(/_/g,' ')}`),
    '',
    'FEATURED SNIPPET Q&A',
    ...(l5.featured_snippet_qa || []).map(qa => `Q: ${qa.question}\nA: ${qa.answer}`),
    '',
    'AEO IMPROVEMENTS',
    ...(l5.aeo_improvements || []).map((s, i) => `${i + 1}. ${s}`),
  ].join('\n'));

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'art-seo-package.zip';
  a.click();
  URL.revokeObjectURL(a.href);
};

// -----------------------------------------------------------------------
// ===  RENDER ALL LAYERS  ===
// -----------------------------------------------------------------------
function renderAll(data) {
  renderLayer1(data.layer1_seo_visibility);
  renderLayer2(data.layer2_description_seo);
  renderLayer3(data.layer3_content_writer);
  renderLayer4(data.layer4_seo_geo);
  renderLayer5(data.layer5_aeo);
}

// -----------------------------------------------------------------------
// LAYER 1 — SEO Visibility
// -----------------------------------------------------------------------
function renderLayer1(d) {
  if (!d) return;

  // llms.txt
  document.getElementById('llmsTxtOutput').textContent = d.llms_txt || '(not generated)';

  // JSON-LD
  const jsonLdStr = JSON.stringify(d.json_ld || {}, null, 2);
  document.getElementById('jsonLdOutput').textContent = `<script type="application/ld+json">\n${jsonLdStr}\n<\/script>`;

  // robots.txt
  const robots = Array.isArray(d.robots_txt_suggestions)
    ? d.robots_txt_suggestions.join('\n')
    : (d.robots_txt_suggestions || '');
  document.getElementById('robotsTxtOutput').textContent = robots;

  // Performance tips
  const perfList = document.getElementById('perfTipsOutput');
  perfList.innerHTML = '';
  (d.performance_tips || []).forEach(tip => {
    const li = document.createElement('li');
    li.textContent = tip;
    perfList.appendChild(li);
  });
}

// -----------------------------------------------------------------------
// LAYER 2 — Description SEO
// -----------------------------------------------------------------------
function renderLayer2(d) {
  if (!d) return;

  const score = d.seo_score || 0;
  const color = scoreColor(score);

  // Score ring
  const circumference = 2 * Math.PI * 28;
  const dash = circumference - (score / 100) * circumference;
  document.getElementById('seoScoreRing').innerHTML = `
    <div class="score-ring">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="28" fill="none" stroke="var(--dark-border)" stroke-width="6"/>
        <circle cx="36" cy="36" r="28" fill="none" stroke="${color}" stroke-width="6"
          stroke-dasharray="${circumference}" stroke-dashoffset="${dash}"
          stroke-linecap="round" style="transition:stroke-dashoffset 1s ease"/>
      </svg>
      <div class="score-ring-value ${scoreClass(score)}">${score}</div>
    </div>
    <div class="score-ring-info">
      <h4>SEO Score: ${score}/100</h4>
      <p>Readability: ${d.readability_score || '—'} / 100 · ${d.reading_level || ''}</p>
      <p>Keyword density: ${d.keyword_density || '—'}%</p>
    </div>`;

  // Title
  document.getElementById('seoTitleOutput').textContent = d.seo_title || '';
  const titleLen = d.title_length || (d.seo_title || '').length;
  document.getElementById('titleLengthBar').innerHTML = progressBar(
    'Title length (ideal: 50–60 chars)', titleLen, 70, titleLen >= 50 && titleLen <= 60 ? 'var(--success)' : 'var(--warning)', ' chars'
  );

  // Meta
  document.getElementById('metaDescOutput').textContent = d.meta_description || '';
  const metaLen = d.meta_length || (d.meta_description || '').length;
  document.getElementById('metaLengthBar').innerHTML = progressBar(
    'Meta description length (ideal: 150–160 chars)', metaLen, 170, metaLen >= 150 && metaLen <= 160 ? 'var(--success)' : 'var(--warning)', ' chars'
  );

  // URL slug
  document.getElementById('urlSlugOutput').textContent = d.url_slug || '';

  // Keywords
  const kwWrap = document.getElementById('keywordsOutput');
  const primary = d.primary_keyword || '';
  const lsi = d.lsi_keywords || [];
  kwWrap.innerHTML = `
    <div class="keyword-tags">
      ${primary ? `<span class="keyword-tag primary">★ ${esc(primary)}</span>` : ''}
      ${lsi.map(k => `<span class="keyword-tag">${esc(k)}</span>`).join('')}
    </div>`;

  // Metrics grid
  document.getElementById('seoMetricsGrid').innerHTML = `
    ${metricCard(score, 'SEO Score', '/100', scoreClass(score))}
    ${metricCard(d.readability_score || '—', 'Readability', '/100', scoreClass(d.readability_score || 0))}
    ${metricCard((d.keyword_density || '—') + '%', 'Keyword Density', 'ideal 1–3%')}
    ${metricCard(titleLen, 'Title Length', 'chars', titleLen >= 50 && titleLen <= 60 ? 'score-excellent' : 'score-fair')}
    ${metricCard(metaLen, 'Meta Length', 'chars', metaLen >= 150 && metaLen <= 160 ? 'score-excellent' : 'score-fair')}
    ${metricCard(d.reading_level || '—', 'Reading Level', '')}`;

  // Score breakdown bars
  const bd = d.seo_score_breakdown || {};
  const breakdownEl = document.getElementById('scoreBreakdownBars');
  breakdownEl.innerHTML = [
    ['Title Optimization',    bd.title_optimization    ?? 0, 20],
    ['Meta Description',      bd.meta_optimization     ?? 0, 20],
    ['Keyword Usage',         bd.keyword_usage         ?? 0, 20],
    ['Content Length',        bd.content_length        ?? 0, 20],
    ['Structure & Hierarchy', bd.structure             ?? 0, 20],
  ].map(([label, val, max]) =>
    progressBar(label, val, max, scoreColor((val / max) * 100), ' pts')
  ).join('');
}

function metricCard(val, label, sub, cls='') {
  return `
    <div class="metric-card">
      <div class="metric-value ${cls}">${val}</div>
      <div class="metric-label">${label}</div>
      ${sub ? `<div class="metric-sub">${sub}</div>` : ''}
    </div>`;
}

// -----------------------------------------------------------------------
// LAYER 3 — Content Writer
// -----------------------------------------------------------------------
function renderLayer3(d) {
  if (!d) return;

  // Metrics
  const ctaColors = { strong: 'score-excellent', medium: 'score-good', weak: 'score-poor' };
  document.getElementById('contentMetricsGrid').innerHTML = `
    ${metricCard(d.power_word_count ?? '—',        'Power Words',    'found in copy')}
    ${metricCard((d.emotional_word_percentage ?? '—') + '%', 'Emotional Words', 'of total copy')}
    ${metricCard(d.sensory_word_count ?? '—',      'Sensory Words',  'sight/touch/sound')}
    ${metricCard(d.structure_validation?.total_word_count ?? '—', 'Word Count', 'total')}
    ${metricCard((d.cta_strength || 'N/A').toUpperCase(), 'CTA Strength', '', ctaColors[d.cta_strength] || '')}
    ${metricCard(d.structure_validation?.story_paragraphs ?? '—', 'Story Paras', 'ideal: 3-5')}`;

  // Full description (rendered HTML with section labels)
  const full = d.full_description || '';
  document.getElementById('fullDescriptionOutput').innerHTML = `<p>${esc(full).replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')}</p>`;
  document.getElementById('rawDescOutput').textContent = full;

  // Section breakdowns
  document.getElementById('hookOutput').innerHTML = `
    <span class="desc-label hook">HOOK</span>
    <p>${esc(d.hook || '').replace(/\n/g,'<br>')}</p>`;

  const storyParas = Array.isArray(d.story) ? d.story : [d.story || ''];
  document.getElementById('storyOutput').innerHTML = `
    <span class="desc-label story">STORY</span>
    ${storyParas.map(p => `<p>${esc(p)}</p>`).join('')}`;

  document.getElementById('mediumOutput').innerHTML = `
    <span class="desc-label medium">MEDIUM</span>
    <p>${esc(d.medium || '').replace(/\n/g,'<br>')}</p>`;

  document.getElementById('offerOutput').innerHTML = `
    <span class="desc-label offer">OFFER</span>
    <p>${esc(d.offer || '').replace(/\n/g,'<br>')}</p>`;

  document.getElementById('vslOutput').innerHTML = `
    <span class="desc-label vsl">VSL</span>
    <p>${esc(d.vsl || '').replace(/\n/g,'<br>')}</p>`;

  // Engagement checklist
  const eng = d.engagement_elements || {};
  const checks = [
    { key: 'second_person',    label: 'Second-person language ("you") present' },
    { key: 'emotional_triggers', label: 'Emotional trigger words used' },
    { key: 'scarcity',         label: 'Scarcity / urgency element present' },
    { key: 'social_proof',     label: 'Social proof indicator present' },
  ];

  document.getElementById('engagementChecklist').innerHTML = checks.map(c => {
    const pass = !!eng[c.key];
    return `
      <div class="check-item ${pass?'pass':'fail'}">
        <span class="check-icon">${pass ? '✅' : '⚠️'}</span>
        <span class="check-text">${esc(c.label)}</span>
        <span class="${pass?'check-pass':'check-fail'}">${pass ? 'Present' : 'Missing'}</span>
      </div>`;
  }).join('');
}

// -----------------------------------------------------------------------
// LAYER 4 — GEO
// -----------------------------------------------------------------------
function renderLayer4(d) {
  if (!d) return;

  // Geo keywords
  const geoKwEl = document.getElementById('geoKeywordsOutput');
  const geoKws = d.geographic_keywords || [];
  geoKwEl.innerHTML = `<div class="keyword-tags">${geoKws.map(k => `<span class="keyword-tag">${esc(k)}</span>`).join('')}</div>`;

  // Location-enhanced titles
  const titlesEl = document.getElementById('geoTitlesOutput');
  titlesEl.innerHTML = (d.location_enhanced_titles || []).map(t => `<li>${esc(t)}</li>`).join('');

  // Regional meta
  document.getElementById('geoMetaOutput').textContent = d.regional_meta_description || '';

  // Geo recs
  const recsEl = document.getElementById('geoRecsOutput');
  recsEl.innerHTML = (d.geo_recommendations || []).map(r => `<li>${esc(r)}</li>`).join('');

  // Shipping notes
  const shipping = d.shipping_notes || '';
  const shippingSection = document.getElementById('shippingNotesSection');
  if (shipping) {
    document.getElementById('shippingNotesOutput').textContent = shipping;
    shippingSection.style.display = 'block';
  } else {
    shippingSection.style.display = 'none';
  }
}

// -----------------------------------------------------------------------
// LAYER 5 — AEO
// -----------------------------------------------------------------------
function renderLayer5(d) {
  if (!d) return;

  const aiScore   = d.ai_discoverability_score || 0;
  const snipScore = d.featured_snippet_score   || 0;
  const recommend = d.would_ai_recommend;

  // Big scores
  document.getElementById('aeoScores').innerHTML = `
    <div class="aeo-score-card">
      <div class="aeo-score-num ${scoreClass(aiScore)}">${aiScore}</div>
      <div class="aeo-score-label">AI Discoverability Score</div>
      <div class="ai-recommend-badge ${recommend ? 'yes' : 'no'}">
        ${recommend ? '✅ AI Would Recommend' : '❌ Needs Improvement'}
      </div>
    </div>
    <div class="aeo-score-card">
      <div class="aeo-score-num ${scoreClass(snipScore)}">${snipScore}</div>
      <div class="aeo-score-label">Featured Snippet Score</div>
      <p style="font-size:0.75rem;color:var(--text-muted);margin:6px 0 0;">${esc(d.recommendation_reason || '')}</p>
    </div>`;

  // AI summary
  const summary = d.ai_optimized_summary || '';
  document.getElementById('aiSummaryOutput').textContent = summary;
  document.getElementById('aiSummaryCode').textContent = summary;

  // AEO checklist
  const cl = d.checklist || {};
  const aeoChecks = [
    { key: 'artist_personality_evident',     label: 'Artist personality evident' },
    { key: 'medium_clearly_stated',          label: 'Medium clearly stated' },
    { key: 'edition_information_clear',      label: 'Edition information clear' },
    { key: 'emotional_benefit_obvious',      label: 'Emotional benefit obvious' },
    { key: 'scarcity_emphasized',            label: 'Scarcity emphasized' },
    { key: 'quality_craftsmanship_highlighted', label: 'Quality & craftsmanship highlighted' },
    { key: 'price_value_clear',              label: 'Price / value proposition clear' },
    { key: 'collector_appeal_stated',        label: 'Collector appeal stated' },
  ];

  document.getElementById('aeoChecklist').innerHTML = aeoChecks.map(c => {
    const pass = !!cl[c.key];
    return `
      <div class="check-item ${pass?'pass':'fail'}">
        <span class="check-icon">${pass ? '✅' : '❌'}</span>
        <span class="check-text">${esc(c.label)}</span>
        <span class="${pass?'check-pass':'check-fail'}">${pass ? 'Pass' : 'Fail'}</span>
      </div>`;
  }).join('');

  // Featured snippet Q&A
  const qaEl = document.getElementById('featuredSnippetQA');
  qaEl.innerHTML = (d.featured_snippet_qa || []).map(qa => `
    <div class="qa-item">
      <div class="qa-question">Q: ${esc(qa.question)}</div>
      <div class="qa-answer">${esc(qa.answer)}</div>
    </div>`).join('');

  // AEO improvements
  const impEl = document.getElementById('aeoImprovementsOutput');
  impEl.innerHTML = (d.aeo_improvements || []).map(i => `<li>${esc(i)}</li>`).join('');
}
