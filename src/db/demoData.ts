// Pre-configured Demo browsing data for local sandbox evaluations
import type { HistoryItem } from '../types';
import { inferCategory, extractDomain } from '../services/searchService';

export function getDemoHistoryItems(): HistoryItem[] {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

  const rawDemoData = [
    // --- TODAY ---
    {
      url: 'https://github.com/reactjs/react-future/issues/482',
      title: 'RFC: State management hooks and immutability standards in concurrent mode',
      visitTime: startOfToday + 9.5 * 60 * 60 * 1000, // 09:30 AM
      visitCount: 2
    },
    {
      url: 'https://news.ycombinator.com/item?id=38192831',
      title: 'Ask HN: What is your minimalist developer stack in 2026?',
      visitTime: startOfToday + 10.2 * 60 * 60 * 1000, // 10:12 AM
      visitCount: 1
    },
    {
      url: 'https://zara.com/us/en/man-new-collection-l1102.html',
      title: 'ZARA United States | New Male Editorial Autumn Collection',
      visitTime: startOfToday + 12.4 * 60 * 60 * 1000, // 12:24 PM
      visitCount: 4
    },
    {
      url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
      title: 'Peaceful Piano - Indie Classical Ambient tracks',
      visitTime: startOfToday + 13.1 * 60 * 60 * 1000, // 01:06 PM
      visitCount: 1
    },
    {
      url: 'https://figma.com/file/minimalist-ui-kit-tokens',
      title: 'Figma - Editorial Web Layouts and Type Scales (Inter & Outfit)',
      visitTime: startOfToday + 14.5 * 60 * 60 * 1000, // 02:30 PM
      visitCount: 3
    },
    {
      url: 'https://youtube.com/watch?v=minimal-architecture-tokyo',
      title: 'Architectural Digest: Inside a 40m² Minimalist Concrete Home in Tokyo',
      visitTime: startOfToday + 16.2 * 60 * 60 * 1000, // 04:12 PM
      visitCount: 1
    },
    {
      url: 'https://stackoverflow.com/questions/react-19-use-action-state',
      title: 'React 19: Managing pending boundaries inside compiler hooks',
      visitTime: startOfToday + 17.5 * 60 * 60 * 1000, // 05:30 PM
      visitCount: 2
    },
    {
      url: 'https://nytimes.com/pages/editorial-design-weekly',
      title: 'NYTimes Editorial: How modern print structures are translating to high-contrast mobile layouts',
      visitTime: startOfToday + 19.8 * 60 * 60 * 1000, // 07:48 PM
      visitCount: 1
    },
    {
      url: 'https://x.com/designmilk/status/19823981293',
      title: 'Design Milk: Exploring brutalist modular shelves in oak and steel',
      visitTime: startOfToday + 20.5 * 60 * 60 * 1000, // 08:30 PM
      visitCount: 1
    },
    {
      url: 'https://github.com/tailwindlabs/tailwindcss/releases',
      title: 'Tailwind Labs: Release Notes for Tailwind CSS v4.0.0. CSS-only variables',
      visitTime: startOfToday + 21.2 * 60 * 60 * 1000, // 09:12 PM
      visitCount: 5
    },

    // --- YESTERDAY ---
    {
      url: 'https://medium.com/design-critique/zara-digital-commerce-aesthetic-minimalism',
      title: 'Branding Study: Why ZARA’s whitespace hierarchy converts better than high-density grids',
      visitTime: startOfYesterday + 10.0 * 60 * 60 * 1000, // 10:00 AM
      visitCount: 3
    },
    {
      url: 'https://react.dev/reference/react/useTransition',
      title: 'React Hooks API: useTransition and non-blocking state updates',
      visitTime: startOfYesterday + 11.2 * 60 * 60 * 1000, // 11:12 AM
      visitCount: 1
    },
    {
      url: 'https://spotify.com/album/ambient-piano-scandinavian-sessions',
      title: 'Nordic Solitude: Ambient Piano Works for Architectural Workflows',
      visitTime: startOfYesterday + 13.5 * 60 * 60 * 1000, // 01:30 PM
      visitCount: 1
    },
    {
      url: 'https://github.com/recharts/recharts/issues/4820',
      title: 'Recharts Issue: Fluid resizing inside css flex containers with grid lines',
      visitTime: startOfYesterday + 15.0 * 60 * 60 * 1000, // 03:00 PM
      visitCount: 2
    },
    {
      url: 'https://amazon.com/dp/minimalist-furniture-oak-table',
      title: 'Solid White Oak Minimalist Coffee Table - Brutalist collection',
      visitTime: startOfYesterday + 16.5 * 60 * 60 * 1000, // 04:30 PM
      visitCount: 3
    },
    {
      url: 'https://youtube.com/watch?v=nordic-interior-renovation',
      title: 'Scandinavian Spaces: Transforming a 1920s Copenhagen Flat (14 Minutes)',
      visitTime: startOfYesterday + 19.2 * 60 * 60 * 1000, // 07:12 PM
      visitCount: 1
    },
    {
      url: 'https://nytimes.com/world/denmark-architecture-sustainable-housing',
      title: 'NYT: Copenhagen’s Modular Housing Estates Pave the Way for High-End Wood Construction',
      visitTime: startOfYesterday + 20.8 * 60 * 60 * 1000, // 08:48 PM
      visitCount: 1
    }
  ];

  return rawDemoData.map((item, idx) => ({
    id: `demo-${idx}-${item.visitTime}`,
    url: item.url,
    title: item.title,
    visitTime: item.visitTime,
    visitCount: item.visitCount,
    typedCount: 0,
    domain: extractDomain(item.url),
    category: inferCategory(item.url, item.title)
  }));
}
