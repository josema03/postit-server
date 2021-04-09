import { Post } from '../entities/Post';
import {
  Query,
  Resolver,
  Arg,
  Int,
  Mutation,
  InputType,
  Field,
  Ctx,
  UseMiddleware,
  FieldResolver,
  Root,
  ObjectType,
} from 'type-graphql';
import { MyContext } from '../types';
import { isAuth } from '../middleware/isAuth';
import { getConnection } from 'typeorm';

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

@ObjectType()
class PaginatedPosts {
  @Field(() => [Post])
  posts: Post[];

  @Field()
  hasMore: boolean;
}

@Resolver(Post)
export class PostResolver {
  @FieldResolver(() => String)
  textSnippet(@Root() root: Post): string {
    return root.text.slice(0, 50);
  }

  @FieldResolver(() => Int, { nullable: true })
  async voteStatus(
    @Root() root: Post,
    @Ctx() { req }: MyContext
  ): Promise<number | undefined> {
    const { userId } = req.session;
    if (!userId) {
      return undefined;
    }
    return root.upvote.find((vote) => vote.userId === userId)?.value || 0;
  }

  @Query(() => PaginatedPosts)
  async posts(
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string
  ): Promise<PaginatedPosts> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;
    const sqlQuery = getConnection()
      .getRepository(Post)
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.creator', 'creator')
      .leftJoinAndSelect('post.upvote', 'upvote')
      .orderBy('post.id', 'DESC')
      .take(realLimitPlusOne);
    if (cursor) {
      sqlQuery.andWhere('post.id < :cursor', {
        cursor: parseInt(cursor),
      });
    }
    const posts = await sqlQuery.getMany();
    return {
      posts: posts.slice(0, realLimit),
      hasMore: posts.length === realLimitPlusOne,
    };
  }

  @Query(() => Post, { nullable: true })
  async post(@Arg('id', () => Int) id: number): Promise<Post | undefined> {
    const post = await getConnection()
      .getRepository(Post)
      .createQueryBuilder('post')
      .innerJoinAndSelect('post.creator', 'creator')
      .leftJoinAndSelect('post.upvote', 'upvote')
      .where(`post.id = ${id}`)
      .getOne();
    return post;
  }

  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg('input') input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({
      ...input,
      creatorId: req.session.userId,
    }).save();
  }

  @Mutation(() => Post)
  async updatePost(
    @Arg('id', () => Int) id: number,
    @Arg('title', () => String) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne({ where: { id } });
    if (!post) {
      return null;
    }
    if (typeof title !== 'undefined') {
      await Post.update(id, { title });
    }
    // ToDo: Check if it's really returning the updated post
    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg('id', () => Int) id: number): Promise<boolean> {
    Post.delete(id);
    return true;
  }
}
