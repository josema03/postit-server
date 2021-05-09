import {
  Arg,
  Ctx,
  Field,
  FieldResolver,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from 'type-graphql';
import { getConnection } from 'typeorm';
import { Comment } from '../entities/Comment';
import { Post } from '../entities/Post';
import { User } from '../entities/User';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';

@ObjectType()
class PaginatedComments {
  @Field(() => String)
  id: string;

  @Field(() => [Comment])
  result: Comment[];

  @Field(() => Boolean)
  hasMore: boolean;
}
@Resolver(Comment)
export class CommentResolver {
  @FieldResolver(() => User)
  async user(@Root() root: Comment): Promise<User> {
    if (root.user) {
      return root.user;
    }

    const { userId } = root;
    return (await getConnection()
      .getRepository(User)
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .getOne()) as User;
  }

  @FieldResolver(() => Post)
  async post(@Root() root: Comment): Promise<Post | undefined> {
    if (root.post) {
      return root.post;
    }

    const { postId } = root;
    return await getConnection()
      .getRepository(Post)
      .createQueryBuilder('post')
      .where('post.id = :postId', { postId })
      .getOne();
  }

  @Query(() => PaginatedComments, { nullable: true })
  async comments(
    @Arg('postId', () => Int) postId: number,
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', { nullable: true }) cursor: string,
    @Arg('parentPath', { nullable: true }) parentPath: string
  ): Promise<PaginatedComments> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    const sqlCommentsQuery = getConnection()
      .getRepository(Comment)
      .createQueryBuilder('comment')
      .where('comment."postId" = :postId', { postId })
      .andWhere('comment."parentPath" = :path', { path: parentPath || '/' })
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.post', 'post')
      .orderBy('comment.id', 'DESC')
      .take(realLimitPlusOne);

    if (cursor) {
      sqlCommentsQuery.andWhere('comment.id < :cursor', {
        cursor: parseInt(cursor),
      });
    }

    const comments = await sqlCommentsQuery.getMany();

    return {
      id: parentPath || '/',
      result: comments.slice(0, realLimit),
      hasMore: comments.length === realLimitPlusOne,
    };
  }

  @Mutation(() => Comment, { nullable: true })
  @UseMiddleware(isAuth)
  async postComment(
    @Arg('text') text: string,
    @Arg('parentPath', { nullable: true }) parentPath: string,
    @Arg('postId', () => Int) postId: number,
    @Ctx() { req }: MyContext
  ): Promise<Comment | undefined> {
    const { userId } = req.session;

    if (!userId) {
      return undefined;
    }

    const parentCommentId =
      parentPath && parentPath !== '/'
        ? parseInt(
            parentPath
              .split('/')
              .filter((commentId) => commentId !== '')
              .pop() as string
          )
        : null;
    const parentComment = parentCommentId
      ? await Comment.find({
          where: { id: parentCommentId },
        })
      : [null];

    if (parentComment[0] && !parentComment[0].hasResponse) {
      await getConnection()
        .createQueryBuilder()
        .update(Comment)
        .set({ hasResponse: true })
        .where('id = :id', { id: parentComment[0].id })
        .execute();
    }

    const postedComment = await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Comment)
      .values({
        text,
        parentPath: parentPath || '/',
        userId,
        postId,
      })
      .returning('*')
      .execute();

    return postedComment.raw[0];
  }
}
