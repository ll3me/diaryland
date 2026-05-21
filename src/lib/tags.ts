import type { CollectionEntry } from 'astro:content'
import { sortPostsByDateDesc } from './posts'
import type { Post } from './posts'

export type Tag = CollectionEntry<'tags'>

export type TagItem = {
  title: string
  slug: string
  description?: string
  posts: Post[]
}

export const getTagPath = (tag: Pick<TagItem, 'slug'>) => `/tags/${tag.slug}`

const createTagMap = (tags: Tag[]) => new Map(tags.map(tag => [tag.slug, tag]))

export const validatePostTags = (posts: Post[], tags: Tag[]) => {
  const tagMap = createTagMap(tags)
  const missingTags = new Set<string>()

  for (const post of posts) {
    for (const tag of post.data.tags) {
      if (!tagMap.has(tag)) {
        missingTags.add(tag)
      }
    }
  }

  if (missingTags.size > 0) {
    throw new Error(
      `Post tags must be declared in src/content/tags first: ${[...missingTags].join(', ')}`
    )
  }
}

export const getPostTags = (post: Post, tags: Tag[]) => {
  const tagMap = createTagMap(tags)

  return post.data.tags.flatMap(slug => {
    const tag = tagMap.get(slug)

    if (!tag) {
      return []
    }

    return {
      title: tag.data.title,
      slug: tag.slug,
      description: tag.data.description,
    }
  })
}

export const createTagItems = (posts: Post[], tags: Tag[]): TagItem[] => {
  validatePostTags(posts, tags)

  return tags
    .map(tag => ({
      title: tag.data.title,
      slug: tag.slug,
      description: tag.data.description,
      posts: sortPostsByDateDesc(posts.filter(post => post.data.tags.includes(tag.slug))),
    }))
    .filter(tag => tag.posts.length > 0)
    .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
}
