#!/usr/bin/env node
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const userId = 'd797a177-c076-43f5-a7f9-a8ae22215c84';

async function verify() {
  console.log('\n=== CONTENT QUALITY VERIFICATION ===\n');

  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, title, status, project_versions (worksheet_html, lesson_plan_html, answer_key_html)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  let pixabayCount = 0;
  let dalleCount = 0;
  let otherCount = 0;
  let placeholderCount = 0;
  let totalImages = 0;

  for (const project of projects) {
    console.log(`\n--- ${project.title} ---`);

    const version = project.project_versions && project.project_versions[0];
    if (!version) {
      console.log('  No content');
      continue;
    }

    const allHtml = [
      version.worksheet_html || '',
      version.lesson_plan_html || '',
      version.answer_key_html || ''
    ].join('\n');

    // Check placeholders
    const placeholderRegex = /\[VISUAL:[^\]]+\]/gi;
    const placeholders = allHtml.match(placeholderRegex) || [];
    if (placeholders.length > 0) {
      console.log(`  Warning: ${placeholders.length} unprocessed [VISUAL:] placeholders`);
      placeholderCount += placeholders.length;
    }

    // Extract images
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const urls = new Set();
    let match;
    while ((match = imgRegex.exec(allHtml)) !== null) {
      urls.add(match[1]);
    }

    let projPixabay = 0;
    let projDalle = 0;
    let projOther = 0;

    for (const url of urls) {
      totalImages++;
      if (url.includes('pixabay.com')) {
        pixabayCount++;
        projPixabay++;
      } else if (url.includes('openai') || url.includes('dall-e') || url.includes('oaidalleapi')) {
        dalleCount++;
        projDalle++;
      } else {
        otherCount++;
        projOther++;
        console.log(`  Other image source: ${url.substring(0, 80)}...`);
      }
    }

    console.log(`  Images: ${urls.size} total (Pixabay: ${projPixabay}, DALL-E: ${projDalle}, Other: ${projOther})`);

    // Content sizes
    const wsLen = (version.worksheet_html || '').length;
    const lpLen = (version.lesson_plan_html || '').length;
    const akLen = (version.answer_key_html || '').length;
    console.log(`  Content: Worksheet=${wsLen} chars, Lesson=${lpLen} chars, Answer=${akLen} chars`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Projects analyzed: ${projects.length}`);
  console.log(`Total unique images: ${totalImages}`);
  console.log(`  - Pixabay (stock): ${pixabayCount}`);
  console.log(`  - DALL-E (AI-generated): ${dalleCount}`);
  console.log(`  - Other: ${otherCount}`);
  console.log(`Unprocessed placeholders: ${placeholderCount}`);

  console.log('\n=== IMAGE SOURCE ANALYSIS ===');
  if (dalleCount === 0 && pixabayCount > 0) {
    console.log('NOTE: All images are from Pixabay (stock images)');
    console.log('');
    console.log('Current implementation status:');
    console.log('  - Ollama: Uses Pixabay (no image generation capability)');
    console.log('  - Claude: Uses Pixabay (Claude has no native image generation)');
    console.log('  - OpenAI: Uses Pixabay (DALL-E integration NOT implemented yet)');
    console.log('');
    console.log('Potential enhancement: Integrate DALL-E for OpenAI-generated content');
  } else if (dalleCount > 0) {
    console.log('Some images are AI-generated via DALL-E');
  }
}

verify().catch(console.error);
