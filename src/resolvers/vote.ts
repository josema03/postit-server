import { Arg, Ctx, Int, Mutation, Resolver, UseMiddleware } from 'type-graphql';
import { getConnection } from 'typeorm';
import { Upvote } from '../entities/Upvote';
import { Post } from '../entities/Post';
import { isAuth } from '../middleware/isAuth';
import { MyContext } from '../types';

@Resolver()
export class VoteResolver {
  @Mutation(() => Boolean)
  @UseMiddleware(isAuth)
  async vote(
    @Arg('postId', () => Int) postId: number,
    @Arg('value', () => Int) value: number,
    @Ctx() { req }: MyContext
  ): Promise<boolean> {
    const { userId } = req.session;
    const voteExists = await Upvote.findOne({ where: { postId, userId } });

    if (voteExists && voteExists.value !== value) {
      await getConnection()
        .createQueryBuilder()
        .update(Upvote)
        .where(`postId = ${postId}`)
        .andWhere(`userId = ${userId}`)
        .set({ value })
        .execute()
        .then(
          async () =>
            await getConnection()
              .createQueryBuilder()
              .update(Post)
              .where(`id = ${postId}`)
              .set({ points: () => `points + ${2 * value}` })
              .execute()
        );
    }

    if (!voteExists) {
      await Upvote.insert({
        postId,
        userId,
        value,
      }).then(
        async () =>
          await getConnection()
            .createQueryBuilder()
            .update(Post)
            .where(`id = ${postId}`)
            .set({ points: () => `points + ${value}` })
            .execute()
      );
    }

    return true;
  }
}
