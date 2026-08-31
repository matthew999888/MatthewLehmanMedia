// Drive URL parsing — the piece everything else depends on.
// Run: node --test test/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDriveId,
  driveThumbUrl,
  driveThumbFallbackUrl,
  drivePreviewUrl,
  driveDownloadUrl,
  parseMediaBlob,
  splitLinks,
} from '../api/_lib/drive.js';

const ID = '1xWT9-DpGniKjnfl1lPA8A4-aiNvJDejL';

test('parses every Drive URL shape a person might paste', () => {
  const shapes = [
    `https://drive.google.com/file/d/${ID}/view?usp=sharing`,
    `https://drive.google.com/file/d/${ID}/view`,
    `https://drive.google.com/file/d/${ID}/preview`,
    `https://drive.google.com/open?id=${ID}`,
    `https://drive.google.com/uc?export=download&id=${ID}`,
    `https://drive.google.com/thumbnail?id=${ID}&sz=w1000`,
    `https://drive.google.com/thumbnail?id=${ID}`,
    `https://docs.google.com/document/d/${ID}/edit`,
    `https://lh3.googleusercontent.com/d/${ID}`,
    ID, // pasted bare
  ];
  for (const url of shapes) {
    assert.equal(parseDriveId(url), ID, `failed on: ${url}`);
  }
});

test('rejects things that are not Drive files', () => {
  for (const bad of ['', null, undefined, 'hello world', 'https://example.com/photo.jpg', 'not a url']) {
    assert.equal(parseDriveId(bad), null, `should not have parsed: ${bad}`);
  }
});

test('derives the right URLs from an id', () => {
  // Thumbnails point straight at lh3 — the host drive.google.com redirects to.
  // Skipping that hop avoids a redirect per image and Google's auth cookies.
  //
  // The `-rj-l80` suffix forces JPEG and is load-bearing: the source files are
  // PNGs, and without it a 1000px tile comes back at 2.65 MB instead of ~198 KB.
  assert.equal(driveThumbUrl(ID, 1000), `https://lh3.googleusercontent.com/d/${ID}=w1000-rj-l80`);
  assert.equal(driveThumbUrl(ID, 1920, 85), `https://lh3.googleusercontent.com/d/${ID}=w1920-rj-l85`);
  assert.equal(driveThumbFallbackUrl(ID, 1000), `https://drive.google.com/thumbnail?id=${ID}&sz=w1000`);
  assert.equal(drivePreviewUrl(ID), `https://drive.google.com/file/d/${ID}/preview`);
  assert.equal(driveDownloadUrl(ID), `https://drive.google.com/uc?export=download&id=${ID}`);
});

test('thumbnail URLs round-trip back to the same id', () => {
  // Whatever we generate must be re-parseable, or a saved cover URL stops
  // resolving the next time it is read back.
  // The `=w1000-rj-l80` suffix must not be swallowed into the captured id.
  assert.equal(parseDriveId(driveThumbUrl(ID, 1000)), ID);
  assert.equal(parseDriveId(driveThumbUrl(ID, 1920, 85)), ID);
  assert.equal(parseDriveId(driveThumbFallbackUrl(ID, 1000)), ID);
  assert.equal(parseDriveId(drivePreviewUrl(ID)), ID);
  assert.equal(parseDriveId(driveDownloadUrl(ID)), ID);
});

test('splits a pasted blob on newlines, commas and spaces', () => {
  const blob = `https://drive.google.com/file/d/aaaaaaaaaaaa/view\n\n` +
               `https://drive.google.com/file/d/bbbbbbbbbbbb/view , ` +
               `https://drive.google.com/file/d/cccccccccccc/view`;
  assert.equal(splitLinks(blob).length, 3);
});

test('parseMediaBlob accepts Drive links, keeps plain URLs, reports the rest', () => {
  const blob = [
    `https://drive.google.com/file/d/${ID}/view`,
    `https://drive.google.com/thumbnail?id=${ID}&sz=w1000`, // same file, different shape
    'https://example.com/direct.jpg',
    'this-is-not-a-link',
  ].join('\n');

  const { accepted, rejected } = parseMediaBlob(blob, 'photo');

  // The duplicate is collapsed because both shapes resolve to one id.
  assert.equal(accepted.length, 2);
  assert.equal(accepted[0].drive_file_id, ID);
  assert.equal(accepted[0].url, null);
  assert.equal(accepted[1].drive_file_id, null);
  assert.equal(accepted[1].url, 'https://example.com/direct.jpg');
  assert.deepEqual(rejected, ['this-is-not-a-link']);
});

test('parseMediaBlob carries the requested kind through', () => {
  const { accepted } = parseMediaBlob(`https://drive.google.com/file/d/${ID}/view`, 'video');
  assert.equal(accepted[0].kind, 'video');
});

test('a bare id must really look like one, not just any hyphenated word', () => {
  // Regression: "summer-team-photos" was once accepted as a file id, which
  // silently created media rows that rendered as broken images.
  for (const notAnId of [
    'this-is-not-a-link',
    'summer-team-photos',
    'baseball',
    'a-really-long-hyphenated-phrase-with-no-digits',
  ]) {
    assert.equal(parseDriveId(notAnId), null, `should not have parsed: ${notAnId}`);
  }
  assert.equal(parseDriveId(ID), ID);
});
