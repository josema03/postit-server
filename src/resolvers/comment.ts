import {
  Arg,
  Ctx,
  Int,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from 'type-graphql';
import { getConnection } from 'typeorm';
import { Comment } from '../entities/Comment';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';

@Resolver(Comment)
export class CommentResolver {
  @Query(() => [Comment], { nullable: true })
  async getComments(
    @Arg('postId', () => Int) postId: number,
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', { nullable: true }) cursor: string,
    @Arg('parentPath', { nullable: true }) parentPath: string
  ): Promise<Comment[]> {
    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    const sqlCommentsQuery = await getConnection()
      .getRepository(Comment)
      .createQueryBuilder('comment')
      .where('comment."postId" = :postId', { postId })
      .andWhere('comment."parentPath" = :path', { path: parentPath || '/' })
      .leftJoinAndSelect('comment.user', 'user')
      .leftJoinAndSelect('comment.post', 'post')
      .take(realLimitPlusOne);

    if (cursor) {
      await sqlCommentsQuery.andWhere('comment.id < :cursor', {
        cursor: parseInt(cursor),
      });
    }

    const comments = await sqlCommentsQuery.getMany();

    return comments.slice(0, realLimit);
  }

  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async postComment(
    @Arg('text') text: string,
    @Arg('parentPath', { nullable: true }) parentPath: string,
    @Arg('postId', () => Int) postId: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const { userId } = req.session;

    if (!userId) {
      return false;
    }

    await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Comment)
      .values({
        comment: text,
        parentPath: parentPath || '/',
        userId,
        postId,
      })
      .execute();

    return true;
  }
}
