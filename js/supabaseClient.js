const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

async function deletePost(postId) {
  const { error } = await sb
    .from('posts')
    .delete()
    .eq('id', postId); // Borra directamente el post correspondiente

  if (error) {
    console.error("Error al eliminar el post:", error);
    alert("No se pudo eliminar el post: " + error.message);
    throw error;
  }
  return true;
}