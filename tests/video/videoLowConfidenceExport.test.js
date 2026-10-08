import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('video-remover.html provides visible allowLowConfidence control outside internal-controls', () => {
    const html = readFileSync(new URL('../../public/video-remover.html', import.meta.url), 'utf8');

    assert.match(html, /id="allowLowConfidence"/);
    assert.match(html, /Allow Low-Confidence Export/);

    const internalControlsMatch = html.match(/class="internal-controls"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(internalControlsMatch, 'internal-controls div should exist');
    assert.doesNotMatch(internalControlsMatch[1], /id="allowLowConfidence"/, 'allowLowConfidence should not be hidden inside internal-controls');
});

test('video-preview.html provides visible allowLowConfidence control', () => {
    const html = readFileSync(new URL('../../public/video-preview.html', import.meta.url), 'utf8');

    assert.match(html, /id="allowLowConfidence"/);
    const internalControlsMatch = html.match(/class="internal-controls"[^>]*>([\s\S]*?)<\/div>/);
    assert.ok(internalControlsMatch, 'internal-controls div should exist');
    assert.doesNotMatch(internalControlsMatch[1], /id="allowLowConfidence"/, 'allowLowConfidence should not be hidden inside internal-controls');
});

test('video-app.js handles low-confidence detection and preserves allowLowConfidence during export', () => {
    const source = readFileSync(new URL('../../src/video-app.js', import.meta.url), 'utf8');

    assert.match(source, /els\.allowLowConfidence\.checked = true/, 'should auto-enable allowLowConfidence when detection is low confidence');
    assert.match(source, /allowLowConfidence:\s*Boolean\(els\.allowLowConfidence\?\.checked\)/, 'should pass allowLowConfidence boolean to removeGeminiVideoWatermark');
    assert.match(source, /Low Confidence \(Export Allowed\)/, 'should indicate export allowed in detection summary when toggle is enabled');
});
