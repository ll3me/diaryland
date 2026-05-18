import { defineCollection, z } from 'astro:content'

const posts = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.date(),
    series: z
      .object({
        slug: z.string(),
        order: z.number().optional(),
      })
      .optional(),
  }),
})

const series = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
})

export const collections = { posts, series }
