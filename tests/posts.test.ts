import { beforeEach, describe, expect, it } from 'vitest'
import { getCollection } from './mocks/astro-content'
import { makePost, makeSeries } from './fixtures'
import {
  createPostFeed,
  createSeriesItems,
  getPostNavigation,
  getPostPath,
  getPosts,
  getSeriesPath,
  isDraftPost,
  paginatePostFeed,
  sortPostsByDateDesc,
} from '../src/lib/posts'
import type { FeedItem } from '../src/lib/posts'

const mockedGetCollection = getCollection as ReturnType<typeof import('vitest').vi.fn>

beforeEach(() => {
  mockedGetCollection.mockReset()
})

describe('sortPostsByDateDesc', () => {
  it('returns posts newest first without mutating the input', () => {
    const oldPost = makePost({ slug: 'old', pubDate: '2024-01-01' })
    const newPost = makePost({ slug: 'new', pubDate: '2024-06-01' })
    const input = [oldPost, newPost]

    const sorted = sortPostsByDateDesc(input)

    expect(sorted.map(post => post.slug)).toEqual(['new', 'old'])
    expect(input.map(post => post.slug)).toEqual(['old', 'new'])
  })
})

describe('isDraftPost', () => {
  it('reflects the draft flag', () => {
    expect(isDraftPost(makePost({ slug: 'a', draft: true }))).toBe(true)
    expect(isDraftPost(makePost({ slug: 'b' }))).toBe(false)
  })
})

describe('path helpers', () => {
  it('builds post and series paths', () => {
    expect(getPostPath({ slug: 'hello' })).toBe('/post/hello')
    expect(getSeriesPath({ slug: 'guide' })).toBe('/series/guide')
  })
})

describe('createSeriesItems', () => {
  it('groups posts by series, skipping empty series, unaffiliated posts and unknown slugs', () => {
    const posts = [
      makePost({ slug: 'unordered-new', pubDate: '2024-02-02', series: { slug: 'guide' } }),
      makePost({ slug: 'ordered', pubDate: '2024-03-01', series: { slug: 'guide', order: 1 } }),
      makePost({ slug: 'unordered-old', pubDate: '2024-01-15', series: { slug: 'guide' } }),
      makePost({ slug: 'solo', pubDate: '2024-04-01' }),
      makePost({ slug: 'ghost', pubDate: '2024-05-01', series: { slug: 'missing' } }),
    ]
    const seriesEntries = [makeSeries('guide', 'Guide'), makeSeries('empty', 'Empty')]

    const items = createSeriesItems(posts, seriesEntries)

    expect(items).toHaveLength(1)
    expect(items[0].title).toBe('Guide')
    // 显式 order 的排在前面，其余按发布日期升序
    expect(items[0].posts.map(post => post.slug)).toEqual([
      'ordered',
      'unordered-old',
      'unordered-new',
    ])
    expect(items[0].date).toEqual(new Date('2024-03-01'))
  })

  it('sorts by explicit order when both posts define it', () => {
    const posts = [
      makePost({ slug: 'b', pubDate: '2024-01-02', series: { slug: 's', order: 2 } }),
      makePost({ slug: 'a', pubDate: '2024-01-01', series: { slug: 's', order: 1 } }),
    ]

    const [item] = createSeriesItems(posts, [makeSeries('s')])

    expect(item.posts.map(post => post.slug)).toEqual(['a', 'b'])
  })
})

describe('createPostFeed', () => {
  it('merges single posts and series into a date-desc feed without duplicating series posts', () => {
    const seriesPost = makePost({
      slug: 'in-series',
      pubDate: '2024-01-10',
      series: { slug: 'guide' },
    })
    const soloOld = makePost({ slug: 'solo-old', pubDate: '2024-01-01' })
    const soloNew = makePost({ slug: 'solo-new', pubDate: '2024-02-01' })

    const feed = createPostFeed([seriesPost, soloOld, soloNew], [makeSeries('guide')])

    expect(feed).toHaveLength(3)
    expect(feed.map(item => item.type)).toEqual(['post', 'series', 'post'])
    expect(feed[0]).toMatchObject({ post: { slug: 'solo-new' } })
    expect(feed[1]).toMatchObject({ slug: 'guide' })
    expect(feed[2]).toMatchObject({ post: { slug: 'solo-old' } })
  })
})

const postItem = (slug: string): FeedItem => ({
  type: 'post',
  post: makePost({ slug }),
  date: new Date('2024-01-01'),
})

const seriesItem = (slug: string, postCount: number): FeedItem => ({
  type: 'series',
  slug,
  title: slug,
  description: '',
  posts: Array.from({ length: postCount }, (_, index) =>
    makePost({ slug: `${slug}-${index}`, series: { slug } }),
  ),
  date: new Date('2024-01-01'),
})

describe('paginatePostFeed', () => {
  it('returns a single empty page when there is nothing to show', () => {
    expect(paginatePostFeed([], 6, 3)).toEqual([{ currentPage: 1, lastPage: 1, data: [] }])
  })

  it('splits items across pages by page size', () => {
    const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map(postItem)

    const pages = paginatePostFeed(items, 3, 3)

    expect(pages.map(page => page.data.length)).toEqual([3, 3, 1])
    expect(pages[2]).toMatchObject({ currentPage: 3, lastPage: 3 })
  })

  it('counts a series by its capped preview size', () => {
    const pages = paginatePostFeed([postItem('a'), seriesItem('s', 5), postItem('b')], 2, 2)

    expect(pages.map(page => page.data.map(item => (item.type === 'post' ? item.post.slug : item.slug)))).toEqual([
      ['a'],
      ['s'],
      ['b'],
    ])
  })

  it('counts a series smaller than the cap by its actual size', () => {
    const pages = paginatePostFeed([seriesItem('s', 1), postItem('a')], 2, 3)

    expect(pages).toHaveLength(1)
  })
})

describe('getPostNavigation', () => {
  it('navigates within a series by series order', () => {
    const a = makePost({ slug: 'a', series: { slug: 'guide', order: 1 } })
    const b = makePost({ slug: 'b', series: { slug: 'guide', order: 2 } })
    const c = makePost({ slug: 'c', series: { slug: 'guide', order: 3 } })

    const nav = getPostNavigation(b, [a, b, c], [makeSeries('guide')])

    if (nav?.type !== 'series') {
      throw new Error('expected series navigation')
    }
    expect(nav).toMatchObject({ index: 1, total: 3 })
    expect(nav.previous?.slug).toBe('a')
    expect(nav.next?.slug).toBe('c')
  })

  it('returns null for a post pointing at an unknown series', () => {
    const orphan = makePost({ slug: 'orphan', series: { slug: 'missing' } })

    expect(getPostNavigation(orphan, [orphan], [])).toBeNull()
  })

  it('navigates the timeline of non-series posts, excluding series posts', () => {
    const older = makePost({ slug: 'older', pubDate: '2024-01-01' })
    const current = makePost({ slug: 'current', pubDate: '2024-02-01' })
    const newer = makePost({ slug: 'newer', pubDate: '2024-03-01' })
    const inSeries = makePost({
      slug: 'in-series',
      pubDate: '2024-04-01',
      series: { slug: 'guide' },
    })

    const nav = getPostNavigation(current, [older, current, newer, inSeries], [makeSeries('guide')])

    if (nav?.type !== 'timeline') {
      throw new Error('expected timeline navigation')
    }
    expect(nav.previous?.slug).toBe('older')
    expect(nav.next?.slug).toBe('newer')
  })

  it('returns null when there is no neighbouring post', () => {
    const solo = makePost({ slug: 'solo' })

    expect(getPostNavigation(solo, [solo], [])).toBeNull()
  })
})

describe('getPosts', () => {
  const draft = makePost({ slug: 'draft', draft: true })
  const live = makePost({ slug: 'live' })

  it('filters drafts unless includeDrafts is set', async () => {
    mockedGetCollection.mockResolvedValue([draft, live])

    await expect(getPosts({ includeDrafts: true })).resolves.toHaveLength(2)
    await expect(getPosts({ includeDrafts: false })).resolves.toEqual([live])
  })

  it('includes drafts by default outside production builds', async () => {
    mockedGetCollection.mockResolvedValue([draft, live])

    await expect(getPosts()).resolves.toHaveLength(2)
  })
})
