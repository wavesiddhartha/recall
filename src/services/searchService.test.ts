// Unit Tests for Search and Classification Services
import { describe, test, expect } from 'vitest';
import { inferCategory, extractDomain, performLocalSearch } from './searchService';
import type { HistoryItem } from '../types';

describe('Search and Classification Services', () => {
  // Test Domain Extractor
  test('extractDomain removes www. prefix and extracts base domain', () => {
    // Arrange
    const standardUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    const subDomainUrl = 'https://docs.github.com/en/actions';
    const invalidUrl = 'invalid-url-string';

    // Act
    const domain1 = extractDomain(standardUrl);
    const domain2 = extractDomain(subDomainUrl);
    const domain3 = extractDomain(invalidUrl);

    // Assert
    expect(domain1).toBe('youtube.com');
    expect(domain2).toBe('docs.github.com');
    expect(domain3).toBe('unknown');
  });

  // Test Category Classifier
  test('inferCategory classifies URLs into correct semantic domains', () => {
    // Arrange
    const spotifyUrl = 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO';
    const youtubeUrl = 'https://www.youtube.com/watch?v=AD';
    const zaraUrl = 'https://www.zara.com/us/en/man-new-collection-l1102.html';
    const newsUrl = 'https://news.ycombinator.com/item?id=38';
    const githubUrl = 'https://github.com/facebook/react';

    // Act
    const catMusic = inferCategory(spotifyUrl, 'Chill Vibes Playlist');
    const catVideo = inferCategory(youtubeUrl, 'Scandinavian interior AD review');
    const catShop = inferCategory(zaraUrl, 'Zara New Collection');
    const catNews = inferCategory(newsUrl, 'Ask HN: Developer setups');
    const catWork = inferCategory(githubUrl, 'React main source repo');

    // Assert
    expect(catMusic).toBe('Music');
    expect(catVideo).toBe('Video');
    expect(catShop).toBe('Shopping');
    expect(catNews).toBe('News');
    expect(catWork).toBe('Work');
  });

  // Test Local Search engine
  test('performLocalSearch ranks matching history items higher', () => {
    // Arrange
    const sampleItems: HistoryItem[] = [
      {
        id: '1',
        url: 'https://zara.com',
        title: 'Minimalist Editorial Coats ZARA',
        visitTime: Date.now(),
        visitCount: 1,
        typedCount: 0,
        domain: 'zara.com',
        category: 'Shopping'
      },
      {
        id: '2',
        url: 'https://github.com/react',
        title: 'React Concurrent State Management',
        visitTime: Date.now(),
        visitCount: 1,
        typedCount: 0,
        domain: 'github.com',
        category: 'Work'
      }
    ];

    // Act
    const searchResult = performLocalSearch(sampleItems, ['React']);

    // Assert
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].item.id).toBe('2');
    expect(searchResult[0].score).toBeGreaterThan(0.5);
  });
});
