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
} from 'type-graphql';
import { MyContext } from '../types';
import { isAuth } from '../middleware/isAuth';

@InputType()
class PostInput {
  @Field()
  title: string;
  @Field()
  text: string;
}

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
