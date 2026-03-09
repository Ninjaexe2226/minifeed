const SUPABASE_URL = "https://riwtmxjsthdvcouyqfil.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpd3RteGpzdGhkdmNvdXlxZmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTI3NDMsImV4cCI6MjA4ODQyODc0M30.5rYicjQC18SphhSFt836-yQBWYRAr5VBsqdOMgNHorA";

// Tu “truco” de email por username (se mantiene)
function getEmailFromUsername(username) {
  return `${String(username).toLowerCase()}@example.com`;
}
