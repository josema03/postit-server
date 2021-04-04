import { Post } from '../entities/Post';
import { Query, Resolver, Arg, Int, Mutation } from 'type-graphql';

@Resolver()
export class PostResolver {
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find();
  }

  @Query(() => Post, { nullable: true })
  post(@Arg('_id', () => Int) _id: number): Promise<Post | undefined> {
    return Post.findOne({ where: { _id } });
  }

  @Mutation(() => Post)
  async createPost(@Arg('title', () => String) title: string): Promise<Post> {
    return Post.create({ title }).save();
  }

  @Mutation(() => Post)
  async updatePost(
    @Arg('_id', () => Int) _id: number,
    @Arg('title', () => String) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne({ where: { _id } });
    if (!post) {
      return null;
    }
    if (typeof title !== 'undefined') {
      await Post.update(_id, { title });
    }
    // ToDo: Check if it's really returning the updated post
    return post;
  }

  @Mutation(() => Boolean)
  async deletePost(@Arg('_id', () => Int) _id: number): Promise<boolean> {
    Post.delete(_id);
    return true;
  }
}
