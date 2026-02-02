#!/usr/bin/env node
/**
 * Content Quality Verification Script
 *
 * Checks generated content for quality issues:
 * - Broken image URLs
 * - Unprocessed placeholders
 * - Content appropriateness
 * - Image source verification (Pixabay vs DALL-E)
 *
 * Usage: node scripts/verify-content-quality.js [--user-id <id>]
 */

require('dotenv').config({ path: 'generation-api/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Default test user
const DEFAULT_USER_ID = 'd797a177-c076-43f5-a7f9-a8ae22215c84';

async function verifyContentQuality(userId) {
  console.log('\n=== CONTENT QUALITY VERIFICATION ===\n');

  // Get recent projects
  const { data: projects, error } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      status,
      prompt,
      project_versions (
        worksheet_html,
        lesson_plan_html,
        answer_key_html,
        created_at
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching projects:', error.message);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('No projects found for user');
    return;
  }

  const results = {
    totalProjects: projects.length,
    totalImages: 0,
    brokenImages: 0,
    pixabayImages: 0,
    dalleImages: 0,
    otherImages: 0,
    unprocessedPlaceholders: 0,
    issues: []
  };

  for (const project of projects) {
    console.log(`\n--- ${project.title} ---`);
    console.log(`Status: ${project.status}`);

    const version = project.project_versions?.[0];
    if (!version) {
      console.log('  No content version found');
      results.issues.push({ project: project.title, issue: 'No content version' });
      continue;
    }

    // Combine all HTML content
    const allHtml = [
      version.worksheet_html || '',
      version.lesson_plan_html || '',
      version.answer_key_html || ''
    ].join('\n');

    // Check for unprocessed placeholders
    const placeholders = allHtml.match(/\[VISUAL:[^\]]+\]/gi) || [];
    if (placeholders.length > 0) {
      console.log(`  ⚠️ Unprocessed placeholders: ${placeholders.length}`);
      results.unprocessedPlaceholders += placeholders.length;
      results.issues.push({
        project: project.title,
        issue: `${placeholders.length} unprocessed [VISUAL:] placeholders`
      });
    }

    // Extract and analyze images
    const imgMatches = allHtml.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi) || [];
    console.log(`  Images found: ${imgMatches.length}`);

    const uniqueUrls = new Set();
    for (const img of imgMatches) {
      const srcMatch = img.match(/src=["']([^"']+)["']/i);
      if (srcMatch) {
        uniqueUrls.add(srcMatch[1]);
      }
    }

    for (const url of uniqueUrls) {
      results.totalImages++;

      // Categorize image source
      if (url.includes('pixabay.com')) {
        results.pixabayImages++;
      } else if (url.includes('openai') || url.includes('dall-e') || url.includes('oaidalleapi')) {
        results.dalleImages++;
      } else {
        results.otherImages++;
        console.log(`    Other source: ${url.substring(0, 60)}...`);
      }

      // Test if image is accessible
      try {
        const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        if (!response.ok) {
          results.brokenImages++;
          console.log(`    ❌ Broken (${response.status}): ${url.substring(0, 50)}...`);
          results.issues.push({ project: project.title, issue: `Broken image: ${url.substring(0, 50)}` });
        }
      } catch (err) {
        results.brokenImages++;
        console.log(`    ❌ Error: ${url.substring(0, 50)}... - ${err.message}`);
        results.issues.push({ project: project.title, issue: `Image error: ${err.message}` });
      }
    }

    // Check content length (basic quality indicator)
    const worksheetLength = (version.worksheet_html || '').length;
    const lessonLength = (version.lesson_plan_html || '').length;
    const answerLength = (version.answer_key_html || '').length;

    console.log(`  Content sizes: Worksheet=${worksheetLength}, Lesson=${lessonLength}, Answer=${answerLength}`);

    if (worksheetLength < 500) {
      results.issues.push({ project: project.title, issue: 'Worksheet content too short' });
    }
  }

  // Print summary
  console.log('\n=== SUMMARY ===\n');
  console.log(`Projects analyzed: ${results.totalProjects}`);
  console.log(`Total unique images: ${results.totalImages}`);
  console.log(`  - Pixabay: ${results.pixabayImages}`);
  console.log(`  - DALL-E: ${results.dalleImages}`);
  console.log(`  - Other: ${results.otherImages}`);
  console.log(`Broken images: ${results.brokenImages}`);
  console.log(`Unprocessed placeholders: ${results.unprocessedPlaceholders}`);

  if (results.issues.length > 0) {
    console.log(`\nIssues found: ${results.issues.length}`);
    results.issues.forEach((issue, i) => {
      console.log(`  ${i + 1}. [${issue.project}] ${issue.issue}`);
    });
  } else {
    console.log('\n✅ No issues found!');
  }

  // Image source analysis
  console.log('\n=== IMAGE SOURCE ANALYSIS ===\n');
  if (results.dalleImages === 0 && results.pixabayImages > 0) {
    console.log('⚠️ All images are from Pixabay (stock images)');
    console.log('   OpenAI projects could potentially use DALL-E for custom images');
    console.log('   Claude does not have native image generation');
    console.log('   Ollama (local) does not have image generation');
  } else if (results.dalleImages > 0) {
    console.log('✅ Some images are AI-generated (DALL-E)');
  }

  return results;
}

// Run
const userId = process.argv[2] === '--user-id' ? process.argv[3] : DEFAULT_USER_ID;
verifyContentQuality(userId).then(() => process.exit(0));
