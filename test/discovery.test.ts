import { describe, it, expect, beforeEach } from 'vitest';
import { discoverImages, clearDiscovery } from '../src/content/discovery';

describe('Image Discovery', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    clearDiscovery();
  });

  it('ignores images smaller than minimum dimensions', () => {
    const img = document.createElement('img');
    img.src = 'https://example.com/small.png';
    // JSDOM getBoundingClientRect returns 0x0 unless mocked
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    Object.defineProperty(img, 'naturalHeight', { value: 50 });
    Object.defineProperty(img, 'complete', { value: true });
    img.getBoundingClientRect = () => ({
      width: 100,
      height: 50,
      top: 0,
      bottom: 50,
      left: 0,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    document.body.appendChild(img);

    const discovered = discoverImages();
    expect(discovered.length).toBe(0);
  });

  it('discovers images meeting minimum dimensions and sorts by vertical position', () => {
    // Image 2 (lower down)
    const img2 = document.createElement('img');
    img2.src = 'https://example.com/panel2.png';
    Object.defineProperty(img2, 'naturalWidth', { value: 800 });
    Object.defineProperty(img2, 'naturalHeight', { value: 1200 });
    Object.defineProperty(img2, 'complete', { value: true });
    img2.getBoundingClientRect = () => ({
      width: 800,
      height: 1200,
      top: 1500,
      bottom: 2700,
      left: 0,
      right: 800,
      x: 0,
      y: 1500,
      toJSON: () => {},
    });

    // Image 1 (top)
    const img1 = document.createElement('img');
    img1.src = 'https://example.com/panel1.png';
    Object.defineProperty(img1, 'naturalWidth', { value: 800 });
    Object.defineProperty(img1, 'naturalHeight', { value: 1200 });
    Object.defineProperty(img1, 'complete', { value: true });
    img1.getBoundingClientRect = () => ({
      width: 800,
      height: 1200,
      top: 100,
      bottom: 1300,
      left: 0,
      right: 800,
      x: 0,
      y: 100,
      toJSON: () => {},
    });

    // Append in reverse order
    document.body.appendChild(img2);
    document.body.appendChild(img1);

    const discovered = discoverImages();
    expect(discovered.length).toBe(2);
    expect(discovered[0].url).toBe('https://example.com/panel1.png');
    expect(discovered[1].url).toBe('https://example.com/panel2.png');
  });

  it('skips logos, avatars and tracking pixels', () => {
    const avatar = document.createElement('img');
    avatar.src = 'https://example.com/user_avatar.png';
    avatar.className = 'user-avatar-icon';
    Object.defineProperty(avatar, 'naturalWidth', { value: 400 });
    Object.defineProperty(avatar, 'naturalHeight', { value: 400 });
    Object.defineProperty(avatar, 'complete', { value: true });
    avatar.getBoundingClientRect = () => ({
      width: 400,
      height: 400,
      top: 0,
      bottom: 400,
      left: 0,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    document.body.appendChild(avatar);

    const discovered = discoverImages();
    expect(discovered.length).toBe(0);
  });

  it('excludes thumbnails, recommendation posters, and header banners', () => {
    // Recommendation poster
    const posterWrap = document.createElement('div');
    posterWrap.className = 'poster poster--sm';
    const posterImg = document.createElement('img');
    posterImg.src = 'https://static.comix.to/poster.jpg';
    Object.defineProperty(posterImg, 'naturalWidth', { value: 400 });
    Object.defineProperty(posterImg, 'naturalHeight', { value: 600 });
    Object.defineProperty(posterImg, 'complete', { value: true });
    posterImg.getBoundingClientRect = () => ({
      width: 400,
      height: 600,
      top: 0,
      bottom: 600,
      left: 0,
      right: 400,
      x: 0,
      y: 0,
      toJSON: () => {},
    });
    posterWrap.appendChild(posterImg);
    document.body.appendChild(posterWrap);

    // Comic page inside reader container
    const reader = document.createElement('div');
    reader.className = 'rpage-main__inner';
    const comicPage = document.createElement('div');
    comicPage.className = 'rpage-page';
    comicPage.dataset.page = '1';
    const comicImg = document.createElement('img');
    comicImg.className = 'rpage-page__img';
    comicImg.src = 'https://static.comix.to/chapter1/01.jpg';
    Object.defineProperty(comicImg, 'naturalWidth', { value: 800 });
    Object.defineProperty(comicImg, 'naturalHeight', { value: 1200 });
    Object.defineProperty(comicImg, 'complete', { value: true });
    comicImg.getBoundingClientRect = () => ({
      width: 800,
      height: 1200,
      top: 100,
      bottom: 1300,
      left: 0,
      right: 800,
      x: 0,
      y: 100,
      toJSON: () => {},
    });
    comicPage.appendChild(comicImg);
    reader.appendChild(comicPage);
    document.body.appendChild(reader);

    const discovered = discoverImages();
    // Only the comic page should be discovered; the poster must be excluded!
    expect(discovered.length).toBe(1);
    expect(discovered[0].url).toBe('https://static.comix.to/chapter1/01.jpg');
  });
});
