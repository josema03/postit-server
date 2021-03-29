import { Post } from '../entities/Post';
import { MyContext } from 'src/types';
import { Query, Resolver, Ctx, Arg, Int } from 'type-graphql';

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(@Ctx() { em }: MyContext): Promise<Post[]> {
    return em.find(Post, {});
  }
  @Query(() => Post, { nullable: true })
  post(
    @Arg('_id', () => Int) _id: number,
    @Ctx() { em }: MyContext
  ): Promise<Post | null> {
    return em.findOne(Post, { _id });
  }
}
