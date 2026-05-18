import type { CollectionEntry } from 'astro:content'

export type Post = CollectionEntry<'posts'>
export type Series = CollectionEntry<'series'>

export type SeriesItem = {
  title: string
  slug: string
  description: string
  posts: Post[]
  date: Date
}

export type FeedItem =
  | {
      type: 'post'
      post: Post
      date: Date
    }
  | ({
      type: 'series'
    } & SeriesItem)

export type FeedPage = {
  currentPage: number
  lastPage: number
  data: FeedItem[]
}

const getSeriesOrder = (post: Post) => {
  return post.data.series?.order
}

export const sortPostsByDateDesc = (posts: Post[]) =>
  [...posts].sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())

export const createSeriesItems = (posts: Post[], seriesEntries: Series[]): SeriesItem[] => {
  const seriesMap = new Map(
    seriesEntries.map(series => [
      series.slug,
      {
        title: series.data.title,
        description: series.data.description,
        posts: [] as Post[],
      },
    ])
  )

  for (const post of posts) {
    const slug = post.data.series?.slug

    if (!slug) {
      continue
    }

    const series = seriesMap.get(slug)

    if (!series) {
      continue
    }

    series.posts.push(post)
  }

  return [...seriesMap.entries()].flatMap(([slug, series]) => {
    const { title, description, posts: seriesPosts } = series

    if (seriesPosts.length === 0) {
      return []
    }

    const sortedPosts = [...seriesPosts].sort((a, b) => {
      const aOrder = getSeriesOrder(a)
      const bOrder = getSeriesOrder(b)

      if (aOrder !== undefined && bOrder !== undefined) {
        return aOrder - bOrder
      }

      if (aOrder !== undefined) {
        return -1
      }

      if (bOrder !== undefined) {
        return 1
      }

      return a.data.pubDate.valueOf() - b.data.pubDate.valueOf()
    })

    return {
      title,
      slug,
      description,
      posts: sortedPosts,
      date: new Date(Math.max(...seriesPosts.map(post => post.data.pubDate.valueOf()))),
    }
  })
}

export const createPostFeed = (posts: Post[], seriesEntries: Series[]): FeedItem[] => {
  const singles: FeedItem[] = posts
    .filter(post => !post.data.series)
    .map(post => ({
      type: 'post',
      post,
      date: post.data.pubDate,
    }))

  const seriesItems: FeedItem[] = createSeriesItems(posts, seriesEntries).map(series => ({
    type: 'series',
    ...series,
  }))

  return [...singles, ...seriesItems].sort((a, b) => b.date.valueOf() - a.date.valueOf())
}

const getFeedItemSize = (item: FeedItem, maxSeriesSize: number) =>
  item.type === 'series' ? Math.min(item.posts.length, maxSeriesSize) : 1

export const paginatePostFeed = (
  items: FeedItem[],
  pageSize: number,
  maxSeriesSize: number
): FeedPage[] => {
  const pages: FeedItem[][] = []
  let pageItems: FeedItem[] = []
  let pageSizeUsed = 0

  for (const item of items) {
    const itemSize = getFeedItemSize(item, maxSeriesSize)

    if (pageItems.length > 0 && pageSizeUsed + itemSize > pageSize) {
      pages.push(pageItems)
      pageItems = []
      pageSizeUsed = 0
    }

    pageItems.push(item)
    pageSizeUsed += itemSize
  }

  if (pageItems.length > 0) {
    pages.push(pageItems)
  }

  const lastPage = Math.max(pages.length, 1)

  return (pages.length > 0 ? pages : [[]]).map((data, index) => ({
    currentPage: index + 1,
    lastPage,
    data,
  }))
}

export const getSeriesPath = (series: Pick<SeriesItem, 'slug'>) => `/series/${series.slug}`
