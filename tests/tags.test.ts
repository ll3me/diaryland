import { describe, expect, it } from 'vitest'
import { makePost, makeTag } from './fixtures'
import { createTagItems, getPostTags, getTagPath, validatePostTags } from '../src/lib/tags'

describe('getTagPath', () => {
  it('builds the tag path', () => {
    expect(getTagPath({ slug: 'astro' })).toBe('/tags/astro')
  })
})

describe('validatePostTags', () => {
  it('passes when every post tag is declared', () => {
    const posts = [makePost({ slug: 'a', tags: ['astro'] })]

    expect(() => validatePostTags(posts, [makeTag('astro')])).not.toThrow()
  })

  it('throws and names the undeclared tags', () => {
    const posts = [makePost({ slug: 'a', tags: ['astro', 'vue'] })]

    expect(() => validatePostTags(posts, [makeTag('astro')])).toThrow('vue')
    expect(() => validatePostTags(posts, [makeTag('astro')])).not.toThrow('astro,')
  })
})

describe('getPostTags', () => {
  it('maps declared slugs to tag data in post order and skips undeclared ones', () => {
    const post = makePost({ slug: 'a', tags: ['blog', 'missing', 'astro'] })
    const tags = [makeTag('astro', 'Astro'), makeTag('blog', '博客')]

    expect(getPostTags(post, tags).map(tag => tag.title)).toEqual(['博客', 'Astro'])
  })
})

describe('createTagItems', () => {
  it('keeps only tags with posts, sorts tags by title and posts newest first', () => {
    const posts = [
      makePost({ slug: 'p1', pubDate: '2024-01-01', tags: ['b-tag'] }),
      makePost({ slug: 'p2', pubDate: '2024-02-01', tags: ['b-tag', 'a-tag'] }),
    ]
    const tags = [makeTag('b-tag', '乙'), makeTag('a-tag', '甲'), makeTag('unused', '未使用')]

    const items = createTagItems(posts, tags)

    expect(items.map(tag => tag.slug)).toEqual(['a-tag', 'b-tag'])
    expect(items.find(tag => tag.slug === 'b-tag')?.posts.map(post => post.slug)).toEqual([
      'p2',
      'p1',
    ])
  })

  it('throws when a post references an undeclared tag', () => {
    const posts = [makePost({ slug: 'a', tags: ['nope'] })]

    expect(() => createTagItems(posts, [])).toThrow('nope')
  })
})
