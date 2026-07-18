import type { Post, Series } from '../src/lib/posts'
import type { Tag } from '../src/lib/tags'

export const makePost = (options: {
  slug: string
  title?: string
  description?: string
  pubDate?: string
  updatedDate?: string
  draft?: boolean
  tags?: string[]
  series?: { slug: string; order?: number }
}): Post =>
  ({
    slug: options.slug,
    data: {
      title: options.title ?? options.slug,
      description: options.description ?? '',
      pubDate: new Date(options.pubDate ?? '2024-01-01'),
      ...(options.updatedDate ? { updatedDate: new Date(options.updatedDate) } : {}),
      draft: options.draft ?? false,
      tags: options.tags ?? [],
      ...(options.series ? { series: options.series } : {}),
    },
  }) as unknown as Post

export const makeSeries = (slug: string, title = slug): Series =>
  ({ slug, data: { title, description: '' } }) as unknown as Series

export const makeTag = (slug: string, title = slug, description?: string): Tag =>
  ({
    slug,
    data: { title, ...(description !== undefined ? { description } : {}) },
  }) as unknown as Tag
