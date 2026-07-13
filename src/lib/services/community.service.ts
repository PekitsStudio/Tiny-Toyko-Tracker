import { supabase } from '$lib/supabase';

async function requireUser(): Promise<string> {
	const { data, error } = await supabase().auth.getUser();
	if (error || !data.user) throw new Error('Nicht eingeloggt');
	return data.user.id;
}
function ok<T>(res: { data: T | null; error: { message?: string } | null }): T {
	if (res.error) throw new Error(res.error.message || 'Datenbankfehler');
	return res.data as T;
}

// ---------- Beiträge (community_posts): Pulls / Guides / Reviews ----------
export type PostKind = 'pulls' | 'guide' | 'review';
export interface Post {
	id: number; kind: string; user_id: string; author_name: string | null; author_country: string | null;
	title: string; body: string; image_url: string | null; game: string | null;
	created_at: string; last_activity: string; comment_count: number; like_count: number; liked: boolean;
}
export interface PostComment { id: number; post_id: number; author_name: string | null; body: string; created_at: string; }

export async function listPosts(kind: PostKind): Promise<Post[]> {
	await requireUser();
	return ok(await supabase().from('community_posts_view').select('*').eq('kind', kind).order('last_activity', { ascending: false }).limit(100));
}
export async function createPost(p: { kind: PostKind; title: string; body: string; image_url?: string | null; game?: string | null }): Promise<void> {
	const uid = await requireUser();
	const { error } = await supabase().from('community_posts').insert({
		user_id: uid, kind: p.kind, title: p.title, body: p.body, image_url: p.image_url || null, game: p.game || null
	});
	if (error) throw new Error(error.message);
}
export async function deletePost(id: number): Promise<void> {
	const { error } = await supabase().from('community_posts').delete().eq('id', id);
	if (error) throw new Error(error.message);
}
export async function toggleLikePost(postId: number, liked: boolean): Promise<void> {
	const uid = await requireUser();
	if (liked) {
		const { error } = await supabase().from('community_post_likes').delete().eq('post_id', postId).eq('user_id', uid);
		if (error) throw new Error(error.message);
	} else {
		const { error } = await supabase().from('community_post_likes').insert({ post_id: postId, user_id: uid });
		if (error) throw new Error(error.message);
	}
}
export async function listPostComments(postId: number): Promise<PostComment[]> {
	return ok(await supabase().from('community_post_comments').select('id, post_id, author_name, body, created_at').eq('post_id', postId).order('created_at', { ascending: true }));
}
export async function addPostComment(postId: number, body: string): Promise<void> {
	const uid = await requireUser();
	const { error } = await supabase().from('community_post_comments').insert({ post_id: postId, user_id: uid, body });
	if (error) throw new Error(error.message);
}

// ---------- Forum ----------
export type ForumCategory = 'general' | 'pokemon' | 'magic' | 'yugioh' | 'onepiece' | 'offtopic';
export interface ForumThread {
	id: number; category: string; user_id: string; author_name: string | null; author_country: string | null;
	title: string; body: string; created_at: string; last_activity: string; reply_count: number;
}
export interface ForumReply { id: number; thread_id: number; author_name: string | null; body: string; created_at: string; }

export async function listThreads(category?: ForumCategory): Promise<ForumThread[]> {
	await requireUser();
	let q = supabase().from('forum_threads_view').select('*').order('last_activity', { ascending: false }).limit(100);
	if (category) q = q.eq('category', category);
	return ok(await q);
}
export async function createThread(t: { category: ForumCategory; title: string; body: string }): Promise<void> {
	const uid = await requireUser();
	const { error } = await supabase().from('forum_threads').insert({ user_id: uid, category: t.category, title: t.title, body: t.body });
	if (error) throw new Error(error.message);
}
export async function deleteThread(id: number): Promise<void> {
	const { error } = await supabase().from('forum_threads').delete().eq('id', id);
	if (error) throw new Error(error.message);
}
export async function listThreadReplies(threadId: number): Promise<ForumReply[]> {
	return ok(await supabase().from('forum_posts').select('id, thread_id, author_name, body, created_at').eq('thread_id', threadId).order('created_at', { ascending: true }));
}
export async function addThreadReply(threadId: number, body: string): Promise<void> {
	const uid = await requireUser();
	const { error } = await supabase().from('forum_posts').insert({ thread_id: threadId, user_id: uid, body });
	if (error) throw new Error(error.message);
}
